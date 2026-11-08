# Overall build and submission checklist

Legend: `[x]` starter exists; `[ ]` still needs a teammate to complete and validate. A checked item does **not** mean it was tested against live SDKs.

## Workstream ownership
- **JC / [JCarloZ24](https://github.com/JCarloZ24):** UI/UX and frontend, wireframes/components/routes, responsive/accessibility work and employee/client views.
- **[Stobeeney](https://github.com/Stobeeney):** API integration, contracts/shared models, endpoint and page-data wiring, Proyekto/Velo API connections and durable domain records.
- **[aidantiu](https://github.com/aidantiu):** end-to-end integration and deployment, CI/environment/hosting configuration and deployed web/server/webhook verification.
- **[JoshuaHM-p4](https://github.com/JoshuaHM-p4):** Own all Noir integration setup, development and testing—from the current starter through the complete owner-approved Testnet workflow: SDK/network/contract verification; wallet/device/policy/escrow setup; check/authorize and separate merchant claim; payment safeguards, negative tests, reconciliation and genuine Testnet proof. Retain bank-facility feasibility and final product/security review; coordinate API work with Stobeeney and integration/deployment with Aidantiu.

Assignments are soft ownership, not changes to repository access or signing authority. See [TEAM](TEAM.md).


## A. Foundations — founder / all
- [x] Public-repo-ready monorepo skeleton, separate web/server/agent/shared
- [x] Root README with mandatory hackathon section order
- [x] PRD, setup, software, architecture, design placeholder, pages, UI, API and team guide
- [x] Sample React dashboard; Express health and project/preview endpoints
- [x] Deterministic decision module and controlled local Noir CLI with signed single-item consent and SQLite journal
- [x] Velo server checkout and signature verification adapters
- [x] Supported Node 22.23.4 installation succeeded and captured lockfile (clean-machine reproduction still pending)
- [ ] Green CI build/test after official SDK installation
- [x] GitHub public repo: https://github.com/JoshuaHM-p4/Snapp (main)

## B. Priority product workflow — pending, owner / domain / UX
All cutoff, Proyekto, client-evaluation, employee statement, approved **pay-run** and bank capabilities below are unimplemented targets. Local owner-signed experiment consent and SQLite cumulative-device reservations do not complete them.
- [ ] Prepare company cutoffs for days 1–15 and 16–end-of-month
- [ ] Link/import Proyekto references with provenance; verify integration rather than replacing its existing projects/tasks/docs/progress/roadmaps/Gantt/invoicing
- [ ] Consolidate employee/project hours, actual outputs and versioned client feedback for boss review
- [ ] Preserve boss's manual hours judgment and final release authority; agent must not determine wages
- [ ] Distinguish employment/hourly terms from fixed-fee milestone contracting; actual agreement/legal obligations govern, not universal client acceptance or invoice-payment gates
- [ ] Provide employee-specific hours/rates/adjustments/calculation statements and a discrepancy channel; enforce own-compensation-only access
- [ ] Owner approves immutable exact recipient + amount run snapshot; every change requires reapproval
- [ ] Execute only approved items with durable at-most-once payout records, not milestone-only deduplication
- [ ] Reconcile every recipient individually, including partial failures and unknown outcomes; investigate before retry, never blindly resubmit
- [ ] Record client deliverable version, comments, revision requests and acceptance identity/time/version; do not invent objective ratings

## C. UX and persistence — pending
- [ ] Wireframes/components/routes for the priority workflow; current scaffold previews remain explicitly labeled
- [ ] Founder approves Prodigitality brand tokens/design (currently on hold); retain neutral grayscale until approved
- [ ] Multiuser payroll database/migrations and login/RBAC for owner, employee and client; local experiment SQLite is not this system
- [ ] Versioned compensation terms, calculations, approval snapshots, discrepancies and audit records
- [ ] Connect UI to validated API with loading/empty/error states; no fabricated successful states
- [ ] Responsive/mobile/accessibility verification and genuine transaction evidence display

## D. Company bank path — recommended, entirely pending
- [ ] Select a corporate bank and verify its supported transaction-file format, recipient fields, limits and approval controls
- [ ] Export exact approved recipients/amounts in that supported format to reduce recipient-by-recipient copy/paste
- [ ] Preserve bank approval controls and reconcile individual recipient results; export/upload is not settlement
- [ ] Consider API integration only after verifying the provider's actual capability; no bank integration currently exists
- [ ] Do not automate bank UI/OTP or promise one OTP
- Existing solutions already address parts of this: [BPI BizLink transaction-file upload and approvals](https://www.bpi.com.ph/institutional-banking/cashflow-management/bizlink), [Sprout payslips/timekeeping/bank files](https://sprout.ph/product/payroll-management/). Differentiate through Proyekto-linked traceability and approved-run transparency, not invented payroll functionality.

## E. Hackathon Noir Testnet path — pending proof
All live hackathon gates below remain open. Exercised local checks are recorded separately, not substituted for genuine Testnet proof.
- [ ] Independently resolve earlier form-ID discrepancy with organizers/deployment evidence; pinned SDK/repository agreement and read-only network checks are insufficient
- [ ] Fund three distinct owner, agent and merchant Testnet accounts manually; pre-fund escrow separately from client collections
- [ ] Owner completes real SDK device/agent registration and policy setup, then `fundEscrow`, with confirmed transaction evidence
- [ ] Verify recipient wallet ownership/allowlist and each role's explicit consent before live use; cumulative **cutoff/run** constraints remain unimplemented
- [ ] Exercise exact signed local consent and serialized journal reservations against live Testnet without exposing an HTTP payout route
- [ ] Agent checks approved exact recipient/asset/amount and policy eligibility, then SDK `checkPayment` → prepare/sign/submit `authorize`; no wage determination
- [ ] Merchant separately signs aggregate `claim`; retain separate actual authorization and claim transaction/event evidence, not one claim per payroll item
- [ ] Validate negative live conditions safely; focused offline tests do not complete live integration proof
- [ ] Attach genuine Stellar Expert Testnet proof; do not claim Mainnet, bank payout or production settlement

### Exercised controlled-tooling checks — not live gates
- [x] Installed Noir 0.3.0/Stellar 16.0.1 inspected against pinned SDK commit `704f701a017b0b13f79898d2597df8c11fd4fa94`; no Velo upgrade
- [x] Twenty focused Noir tests passed; real-SDK synthetic transport smoke checked hash persistence before broadcast and timeout/restart without replay
- [x] Actual CLI help/plan/approve/evidence/missing-live/attestation checks passed without secrets/XDR in captured output
- [x] Read-only public Testnet configuration/network check and `doctor` passed with `contractsAttested:false`
- Local commands: `npm run noir -- plan|doctor|approve|setup|check|authorize|claim|reconcile|evidence`; setup uses `--step device|policy|fund`. See [SETUP](../SETUP.md).
- Canonical repository-root SQLite journal persists identity before broadcast, counts prepared/unknown/succeeded authorizations toward cumulative-device budget, and has no retry/reset even for failed operations. Explicit `--db` alternatives, copies or deletion do not provide cross-journal deduplication.
- Former HTTP milestone approval route is removed (404), with no replacement. Fixture previews/shared eligibility and separate Velo routes remain. Local secrets are privately inherited by role, never server `.env`, browser, arguments or chat; official SDK only, fixed Testnet only.
- [x] Real server with `DEMO_MODE=true`: health/projects/preview returned 200; removed milestone approval POST returned 404; preview produced three dry-run holds
- [x] Actual Vite project page opened, preview clicked, three holds/local-tooling prose observed, screenshot captured, no browser errors, tab closed
- [x] `npm run check:scaffold` passed; `npm test` passed all 21 tests (20 Noir plus existing eligibility test)
- [x] `npm run typecheck -w @agentpay/agent` passed; corrected RPC fixture protocol-version type and reran its two SDK boundary tests successfully
- [x] Web production build passed within `npm run build`
- [x] Root typecheck and `npm run build` green after the Velo webhook payload fix (`rawBody.toString()`), 33 tests passing
- Deployment and live authorization/claim proof remain unverified.

### Snapp Autopilot (requirement #1) — implemented locally, Jev live call unexercised
- [x] `assess`/`autopilot` commands: Payment Eligibility Engine (deterministic) + Payout Risk & Review Agent (Jev, pinned `jev-1.14.0`) + existing journaled Noir `authorize`; immutable `decisions` log surfaced by `evidence`
- [x] 10 new tests: rule precedence, Jev-only-tightens thresholds, unavailable/malformed/401/500 → DEFER, real `ai@7.0.163` + `@ai-sdk/typesafe-ai@3.0.34` request/response through a fake `fetch` (pinned model, bearer header, review-only state), autopilot executes once and reports `ALREADY_EXECUTED` afterwards, disabled switch, tampered approval escalates before Jev/chain
- [x] Actual CLI smoke with a temp journal: `assess` returned `DEFER/eligibility`, `ESCALATE/binding`, `ESCALATE/chain` (real public RPC read on an unregistered device; Jev never consulted); `autopilot` refused without `--live` and without attestation before any signer; decisions appeared in `evidence`; no secrets in output
- [x] Real Jev answers observed via Vercel AI Gateway (`typesafe-ai/jev`, after the Vercel team added a card): accepted feedback → `routine` P=1.00, concern 0.03 → EXECUTE; open tablet revision → `pending` P=0.92, concern 0.97 → DEFER; disputed completion → `escalate` P=1.00, concern 0.97 → ESCALATE. Latency 0.4–1.8 s. A full `assess` against real Testnet RPC escalated at the chain stage (unregistered device) before Jev was consulted, as designed. Gateway reports the alias, not a pinned Jev version; the direct TypeSafe route pins `jev-1.14.0`.
- [x] Live autopilot execution on Testnet (Nov 6): `assess` and `autopilot` both logged EXECUTE (Jev routine P=1.00, concern 0.03); `authorize` tx [92713462…](https://stellar.expert/explorer/testnet/tx/9271346277a3a9b69763ba00af1405fe6f5a72f9965847aa7b40c6735b275c5d) ledger 5589865; owner setup txs 94ca07a7…/5b0f759a…/eceed372…; merchant `claim` tx [e2bdbb00…](https://stellar.expert/explorer/testnet/tx/e2bdbb00816474d5174cea16ea7993422318fd69a534828f7587f479c5ba2bb4); all five confirmed by RPC with matched decoded contract events. Full table in the README.
- [ ] Threshold tuning against representative accepted/revision/dispute feedback samples; current values are documented starting points

### Wallet sign-in (post-submission, Nov 8 to 9) — implemented, deployed config pending
- [x] Server: SEP-10 challenge (`buildChallengeTx`) signed by a funds-less `AUTH_SERVER_SECRET`; wallet-signed challenge verified with `verifyChallengeTxSigners`; httpOnly HMAC session cookie (SameSite=None for the Vercel→Render split); roles owner/developer from uploaded runs, client from Velo payer, else visitor; `GET /api/runs` role-scoped; `PUT /api/runs` admin upload of `evidence` JSON; all state under `DATA_DIR`; 3 new server tests (wrong signer, wrong server key, wrong home domain, forged/expired/re-keyed cookies)
- [x] Web: Connect dialog (Stellar Wallets Kit for Freighter/xBull/Albedo/Lobstr, Noir extension when installed), header role chip + address + Sign out, nav gated by role, `/app/runs` (owner) and `/app/payments` (developer) with RequireRole redirects, visitor notice; all API calls `credentials:'include'`
- [x] Verified locally in a real browser with the demo-1107 wallets: owner sees Your runs (5 operations, decision log), developer sees Your payments (authorization f8023afa… and claim c6e13258…), stranger gets the visitor notice, owner on /app/payments redirects, impostor signature → 401; typecheck 0, web 61, server 6, agent 32, build ok
- [x] Render: `AUTH_SERVER_SECRET`, `SESSION_SECRET`, `AUTH_HOME_DOMAIN` set (Nov 9). Staying on the free plan: runs re-seed from committed `data/runs/*.json` on boot (verified from an empty data dir), sessions need a new sign-in after a deploy, collections are demo-only
- [ ] Deployed sign-in with a real Freighter and the Noir extension (not possible headless); Mainnet-refusal path
- [ ] Step 4 (browser-side signing for owner approve and merchant claim) remains a proposal in docs/WALLET_AUTH.md

## F. Velo client collections — separate hackathon path, optional to company payroll
- [ ] Verify exact declared/installed SDK version against [current upstream release scope](https://github.com/Velo-Ecosystem-Collection/Velo/blob/main/packages/velo-sdk/README.md#release-scope): repository alpha declaration does not mean an upgrade occurred; upstream says Stellar Testnet only, no Mainnet, settlement or external provider
- [x] Persist client collection intents and signed webhook idempotency (SQLite `collections` + `velo_events`); status only from `paymentIntents.retrieve`; terminal states never regress; store test plus live route smoke with self-signed valid/replay/tampered/missing events
- [x] Real Velo Testnet run (Nov 6): project registered on-chain after Friendbot-funding its owner wallet; payments-scope key accepted; `POST /api/payments/checkout` created intent `jx7c2kdzshtnb8tqkpw5tfkr098hp65m` (0.5 XLM); hosted checkout paid from a Testnet wallet; Velo API reported `paid`; on-chain payment [fe057622…d44045](https://stellar.expert/explorer/testnet/tx/fe05762287ed2aaf7b87cc42f2bbbe749a0e09d52ba28463f4d04bba82d44045); local record moved to `paid` via the new admin `POST /api/collections/:id/reconcile` because the webhook cannot reach localhost
- [x] Live `payment.succeeded` webhook delivery on the deployed server (Nov 6): checkout `jx7b025s…hpvd0` created via the public API, paid on-chain ledger 5591012 ([7b9f79c6…0c07](https://stellar.expert/explorer/testnet/tx/7b9f79c659885f173d40f025fc9983daa63e507006929a662be3cc6821e70c07)), Velo delivered the signed event, server verified it, retrieved the intent and recorded `paid` with that `txHash` 5 s after the ledger, with no manual reconcile and no rejections. Earlier deliveries had failed because the SDK parser rejects Velo's live `project` shape after a valid HMAC; fixed by re-verifying the HMAC and accepting a minimal event
- Render free tier has no persistent disk: a redeploy wiped `collections.sqlite` once during this run. Attach a disk (or move to a managed DB) before relying on recorded collections beyond the demo
- [ ] Produce genuine Testnet collection evidence for the hackathon integration; never use a redirect as payment proof
- [ ] Keep Velo separate from payroll payout and escrow funding

Noir constraints reference: [official contracts documentation](https://github.com/noirx402/noir/blob/main/docs/contracts.md).

## G. Demo and deadline (Philippine time UTC+8)
- [ ] Team registration confirmed by organizers (handbook lists Nov 4 23:59 deadline; may already be past)
- [x] Deploy config committed and verified locally: `vercel.json` (web, SPA fallback, `VITE_API_BASE` embedded at build) and `render.yaml` (server, `/api/health` check, CORS origin from `WEB_ORIGIN`); steps in [SETUP §6a](../SETUP.md)
- [x] Deployed: web https://snapp-prodigitality.vercel.app (Vercel, Root Directory `apps/web`, Deployment Protection off), server https://snapp-server.onrender.com (Render blueprint). Verified from outside: site 200 without login, SPA route 200, health/projects/preview/collections 200 with CORS set to the Vercel origin, old approve 404, browser preview shows three holds with no console errors
- [ ] Deployed server HTTPS webhook receives verified event
- [ ] Public repo links source files + docs + exact SDK versions
- [ ] README sections completed with real URLs, screenshots, credits
- [ ] 2-minute video showing owner approval followed by automated eligible exact-item Testnet execution, not autonomous wage determination
- [ ] Submission write-up and Testnet transaction hash
- [ ] Official submission before **Sat Nov 7, 2026 12:00 PM PHT**
- [ ] Prepare 5-minute pitch + 3-minute Q&A (top 10 if selected)

## Demo script (target)
Target only: do not perform or narrate pending screens/actions as working. Until implemented, show the existing preview honestly and identify missing capabilities; capture positive proof only from exercised flows.

1. Explain the real cutoff (1–15 or 16–end-of-month), Proyekto reference context, employee/project hours, actual outputs and versioned client feedback. Proyekto import remains pending until verified.
2. Boss manually reviews hours under the applicable agreement. Show the employee's own hours/rates/adjustments statement and discrepancy channel; client acceptance or invoice payment is not a universal employee-pay gate.
3. Boss explicitly approves the immutable exact recipient + amount snapshot. Explain that changes require reapproval; if this pending control is not implemented, do not pretend the current preview supplies it.
4. For the hackathon only, use the separate local CLI for owner-signed exact single-item consent, device/policy setup and independently pre-funded Noir Testnet escrow. Agent checks the signed item, merchant allowlist and cumulative-device journal budget, then SDK `checkPayment` and prepare/sign/submit `authorize`. This is not an authenticated cutoff/pay-run approval screen.
5. Merchant separately confirms aggregate pending stroops and claims; show genuine, separate authorization/claim hashes, ledgers and events only after live verification. Explain the irreversible no-replay journal and unknown-state reconciliation. Current offline evidence is not live receipt proof.
6. Explain the distinct recommended company bank-file path: chosen supported format and bank approval controls, all pending with no bank integration. No OTP/UI automation or production payout claim.
7. Show the separate Velo Testnet client collection with genuine signed-event/reconciliation evidence once implemented and validated. It is optional to the company's pay-run workflow, but remains a separate hackathon integration goal—not payroll payout or an escrow-funding bridge.

## Reviewer evidence
Paste URLs only after real proof exists: live site `TBD`, repo `TBD`, demo `TBD`, Noir authorize tx `TBD`, Noir claim tx `TBD`, Velo intent `TBD`.
# Draft design library — 2026-11-06

- [x] Implement categorized tokens, component/workflow specimens, motion and CSS 3D studies at `/dev/library`.
- [x] Web typecheck and production build pass; root test command passes.
- [x] Add custom controls, grapheme/date/cutoff validation, Paper ripple fix and 31 frontend behavior/validation tests.
- [x] Run Impeccable source and both-theme rendered scan; document findings, fixes and intentional brand exceptions in [the audit](DESIGN_LIBRARY_AUDIT.md).
- [ ] Complete browser visual, keyboard and touch QA; automation browser unavailable in this session.
- [ ] Resolve existing server webhook Buffer/string mismatch before claiming a passing full-repository build.
- [ ] Obtain company brand approval before product adoption. See [design library handoff](DESIGN_LIBRARY.md).
