// Idempotently create the indexes needed for the PSM aggregation.
// Indexes do not modify documents; running this multiple times is safe.
const mongoose = require('mongoose');
require('dotenv').config();

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  const todo = [
    ['PeptideSpectrumMatches', { peptide_id: 1 }, 'psm_peptide_id'],
    ['MassSpectrometryFiles', { fileName: 1 }, 'msf_fileName'],
    ['Peptides', { protein_id: 1 }, 'pep_protein_id'],
  ];

  for (const [coll, spec, name] of todo) {
    const existing = await db.collection(coll).indexes();
    const already = existing.some((idx) => idx.name === name);
    if (already) {
      console.log(`✓ ${coll}.${name} already exists`);
      continue;
    }
    const start = Date.now();
    await db.collection(coll).createIndex(spec, { name });
    console.log(`+ Created ${coll}.${name} in ${Date.now() - start}ms`);
  }

  console.log('\nFinal indexes:');
  for (const [coll] of todo) {
    const idxs = await db.collection(coll).indexes();
    console.log(`  ${coll}: ${idxs.map((i) => i.name).join(', ')}`);
  }

  await mongoose.disconnect();
})();
