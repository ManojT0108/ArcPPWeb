const Protein = require('../model/proteins');

// Resolve any protein identifier (hvo_id or protein_id) to its MongoDB ObjectId.
async function resolveProteinId(idStr) {
  if (!idStr) return null;
  // Try hvo_id first (HVO-style IDs)
  let doc = await Protein.findOne({ hvo_id: idStr }, { _id: 1 }).lean();
  if (doc) return doc._id;
  // Fall back to protein_id (UniProt accessions and other species)
  doc = await Protein.findOne({ protein_id: idStr }, { _id: 1 }).lean();
  return doc ? doc._id : null;
}

async function resolveProteinIds(idStrs) {
  if (!idStrs || idStrs.length === 0) return [];
  const docs = await Protein.find(
    { $or: [{ hvo_id: { $in: idStrs } }, { protein_id: { $in: idStrs } }] },
    { _id: 1 }
  ).lean();
  return docs.map(d => d._id);
}

async function resolveProteinIdsByFilter(filter) {
  const docs = await Protein.find(filter, { _id: 1 }).lean();
  return docs.map(d => d._id);
}

module.exports = { resolveProteinId, resolveProteinIds, resolveProteinIdsByFilter };
