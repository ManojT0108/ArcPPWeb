#!/usr/bin/env node
require('dotenv').config();
const mongoose = require('mongoose');
const { redisClient } = require('../services/psmRedisService');
const { setProteinSummary } = require('../services/proteinSummaryCache');
const Protein = require('../model/proteins');
const Peptide = require('../model/peptides');
const { getProteinCoverage } = require('../coverage');
const BATCH_SIZE = 50;

async function connectToMongo() {
  const uri = process.env.MONGO_URI;
  if (!uri) { console.error('MONGO_URI not set'); process.exit(1); }
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('✅ Connected to MongoDB');
}

function displayId(doc) {
  return doc.hvo_id || doc.protein_id;
}

async function processProteinBatch(proteins) {
  const results = [];
  for (const doc of proteins) {
    const pid = displayId(doc);
    try {
      let psmCount = 0;
      try {
        const agg = await Peptide.aggregate([
          { $match: { protein_id: doc._id } },
          { $group: { _id: '$sequence' } },
          { $count: 'unique_sequences' },
        ]).exec();
        psmCount = agg?.[0]?.unique_sequences ?? 0;
      } catch {}

      let coveragePercent = 0;
      try {
        const cov = await getProteinCoverage(pid);
        coveragePercent = Number(cov?.coverage_percent || 0);
      } catch {}

      let modifications = [];
      try {
        const peptides = await Peptide.find({ protein_id: doc._id }, { modification: 1, _id: 0 }).lean();
        const modSet = new Set();
        peptides.forEach(p => {
          const mod = p.modification?.trim();
          if (mod && mod !== 'Unmodified') modSet.add(mod);
        });
        modifications = Array.from(modSet);
      } catch {}

      results.push({
        displayId: pid,
        speciesId: doc.species_id,
        summary: {
          hvoId: pid,
          uniProtId: (doc.protein_id && doc.protein_id !== pid) ? doc.protein_id : null,
          species_id: doc.species_id || null,
          description: doc.description || null,
          psmCount,
          coveragePercent: Math.round(coveragePercent * 10) / 10,
          datasets: Array.isArray(doc.dataset_ids) ? doc.dataset_ids : [],
          modifications,
        }
      });
    } catch (err) {
      console.error(`   ❌ Error processing ${pid}:`, err.message);
    }
  }
  return results;
}

async function populateCache() {
  console.log('\n' + '='.repeat(70));
  console.log('POPULATING PROTEIN SUMMARY CACHE FOR ALL SPECIES');
  console.log('='.repeat(70) + '\n');

  const startTime = Date.now();

  const speciesList = await Protein.distinct('species_id', { species_id: { $exists: true, $ne: null, $ne: '' } });
  console.log(`Found species: ${speciesList.join(', ')}\n`);

  let totalProcessed = 0;

  for (const speciesId of speciesList) {
    console.log(`\n🔬 Processing species: ${speciesId}`);
    const allProteins = await Protein.find(
      { species_id: speciesId },
      { _id: 1, protein_id: 1, hvo_id: 1, uniProtein_id: 1, description: 1, dataset_ids: 1, species_id: 1 }
    ).lean().exec();
    console.log(`   Found ${allProteins.length} proteins`);

    let processed = 0;
    const totalBatches = Math.ceil(allProteins.length / BATCH_SIZE);

    for (let i = 0; i < allProteins.length; i += BATCH_SIZE) {
      const batch = allProteins.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      console.log(`   📦 Batch ${batchNum}/${totalBatches}...`);
      const results = await processProteinBatch(batch);
      for (const { displayId: pid, speciesId: sid, summary } of results) {
        await setProteinSummary(pid, sid, summary);
        processed++;
      }
      console.log(`   ✅ ${processed}/${allProteins.length}`);
    }
    totalProcessed += processed;
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('\n' + '='.repeat(70));
  console.log(`Total proteins cached: ${totalProcessed}`);
  console.log(`Time: ${elapsed}s`);
  console.log('='.repeat(70));
}

async function main() {
  try {
    await connectToMongo();
    if (!redisClient.isOpen) {
      console.log('⏳ Waiting for Redis...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    if (!redisClient.isOpen) { console.error('Redis not connected'); process.exit(1); }
    await populateCache();
    await mongoose.connection.close();
    await redisClient.quit();
    process.exit(0);
  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  }
}

main();
