#!/bin/sh
set -e

# The Redis protein caches are rebuilt from Mongo by index.js on startup
# (services/cacheRefresh.js, async after listen) — no JSON seeding step.
echo "[entrypoint] Starting server..."
exec node index.js
