#!/bin/sh
set -e

COMMAND="${1:-server}"

if [ "$COMMAND" = "server" ]; then
  if [ "${DEMONSTRATION_MODE:-false}" = "true" ]; then
    node /app/validate-demo-env.mjs
  fi
  echo "Starting server..."
  exec node dist/src/main.js
elif [ "$COMMAND" = "migrate" ]; then
  echo "Running migrations..."
  exec node /app/release-migrate.mjs
elif [ "$COMMAND" = "seed" ]; then
  echo "Running seeds..."
  npm run db:seed-staging
elif [ "$COMMAND" = "seed-prod" ]; then
  echo "Running seeds..."
  npm run db:seed-prod
elif [ "$COMMAND" = "truncate-tables" ]; then
  echo "Truncating tables..."
  npm run db:truncate-tables
else
  echo "Usage: entrypoint.sh [server|migrate|seed-staging|seed-prod|truncate-tables]"
  exit 1
fi
