# Snapp Hackathon Deck: Plan

Status: plan only. No slides are built yet.
Sources studied: `PRD.md`, `README.md` (POC concept), `SNAPP_BRAND.md` (design guide).
Event: **Velo x Noir Agentic Payment Hackathon** (from the Builder Handbook).
Pitch format per handbook: **5 minutes with a live demo, then 3 minutes Q&A.** Top 10 pitch Sun, Nov 8, 1:00 PM.
Output when approved: `Snapp-Hackathon-Deck.pptx`, 11 slides, 16:9. About 25 seconds per slide, so slides stay visual and the demo carries the rest.

**Judging criteria the deck is built around** (handbook):

| Criterion | Weight | Where the deck answers it |
|---|---|---|
| Agentic payments fit | 30% | Slides 04, 07: the agent decides whether and when to pay |
| Technical execution | 25% | Slides 06, 08, 09: Velo and Noir on Testnet |
| Innovation | 20% | Slide 03: work-to-payment traceability |
| Real-world potential | 15% | Slides 02, 11: a real small company with a real bottleneck |
| Pitch and demo | 10% | Slides 01, 05: clear story, demo handoff |

---

## 1. The story in one line

**Verified work in, exact owner-approved payout out. Prepare, then release.**

The deck follows the brand rhythm **tick, tick, SNAP** and the stage index **01/ Prepare, 02/ Review, 03/ Snap, 04/ Settle**.

Honesty rules, taken from the PRD and brand guide:
- Say **Testnet** every time money moves. No real money, no payroll claims.
- Noir live authorization and claim are **unverified**. Show their screenshot slots as "pending proof", never as done.
- The only real transaction proof today is the **Velo collection** (0.5 XLM, tx `fe057622…`). Use it as the one hero number.
- No invented stats, no fake receipts, no fake bank screens.

---

## 2. Visual system (from SNAPP_BRAND.md)

| Item | Decision |
|---|---|
| Theme | Ink dark on every slide (signature theme), base `#0A0A0F` |
| Text | Paper `#F6F6F2` headings, Ink-400 `#8A8A9E` secondary |
| Volt `#D4FF3F` | Human hand only: owner, approval, the single highlight per slide |
| Ultraviolet `#8F7BFF` | Agent only |
| Teal `#1FC7A2` | Only for "funds claimed or settled" |
| Fonts | Sora 700 headings, Geist body, Geist Mono for numbers and hashes |
| Corners | 12 px cards, 8 px buttons, hairline `#2A2A38` borders only |
| Proportions | About 60% Ink, 30% neutral surface, 7% Volt, 3% Ultraviolet |

**Background pattern (SVG, rendered to PNG for PowerPoint):**
- **Echo rings:** concentric 1 px circles at 6 to 8% opacity, off-center, on most slides.
- **Slip arc supergraphic:** one large cropped arc from the S, top arc ink-700, bottom arc Volt. **Cover and closing only.**
- **Tempo ticks:** a ruler-style row of short ticks under the stage index, used on the process slides.
- **Transient line:** one 1.5 px line with a single spike, used once on the problem slide.
- Never more than one pattern per slide.

**No colored border lines.** Cards use neutral hairlines or no border at all. Color appears only as fills on icons, numbers, and the one highlighted item.

**Layout rules:** one grid for every slide (12 columns, same margins), left-aligned big heading, stage index label top-left, page number bottom-right. Same positions every slide, no random layouts.

**Text rules:**
- Heading: 3 to 6 words, 44 to 56 pt Sora.
- Subheading: one line, 20 pt.
- Max 3 bullets, each under 8 words. Most slides use icons or numbers instead of bullets.
- No small paragraphs. Detail goes in speaker notes.
- Minimum text size 14 pt.
- Run all copy through the humanizer skill to remove AI-sounding phrasing (see section 6).

**Icons:** Lucide, 1.5 px stroke, drawn as SVG then PNG. Agent icons in Ultraviolet, everything else Paper. Slip mark is the only custom icon.

**Partner logos** (fetched from official sources, saved in `docs/deck-assets/logos/`):

| Logo | File | Source |
|---|---|---|
| Noir | `noir-logo-mark.png` (512 x 539) | noirx402.github.io/noir (official docs site) |
| Velo | `velo-logo-dark.png`, `velo-logo-light.png` (612 x 190) | velo-build.dev (official site) |
| Stellar | `stellar-logo-white.png` (6231 x 1560) | stellar.org/brand-resources, Logo Press Kit 2026 |
| Proyekto | **not fetched** | No official source in the handbook. Placeholder tile until you provide it |

- The full Stellar press kit (black and white, SVG and PDF) is in `docs/deck-assets/stellar-kit/`. Follow stellar.org/brand-policy when placing it: clear space, no recoloring.
- Check each logo on the Ink background before use. The Velo dark/light variants and the Noir mark need a visual check for contrast.
- Show logos in one row on the architecture slide and once next to each integration slide. No bank logos (brand guide says avoid).

---

## 3. Slide-by-slide

### 01. Cover
- **Heading:** Pay fast, in a snap.
- **Sub:** Agentic work verification and payment orchestration
- **Visual:** Snapp wordmark (from `docs/brand/snapp_logo_final_slip_s_v1.svg`), slip arc supergraphic bleeding off the right edge.
- **Small footer:** hackathon name, Testnet chip, team handles.

### 02. The problem
- **Stage label:** the pain
- **Heading:** One transfer at a time.
- **Diagram (icons only):** owner icon → bank icon → employee icon, repeated three times down the slide with a "×N" at the end. Arrow stack, no text inside.
- **Big numbers (real, from PRD):** `2` cutoffs a month (1–15, 16–end). Then `1` transfer per employee, every time.
- **Bullet max 2:** Owner re-types every account and amount. Employees can't check their pay.
- **Pattern:** transient line with one spike under the heading.

### 03. The idea: tick, tick, SNAP
- **Heading:** Prepare. Review. Snap. Settle.
- **Diagram:** four large icons in a row with the stage index `01/ 02/ 03/ 04/` and tempo ticks between them:
  `circle-dashed` (Prepare) → `eye` (Review) → `lock` (Snap, Volt) → `check-check` (Settle, Teal).
- **Sub:** The checking is thorough. The release is instant.
- **Visual:** slip mark small, top-right. Slip divider (broken hairline) between Review and Snap.

### 04. Two hands
- **Heading:** Agent prepares. Owner releases.
- **Diagram:** two columns.
  - Left, Ultraviolet: agent icon, three tiny icons (sort, flag, check).
  - Right, Volt: owner icon, lock icon, approve icon.
  - Center: slip gap between them.
- **Caption line each side (5 words max):** "Flags the problems." / "Approves exact amounts."
- **Callout:** The agent never sets wages or changes recipients.

### 05. The product (screenshot slide)
- **Heading:** One view. Every hour traced.
- **Visual:** large screenshot placeholder, **tilted, 3D stylized** (see section 4 for the frame style).
  - **PLACEHOLDER A:** owner cutoff review screen. Held off for now; screens get dropped in later.
- **Three numbered pins on the screenshot (1, 2, 3)** with 3 short labels beside it: Hours, Evidence, Flags.
- Evidence-stack motif (two offset hairline edges) behind the frame.

### 06. How it fits
- **Heading:** Works beside Proyekto.
- **Diagram (icons and logos only):** `[Proyekto logo]` → `[Snapp slip mark]` → splits to `[Noir logo]` (payouts) and `[Velo logo]` (client collections), both sitting on `[Stellar logo]`.
- Dashed line from Proyekto labeled "integration pending" (honest status).
- Velo and Noir shown as **separate lanes**, no arrow between them.
- **Visual:** simplified version of the README Mermaid diagram, redrawn as icons.

### 07. The agent decides when
- **Heading:** Three verdicts. Zero guesses.
- **Diagram:** a funnel with four icon stages: `Eligibility rules` → `Jev review` (Ultraviolet) → `Execute` → `Audit log`.
  Three exit tags below: **EXECUTE** (Volt), **DEFER** (amber), **ESCALATE** (red).
- **Sub:** Jev can only make a payout stricter, never approve one.
- **Numbers:** `0.90` routine threshold, `0.10` concern threshold (from README; note on slide "untuned starting points").

### 08. Noir on Stellar (screenshot slide)
- **Heading:** Approved once. Paid once.
- **Diagram:** 4-step horizontal chain with Noir logo: `registerDevice` → `fundEscrow` → `authorize` (agent, Ultraviolet) → `claim` (merchant, teal).
- **PLACEHOLDER B:** Stellar Expert Testnet transaction page for the **authorization** tx (tilted 3D frame).
- **PLACEHOLDER C:** Stellar Expert page for the merchant **claim** tx (tilted 3D frame).
- Each placeholder carries a small amber chip: `PENDING LIVE PROOF`. Replace before presenting if the live run succeeds. If it doesn't, keep the chip and say so.

### 09. Client collection (proof slide)
- **Heading:** A real Testnet payment.
- **Hero number:** `0.5 XLM · Testnet` in Geist Mono, amount-xl size (the only real measured figure we have).
- **Visual:** Velo logo + **PLACEHOLDER D:** screenshot of the Velo checkout page, and **PLACEHOLDER E:** Stellar Expert page for tx `fe057622…`.
- **One line:** Separate from payroll. Shows signed webhooks and reconciliation.

### 10. Built to be safe
- **Heading:** Four guardrails.
- **Diagram:** 2×2 grid of icon tiles, one icon and a 3-word label each:
  - `lock` Exact approval
  - `list-checks` Allowlist and limits
  - `ban` No replay
  - `scroll-text` Full audit trail
- **Number strip under the grid (real, from docs):** `33` tests passing, `1` approval per run version.

### 11. What's next
- **Heading:** From Testnet to payday.
- **Diagram:** simple 3-step roadmap with icons: Proyekto link → Employee statements → Bank bulk file.
- **Close:** slip arc supergraphic returns, wordmark, tagline "Prepare. Release. Snapp."
- **Footer:** repo, live site, demo video. Mark `TBD` where they don't exist yet (README says TBD). Team row with 4 handles.

---

## 4. Screenshot placeholders (on hold)

Screenshots are held off for now. Every slot is built as a ready-to-swap placeholder.

**Frame style, tilted 3D stylized:**
- The screenshot sits in a rounded 12 px frame, rotated in perspective: about 12 to 16 degrees around the vertical axis and 4 to 6 degrees tilt, so the right edge recedes.
- A soft Ink shadow beneath and a faint reflection of the Ink background. No colored borders or glow.
- Slide 05 uses one large tilted frame. Slides 08 and 09 use two overlapping tilted frames (the evidence-stack look), the front one sharp, the back one dimmed.
- Built as pre-rendered PNG mockups (SVG perspective transform, rasterized) so it looks identical in PowerPoint, Keynote and PDF. Placeholder art shows the ID and a one-line instruction until the real capture replaces it.

| ID | Slide | What goes there | Source |
|---|---|---|---|
| A | 05 | Owner cutoff review screen | Later: capture the app preview or a mock with sample data |
| B | 08 | Stellar Expert: `authorize` tx | Needs live Noir run |
| C | 08 | Stellar Expert: `claim` tx | Needs live Noir run |
| D | 09 | Velo checkout screen | Later: capture from the running app |
| E | 09 | Stellar Expert: Velo tx `fe057622…` | Public link already in README |
| L-P | 06 | Proyekto logo | You supply |

---

## 5. Build approach (after approval)

1. Draw the background patterns and icons as SVG, rasterize to PNG at 2x.
2. Build the deck with the installed `pptx` skill (pptxgenjs), using one shared layout grid.
3. Put detailed talking points in **speaker notes**, not on slides.
4. Render slides to images and check each one for overflow, alignment, and contrast.
5. Fonts: Sora, Geist, Geist Mono must be installed on the presenting machine, or the deck falls back. I'll embed or export a PDF copy as a backup.

---

## 6. Open items

1. **Humanizer skill:** `npx skills add blader/humanizer` was blocked by the permission classifier (external code). Run it yourself with `! npx skills add blader/humanizer`, or tell me to retry. Until then I hand-edit copy for plain, human phrasing.
2. **Proyekto logo:** no official source given. Send the file, or it stays a placeholder.
3. **Pitch length:** 5 minutes with a live demo. 11 slides works if slides 05 and 08 hand off to the live demo. Say so if you want it cut to 8.
4. **Deck link:** the submission form needs a deck link viewable by anyone (Google Slides, Canva or PDF). I'll also export a PDF.
