#!/usr/bin/env bash
# One-shot demo preparation: new Testnet role keys, Friendbot funding, demo files, owner approval and
# the three owner setup steps, each reconciled before the next. Stellar Testnet only.
#
#   bash scripts/demo-prep.sh <id>              full prep (e.g. demo-1107)
#   bash scripts/demo-prep.sh <id> --prep-only  keys, funding and files only; no chain writes
#
# Keys are written to ~/.snapp-roles-<id>.txt (mode 600, outside the repo). The owner secret is read
# from that file for this run only and is never printed. Rerunning with the same <id> reuses the file.
set -euo pipefail
ID="${1:-}"; MODE="${2:-}"
[ -n "$ID" ] || { echo "usage: bash scripts/demo-prep.sh <id> [--prep-only]"; exit 1; }
cd "$(dirname "$0")/.."
ROLES="$HOME/.snapp-roles-$ID.txt"
export MANIFEST="$PWD/.data/$ID.manifest.json" NOIR_TESTNET_CONTRACTS_CONFIRMED=true
json() { node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);console.log(eval(process.argv[1]))})' "$1"; }

echo "== 1/5 role keys"
if [ -f "$ROLES" ]; then echo "reusing $ROLES"; else
  node --input-type=module -e "import {Keypair} from '@stellar/stellar-sdk';for(const r of ['owner','agent','merchant']){const k=Keypair.random();console.log(r,k.publicKey(),k.secret())}" > "$ROLES"
  chmod 600 "$ROLES"; echo "wrote $ROLES"
fi
OWNER_PUB=$(awk '$1=="owner"{print $2}' "$ROLES"); AGENT_PUB=$(awk '$1=="agent"{print $2}' "$ROLES"); MERCHANT_PUB=$(awk '$1=="merchant"{print $2}' "$ROLES")
export ALLOWED_MERCHANT_ADDRESSES="$MERCHANT_PUB"
echo "owner    $OWNER_PUB"; echo "agent    $AGENT_PUB"; echo "merchant $MERCHANT_PUB"

echo "== 2/5 Friendbot funding (skipped for accounts that already exist)"
for k in "$OWNER_PUB" "$AGENT_PUB" "$MERCHANT_PUB"; do
  if curl -sf -o /dev/null "https://horizon-testnet.stellar.org/accounts/$k"; then echo "exists  $k"; else
    curl -s "https://friendbot.stellar.org?addr=$k" | json 'j.successful?"funded":"FRIENDBOT FAILED: "+JSON.stringify(j).slice(0,120)'; fi
done

echo "== 3/5 demo files"
node scripts/demo-files.mjs "$ID" "$OWNER_PUB" "$AGENT_PUB" "$MERCHANT_PUB"
DIGEST=$(npm --silent run noir -- plan --manifest "$MANIFEST" 2>/dev/null | json 'j.digest'); export DIGEST
echo "digest   $DIGEST"

if [ "$MODE" = "--prep-only" ]; then echo "== prep-only: stopping before any chain write"; exit 0; fi

echo "== 4/5 owner approval and setup (owner secret read from $ROLES for this run only)"
NOIR_OWNER_SECRET=$(awk '$1=="owner"{print $3}' "$ROLES"); export NOIR_OWNER_SECRET
npm --silent run noir -- approve --manifest "$MANIFEST" --confirm "$DIGEST" 2>/dev/null | json 'JSON.stringify(j)'
wait_for() { # <kind>: reconcile until that operation is succeeded (or give up after ~2 min)
  for _ in $(seq 1 12); do
    st=$(npm --silent run noir -- reconcile --manifest "$MANIFEST" 2>/dev/null | json "(j.operations.find(o=>o.kind==='$1')||{}).state||'missing'")
    [ "$st" = "succeeded" ] && { echo "$1 succeeded"; return 0; }
    [ "$st" = "failed" ] && { echo "$1 FAILED on-chain; stop and inspect with: npm run noir -- evidence --manifest \"$MANIFEST\""; return 1; }
    sleep 10
  done; echo "$1 still $st after 2 min; rerun the script later, it resumes safely"; return 1
}
for step in device policy fund; do
  echo "-- setup $step"
  npm --silent run noir -- setup --manifest "$MANIFEST" --step "$step" --live --confirm "$DIGEST" 2>/dev/null | json 'j.alreadyPresent?"already present":"submitted "+j.hash'
  wait_for "$step"
done
unset NOIR_OWNER_SECRET

echo "== 5/5 chain check"
npm --silent run noir -- check --manifest "$MANIFEST" 2>/dev/null | json 'Object.entries(j.checks).map(([k,v])=>k+": "+(v.ok?"ok "+(typeof v.value==="object"?JSON.stringify(v.value):v.value??""):"FAIL "+v.code)).join("\n")'

cat <<EOF

Ready. Paste this into the AGENT shell and the MERCHANT shell before the demo (public values only):

  export ID=$ID MANIFEST="$MANIFEST" DIGEST=$DIGEST
  export ALLOWED_MERCHANT_ADDRESSES=$MERCHANT_PUB NOIR_TESTNET_CONTRACTS_CONFIRMED=true

Secrets stay in $ROLES; read them with the prompts in docs/DEMO.md section 3.
EOF
