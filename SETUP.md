# SETUP.md — Snapp starter and coding-agent onboarding

**Start here.** This README companion helps four human contributors and coding agents share a safe, repeatable project setup.

## Product scope before setup
Snapp targets **Proyekto-connected cutoff pay runs**, not replacement project management or invoicing. The owner manually reviews hours for 1–15 and 16–end-of-month periods, then approves exact recipients and amounts. Employees should see their own hours/rate/adjustment breakdown and payment results; client evaluations provide versioned work context, not an automatic wage gate.

The web/API remains a fictional milestone-oriented starter; previews never pay. Separate local tooling now supports a controlled, single-item Noir Testnet experiment with signed owner consent and a SQLite operation journal. This setup does not provision Proyekto sync, cutoff review, client evaluation, employee statements, immutable payroll-run approval or bank disbursement. See [PRD](PRD.md) and [API](docs/API.md).

The company's recommended bank-file path requires a verified corporate-bank facility and separate implementation; do not connect actual payroll or bank credentials to this demo. Noir demonstrates delegated **Testnet** execution only. Velo is a separate optional client collection path, not a payroll provider, a PHP conversion service or automatic Noir escrow funding.

## Prerequisites
- Node.js **`>=22.23.4 <23 || >=24.22.1 <25 || >=26.12.1`** (`.nvmrc` = `22.23.4`), npm and Git.
- No browser extension is required for the local Noir keypair tooling. Use three distinct Stellar **Testnet-only** accounts under separate owner, agent and merchant control for any live experiment.
- Velo dashboard credentials are optional and only needed for the separate collection experiment. Never use real assets, payroll credentials or Mainnet keys.

## 1. Clone and install
```bash
git clone https://github.com/JoshuaHM-p4/Snapp.git
cd Snapp
nvm install && nvm use
node -v
npm install   # one root command for every workspace
```

If working from the distributed ZIP, extract and `cd agentpay-starter` instead of cloning. The committed `package-lock.json` records resolved dependencies; use `npm ci` for a lockfile-based clean installation. Noir SDK is pinned to `0.3.0`, Stellar SDK to `16.0.1`; Velo was not upgraded.

## 2. Copy local environment
```bash
cp apps/server/.env.example apps/server/.env
```
Keep `DEMO_MODE=true`. The demo has no required external API keys. Never paste a secret into PRs, commits, client `.env`, issue threads or screenshots. `.env` is ignored.

## 3. Run locally (two independent apps)
```bash
npm run dev
# Web     http://localhost:5173
# Server  http://localhost:4000/api/health
```
You can run them independently in different terminals:
```bash
npm run dev -w @agentpay/server
npm run dev -w @agentpay/web
```
The Vite proxy forwards `/api` to port 4000 **only during local development**. For production, implement web-host rewrite or `VITE_API_BASE` client configuration + allowlisted CORS; do not ship a localhost proxy.

## 4. Smoke test
```bash
npm run smoke            # requires running server
npm run typecheck
npm test
npm run build
```
Navigate to the sample `Business website development` project, then click **Run agent decision preview**. You should see `hold` or `human_review` because the fixture lacks verified payment/approval prerequisites. This is intentional; no payment occurs. This preview does not demonstrate owner-reviewed cutoff hours or an approved pay run.

## 5. Controlled local Noir Testnet experiment

This is separate from the server and web preview: there is no HTTP Noir payment trigger. Leave the demo server's `DEMO_MODE=true`; changing it does not enable this CLI. The CLI reads inherited environment only, **does not load `.env` files**, and never creates or funds wallets automatically.

### Gates before any live operation
Read [INTEGRATIONS](docs/INTEGRATIONS.md), especially the **unresolved earlier-form contract-ID discrepancy**. SDK/repository agreement and a passing `doctor` are not independent deployment verification. Resolve the discrepancy with organizers/deployment evidence before setting `NOIR_TESTNET_CONTRACTS_CONFIRMED=true`; that flag is an operator attestation, not a bypass or automatic proof.

Obtain three distinct Testnet wallets with explicit consent from each role. Manually fund **each account's transaction fees** using a trusted Testnet wallet/faucet such as [Friendbot](https://friendbot.stellar.org); independently verify network and balances. Manually provide the owner's additional Testnet XLM needed for escrow funding. The owner later signs the explicit `setup --step fund` transfer. The tooling never calls Friendbot; Velo does not fund this escrow.

Independently verify the merchant public key and establish `ALLOWED_MERCHANT_ADDRESSES` out of band. Do not derive trust merely by copying the manifest. The operator must retain one canonical journal for all commands/roles on the same trusted local checkout; remote role shells need a separate secure signing/custody procedure not supplied here. Never share secrets between roles or put them in command arguments, chat, commits, screenshots or server/browser environment files.

### Public manifest and offline plan
From the repository root, run `umask 077` and `mkdir -p .data`, then create `.data/noir-experiment.json` in your editor (the `.data/` directory is ignored). Replace the three public-key placeholders with the real, distinct Testnet public addresses, replace the example device hash with your chosen 64-hex-character identifier, and choose an explicit future UTC expiry. This JSON is a template, not a payable fixture:

```json
{
  "id": "controlled-testnet-001",
  "purpose": "controlled-testnet-experiment",
  "owner": "<OWNER_PUBLIC_KEY>",
  "agent": "<AGENT_PUBLIC_KEY>",
  "merchant": "<VERIFIED_MERCHANT_PUBLIC_KEY>",
  "deviceHash": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  "amountXlm": "0.0000100",
  "maxPaymentXlm": "0.0000100",
  "totalBudgetXlm": "0.0000100",
  "fundingXlm": "0.0000100",
  "expiresAt": "2026-12-01T00:00:00Z"
}
```

Only those fields are accepted. Amounts are positive decimal strings with at most seven fractional digits (1 XLM = 10,000,000 stroops), not floats; `amount <= maxPayment <= totalBudget` and `funding >= amount`. All roles must be distinct valid Stellar addresses. The manifest contains no secrets.

```bash
# Repository root; repeat these public settings in EACH isolated role shell.
export MANIFEST="$PWD/.data/noir-experiment.json"
export ALLOWED_MERCHANT_ADDRESSES='<independently verified merchant public key>'
npm run noir -- --help
npm ls @noirx402/agent-sdk @stellar/stellar-sdk
npm run noir -- doctor
npm run noir -- plan --manifest "$MANIFEST"
# Copy the digest from plan only after reviewing every normalized public value.
export DIGEST='<exact plan digest>'
# ONLY after independent contract/deployment verification resolves the discrepancy:
export NOIR_TESTNET_CONTRACTS_CONFIRMED=true
```

Use **absolute manifest paths** for clarity across role shells. The CLI resolves relative manifest/explicit `--db` paths against npm's original invocation directory (`INIT_CWD`), or the current directory when invoked directly with Node. The default journal is always repository-root `.data/noir-testnet.sqlite`, independent of working directory. An explicit `--db /absolute/path` must be used consistently for every command if deliberately selecting another journal; live in-memory journals are prohibited.

The digest binds canonical normalized manifest bytes, Testnet network passphrase, native asset and exact contract IDs. The owner signs those bytes locally; `approve` writes consent to SQLite, **not the chain**. Every setup/authorization/claim requires that approval, `--live`, the exact digest, attestation, allowlisted merchant and the matching role key. A changed recipient, amount or other signed value needs new explicit approval under a new experiment ID; an existing ID is never overwritten. Approval/setup/authorization require unexpired consent.

### Owner shell: approve, then three separately journaled setup steps
Use a private Bash terminal under the owner's control, at the same repository root, with the public settings above. Load **only** the owner secret using a hidden prompt (or an approved private secret manager), never a literal shell argument:

```bash
unset NOIR_AGENT_SECRET NOIR_MERCHANT_SECRET
read -r -s -p 'Owner Testnet secret: ' NOIR_OWNER_SECRET; printf '\n'
export NOIR_OWNER_SECRET
npm run noir -- approve --manifest "$MANIFEST" --confirm "$DIGEST"
npm run noir -- setup --manifest "$MANIFEST" --step device --live --confirm "$DIGEST"
npm run noir -- reconcile --manifest "$MANIFEST"
npm run noir -- setup --manifest "$MANIFEST" --step policy --live --confirm "$DIGEST"
npm run noir -- reconcile --manifest "$MANIFEST"
npm run noir -- setup --manifest "$MANIFEST" --step fund --live --confirm "$DIGEST"
npm run noir -- reconcile --manifest "$MANIFEST"
unset NOIR_OWNER_SECRET
```

Proceed to the next step only after successful confirmation or an exact matching already-present setup result. Conflicting on-chain owner/agent/policy/token state is refused, not overwritten. Pre-existing external funding is not local transaction proof. If a command errors or times out after recording a hash, stop and reconcile; **never resend**.

### Agent shell: inspect and authorize the exact item
Open a separate private shell under the agent's control; repeat the public settings and reviewed digest, not the owner's secret. Confirm setup, policy, fee/escrow balances and approval:

```bash
unset NOIR_OWNER_SECRET NOIR_MERCHANT_SECRET
npm run noir -- check --manifest "$MANIFEST"
read -r -s -p 'Agent Testnet secret: ' NOIR_AGENT_SECRET; printf '\n'
export NOIR_AGENT_SECRET
npm run noir -- authorize --manifest "$MANIFEST" --live --confirm "$DIGEST"
unset NOIR_AGENT_SECRET
npm run noir -- reconcile --manifest "$MANIFEST"
npm run noir -- evidence --manifest "$MANIFEST"
```

Authorization requires a successful SDK `checkPayment`, matching live setup and sufficient escrow. A submitted hash is not authorization confirmation and authorization is not merchant receipt.

### Agent shell alternative: Snapp Autopilot (agent decides when to execute)
Instead of a manual `authorize`, let the agent decide. Write a **payout record** next to the manifest: the milestone being paid (same shape as the fixture milestones; `merchantAddress` and `testnetAmountXlm` must equal the signed manifest), the earliest UTC time it may be paid, and the minimal review text Jev will read. No addresses, hashes, names or amounts belong in `review`.

```json
{
  "milestone": {"id":"m-01","title":"UI implementation","assignee":"Demo developer A","merchantAddress":"<merchant public key>","dueDate":"2026-11-06","status":"approved","acceptanceCriteria":["Responsive layouts"],"evidence":[{"type":"pr","url":"https://example.org/pull/1","passed":true}],"testnetAmountXlm":"0.0000010"},
  "payoutDate": "2026-11-16T00:00:00Z",
  "review": {"clientFeedback":"Looks good, accepted.","evidenceSummary":"PR merged and preview deployed.","revisionSummary":"No open revisions."}
}
```

```bash
export PAYOUT="$PWD/.data/noir-payout.json"
npm run noir -- assess --manifest "$MANIFEST" --payout "$PAYOUT"        # read-only verdict, no signer
read -r -s -p 'AI Gateway (or TypeSafe) API key: ' AI_GATEWAY_API_KEY; printf '\n'; export AI_GATEWAY_API_KEY
# or, if you keep it in the git-ignored repo-root .env.local (chmod 600):  set -a; . ./.env.local; set +a
read -r -s -p 'Agent Testnet secret: ' NOIR_AGENT_SECRET; printf '\n'; export NOIR_AGENT_SECRET
npm run noir -- autopilot --manifest "$MANIFEST" --payout "$PAYOUT" --live --confirm "$DIGEST" --every 60
unset NOIR_AGENT_SECRET AI_GATEWAY_API_KEY TYPESAFE_AI_API_KEY
npm run noir -- reconcile --manifest "$MANIFEST"
npm run noir -- evidence --manifest "$MANIFEST"    # includes the decisions log
```

Verdicts: `EXECUTE` (authorize now, through the same journaled path as `authorize`), `DEFER` (re-evaluate later: not yet approved, payout date not reached, insufficient escrow, Jev unavailable, `SNAPP_AUTOPILOT_DISABLED=true`), `ESCALATE` (stop for a human: dispute, failed evidence, recipient/amount differs from the signed manifest, expired approval, setup conflict, Jev flags or is unsure). With `--every`, the loop keeps re-evaluating while the verdict is `DEFER` and exits on anything else. Once an authorization is recorded the command reports `ALREADY_EXECUTED` and never sends again. Set `SNAPP_AUTOPILOT_DISABLED=true` to halt new executions immediately. The Jev thresholds are untuned starting points; without `TYPESAFE_AI_API_KEY` or `AI_GATEWAY_API_KEY` every verdict defers. Jev is called through the Vercel AI SDK: a direct TypeSafe key pins `jev-1.14.0`; a gateway key uses `typesafe-ai/jev` and the response reports the resolved version. Vercel AI Gateway refuses requests (HTTP 403 `customer_verification_required`) until the Vercel team has a card on file.

### Merchant shell: inspect aggregate pending funds, then claim
Open a separate private shell under merchant control; repeat the public settings/digest. **Wait for the local authorization to be confirmed by reconciliation.** `check` reports merchant pending stroops even when the policy is expired or authorization is otherwise ineligible:

```bash
unset NOIR_OWNER_SECRET NOIR_AGENT_SECRET
npm run noir -- check --manifest "$MANIFEST"
# Review ALL pending funds for this merchant/native token, not only this item.
export PENDING_STROOPS='<exact positive integer from check>'
read -r -s -p 'Merchant Testnet secret: ' NOIR_MERCHANT_SECRET; printf '\n'
export NOIR_MERCHANT_SECRET
npm run noir -- claim --manifest "$MANIFEST" --live --confirm "$DIGEST" --pending-stroops "$PENDING_STROOPS"
unset NOIR_MERCHANT_SECRET
npm run noir -- reconcile --manifest "$MANIFEST"
npm run noir -- evidence --manifest "$MANIFEST"
```

Claim collects **ALL merchant/token pending funds**; it is not restricted to this manifest's amount. The CLI rereads pending before signing and refuses a changed amount. Zero pending is not item receipt proof. Claim remains available after expiry for a locally confirmed authorization; read-only check/reconcile/evidence also remain available after expiry and do not require current allowlist membership. Live claim still requires the other live gates and merchant consent.

### Journal, recovery and evidence limits
- SQLite stores approval bytes/digest/signature and public operation identity, never secrets or signed XDR. It uses an immediate transaction, permissions, WAL and FULL synchronous durability. Signing/hash persistence commits **before broadcast**.
- Journal directory is mode `0700`, database `0600`. The default directory is secured automatically; a deliberate `--db` override must have a private `0700` parent directory. Shared parents are refused rather than chmodded.
- `prepared` means a hash was durably reserved; `unknown` means outcome is unresolved; `succeeded` means confirmed transaction success; `failed` means confirmed failure. Prepared/unknown/succeeded authorizations count against the cumulative device budget. Explicit nonces are recorded under the same lock.
- There is **no retry/reset/replacement-nonce command**, even for failed operations. Each experiment/kind is single-use. Reconcile existing hashes; `NOT_FOUND`, retention gaps or network errors do not release a reservation or prove non-submission.
- This guarantee is local to **one intact canonical journal**. Copying/deleting it or using a second journal/checkout defeats shared deduplication/budget accounting; do not do that to retry. This is not a multi-user payroll ledger.
- Preserve separate setup, authorization and aggregate-claim hashes/ledgers. `evidence` emits local JSON with genuine Testnet explorer links; distinguish submitted identity, confirmed transaction metadata and matched contract events. Missing event evidence remains incomplete. Aggregate claim proof must not be relabeled as one claim per item, payroll settlement, bank credit or PHP conversion.

For optional Velo collection only, configure `VELO_API_KEY`/`VELO_WEBHOOK_SECRET` in the server and an HTTPS `/api/webhooks/velo` endpoint. Its Testnet-only [release scope](https://github.com/Velo-Ecosystem-Collection/Velo/blob/main/packages/velo-sdk/README.md#release-scope) excludes Mainnet/external settlement. Velo was not upgraded; collections and reconciliation are separate from Noir.

## 6. Environment examples
`apps/server/.env.example` configures the demo/Velo server. `packages/agent/.env.example` is a reference for private inherited CLI environments, **not an automatically loaded file**.

| Variable | Where | Role |
| --- | --- | --- |
| `PORT`, `WEB_ORIGIN`, `PUBLIC_WEB_URL` | server | Dev server and redirect/CORS |
| `DEMO_MODE` | server | Demo guard; leave `true` for previews |
| `ADMIN_API_TOKEN` | server | Temporary Velo API protection; **not production auth** |
| `VELO_API_KEY`, `VELO_WEBHOOK_SECRET` | server | Optional checkout + signed events |
| `NOIR_OWNER_SECRET` | owner CLI shell only | Signs local consent and setup |
| `NOIR_AGENT_SECRET` | agent CLI shell only | Signs authorization |
| `NOIR_MERCHANT_SECRET` | merchant CLI shell only | Signs aggregate claim |
| `ALLOWED_MERCHANT_ADDRESSES` | CLI shells | Comma-separated independently verified public recipients |
| `NOIR_TESTNET_CONTRACTS_CONFIRMED` | CLI shells | Defaults `false`; `true` only after independent discrepancy resolution |
| `TYPESAFE_AI_API_KEY`, `AI_GATEWAY_API_KEY` | agent CLI shell only | Jev Payout Risk & Review Agent (direct TypeSafe, else Vercel AI Gateway); no key => autopilot defers |
| `SNAPP_AUTOPILOT_DISABLED` | agent CLI shell | `true` halts new autopilot executions |

## 6a. Deploy (public URL is a submission requirement)
Web and server deploy separately. Config is committed: [`apps/web/vercel.json`](apps/web/vercel.json) (Vercel project Root Directory = `apps/web`) sets the Vite output and SPA fallback; [`render.yaml`](render.yaml) runs the Express server with `/api/health` as the health check. Both commands were verified locally (`npm ci` → `npm run build -w @agentpay/web` with `VITE_API_BASE` embedded, and `npm run start -w @agentpay/server` answering health with the CORS origin set).

1. **Server first (Render):** New → Blueprint → this repo. Set `WEB_ORIGIN` and `PUBLIC_WEB_URL` to the Vercel URL you will use (you can update after step 2), `ADMIN_API_TOKEN` to a random secret, and leave `DEMO_MODE=true` unless you also set real `VELO_API_KEY`/`VELO_WEBHOOK_SECRET`. Note the service URL, `https://snapp-server.onrender.com` (current deployment).
2. **Web (Vercel):** Import the repo with **Root Directory `apps/web`**; the committed `apps/web/vercel.json` supplies output dir and SPA fallback, and Vercel installs workspaces from the monorepo root automatically. Add one environment variable: `VITE_API_BASE=https://snapp-server.onrender.com` (no trailing slash). Deploy, then put the resulting URL into Render's `WEB_ORIGIN`/`PUBLIC_WEB_URL` and redeploy the server.
3. **Velo webhook:** in the Velo dashboard, set the endpoint to `https://snapp-server.onrender.com/api/webhooks/velo` and copy its signing secret into `VELO_WEBHOOK_SECRET`.
4. **Verify from another device:** open the Vercel URL, run the agent decision preview (three `hold` results, no payment), then `curl https://snapp-server.onrender.com/api/health`.

Limits: the Render free plan sleeps when idle (a GitHub Actions cron in `.github/workflows/keepalive.yml` pings `/api/health` about every 10 minutes to keep it warm; GitHub may delay scheduled runs, so a cold start is still possible) and has no persistent disk, so `.data/collections.sqlite` resets on redeploy; attach a disk before relying on recorded collections. The deployed server holds only Velo/admin configuration. Noir role secrets, the Jev key and the Autopilot run stay in operator shells; nothing on the public host can move Testnet funds.

## 6b. Wallet sign-in (owner and developer views)
Design: [docs/WALLET_AUTH.md](docs/WALLET_AUTH.md). Sign-in is SEP-10 style: the server signs a challenge with a funds-less keypair, the wallet signs it back, the server issues an httpOnly session cookie. Roles come from the manifest the owner signed: the owner address sees its runs, the merchant address sees payments to it, a Velo payer is a client, anyone else is a visitor who keeps the demo.

**Server (Render), once:**
1. `node scripts/gen-auth-keys.mjs` locally; paste `AUTH_SERVER_SECRET` and `SESSION_SECRET` into Render → snapp-server → Environment. Set `AUTH_HOME_DOMAIN=snapp-prodigitality.vercel.app` (no scheme).
2. Upgrade the instance to Starter so the `render.yaml` disk (`/var/data`, 1 GB) mounts; `DATA_DIR=/var/data` is already in the blueprint. On the free plan the disk is ignored and runs, sessions and collections reset on every deploy.
3. Redeploy. `GET /api/me` returns `authEnabled:true`.

**Publish a run so roles resolve** (operator shell, after any run):
```bash
set -a; . ./apps/server/.env; set +a           # ADMIN_API_TOKEN
export ALLOWED_MERCHANT_ADDRESSES=<run merchant>
bash scripts/journal-push.sh .data/<id>.manifest.json
```
This uploads the `evidence` JSON (hashes, decisions, manifest; it contains no secrets). The operator journal stays the source of truth; the server copy is read-only.

**Sign in:** the web header shows Connect. Freighter and other Stellar wallets go through the Stellar Wallets Kit; the Noir extension is offered when installed. The wallet must be on Testnet.

## 7. Four parallel workstreams (collaborative, not strict)
- **UI/UX + Frontend — [JCarloZ24 (JC)](https://github.com/JCarloZ24):** `docs/DESIGN.md`, `docs/UI.md`, reusable components and frontend routes; cutoff review, private employee statements/discrepancies, client evaluation and per-item status views. Brand approval remains on hold; keep sample routes honestly labeled until replaced.
- **API Integration — [Stobeeney](https://github.com/Stobeeney):** API contracts, shared types, server endpoints, frontend/API data wiring and Proyekto/Velo API integration; versioned reviews/calculations, auth/RBAC, immutable run approval and durable per-item records. Velo collections remain separate.
- **Integration + Deployment — [aidantiu](https://github.com/aidantiu):** end-to-end integration, environment/hosting configuration, CI, web/server deployment and HTTPS webhook verification; coordinate integration and reconciliation checks with Stobeeney and the founder.
- **Founder/fullstack — [JoshuaHM-p4](https://github.com/JoshuaHM-p4):** Own all Noir integration setup, development and testing—from the current starter through the complete owner-approved Testnet workflow: SDK/network/contract verification; wallet/device/policy/escrow setup; check/authorize and separate merchant claim; payment safeguards, negative tests, reconciliation and genuine Testnet proof. Retain bank-facility feasibility and final product/security review; coordinate API work with Stobeeney and integration/deployment with Aidantiu.

Assign issues, feature branches and small PRs; **no hard file permissions**. These are primary responsibilities, not exclusive rights or changes to GitHub access. Anyone can pair across workstreams; the founder can support everywhere. See [TEAM](docs/TEAM.md).

## 8. Rules for any coding agent (Claude/Codex/etc.)
Read `AGENTS.md` and `CLAUDE.md` first, then PRD/ARCHITECTURE/INTEGRATIONS. Pick a single small task, mention which files/interfaces will change, edit only what is needed, run tests, leave a concise PR summary. Do not invent API responses, integration success, wallet balances, webhook events, screenshots, transaction hashes or unsupported contract IDs. Never make real transfers.

## 9. Known gaps and errors
- **Observed controlled-tooling checks:** install on Node 22.23.4; Noir `0.3.0`/Stellar `16.0.1` resolution; pinned source/declaration comparison; 20 focused Noir tests; real-SDK fake-transport persistence/timeout smoke; actual CLI help/plan/approve/evidence and missing-live/attestation refusal smoke. These are offline/fake-transport checks, not live transaction proof.
- Read-only public RPC `getNetwork`/`doctor` returned Testnet configuration with `contractsAttested:false`. This establishes SDK/repository/network agreement only, not independent deployment verification.
- **Live Testnet execution remains unverified:** independent contract-discrepancy resolution, three separate funded Testnet wallets, verified merchant allowlist and explicit role consents/signatures are still required.
- Real demo server health/projects/preview succeeded and the old approval POST returned 404. Browser preview produced three holds/local-tooling prose without errors. Scaffold checks, all 33 workspace tests, root typecheck and full build pass. Velo webhook verification, dedupe and retrieval-based reconciliation were exercised locally with self-signed events; a run against a real Velo project/API key and deployment remain unverified. See [verification details](docs/CHECKLIST.md#exercised-controlled-tooling-checks--not-live-gates).
- If `npm install` warns about engines, switch to a supported Node version. If startup fails, check both dev servers and the server env copy.
- If Velo webhook verification fails, check raw body, secret and header; never bypass validation.
- Noir refusals require inspection of the public configuration, approval, policy/expiry, fee/escrow balances and recorded hashes. Reconcile unknown operations; never replay them.
- JSON fixture storage is not a production payroll database. The separate SQLite experiment journal does not add web authentication/RBAC, approved cutoff runs, employee privacy or payroll reconciliation.
- No Proyekto or bank integration is configured. Verify actual API permissions or supported bank-file formats before implementing; never automate bank UI/OTP entry or claim a one-OTP batch.
- Client comments, revision requests and acceptance must retain deliverable version, evaluator and time. They do not replace owner hours review or automatically gate wages.

## 10. Submission reminders
A publicly accessible deployed website, public GitHub monorepo, 2-min video, short explanation and Testnet tx proof are mandatory. Handbook deadline is **Nov 7 2026, 12:00 PM PHT**. See [CHECKLIST](docs/CHECKLIST.md).

> **Evidence boundary:** the focused local checks above do not satisfy the submission's live Testnet proof requirement. Collect genuine confirmed authorization and separate merchant-claim evidence only after all live gates are independently satisfied.
