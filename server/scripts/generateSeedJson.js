#!/usr/bin/env node
/**
 * Generate redis-seed-summaries.json for all species.
 * Uses bulk queries (one pass per species) — much faster than per-protein queries.
 * Output: server/data/redis-seed-summaries.json
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Protein = require('../model/proteins');
const Peptide = require('../model/peptides');
const { speciesSlug } = require('../services/proteinSummaryCache');
const { mergeIntervals } = require('../utils/mergeIntervals');

async function connect() {
  const uri = process.env.MONGO_URI;
  if (!uri) { console.error('MONGO_URI not set'); process.exit(1); }
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB:', uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
}

function displayId(doc) {
  return doc.hvo_id || doc.protein_id;
}

async function processSpecies(speciesId) {
  const slug = speciesSlug(speciesId);
  console.log(`\nProcessing ${speciesId} (slug: ${slug})`);
  const t0 = Date.now();

  // 1. Fetch all proteins for this species
  const proteins = await Protein.find(
    { species_id: speciesId },
    { _id: 1, protein_id: 1, hvo_id: 1, description: 1, dataset_ids: 1, sequence: 1 }
  ).lean();
  console.log(`  ${proteins.length} proteins`);
  if (proteins.length === 0) return {};

  // Build lookup maps
  const idToDoc = {};
  const objIdToDisplay = {};
  const proteinObjIds = [];
  for (const doc of proteins) {
    const pid = displayId(doc);
    idToDoc[pid] = doc;
    objIdToDisplay[doc._id.toString()] = pid;
    proteinObjIds.push(doc._id);
  }

  // 2. Fetch ALL peptides for this species in one query
  console.log('  Fetching peptides...');
  const peptides = await Peptide.find(
    { protein_id: { $in: proteinObjIds } },
    { protein_id: 1, sequence: 1, startIndex: 1, endIndex: 1, modification: 1, qValue: 1, _id: 0 }
  ).lean();
  console.log(`  ${peptides.length} peptides`);

  // 3. Group peptides by protein and compute stats in memory
  const psmSeqs = {};     // { displayId: Set<sequence> }
  const intervals = {};   // { displayId: [[start, end]] } (qValue <= 0.005)
  const mods = {};        // { displayId: Set<modString> }

  for (const pep of peptides) {
    const pid = objIdToDisplay[pep.protein_id.toString()];
    if (!pid) continue;

    // PSM count = distinct sequences
    if (!psmSeqs[pid]) psmSeqs[pid] = new Set();
    psmSeqs[pid].add(pep.sequence);

    // Coverage intervals (only high-confidence peptides)
    if (pep.qValue != null && pep.qValue <= 0.005) {
      if (!intervals[pid]) intervals[pid] = [];
      if (typeof pep.startIndex === 'number' && typeof pep.endIndex === 'number') {
        intervals[pid].push([pep.startIndex, pep.endIndex]);
      }
    }

    // Modifications
    const mod = pep.modification?.trim();
    if (mod && mod !== 'Unmodified' && mod !== 'N/A') {
      if (!mods[pid]) mods[pid] = new Set();
      mod.split(';').forEach(part => {
        const t = part.trim();
        if (t) mods[pid].add(t);
      });
    }
  }

  // 4. Build output entries
  const output = {};
  for (const doc of proteins) {
    const pid = displayId(doc);
    const seqLen = doc.sequence ? doc.sequence.length : 0;
    const psmCount = psmSeqs[pid] ? psmSeqs[pid].size : 0;

    let coveragePercent = 0;
    if (seqLen > 0 && intervals[pid] && intervals[pid].length > 0) {
      const covered = mergeIntervals(intervals[pid]);
      coveragePercent = Math.min(covered, seqLen) * 100 / seqLen;
    }

    const key = `${slug}:${pid}`;
    output[key] = {
      hvoId: pid,
      uniProtId: (doc.protein_id && doc.protein_id !== pid) ? doc.protein_id : null,
      species_id: speciesId,
      description: doc.description || null,
      psmCount,
      coveragePercent: Math.round(coveragePercent * 10) / 10,
      datasets: Array.isArray(doc.dataset_ids) ? doc.dataset_ids : [],
      modifications: mods[pid] ? Array.from(mods[pid]) : [],
    };
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`  Done: ${Object.keys(output).length} entries in ${elapsed}s`);
  return output;
}

async function main() {
  await connect();
  const overall = {};

  const speciesList = await Protein.distinct('species_id', {
    species_id: { $exists: true, $ne: null, $ne: '' }
  });
  console.log(`Species: ${speciesList.join(', ')}`);

  for (const speciesId of speciesList) {
    const entries = await processSpecies(speciesId);
    Object.assign(overall, entries);
  }

  const outFile = path.join(__dirname, '..', 'data', 'redis-seed-summaries.json');
  fs.writeFileSync(outFile, JSON.stringify(overall));
  console.log(`\nWrote ${Object.keys(overall).length} total entries to ${outFile}`);

  await mongoose.connection.close();
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
