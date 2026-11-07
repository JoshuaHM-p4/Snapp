import { useState } from "react";
import {
  EyeOff,
  History,
  MessageCircleWarning,
  Printer,
  Send,
} from "lucide-react";
import { SnappTextField } from "../../components/ui/SnappControls";
import {
  ColumnChart,
  DataTip,
  HoursBars,
  ReportTable,
  Sparkline,
  type ReportColumn,
} from "../../components/ui/ReportParts";
import { validateText, type TextRules } from "../../components/ui/validation";
import {
  cutoff,
  employees,
  evaluationLabel,
  sampleResults,
  statementEmployeeId,
} from "../fixtures";
import { formatHours, formatPhp, hourlyPay, sum } from "../money";
import { useNotify } from "../toast";
import { Chip, PageHeader, Php, PreviewNotice, StatusChip } from "../ui";
import "./statement.css";

const discrepancyRules: TextRules = {
  label: "what doesn't match",
  min: 20,
  max: 240,
};

/** The owner's recorded corrections for this statement (sample data). */
const corrections: Record<
  string,
  { approved: number; reason: string; by: string; at: string; date?: string }
> = {
  "e-alex-1": {
    approved: 380,
    reason: "Duplicate time entry on Nov 7",
    by: "Owner",
    at: "Nov 16, 2026 · 09:31 PHT",
    date: "2026-11-07",
  },
};

type DayRow = {
  id: string;
  date: string;
  project: string;
  task: string;
  submitted: number;
  approved: number;
  note?: string;
};

const dayLabel = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

const dayColumns: ReportColumn<DayRow>[] = [
  {
    key: "date",
    label: "Date",
    value: (r) => r.date,
    render: (r) => dayLabel(r.date),
    csv: (r) => r.date,
  },
  {
    key: "project",
    label: "Project / task",
    value: (r) => r.project,
    render: (r) => (
      <>
        {r.project}
        <small className="st-sub">{r.task}</small>
      </>
    ),
    csv: (r) => `${r.project} / ${r.task}`,
  },
  {
    key: "submitted",
    label: "Submitted",
    numeric: true,
    value: (r) => r.submitted,
    render: (r) => formatHours(r.submitted),
    csv: (r) => (r.submitted / 10).toFixed(1),
  },
  {
    key: "approved",
    label: "Approved",
    numeric: true,
    value: (r) => r.approved,
    render: (r) => formatHours(r.approved),
    csv: (r) => (r.approved / 10).toFixed(1),
  },
  {
    key: "note",
    label: "Owner note",
    render: (r) => r.note ?? <span className="s-muted">—</span>,
    csv: (r) => r.note ?? "",
  },
];

export default function StatementPage() {
  const notify = useNotify();
  const me = employees.find((e) => e.id === statementEmployeeId)!;
  const result = sampleResults.find((r) => r.employeeId === me.id);
  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [sent, setSent] = useState(false);

  const rows = me.entries.map((entry) => {
    const fix = corrections[entry.id];
    const approved = fix ? fix.approved : entry.submitted;
    return { entry, fix, approved };
  });
  const approvedTotal = sum(rows.map((r) => r.approved));
  // Day-by-day log. A correction comes off the day it names; the original entry stays visible.
  const days: DayRow[] = me.entries.flatMap((entry) => {
    const fix = corrections[entry.id];
    return (entry.days ?? []).map((d) => {
      const cut =
        fix && fix.date === d.date ? entry.submitted - fix.approved : 0;
      return {
        id: `${entry.id}-${d.date}`,
        date: d.date,
        project: entry.project,
        task: entry.task,
        submitted: d.hours,
        approved: d.hours - cut,
        note: cut ? `${formatHours(-cut)} · ${fix!.reason}` : undefined,
      };
    });
  });
  const byDay = [...new Set(days.map((d) => d.date))].sort().map((date) => {
    const on = days.filter((d) => d.date === date);
    const note = on.find((d) => d.note)?.note;
    return {
      label: dayLabel(date),
      value: sum(on.map((d) => d.approved)),
      ghost: sum(on.map((d) => d.submitted)),
      note,
    };
  });
  let runSub = 0;
  let runApp = 0;
  const cumulative = byDay.map((p) => ({
    sub: { label: p.label, value: (runSub += p.ghost) },
    app: { label: p.label, value: (runApp += p.value) },
  }));
  const submittedTotal = sum(rows.map((r) => r.entry.submitted));
  const adjustments = 0;
  const base =
    me.agreement.kind === "hourly"
      ? hourlyPay(approvedTotal, me.agreement.rate)
      : me.agreement.perCutoff;
  const expected = base + adjustments;

  return (
    <div className="s-page st-page">
      <PageHeader
        title={`Your ${cutoff.label} statement`}
        lede="Every number on this page, and how it was calculated. Raise anything that doesn't match your records."
        actions={
          <button
            type="button"
            className="s-btn"
            onClick={() => window.print()}
          >
            <Printer size={16} aria-hidden="true" /> Print
          </button>
        }
        meta={
          <>
            <Chip>Sample data</Chip>
            <Chip icon={<EyeOff size={13} aria-hidden="true" />}>
              Own data only
            </Chip>
          </>
        }
      />

      <section className="st-summary s-panel" aria-labelledby="st-expected">
        <div className="st-who">
          <p className="st-name">{me.name}</p>
          <p className="s-muted">
            {me.role} · {me.agreement.version}
            {me.agreement.kind === "hourly" && (
              <>
                {" "}
                · <span className="s-mono">
                  {formatPhp(me.agreement.rate)}
                </span>{" "}
                / h
              </>
            )}
          </p>
        </div>
        <div className="st-expected">
          <p id="st-expected" className="s-label">
            Expected for this cutoff
          </p>
          <Php centavos={expected} size="xl" />
          <p className="st-calc s-mono" aria-label="Calculation">
            {me.agreement.kind === "hourly"
              ? `${formatHours(approvedTotal)} × ${formatPhp(me.agreement.rate)} = ${formatPhp(base)}`
              : `Fixed compensation ${formatPhp(base)}`}
          </p>
        </div>
      </section>

      <section className="s-section" aria-labelledby="st-report">
        <div className="s-section-head">
          <h2 id="st-report">At a glance</h2>
          <p className="s-note">
            Hover or focus a figure to see how it is made.
          </p>
        </div>
        <div className="s-panel st-report">
          <dl className="st-scorecards">
            <div>
              <dt>Submitted</dt>
              <dd>
                <DataTip label="Hours you submitted for this cutoff, before the owner's review.">
                  {formatHours(submittedTotal)}
                </DataTip>
              </dd>
              {cumulative.length > 1 && (
                <Sparkline
                  points={cumulative.map((c) => c.sub)}
                  label="Submitted hours, running total"
                  format={formatHours}
                />
              )}
            </div>
            <div>
              <dt>Approved</dt>
              <dd>
                <DataTip label="Hours the owner approved. Corrections keep your original entry and show a reason.">
                  {formatHours(approvedTotal)}
                </DataTip>
              </dd>
              {cumulative.length > 1 && (
                <Sparkline
                  points={cumulative.map((c) => c.app)}
                  label="Approved hours, running total"
                  format={formatHours}
                />
              )}
            </div>
            <div>
              <dt>Expected pay</dt>
              <dd>
                <DataTip
                  label={
                    me.agreement.kind === "hourly"
                      ? `${formatHours(approvedTotal)} × ${formatPhp(me.agreement.rate)} per hour. This explains the amount; it is not proof of transfer.`
                      : "Fixed compensation for this cutoff. This explains the amount; it is not proof of transfer."
                  }
                >
                  {formatPhp(expected)}
                </DataTip>
              </dd>
            </div>
          </dl>
          <HoursBars
            rows={rows.map(({ entry, approved }) => ({
              label: `${entry.project} · ${entry.task}`,
              submitted: entry.submitted,
              approved,
            }))}
            scale={Math.max(1, ...rows.map((r) => r.entry.submitted))}
            format={formatHours}
          />
          <p className="s-note">
            Bars share one scale starting at zero. Light = submitted, solid =
            approved.
          </p>
        </div>
      </section>

      {byDay.length > 0 && (
        <section className="s-section" aria-labelledby="st-days">
          <div className="s-section-head">
            <h2 id="st-days">Hours by day</h2>
            <p className="s-note">Hover, focus or tap a day for details.</p>
          </div>
          <div className="s-panel st-report">
            <ColumnChart
              points={byDay}
              label="Approved and submitted hours by day"
              format={formatHours}
              valueLabel="Approved"
              ghostLabel="Submitted"
            />
          </div>
          <div className="s-panel s-panel--flush">
            <ReportTable
              rows={days}
              columns={dayColumns}
              rowKey={(r) => r.id}
              caption={`Your daily hours, ${cutoff.label}`}
              csvName={`snapp-statement-${cutoff.id}.csv`}
              initialSort={{ key: "date" }}
            />
          </div>
        </section>
      )}

      <section className="s-section" aria-labelledby="st-hours">
        <div className="s-section-head">
          <h2 id="st-hours">Hours by project</h2>
          <p className="s-note">
            Submitted {formatHours(submittedTotal)} · approved{" "}
            {formatHours(approvedTotal)}
          </p>
        </div>
        <div className="s-panel s-panel--flush">
          <div className="s-table-wrap">
            <table className="s-table st-table">
              <thead>
                <tr>
                  <th scope="col">Project / task</th>
                  <th scope="col" className="num">
                    Submitted
                  </th>
                  <th scope="col" className="num">
                    Approved
                  </th>
                  <th scope="col">Owner review</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ entry, fix, approved }) => (
                  <tr key={entry.id}>
                    <td>
                      {entry.project}
                      <small>
                        {entry.task} · {entry.deliverable.title} v
                        {entry.deliverable.version} ·{" "}
                        {evaluationLabel[entry.deliverable.evaluation]}
                      </small>
                    </td>
                    <td className="num">
                      {fix ? (
                        <s
                          aria-label={`Originally ${formatHours(entry.submitted)}`}
                        >
                          {formatHours(entry.submitted)}
                        </s>
                      ) : (
                        formatHours(entry.submitted)
                      )}
                    </td>
                    <td className="num">{formatHours(approved)}</td>
                    <td>
                      {fix ? (
                        <span className="st-fix">
                          <History size={14} aria-hidden="true" />
                          <span>
                            {formatHours(approved - entry.submitted)} ·{" "}
                            {fix.reason}
                            <small>
                              {fix.by} · {fix.at}. Your original entry is kept.
                            </small>
                          </span>
                        </span>
                      ) : (
                        <span className="s-muted">Approved as submitted</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <p className="s-note">
          Client feedback is shown for context. It doesn't decide whether your
          hours are paid; your agreement does.
        </p>
      </section>

      <section className="s-section" aria-labelledby="st-breakdown">
        <h2 id="st-breakdown">Breakdown</h2>
        <div className="s-panel">
          <dl className="st-lines">
            <div>
              <dt>Approved hours × rate</dt>
              <dd>
                <Php centavos={base} />
              </dd>
            </div>
            <div>
              <dt>Adjustments</dt>
              <dd>
                <Php centavos={adjustments} />
                <small>No adjustments this cutoff</small>
              </dd>
            </div>
            <div className="st-line-total">
              <dt>Expected total</dt>
              <dd>
                <Php centavos={expected} />
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="s-section" aria-labelledby="st-payment">
        <h2 id="st-payment">Payment</h2>
        <div className="st-states">
          <div className="s-panel st-state">
            <p className="s-label">Expected</p>
            <Php centavos={expected} />
            <p className="s-note">From your approved hours and agreement.</p>
          </div>
          <div className="s-panel st-state">
            <p className="s-label">Submitted</p>
            <p className="st-state-value">
              <StatusChip status="authorized" />
            </p>
            <p className="s-note">
              {result?.at}. {result?.note}
            </p>
          </div>
          <div className="s-panel st-state">
            <p className="s-label">Confirmed received</p>
            <p className="st-state-value s-muted">Not yet</p>
            <p className="s-note">
              Shows only after the claim is confirmed. This statement explains
              the amount; it isn't proof of transfer.
            </p>
          </div>
        </div>
      </section>

      <section className="s-section st-dispute" aria-labelledby="st-dispute">
        <div className="s-section-head">
          <h2 id="st-dispute">Something doesn't match?</h2>
        </div>
        <form
          className="s-panel st-dispute-form"
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitted(true);
            if (validateText(text, discrepancyRules)) return;
            setSent(true);
            notify(
              "Sent for review. Your original statement is kept; any correction needs owner reapproval.",
            );
          }}
        >
          <p className="s-muted">
            Tell the owner what's different. Your statement stays as it is while
            they review, and any correction is recalculated and approved again.
          </p>
          <SnappTextField
            label="What doesn't match"
            multiline
            value={text}
            onChange={(v) => {
              setText(v);
              setSent(false);
            }}
            rules={discrepancyRules}
            submitted={submitted}
            disabled={sent}
            placeholder="For example: my Nov 7 entries were two separate client calls, not a duplicate."
          />
          <div className="st-dispute-actions">
            <button type="submit" className="s-btn" disabled={sent}>
              {sent ? (
                <>
                  <MessageCircleWarning size={16} aria-hidden="true" /> Under
                  review
                </>
              ) : (
                <>
                  <Send size={16} aria-hidden="true" /> Send for review
                </>
              )}
            </button>
            {sent && (
              <button
                type="button"
                className="s-btn s-btn--quiet"
                onClick={() => {
                  setSent(false);
                  setSubmitted(false);
                  setText("");
                }}
              >
                Write another
              </button>
            )}
          </div>
          {sent && (
            <StatusChip status="disputed" label="Disputed · under review" />
          )}
        </form>
      </section>

      <PreviewNotice>
        You only see your own pay. Colleagues' compensation is never shown. This
        is a preview with sample data: nothing is sent.
      </PreviewNotice>
    </div>
  );
}
