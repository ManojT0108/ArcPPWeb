const Peptide = require('./model/peptides');
const Protein = require('./model/proteins');

// Compute the covered AA positions using start/endIndex and qValue
async function getCoveredLength(proteinObjectId) {
  const peptides = await Peptide.find({
    protein_id: proteinObjectId,
    qValue: { $lte: 0.005 }
  }, {
    startIndex: 1,
    endIndex: 1,
    _id: 0
  }).lean();

  const covered = new Set();

  for (const pep of peptides) {
    const { startIndex: start, endIndex: end } = pep;
    if (typeof start === 'number' && typeof end === 'number' && end >= start) {
      for (let i = start; i <= end; i++) {
        covered.add(i);
      }
    }
  }

  return covered.size;
}

// Main function to calculate peptide coverage
async function getProteinCoverage(proteinId) {
  const proteinDoc = await Protein.findOne(
    { protein_id: proteinId },
    { _id: 1, sequence: 1 }
  ).lean();

  if (!proteinDoc || !proteinDoc.sequence) {
    throw new Error(`Protein ${proteinId} not found in database`);
  }

  const totalLength = proteinDoc.sequence.length;
  const coveredLength = await getCoveredLength(proteinDoc._id);
  const coveragePercent = (coveredLength / totalLength) * 100;

  return {
    protein_id: proteinId,
    total_length: totalLength,
    covered_length: coveredLength,
    coverage_percent: coveragePercent
  };
}

module.exports = { getProteinCoverage };
