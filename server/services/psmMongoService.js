// PSMs-by-dataset, computed from MongoDB with the new direct-FK schema.
//
// In the rebuilt PeptideSpectrumMatches collection, each PSM doc carries:
//   protein_id   ObjectId  → Proteins._id
//   peptide_id   ObjectId  → Peptides._id
//   dataSet_id   string    (PXD accession, denormalized from the source CSV)
//
// So a per-protein, per-dataset PSM count is a single indexed match + group —
// no joins through MassSpectrometryFiles or sequence-string keys.
//
// Required indexes (created by arcpp-ingestion at ingest time):
//   PeptideSpectrumMatches.protein_id, .dataSet_id, (protein_id, dataSet_id)
const mongoose = require('mongoose');
const Protein = require('../model/proteins');

async function _resolveProteinObjectId(displayId) {
  if (!displayId) return null;
  let p = await Protein.findOne({ hvo_id: displayId }, { _id: 1 }).lean();
  if (p) return p._id;
  p = await Protein.findOne({ protein_id: displayId }, { _id: 1 }).lean();
  return p ? p._id : null;
}

async function getPsmsByDataset(displayId) {
  const objectId = await _resolveProteinObjectId(displayId);
  if (!objectId) return [];

  const psms = mongoose.connection.db.collection('PeptideSpectrumMatches');
  return psms
    .aggregate([
      { $match: { protein_id: objectId } },
      { $group: { _id: '$dataSet_id', psmCount: { $sum: 1 } } },
      { $project: { _id: 0, dataset: '$_id', psmCount: 1 } },
      { $sort: { psmCount: -1 } },
    ])
    .toArray();
}

module.exports = { getPsmsByDataset };
