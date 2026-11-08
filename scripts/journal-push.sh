#!/usr/bin/env bash
# Push a run's evidence (public: hashes, decisions, manifest; no secrets) to the deployed server so wallet
# sign-in can derive roles and show the run.
#   bash scripts/journal-push.sh <manifest.json> [server-url]
set -euo pipefail
MANIFEST=${1:-}
SERVER=${2:-https://snapp-server.onrender.com}
if [ -z "$MANIFEST" ]; then echo "usage: bash scripts/journal-push.sh <manifest.json> [server-url]"; exit 1; fi
if [ -z "${ADMIN_API_TOKEN:-}" ]; then echo "export ADMIN_API_TOKEN first (set -a; . ./apps/server/.env; set +a)"; exit 1; fi
if [ -z "${ALLOWED_MERCHANT_ADDRESSES:-}" ]; then echo "export ALLOWED_MERCHANT_ADDRESSES (the run's merchant) first"; exit 1; fi
cd "$(dirname "$0")/.."
TMP=$(mktemp)
trap 'rm -f "$TMP"' EXIT
npm --silent run noir -- evidence --manifest "$MANIFEST" 2>/dev/null > "$TMP"
curl -sS -X PUT "$SERVER/api/runs" \
  -H "authorization: Bearer $ADMIN_API_TOKEN" \
  -H "content-type: application/json" \
  --data-binary "@$TMP" \
  | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);if(!j.run){console.error(j);process.exit(1)}console.log("pushed run",j.run.id,"operations",j.run.operations.length,"decisions",j.run.decisions.length)})'
