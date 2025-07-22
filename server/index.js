const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const app = express();
const { getPlotDataForProtein, testData, testPeptides } = require('./plotGenerator');
const connectToMongo = require('./mongo/connect');
const Peptide = require('./model/peptides');

connectToMongo();

const PORT = 5001;

app.use(cors());
app.use(express.json());

// === Endpoint 1: Unique HVO IDs ===
app.get('/api/hvo-ids', (req, res) => {
  const filePath = path.join(__dirname, 'data', 'protein_ids_Haloferax_volcanii.csv');
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Failed to read CSV file' });

    const lines = data.trim().split('\n');
    const headers = lines[0].split(',');
    const hvoIndex = headers.indexOf('HVO ID');
    if (hvoIndex === -1) return res.status(400).json({ error: 'HVO ID column not found in CSV' });

    const hvoSet = new Set();
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',');
      const hvoId = row[hvoIndex]?.trim();
      if (hvoId) hvoSet.add(hvoId);
    }

    res.json(Array.from(hvoSet).sort());
  });
});

app.get('/api/peptides/selected-fields', async(req, res) => {
  try{
    const results = await Peptide.aggregate([
      { $match: { protein_id: "HVO_2072" } },
      {
        $project: {
          _id: 0,
          protein_id: 1,
          modification: 1,
          sequence: 1,
          startIndex: 1,
          endIndex: 1
        }
      }
    ]);

    res.json(results);
  } catch (err) {
    console.error('❌ Aggregation error:', err);
    res.status(500).json({ error: 'Failed to fetch peptides' });
  }
});

app.get('/api/protein-data/:hvoId', (req, res) => {
  const hvoId = req.params.hvoId;
  // const csvPath = path.join(__dirname, 'data', 'Full_PSMs.csv');
  const fastaPath = path.join(__dirname, 'data', 'Hfvol_prot_190606.fasta');

  try {
    const plotData = getPlotDataForProtein(hvoId, fastaPath);
    console.log(plotData)
    res.json(plotData);
  } catch (error) {
    console.error("❌ Error generating plot data:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// === Start server ===
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
