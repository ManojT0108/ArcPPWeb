// models/Protein.js
const mongoose = require('mongoose');

const proteinSchema = new mongoose.Schema({
  name: String,
  protein_id: { type: String, required: true }, // e.g., "HVO_0001"
  uni_protein_id: String,
  q_value: Number,
  species_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Species' }
});

module.exports = mongoose.model('Protein', proteinSchema);
