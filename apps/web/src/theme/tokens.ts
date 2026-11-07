/** Snapp brand v0.2 tokens. Single source for product screens, the landing page and /dev/library. */
export const palettes = {
  Ink: [
    ["ink-950", "#0A0A0F"],
    ["ink-900", "#12121A"],
    ["ink-800", "#1A1A25"],
    ["ink-700", "#2A2A38"],
    ["ink-600", "#3A3A4C"],
    ["ink-500", "#5C5C70"],
    ["ink-400", "#8A8A9E"],
    ["ink-300", "#B4B4C4"],
    ["ink-200", "#D9D9E3"],
    ["ink-100", "#EDEDF2"],
    ["paper-50", "#F6F6F2"],
    ["white", "#FFFFFF"],
  ],
  Volt: [
    ["volt-300", "#E6FF8A"],
    ["volt-400", "#D4FF3F"],
    ["volt-500", "#B8E600"],
    ["volt-700", "#5E7500"],
  ],
  Ultraviolet: [
    ["uv-300", "#B7A8FF"],
    ["uv-400", "#8F7BFF"],
    ["uv-500", "#6E56FF"],
    ["uv-600", "#5A3FF0"],
    ["uv-700", "#4328C7"],
  ],
  Semantic: [
    ["teal-400", "#1FC7A2"],
    ["teal-700", "#0A7A63"],
    ["amber-400", "#FFB020"],
    ["amber-700", "#9A5B00"],
    ["red-400", "#FF5468"],
    ["red-700", "#C21F3A"],
  ],
} as const;
export const themes = [
  ["bg", "ink-950", "paper-50", "Page canvas"],
  ["surface", "ink-900", "white", "Cards and panels"],
  ["raised", "ink-800", "ink-100", "Raised surfaces"],
  ["border", "ink-700", "ink-200", "Decorative hairlines"],
  ["text", "paper-50", "ink-950", "Primary text"],
  ["muted", "ink-400", "ink-500", "Secondary text"],
  ["human", "volt-400", "volt-400", "Owner action; Ink text"],
  ["agent", "uv-500", "uv-600", "Agent presence"],
  ["agent-text", "uv-400", "uv-600", "Agent text"],
  ["settled", "teal-400", "teal-700", "Confirmed claim only"],
  ["attention", "amber-400", "amber-700", "Review / unknown"],
  ["stop", "red-400", "red-700", "Failed / rejected"],
  ["focus", "volt-400", "uv-600", "Keyboard focus"],
  ["logo-release", "volt-400", "ink-950", "Release arc"],
  [
    "report-series",
    "uv-300",
    "uv-700",
    "Filtered report data; not payment status",
  ],
  [
    "report-positive",
    "volt-300",
    "volt-700",
    "Passed report data checks; not settled payments",
  ],
  [
    "report-negative",
    "red-400",
    "red-700",
    "Failed report data checks; correction needed",
  ],
] as const;
export const controlThemes = [
  ["ripple", "volt-400", "ink-950", "Logo echo with contrast in both themes"],
  [
    "control-border",
    "ink-400",
    "ink-500",
    "Interactive boundaries; decorative borders stay quiet",
  ],
  [
    "field-progress",
    "ink-400",
    "ink-500",
    "Text length progress; neutral, not payment success",
  ],
  ["selection", "ink-200", "ink-950", "Selected text / date"],
  ["selection-text", "ink-950", "paper-50", "Text on selection"],
] as const;
export const typography = [
  ["display-xl", 72, 72, "Sora", 700, "-0.035em"],
  ["display-l", 56, 60, "Sora", 700, "-0.03em"],
  ["h1", 40, 44, "Sora", 600, "-0.025em"],
  ["h2", 30, 36, "Sora", 600, "-0.02em"],
  ["h3", 22, 28, "Geist", 600, "0"],
  ["h4", 18, 24, "Geist", 600, "0"],
  ["body-l", 18, 28, "Geist", 400, "0"],
  ["body", 16, 24, "Geist", 400, "0"],
  ["body-s", 14, 20, "Geist", 400, "0"],
  ["label", 12, 16, "Geist", 600, "0.08em"],
  ["mono", 14, 20, "Geist Mono", 400, "0"],
  ["amount-xl", 48, 52, "Geist Mono", 500, "0"],
] as const;
export const durations = [
  ["tick", 60, "Press feedback"],
  ["snap", 125, "Release / status"],
  ["beat", 250, "Panel entrance"],
  ["settle", 375, "Echo decay"],
  ["pulse", 500, "Logo sting"],
  ["hold", 750, "Approval hold"],
] as const;
export const easings = [
  ["snap", "cubic-bezier(0.16, 1, 0.3, 1)"],
  ["press", "cubic-bezier(0.5, 0, 0.75, 0)"],
  ["standard", "cubic-bezier(0.2, 0, 0, 1)"],
] as const;
export const spacing = [4, 8, 12, 16, 24, 32, 48, 64, 96];
export const categories = [
  "Overview",
  "Brand",
  "Color",
  "Typography",
  "Layout",
  "Elements",
  "Components",
  "Patterns",
  "Loading",
  "Reports",
  "Motion",
  "Sound",
  "3D studies",
  "Accessibility",
];
export const slug = (s: string) => s.toLowerCase().replaceAll(" ", "-");
export function themeVariables(theme: "dark" | "light") {
  return Object.fromEntries([
    ...Object.values(palettes).flatMap((p) =>
      p.map(([name, value]) => [`--color-${name}`, value]),
    ),
    ...[...themes, ...controlThemes].map(([name, dark, light]) => [
      `--${name}`,
      `var(--color-${theme === "dark" ? dark : light})`,
    ]),
    ...durations.map(([name, value]) => [`--dur-${name}`, `${value}ms`]),
    ...easings.map(([name, value]) => [`--ease-${name}`, value]),
  ]);
}
export const tokenCSS = [
  "/* Snapp brand v0.2 — draft review tokens; not company approval */",
  ":root {",
  ...Object.values(palettes).flatMap((p) =>
    p.map(([n, v]) => `  --color-${n}: ${v};`),
  ),
  ...spacing.map((n) => `  --space-${n}: ${n}px;`),
  ...durations.map(([n, v]) => `  --dur-${n}: ${v}ms;`),
  ...easings.map(([n, v]) => `  --ease-${n}: ${v};`),
  "}",
  ":root {",
  ...typography.flatMap(([n, s, l, f, w, t]) => [
    `  --type-${n}-size: ${s}px;`,
    `  --type-${n}-line: ${l}px;`,
    `  --type-${n}-font: "${f} Variable";`,
    `  --type-${n}-weight: ${w};`,
    `  --type-${n}-tracking: ${t};`,
  ]),
  "  --radius-small: 4px; --radius-control: 8px; --radius-card: 12px; --radius-sheet: 20px; --radius-pill: 999px; --radius-icon: 22%;",
  "  --border-width: 1px; --focus-width: 2px; --focus-offset: 2px; --touch-min: 44px;",
  "  --grid-max: 1280px; --grid-gutter: 24px; --grid-gutter-mobile: 16px; --row-default: 44px; --row-compact: 36px;",
  "  /* Proposed spatial extensions */",
  "  --spatial-perspective: 900px; --spatial-depth: 40px; --spatial-depth-max: 64px; --spatial-tilt: -16deg;",
  "}",
  ...(["dark", "light"] as const).flatMap((theme, i) => [
    `[data-snapp-theme="${theme}"] {`,
    ...[...themes, ...controlThemes].map(
      ([n, d, l]) => `  --${n}: var(--color-${i === 0 ? d : l});`,
    ),
    "}",
  ]),
].join("\n");
