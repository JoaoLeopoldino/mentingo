#!/usr/bin/env bash
set -euo pipefail
# Only fetches remote refs and prints evidence; never checks out, merges or pushes.
base="${1:-7a23e967d88947238386c588663140c21a284294}"
git fetch https://github.com/Selleo/mentingo.git main --no-tags
upstream_commit="$(git rev-parse FETCH_HEAD)"
printf '# Upstream comparison\n\nBase: `%s`\nUpstream: `%s`\n\n' "$base" "$upstream_commit"
git log --no-merges --format='- %h %s' "$base..$upstream_commit"
printf '\n## Changed files\n\n'
git diff --stat "$base" "$upstream_commit"
printf '\n## Sensitive areas for manual compatibility review\n\n'
git diff --name-only "$base" "$upstream_commit" -- apps/api/src/auth apps/api/src/certificates apps/api/src/storage apps/api/src/scorm apps/api/src/settings apps/web/app/modules/Offline packages/email-templates
