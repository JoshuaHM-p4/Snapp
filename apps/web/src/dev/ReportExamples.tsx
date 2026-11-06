import { ReportChartGallery } from "./ReportChartGallery";
import { DataTip } from "../components/ui/ReportParts";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  Download,
  CheckCircle2,
  XCircle,
  Clock3,
} from "lucide-react";
import { parseDate, type DateValue } from "@internationalized/date";
import {
  SnappDateRangePicker,
  SnappSelect,
} from "../components/ui/SnappControls";

const rows = [
  {
    name: "Alex Rivera",
    project: "Website delivery",
    hours: 64,
    amount: 1920000,
    state: "Reviewed",
  },
  {
    name: "Bea Santos",
    project: "Brand assets",
    hours: 52,
    amount: 1560000,
    state: "Needs review",
  },
  {
    name: "Chris Lim",
    project: "Website delivery",
    hours: 48,
    amount: 1440000,
    state: "Reviewed",
  },
  {
    name: "Dani Cruz",
    project: "Client handoff",
    hours: 40,
    amount: 1200000,
    state: "Needs review",
  },
  {
    name: "Eli Reyes",
    project: "Brand assets",
    hours: 56,
    amount: 1680000,
    state: "Reviewed",
  },
  {
    name: "Fran Garcia",
    project: "Client handoff",
    hours: 32,
    amount: 960000,
    state: "Reviewed",
  },
].map((row, index) => ({
  ...row,
  check: [
    "Passed",
    "Needs correction",
    "Passed",
    "Pending",
    "Passed",
    "Passed",
  ][index],
  date: ["2026-11-03", "2026-11-07", "2026-11-12"][index % 3],
}));
const checkOutcomes = [
  {
    label: "Passed",
    tone: "positive",
    Icon: CheckCircle2,
    description:
      "Illustrative completeness check passed. This does not approve hours or payment.",
  },
  {
    label: "Needs correction",
    tone: "negative",
    Icon: XCircle,
    description:
      "Illustrative completeness check failed: supporting evidence is missing. Correct the record before completing review.",
  },
  {
    label: "Pending",
    tone: "pending",
    Icon: Clock3,
    description: "Completeness check is unfinished. No outcome is known yet.",
  },
];
const dates = ["2026-11-03", "2026-11-07", "2026-11-12"];
const initialRange = {
  start: parseDate("2026-11-01"),
  end: parseDate("2026-11-15"),
};
function Sparkline({ values, label }: { values: number[]; label: string }) {
  const max = Math.max(1, ...values);
  const points = values
    .map((value, index) => `${8 + index * 52},${44 - (value / max) * 32}`)
    .join(" ");
  const [active, setActive] = useState<number | null>(null);
  const id = useId();
  return (
    <div
      className="lib-sparkline-wrap"
      onMouseLeave={() => setActive(null)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setActive(null);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") setActive(null);
      }}
    >
      <svg
        className="lib-sparkline"
        viewBox="0 0 120 52"
        role="group"
        aria-label={`${label}, by record date November 3, 7, 12: ${values.join(", ")}. Scale starts at zero.`}
      >
        <line x1="8" x2="112" y1="44" y2="44" />
        <polyline points={points} />
        {values.map((value, index) => (
          <g
            key={index}
            tabIndex={0}
            role="img"
            aria-label={`${label}, ${dates[index]}: ${value}`}
            aria-describedby={active === index ? id : undefined}
            onMouseEnter={() => setActive(index)}
            onFocus={() => setActive(index)}
            onClick={() => setActive(index)}
          >
            <circle
              className="lib-spark-hit"
              cx={8 + index * 52}
              cy={44 - (value / max) * 32}
              r="12"
            />
            <circle cx={8 + index * 52} cy={44 - (value / max) * 32} r="2.5" />
          </g>
        ))}
      </svg>
      {active !== null && (
        <span className="lib-data-tooltip" id={id} role="tooltip">
          {dates[active]} ? {label}: {values[active].toLocaleString("en-PH")}
        </span>
      )}
    </div>
  );
}
const money = (minor: number) =>
  `PHP ${(minor / 100).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
type Sort = "name" | "hours" | "amount";
export function ReportExamples() {
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState<Sort>("name");
  const [descending, setDescending] = useState(false);
  const [page, setPage] = useState(0);
  const [project, setProject] = useState("all");
  const [query, setQuery] = useState("");
  const [range, setRange] = useState<{
    start: DateValue;
    end: DateValue;
  } | null>(initialRange);
  const [appliedRange, setAppliedRange] = useState(initialRange);
  const [rangeError, setRangeError] = useState("");
  const reportBody = useRef<HTMLDivElement>(null);
  const dateInputs = useRef<HTMLDivElement>(null);
  const [chartTip, setChartTip] = useState<number | null>(null);
  const chartTipId = useId();
  function reset() {
    setFilter("all");
    setProject("all");
    setQuery("");
    setPage(0);
    setRange(initialRange);
    setAppliedRange(initialRange);
    setRangeError("");
  }
  const filtered = rows.filter(
    (row) =>
      (filter === "all" || row.state === filter) &&
      (project === "all" || row.project === project) &&
      row.name.toLowerCase().includes(query.trim().toLowerCase()) &&
      row.date >= appliedRange.start.toString() &&
      row.date <= appliedRange.end.toString(),
  );
  const cutoffs = dates.map((date) => ({
    label: `Nov ${Number(date.slice(-2))}`,
    hours: filtered
      .filter((row) => row.date === date)
      .reduce((sum, row) => sum + row.hours, 0),
  }));
  const series = (field: "hours" | "amount" | "count") =>
    dates.map((date) =>
      filtered
        .filter((row) => row.date === date)
        .reduce((sum, row) => sum + (field === "count" ? 1 : row[field]), 0),
    );
  const ordered = [...filtered].sort(
    (a, b) =>
      (sort === "name" ? a.name.localeCompare(b.name) : a[sort] - b[sort]) *
      (descending ? -1 : 1),
  );
  const pageCount = Math.max(1, Math.ceil(ordered.length / 3));
  const visible = ordered.slice(page * 3, page * 3 + 3);
  const dataKey = `${filtered.map((row) => row.name).join(",")}|${sort}|${descending}|${page}`;
  const previousDataKey = useRef(dataKey);
  useEffect(() => {
    if (previousDataKey.current === dataKey) return;
    previousDataKey.current = dataKey;
    if (
      matchMedia("(prefers-reduced-motion: reduce)").matches ||
      reportBody.current?.closest('[data-reduced="true"]')
    )
      return;
    const target = reportBody.current;
    target?.getAnimations?.().forEach((animation) => animation.cancel());
    const animation = target?.animate?.(
      [
        { opacity: 0.65, transform: "translateY(4px)" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      { duration: 250, easing: "cubic-bezier(.16,1,.3,1)" },
    );
    return () => animation?.cancel();
  }, [dataKey]);
  function changeSort(key: Sort) {
    setDescending(key === sort ? !descending : false);
    setSort(key);
    setPage(0);
  }
  function download() {
    const csv = [
      "Employee,Project,Record date,Hours,Proposed PHP,Review state,Data check",
      ...ordered.map(
        (row) =>
          `${row.name},${row.project},${row.date},${row.hours},${(row.amount / 100).toFixed(2)},${row.state},${row.check}`,
      ),
    ].join("\r\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "snapp-fictional-cutoff.csv";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
  return (
    <div className="lib-report">
      <p className="lib-note">
        Fictional records for November 2026. Proposed amounts illustrate the UI;
        they are not approved wages or payment records.
      </p>
      <div className="lib-report-filters">
        <div ref={dateInputs}>
          <SnappDateRangePicker
            label="Report date range"
            value={range}
            onChange={setRange}
            min="2026-11-01"
            max="2026-11-30"
            error={rangeError}
          />
          <div className="lib-demo-toolbar">
            <button
              className="lib-button"
              onClick={() => {
                if (
                  dateInputs.current?.querySelector(
                    "[data-placeholder='true']",
                  ) ||
                  !range ||
                  range.start.compare(range.end) > 0 ||
                  range.start.compare(parseDate("2026-11-01")) < 0 ||
                  range.end.compare(parseDate("2026-11-30")) > 0
                ) {
                  setRangeError(
                    "Choose a complete, ordered range within November 2026.",
                  );
                  return;
                }
                setAppliedRange({
                  start: parseDate(range.start.toString()),
                  end: parseDate(range.end.toString()),
                });
                setRangeError("");
                setPage(0);
              }}
            >
              Apply date range
            </button>
            <button
              className="lib-text-button"
              onClick={() => {
                const next = {
                  start: parseDate("2026-11-16"),
                  end: parseDate("2026-11-30"),
                };
                setRange(next);
                setAppliedRange(next);
                setRangeError("");
                setPage(0);
              }}
            >
              Nov 16-30
            </button>
          </div>
        </div>
        <SnappSelect
          label="Report project"
          value={project}
          onChange={(value) => {
            setProject(value);
            setPage(0);
          }}
          options={[
            { id: "all", label: "All projects" },
            ...["Website delivery", "Brand assets", "Client handoff"].map(
              (value) => ({ id: value, label: value }),
            ),
          ]}
        />

        <SnappSelect
          label="Report review state"
          value={filter}
          onChange={(value) => {
            setFilter(value);
            setPage(0);
          }}
          options={[
            { id: "all", label: "All review states" },
            { id: "Reviewed", label: "Reviewed" },
            { id: "Needs review", label: "Needs review" },
            { id: "Approved", label: "Approved (empty example)" },
          ]}
        />
        <label className="lib-report-search">
          Find employee
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(0);
            }}
            placeholder="Search by name"
          />
        </label>
        <button className="lib-button" onClick={reset}>
          Reset report filters
        </button>
      </div>
      <p className="lib-note">
        Applied dates: {appliedRange.start.toString()} to{" "}
        {appliedRange.end.toString()} (inclusive). All filters affect
        scorecards, charts, table and export. Dates refer to submitted records,
        not payment dates.
      </p>
      <div className="lib-report-legend" aria-label="Report color legend">
        <span>
          <i aria-hidden="true" />
          Filtered report data
        </span>
        <span className="lib-report-legend-positive">
          <CheckCircle2 size={14} aria-hidden="true" />
          Passed check
        </span>
        <span className="lib-report-legend-negative">
          <XCircle size={14} aria-hidden="true" />
          Needs correction
        </span>
        <span className="lib-report-legend-attention">
          <i aria-hidden="true" />
          Needs review
        </span>
      </div>
      <div ref={reportBody}>
        <dl className="lib-scorecards" aria-label="Filtered report scorecards">
          <div>
            <dt>Employees in view</dt>
            <dd>
              <DataTip
                label={`${filtered.length} distinct employees matching all filters.`}
              >
                {filtered.length}
              </DataTip>
            </dd>
            <Sparkline values={series("count")} label="Employee count" />
            <p className="lib-report-attention">
              {filtered.filter((row) => row.state === "Needs review").length}{" "}
              need review
            </p>
          </div>
          <div>
            <dt>Submitted hours</dt>
            <dd>
              <DataTip label="Total submitted hours for matching records. Review does not imply payment approval.">
                {filtered.reduce((sum, row) => sum + row.hours, 0)} h
              </DataTip>
            </dd>
            <Sparkline values={series("hours")} label="Submitted hours" />
            <p>Awaiting final owner approval</p>
          </div>
          <div>
            <dt>Proposed amount</dt>
            <dd>
              <DataTip label="Proposed PHP total for matching records; not approved or paid.">
                {money(filtered.reduce((sum, row) => sum + row.amount, 0))}
              </DataTip>
            </dd>
            <Sparkline
              values={series("amount").map((value) => value / 100)}
              label="Proposed PHP"
            />
            <p>Not an approved payment total</p>
          </div>
        </dl>
        <section
          className="lib-report-outcomes"
          aria-label="Filtered data-check outcomes"
        >
          <h3>Data-check outcomes</h3>
          <p className="lib-note">
            Illustrative completeness checks on these records. Passed checks do
            not approve hours or confirm payment. Hours and proposed amounts
            stay violet because higher is not inherently better.
          </p>
          <div className="lib-outcome-bar" aria-hidden="true">
            {checkOutcomes.map(({ label, tone }) => (
              <span
                key={label}
                className={`lib-outcome-${tone}`}
                style={{
                  width: `${filtered.length ? (filtered.filter((row) => row.check === label).length / filtered.length) * 100 : 0}%`,
                }}
              />
            ))}
          </div>
          <ul>
            {checkOutcomes.map(({ label, tone, Icon, description }) => (
              <li key={label} className={`lib-outcome-${tone}`}>
                <DataTip label={description}>
                  <Icon size={16} aria-hidden="true" />
                  {filtered.filter((row) => row.check === label).length}{" "}
                  {label.toLowerCase()}
                </DataTip>
              </li>
            ))}
          </ul>
        </section>
        <div className="lib-report-charts">
          <figure>
            <figcaption>
              <h3>Hours by record date</h3>
              <p>Submitted hours before owner approval</p>
            </figcaption>
            <div
              className="lib-chart-scroll"
              onMouseLeave={() => setChartTip(null)}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget))
                  setChartTip(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") setChartTip(null);
              }}
              role="region"
              tabIndex={0}
              aria-label="Cutoff hours chart; scroll horizontally on narrow screens"
            >
              <svg
                viewBox="0 0 480 236"
                className="lib-report-chart"
                role="group"
                aria-label={`Submitted hours by record date: ${cutoffs.map((item) => `${item.label}: ${item.hours}`).join("; ")}.`}
              >
                {[0, 80, 160, 240, 320].map((value) => (
                  <g key={value}>
                    <line
                      x1="42"
                      x2="470"
                      y1={194 - value / 2}
                      y2={194 - value / 2}
                    />
                    <text x="32" y={198 - value / 2} textAnchor="end">
                      {value}
                    </text>
                  </g>
                ))}
                {cutoffs.map((item, i) => (
                  <g
                    key={item.label}
                    tabIndex={0}
                    role="img"
                    aria-label={`${item.label}: ${item.hours} submitted hours`}
                    aria-describedby={chartTip === i ? chartTipId : undefined}
                    onFocus={() => setChartTip(i)}
                    onMouseEnter={() => setChartTip(i)}
                    onClick={() => setChartTip(i)}
                  >
                    <rect
                      x={76 + i * 140}
                      y="-160"
                      className="lib-report-bar"
                      style={{
                        transform: `translateY(194px) scaleY(${item.hours / 320})`,
                      }}
                      width="56"
                      height="160"
                      rx="3"
                    />
                    <text
                      x={104 + i * 140}
                      y={184 - item.hours / 2}
                      textAnchor="middle"
                      className="lib-chart-value"
                    >
                      {item.hours}
                    </text>
                    <text x={104 + i * 140} y="222" textAnchor="middle">
                      {item.label}
                    </text>
                  </g>
                ))}
              </svg>
              {chartTip !== null && (
                <span
                  id={chartTipId}
                  className="lib-data-tooltip"
                  role="tooltip"
                >
                  {cutoffs[chartTip].label}, 2026: {cutoffs[chartTip].hours}{" "}
                  submitted hours
                </span>
              )}
            </div>
          </figure>
          <figure>
            <figcaption>
              <h3>Current hours by project</h3>
              <p>Filtered records in the applied date range</p>
            </figcaption>
            <ul className="lib-project-bars">
              {["Website delivery", "Brand assets", "Client handoff"].map(
                (project) => {
                  const hours = filtered
                    .filter((row) => row.project === project)
                    .reduce((total, row) => total + row.hours, 0);
                  return (
                    <li key={project}>
                      <span>{project}</span>
                      <strong>
                        <DataTip
                          label={`${project}: ${hours} submitted hours in the filtered report.`}
                        >
                          {hours} h
                        </DataTip>
                      </strong>
                      <span className="lib-project-track" aria-hidden="true">
                        <i style={{ transform: `scaleX(${hours / 120})` }} />
                      </span>
                    </li>
                  );
                },
              )}
            </ul>
            <p className="lib-note">
              Bars share a 0-120 hour scale. All report controls apply to these
              totals.
            </p>
          </figure>
        </div>
        <ReportChartGallery rows={filtered} dates={dates} />
        <div className="lib-report-toolbar">
          <div>
            <h3>Cutoff review detail</h3>
            <p>
              {filtered.length} employees -{" "}
              {filtered.reduce((n, row) => n + row.hours, 0)} hours -{" "}
              {money(filtered.reduce((n, row) => n + row.amount, 0))} proposed
            </p>
          </div>
          <button
            className="lib-button"
            onClick={download}
            disabled={!ordered.length}
          >
            <Download size={16} />
            Export filtered CSV
          </button>
        </div>
        <div
          className="lib-report-table-wrap"
          tabIndex={0}
          role="region"
          aria-label="Cutoff report, scroll horizontally on small screens"
        >
          <table className="lib-report-table">
            <caption>
              {appliedRange.start.toString()} to {appliedRange.end.toString()} -
              fictional records
            </caption>
            <thead>
              <tr>
                {(
                  [
                    ["name", "Employee"],
                    ["project", "Project"],
                    ["hours", "Hours"],
                    ["amount", "Proposed amount"],
                    ["state", "Review state"],
                    ["check", "Data check"],
                  ] as const
                ).map(([key, label]) => (
                  <th
                    key={key}
                    scope="col"
                    aria-sort={
                      key === sort
                        ? descending
                          ? "descending"
                          : "ascending"
                        : undefined
                    }
                  >
                    {key === "name" || key === "hours" || key === "amount" ? (
                      <button onClick={() => changeSort(key)}>
                        {label}
                        {sort === key &&
                          (descending ? (
                            <ArrowDown size={14} />
                          ) : (
                            <ArrowUp size={14} />
                          ))}
                      </button>
                    ) : (
                      label
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={row.name}>
                  <th scope="row">{row.name}</th>
                  <td>{row.project}</td>
                  <td className="lib-numeric">{row.hours}</td>
                  <td className="lib-numeric">{money(row.amount)}</td>
                  <td>
                    <span
                      className={
                        row.state === "Needs review"
                          ? "lib-report-attention"
                          : ""
                      }
                    >
                      {row.state}
                    </span>
                  </td>
                  <td>
                    {checkOutcomes
                      .filter((outcome) => outcome.label === row.check)
                      .map(({ label, tone, Icon, description }) => (
                        <span key={label} className={`lib-outcome-${tone}`}>
                          <DataTip label={description}>
                            <Icon size={14} aria-hidden="true" />
                            {label}
                          </DataTip>
                        </span>
                      ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!visible.length && (
            <div className="lib-report-empty">
              <h4>
                {filter === "Approved"
                  ? "No approved records in this preview"
                  : "No records match these filters"}
              </h4>
              <p>Change the filter to review the available records.</p>
              <button className="lib-button" onClick={reset}>
                Show all review states
              </button>
            </div>
          )}
        </div>
        <div className="lib-report-pagination">
          <p role="status">
            {ordered.length
              ? `${page * 3 + 1}-${Math.min((page + 1) * 3, ordered.length)} of ${ordered.length} employees`
              : "0 employees"}
          </p>
          <button
            className="lib-button"
            disabled={page === 0}
            onClick={() => {
              setPage((n) => n - 1);
            }}
          >
            Previous page
          </button>
          <button
            className="lib-button"
            disabled={page + 1 >= pageCount}
            onClick={() => {
              setPage((n) => n + 1);
            }}
          >
            Next page
          </button>
        </div>
      </div>
    </div>
  );
}
