const { redisClient } = require('./psmRedisService');

// Deterministic species_id → Redis-key slug. No hardcoded species list: any
// species in the DB gets a stable slug automatically. Slug is internal to
// Redis keys only (clients always send the full species name); cacheRefresh
// writes and all reads use this same function, and keys are rebuilt every
// boot, so the mapping never needs maintaining when a species is added.
function speciesSlug(speciesId) {
  return String(speciesId || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function redisKey(speciesId, displayId) {
  return `protein:summary:${speciesSlug(speciesId)}:${displayId}`;
}

async function getProteinSummary(displayId, speciesId) {
  try {
    if (!redisClient.isOpen) return null;
    const data = await redisClient.get(redisKey(speciesId, displayId));
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error(`Redis error getting summary for ${displayId}:`, err.message);
    return null;
  }
}

async function setProteinSummary(displayId, speciesId, summary) {
  try {
    if (!redisClient.isOpen) return false;
    await redisClient.set(redisKey(speciesId, displayId), JSON.stringify(summary));
    return true;
  } catch (err) {
    console.error(`Redis error setting summary for ${displayId}:`, err.message);
    return false;
  }
}

async function getAllProteinSummaries(speciesId, offset = 0, limit = 25) {
  try {
    if (!redisClient.isOpen) return { total: 0, rows: [] };

    const pattern = `protein:summary:${speciesSlug(speciesId)}:*`;
    const keys = await redisClient.keys(pattern);

    const sortedKeys = keys.sort((a, b) => {
      const idA = a.split(':').slice(3).join(':');
      const idB = b.split(':').slice(3).join(':');
      return idA.localeCompare(idB, undefined, { numeric: true });
    });

    const total = sortedKeys.length;
    const pageKeys = sortedKeys.slice(offset, offset + limit);

    const rows = [];
    for (const key of pageKeys) {
      const data = await redisClient.get(key);
      if (data) rows.push(JSON.parse(data));
    }

    return { total, rows };
  } catch (err) {
    console.error('Redis error getting all summaries:', err.message);
    return { total: 0, rows: [] };
  }
}

async function searchProteins(searchQuery, speciesId) {
  try {
    if (!redisClient.isOpen) return [];

    const pattern = `protein:summary:${speciesSlug(speciesId)}:*`;
    const keys = await redisClient.keys(pattern);

    if (!searchQuery || !searchQuery.trim()) {
      return keys.map(k => k.split(':').slice(3).join(':'));
    }

    const query = searchQuery.trim().toLowerCase();
    const matches = [];

    for (const key of keys) {
      const data = await redisClient.get(key);
      if (!data) continue;
      const summary = JSON.parse(data);
      const displayId = key.split(':').slice(3).join(':');

      if (
        displayId.toLowerCase().includes(query) ||
        (summary.uniProtId && summary.uniProtId.toLowerCase().includes(query)) ||
        (summary.description && summary.description.toLowerCase().includes(query)) ||
        (Array.isArray(summary.datasets) && summary.datasets.some(d => d.toLowerCase().includes(query)))
      ) {
        matches.push(displayId);
      }
    }

    return matches;
  } catch (err) {
    console.error('Redis search error:', err.message);
    return [];
  }
}

module.exports = {
  speciesSlug,
  getProteinSummary,
  setProteinSummary,
  getAllProteinSummaries,
  searchProteins,
};
