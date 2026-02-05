// ============================================================================
// REDIS CACHE FOR PROTEIN SUMMARIES
// Fast lookup for protein table data
// ============================================================================

const { redisClient } = require('./psmRedisService');

/**
 * Get protein summary from Redis cache
 * @param {string} proteinId - The protein ID (e.g., "HVO_0001")
 * @returns {Promise<Object|null>} Protein summary object or null
 */
async function getProteinSummary(proteinId) {
  const cacheKey = `protein:summary:${proteinId}`;

  try {
    if (!redisClient.isOpen) {
      return null;
    }

    const data = await redisClient.get(cacheKey);

    if (data) {
      return JSON.parse(data);
    }

    return null;
  } catch (err) {
    console.error(`❌ Redis error getting summary for ${proteinId}:`, err.message);
    return null;
  }
}

/**
 * Set protein summary in Redis cache
 * @param {string} proteinId - The protein ID
 * @param {Object} summary - Protein summary data
 */
async function setProteinSummary(proteinId, summary) {
  const cacheKey = `protein:summary:${proteinId}`;

  try {
    if (!redisClient.isOpen) {
      return false;
    }

    await redisClient.set(cacheKey, JSON.stringify(summary));
    return true;
  } catch (err) {
    console.error(`❌ Redis error setting summary for ${proteinId}:`, err.message);
    return false;
  }
}

/**
 * Search for proteins by ID, UniProt ID, or description
 * @param {string} searchQuery - Search term
 * @param {string} speciesPrefix - Species prefix (e.g., "HVO_")
 * @returns {Promise<Array>} Array of matching protein IDs
 */
async function searchProteins(searchQuery, speciesPrefix = 'HVO_') {
  try {
    if (!redisClient.isOpen) {
      return [];
    }

    const pattern = `protein:summary:${speciesPrefix}*`;
    const keys = await redisClient.keys(pattern);

    if (!searchQuery || !searchQuery.trim()) {
      // No search query - return all protein IDs
      return keys.map(k => k.replace('protein:summary:', ''));
    }

    const query = searchQuery.trim().toLowerCase();
    const matches = [];

    // Check each protein for matches
    for (const key of keys) {
      const data = await redisClient.get(key);
      if (!data) continue;

      const summary = JSON.parse(data);
      const proteinId = key.replace('protein:summary:', '');

      // Check if search query matches protein_id, uniProtein_id, or description
      if (
        proteinId.toLowerCase().includes(query) ||
        (summary.uniProtId && summary.uniProtId.toLowerCase().includes(query)) ||
        (summary.description && summary.description.toLowerCase().includes(query)) ||
        (Array.isArray(summary.datasets) && summary.datasets.some(d => d.toLowerCase().includes(query)))
      ) {
        matches.push(proteinId);
      }
    }

    return matches;
  } catch (err) {
    console.error('❌ Redis search error:', err.message);
    return [];
  }
}

/**
 * Get all protein summaries for a species (with pagination)
 * @param {string} speciesPrefix - Species prefix (e.g., "HVO_")
 * @param {number} offset - Skip this many results
 * @param {number} limit - Return this many results
 * @returns {Promise<Object>} {total, rows}
 */
async function getAllProteinSummaries(speciesPrefix = 'HVO_', offset = 0, limit = 25) {
  try {
    if (!redisClient.isOpen) {
      return { total: 0, rows: [] };
    }

    const pattern = `protein:summary:${speciesPrefix}*`;
    const keys = await redisClient.keys(pattern);

    // Sort protein IDs naturally
    const sortedKeys = keys.sort((a, b) => {
      const idA = a.replace('protein:summary:', '');
      const idB = b.replace('protein:summary:', '');
      return idA.localeCompare(idB, undefined, { numeric: true });
    });

    const total = sortedKeys.length;
    const pageKeys = sortedKeys.slice(offset, offset + limit);

    const rows = [];
    for (const key of pageKeys) {
      const data = await redisClient.get(key);
      if (data) {
        const summary = JSON.parse(data);
        rows.push(summary);
      }
    }

    return { total, rows };
  } catch (err) {
    console.error('❌ Redis error getting all summaries:', err.message);
    return { total: 0, rows: [] };
  }
}

module.exports = {
  getProteinSummary,
  setProteinSummary,
  searchProteins,
  getAllProteinSummaries
};
