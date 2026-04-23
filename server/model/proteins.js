const mongoose = require('mongoose');

const proteinSchema = new mongoose.Schema({
  protein_id: String,
  hvo_id: String,
  description: String,
  qValue: Number,
  species_id: String,
  uniProtein_id: String,
  sequence: String,
  Database_V: mongoose.Schema.Types.Mixed,
  arCOGlet: String,
  hydrophobicity: Number,
  molecularWeight: Number,
  pI: Number,
  dataset_ids: [String],
},
{ collection: 'Proteins' }
);
proteinSchema.index({ protein_id: 1 });
proteinSchema.index({ hvo_id: 1 });
proteinSchema.index({ species_id: 1 });

module.exports = mongoose.model('Protein', proteinSchema);
