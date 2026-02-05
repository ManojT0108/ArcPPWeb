#!/usr/bin/env node
/**
 * One-time utility: Export populated Redis data to JSON seed files.
 * Run locally where Redis is already populated with PSM + summary data.
 *
 * Usage:  cd server && node scripts/exportRedisToJson.js
 * Output: data/redis-seed-psms.json, data/redis-seed-summaries.json
 */

const fs = require('fs');
const path = require('path');
const redis = require('redis');

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = process.env.REDIS_PORT || 6379;

const DATA_DIR = path.join(__dirname, '..', 'data');
const PSM_FILE = path.join(DATA_DIR, 'redis-seed-psms.json');
const SUMMARY_FILE = path.join(DATA_DIR, 'redis-seed-summaries.json');

async function exportKeys(client, pattern, outFile, label) {
  const keys = await client.keys(pattern);
  console.log(`Found ${keys.length} ${label} keys`);

  if (keys.length === 0) {
    console.log(`  Skipping ${label} — no keys found`);
    return 0;
  }

  // Strip the prefix to get just the protein ID as the map key
  const prefixLen = pattern.indexOf('*');
  const prefix = pattern.slice(0, prefixLen);

  const map = {};
  for (const key of keys) {
    const raw = await client.get(key);
    const id = key.slice(prefix.length);
    map[id] = JSON.parse(raw);
  }

  fs.writeFileSync(outFile, JSON.stringify(map));
  const sizeMB = (fs.statSync(outFile).size / (1024 * 1024)).toFixed(2);
  console.log(`  Wrote ${outFile} (${sizeMB} MB, ${keys.length} entries)`);
  return keys.length;
}

async function main() {
  const client = redis.createClient({
    socket: { host: REDIS_HOST, port: REDIS_PORT },
  });

  client.on('error', (err) => {
    console.error('Redis error:', err.message);
    process.exit(1);
  });

  await client.connect();
  console.log('Connected to Redis\n');

  // Ensure data directory exists
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const psmCount = await exportKeys(client, 'psms:*', PSM_FILE, 'PSM');
  const sumCount = await exportKeys(client, 'protein:summary:*', SUMMARY_FILE, 'summary');

  console.log(`\nDone — exported ${psmCount} PSM + ${sumCount} summary entries`);

  await client.quit();
  process.exit(0);
}

main();
