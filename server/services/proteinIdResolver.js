const Protein = require('../model/proteins');

/**
 * Resolve a protein_id string (e.g. "HVO_0001") to its MongoDB ObjectId.
 * Returns null if not found.
 */
async function resolveProteinId(proteinIdStr) {
  const doc = await Protein.findOne(
    { protein_id: proteinIdStr },
    { _id: 1 }
  ).lean();
  return doc ? doc._id : null;
}

/**
 * Resolve multiple protein_id strings to their MongoDB ObjectIds.
 * Returns an array of ObjectIds (excludes not-found entries).
 */
async function resolveProteinIds(proteinIdStrs) {
  if (!proteinIdStrs || proteinIdStrs.length === 0) return [];
  const docs = await Protein.find(
    { protein_id: { $in: proteinIdStrs } },
    { _id: 1 }
  ).lean();
  return docs.map(d => d._id);
}

/**
 * Resolve protein_id strings matching a filter (e.g. regex) to ObjectIds.
 * Returns an array of ObjectIds.
 */
async function resolveProteinIdsByFilter(filter) {
  const docs = await Protein.find(filter, { _id: 1 }).lean();
  return docs.map(d => d._id);
}

module.exports = { resolveProteinId, resolveProteinIds, resolveProteinIdsByFilter };
