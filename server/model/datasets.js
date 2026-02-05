const mongoose = require('mongoose');

const DatasetSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, index: true },
  },
  { collection: 'DataSets', timestamps: false }
);

module.exports = mongoose.model('Dataset', DatasetSchema, 'DataSets');