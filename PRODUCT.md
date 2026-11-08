# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: the owner of a small digital-services company at cutoff time (days 1 to 15, or 16 to month end). They review hours per person and project, judge them against the agreed terms and the work actually delivered, and approve one exact pay run. Today they do this and then send bank transfers one recipient at a time, re-entering each account and amount.

Secondary: the developers and commissioners being paid. They want to see their own hours, rate, adjustments and expected amount for the cutoff, confirm what was received, and raise a discrepancy. They see only their own compensation, never colleagues'. They check this mostly on a phone.

Confirmed audience without a Snapp screen: clients. They evaluate delivered work (comments, revision requests, acceptance) and pay invoices through Velo's hosted checkout. A Snapp client view is a future possibility, not current scope.

Operator: the person who runs the payment agent from a terminal and holds the role keys. Today this is the founder; it is a backstage role, not a dashboard persona.

## Product Purpose

Snapp turns verified work into one owner-approved pay run and executes it with proof. It sits beside Proyekto, which remains the project-management and invoicing system, and adds the layer those tools lack: cutoff preparation from hours and deliverables, manual owner review, an employee-visible calculation, exact run approval, agent-executed payout, and per-recipient reconciliation.

Success for the owner: a cutoff that takes one review and one approval instead of one bank transfer per person, with every amount traceable to the work behind it. Success for the developer: knowing before payday what they will receive and why, and seeing when it landed.

The hackathon build (Nov 2026) is the current evidence of the product, not its boundary: fixture data on the review screens, a real Stellar Testnet payment rail through Noir, real Velo client collections, and wallet sign-in for owner and developer views.

## Positioning

The owner decides how much and to whom; the agent decides whether and when. Snapp Autopilot runs deterministic eligibility rules (approval, recipient and amount binding, schedule, escrow, policy) and then Jev, a decision model that reads the client's feedback and can only hold a payout back, never approve one. Payment execution goes through the official Noir SDK against Noir's Testnet contracts, with the transaction identity written to a local journal before broadcast so nothing is ever paid twice. A neighbouring payroll or bulk-disbursement tool prepares files; it does not make an accountable, logged agent decision per item and prove it on chain.

Established alternatives for the company path exist (bank bulk-upload facilities, payroll suites with bank-file export); Snapp's difference is the traceability from work and client feedback to an exact, owner-approved, individually reconciled payout.

## Operating Context

- Cutoffs are semi-monthly, Philippine time. Amounts are in PHP for the company; the hackathon demonstrates the rail in Stellar Testnet XLM. There is no exchange-rate relation between the two and none may be implied.
- Work context lives in Proyekto: projects, tasks, time references, deliverable versions, client comments and acceptance, invoices. Integration method is unverified; nothing imports from Proyekto yet.
- Payment roles are separate keys and separate people: owner approves and funds, agent authorizes within the owner's policy, recipient claims with their own key. The agent key never enters a browser.
- The agent runs from an operator shell (`npm run noir -- autopilot`). The web app reads a published copy of the journal (`data/runs/*.json`) and shows recorded runs; it never signs or moves money.
- Client collections arrive through Velo checkout and signed webhooks, reconciled against Velo's API. Client money and payroll never mix; a paid invoice does not gate wages.
- Hosting: web on Vercel, API on Render free tier (sleeps when idle, state resets on deploy; runs re-seed from the repo, sessions need a new sign-in).

## Capabilities and Constraints

Implemented (Nov 2026):
- Noir CLI: owner-signed manifest consent, device/policy/escrow setup, agent authorization, merchant claim, reconciliation, evidence export; append-only SQLite journal; no replay of any recorded operation.
- Snapp Autopilot: Payment Eligibility Engine plus Jev as Payout Risk & Review Agent; verdicts EXECUTE, DEFER, ESCALATE, all logged with probabilities.
- Velo: checkout creation, signature-verified webhooks, dedupe, status from Velo's API; `GET /api/collections`.
- Wallet sign-in (SEP-10 challenge, Freighter and other Stellar wallets via Stellar Wallets Kit, Noir extension when installed); roles owner, developer, client, visitor from the manifest and collection addresses; owner "Your runs" and developer "Your payments" views.
- Web workspace: overview, cutoff review with hold-to-snap approval, recipient results, payment agent, employee statement, projects, invoices and collections, developers, Testnet proof, settings. Review-workflow screens use labelled fictional data.

Not implemented (target):
- Proyekto connection and imported hours, deliverables, client evaluations.
- Authenticated owner approval of a cutoff run from the web; immutable run snapshots; per-item execution reservations beyond the single-item experiment.
- Employee discrepancy channel with history; adjustments with reasons.
- Company bank path: supported bank-file export and per-recipient bank result import. No bank UI or OTP automation, ever.
- Browser-side signing for owner approve and recipient claim (designed in `docs/WALLET_AUTH.md`, step 4).
- Multi-tenant organisations, email/password accounts, Mainnet.

Hard constraints:
- Testnet only; no real funds anywhere in this codebase.
- No secret, admin token or "pay" control in the browser.
- The agent cannot set wages, change recipients or amounts, or approve hours; Jev can only make a payout stricter.
- Status vocabulary stays exact: authorization is not receipt; claim is receipt on Testnet; neither is a bank credit or PHP settlement. Velo rows are "client collection", never payroll.
- Milestones are evidence bundles, not the unit of hourly pay. Client acceptance never automatically withholds hours-based wages.

Terminology: cutoff, pay run, item, approval (owner), authorization (agent), claim (recipient), collection (client via Velo), journal, evidence, Autopilot, Payment Eligibility Engine, Payout Risk & Review Agent (Jev).

## Brand Commitments

Snapp brand v0.2 (`SNAPP_BRAND.md`) is binding until Prodigitality decides otherwise: Ink/Volt/Ultraviolet palette, Sora/Geist/Geist Mono, Slip S logo, tempo-based motion, the "two hands" colour rule (agent and human actions coloured distinctly), status vocabulary and tone (crisp, exact, calm-fast, quietly playful; never hype or "crypto bro"). Tagline: Pay fast, in a snap. Name: Snapp; subtitle: Agentic Work Verification & Payment Orchestration. Company approval is pending, so everything stays in tokens (`apps/web/src/theme/tokens.ts`) and the `SnappLogo` component.

## Evidence on Hand

- Real Stellar Testnet transactions, all confirmed with decoded contract events, listed with Stellar Expert links in `README.md` (Testnet proof) and shown on `/app/proof`: owner setup, agent authorization (Nov 6 `92713462…`, Nov 7 `f8023afa…`), merchant claim, and Velo collections (`fe057622…`, `3d267c97…`, `7b9f79c6…`).
- Live Jev verdicts on three review texts (accepted → EXECUTE, open revision → DEFER, dispute → ESCALATE) with probabilities, in the committed evidence at `data/runs/*.json` and `apps/web/public/evidence/`.
- Live site https://snapp-prodigitality.vercel.app and API https://snapp-server.onrender.com; pitch deck in `deck/`.
- Fictional sample data only on review screens (people, hours, PHP amounts); no real company, payroll or client data exists in the repo and none may be shown as real.
- No testimonials, customers, benchmarks or pricing exist. Do not invent them.

## Product Principles

1. The owner's judgment stays manual; software prepares, explains and executes, it never grades people or sets pay.
2. One exact approval, then accountable execution: every payout traces to approved hours, terms and work, and every action by the agent is logged with its reason.
3. Separate hands, separate keys: owner, agent and recipient each sign their own step; the browser never holds a key.
4. Never overstate settlement: show authorization, claim and collection as distinct states; Testnet is labelled as Testnet.
5. Transparency for the person being paid: they see their own calculation and result, on a phone, before and after payday.

## Accessibility & Inclusion

WCAG 2.1 AA is the target for text and controls. The developer statement and payment views are mobile-first: developers mostly check pay on phones. Automated checks (Nov 7) passed 360/768/1280 px in both themes with no horizontal scroll and named controls; a manual keyboard and touch pass and a contrast audit remain open (see `docs/DESIGN.md` checklist).
