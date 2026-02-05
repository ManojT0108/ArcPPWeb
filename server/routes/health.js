const router = require('express').Router();
const { getCacheStats } = require('../services/psmRedisService');

router.get('/ping', (_req, res) => res.json({ ok: true }));

router.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mongodb: 'connected',
    redis: 'connected'
  });
});

router.get('/cache/stats', async (req, res) => {
  try {
    console.log('📊 Cache stats requested');
    const stats = await getCacheStats();
    console.log('   Stats:', stats);
    res.json({ success: true, ...stats });
  } catch (error) {
    console.error('❌ Cache stats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
