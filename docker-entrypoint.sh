#!/bin/sh
set -e

# Apply any pending migrations against the volume-mounted DB, then start the
# standalone Next.js server. Migrations are idempotent (drizzle tracks applied).
echo "[entrypoint] running migrations…"
node scripts/migrate.mjs

echo "[entrypoint] bootstrap (seed defaults + first-run user)…"
node scripts/bootstrap.mjs

echo "[entrypoint] starting server on ${HOSTNAME}:${PORT}"
exec node server.js
