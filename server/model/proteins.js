const mongoose = require('mongoose');

const proteinSchema = new mongoose.Schema({
  protein_id: String,
  description: String,
  qValue: Number,
  species_id: String,
  uniProtein_id: String,
  sequence: String,
  Database_V: String,
  arCOGlet: String,
  hydrophobicity: Number,
  molecularWeight: Number,
  pI: Number,
},
{ collection: 'Proteins' }
);
proteinSchema.index({ protein_id: 1 }, { unique: false });
proteinSchema.index({ uniProtein_id: 1 }, { unique: false });

module.exports = mongoose.model('Protein', proteinSchema);
