# Session handoff: branded web (for Daniel)

Paste everything below the line into a new Claude Code session at the repo root.

---

You're picking up the Snapp web frontend from JC's session on Nov 6–7, 2026. The hackathon submission is due **Nov 7, 2026, 12:00 PM PHT**, so get the branch reviewed and deployed first, then do polish.

**Read first:** `CLAUDE.md` → `AGENTS.md` → `SETUP.md` → `PRD.md` → `SNAPP_BRAND.md` → `docs/DESIGN.md` → `docs/FRONTEND_HANDOFF.md` (Joshua's backend handoff) → `docs/DECISIONS.md` (latest entry).

## Where things are
- Branch: **`feat/branded-web`**, pushed to origin and rebased on `origin/main` (it includes Joshua's `Collection`/`NoirEvidence` types and `apps/web/public/evidence/snapp-demo-001.json`). It is **not merged to `main` yet**. Vercel deploys `main` (Root Directory `apps/web`, `VITE_API_BASE` already set), so the live site still shows the old grey starter until this merges.
- Snapp brand v0.2 is adopted in the product at JC's direction. Prodigitality company approval is still pending.

## What the branch contains
- **Landing page `/`** (`apps/web/src/site/Landing.tsx` + `landing.css`, prefix `ld-`), aimed at judges and forced to the Ink theme. Sections: hero with a giant Slip S supergraphic and a working **hold-to-snap sample run**, then "Payday, one transfer at a time", then "Tick, tick, snap." (a sticky 01–04 stage scene), then the two-hands colour fields, "Every peso, traced", the real Testnet proof board, built-with logos, honest scope, and a footer with the team.
- **Workspace `/app/*`** (`apps/web/src/app/`), with Ink/Paper toggle, the TESTNET chip always visible, and role-grouped sidebar nav:
  - Overview: counts link to the agent page and collections.
  - Cutoff review + snap approval: `pages/CutoffReview.tsx`, logic in `cutoffRun.ts` with tests.
  - Recipient results.
  - Payment agent: pipeline, Jev decision cards and the 5 operations, all read from the evidence snapshot.
  - My statement (employee, own data only).
  - Projects and project detail (eligibility preview via the API).
  - Invoices & client collections (`/api/collections`, shared `Collection` type, no create button).
  - Developers, Testnet proof, Settings (theme, opt-in sound, connection status).
  - Branded `/checkout/success|cancel` and 404 pages. Old routes (`/projects`, `/invoices`, `/agent`, …) redirect.
- **Foundation:**
  - `src/theme/tokens.ts`: the single token source (`dev/libraryTokens.ts` re-exports it) and `ThemeProvider.tsx`.
  - `src/styles/base.css`: buttons `s-btn`, chips `s-chip`, panels, tables, stage index, slip divider, echo rings, hatch.
  - `src/app/ui.tsx`: `StatusChip` per the brand status vocabulary, `Php`, `ProofLink`, `StageIndex`, `ApiState` (Render cold-start loading copy).
  - `HoldToSnap.tsx` (750 ms hold, keyboard opens a confirm dialog, sound only when opted in).
  - `money.ts`: integer centavos/stroops, no floats, tested.
  - `evidence.ts`: snapshot loader.
- Data honesty: workflow screens use labelled fictional data (`app/fixtures.ts`). Real transactions come only from `app/proof.ts` and the evidence snapshot. There are no developer notes in visible copy.

## Verified in JC's session
- Final code: web typecheck passed and the production build passed. Web tests passed 61/61 in two runs. Under heavy machine load (dev server, headless Chrome, OneDrive), the design-library suites flake: worker start-up timeouts, or one `DesignLibrary.test.tsx` case failing that then passes 3/3 on its own. Treat CI on a clean runner as the source of truth.
- Headless Chrome via a CDP script, landing at 1440×900 and 390×844: no horizontal page scroll. The hold-to-snap works (early release approves nothing; a full hold gives "Approved · v3 · locked").
- Spot-checked: workspace Overview and Payment agent at 1440.

## Not verified / still open, in priority order
1. **Review, open a PR, merge to `main`, then confirm the live Vercel URL.** On the live site, check that `/app/invoices` shows the real Render collections. Render sleeps, so expect ~30 s on first load. Also check that `/app/agent` loads `/evidence/snapp-demo-001.json`.
2. **Visual QA not done** for Cutoff review, Statement, Results, Proof, Invoices and Settings at 360/768/1280, in both Ink and Paper. On Cutoff review at 390 px, table headers measured wider than the viewport; that's probably inside its own scroll wrapper or the hidden header of the stacked-card layout, but confirm it. Also do keyboard-only passes on the snap dialog and the nav drawer.
3. **README:** the "Screenshots" section is TBD (capture Payment agent, Invoices, Cutoff review and the landing hero). The demo video link is TBD on both the README and the landing page; add it to the landing footer when it exists.
4. `npm test` at the root: the `packages/agent` Noir tests fail on Windows/OneDrive with `PRIVATE_JOURNAL_DIRECTORY_REQUIRED`, because POSIX `0700` permissions can't be set there. This predates the branch; run on Linux/CI to confirm. Web `testTimeout` was raised to 20 s for the slow design-library suites.
5. Docs: update `docs/PAGES.md` and `docs/UI.md` route/component tables to the new `/app/*` routes, and tick what's real in `docs/CHECKLIST.md`. Only mark what you actually verified.
6. Not built: client evaluation view (`/client/projects/:id`), bank-file export, auth/RBAC. Cutoff/statement approvals are local previews only and must stay labelled that way.
7. Nice to have: OG image (`og-image.png`, wordmark on Ink), favicon set, landing team avatars.

## Needs a human decision (don't do these on your own)
- **`three-roles.md` is tracked in git and contains the owner/agent/merchant Testnet secret keys and an `ADMIN_API_KEY`.** Rotate them and untrack the file; the founder decides how to handle history.
- `README.md` in JC's local checkout was overwritten with an older copy (live URLs turned back into "TBD", deck section removed), probably by OneDrive sync. JC kept that copy in a local `git stash` and did not commit it. The README on the branch is the correct current one; ignore the stash unless JC asks.
- Founder approval of the brand adoption itself.

## Rules (from AGENTS.md and the brand guide)
- No secrets, tokens or pay buttons in the browser. Noir rows are "authorization"/"claim", never "salary paid". Velo rows are "client collection", never employee pay.
- Keep "This preview never sends payments" and the Testnet notices. Teal means money actually arrived and nothing else. One Volt primary action per view. Money never animates.
- Validate with `npm run typecheck`, `npm test`, `npm run build`. Report blockers honestly; don't report green checks you didn't see.
- Windows note: in Git Bash, set `MSYS_NO_PATHCONV=1` when passing URL paths like `/` to scripts.
