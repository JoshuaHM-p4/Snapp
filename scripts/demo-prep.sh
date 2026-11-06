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

# ── progress helpers ────────────────────────────────────────────────────────────────────────────
TOTAL=9; STEP=0
step() { STEP=$((STEP+1)); printf '\n[%d/%d] %s\n' "$STEP" "$TOTAL" "$1"; }
ok()   { printf '  \033[32m✔\033[0m %s\n' "$1"; }
fail() { printf '  \033[31m✘\033[0m %s\n' "$1"; exit 1; }
# spin "<label>" <command...> : runs the command with a spinner; its stdout is captured in $OUT
spin() {
  local label="$1"; shift; local tmp; tmp=$(mktemp)
  "$@" >"$tmp" 2>/dev/null & local pid=$!
  local frames='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏' i=0 start=$SECONDS
  while kill -0 "$pid" 2>/dev/null; do
    printf '\r  \033[36m%s\033[0m %s (%ds)' "${frames:i%10:1}" "$label" $((SECONDS-start)); i=$((i+1)); sleep 0.1
  done
  wait "$pid" && local rc=0 || local rc=$?
  printf '\r\033[K'; OUT=$(cat "$tmp"); rm -f "$tmp"; return $rc
}
# bar <current> <total> <label> : simple progress bar for polling loops
bar() { local w=24 f=$(( $1*24/$2 )); printf '\r  [%s%s] %s' "$(printf '%*s' "$f" '' | tr ' ' '#')" "$(printf '%*s' $((w-f)) '' | tr ' ' '.')" "$3"; }

# ── 1. keys ─────────────────────────────────────────────────────────────────────────────────────
step "Role keys (owner / agent / merchant)"
if [ -f "$ROLES" ]; then ok "reusing $ROLES"; else
  node --input-type=module -e "import {Keypair} from '@stellar/stellar-sdk';for(const r of ['owner','agent','merchant']){const k=Keypair.random();console.log(r,k.publicKey(),k.secret())}" > "$ROLES"
  chmod 600 "$ROLES"; ok "generated 3 new Testnet keypairs → $ROLES (mode 600, outside the repo)"
fi
OWNER_PUB=$(awk '$1=="owner"{print $2}' "$ROLES"); AGENT_PUB=$(awk '$1=="agent"{print $2}' "$ROLES"); MERCHANT_PUB=$(awk '$1=="merchant"{print $2}' "$ROLES")
export ALLOWED_MERCHANT_ADDRESSES="$MERCHANT_PUB"
printf '  owner    %s\n  agent    %s\n  merchant %s\n' "$OWNER_PUB" "$AGENT_PUB" "$MERCHANT_PUB"

# ── 2. funding ──────────────────────────────────────────────────────────────────────────────────
step "Friendbot funding (10,000 test XLM each; skipped if the account already exists)"
for role in owner agent merchant; do
  k=$(awk -v r="$role" '$1==r{print $2}' "$ROLES")
  if curl -sf -o /dev/null "https://horizon-testnet.stellar.org/accounts/$k"; then
    bal=$(curl -s "https://horizon-testnet.stellar.org/accounts/$k" | json 'j.balances.find(b=>b.asset_type==="native").balance')
    ok "$role already exists on Testnet, balance $bal XLM"
  else
    spin "asking Friendbot to fund $role ${k:0:6}…" curl -s "https://friendbot.stellar.org?addr=$k" || fail "Friendbot request failed for $role"
    echo "$OUT" | json 'j.successful?"":"FAIL"' | grep -q FAIL && fail "Friendbot refused $role: $(echo "$OUT" | json 'JSON.stringify(j).slice(0,160)')"
    bal=$(curl -s "https://horizon-testnet.stellar.org/accounts/$k" | json 'j.balances.find(b=>b.asset_type==="native").balance')
    ok "$role funded, Testnet balance now $bal XLM"
  fi
done

# ── 3. files ────────────────────────────────────────────────────────────────────────────────────
step "Demo files (manifest + accepted / revisions / dispute payout records)"
node scripts/demo-files.mjs "$ID" "$OWNER_PUB" "$AGENT_PUB" "$MERCHANT_PUB" | sed 's/^/  /'
spin "computing approval digest (offline)" npm --silent run noir -- plan --manifest "$MANIFEST" || fail "plan failed"
DIGEST=$(echo "$OUT" | json 'j.digest'); export DIGEST
ok "digest $DIGEST"

if [ "$MODE" = "--prep-only" ]; then printf '\n--prep-only: stopping before any chain write.\n'; exit 0; fi

# ── 4. owner approval ───────────────────────────────────────────────────────────────────────────
step "Owner approval (signs the manifest locally; no chain write)"
NOIR_OWNER_SECRET=$(awk '$1=="owner"{print $3}' "$ROLES"); export NOIR_OWNER_SECRET
spin "signing approval with the owner key (secret read from $ROLES, never printed)" npm --silent run noir -- approve --manifest "$MANIFEST" --confirm "$DIGEST" || fail "approve failed"
ok "approval stored in the local journal"

# ── 5-7. setup steps ────────────────────────────────────────────────────────────────────────────
wait_for() { # <kind>: reconcile until that operation is succeeded (or give up after ~2 min)
  local tries=12 st
  for i in $(seq 1 $tries); do
    bar "$i" "$tries" "waiting for ledger confirmation of $1 (check $i/$tries)"
    st=$(npm --silent run noir -- reconcile --manifest "$MANIFEST" 2>/dev/null | json "(j.operations.find(o=>o.kind==='$1')||{}).state||'missing'")
    if [ "$st" = "succeeded" ]; then printf '\r\033[K'; ok "$1 confirmed on-chain"; return 0; fi
    if [ "$st" = "failed" ]; then printf '\r\033[K'; fail "$1 FAILED on-chain; inspect with: npm run noir -- evidence --manifest \"$MANIFEST\""; fi
    sleep 10
  done
  printf '\r\033[K'; fail "$1 still '$st' after 2 min; rerun the script later, it resumes safely"
}
for pair in "device:registerDevice (links the device hash to the owner and agent)" "policy:registerAgent (cap 2 XLM, native XLM, 14-day expiry)" "fund:fundEscrow (5 XLM into the device escrow)"; do
  kind=${pair%%:*}; label=${pair#*:}
  step "Owner setup: $label"
  spin "simulating, signing and submitting $kind with the owner key" npm --silent run noir -- setup --manifest "$MANIFEST" --step "$kind" --live --confirm "$DIGEST" || fail "setup $kind failed"
  if echo "$OUT" | json 'j.alreadyPresent?"yes":"no"' | grep -q yes; then ok "$kind already present on-chain, nothing sent"; else ok "submitted, tx $(echo "$OUT" | json 'j.hash')"; fi
  wait_for "$kind"
done
unset NOIR_OWNER_SECRET

# ── 8. chain check ──────────────────────────────────────────────────────────────────────────────
step "Chain check (read-only)"
spin "reading device, policy, escrow and checkPayment from Testnet RPC" npm --silent run noir -- check --manifest "$MANIFEST" || fail "check failed"
echo "$OUT" | json 'Object.entries(j.checks).map(([k,v])=>"  "+(v.ok?"\u001b[32m✔\u001b[0m":"\u001b[31m✘\u001b[0m")+" "+k+(v.ok?(typeof v.value==="object"?" "+JSON.stringify(v.value):v.value!==undefined?" "+v.value:""):" "+v.code)).join("\n")'
echo "$OUT" | json 'j.checks.authorization.ok&&j.checks.authorization.value.ok?"":"NOTREADY"' | grep -q NOTREADY && fail "checkPayment is not ok; see above"

# ── 9. done ─────────────────────────────────────────────────────────────────────────────────────
step "Ready"
cat <<EOF
  Paste this into the AGENT shell and the MERCHANT shell before the demo (public values only):

  export ID=$ID MANIFEST="$MANIFEST" DIGEST=$DIGEST
  export ALLOWED_MERCHANT_ADDRESSES=$MERCHANT_PUB NOIR_TESTNET_CONTRACTS_CONFIRMED=true

  Secrets stay in $ROLES; read them with the prompts in docs/DEMO.md section 3.
EOF
