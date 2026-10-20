#!/bin/sh
set -eu
if [ "${DEMO_GATE_ENABLED:-true}" = "false" ]; then
  echo "Demo HTTP gate disabled by DEMO_GATE_ENABLED=false" >&2
  exit 0
fi
: "${DEMO_GATE_USERNAME:?Restricted demo requires DEMO_GATE_USERNAME}"
: "${DEMO_GATE_PASSWORD:?Restricted demo requires DEMO_GATE_PASSWORD}"
: "${API_PRIVATE_HOST:?Set the API private Railway hostname}"
: "${API_PRIVATE_PORT:?Set the API listening port}"
: "${PORT:?Set the web listening port}"
if [ "${#DEMO_GATE_PASSWORD}" -lt 24 ]; then
  echo 'Demo gate password must contain at least 24 characters' >&2
  exit 1
fi
umask 077
printf '%s\n' "$DEMO_GATE_PASSWORD" | htpasswd -iBc /etc/nginx/demo.htpasswd "$DEMO_GATE_USERNAME" >/dev/null
chown nginx:nginx /etc/nginx/demo.htpasswd
unset DEMO_GATE_PASSWORD
