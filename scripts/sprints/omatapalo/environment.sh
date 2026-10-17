#!/usr/bin/env bash
# Source this file from the repository root. Creates only ignored local files.
if [[ ! -f package.json || ! -d apps/api ]]; then
  echo "Run from the isolated Mentingo worktree root" >&2
  return 1 2>/dev/null || exit 1
fi
mkdir -p .local/sprint
if [[ ! -f .local/sprint/secrets.env ]]; then
  (umask 077
    exec > .local/sprint/secrets.env
    printf 'SPRINT_POSTGRES_PASSWORD=%s\n' "$(openssl rand -hex 24)"
    printf 'SPRINT_STORAGE_ACCESS_KEY=%s\n' "$(openssl rand -hex 12)"
    printf 'SPRINT_STORAGE_SECRET_KEY=%s\n' "$(openssl rand -hex 24)"
    printf 'SPRINT_MASTER_KEY=%s\n' "$(openssl rand -base64 32)"
    printf 'SPRINT_JWT_SECRET=%s\n' "$(openssl rand -hex 32)"
    printf 'SPRINT_REFRESH_SECRET=%s\n' "$(openssl rand -hex 32)"
  )
  chmod 600 .local/sprint/secrets.env
fi
set -a
source .local/sprint/secrets.env
set +a
export PATH="$PWD/.local/toolchain/node-v22.15.0-darwin-arm64/bin:$PATH"
export COREPACK_ENABLE_AUTO_PIN=0 HUSKY=0
export SPRINT_COMPOSE_FILE="$PWD/scripts/sprints/omatapalo/compose.yml"

if [[ ! -f apps/api/.env ]]; then
  (umask 077
    exec > apps/api/.env
    cat <<EOF
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
DEV_TENANT_ORIGINS=http://localhost:5173
DATABASE_URL=postgresql://postgres:${SPRINT_POSTGRES_PASSWORD}@127.0.0.1:55432/guidebook
MIGRATOR_DATABASE_URL=postgresql://postgres:${SPRINT_POSTGRES_PASSWORD}@127.0.0.1:55432/guidebook
LMS_DATABASE_URL=postgresql://lms_app_user:${SPRINT_POSTGRES_PASSWORD}@127.0.0.1:55432/guidebook
DATABASE_TEST_URL=postgresql://postgres:${SPRINT_POSTGRES_PASSWORD}@127.0.0.1:55432/guidebook_test
REDIS_URL=redis://127.0.0.1:56379/0
REDIS_TEST_URL=redis://127.0.0.1:56379/1
JWT_SECRET=${SPRINT_JWT_SECRET}
JWT_REFRESH_SECRET=${SPRINT_REFRESH_SECRET}
JWT_EXPIRATION_TIME=24h
MASTER_KEY=${SPRINT_MASTER_KEY}
TEST_KEY=sprint-local-only
EMAIL_ADAPTER=mailhog
SMTP_HOST=127.0.0.1
SMTP_PORT=51025
SMTP_EMAIL_FROM=noreply@sprint.invalid
SMTP_USER=
SMTP_PASSWORD=
S3_ENDPOINT=http://127.0.0.1:59100
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=${SPRINT_STORAGE_ACCESS_KEY}
S3_SECRET_ACCESS_KEY=${SPRINT_STORAGE_SECRET_KEY}
S3_BUCKET_NAME=omatapalo-sprint
AWS_ENDPOINT_URL=http://127.0.0.1:59100
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=${SPRINT_STORAGE_ACCESS_KEY}
AWS_SECRET_ACCESS_KEY=${SPRINT_STORAGE_SECRET_KEY}
AWS_BUCKET_NAME=omatapalo-sprint
GOOGLE_OAUTH_ENABLED=false
MICROSOFT_OAUTH_ENABLED=false
SLACK_OAUTH_ENABLED=false
WORKER_CONCURRENCY=2
DISABLE_RATE_LIMITING=true
EOF
  )
  chmod 600 apps/api/.env
fi
if [[ ! -f apps/web/.env ]]; then
  cat > apps/web/.env <<EOF
VITE_API_URL=http://localhost:3000
VITE_APP_URL=http://localhost:5173
VITE_GOOGLE_OAUTH_ENABLED=false
VITE_MICROSOFT_OAUTH_ENABLED=false
VITE_SLACK_OAUTH_ENABLED=false
TEST_KEY=sprint-local-only
EOF
  chmod 600 apps/web/.env
fi

# pnpm must remain the repository-pinned version; do not use the system default.
sprint_pnpm() { corepack pnpm@10.22.0 "$@"; }

if [[ -x "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" ]]; then
  export PUPPETEER_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
fi
