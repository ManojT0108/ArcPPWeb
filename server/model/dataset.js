// models/DataSet.js
const mongoose = require('mongoose');

const datasetSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g., "PXD021874"
  peptide_id: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Peptide' }]
});

module.exports = mongoose.model('DataSet', datasetSchema);
