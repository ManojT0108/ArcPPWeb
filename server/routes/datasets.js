const router = require('express').Router();
const Dataset = require('../model/datasets');
const { fetchSummariesBatched } = require('../utils/datasetCache');

router.get('/datasets/ids', async (_req, res) => {
  try {
    const ids = await Dataset.distinct('name');
    const unique = Array.from(new Set(ids.map((s) => String(s).trim()))).sort();
    res.json(unique);
  } catch (e) {
    console.error('datasets/ids error', e);
    res.status(500).json({ error: 'Failed to fetch dataset IDs' });
  }
});

router.get('/datasets/summaries', async (_req, res) => {
  try {
    const ids = await Dataset.distinct('name');
    const uniqueIds = Array.from(new Set(ids.map((s) => String(s).trim()))).sort();
    if (!uniqueIds.length) return res.json([]);
    const summaries = await fetchSummariesBatched(uniqueIds, 4);
    res.json(summaries);
  } catch (e) {
    console.error('datasets/summaries error', e);
    res.status(500).json({ error: 'Failed to build dataset summaries' });
  }
});

module.exports = router;
