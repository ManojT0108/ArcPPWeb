// loadFasta.js
const fs = require('fs');
const path = require('path');

function loadFasta(hvoId) {
  const fastaPath = path.join(__dirname, 'data', 'Hfvol_prot_190606.fasta');
  const lines = fs.readFileSync(fastaPath, 'utf8').split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('>')) {
      const currentId = lines[i].substring(1).split(/\s+/)[0];
      if (currentId === hvoId) {
        return lines[i + 1]?.trim() || null;
      }
    }
  }

  return null;
}

module.exports = loadFasta;
