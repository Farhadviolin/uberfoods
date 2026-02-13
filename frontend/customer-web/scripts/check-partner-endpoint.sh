#!/usr/bin/env bash

# Simple check for /partners/apply endpoint availability.
# Usage:
#   BACKEND_URL=http://localhost:3000/api ./scripts/check-partner-endpoint.sh
# Default BACKEND_URL: http://localhost:3000/api

set -euo pipefail

BACKEND_URL="${BACKEND_URL:-http://localhost:3000/api}"
URL="${BACKEND_URL%/}/partners/apply"

echo "Checking endpoint: $URL"
status=$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS "$URL" || true)

if [[ "$status" == "200" || "$status" == "201" || "$status" == "204" || "$status" == "401" || "$status" == "405" ]]; then
  echo "✅ Endpoint reachable (status $status). Implemented or protected."
  exit 0
else
  echo "❌ Endpoint not reachable or missing (status $status)."
  exit 1
fi

