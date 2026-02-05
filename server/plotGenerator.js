const Peptide = require('./model/peptides.js');
const Protein = require('./model/proteins.js');

// === Main function to extract relevant data ===
async function getPlotDataForProtein(targetId) {
  const proteinDoc = await Protein.findOne(
    { protein_id: targetId },
    { _id: 1, sequence: 1 }
  ).lean();

  if (!proteinDoc || !proteinDoc.sequence) {
    throw new Error(`Protein ${targetId} not found in database`);
  }

  const fasta = proteinDoc.sequence;

  const trypsinPositions = [];
  for (let i = 0; i < fasta.length; i++) {
    if (fasta[i] === 'K' || fasta[i] === 'R') {
      trypsinPositions.push(i + 1);
    }
  }

  const peptides = await Peptide.find(
    { protein_id: proteinDoc._id },
    { sequence: 1, startIndex: 1, endIndex: 1, modification: 1, _id: 0 }
  ).lean();

  const response = {
    sequenceLength: fasta.length,
    sequenceLetters: fasta.split(""),
    trypsin: trypsinPositions,
    peptides: peptides.map(p => ({
      start: p.startIndex,
      stop: p.endIndex,
      sequence: p.sequence,
      modifications: p.modification
    }))
  };

  return response;
}

module.exports = { getPlotDataForProtein };
