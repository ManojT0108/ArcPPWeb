// ============================================================================
// Shared Redis client + the protein:page bundle fast-path used by the plot page.
// The legacy `psms:*` cache populated by the old ingestion was removed when
// PSM-by-dataset moved to psmMongoService.js (single indexed Mongo $match).
// server/services/psmRedisService.js
// ============================================================================

const redis = require('redis');

const redisClient = redis.createClient({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    reconnectStrategy: (retries) => {
      if (retries > 10) return new Error('Redis retry limit exhausted');
      return Math.min(retries * 100, 3000);
    },
  },
});

redisClient.on('error', (err) => console.error('❌ Redis Error:', err.message));
redisClient.on('connect', () => console.log('✅ Redis connected'));
redisClient.on('ready', () => console.log('✅ Redis ready'));

(async () => {
  try {
    await redisClient.connect();
  } catch (err) {
    console.error('❌ Failed to connect to Redis:', err.message);
  }
})();

process.on('SIGINT', async () => {
  console.log('\n👋 Closing Redis connection...');
  await redisClient.quit();
  process.exit(0);
});

/**
 * Get bundled plot-page data for a protein from Redis.
 * @param {string} proteinId
 * @returns {Promise<Object|null>}
 */
async function getProteinPage(proteinId) {
  if (!redisClient.isOpen) return null;
  try {
    const raw = await redisClient.get(`protein:page:${proteinId}`);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error(`Redis protein:page error for ${proteinId}:`, err.message);
    return null;
  }
}

module.exports = { redisClient, getProteinPage };
