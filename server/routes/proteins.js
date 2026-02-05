const router = require('express').Router();
const Protein = require('../model/proteins');
const Peptide = require('../model/peptides');
const { resolveProteinId } = require('../services/proteinIdResolver');
const { getPsmsByDataset } = require('../services/psmRedisService');
const { getProteinCoverage } = require('../coverage');
const { getPlotDataForProtein } = require('../plotGenerator');
const { MOD_COLORS, HVO_RE, UNIPROT_RE } = require('../utils/constants');

// HVO IDs from MongoDB
router.get('/hvo-ids', async (req, res) => {
  try {
    const ids = await Protein.distinct('protein_id', {
      protein_id: { $regex: '^HVO_', $options: 'i' }
    });
    res.json(ids.sort());
  } catch (e) {
    console.error('hvo-ids error', e);
    res.status(500).json({ error: 'Failed to fetch HVO IDs' });
  }
});

// Unified ID list — must be before /:protein_id routes
router.get('/proteins/ids', async (_req, res) => {
  try {
    const hvoRaw = await Protein.distinct('protein_id');
    const uniRaw = await Protein.distinct('uniProtein_id');

    const clean = (arr, re) =>
      arr
        .filter(Boolean)
        .map((s) => String(s).toUpperCase().trim())
        .filter((s) => re.test(s));

    const hvo = Array.from(new Set(clean(hvoRaw, HVO_RE))).sort();
    const uniprot = Array.from(new Set(clean(uniRaw, UNIPROT_RE))).sort();

    res.json({ hvo, uniprot });
  } catch (e) {
    console.error('proteins/ids error', e);
    res.status(500).json({ error: 'Failed to fetch protein IDs' });
  }
});

// Case-insensitive resolver — must be before /:protein_id routes
router.get('/proteins/resolve', async (req, res) => {
  try {
    const raw = (req.query.q || '').trim();
    if (!raw) return res.status(400).json({ error: 'Missing q' });

    const q = raw.trim();

    if (HVO_RE.test(q)) {
      const byHvo = await Protein.findOne(
        { protein_id: { $regex: `^${q}$`, $options: 'i' } },
        { _id: 0, protein_id: 1, uniProtein_id: 1, description: 1 }
      ).lean();
      if (byHvo) {
        return res.json({
          matchType: 'protein_id',
          protein_id: byHvo.protein_id,
          uniProtein_id: byHvo.uniProtein_id || null,
          description: byHvo.description || null,
        });
      }
    }

    if (UNIPROT_RE.test(q)) {
      const byUni = await Protein.findOne(
        { uniProtein_id: { $regex: `^${q}$`, $options: 'i' } },
        { _id: 0, protein_id: 1, uniProtein_id: 1, description: 1 }
      ).lean();

      if (byUni) {
        return res.json({
          matchType: 'uniProt',
          protein_id: byUni.protein_id,
          uniProtein_id: byUni.uniProtein_id || null,
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
    const proteinId = req.params.protein_id;
    console.log(`📖 Sequence request for ${proteinId}`);

    const proteinDoc = await Protein.findOne(
      { protein_id: proteinId },
      { _id: 1, sequence: 1 }
    ).lean();
    if (!proteinDoc || !proteinDoc.sequence) {
      console.log(`   ⚠️  Sequence not found for ${proteinId}`);
      return res.status(404).json({ error: 'Sequence not found' });
    }
    const sequence = proteinDoc.sequence;
    console.log(`   ✅ Sequence found (${sequence.length} AA)`);

    const peptideDocs = await Peptide.find(
      { protein_id: proteinDoc._id, qValue: { $lte: 0.005 } },
      { sequence: 1, startIndex: 1, endIndex: 1, modification: 1, _id: 0 }
    ).lean();
    const rows = peptideDocs.map(p => ({
      seq: p.sequence, start: p.startIndex, stop: p.endIndex, mods: p.modification
    }));

    const modifications = [];
    const re = /(.+):(\d+)$/;

    for (const r of rows) {
      let hasColoredMod = false;

      if (r.mods) {
        for (const part of String(r.mods).split(';')) {
          const m = re.exec(part.trim());
          if (!m) continue;

          const type = m[1].trim();
          const rel = parseInt(m[2], 10);
          const abs = r.start + rel - 1;

          if (abs < 1 || abs > sequence.length) continue;

          if (MOD_COLORS[type]) {
            modifications.push({
              position: abs,
              type: type,
              relativePosition: rel,
              peptideStart: r.start,
              peptideEnd: r.stop,
              peptideSequence: r.seq,
              color: MOD_COLORS[type]
            });
            hasColoredMod = true;
          }
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

    res.json({
      protein_id: proteinId,
      sequence: sequence,
      length: sequence.length,
      modifications: modifications
    });

  } catch (err) {
    console.error('❌ Sequence endpoint error for', req.params.protein_id, ':', err.message);
    res.status(500).json({ error: 'Failed to fetch sequence data' });
  }
});

// Legacy plot-friendly protein data
router.get('/protein-data/:hvoId', async (req, res) => {
  const hvoId = req.params.hvoId;
  try {
    const plotData = await getPlotDataForProtein(hvoId);
    res.json(plotData);
  } catch (error) {
    console.error('❌ Error generating plot data:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Coverage numbers
router.get('/coverage/:protein_id', async (req, res) => {
  const proteinId = req.params.protein_id;
  try {
    const coverage = await getProteinCoverage(proteinId);
    res.json(coverage);
  } catch (err) {
    console.error('❌ Coverage error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Protein details
router.get('/proteins/:protein_id/details', async (req, res) => {
  const proteinId = req.params.protein_id;
  try {
    console.log(`📊 Fetching protein details for ${proteinId}`);

    const doc = await Protein.findOne(
      { protein_id: proteinId },
      { _id: 0, protein_id: 1, description: 1, qValue: 1, uniProtein_id: 1, hydrophobicity: 1, pI: 1, molecularWeight: 1 }
    ).lean();

    if (!doc) {
      console.log(`   ⚠️  Protein ${proteinId} not found`);
      return res.status(404).json({ error: 'Protein not found' });
    }

    const result = {
      ...doc,
      molecular_weight: doc.molecularWeight,
    };
    delete result.molecularWeight;

    res.json(result);

  } catch (err) {
    console.error('❌ Protein details error:', err);
    res.status(500).json({ error: 'Failed to fetch protein details' });
  }
});

// Unique peptide-sequence count (PSM proxy)
router.get('/proteins/:protein_id/psm-count', async (req, res) => {
  const proteinId = req.params.protein_id;
  try {
    const objectId = await resolveProteinId(proteinId);
    if (!objectId) return res.status(404).json({ error: `Protein ${proteinId} not found` });

    const pipeline = [
      { $match: { protein_id: objectId } },
      { $group: { _id: '$sequence' } },
      { $count: 'unique_sequences' },
    ];
    const result = await Peptide.aggregate(pipeline).exec();
    const count = result?.[0]?.unique_sequences ?? 0;
    res.json({ protein_id: proteinId, psmCount: count });
  } catch (err) {
    console.error('❌ PSM count error:', err);
    res.status(500).json({ error: 'Failed to compute PSM count' });
  }
});

// PSM by Dataset (Redis only)
router.get('/proteins/:proteinId/psms-by-dataset', async (req, res) => {
  try {
    const { proteinId } = req.params;
    console.log(`\n📊 === PSM DATA REQUEST ===`);
    console.log(`   Protein ID: ${proteinId}`);

    const startTime = Date.now();
    let data = [];

    try {
      console.log(`   Fetching from Redis...`);
      data = await getPsmsByDataset(proteinId);
      console.log(`   📦 Redis returned ${data.length} datasets`);
    } catch (redisErr) {
      console.log(`   ⚠️  Redis failed:`, redisErr.message);
    }

    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No PSM data found for protein ${proteinId}`,
        proteinId,
        data: []
      });
    }

    const elapsed = Date.now() - startTime;
    console.log(`   ✅ Query completed in ${elapsed}ms from redis`);

    res.json({
      success: true,
      proteinId,
      data,
      source: 'redis',
      responseTimeMs: elapsed
    });

  } catch (error) {
    console.error(`\n❌ === PSM DATA ERROR ===`);
    console.error(`   Error:`, error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to fetch PSM data'
    });
  }
});

// Example aggregate (HVO_2072)
router.get('/peptides/selected-fields', async (req, res) => {
  try {
    const objectId = await resolveProteinId('HVO_2072');
    if (!objectId) return res.status(404).json({ error: 'Protein HVO_2072 not found' });

    const results = await Peptide.aggregate([
      { $match: { protein_id: objectId } },
      {
        $project: {
          _id: 0,
          protein_id: 1,
          modification: 1,
          sequence: 1,
          startIndex: 1,
          endIndex: 1,
        },
      },
    ]);
    res.json(results);
  } catch (err) {
    console.error('❌ Aggregation error:', err);
    res.status(500).json({ error: 'Failed to fetch peptides' });
  }
});

module.exports = router;
