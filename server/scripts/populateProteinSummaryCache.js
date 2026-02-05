#!/usr/bin/env node
/**
 * Populate Redis with protein summary data for fast table loading
 * Run this script to cache all protein data
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { redisClient } = require('../services/psmRedisService');
const { setProteinSummary } = require('../services/proteinSummaryCache');
const Protein = require('../model/proteins');
const Peptide = require('../model/peptides');
const { getProteinCoverage } = require('../coverage');
const BATCH_SIZE = 50; // Process 50 proteins at a time

async function connectToMongo() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('❌ MONGO_URI not found in environment');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  }
}

async function processProteinBatch(proteins) {
  const results = [];

  for (const doc of proteins) {
    const pid = doc.protein_id;

    try {
      // 1. Get PSM count (use ObjectId to match Peptides.protein_id)
      let psmCount = 0;
      try {
        const agg = await Peptide.aggregate([
          { $match: { protein_id: doc._id } },
          { $group: { _id: '$sequence' } },
          { $count: 'unique_sequences' },
        ]).exec();
        psmCount = agg?.[0]?.unique_sequences ?? 0;
      } catch (err) {
        console.error(`   ⚠️  PSM count error for ${pid}:`, err.message);
      }

      // 2. Get coverage
      let coveragePercent = 0;
      try {
        const cov = await getProteinCoverage(pid);
        coveragePercent = Number(cov?.coverage_percent || 0);
      } catch (err) {
        console.error(`   ⚠️  Coverage error for ${pid}:`, err.message);
      }

      // 3. Get unique modifications (use ObjectId)
      let modifications = [];
      try {
        const peptides = await Peptide.find(
          { protein_id: doc._id },
          { modification: 1, _id: 0 }
        ).lean();

        const modSet = new Set();
        peptides.forEach(p => {
          const mod = p.modification?.trim();
          if (mod && mod !== 'Unmodified') {
            modSet.add(mod);
          }
        });
        modifications = Array.from(modSet);
      } catch (err) {
        console.error(`   ⚠️  Modifications error for ${pid}:`, err.message);
      }

      // 4. Prepare summary object
      const summary = {
        hvoId: pid,
        uniProtId: doc.uniProtein_id || null,
        description: doc.description || null,
        psmCount,
        coveragePercent: Math.round(coveragePercent * 10) / 10, // Round to 1 decimal
        datasets: Array.isArray(doc.dataset_ids) ? doc.dataset_ids : [],
        modifications
      };

      results.push({ proteinId: pid, summary });

    } catch (err) {
      console.error(`   ❌ Error processing ${pid}:`, err.message);
    }
  }

  return results;
}

async function populateCache() {
  console.log('\n' + '='.repeat(70));
  console.log('POPULATING PROTEIN SUMMARY CACHE IN REDIS');
  console.log('='.repeat(70) + '\n');

  const startTime = Date.now();

  // Get all HVO proteins
  console.log('📊 Fetching all HVO proteins from MongoDB...');
  const allProteins = await Protein.find(
    { protein_id: { $regex: '^HVO_\\d{4}$', $options: 'i' } },
    { _id: 1, protein_id: 1, uniProtein_id: 1, description: 1, dataset_ids: 1 }
  ).lean().exec();

  console.log(`   Found ${allProteins.length} proteins\n`);

  if (allProteins.length === 0) {
    console.log('❌ No proteins found');
    return;
  }

  // Process in batches
  let processed = 0;
  const totalBatches = Math.ceil(allProteins.length / BATCH_SIZE);

  for (let i = 0; i < allProteins.length; i += BATCH_SIZE) {
    const batch = allProteins.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;

    console.log(`📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} proteins)...`);

    const results = await processProteinBatch(batch);

    // Store in Redis
    for (const { proteinId, summary } of results) {
      await setProteinSummary(proteinId, summary);
      processed++;
    }

    console.log(`   ✅ Cached ${processed}/${allProteins.length} proteins`);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n' + '='.repeat(70));
  console.log('📊 SUMMARY');
  console.log('='.repeat(70));
  console.log(`   Total proteins cached: ${processed}`);
  console.log(`   Time elapsed: ${elapsed}s`);
  console.log(`   Average time per protein: ${(elapsed / processed).toFixed(3)}s`);
  console.log('='.repeat(70));
  console.log('✅ Cache population complete!\n');
}

async function main() {
  try {
    await connectToMongo();

    // Wait for Redis to be ready
    if (!redisClient.isOpen) {
      console.log('⏳ Waiting for Redis connection...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    if (!redisClient.isOpen) {
      console.error('❌ Redis is not connected');
      process.exit(1);
    }

    await populateCache();

    console.log('👋 Closing connections...');
    await mongoose.connection.close();
    await redisClient.quit();

    console.log('✅ Done!\n');
    process.exit(0);

  } catch (err) {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  }
}

main();
