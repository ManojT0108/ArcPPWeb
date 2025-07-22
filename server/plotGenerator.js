const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');
const Peptide = require('./model/peptides.js');

// === Load protein sequence from FASTA ===
function loadFasta(targetId, fastaPath) {
  const lines = fs.readFileSync(fastaPath, 'utf8').split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith(">") && lines[i].includes(targetId)) {
      return lines[i + 1].trim(); // ✅ One line only
    }
  }
  return null;
}

// === Main function to extract relevant data ===
async function getPlotDataForProtein(targetId, fastaPath) {
  const fasta = loadFasta(targetId, fastaPath);
  if (!fasta) throw new Error("Protein not found in FASTA");

  // console.log("🧬 FASTA length:", fasta.length);
  
  const trypsinPositions = [];
  for (let i = 0; i < fasta.length; i++) {
    if (fasta[i] === 'K' || fasta[i] === 'R') {
      trypsinPositions.push(i + 1);
    }
  }

  // console.log("🔬 Trypsin sites found:", trypsinPositions.length);
  // const csvData = fs.readFileSync(csvPath, 'utf8');
  // console.log(csvData)
  // const results = Papa.parse(csvData, {
  //   header: true,
  //   skipEmptyLines: true
  // });

  // const peptideData = results.data.filter(row => row['HVO ID'] === targetId);
  // console.log("🧪 Peptides for", targetId, "→", peptideData.length);

  // // DEBUG: sample modifications if any
  // const sampleMods = peptideData.slice(0, 3).map(p => p["Modifications"]);
  // console.log("🧾 Sample modifications:", sampleMods);

  // // Build response object
  // const response = {
  //   sequenceLength: fasta.length,
  //   sequenceLetters: fasta.split(""),
  //   trypsin: trypsinPositions,
  //   peptides: peptideData.map(row => ({
  //     start: parseInt(row["Sequence Start"]),
  //     stop: parseInt(row["Sequence Stop"]),
  //     sequence: row["Sequence"],
  //     modifications: row["Modifications"]
  //   }))
  // };

  // // DEBUG: log size estimate
  // const jsonSize = Buffer.byteLength(JSON.stringify(response));
  // console.log("📦 JSON size estimate (bytes):", jsonSize);

  // return response;

  // Fetch peptides for the given protein ID

    const peptides = await Peptide.find({protein_id: targetId});

    // console.log("Data", peptides)

    // console.log("🧪 Peptides for", targetId, "→", peptides.length);

    // DEBUG: sample modifications if any
    // const sampleMods = peptides.slice(0, 3).map(p => p.modification);
    // console.log("🧾 Sample modifications:", sampleMods);

    // Build response object
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
