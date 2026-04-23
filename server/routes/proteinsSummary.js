const router = require('express').Router();
const pLimit = require('p-limit');
const Protein = require('../model/proteins');
const Peptide = require('../model/peptides');
const { searchProteins, getAllProteinSummaries, getProteinSummary } = require('../services/proteinSummaryCache');
const { getProteinCoverage } = require('../coverage');
const { speciesToProteinIdFilter } = require('../utils/speciesFilter');

const concurrency = pLimit(6);

// Return the display ID for a protein doc (hvo_id for HVO, protein_id for others)
function displayId(doc) {
  return doc.hvo_id || doc.protein_id;
}

router.get('/species/:speciesId/proteins-summary', async (req, res) => {
  const startTime = Date.now();

  try {
    const { speciesId } = req.params;
    const limitN = Math.max(1, Math.min(200, parseInt(req.query.limit || '25', 10)));
    const offset = Math.max(0, parseInt(req.query.offset || '0', 10));
    const searchQuery = req.query.search || '';

    console.log(`\n📊 Protein summary request: species=${speciesId}, search="${searchQuery}", limit=${limitN}, offset=${offset}`);

    const selectedDatasets = req.query.datasets ? JSON.parse(req.query.datasets) : [];
    const selectedOverlaps = req.query.overlaps ? JSON.parse(req.query.overlaps) : [];

    // TRY REDIS FIRST (only if no dataset/overlap filters)
    if (selectedDatasets.length === 0 && selectedOverlaps.length === 0) {
      try {
        if (searchQuery.trim()) {
          const matchingIds = await searchProteins(searchQuery, speciesId);
          if (matchingIds.length > 0) {
            console.log(`   ✅ Redis search found ${matchingIds.length} matches`);
            const allRows = [];
            for (const id of matchingIds) {
              const summary = await getProteinSummary(id, speciesId);
              if (summary) allRows.push(summary);
            }
            allRows.sort((a, b) => a.hvoId.localeCompare(b.hvoId, undefined, { numeric: true }));
            const total = allRows.length;
            const rows = allRows.slice(offset, offset + limitN);
            console.log(`   ⚡ Redis response in ${Date.now() - startTime}ms\n`);
            return res.json({ speciesId, total, offset, limit: limitN, rows, source: 'redis' });
          }
        } else {
          const result = await getAllProteinSummaries(speciesId, offset, limitN);
          if (result.total > 0) {
            console.log(`   ✅ Redis cache hit: ${result.total} proteins`);
            console.log(`   ⚡ Redis response in ${Date.now() - startTime}ms\n`);
            return res.json({ speciesId, total: result.total, offset, limit: limitN, rows: result.rows, source: 'redis' });
          }
        }
        console.log('   ⚠️  Redis cache miss, falling back to MongoDB...');
      } catch (redisErr) {
        console.error('   Redis error:', redisErr.message);
      }
    } else {
      console.log('   ℹ️  Filters applied, using MongoDB');
    }

    let filter = speciesToProteinIdFilter(speciesId);

    if (selectedDatasets.length > 0) {
      filter.dataset_ids = { $in: selectedDatasets };
    }

    let matchingProteinIds = null;

    if (selectedOverlaps.length > 0) {
      const proteinsWithOverlap = await Protein.find(filter, { protein_id: 1, hvo_id: 1, dataset_ids: 1 }).lean();
      matchingProteinIds = proteinsWithOverlap
        .filter(p => {
          const count = Array.isArray(p.dataset_ids) ? p.dataset_ids.length : 0;
          return selectedOverlaps.includes(count);
        })
        .map(p => displayId(p));

      if (matchingProteinIds.length === 0) {
        return res.json({ speciesId, total: 0, offset, limit: limitN, rows: [] });
      }
      filter = { ...speciesToProteinIdFilter(speciesId), $or: [{ hvo_id: { $in: matchingProteinIds } }, { protein_id: { $in: matchingProteinIds } }] };
    }

    if (selectedDatasets.length > 0 && selectedOverlaps.length > 0) {
      const proteinsInDatasets = await Protein.find(
        { ...speciesToProteinIdFilter(speciesId), dataset_ids: { $in: selectedDatasets } },
        { protein_id: 1, hvo_id: 1, dataset_ids: 1 }
      ).lean();
      matchingProteinIds = proteinsInDatasets
        .filter(p => {
          const count = Array.isArray(p.dataset_ids) ? p.dataset_ids.length : 0;
          return selectedOverlaps.includes(count);
        })
        .map(p => displayId(p));

      if (matchingProteinIds.length === 0) {
        return res.json({ speciesId, total: 0, offset, limit: limitN, rows: [] });
      }
      filter = {
        ...speciesToProteinIdFilter(speciesId),
        $or: [{ hvo_id: { $in: matchingProteinIds } }, { protein_id: { $in: matchingProteinIds } }],
      };
    }

    if (searchQuery.trim()) {
      const speciesProteinDocs = await Protein.find(speciesToProteinIdFilter(speciesId), { _id: 1, protein_id: 1, hvo_id: 1 }).lean();
      const speciesObjectIds = speciesProteinDocs.map(p => p._id);
      const objIdToDisplay = {};
      for (const p of speciesProteinDocs) {
        objIdToDisplay[p._id.toString()] = displayId(p);
      }

      const peptidesWithMod = await Peptide.find(
        { protein_id: { $in: speciesObjectIds }, modification: { $regex: searchQuery.trim(), $options: 'i' } },
        { protein_id: 1, _id: 0 }
      ).lean();
      const idsFromMod = [...new Set(peptidesWithMod.map(p => objIdToDisplay[p.protein_id.toString()]).filter(Boolean))];

      const searchRegex = { $regex: searchQuery.trim(), $options: 'i' };
      const orClauses = [
        { protein_id: searchRegex },
        { hvo_id: searchRegex },
        { description: searchRegex },
        { dataset_ids: searchRegex },
      ];
      if (idsFromMod.length > 0) {
        orClauses.push({ $or: [{ hvo_id: { $in: idsFromMod } }, { protein_id: { $in: idsFromMod } }] });
      }
      filter.$or = orClauses;
    }

    const total = await Protein.countDocuments(filter).exec();
    const proteinDocs = await Protein.find(
      filter,
      { _id: 1, protein_id: 1, hvo_id: 1, uniProtein_id: 1, description: 1, dataset_ids: 1, species_id: 1 }
    )
      .sort({ protein_id: 1 })
      .skip(offset)
      .limit(limitN)
      .lean()
      .exec();

    const rows = await Promise.all(
      proteinDocs.map((doc) =>
        concurrency(async () => {
          const pid = displayId(doc);

          let psmCount = 0;
          try {
            const agg = await Peptide.aggregate([
              { $match: { protein_id: doc._id } },
              { $group: { _id: '$sequence' } },
              { $count: 'unique_sequences' },
            ]).exec();
            psmCount = agg?.[0]?.unique_sequences ?? 0;
          } catch {}

          let coveragePercent = 0;
          try {
            const cov = await getProteinCoverage(pid);
            coveragePercent = Number(cov?.coverage_percent || 0);
          } catch {}

          let modifications = [];
          try {
            const peptides = await Peptide.find({ protein_id: doc._id }, { modification: 1, _id: 0 }).lean();
            const modSet = new Set();
            peptides.forEach(pep => {
              if (pep.modification && pep.modification !== 'N/A' && pep.modification.trim()) {
                pep.modification.split(';').forEach(mod => {
                  const modType = mod.split(':')[0].trim();
                  if (modType) modSet.add(modType);
                });
              }
            });
            modifications = Array.from(modSet).sort();
          } catch {}

          return {
            hvoId: pid,
            // only show uniProtId when it differs from the display ID (i.e. HVO proteins)
            uniProtId: (doc.protein_id && doc.protein_id !== pid) ? doc.protein_id : '',
            species_id: doc.species_id || '',
            psmCount,
            coveragePercent,
            datasets: Array.isArray(doc.dataset_ids) ? doc.dataset_ids.filter(Boolean) : [],
            description: doc.description || '',
            modifications,
          };
        })
      )
    );

    res.json({ speciesId, total, offset, limit: limitN, rows });
  } catch (e) {
    console.error('species proteins-summary error', e);
    res.status(500).json({ error: 'Failed to build species protein summary' });
  }
});

module.exports = router;
