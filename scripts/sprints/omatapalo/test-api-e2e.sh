#!/usr/bin/env bash
set -euo pipefail
if [[ $# -eq 0 ]]; then
  echo 'Pass explicit Jest test paths/filters; no complete database suite is run by default.' >&2
  exit 2
fi
source scripts/sprints/omatapalo/environment.sh
set -a
source apps/api/.env
set +a
node - <<'JS'
const target = new URL(process.env.DATABASE_TEST_URL);
const redis = new URL(process.env.REDIS_TEST_URL);
if (target.hostname !== '127.0.0.1' || target.port !== '55432' || target.pathname !== '/guidebook_test' ||
    redis.hostname !== '127.0.0.1' || redis.port !== '56379' || redis.pathname !== '/1' ||
    process.env.S3_ENDPOINT !== 'http://127.0.0.1:59100' || process.env.S3_BUCKET_NAME !== 'omatapalo-sprint') {
  throw new Error('Refusing tests outside the isolated sprint services');
}
JS
export NODE_ENV=test REDIS_URL="$REDIS_TEST_URL" TMPDIR="$PWD/.local/tmp"
mkdir -p "$TMPDIR"
exec corepack pnpm --filter api exec jest --config ./test/jest-e2e.json --runInBand "$@"
