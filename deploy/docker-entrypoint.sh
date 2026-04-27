#!/bin/sh
set -e

if [ "$RUN_MIGRATIONS" = "true" ]; then
  echo "Running database migrations..."
  node server/dist/migrate.js
fi

if [ "$RUN_SEEDS" = "true" ]; then
  echo "Running database seeds..."
  node server/dist/seed.js
fi

exec "$@"
