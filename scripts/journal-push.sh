#!/usr/bin/env bash
# Push a run's evidence (public: hashes, decisions, manifest; no secrets) to the deployed server so wallet
# sign-in can derive roles and show the run. Usage: bash scripts/journal-push.sh <manifest.json> [server-url]
set -euo pipefail
MANIFEST="${1:?manifest path}"; SERVER="${2:-https://snapp-server.onrender.com}"
cd "$(dirname "$0")/.."
: "${ADMIN_API_TOKEN:?export ADMIN_API_TOKEN first (set -a; . ./apps/server/.env; set +a)}"
: "${ALLOWED_MERCHANT_ADDRESSES:?export ALLOWED_MERCHANT_ADDRESSES (the run's merchant) first}"
npm --silent run noir -- evidence --manifest "$MANIFEST" 2>/dev/null \
 | curl -sS -X PUT "$SERVER/api/runs" -H "authorization: Bearer $ADMIN_API_TOKEN" -H "content-type: application/json" --data-binary @- \
 | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);if(!j.run){console.error(j);process.exit(1)}console.log("pushed run",j.run.id,"operations",j.run.operations.length,"decisions",j.run.decisions.length)})'
