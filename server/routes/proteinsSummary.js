const router = require('express').Router();
const pLimit = require('p-limit');
const Protein = require('../model/proteins');
const Peptide = require('../model/peptides');
const { searchProteins, getAllProteinSummaries, getProteinSummary } = require('../services/proteinSummaryCache');
const { getProteinCoverage } = require('../coverage');
const { speciesToProteinIdFilter } = require('../utils/speciesFilter');

const concurrency = pLimit(6);

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

    // TRY REDIS FIRST (only if no filters)
    if (selectedDatasets.length === 0 && selectedOverlaps.length === 0) {
      console.log('   🔍 Checking Redis cache...');

      try {
        const speciesPrefix = speciesId === 'Haloferax volcanii' ? 'HVO_' : '';

        if (searchQuery.trim()) {
          const matchingIds = await searchProteins(searchQuery, speciesPrefix);

          if (matchingIds.length > 0) {
            console.log(`   ✅ Redis search found ${matchingIds.length} matches`);

            const allRows = [];
            for (const proteinId of matchingIds) {
              const summary = await getProteinSummary(proteinId);
              if (summary) allRows.push(summary);
            }

            allRows.sort((a, b) => a.hvoId.localeCompare(b.hvoId, undefined, { numeric: true }));

            const total = allRows.length;
            const rows = allRows.slice(offset, offset + limitN);

            const elapsed = Date.now() - startTime;
            console.log(`   ⚡ Redis response in ${elapsed}ms\n`);

            return res.json({ speciesId, total, offset, limit: limitN, rows, source: 'redis' });
          }
        } else {
          const result = await getAllProteinSummaries(speciesPrefix, offset, limitN);

          if (result.total > 0) {
            console.log(`   ✅ Redis cache hit: ${result.total} proteins`);
            const elapsed = Date.now() - startTime;
            console.log(`   ⚡ Redis response in ${elapsed}ms\n`);

            return res.json({
              speciesId,
              total: result.total,
              offset,
              limit: limitN,
              rows: result.rows,
              source: 'redis'
            });
          }
        }

        console.log('   ⚠️  Redis cache miss, falling back to MongoDB...');
      } catch (redisErr) {
        console.error('   ❌ Redis error:', redisErr.message);
        console.log('   ⚠️  Falling back to MongoDB...');
      }
    } else {
      console.log("   ℹ️  Filters applied, using MongoDB (Redis doesn't support complex filters yet)");
    }

    let filter = speciesToProteinIdFilter(speciesId);

    let matchingProteinIds = null;

    if (selectedDatasets.length > 0) {
      filter.dataset_ids = { $in: selectedDatasets };
    }

    if (selectedOverlaps.length > 0) {
      const proteinsWithOverlap = await Protein.find(
        filter,
        { protein_id: 1, dataset_ids: 1 }
      ).lean();

      matchingProteinIds = proteinsWithOverlap
        .filter(p => {
          const count = Array.isArray(p.dataset_ids) ? p.dataset_ids.length : 0;
          return selectedOverlaps.includes(count);
        })
        .map(p => p.protein_id);

      if (matchingProteinIds.length === 0) {
        return res.json({ speciesId, total: 0, offset, limit: limitN, rows: [] });
      }

      filter.protein_id = { $in: matchingProteinIds };
    }

    if (selectedDatasets.length > 0 && selectedOverlaps.length > 0) {
      const proteinsInDatasets = await Protein.find(
        {
          ...speciesToProteinIdFilter(speciesId),
          dataset_ids: { $in: selectedDatasets }
        },
        { protein_id: 1, dataset_ids: 1 }
      ).lean();

      matchingProteinIds = proteinsInDatasets
        .filter(p => {
          const count = Array.isArray(p.dataset_ids) ? p.dataset_ids.length : 0;
          return selectedOverlaps.includes(count);
        })
        .map(p => p.protein_id);

      if (matchingProteinIds.length === 0) {
        return res.json({ speciesId, total: 0, offset, limit: limitN, rows: [] });
      }

      filter = {
        ...speciesToProteinIdFilter(speciesId),
        protein_id: { $in: matchingProteinIds }
      };
    }

    // Handle search with modifications
    let proteinIdsFromModSearch = [];
    if (searchQuery.trim()) {
      const speciesProteinDocs = await Protein.find(
        { protein_id: { $regex: `^${speciesId === 'Haloferax volcanii' ? 'HVO_' : ''}`, $options: 'i' } },
        { _id: 1, protein_id: 1 }
      ).lean();
      const speciesObjectIds = speciesProteinDocs.map(p => p._id);
      const objIdToName = {};
      for (const p of speciesProteinDocs) {
        objIdToName[p._id.toString()] = p.protein_id;
      }

      const peptidesWithMod = await Peptide.find(
        {
          protein_id: { $in: speciesObjectIds },
          modification: { $regex: searchQuery.trim(), $options: 'i' }
        },
        { protein_id: 1, _id: 0 }
      ).lean();

      proteinIdsFromModSearch = [...new Set(peptidesWithMod.map(p => objIdToName[p.protein_id.toString()]).filter(Boolean))];
    }

    if (searchQuery.trim()) {
      const searchRegex = { $regex: searchQuery.trim(), $options: 'i' };
      filter.$or = [
        { protein_id: searchRegex },
        { uniProtein_id: searchRegex },
        { description: searchRegex },
        { dataset_ids: searchRegex }
      ];

      if (proteinIdsFromModSearch.length > 0) {
        filter.$or.push({ protein_id: { $in: proteinIdsFromModSearch } });
      }
    }

    let total = await Protein.countDocuments(filter).exec();

    if (total === 0 && !searchQuery.trim() && selectedDatasets.length === 0 && selectedOverlaps.length === 0) {
      filter = { protein_id: { $regex: '^HVO_\\d{4}$', $options: 'i' } };
      total = await Protein.countDocuments(filter).exec();
    }

    const proteinDocs = await Protein.find(
      filter,
      { _id: 1, protein_id: 1, uniProtein_id: 1, description: 1, dataset_ids: 1 }
    )
      .sort({ protein_id: 1 })
      .skip(offset)
      .limit(limitN)
      .lean()
      .exec();

    const rows = await Promise.all(
      proteinDocs.map((doc) =>
        concurrency(async () => {
          const pid = doc.protein_id;

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
            const peptides = await Peptide.find(
              { protein_id: doc._id },
              { modification: 1, _id: 0 }
            ).lean();

            const modSet = new Set();
            peptides.forEach(pep => {
              if (pep.modification && pep.modification !== 'N/A' && pep.modification.trim()) {
                const mods = pep.modification.split(';');
                mods.forEach(mod => {
                  const modType = mod.split(':')[0].trim();
                  if (modType) modSet.add(modType);
                });
              }
            });
            modifications = Array.from(modSet).sort();
          } catch (err) {
            console.error(`Failed to get modifications for ${pid}:`, err);
          }

          return {
            hvoId: pid,
            uniProtId: doc.uniProtein_id || '',
            psmCount,
            coveragePercent,
            datasets: Array.isArray(doc.dataset_ids) ? doc.dataset_ids.filter(Boolean) : [],
            description: doc.description || '',
            modifications: modifications,
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
