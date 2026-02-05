#!/bin/sh
set -e

echo "[entrypoint] Seeding Redis if needed..."
node scripts/seedRedis.js

echo "[entrypoint] Starting server..."
exec node index.js
