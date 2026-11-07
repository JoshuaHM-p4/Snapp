import { useId, useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Download } from "lucide-react";
import "./report-parts.css";

/**
 * Report building blocks shared by the workspace and the dev design library.
 * Rules carried over from the library: scales start at zero, numbers stay
 * visible without hovering, tooltips open on hover, focus or tap and close on
 * Escape, and report colours never stand in for payment settlement.
 */
export function DataTip({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span
      className="lib-data-tip"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onKeyDown={(event) => {
        if (event.key === "Escape") setOpen(false);
      }}
    >
      <button
        type="button"
        className="lib-data-target"
        aria-describedby={open ? id : undefined}
        onClick={() => setOpen(true)}
      >
        {children}
      </button>
      {open && (
        <span id={id} className="lib-data-tooltip" role="tooltip">
          {label}
        </span>
      )}
    </span>
  );
}

export type HoursBarRow = {
  label: string;
  submitted: number;
  approved: number;
};

/** Submitted (light) and approved (solid) hours per row. Numbers stay visible; bars are decoration. */
export function HoursBars({
  rows,
  scale,
  format,
}: {
  rows: HoursBarRow[];
  scale: number;
  format: (hours: number) => string;
}) {
  return (
    <ul className="lib-project-bars">
      {rows.map((row) => (
        <li key={row.label}>
          <span>{row.label}</span>
          <strong>
            <DataTip
              label={`${row.label}: ${format(row.approved)} approved of ${format(row.submitted)} submitted.`}
            >
              {format(row.approved)} / {format(row.submitted)}
            </DataTip>
          </strong>
          <span className="lib-project-track" aria-hidden="true">
            <i
              className="is-submitted"
              style={{
                transform: `scaleX(${Math.min(1, row.submitted / scale)})`,
              }}
            />
            <i
              className="is-approved"
              style={{
                transform: `scaleX(${Math.min(1, row.approved / scale)})`,
              }}
            />
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Shared tooltip state for SVG charts: one open tip per chart, Escape and blur close it. */
function useChartTip() {
  const [tip, setTip] = useState<string | null>(null);
  const id = useId();
  return {
    frame: {
      onMouseLeave: () => setTip(null),
      onBlur: (event: React.FocusEvent<HTMLElement>) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setTip(null);
      },
      onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => {
        if (event.key === "Escape") setTip(null);
      },
    },
    point: (text: string) => ({
      tabIndex: 0,
      role: "img" as const,
      "aria-label": text,
      "aria-describedby": tip === text ? id : undefined,
      onMouseEnter: () => setTip(text),
      onFocus: () => setTip(text),
      onClick: () => setTip(text),
    }),
    bubble: tip && (
      <span
        className="lib-data-tooltip rp-chart-tooltip"
        role="tooltip"
        id={id}
      >
        {tip}
      </span>
    ),
  };
}

/** Round a maximum up to a readable axis top (1, 2, 2.5, 5 × 10ⁿ). */
export function niceMax(value: number) {
  if (value <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((m) => m * power >= value)!;
  return step * power;
}

export type SeriesPoint = {
  /** Short axis label, e.g. "Nov 7". */
  label: string;
  value: number;
  /** Optional lighter comparison value drawn behind (e.g. submitted behind approved). */
  ghost?: number;
  /** Extra sentence for the tooltip. */
  note?: string;
};

/** Small trend line for a scorecard. Zero baseline; every point is focusable. */
export function Sparkline({
  points,
  label,
  format,
}: {
  points: SeriesPoint[];
  label: string;
  format: (value: number) => string;
}) {
  const tip = useChartTip();
  const max = Math.max(1, ...points.map((p) => p.value));
  const step = points.length > 1 ? 104 / (points.length - 1) : 0;
  const xy = (i: number, v: number) =>
    [8 + i * step, 44 - (v / max) * 32] as const;
  return (
    <div className="rp-sparkline-wrap" {...tip.frame}>
      <svg
        className="rp-sparkline"
        viewBox="0 0 120 52"
        role="group"
        aria-label={`${label}: ${points.map((p) => `${p.label} ${format(p.value)}`).join(", ")}. Scale starts at zero.`}
      >
        <line x1="8" x2="112" y1="44" y2="44" />
        <polyline
          points={points.map((p, i) => xy(i, p.value).join(",")).join(" ")}
        />
        {points.map((p, i) => {
          const [x, y] = xy(i, p.value);
          return (
            <g
              key={p.label}
              {...tip.point(`${label}, ${p.label}: ${format(p.value)}`)}
            >
              <circle className="rp-hit" cx={x} cy={y} r="10" />
              <circle cx={x} cy={y} r="2.5" />
            </g>
          );
        })}
      </svg>
      {tip.bubble}
    </div>
  );
}

/**
 * Column chart on a zero-based axis. When `ghost` is set it draws behind the
 * value as a lighter bar (submitted behind approved, matching HoursBars).
 */
export function ColumnChart({
  points,
  label,
  format,
  valueLabel,
  ghostLabel,
}: {
  points: SeriesPoint[];
  label: string;
  format: (value: number) => string;
  valueLabel: string;
  ghostLabel?: string;
}) {
  const tip = useChartTip();
  const top = niceMax(
    Math.max(0, ...points.map((p) => Math.max(p.value, p.ghost ?? 0))),
  );
  const slot = 56;
  const left = 64; // room for labels like "10.0 h"
  const width = Math.max(320, left + points.length * slot + 12);
  const base = 180;
  const h = 150;
  const y = (v: number) => base - (v / top) * h;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * top);
  return (
    <div className="rp-column" {...tip.frame}>
      <div
        className="rp-scroll"
        tabIndex={0}
        role="region"
        aria-label={`${label}; scrolls sideways on narrow screens`}
      >
        <svg
          className="rp-chart"
          viewBox={`0 0 ${width} 214`}
          style={{
            minWidth: Math.min(width, 520),
            maxWidth: Math.max(width, 640),
          }}
          role="group"
          aria-label={`${label}: ${points
            .map(
              (p) =>
                `${p.label} ${format(p.value)}${p.ghost !== undefined ? ` of ${format(p.ghost)}` : ""}`,
            )
            .join("; ")}. Scale starts at zero.`}
        >
          {ticks.map((t) => (
            <g key={t} className="rp-grid">
              <line x1={left} x2={width - 4} y1={y(t)} y2={y(t)} />
              <text x={left - 8} y={y(t) + 4} textAnchor="end">
                {format(t)}
              </text>
            </g>
          ))}
          {points.map((p, i) => {
            const cx = left + i * slot + slot / 2;
            const text =
              `${p.label}: ${format(p.value)} ${valueLabel}` +
              (p.ghost !== undefined && ghostLabel
                ? `, ${format(p.ghost)} ${ghostLabel}`
                : "") +
              (p.note ? `. ${p.note}` : "");
            return (
              <g key={p.label} className="rp-col" {...tip.point(text)}>
                <rect
                  className="rp-hit"
                  x={cx - slot / 2}
                  y={base - h - 8}
                  width={slot}
                  height={h + 40}
                />
                {p.ghost !== undefined && (
                  <rect
                    className="rp-col-ghost"
                    x={cx - 16}
                    y={y(p.ghost)}
                    width="32"
                    height={base - y(p.ghost)}
                    rx="3"
                  />
                )}
                <rect
                  className="rp-col-value"
                  x={cx - 16}
                  y={y(p.value)}
                  width="32"
                  height={base - y(p.value)}
                  rx="3"
                />
                {p.note && (
                  <circle
                    className="rp-col-flag"
                    cx={cx + 16}
                    cy={y(Math.max(p.value, p.ghost ?? 0)) - 6}
                    r="3.5"
                  />
                )}
                <text
                  className="rp-col-label"
                  x={cx}
                  y="204"
                  textAnchor="middle"
                >
                  {p.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      {tip.bubble}
      <div className="rp-legend" aria-hidden="true">
        <span>
          <i className="rp-swatch-value" /> {valueLabel}
        </span>
        {ghostLabel && (
          <span>
            <i className="rp-swatch-ghost" /> {ghostLabel}
          </span>
        )}
        {points.some((p) => p.note) && (
          <span>
            <i className="rp-swatch-flag" /> Has a note
          </span>
        )}
      </div>
    </div>
  );
}

export type OutcomeTone = "positive" | "negative" | "pending";
export type OutcomeItem = {
  label: string;
  tone: OutcomeTone;
  count: number;
  description: string;
};

/** Segmented share bar plus labelled counts. For data-check outcomes, never payment status. */
export function OutcomeSummary({
  items,
  label,
}: {
  items: OutcomeItem[];
  label: string;
}) {
  const total = items.reduce((n, item) => n + item.count, 0);
  return (
    <div className="rp-outcomes" role="group" aria-label={label}>
      <div className="rp-outcome-bar" aria-hidden="true">
        {items.map((item) => (
          <span
            key={item.label}
            className={`rp-tone-${item.tone}`}
            style={{ width: `${total ? (item.count / total) * 100 : 0}%` }}
          />
        ))}
      </div>
      <ul>
        {items.map((item) => (
          <li key={item.label} className={`rp-tone-${item.tone}`}>
            <DataTip label={item.description}>
              <i aria-hidden="true" />
              <strong>{item.count}</strong> {item.label}
            </DataTip>
          </li>
        ))}
      </ul>
    </div>
  );
}

export type ReportColumn<T> = {
  key: string;
  label: string;
  /** Sort value and default CSV cell. Omit to make the column unsortable. */
  value?: (row: T) => string | number;
  render: (row: T) => ReactNode;
  csv?: (row: T) => string;
  numeric?: boolean;
};

const csvCell = (value: string) =>
  /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

export function toCsv<T>(rows: T[], columns: ReportColumn<T>[]) {
  const cell = (c: ReportColumn<T>, r: T) =>
    c.csv ? c.csv(r) : String(c.value?.(r) ?? "");
  return [
    columns.map((c) => csvCell(c.label)),
    ...rows.map((r) => columns.map((c) => csvCell(cell(c, r)))),
  ]
    .map((line) => line.join(","))
    .join("\r\n");
}

/** Sortable report table. The first column is the row header. CSV exports rows in the current order. */
export function ReportTable<T>({
  rows,
  columns,
  rowKey,
  caption,
  csvName,
  initialSort,
  empty = "Nothing to show yet.",
}: {
  rows: T[];
  columns: ReportColumn<T>[];
  rowKey: (row: T) => string;
  caption: string;
  csvName?: string;
  initialSort?: { key: string; descending?: boolean };
  empty?: string;
}) {
  const [sort, setSort] = useState(initialSort ?? null);
  const ordered = useMemo(() => {
    const col = columns.find((c) => c.key === sort?.key);
    if (!col?.value) return rows;
    const get = col.value;
    return [...rows].sort((a, b) => {
      const x = get(a);
      const y = get(b);
      const d =
        typeof x === "number" && typeof y === "number"
          ? x - y
          : String(x).localeCompare(String(y));
      return sort!.descending ? -d : d;
    });
  }, [rows, columns, sort]);

  const download = () => {
    const url = URL.createObjectURL(
      // BOM so Excel reads UTF-8 (otherwise "−" and "·" show as mojibake).
      new Blob(["﻿" + toCsv(ordered, columns)], {
        type: "text/csv;charset=utf-8",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = csvName!;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  return (
    <div className="rp-table">
      {csvName && (
        <div className="rp-table-tools">
          <p className="s-note" role="status">
            {rows.length} {rows.length === 1 ? "row" : "rows"}
            {sort &&
              ` · sorted by ${columns.find((c) => c.key === sort.key)?.label.toLowerCase()}`}
          </p>
          <button
            type="button"
            className="s-btn s-btn--sm"
            onClick={download}
            disabled={!rows.length}
          >
            <Download size={14} aria-hidden="true" /> Export CSV
          </button>
        </div>
      )}
      <div
        className="s-table-wrap"
        tabIndex={0}
        role="region"
        aria-label={`${caption}; scrolls sideways on narrow screens`}
      >
        <table className="s-table">
          <caption className="s-visually-hidden">{caption}</caption>
          <thead>
            <tr>
              {columns.map((c) => {
                const active = sort?.key === c.key;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    className={c.numeric ? "num" : undefined}
                    aria-sort={
                      active
                        ? sort!.descending
                          ? "descending"
                          : "ascending"
                        : undefined
                    }
                  >
                    {c.value ? (
                      <button
                        type="button"
                        className="rp-sort"
                        onClick={() =>
                          setSort({
                            key: c.key,
                            descending: active ? !sort!.descending : false,
                          })
                        }
                      >
                        {c.label}
                        {active &&
                          (sort!.descending ? (
                            <ArrowDown size={13} aria-hidden="true" />
                          ) : (
                            <ArrowUp size={13} aria-hidden="true" />
                          ))}
                      </button>
                    ) : (
                      c.label
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {ordered.map((r) => (
              <tr key={rowKey(r)}>
                {columns.map((c, i) =>
                  i === 0 ? (
                    <th key={c.key} scope="row" className="rp-row-head">
                      {c.render(r)}
                    </th>
                  ) : (
                    <td key={c.key} className={c.numeric ? "num" : undefined}>
                      {c.render(r)}
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <p className="s-empty rp-table-empty">{empty}</p>}
      </div>
    </div>
  );
}

export type GanttRow = {
  id: string;
  label: string;
  sub?: string;
  /** ISO date; omit when no start is recorded (drawn as a due-date marker). */
  start?: string;
  end: string;
  status: ReactNode;
  /** Planned work draws as an outline; anything already moving draws solid. */
  planned?: boolean;
  /** Visible text describing the window, e.g. "Nov 6 → Nov 7". */
  window: string;
};

const DAY = 86_400_000;
const dayOf = (iso: string) => Date.parse(`${iso.slice(0, 10)}T00:00:00Z`);
const shortDate = (ms: number) =>
  new Date(ms).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

/** Milestone timeline. Plain HTML so labels wrap and the list reads in order without the chart. */
export function GanttChart({
  rows,
  label,
  today,
}: {
  rows: GanttRow[];
  label: string;
  today?: string;
}) {
  if (!rows.length)
    return <p className="s-empty">No milestones to place on a timeline.</p>;
  const starts = rows.map((r) => dayOf(r.start ?? r.end));
  const ends = rows.map((r) => dayOf(r.end));
  const min = Math.min(...starts) - DAY;
  const max = Math.max(...ends) + 2 * DAY; // the end day itself is inclusive
  const span = max - min;
  const pct = (ms: number) => `${((ms - min) / span) * 100}%`;
  const days = Math.round(span / DAY);
  const every = days <= 10 ? 1 : days <= 31 ? 7 : 14;
  const ticks = Array.from(
    { length: Math.floor(days / every) + 1 },
    (_, i) => min + i * every * DAY,
  ).filter((t) => t < max);
  const now = today ? dayOf(today) : NaN;
  const showToday = now >= min && now <= max;

  return (
    <div className="rp-gantt" role="group" aria-label={label}>
      <div className="rp-gantt-axis" aria-hidden="true">
        <span />
        <div className="rp-gantt-scale">
          {ticks.map((t) => (
            <span key={t} style={{ left: pct(t) }}>
              {shortDate(t)}
            </span>
          ))}
        </div>
      </div>
      <ol className="rp-gantt-rows">
        {rows.map((r) => {
          const end = dayOf(r.end) + DAY;
          const start = r.start ? dayOf(r.start) : null;
          return (
            <li key={r.id}>
              <div className="rp-gantt-label">
                <strong>{r.label}</strong>
                {r.sub && <span className="s-row-sub">{r.sub}</span>}
                <span className="rp-gantt-meta">
                  {r.status}
                  <span className="s-mono s-note">{r.window}</span>
                </span>
              </div>
              <div className="rp-gantt-track" aria-hidden="true">
                {ticks.map((t) => (
                  <i
                    key={t}
                    className="rp-gantt-tick"
                    style={{ left: pct(t) }}
                  />
                ))}
                {showToday && (
                  <i
                    className="rp-gantt-today"
                    style={{ left: pct(now + DAY / 2) }}
                  />
                )}
                {start === null ? (
                  <b
                    className="rp-gantt-marker"
                    style={{ left: pct(end - DAY / 2) }}
                  />
                ) : (
                  <b
                    className={`rp-gantt-bar${r.planned ? " is-planned" : ""}`}
                    style={{
                      left: pct(start),
                      width: `calc(${pct(end)} - ${pct(start)})`,
                    }}
                  />
                )}
              </div>
            </li>
          );
        })}
      </ol>
      <div className="rp-legend" aria-hidden="true">
        <span>
          <i className="rp-swatch-value" /> In progress or done
        </span>
        <span>
          <i className="rp-swatch-planned" /> Planned
        </span>
        <span>
          <i className="rp-swatch-marker" /> Due date only
        </span>
        {showToday && (
          <span>
            <i className="rp-swatch-today" /> Today
          </span>
        )}
      </div>
    </div>
  );
}

export type DonutSlice = {
  label: string;
  value: number;
  tone: "series" | "ghost" | "attention";
};

/** Share-of-total donut. Counts stay visible in the legend; slices are focusable for the tooltip. */
export function Donut({
  slices,
  label,
  format,
  center,
  centerNote,
}: {
  slices: DonutSlice[];
  label: string;
  format: (value: number) => string;
  center: string;
  centerNote: string;
}) {
  const tip = useChartTip();
  const total = slices.reduce((n, s) => n + s.value, 0);
  const r = 70;
  const circumference = 2 * Math.PI * r;
  let offset = 0;
  const pct = (v: number) =>
    total ? `${((v / total) * 100).toFixed(1)}%` : "0%";
  return (
    <figure className="rp-donut" {...tip.frame}>
      <svg
        viewBox="0 0 180 180"
        role="group"
        aria-label={`${label}: ${slices.map((s) => `${s.label} ${format(s.value)} (${pct(s.value)})`).join("; ")}`}
      >
        <circle className="rp-donut-track" cx="90" cy="90" r={r} />
        {slices
          .filter((s) => s.value > 0)
          .map((s) => {
            const length = total ? (s.value / total) * circumference : 0;
            const el = (
              <circle
                key={s.label}
                className={`rp-donut-slice rp-fill-${s.tone}`}
                cx="90"
                cy="90"
                r={r}
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-offset}
                {...tip.point(
                  `${s.label}: ${format(s.value)} (${pct(s.value)})`,
                )}
              />
            );
            offset += length;
            return el;
          })}
        <text x="90" y="88" textAnchor="middle" className="rp-donut-value">
          {center}
        </text>
        <text x="90" y="108" textAnchor="middle" className="rp-donut-note">
          {centerNote}
        </text>
      </svg>
      {tip.bubble}
      <ul className="rp-donut-legend">
        {slices.map((s) => (
          <li key={s.label}>
            <i className={`rp-bg-${s.tone}`} aria-hidden="true" />
            <span>{s.label}</span>
            <strong>
              {format(s.value)} <small>{pct(s.value)}</small>
            </strong>
          </li>
        ))}
      </ul>
    </figure>
  );
}
