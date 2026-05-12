const router = require('express').Router();

router.get('/ping', (_req, res) => res.json({ ok: true }));

router.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

module.exports = router;
