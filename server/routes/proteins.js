const router = require('express').Router();
const Protein = require('../model/proteins');
const Peptide = require('../model/peptides');
const { resolveProteinId } = require('../services/proteinIdResolver');
const { getProteinPage } = require('../services/psmRedisService');
const { getPsmsByDataset, getPeptidesByProtein } = require('../services/psmMongoService');
const { getProteinCoverage } = require('../coverage');
const { MOD_COLORS, HVO_RE, UNIPROT_RE, Q_VALUE_THRESHOLD, canonicalModType } = require('../utils/constants');

// Resolve a display ID (hvo_id or protein_id) to a protein document
async function findProteinByDisplayId(displayId, projection = {}) {
  let doc = await Protein.findOne({ hvo_id: displayId }, projection).lean();
  if (!doc) doc = await Protein.findOne({ protein_id: displayId }, projection).lean();
  return doc;
}

// All HVO gene IDs
router.get('/hvo-ids', async (req, res) => {
  try {
    const ids = await Protein.distinct('hvo_id', { hvo_id: { $exists: true, $ne: null, $ne: '' } });
    res.json(ids.filter(Boolean).sort());
  } catch (e) {
    console.error('hvo-ids error', e);
    res.status(500).json({ error: 'Failed to fetch HVO IDs' });
  }
});

// All display IDs grouped by type (for autocomplete)
router.get('/proteins/ids', async (_req, res) => {
  try {
    const hvoRaw = await Protein.distinct('hvo_id');
    const hvo = hvoRaw.filter(Boolean).map(s => String(s).trim()).filter(s => HVO_RE.test(s));
    hvo.sort();

    // Non-HVO species protein_ids (UniProt accessions)
    const nonHvoRaw = await Protein.distinct('protein_id', { hvo_id: { $exists: false } });
    const uniprot = nonHvoRaw
      .filter(Boolean)
      .map(s => String(s).toUpperCase().trim())
      .filter(s => UNIPROT_RE.test(s));
    uniprot.sort();

    res.json({ hvo: Array.from(new Set(hvo)), uniprot: Array.from(new Set(uniprot)) });
  } catch (e) {
    console.error('proteins/ids error', e);
    res.status(500).json({ error: 'Failed to fetch protein IDs' });
  }
});

// Typeahead search across hvo_id and protein_id (UniProt accession)
router.get('/proteins/search', async (req, res) => {
  try {
    const raw = String(req.query.q || '').trim();
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);
    if (!raw) return res.json({ results: [] });

    const escaped = raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const prefixRe = new RegExp(`^${escaped}`, 'i');

    const docs = await Protein.find(
      { $or: [{ hvo_id: prefixRe }, { protein_id: prefixRe }] },
      { _id: 0, hvo_id: 1, protein_id: 1 },
    )
      .limit(limit * 2)
      .lean();

    const seen = new Set();
    const results = [];
    for (const d of docs) {
      const displayId = d.hvo_id || d.protein_id;
      if (!displayId || seen.has(displayId)) continue;
      seen.add(displayId);
      results.push({ label: displayId, value: displayId });
      if (results.length >= limit) break;
    }

    res.json({ results });
  } catch (e) {
    console.error('proteins/search error', e);
    res.status(500).json({ error: 'Failed to search proteins' });
  }
});

// Case-insensitive resolve (hvo_id or protein_id)
router.get('/proteins/resolve', async (req, res) => {
  try {
    const raw = (req.query.q || '').trim();
    if (!raw) return res.status(400).json({ error: 'Missing q' });

    // Try hvo_id
    if (HVO_RE.test(raw)) {
      const byHvo = await Protein.findOne(
        { hvo_id: { $regex: `^${raw}$`, $options: 'i' } },
        { _id: 0, protein_id: 1, hvo_id: 1, uniprot_id: 1, description: 1 }
      ).lean();
      if (byHvo) {
        return res.json({
          matchType: 'hvo_id',
          protein_id: byHvo.hvo_id,
          uniProtId: byHvo.protein_id,
          description: byHvo.description || null,
        });
      }
    }

    // Try protein_id (UniProt)
    if (UNIPROT_RE.test(raw)) {
      const byUni = await Protein.findOne(
        { protein_id: { $regex: `^${raw}$`, $options: 'i' } },
        { _id: 0, protein_id: 1, hvo_id: 1, description: 1 }
      ).lean();
      if (byUni) {
        return res.json({
          matchType: 'protein_id',
          protein_id: byUni.hvo_id || byUni.protein_id,
          uniProtId: byUni.protein_id,
          description: byUni.description || null,
        });
      }
    }

    return res.status(404).json({ error: 'Protein not found' });
  } catch (e) {
    console.error('resolve error', e);
    res.status(500).json({ error: 'Failed to resolve protein' });
  }
});

// Protein sequence with modifications
router.get('/proteins/:protein_id/sequence', async (req, res) => {
  try {
    const displayId = req.params.protein_id;
    const proteinDoc = await findProteinByDisplayId(displayId, { _id: 1, sequence: 1, protein_id: 1 });
    if (!proteinDoc || !proteinDoc.sequence) {
      return res.status(404).json({ error: 'Sequence not found' });
    }
    const sequence = proteinDoc.sequence;

    const peptideDocs = await Peptide.find(
      {
        protein_id: proteinDoc._id,
        $or: [{ q_value: { $lte: Q_VALUE_THRESHOLD } }, { q_value: null }, { q_value: { $exists: false } }],
      },
      { sequence: 1, start_index: 1, end_index: 1, modification: 1, _id: 0 }
    ).lean();
    const rows = peptideDocs.map(p => ({
      seq: p.sequence, start: p.start_index, stop: p.end_index, mods: p.modification
    }));

    const modifications = [];
    const seenMods = new Set();
    const re = /(.+):(\d+)$/;

    for (const r of rows) {
      let hasColoredMod = false;

      if (r.mods) {
        for (const part of String(r.mods).split(';')) {
          const m = re.exec(part.trim());
          if (!m) continue;
          const type = canonicalModType(m[1]);
          if (!type) continue;
          const rel = parseInt(m[2], 10);
          const abs = r.start + rel - 1;
          if (abs < 1 || abs > sequence.length) continue;

          const modKey = `${abs}|${type}`;
          if (seenMods.has(modKey)) continue;
          seenMods.add(modKey);
          modifications.push({
            position: abs,
            type,
            relativePosition: rel,
            peptideStart: r.start,
            peptideEnd: r.stop,
            peptideSequence: r.seq,
            color: MOD_COLORS[type]
          });
          hasColoredMod = true;
        }
      }

      if (!hasColoredMod) {
        modifications.push({
          position: null,
          type: 'Covered',
          relativePosition: null,
          peptideStart: r.start,
          peptideEnd: r.stop,
          peptideSequence: r.seq,
          color: null
        });
      }
    }

    res.json({ protein_id: displayId, sequence, length: sequence.length, modifications });
  } catch (err) {
    console.error('Sequence endpoint error for', req.params.protein_id, ':', err.message);
    res.status(500).json({ error: 'Failed to fetch sequence data' });
  }
});

// Coverage numbers
router.get('/coverage/:protein_id', async (req, res) => {
  try {
    const coverage = await getProteinCoverage(req.params.protein_id);
    res.json(coverage);
  } catch (err) {
    console.error('Coverage error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Protein details
router.get('/proteins/:protein_id/details', async (req, res) => {
  const displayId = req.params.protein_id;
  try {
    const doc = await findProteinByDisplayId(displayId, {
      _id: 0, protein_id: 1, hvo_id: 1, description: 1, q_value: 1,
      uniprot_id: 1, hydrophobicity: 1, pI: 1, molecular_weight: 1, species_id: 1
    });

    if (!doc) return res.status(404).json({ error: 'Protein not found' });

    res.json({
      ...doc,
      // protein_id is always the UniProt accession in the new schema;
      // molecular_weight comes straight through the spread now that the DB
      // field is snake_case.
      uniprot_id: doc.uniprot_id || doc.protein_id || null,
    });
  } catch (err) {
    console.error('Protein details error:', err);
    res.status(500).json({ error: 'Failed to fetch protein details' });
  }
});

// Unique peptide-sequence count
router.get('/proteins/:protein_id/psm-count', async (req, res) => {
  const displayId = req.params.protein_id;
  try {
    const objectId = await resolveProteinId(displayId);
    if (!objectId) return res.status(404).json({ error: `Protein ${displayId} not found` });

    const result = await Peptide.aggregate([
      { $match: { protein_id: objectId } },
      { $group: { _id: '$sequence' } },
      { $count: 'unique_sequences' },
    ]).exec();
    const count = result?.[0]?.unique_sequences ?? 0;
    res.json({ protein_id: displayId, psm_count: count });
  } catch (err) {
    console.error('PSM count error:', err);
    res.status(500).json({ error: 'Failed to compute PSM count' });
  }
});

// Bundled plot-page data (Redis-first, falls back to 404 so the client can use individual endpoints)
router.get('/proteins/:protein_id/page', async (req, res) => {
  const displayId = req.params.protein_id;
  try {
    let page = await getProteinPage(displayId);

    if (!page) {
      // Try the canonical (non-HVO) id too
      const doc = await findProteinByDisplayId(displayId, { hvo_id: 1, protein_id: 1 });
      if (doc) {
        const alt = doc.hvo_id || doc.protein_id;
        if (alt && alt !== displayId) page = await getProteinPage(alt);
      }
    }

    if (!page) return res.status(404).json({ error: 'Page cache miss' });

    let psmsByDataset = [];
    try {
      psmsByDataset = (await getPsmsByDataset(displayId)) || [];
    } catch { /* non-fatal */ }

    res.json({
      source: 'redis',
      coverage: page.coverage,
      details: page.details,
      psm_count: page.psm_count,
      sequence: page.sequence,
      psmsByDataset,
    });
  } catch (err) {
    console.error('proteins/page error', err);
    res.status(500).json({ error: 'Failed to fetch protein page' });
  }
});

// Features for Nightingale tracks — reshapes cached sequence + mods + peptides
router.get('/proteins/:protein_id/features', async (req, res) => {
  const displayId = req.params.protein_id;
  try {
    // Try Redis page bundle first, fall back to the DB-backed endpoints
    let page = await getProteinPage(displayId);
    if (!page) {
      const doc = await findProteinByDisplayId(displayId, { hvo_id: 1, protein_id: 1 });
      const alt = doc && (doc.hvo_id || doc.protein_id);
      if (alt && alt !== displayId) page = await getProteinPage(alt);
    }

    let sequence, modifications;
    if (page) {
      sequence = page.sequence.sequence;
      modifications = page.sequence.modifications || [];
    } else {
      const doc = await findProteinByDisplayId(displayId, { _id: 1, sequence: 1 });
      if (!doc || !doc.sequence) return res.status(404).json({ error: 'Protein not found' });
      sequence = doc.sequence;
      const peps = await Peptide.find(
        {
          protein_id: doc._id,
          $or: [{ q_value: { $lte: Q_VALUE_THRESHOLD } }, { q_value: null }, { q_value: { $exists: false } }],
        },
        { sequence: 1, start_index: 1, end_index: 1, modification: 1, _id: 0 },
      ).lean();
      modifications = [];
      const seen = new Set();
      const re = /(.+):(\d+)$/;
      for (const p of peps) {
        let colored = false;
        if (p.modification) {
          for (const part of String(p.modification).split(';')) {
            const m = re.exec(part.trim());
            if (!m) continue;
            const type = canonicalModType(m[1]);
            if (!type) continue;
            const rel = parseInt(m[2], 10);
            const abs = p.start_index + rel - 1;
            if (abs < 1 || abs > sequence.length) continue;
            const key = `${abs}|${type}`;
            if (seen.has(key)) continue;
            seen.add(key);
            modifications.push({
              position: abs, type, color: MOD_COLORS[type],
              peptideStart: p.start_index, peptideEnd: p.end_index, peptideSequence: p.sequence,
            });
            colored = true;
          }
        }
        if (!colored) {
          modifications.push({
            position: null, type: 'Covered', color: null,
            peptideStart: p.start_index, peptideEnd: p.end_index, peptideSequence: p.sequence,
          });
        }
      }
    }

    const length = sequence.length;

    // Peptides track — dedupe by start-end
    const peptideMap = new Map();
    for (const m of modifications) {
      if (typeof m.peptideStart !== 'number' || typeof m.peptideEnd !== 'number') continue;
      const k = `${m.peptideStart}-${m.peptideEnd}`;
      if (!peptideMap.has(k)) {
        peptideMap.set(k, {
          accession: `pep-${peptideMap.size}`,
          start: m.peptideStart,
          end: m.peptideEnd,
          color: '#6FA8DC',
          shape: 'rectangle',
          tooltipContent: `<strong>Peptide</strong><br/>${m.peptideSequence}<br/>Position: ${m.peptideStart}-${m.peptideEnd}`,
        });
      }
    }

    // Modifications track — colored points
    const modFeatures = [];
    const modSeen = new Set();
    for (const m of modifications) {
      if (m.position == null || !m.color) continue;
      const k = `${m.position}|${m.type}`;
      if (modSeen.has(k)) continue;
      modSeen.add(k);
      modFeatures.push({
        accession: `mod-${m.type}-${m.position}`,
        start: m.position,
        end: m.position,
        color: m.color,
        shape: 'circle',
        type: m.type,
        tooltipContent: `<strong>${m.type}</strong> modification<br/>Position: ${m.position}`,
      });
    }

    // Enzyme sites — derived from sequence
    const trypsinSites = [];
    const glucSites = [];
    for (let i = 0; i < length; i++) {
      const aa = sequence[i];
      const pos = i + 1;
      if (aa === 'K' || aa === 'R') {
        trypsinSites.push({
          accession: `tryp-${pos}`, start: pos, end: pos,
          color: '#14B8A6', shape: 'circle',
          tooltipContent: `<strong>Trypsin site</strong><br/>${aa} at position ${pos}`,
        });
      }
      if (aa === 'D' || aa === 'E') {
        glucSites.push({
          accession: `gluc-${pos}`, start: pos, end: pos,
          color: '#86EFAC', shape: 'circle',
          tooltipContent: `<strong>GluC site</strong><br/>${aa} at position ${pos}`,
        });
      }
    }

    res.json({
      proteinId: displayId,
      sequence,
      length,
      peptides: Array.from(peptideMap.values()),
      modifications: modFeatures,
      trypsinSites,
      glucSites,
    });
  } catch (err) {
    console.error('features endpoint error:', err);
    res.status(500).json({ error: 'Failed to build features' });
  }
});

// PSM by Dataset — direct indexed match on PSMs.protein_id, grouped by dataset_id.
// Powered by the rebuilt MongoDB (TestArcPP2). Replaces the 4-stage join chain
// and the Redis psms:* cache.
router.get('/proteins/:proteinId/psms-by-dataset', async (req, res) => {
  try {
    const { proteinId } = req.params;
    const startTime = Date.now();
    const data = await getPsmsByDataset(proteinId);

    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No PSM data found for protein ${proteinId}`,
        proteinId,
        data: []
      });
    }

    res.json({
      success: true,
      proteinId,
      data,
      source: 'mongo',
      responseTimeMs: Date.now() - startTime
    });
  } catch (error) {
    console.error('PSM DATA ERROR:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Per-peptide overview for a protein: sequence, PSM count, datasets.
// Powers the downloadable peptide table on the protein page.
router.get('/proteins/:protein_id/peptides', async (req, res) => {
  try {
    const { protein_id } = req.params;
    const data = await getPeptidesByProtein(protein_id);

    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No peptide data found for protein ${protein_id}`,
        protein_id,
        data: [],
      });
    }

    res.json({ success: true, protein_id, data });
  } catch (error) {
    console.error('Peptides-by-protein error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
