const mongoose = require('mongoose');

const peptideSchema = new mongoose.Schema({
  sequence: String,
  endIndex: Number,
  modification: String,
  protein_id: String,
  qValue: Number,
  startIndex: Number
});

module.exports = mongoose.model('Peptide', peptideSchema, 'Peptides');