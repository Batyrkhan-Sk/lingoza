#!/bin/sh
set -e

# Applies pending migrations before the API starts accepting traffic.
#
# `migrate deploy` only runs migrations that are already committed to the repo —
# it never generates or guesses one, and it never drops data. That makes it safe
# to run automatically on every container start, which in turn means a deploy is
# just "pull and restart" with no manual migration step to forget.

echo "→ Applying database migrations…"
npx prisma migrate deploy

# Seed the curriculum when the database is empty. The seed is idempotent, but
# checking first keeps ordinary restarts fast and the logs quiet.
if [ "${SEED_ON_START:-true}" = "true" ]; then
  echo "→ Checking curriculum…"
  npx tsx prisma/seed.ts || echo "⚠ Seed skipped or failed — the API will still start."
fi

echo "→ Starting Lingoza"
exec "$@"
