# Demo runbook (2-minute video and live judging)

Everything below is Stellar Testnet. Nothing here touches real money, bank accounts or payroll data.

## 0. Prerequisites (once, ~20 min, off camera)

**One command does all of this section:**

```bash
bash scripts/demo-prep.sh demo-1107
```

It generates three new Testnet keys into `~/.snapp-roles-demo-1107.txt` (outside the repo, mode 600), Friendbot-funds them, writes the demo files, signs the owner approval and runs the three setup steps, reconciling each before the next, then prints the exports for the agent and merchant shells. Rerunning with the same id resumes safely. `--prep-only` stops before any chain write. The manual steps below are the same thing spelled out.

The keys used on Nov 6 were exposed and must not be reused. Generate three new Testnet accounts and fund them:

```bash
cd ~/CODE/proj/agentpay-starter
node --input-type=module -e "import {Keypair} from '@stellar/stellar-sdk';for(const r of ['owner','agent','merchant']){const k=Keypair.random();console.log(r,k.publicKey(),k.secret())}" > ~/.snapp-roles-$(date +%m%d).txt
chmod 600 ~/.snapp-roles-*.txt && cat ~/.snapp-roles-*.txt        # keep this file OUTSIDE the repo
for k in <ownerPub> <agentPub> <merchantPub>; do curl -s "https://friendbot.stellar.org?addr=$k" >/dev/null && echo funded $k; done
```

Write the demo files (manifest + three payout records) from the **public** keys, then take the digest:

```bash
node scripts/demo-files.mjs demo-$(date +%m%d) <ownerPub> <agentPub> <merchantPub>
export ID=demo-$(date +%m%d) MANIFEST="$PWD/.data/$ID.manifest.json"
export ALLOWED_MERCHANT_ADDRESSES=<merchantPub> NOIR_TESTNET_CONTRACTS_CONFIRMED=true
export DIGEST=$(npm --silent run noir -- plan --manifest "$MANIFEST" 2>/dev/null | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).digest))')
echo "$DIGEST"
```

Owner shell (owner secret only): approve and the three setup steps. Each prints a hash; wait for `reconcile` to show `succeeded` before the next.

```bash
read -r -s -p 'Owner secret: ' NOIR_OWNER_SECRET; echo; export NOIR_OWNER_SECRET
npm run noir -- approve --manifest "$MANIFEST" --confirm "$DIGEST"
npm run noir -- setup --manifest "$MANIFEST" --step device --live --confirm "$DIGEST"
npm run noir -- setup --manifest "$MANIFEST" --step policy --live --confirm "$DIGEST"
npm run noir -- setup --manifest "$MANIFEST" --step fund   --live --confirm "$DIGEST"
unset NOIR_OWNER_SECRET
npm run noir -- reconcile --manifest "$MANIFEST"
npm run noir -- check --manifest "$MANIFEST"      # expect authorization: {ok:true}, escrowStroops 50000000
```

Wake the demo server and load the live site once, right before recording (Render free tier sleeps after 15 min):

```bash
curl -s https://snapp-server.onrender.com/api/health
```

Do not push to `main` between now and the recording: a redeploy resets `collections.sqlite` on Render.

## 1. Populate the Invoices page (client collection via Velo)

Needs `DEMO_MODE=false` on Render (already set) and the current `ADMIN_API_TOKEN` in `apps/server/.env`.

```bash
set -a; . ./apps/server/.env; set +a
curl -s -X POST https://snapp-server.onrender.com/api/payments/checkout \
  -H "authorization: Bearer $ADMIN_API_TOKEN" -H "content-type: application/json" \
  -d '{"projectId":"web-001","amountXlm":"0.5"}'
```

Open the returned `checkoutUrl` in a browser with a funded Testnet wallet (Freighter) and pay. Within ~5 s Velo's signed webhook marks it `paid` with the transaction hash; refresh **Invoices & collections** on the site. The intent expires after 30 min, so create it close to the recording.

Persistent alternative: Render → `snapp-server` → **Disks** → Add disk, mount path `/opt/render/project/src/.data`, 1 GB. Disks need a paid instance type (Starter); on the free plan the record is wiped at every deploy.

## 2. Video storyboard (120 s)

| Time | Screen | Say / show |
|---|---|---|
| 0:00–0:12 | https://snapp-prodigitality.vercel.app | "Snapp turns verified work into one approved pay run. Owner approves; the agent decides when each item is paid." Point at the Testnet badge. |
| 0:12–0:30 | `/app/cutoffs` → hold-to-snap | Owner reviews hours (sample data), flags from the agent, one snap to approve the exact run. "The agent never sets wages or recipients." |
| 0:30–0:45 | Terminal, agent shell | `assess` on the **revisions** record → `DEFER` (Jev `pending`). `assess` on the **dispute** record → `ESCALATE`. "The agent refuses when the client isn't satisfied." |
| 0:45–1:10 | Terminal | `assess` on the **accepted** record → `EXECUTE` with Jev probabilities, then `autopilot --live` → transaction hash. "Rules first, then Jev, then the Noir SDK signs with the agent key." |
| 1:10–1:25 | Stellar Expert | Open the authorize hash. Show the `authorize` contract call and the amount. |
| 1:25–1:40 | Terminal, merchant shell | `check` (pending 15,000,000 stroops) → `claim --pending-stroops 15000000` → hash. "Funds arrive only when the recipient signs." |
| 1:40–1:52 | Site: Invoices | Pay the Velo checkout; refresh; row flips to `paid` with hash. "Client collections are separate: they never fund payroll." |
| 1:52–2:00 | Site: `/app/proof` | All hashes with explorer links. "Every step is a real Testnet transaction." |

## 3. Commands for the agent shell (steps 0:30–1:10)

```bash
export ID=demo-<mmdd> MANIFEST="$PWD/.data/$ID.manifest.json" DIGEST=<digest>
export ALLOWED_MERCHANT_ADDRESSES=<merchantPub> NOIR_TESTNET_CONTRACTS_CONFIRMED=true
set -a; . ./.env.local; set +a                                  # AI_GATEWAY_API_KEY for Jev
read -r -s -p 'Agent secret: ' NOIR_AGENT_SECRET; echo; export NOIR_AGENT_SECRET
npm run noir -- assess    --manifest "$MANIFEST" --payout ".data/$ID.payout-revisions.json"   # DEFER
npm run noir -- assess    --manifest "$MANIFEST" --payout ".data/$ID.payout-dispute.json"     # ESCALATE
npm run noir -- assess    --manifest "$MANIFEST" --payout ".data/$ID.payout-accepted.json"    # EXECUTE
npm run noir -- autopilot --manifest "$MANIFEST" --payout ".data/$ID.payout-accepted.json" --live --confirm "$DIGEST"
unset NOIR_AGENT_SECRET AI_GATEWAY_API_KEY
npm run noir -- reconcile --manifest "$MANIFEST"
```

Merchant shell (1:25–1:40):

```bash
export MANIFEST=... DIGEST=... ALLOWED_MERCHANT_ADDRESSES=<merchantPub> NOIR_TESTNET_CONTRACTS_CONFIRMED=true
npm run noir -- check --manifest "$MANIFEST"                     # read pendingMerchantStroops
read -r -s -p 'Merchant secret: ' NOIR_MERCHANT_SECRET; echo; export NOIR_MERCHANT_SECRET
npm run noir -- claim --manifest "$MANIFEST" --live --confirm "$DIGEST" --pending-stroops 15000000
unset NOIR_MERCHANT_SECRET
npm run noir -- reconcile --manifest "$MANIFEST"
npm run noir -- evidence --manifest "$MANIFEST" > "apps/web/public/evidence/$ID.json"   # optional: new snapshot for the site
```

## 4. Things that will bite you on camera

- `assess` makes a real Jev call each time (~1 s, fractions of a cent). Run each once beforehand so you know the verdicts; they were `pending` 0.92 → DEFER and `escalate` 1.00 → ESCALATE on Nov 6.
- `autopilot` refuses to run twice for the same manifest (`ALREADY_EXECUTED`). A retake needs a new `ID` and a new owner `approve` + `setup` round, or just show `evidence` for the earlier run.
- A stray character in a pasted secret returns `INVALID_SECRET`; retype it.
- Terminal font large; never show the role file or `.env` files on screen.
- Keep the backup: Stellar Expert links for the Nov 6 run are in the README if the network is slow.

## 5. Live judging (5-min pitch + Q&A)

Same flow as the video with one new manifest prepared in advance (owner setup done, agent shell open on `assess`). Have the README Testnet proof table open as a fallback, and the Proof page in a second tab.
