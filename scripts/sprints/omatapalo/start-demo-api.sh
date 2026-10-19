#!/usr/bin/env bash
# Local laboratory only. Railway uses the validated release image/entrypoint.
set -euo pipefail
repo_root="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$repo_root"
source scripts/sprints/omatapalo/environment.sh
cd apps/api
node --input-type=module -e '
import "dotenv/config";
for (const key of ["LMS_DATABASE_URL", "MIGRATOR_DATABASE_URL"]) {
  const value = new URL(process.env[key] || "invalid:");
  if (value.hostname !== "127.0.0.1" || value.port !== "55432" || value.pathname !== "/guidebook") throw new Error("Refusing an unknown database");
}
if (process.env.CORS_ORIGIN !== "http://localhost:5173") throw new Error("Refusing an unknown tenant origin");
'
export RUN_STARTUP_MAINTENANCE=false DEMONSTRATION_MODE=true PORT=3000 API_BIND_HOST=127.0.0.1
exec node dist/src/main.js
