# Frontend handoff: what the UI needs to show (Nov 6, 2026)

Owner: JC (apps/web). Backend and proofs are done; the deployed site still renders the original grayscale starter and shows none of it. Everything below is read-only display work. **Never put a secret, an admin token or a "pay" button in the browser**: the agent runs in an operator shell, not the web app.

Live: web https://snapp-prodigitality.vercel.app → API https://snapp-server.onrender.com (`VITE_API_BASE`, already set on Vercel; Vercel auto-deploys `main`, Root Directory `apps/web`).

## Data sources

| Source | What it holds | How to read |
|---|---|---|
| `GET {API}/api/projects` | fixture projects + milestones | already used |
| `GET {API}/api/agent/preview/:projectId` | Payment Eligibility Engine preview (`hold` / `human_review` / `pay`) | already used |
| `GET {API}/api/collections` | **new**: Velo client collections this server created, with Velo status and the on-chain `txHash` once the webhook lands | `Collection[]` from `@agentpay/shared` |
| `/evidence/snapp-demo-001.json` (static, in `apps/web/public/evidence/`) | **new**: the recorded Noir run: 2 Autopilot decisions (Jev probabilities, reason, stage) and 5 confirmed transactions with Stellar Expert links and decoded contract events | `NoirEvidence` from `@agentpay/shared` |

The Noir journal lives on the operator's machine, not on the server, so the web shows a **snapshot of a recorded Testnet run**. Label it that way ("Recorded Testnet run, Nov 6 2026"); do not present it as live state. Regenerate with `npm run noir -- evidence --manifest … > apps/web/public/evidence/<id>.json` after any new run (no secrets in that output).

Types added to `packages/shared/src/index.ts`: `Collection`, `CollectionStatus`, `NoirEvidence`, `NoirOperationRecord`, `AutopilotDecisionRecord`, `AutopilotDecision`.

## Pages

1. **Payment agent (`/agent`)**, currently a placeholder. This is the page judges care about (30% weight: "the agent truly decides"). Show, from the evidence snapshot:
   - The pipeline: Owner approval → Payment Eligibility Engine → Payout Risk & Review Agent (Jev) → Noir `authorize` → merchant `claim`.
   - The decision log: `decisions[]` with `decision`, `stage`, `reason`, and `details.probabilities` (`routine 1.00 / pending 0 / escalate 0`, `concernProbability 0.03`, model `typesafe-ai/jev`), plus the thresholds. One card per verdict.
   - The five operations: `kind`, `state`, `ledger`, `explorer` link, and the decoded event (`evidence.events[0].type`, amount in stroops ÷ 10,000,000). Mark `authorize` as "signed by the agent".
   - A plain line: "Jev can only defer or escalate; it never approves. The owner fixed recipient and amount; the agent decided whether and when."
2. **Invoices (`/invoices`)**: add a "Client collections (Velo Testnet)" list from `/api/collections`: amount, status pill, `checkoutUrl` link while `created`, Stellar Expert link when `txHash` is set. No "create checkout" button (admin-only API). Keep the existing note that a collection is not invoice settlement or employee pay.
3. **Project page**: fine as is. Optionally show the preview's `reason` next to each pill.
4. **Overview**: counts for collections and recorded Noir transactions, each linking to the pages above.
5. **Apply the design library** (`SnappControls`, `SnappLogo`, tokens) to the pages above; brand guide is `SNAPP_BRAND.md`. Keep the "Preview environment, no real funds" and "Testnet only" notices visible.

## Copy to keep exact
- "This preview never sends payments" on the project page.
- Noir rows are "authorization" and "claim", never "paid salary" or "bank transfer".
- Velo rows are "client collection", separate from employee pay.

## Housekeeping
- `npm test -w @agentpay/web`: 5 of 47 tests time out at 5 s (`DesignLibrary`, `LibraryExtensions`, `SnappControls`). Pass locally for you? If so, bump `testTimeout` in `vitest.config.ts`; root `npm test` is red until then.
- README "Screenshots" section is still TBD: capture the Payment agent page and the Invoices page once done.
- Render free tier sleeps after 15 min; the first API call after idle takes ~30 s. Show a loading state rather than an error for that case.

## Reference
- Explorer links: `https://stellar.expert/explorer/testnet/tx/<hash>`.
- Agent payment to feature: `9271346277a3a9b69763ba00af1405fe6f5a72f9965847aa7b40c6735b275c5d` (authorize, ledger 5589865).
- Full status: `docs/CHECKLIST.md`; API: `docs/API.md`; architecture: `docs/ARCHITECTURE.md`.
