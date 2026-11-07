# Snapp visual design

**Status (2026-11-07):** Snapp brand v0.2 (`SNAPP_BRAND.md`: Ink/Volt/Ultraviolet palette, Sora/Geist/Geist Mono, Slip S logo, tempo-based motion) is **adopted in the web product** at the UI/UX owner's direction (JC), for the hackathon submission. Final Prodigitality company approval is still pending; everything lives in tokens (`apps/web/src/theme/tokens.ts`) and the `SnappLogo` component so a change stays cheap.

Previous status (2026-11-05): deferred by project owner. Neutral grayscale scaffold, now replaced.

**Product name:** Snapp  
**Subtitle:** Agentic Work Verification & Payment Orchestration

**Tagline:** Pay fast, in a snap.

**Positioning:** From verified deliverables to streamlined payouts. One platform for teams, clients, and business owners.

The product name, subtitle, tagline and positioning do not approve a logo, palette, typography or other visual identity.

## Design source of truth
- Official website reference: https://prodigitality.net/services
- UI/UX and frontend owner: [JCarloZ24 (JC)](https://github.com/JCarloZ24)
- Draft all visual decisions as a design proposal; review with founder before merging substantial changes.

## When styling is authorized
1. Extract brand colors (hex), typography and licensed assets from the official identity pack or verified website.
2. Define light/dark usage, accessibility, spacing, radius and shadows; capture token naming in `apps/web/src/index.css` or Tailwind theme.
3. Supply approved logo assets with provenance and correct usage.
4. Create responsive wireframes for the pending cutoff preparation/review, employee statement, exact-run approval, recipient reconciliation, client evaluation and separate Testnet/settings views described below.
5. Approval gate: founder confirms screenshots and mobile behavior.

## Current implementation
- Landing page at `/` (Ink, forced dark): hero with a hold-to-snap sample run, the four stages (01/ Prepare, 02/ Review, 03/ Snap, 04/ Settle), the "two hands" colour rule, employee traceability, real recorded Testnet proof, honest scope, team.
- Workspace under `/app/*` (Ink or Paper, viewer's choice): overview, cutoff review + snap approval, recipient results, payment agent (from the recorded evidence snapshot), employee statement, projects, invoices & Velo collections, developers, Testnet proof, settings. Old scaffold URLs redirect.
- Shared primitives: `apps/web/src/app/ui.tsx` (status chips per the brand status vocabulary, `Php` amounts, `ProofLink`, `StageIndex`, `TestnetBadge`, `ApiState`), `HoldToSnap.tsx`, `money.ts` (integer centavos/stroops), `styles/base.css`.
- All workflow screens use clearly labelled fictional sample data; nothing in the browser can move funds.

## Functional wireframes — target only, all pending
These are layout requirements, not implemented pages or approved visual designs. Current dashboard/project previews remain scaffold previews. Snapp complements Proyekto's existing PM and invoicing; linking/importing references is not implemented or verified.

| Target frame | Reading order and required controls |
|---|---|
| Cutoff preparation | Period (1–15 or 16–end-of-month) → employee/project hours → Proyekto references → actual outputs and client feedback → discrepancies |
| Owner hours review | Applicable hourly/employment or fixed-fee terms → submitted hours → boss's manual judgment/corrections → employee calculation; do not substitute an agent rating |
| Employee statement | Own period/hours/rates → itemized adjustments and total → discrepancy channel → own recipient payment result; never expose colleagues' compensation |
| Client evaluation | Deliverable version/source → comments → revision requests → acceptance identity/time/version; no fabricated objective scores |
| Final run approval | Exact immutable recipient + amount snapshot → owner final release action → approval identity/time; any change requires a fresh approval |
| Recipient reconciliation | Run totals → each recipient's submission/result/evidence → partial failure/unknown explanation → reconcile before retry; no all-green run when one recipient is unresolved |
| Company bank path | Approved snapshot → chosen supported corporate-bank file export → bank's approval process → per-recipient reconciliation; all pending, no bank integration |
| Testnet execution | Owner device/policy setup and pre-funded escrow → approved exact item → agent eligibility check/authorization → separate merchant claim and genuine transaction evidence |

Milestones group evidence; they are not the default payroll payment unit. Client acceptance and invoice collection must not be drawn as universal gates to employee hours-based pay: actual agreement/legal obligations govern. Show optional Velo client collection in a separate lane, never as payroll payout or a funding bridge.

No bank UI/OTP automation, one-OTP promise or production settlement visual may be implied. Keep Noir and Velo demos visibly Stellar Testnet-only. Pending app-side merchant allowlists, cumulative cutoff caps, approved snapshots and at-most-once execution records must not appear as already functioning controls.

## Design acceptance checklist
- [ ] Brand reference/assets approved
- [ ] Typography and tokens documented
- [x] Mobile 360px layout verified (automated, 2026-11-07: all 12 routes and the three milestone views at 360/768/1280 px in Ink and Paper; no horizontal page scroll, no unnamed controls. Open: a few standalone text links are 19–21 px tall, under the 24 px target)
- [ ] Contrast at least WCAG AA for primary text/controls
- [ ] Full keyboard navigation (automated label check passed; manual keyboard/touch pass still open), visible focus state and descriptive labels
- [ ] Page empty/loading/error/success states
- [ ] Founder screenshot approval
