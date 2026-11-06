// Snapp hackathon deck builder.
// Run: node build.js   (needs python3 + Pillow for the tilted screenshot frames)
const pptxgen = require("pptxgenjs");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const A = path.join(__dirname, "assets");
const LOGOS = path.join(__dirname, "..", "docs", "deck-assets", "logos");
const ICONS = path.join(__dirname, "..", "node_modules", "lucide-react", "dist", "esm", "icons");
fs.mkdirSync(A, { recursive: true });

// ---------- brand tokens (SNAPP_BRAND.md) ----------
const C = {
  ink950: "0A0A0F", ink900: "12121A", ink800: "1A1A25", ink700: "2A2A38", ink600: "3A3A4C",
  ink500: "5C5C70", ink400: "8A8A9E", ink300: "B4B4C4", paper: "F6F6F2",
  volt: "D4FF3F", uv500: "6E56FF", uv400: "8F7BFF", uv300: "B7A8FF",
  teal: "1FC7A2", amber: "FFB020", red: "FF5468",
};
const DISPLAY = "Sora";
const BODY = "Sora";
const MONO = "IBM Plex Mono"; // stand-in for Geist Mono (not installed here)

const W = 13.333, H = 7.5, M = 0.7;
const TOTAL = 11;
const EVENT = "VELO x NOIR AGENTIC PAYMENT HACKATHON";

// ---------- asset helpers ----------
const iconCache = {};
async function icon(name, color, key = "") {
  const out = path.join(A, `icon-${name}-${color}${key}.png`);
  if (iconCache[out]) return out;
  let src = fs.readFileSync(path.join(ICONS, `${name}.mjs`), "utf8");
  const re = src.match(/export \{ default \} from '\.\/([^']+)\.mjs'/); // alias file
  if (re) src = fs.readFileSync(path.join(ICONS, `${re[1]}.mjs`), "utf8");
  const m = src.match(/\n  node:\s*(\[[\s\S]*?\n  \])/) || src.match(/\n  node:\s*(\[\[.*\]\])\n/);
  if (!m) throw new Error("icon parse failed: " + name);
  const nodes = new Function("return " + m[1])();
  const body = nodes
    .map(([tag, attrs]) => {
      const a = Object.entries(attrs).filter(([k]) => k !== "key").map(([k, v]) => `${k}="${v}"`).join(" ");
      return `<${tag} ${a}/>`;
    })
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="384" height="384" fill="none" stroke="#${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
  await sharp(Buffer.from(svg)).png().toFile(out);
  iconCache[out] = true;
  return out;
}

// Echo rings: concentric 1px circles at ~7% opacity (static background texture)
function rings(cx, cy, n = 9, step = 130) {
  let s = "";
  for (let i = 1; i <= n; i++) s += `<circle cx="${cx}" cy="${cy}" r="${i * step}" fill="none" stroke="#F6F6F2" stroke-opacity="0.07" stroke-width="2"/>`;
  return s;
}
// Slip arcs supergraphic: top arc ink-700, release arc Volt, butt caps, logo ratio 7:9
function arcs(scale, tx, ty) {
  return `<g transform="translate(${tx} ${ty}) scale(${scale})" fill="none" stroke-width="7" stroke-linecap="butt">
    <path d="M9 -27A9 9 0 1 0 0 -18" stroke="#2A2A38"/>
    <path d="M4 -18A9 9 0 1 1 -5 -9" stroke="#D4FF3F"/></g>`;
}
// Transient line: flat, one sharp spike, quick decay
function transient(y, x0, x1, spikeX) {
  const d = `M${x0} ${y} L${spikeX} ${y} L${spikeX + 16} ${y - 150} L${spikeX + 46} ${y + 70} L${spikeX + 78} ${y - 34} L${spikeX + 110} ${y + 14} L${spikeX + 150} ${y - 5} L${spikeX + 200} ${y} L${x1} ${y}`;
  return `<path d="${d}" fill="none" stroke="#8A8A9E" stroke-opacity="0.55" stroke-width="3"/>`;
}
async function bg(name, inner) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="2000" height="1125" viewBox="0 0 2000 1125"><rect width="2000" height="1125" fill="#0A0A0F"/>${inner}</svg>`;
  const out = path.join(A, `bg-${name}.png`);
  await sharp(Buffer.from(svg)).png().toFile(out);
  return out;
}
// Wordmark (exact SnappLogo geometry). paper letters, release arc volt.
async function wordmark(color, release, name) {
  const ox = 9, gap = 4;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-4 -40 224 58" width="1344" height="348" fill="none" stroke="#${color}" stroke-width="7">
    <path d="M${ox + 9} -27A9 9 0 1 0 ${ox} -18"/>
    <path stroke="#${release}" d="M${ox + gap} -18A9 9 0 1 1 ${ox + gap - 9} -9"/>
    <path d="M37 0V-39.5M37 -23A13 13 0 0 1 63 -23V0M114 -39.5V0M129 -39.5V17.5M180 -39.5V17.5"/>
    <circle cx="96" cy="-18" r="18"/><circle cx="147" cy="-18" r="18"/><circle cx="198" cy="-18" r="18"/></svg>`;
  const out = path.join(A, `wordmark-${name}.png`);
  await sharp(Buffer.from(svg)).png().toFile(out);
  return out;
}
async function slipMark(name) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-13 -40 30 44" width="600" height="880" fill="none" stroke-width="7">
    <path d="M9 -27A9 9 0 1 0 0 -18" stroke="#F6F6F2"/><path d="M4 -18A9 9 0 1 1 -5 -9" stroke="#D4FF3F"/></svg>`;
  const out = path.join(A, `mark-${name}.png`);
  await sharp(Buffer.from(svg)).png().toFile(out);
  return out;
}
// Flat screenshot placeholder, then tilted into 3D with Pillow
async function placeholder(id, caption, dir = "right") {
  const w = 1500, h = 900;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.07"/><stop offset="0.5" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
    <rect width="${w}" height="${h}" rx="30" fill="#12121A"/>
    <rect width="${w}" height="76" rx="30" fill="#1A1A25"/><rect y="40" width="${w}" height="36" fill="#1A1A25"/>
    <circle cx="48" cy="38" r="9" fill="#3A3A4C"/><circle cx="82" cy="38" r="9" fill="#3A3A4C"/><circle cx="116" cy="38" r="9" fill="#3A3A4C"/>
    <rect x="60" y="130" width="400" height="26" rx="6" fill="#1A1A25"/>
    <rect x="60" y="190" width="400" height="120" rx="14" fill="#1A1A25"/><rect x="500" y="190" width="400" height="120" rx="14" fill="#1A1A25"/><rect x="940" y="190" width="500" height="120" rx="14" fill="#1A1A25"/>
    <rect x="60" y="680" width="1380" height="26" rx="6" fill="#1A1A25"/><rect x="60" y="730" width="1380" height="26" rx="6" fill="#1A1A25"/><rect x="60" y="780" width="1380" height="26" rx="6" fill="#1A1A25"/>
    <text x="750" y="490" text-anchor="middle" font-family="Sora" font-weight="700" font-size="190" fill="#2A2A38">${id}</text>
    <text x="750" y="580" text-anchor="middle" font-family="IBM Plex Mono" font-size="32" letter-spacing="4" fill="#8A8A9E">SCREENSHOT PLACEHOLDER</text>
    <text x="750" y="634" text-anchor="middle" font-family="Sora" font-size="38" fill="#F6F6F2">${caption}</text>
    <rect width="${w}" height="${h}" rx="30" fill="url(#g)"/></svg>`;
  const flat = path.join(A, `flat-${id}.png`);
  const out = path.join(A, `tilt-${id}.png`);
  await sharp(Buffer.from(svg)).png().toFile(flat);
  execFileSync("python3", ["-I", path.join(__dirname, "tilt.py"), flat, out, dir]);
  const meta = await sharp(out).metadata();
  return { file: out, ratio: meta.width / meta.height };
}

// ---------- pptx helpers ----------
const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";
pres.author = "Snapp team";
pres.title = "Snapp: Pay fast, in a snap";
pres.company = "Prodigitality";

function chrome(slide, n, stage) {
  if (stage) slide.addText(stage, { x: M, y: 0.48, w: 6, h: 0.3, fontFace: MONO, fontSize: 12, bold: true, charSpacing: 3, color: C.ink400, margin: 0 });
  slide.addText(EVENT, { x: M, y: 6.93, w: 8, h: 0.3, fontFace: MONO, fontSize: 11, charSpacing: 1, color: C.ink400, margin: 0 });
  slide.addText(`${String(n).padStart(2, "0")} / ${TOTAL}`, { x: W - M - 2, y: 6.93, w: 2, h: 0.3, fontFace: MONO, fontSize: 12, color: C.ink400, align: "right", margin: 0 });
}
function title(slide, text, opts = {}) {
  slide.addText(text, { x: M, y: opts.y ?? 0.95, w: opts.w ?? W - 2 * M, h: opts.h ?? 0.95, fontFace: DISPLAY, bold: true, fontSize: opts.size ?? 44, color: C.paper, valign: "top", margin: 0, fit: "none" });
}
function sub(slide, text, y = 1.95) {
  slide.addText(text, { x: M, y, w: 11.5, h: 0.45, fontFace: BODY, fontSize: 20, color: C.ink400, margin: 0 });
}
async function circleIcon(slide, cx, cy, d, name, iconColor, fill, opts = {}) {
  slide.addShape(pres.shapes.OVAL, { x: cx - d / 2, y: cy - d / 2, w: d, h: d, fill: { color: fill, transparency: opts.transparency ?? 0 }, line: { color: fill, width: 0, transparency: 100 } });
  const s = d * 0.46;
  slide.addImage({ path: await icon(name, iconColor), x: cx - s / 2, y: cy - s / 2, w: s, h: s, transparency: opts.imgTransparency ?? 0 });
}
async function bareIcon(slide, cx, cy, s, name, color, transparency = 0) {
  slide.addImage({ path: await icon(name, color), x: cx - s / 2, y: cy - s / 2, w: s, h: s, transparency });
}
function tile(slide, x, y, w, h, fill = C.ink900) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, fill: { color: fill }, line: { color: fill, width: 0, transparency: 100 }, rectRadius: 0.12 });
}
function chip(slide, text, x, y, w, color = C.amber) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h: 0.32, fill: { color: C.ink800 }, line: { color: C.ink800, width: 0, transparency: 100 }, rectRadius: 0.16 });
  slide.addText(text, { x, y, w, h: 0.32, fontFace: MONO, bold: true, fontSize: 11, charSpacing: 2, color, align: "center", valign: "middle", margin: 0 });
}
function hair(slide, x1, y1, x2, y2, color = C.ink600, opts = {}) {
  slide.addShape(pres.shapes.LINE, { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1), line: { color, width: opts.width ?? 1.5, dashType: opts.dash, endArrowType: opts.arrow } });
}

// ---------- build ----------
(async () => {
  const wmOnInk = await wordmark(C.paper, C.volt, "ink");
  const mark = await slipMark("ink");
  const bgCover = await bg("cover", rings(560, 700, 10, 120) + arcs(26, 1560, 620));
  const bgProblem = await bg("problem", rings(1750, 300, 9, 140) + transient(1010, 0, 2000, 1040));
  const bgIdea = await bg("idea", rings(1000, 1125, 9, 150));
  const bgHands = await bg("hands", rings(1000, 560, 8, 150));
  const bgProduct = await bg("product", rings(300, 1125, 9, 140));
  const bgFit = await bg("fit", rings(1000, 560, 9, 140));
  const bgAgent = await bg("agent", rings(100, 150, 9, 150));
  const bgNoir = await bg("noir", rings(1900, 1125, 9, 140));
  const bgVelo = await bg("velo", rings(250, 250, 8, 150));
  const bgSafe = await bg("safe", rings(1800, 560, 8, 150));
  const bgNext = await bg("next", rings(300, 900, 7, 140) + arcs(18, 1700, 800));

  const phA = await placeholder("A", "Owner cutoff review screen", "right");
  const phB = await placeholder("B", "Stellar Expert: authorize tx", "right");
  const phC = await placeholder("C", "Stellar Expert: claim tx", "left");
  const phD = await placeholder("D", "Velo checkout screen", "right");
  const phE = await placeholder("E", "Stellar Expert: Velo tx", "left");

  // ===== 01 Cover =====
  {
    const s = pres.addSlide(); s.background = { path: bgCover };
    s.addImage({ path: wmOnInk, x: M, y: 0.6, w: 2.3, h: 2.3 * 58 / 224 });
    s.addText([{ text: "Pay fast,", options: { breakLine: true } }, { text: "in a snap." }], { x: M, y: 2.15, w: 8.5, h: 2.6, fontFace: DISPLAY, bold: true, fontSize: 84, color: C.paper, margin: 0, valign: "top", lineSpacingMultiple: 0.95 });
    s.addText("Agentic work verification and payment orchestration", { x: M, y: 4.95, w: 11, h: 0.5, fontFace: BODY, fontSize: 22, color: C.ink300, margin: 0 });
    s.addText(EVENT, { x: M, y: 5.85, w: 9, h: 0.32, fontFace: MONO, fontSize: 12, charSpacing: 1, color: C.ink400, valign: "middle", margin: 0 });
    s.addText("Joshua Mistal (Lead)    Juan Carlos Gan    Aidan Tiu    Daniel Cosare", { x: M, y: 6.6, w: 11, h: 0.3, fontFace: MONO, fontSize: 12, color: C.ink400, margin: 0 });
    s.addNotes("Open on the tagline. Snapp is a pay-run layer for a small services company: verified work in, an exact owner-approved payout out. Everything today runs on Stellar Testnet. Team: Joshua Mistal (lead), Juan Carlos Gan, Aidan Tiu, Daniel Cosare.");
  }

  // ===== 02 Problem =====
  {
    const s = pres.addSlide(); s.background = { path: bgProblem }; chrome(s, 2, "THE PAIN");
    title(s, "One transfer\nat a time.", { size: 54, h: 1.9, w: 6.2 });
    s.addText("2", { x: M, y: 3.25, w: 1.2, h: 1.3, fontFace: DISPLAY, bold: true, fontSize: 88, color: C.paper, margin: 0, valign: "top" });
    s.addText("cutoffs a month", { x: M, y: 4.8, w: 2.6, h: 0.35, fontFace: BODY, fontSize: 16, color: C.ink400, margin: 0 });
    s.addText("1", { x: 3.5, y: 3.25, w: 1.2, h: 1.3, fontFace: DISPLAY, bold: true, fontSize: 88, color: C.volt, margin: 0, valign: "top" });
    s.addText("transfer per employee", { x: 3.5, y: 4.8, w: 3.0, h: 0.35, fontFace: BODY, fontSize: 16, color: C.ink400, margin: 0 });
    s.addText([
      { text: "Owner re-types every account and amount", options: { bullet: true, breakLine: true } },
      { text: "Employees can't check their pay", options: { bullet: true } },
    ], { x: M, y: 5.55, w: 6.2, h: 0.95, fontFace: BODY, fontSize: 18, color: C.paper, margin: 0, paraSpaceAfter: 6, valign: "top" });
    // diagram rows: owner -> bank -> employee, repeated
    const xs = [7.5, 9.6, 11.7];
    const ys = [1.7, 3.1, 4.5];
    for (let r = 0; r < 3; r++) {
      const dim = r === 2 ? 55 : 0;
      await circleIcon(s, xs[0], ys[r], 1.0, "user", C.volt, C.ink800, { imgTransparency: dim, transparency: dim });
      await bareIcon(s, (xs[0] + xs[1]) / 2, ys[r], 0.4, "arrow-right", C.ink500, dim);
      await circleIcon(s, xs[1], ys[r], 1.0, "landmark", C.ink300, C.ink800, { imgTransparency: dim, transparency: dim });
      await bareIcon(s, (xs[1] + xs[2]) / 2, ys[r], 0.4, "arrow-right", C.ink500, dim);
      await circleIcon(s, xs[2], ys[r], 1.0, "user", C.paper, C.ink800, { imgTransparency: dim, transparency: dim });
    }
    s.addText("x N employees", { x: 9.0, y: 5.4, w: 3.4, h: 0.4, fontFace: MONO, fontSize: 16, color: C.ink400, align: "right", margin: 0 });
    s.addNotes("The owner reviews hours for two cutoffs a month: the 1st to 15th and the 16th to month end. Then he opens the bank and sends one transfer per employee: copy the account, copy the amount, authorize, repeat. Employees get no clear breakdown to check what they received against hours and rates.");
  }

  // ===== 03 The idea =====
  {
    const s = pres.addSlide(); s.background = { path: bgIdea }; chrome(s, 3, "THE IDEA");
    title(s, "Prepare. Review. Snap. Settle.");
    sub(s, "The checking is thorough. The release is instant.");
    const cx = [0, 1, 2, 3].map((i) => M + 11.933 * (i + 0.5) / 4);
    const cy = 3.9, d = 1.5;
    const steps = [
      { n: "01/", name: "Prepare", tag: "AGENT", tagC: C.uv400, ic: "circle-dashed", icC: C.paper, fill: C.uv500 },
      { n: "02/", name: "Review", tag: "OWNER", tagC: C.ink400, ic: "eye", icC: C.paper, fill: C.ink800 },
      { n: "03/", name: "Snap", tag: "OWNER", tagC: C.volt, ic: "lock", icC: C.ink950, fill: C.volt },
      { n: "04/", name: "Settle", tag: "PER RECIPIENT", tagC: C.teal, ic: "check-check", icC: C.ink950, fill: C.teal },
    ];
    for (let i = 0; i < 4; i++) {
      const st = steps[i];
      s.addText(st.n, { x: cx[i] - 1.2, y: 2.75, w: 2.4, h: 0.35, fontFace: MONO, bold: true, fontSize: 16, color: C.ink400, align: "center", margin: 0 });
      await circleIcon(s, cx[i], cy, d, st.ic, st.icC, st.fill);
      s.addText(st.name, { x: cx[i] - 1.4, y: 4.9, w: 2.8, h: 0.55, fontFace: DISPLAY, bold: true, fontSize: 28, color: C.paper, align: "center", margin: 0 });
      s.addText(st.tag, { x: cx[i] - 1.4, y: 5.45, w: 2.8, h: 0.3, fontFace: MONO, bold: true, fontSize: 12, charSpacing: 2, color: st.tagC, align: "center", margin: 0 });
    }
    // tempo ticks between steps; the Review->Snap run is split by a slip step
    for (let i = 0; i < 3; i++) {
      const x0 = cx[i] + d / 2 + 0.18, x1 = cx[i + 1] - d / 2 - 0.18;
      const n = 7, gapX = (x1 - x0) / (n - 1);
      for (let k = 0; k < n; k++) {
        let y = cy - 0.09;
        if (i === 1 && k >= 4) y += 0.09; // slip step
        if (i === 1 && k === 3) continue;
        s.addShape(pres.shapes.RECTANGLE, { x: x0 + k * gapX, y, w: 0.03, h: 0.18, fill: { color: C.ink500 }, line: { color: C.ink500, width: 0, transparency: 100 } });
      }
    }
    s.addText([{ text: "tick, tick, ", options: { color: C.ink400 } }, { text: "SNAP", options: { color: C.volt, bold: true } }], { x: M, y: 6.2, w: 6, h: 0.5, fontFace: DISPLAY, fontSize: 26, margin: 0 });
    s.addNotes("The whole product in four stages. 01 Prepare: the agent sorts the cutoff and flags problems. 02 Review: the owner reviews hours manually. 03 Snap: the owner approves one locked pay-run version. 04 Settle: each recipient is executed and reconciled on its own. Speed comes from preparation.");
  }

  // ===== 04 Two hands =====
  {
    const s = pres.addSlide(); s.background = { path: bgHands }; chrome(s, 4, "AGENTIC PAYMENTS FIT");
    title(s, "Agent prepares. Owner releases.", { size: 44 });
    const pw = 5.5, py = 2.2, ph = 3.95;
    const lx = M, rx = W - M - pw;
    tile(s, lx, py, pw, ph); tile(s, rx, py, pw, ph);
    const panels = [
      { x: lx, tag: "AGENT", tagC: C.uv400, fill: C.uv500, big: "bot", bigC: C.paper, cap: "Flags the problems.", mini: [["list-checks", "Sorts"], ["flag", "Flags"], ["file-check", "Checks"]], miniC: C.uv300 },
      { x: rx, tag: "OWNER", tagC: C.volt, fill: C.volt, big: "user", bigC: C.ink950, cap: "Approves exact amounts.", mini: [["lock", "Locks"], ["signature", "Signs"], ["badge-check", "Approves"]], miniC: C.paper },
    ];
    for (const p of panels) {
      s.addText(p.tag, { x: p.x + 0.4, y: py + 0.3, w: 3, h: 0.3, fontFace: MONO, bold: true, fontSize: 13, charSpacing: 3, color: p.tagC, margin: 0 });
      await circleIcon(s, p.x + pw / 2, py + 1.45, 1.4, p.big, p.bigC, p.fill);
      s.addText(p.cap, { x: p.x + 0.3, y: py + 2.35, w: pw - 0.6, h: 0.5, fontFace: DISPLAY, bold: true, fontSize: 24, color: C.paper, align: "center", margin: 0 });
      for (let k = 0; k < 3; k++) {
        const mx = p.x + pw / 2 + (k - 1) * 1.5;
        await bareIcon(s, mx, py + 3.2, 0.4, p.mini[k][0], p.miniC);
        s.addText(p.mini[k][1], { x: mx - 0.7, y: py + 3.43, w: 1.4, h: 0.3, fontFace: MONO, fontSize: 12, color: C.ink400, align: "center", margin: 0 });
      }
    }
    // slip divider between the two hands
    const mx = W / 2;
    hair(s, mx - 0.06, py + 0.2, mx - 0.06, py + 1.85); hair(s, mx + 0.06, py + 2.1, mx + 0.06, py + ph - 0.2);
    s.addText("The agent never sets wages or changes recipients.", { x: M, y: 6.3, w: 11, h: 0.4, fontFace: BODY, fontSize: 18, color: C.ink300, margin: 0 });
    s.addNotes("This is the agentic fit. Color shows whose hand moved it: violet is the agent, volt is the human. The owner decides how much and to whom by signing an exact manifest. The agent decides whether and when that approved item executes. It cannot change the recipient, the amount, or the wage.");
  }

  // ===== 05 Product =====
  {
    const s = pres.addSlide(); s.background = { path: bgProduct }; chrome(s, 5, "THE PRODUCT");
    title(s, "Every hour, traced to its work.");
    const items = [["clock", "Hours"], ["file-check", "Evidence"], ["flag", "Flags"]];
    for (let i = 0; i < 3; i++) {
      const y = 2.9 + i * 1.3;
      await circleIcon(s, M + 0.45, y, 0.9, items[i][0], i === 2 ? C.amber : C.paper, C.ink800);
      s.addText(items[i][1], { x: M + 1.2, y: y - 0.3, w: 3, h: 0.6, fontFace: DISPLAY, bold: true, fontSize: 28, color: C.paper, valign: "middle", margin: 0 });
    }
    const fw = 7.7, fh = fw / phA.ratio;
    s.addImage({ path: phA.file, x: W - M - fw + 0.3, y: 1.95, w: fw, h: fh });
    s.addNotes("Screenshot slot A: the owner cutoff review screen. Drop the capture over the placeholder. The point to make: one view per employee and project, with submitted versus approved hours, the work evidence behind each number, and flags where something needs the owner's eyes. Client feedback is context for the owner's review. It does not replace it.");
  }

  // ===== 06 How it fits =====
  {
    const s = pres.addSlide(); s.background = { path: bgFit }; chrome(s, 6, "TECHNICAL EXECUTION");
    title(s, "Works beside Proyekto.");
    const cy = 4.35;
    // Proyekto placeholder tile
    tile(s, M, cy - 0.9, 2.5, 1.8);
    s.addText("PROYEKTO", { x: M, y: cy - 0.25, w: 2.5, h: 0.4, fontFace: MONO, bold: true, fontSize: 16, charSpacing: 3, color: C.ink400, align: "center", margin: 0 });
    s.addText("logo placeholder", { x: M, y: cy + 0.15, w: 2.5, h: 0.3, fontFace: MONO, fontSize: 11, color: C.ink500, align: "center", margin: 0 });
    hair(s, M + 2.5, cy, 4.15, cy, C.ink500, { dash: "dash", arrow: "triangle" });
    s.addText("PENDING", { x: M + 2.45, y: cy - 0.5, w: 1.0, h: 0.3, fontFace: MONO, bold: true, fontSize: 11, color: C.amber, align: "center", margin: 0 });
    // Snapp tile
    tile(s, 4.2, cy - 1.1, 2.7, 2.2, C.ink800);
    s.addImage({ path: wmOnInk, x: 4.55, y: cy - 0.3, w: 2.0, h: 2.0 * 58 / 224 });
    // lanes
    const laneY = [cy - 1.45, cy + 1.45];
    hair(s, 6.9, cy, 7.45, cy, C.ink500);
    hair(s, 7.45, laneY[0], 7.45, laneY[1], C.ink500);
    hair(s, 7.45, laneY[0], 8.0, laneY[0], C.ink500, { arrow: "triangle" });
    hair(s, 7.45, laneY[1], 8.0, laneY[1], C.ink500, { arrow: "triangle" });
    tile(s, 8.0, laneY[0] - 0.8, 2.3, 1.6); tile(s, 8.0, laneY[1] - 0.8, 2.3, 1.6);
    s.addImage({ path: path.join(LOGOS, "noir-logo-mark.png"), x: 8.35, y: laneY[0] - 0.55, w: 0.7 * 512 / 539, h: 0.7 });
    s.addText("Noir", { x: 9.15, y: laneY[0] - 0.55, w: 1.1, h: 0.7, fontFace: DISPLAY, bold: true, fontSize: 24, color: C.paper, valign: "middle", margin: 0 });
    s.addText("PAYOUTS", { x: 8.0, y: laneY[0] + 0.3, w: 2.3, h: 0.3, fontFace: MONO, bold: true, fontSize: 12, charSpacing: 2, color: C.uv400, align: "center", margin: 0 });
    s.addImage({ path: path.join(LOGOS, "velo-logo-dark.png"), x: 8.3, y: laneY[1] - 0.65, w: 1.7, h: 1.7 * 190 / 612 });
    s.addText("COLLECTIONS", { x: 8.0, y: laneY[1] + 0.3, w: 2.3, h: 0.3, fontFace: MONO, bold: true, fontSize: 12, charSpacing: 2, color: C.ink300, align: "center", margin: 0 });
    // Stellar base
    hair(s, 10.3, laneY[0], 10.9, laneY[0], C.ink500); hair(s, 10.3, laneY[1], 10.9, laneY[1], C.ink500);
    hair(s, 10.9, laneY[0], 10.9, laneY[1], C.ink500);
    tile(s, 10.9, cy - 0.8, 1.75, 1.6, C.ink800);
    s.addImage({ path: path.join(LOGOS, "stellar-logo-white.png"), x: 11.05, y: cy - 0.2, w: 1.45, h: 1.45 * 1560 / 6231 });
    s.addNotes("Snapp sits beside Proyekto, which already holds the projects, documents and invoices. We do not rebuild it. Payouts run through Noir. Client collections run through Velo. The two never call each other: a client payment does not fund escrow and does not decide whether an employee is paid. Both settle on Stellar Testnet. The Proyekto link is still pending verification.");
  }

  // ===== 07 Agent verdicts =====
  {
    const s = pres.addSlide(); s.background = { path: bgAgent }; chrome(s, 7, "AGENTIC PAYMENTS FIT");
    title(s, "Execute, defer or escalate.");
    sub(s, "Jev can hold a payout back but cannot approve one.");
    const tw = 2.55, gap = 0.57, ty = 2.7, th = 1.9;
    const steps = [
      ["shield-check", C.paper, C.ink800, "Eligibility rules", "DETERMINISTIC"],
      ["sparkles", C.paper, C.uv500, "Jev review", "AI, STRICTER ONLY"],
      ["send", C.paper, C.ink800, "Execute", "NOIR SDK"],
      ["scroll-text", C.paper, C.ink800, "Audit log", "EVERY VERDICT"],
    ];
    for (let i = 0; i < 4; i++) {
      const x = M + i * (tw + gap);
      tile(s, x, ty, tw, th);
      await circleIcon(s, x + 0.65, ty + 0.75, 0.85, steps[i][0], steps[i][1], steps[i][2]);
      s.addText(steps[i][3], { x: x + 0.3, y: ty + 1.15, w: tw - 0.5, h: 0.4, fontFace: DISPLAY, bold: true, fontSize: 19, color: C.paper, margin: 0 });
      s.addText(steps[i][4], { x: x + 0.3, y: ty + 1.5, w: tw - 0.5, h: 0.25, fontFace: MONO, fontSize: 11, charSpacing: 1, color: i === 1 ? C.uv400 : C.ink400, margin: 0 });
      if (i < 3) await bareIcon(s, x + tw + gap / 2, ty + th / 2, 0.35, "arrow-right", C.ink500);
    }
    const verdicts = [["EXECUTE", C.uv300, "check"], ["DEFER", C.amber, "clock"], ["ESCALATE", C.red, "message-circle-warning"]];
    for (let i = 0; i < 3; i++) {
      const x = M + i * 2.45, y = 5.15;
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: 2.25, h: 0.7, fill: { color: C.ink800 }, line: { color: C.ink800, width: 0, transparency: 100 }, rectRadius: 0.12 });
      await bareIcon(s, x + 0.4, y + 0.35, 0.34, verdicts[i][2], verdicts[i][1]);
      s.addText(verdicts[i][0], { x: x + 0.75, y, w: 1.4, h: 0.7, fontFace: MONO, bold: true, fontSize: 15, charSpacing: 2, color: verdicts[i][1], valign: "middle", margin: 0 });
    }
    const stats = [["0.90", "routine threshold"], ["0.10", "concern threshold"]];
    for (let i = 0; i < 2; i++) {
      const x = 8.4 + i * 2.25;
      s.addText(stats[i][0], { x, y: 4.95, w: 2.2, h: 0.75, fontFace: MONO, bold: true, fontSize: 40, color: C.paper, margin: 0 });
      s.addText(stats[i][1], { x, y: 5.7, w: 2.2, h: 0.3, fontFace: BODY, fontSize: 13, color: C.ink400, margin: 0 });
    }
    s.addText("Thresholds are untuned starting points.", { x: M, y: 6.3, w: 9, h: 0.3, fontFace: BODY, fontSize: 13, color: C.ink400, margin: 0 });
    s.addNotes("The agent decides whether and when an owner-approved item executes. Step one is deterministic eligibility: approval valid, recipient and amount match the signed manifest, payout date reached, funds and policy agree on chain. Step two is Jev, an AI review of the deliverable and client feedback. Jev can only make the outcome stricter. The verdicts are execute, defer when it is not yet time, and escalate to a human when something looks wrong. Every verdict is logged. The thresholds are untuned starting points. Say so if asked.");
  }

  // ===== 08 Noir on Stellar =====
  {
    const s = pres.addSlide(); s.background = { path: bgNoir }; chrome(s, 8, "TECHNICAL EXECUTION");
    s.addImage({ path: path.join(LOGOS, "noir-logo-mark.png"), x: W - M - 0.62, y: 0.35, w: 0.62 * 512 / 539, h: 0.62 });
    title(s, "One approval, one payment.");
    const nodes = [
      ["user", C.paper, C.ink800, "registerDevice", "OWNER"],
      ["wallet", C.paper, C.ink800, "fundEscrow", "OWNER"],
      ["signature", C.paper, C.uv500, "authorize", "AGENT"],
      ["arrow-down-to-line", C.ink950, C.teal, "claim", "MERCHANT"],
    ];
    const cx = [0, 1, 2, 3].map((i) => M + 0.4 + i * 3.0);
    for (let i = 0; i < 4; i++) {
      await circleIcon(s, cx[i], 2.45, 0.7, nodes[i][0], nodes[i][1], nodes[i][2]);
      s.addText(nodes[i][3], { x: cx[i] + 0.5, y: 2.2, w: 1.7, h: 0.3, fontFace: MONO, bold: true, fontSize: 14, color: C.paper, margin: 0 });
      s.addText(nodes[i][4], { x: cx[i] + 0.5, y: 2.5, w: 1.7, h: 0.3, fontFace: MONO, fontSize: 11, charSpacing: 2, color: i === 2 ? C.uv400 : i === 3 ? C.teal : C.ink400, margin: 0 });
      if (i < 3) await bareIcon(s, cx[i] + 2.45, 2.45, 0.3, "arrow-right", C.ink500);
    }
    const fw = 5.0;
    const fh = fw / phB.ratio;
    s.addImage({ path: phB.file, x: 0.55, y: 3.55, w: fw, h: fh });
    s.addImage({ path: phC.file, x: 6.9, y: 3.55, w: fw, h: fw / phC.ratio });
    chip(s, "PENDING LIVE PROOF", M, 3.4, 2.3); chip(s, "PENDING LIVE PROOF", 7.05, 3.4, 2.3);
    s.addNotes("Hand off to the live demo here. Screenshot slots B and C: the Stellar Expert pages for the authorization and the merchant claim, which are separate transactions. Until the live run succeeds, the chips stay on and we say so: nothing on this slide is claimed as proven. Flow: the owner signs setup, the agent checks then authorizes, the merchant signs the claim. Authorization is not receipt.");
  }

  // ===== 09 Velo proof =====
  {
    const s = pres.addSlide(); s.background = { path: bgVelo }; chrome(s, 9, "TECHNICAL EXECUTION");
    s.addImage({ path: path.join(LOGOS, "velo-logo-dark.png"), x: W - M - 1.9, y: 0.3, w: 1.9, h: 1.9 * 190 / 612 });
    title(s, "A real on-chain payment.");
    s.addText([{ text: "0.5", options: { fontSize: 110, color: C.paper, bold: true } }, { text: "  XLM", options: { fontSize: 40, color: C.ink400 } }], { x: M, y: 2.3, w: 6, h: 1.9, fontFace: MONO, margin: 0, valign: "top" });
    s.addText("tx fe057622…82d44045", { x: M, y: 4.5, w: 5.5, h: 0.4, fontFace: MONO, fontSize: 16, color: C.ink300, margin: 0 });
    s.addText("Client collection, separate from payroll.", { x: M, y: 5.15, w: 5.5, h: 0.4, fontFace: BODY, fontSize: 18, color: C.ink400, margin: 0 });
    const fw = 5.2;
    s.addImage({ path: phD.file, x: 6.0, y: 1.95, w: fw, h: fw / phD.ratio, transparency: 40 });
    s.addImage({ path: phE.file, x: 7.4, y: 3.5, w: fw, h: fw / phE.ratio });
    s.addNotes("The one number we can prove today. A client paid 0.5 XLM on Testnet through a Velo checkout our server created, and Velo reported it as paid. This is a client collection, separate from the agent payroll payment, and it does not fund Noir escrow. Screenshot slots D and E: the Velo checkout page and the Stellar Expert page for this transaction. Webhooks are signature-verified and deduplicated, and status is confirmed by retrieving the intent from Velo.");
  }

  // ===== 10 Guardrails =====
  {
    const s = pres.addSlide(); s.background = { path: bgSafe }; chrome(s, 10, "REAL-WORLD POTENTIAL");
    title(s, "Four guardrails.");
    const g = [["lock", "Exact approval"], ["list-checks", "Allowlist and limits"], ["ban", "No replay"], ["scroll-text", "Full audit trail"]];
    for (let i = 0; i < 4; i++) {
      const x = M + (i % 2) * 3.85, y = 2.2 + Math.floor(i / 2) * 2.2;
      tile(s, x, y, 3.55, 1.95);
      await circleIcon(s, x + 0.75, y + 0.7, 0.85, g[i][0], C.paper, C.ink800);
      s.addText(g[i][1], { x: x + 0.35, y: y + 1.25, w: 3.0, h: 0.5, fontFace: DISPLAY, bold: true, fontSize: 21, color: C.paper, margin: 0 });
    }
    s.addText("33", { x: 9.2, y: 2.2, w: 3.4, h: 1.2, fontFace: MONO, bold: true, fontSize: 80, color: C.paper, margin: 0, valign: "top" });
    s.addText("tests passing", { x: 9.2, y: 3.4, w: 3.4, h: 0.35, fontFace: BODY, fontSize: 16, color: C.ink400, margin: 0 });
    s.addText("0", { x: 9.2, y: 4.4, w: 3.4, h: 1.2, fontFace: MONO, bold: true, fontSize: 80, color: C.volt, margin: 0, valign: "top" });
    s.addText("replays of a recorded payment", { x: 9.2, y: 5.6, w: 3.6, h: 0.35, fontFace: BODY, fontSize: 16, color: C.ink400, margin: 0 });
    s.addNotes("Real-world potential rests on safety. One: approval binds an exact run, recipient set and amounts, and any change needs a new approval. Two: app-side allowlist and per-item and run limits, because the contracts only enforce asset, per-payment cap and expiry. Three: a transaction is written to a local journal before broadcast and a recorded operation is never replayed, so an uncertain outcome gets reconciled before any new attempt. Four: every agent verdict is logged. The 33 is the workspace test count from the repo checklist.");
  }

  // ===== 11 What's next =====
  {
    const s = pres.addSlide(); s.background = { path: bgNext }; chrome(s, 11, "WHAT'S NEXT");
    title(s, "From prototype to payday.");
    const road = [["git-branch", "Proyekto link"], ["file-text", "Employee statements"], ["landmark", "Bank bulk file"]];
    for (let i = 0; i < 3; i++) {
      const y = 2.5 + i * 1.0;
      s.addText(`0${i + 1}/`, { x: M, y: y - 0.2, w: 0.8, h: 0.4, fontFace: MONO, bold: true, fontSize: 16, color: C.ink400, valign: "middle", margin: 0 });
      await circleIcon(s, M + 1.5, y, 0.7, road[i][0], C.paper, C.ink800);
      s.addText(road[i][1], { x: M + 2.1, y: y - 0.25, w: 5, h: 0.5, fontFace: DISPLAY, bold: true, fontSize: 24, color: C.paper, valign: "middle", margin: 0 });
    }
    s.addImage({ path: wmOnInk, x: M, y: 5.45, w: 2.2, h: 2.2 * 58 / 224 });
    s.addText("Prepare. Release. Snapp.", { x: M + 2.6, y: 5.45, w: 6, h: 0.55, fontFace: DISPLAY, bold: true, fontSize: 24, color: C.paper, valign: "middle", margin: 0 });
    s.addText("github.com/JoshuaHM-p4/Snapp", { x: M, y: 6.4, w: 5.5, h: 0.3, fontFace: MONO, fontSize: 13, color: C.ink300, margin: 0 });
    s.addText("Live site: TBD     Demo video: TBD", { x: 6.2, y: 6.4, w: 4.4, h: 0.3, fontFace: MONO, fontSize: 13, color: C.ink400, margin: 0 });
    s.addNotes("Next: link Proyekto for cutoff preparation, give each employee a private pay statement with a discrepancy channel, then add a bank bulk-disbursement file for the company's real payout path. Noir and Velo stay as the hackathon rails on Testnet. Close on the line: Prepare. Release. Snapp. Fill in the live site and demo video links before submission.");
  }

  await pres.writeFile({ fileName: path.join(__dirname, "Snapp-Hackathon-Deck.pptx") });
  console.log("written");
})().catch((e) => { console.error(e); process.exit(1); });
