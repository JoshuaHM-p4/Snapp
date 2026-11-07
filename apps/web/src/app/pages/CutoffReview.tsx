import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Check,
  Clock3,
  Eye,
  Lock,
  Minus,
  Plus,
  RotateCcw,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { SnappTextField } from "../../components/ui/SnappControls";
import { reasonRules } from "../../components/ui/validation";
import { HoldToSnap } from "../HoldToSnap";
import {
  cutoff,
  employees,
  evaluationLabel,
  type ClientEvaluation,
  type Employee,
  type HoursEntry,
} from "../fixtures";
import {
  approvalHolds,
  buildSnapshot,
  entryAmount,
  entryProblem,
  initialReviews,
  isCorrected,
  isFlagged,
  orderForReview,
  parseHours,
  reviewOf,
  type Approval,
  type Reviews,
} from "../cutoffRun";
import { formatHours, formatPhp, formatXlm, phpNumber } from "../money";
import { useNotify } from "../toast";
import { Chip, PageHeader, Php, PreviewNotice, StatusChip } from "../ui";
import "./cutoff.css";

const ordered = orderForReview(employees);
const flaggedEntries = ordered.flatMap((e) =>
  e.entries.filter((x) => x.agentFlag).map((x) => ({ employee: e, entry: x })),
);
const hoursText = (t: number) => `${Math.floor(t / 10)}.${t % 10}`;
const manilaTime = () =>
  new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date()) + " PHT";

function EvaluationChip({ value }: { value: ClientEvaluation }) {
  return value === "accepted" ? (
    <Chip icon={<Check aria-hidden="true" />}>{evaluationLabel[value]}</Chip>
  ) : value === "revision_requested" ? (
    <Chip kind="attention" icon={<Eye aria-hidden="true" />}>
      {evaluationLabel[value]}
    </Chip>
  ) : (
    <Chip icon={<Clock3 aria-hidden="true" />}>{evaluationLabel[value]}</Chip>
  );
}

function termsFor(e: Employee) {
  return e.agreement.kind === "hourly"
    ? `${formatPhp(e.agreement.rate)} / h`
    : `${formatPhp(e.agreement.perCutoff)} per cutoff`;
}

function HoursStepper({
  entry,
  name,
  value,
  onChange,
}: {
  entry: HoursEntry;
  name: string;
  value: number;
  onChange: (tenths: number) => void;
}) {
  const [text, setText] = useState(hoursText(value));
  const [bad, setBad] = useState(false);
  useEffect(() => {
    setText(hoursText(value));
    setBad(false);
  }, [value]);
  const label = `Reviewed hours for ${name}, ${entry.task}`;
  return (
    <div className="cr-stepper" data-invalid={bad}>
      <button
        type="button"
        className="cr-step"
        aria-label={`Decrease ${label} by 0.1 h`}
        disabled={value <= 0}
        onClick={() => onChange(Math.max(0, value - 1))}
      >
        <Minus size={14} aria-hidden="true" />
      </button>
      <input
        className="cr-hours-input s-mono"
        inputMode="decimal"
        aria-label={label}
        aria-invalid={bad}
        value={text}
        onChange={(ev) => {
          setText(ev.target.value);
          const parsed = parseHours(ev.target.value);
          setBad(parsed === null);
          if (parsed !== null) onChange(parsed);
        }}
        onBlur={() => {
          setText(hoursText(value));
          setBad(false);
        }}
      />
      <span className="cr-hours-unit" aria-hidden="true">
        h
      </span>
      <button
        type="button"
        className="cr-step"
        aria-label={`Increase ${label} by 0.1 h`}
        disabled={value >= 9999}
        onClick={() => onChange(value + 1)}
      >
        <Plus size={14} aria-hidden="true" />
      </button>
    </div>
  );
}

export default function CutoffReviewPage() {
  const notify = useNotify();
  const [reviews, setReviews] = useState<Reviews>(() => initialReviews(employees));
  const [approval, setApproval] = useState<Approval | null>(null);
  const [version, setVersion] = useState<number>(cutoff.runVersion);
  const [stale, setStale] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const reasonRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const snapshot = useMemo(() => buildSnapshot(employees, reviews), [reviews]);
  const approved = approvalHolds(approval, snapshot);

  // Any material change after approval supersedes it: new version, new snap.
  useEffect(() => {
    if (approval && approval.fingerprint !== snapshot.fingerprint) {
      const next = approval.version + 1;
      setApproval(null);
      setVersion(next);
      setStale(true);
      notify(`Inputs changed. Version v${next} needs a new snap.`, "warning");
    }
  }, [snapshot.fingerprint, approval, notify]);

  const setEntry = (id: string, patch: Partial<{ reviewed: number; reason: string }>) =>
    setReviews((r) => ({ ...r, [id]: { ...r[id], ...patch } }));

  const applySuggestion = (entry: HoursEntry) => {
    if (entry.agentFlag?.suggested === undefined) return;
    setEntry(entry.id, { reviewed: entry.agentFlag.suggested });
    requestAnimationFrame(() =>
      reasonRefs.current[entry.id]?.querySelector<HTMLElement>("input, textarea")?.focus(),
    );
  };

  const people = employees.length;
  const flaggedPeople = ordered.filter(isFlagged).length;
  const corrections = employees.flatMap((e) =>
    e.entries.filter((x) => isCorrected(x, reviewOf(reviews, x))),
  ).length;
  const blocked = snapshot.problems.length > 0;

  const summary = (
    <>
      <p>
        <strong>Run v{version}</strong> · {cutoff.label} · {snapshot.lines.length} recipients
      </p>
      <ul className="cr-dialog-lines">
        {snapshot.lines.map((l) => (
          <li key={l.employeeId}>
            <span>{l.name}</span>
            <Php centavos={l.amount} />
          </li>
        ))}
      </ul>
      <p className="cr-dialog-total">
        Total <Php centavos={snapshot.total} />
      </p>
      <p className="s-note">
        Preview only. Approving locks this exact snapshot; nothing is sent.
      </p>
    </>
  );

  return (
    <div className="s-page cr-page">
      <PageHeader
        stage="Review"
        title={`${cutoff.label} cutoff`}
        lede={
          <>
            {people} people · {flaggedPeople} flagged by the agent · {snapshot.lines.length}{" "}
            ready for your snap. You decide the hours; the agent only points.
          </>
        }
        meta={
          <>
            <StatusChip status="prepared" />
            <Chip icon={<Clock3 aria-hidden="true" />}>
              {cutoff.timezone} · Nov 1 00:00 – Nov 15 23:59
            </Chip>
            <Chip>Run v{version}</Chip>
          </>
        }
      />

      <PreviewNotice>
        Preview with sample people and hours. Nothing is sent, and no bank, wallet or Proyekto
        workspace is connected.
      </PreviewNotice>

      <section className="s-section cr-agent" aria-labelledby="cr-agent-title">
        <div className="cr-agent-head">
          <span className="cr-ticks" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <h2 id="cr-agent-title">Agent suggestions</h2>
          <span className="s-note">Prepared {cutoff.preparedAt}</span>
        </div>
        <ol className="cr-agent-list">
          {flaggedEntries.map(({ employee, entry }) => {
            const r = reviewOf(reviews, entry);
            const suggested = entry.agentFlag?.suggested;
            const applied = suggested !== undefined && r.reviewed === suggested;
            return (
              <li key={entry.id} className="cr-agent-item">
                <Sparkles size={16} aria-hidden="true" className="cr-agent-icon" />
                <div className="cr-agent-body">
                  <p>
                    <strong>Agent:</strong> {employee.name} · {entry.project}.{" "}
                    {entry.agentFlag?.note}
                  </p>
                  <p className="s-note">
                    {suggested !== undefined
                      ? `Suggests ${formatHours(suggested)} instead of ${formatHours(entry.submitted)}. Flagged for your review.`
                      : "No change suggested. Flagged for your review."}
                  </p>
                </div>
                {suggested !== undefined && (
                  <button
                    type="button"
                    className="s-btn s-btn--sm"
                    disabled={applied}
                    onClick={() => applySuggestion(entry)}
                  >
                    {applied ? (
                      <>
                        <Check size={14} aria-hidden="true" /> Applied, add your reason
                      </>
                    ) : (
                      <>Use {formatHours(suggested)}</>
                    )}
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      <section className="s-section" aria-labelledby="cr-hours-title">
        <div className="s-section-head">
          <h2 id="cr-hours-title">Hours review</h2>
          <span className="s-note">
            {corrections === 0
              ? "No corrections yet"
              : `${corrections} correction${corrections === 1 ? "" : "s"}`}
          </span>
        </div>
        <div className="s-panel s-panel--flush">
          <div className="s-table-wrap">
            <table className="s-table cr-table">
              <thead>
                <tr>
                  <th scope="col">Person · work</th>
                  <th scope="col">Deliverable</th>
                  <th scope="col" className="num">
                    Submitted
                  </th>
                  <th scope="col">Your review</th>
                  <th scope="col">Terms</th>
                  <th scope="col" className="num">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {ordered.flatMap((e, ei) =>
                  e.entries.map((x, xi) => {
                    const r = reviewOf(reviews, x);
                    const corrected = isCorrected(x, r);
                    const amount = entryAmount(e, r);
                    const problem = entryProblem(x, r);
                    const idx = ei * 2 + xi;
                    return [
                      <tr
                        key={x.id}
                        className={`cr-row ${x.agentFlag ? "is-flagged" : ""} ${corrected ? "is-corrected" : ""}`}
                        style={{ "--i": idx } as CSSProperties}
                      >
                        <td data-label="Person · work">
                          <span className="cr-person">
                            {x.agentFlag && (
                              <span className="cr-flag" title="Flagged by the agent">
                                <TriangleAlert size={14} aria-hidden="true" />
                                <span className="s-visually-hidden">Flagged by the agent. </span>
                              </span>
                            )}
                            <strong>{e.name}</strong>
                          </span>
                          <small>
                            {x.project} · {x.task}
                          </small>
                          <small className="cr-ref">
                            Proposed ref <span className="s-mono">{x.proyektoRef}</span>
                          </small>
                        </td>
                        <td data-label="Deliverable">
                          <span className="cr-deliverable">
                            {x.deliverable.title} · v{x.deliverable.version}
                          </span>
                          <EvaluationChip value={x.deliverable.evaluation} />
                        </td>
                        <td data-label="Submitted" className="num">
                          {formatHours(x.submitted)}
                        </td>
                        <td data-label="Your review">
                          <HoursStepper
                            entry={x}
                            name={e.name}
                            value={r.reviewed}
                            onChange={(t) => setEntry(x.id, { reviewed: t })}
                          />
                        </td>
                        <td data-label="Terms">
                          <span className="cr-terms">{e.agreement.version}</span>
                          <small className="s-mono">{termsFor(e)}</small>
                        </td>
                        <td data-label="Amount" className="num">
                          {amount !== null ? (
                            <Php centavos={amount} />
                          ) : (
                            <span className="cr-fixed">
                              Fixed
                              <small>Hours are context</small>
                            </span>
                          )}
                        </td>
                      </tr>,
                      corrected && (
                        <tr key={`${x.id}-reason`} className="cr-reason-row">
                          <td colSpan={6}>
                            <div
                              className="cr-reason"
                              ref={(el) => {
                                reasonRefs.current[x.id] = el;
                              }}
                            >
                              <p className="cr-reason-change s-mono">
                                {formatHours(x.submitted)} → {formatHours(r.reviewed)}
                                {e.agreement.kind === "hourly" && amount !== null && (
                                  <> · PHP {phpNumber(amount)}</>
                                )}
                              </p>
                              <SnappTextField
                                label={`Reason for correcting ${e.name}'s hours`}
                                value={r.reason}
                                onChange={(t) => setEntry(x.id, { reason: t })}
                                rules={reasonRules}
                                submitted={showErrors && Boolean(problem)}
                                description="The original submission is kept. Your reason is shown to the employee."
                              />
                              <button
                                type="button"
                                className="s-btn s-btn--sm s-btn--quiet"
                                onClick={() => setEntry(x.id, { reviewed: x.submitted, reason: "" })}
                              >
                                <RotateCcw size={14} aria-hidden="true" /> Keep submitted hours
                              </button>
                            </div>
                          </td>
                        </tr>
                      ),
                    ];
                  }),
                )}
              </tbody>
            </table>
          </div>
        </div>
        <p className="s-note">
          Client evaluations are context for your review. They don't gate hours-based pay; the
          agreement does.
        </p>
      </section>

      <div className="s-slip" role="separator" aria-label="Review ends, release begins" />

      <section
        className="s-section cr-snapshot"
        aria-labelledby="cr-snap-title"
        data-approved={approved}
      >
        <div className="s-section-head">
          <h2 id="cr-snap-title">Run snapshot · v{version}</h2>
          {approved ? (
            <span className="cr-approved-chips">
              <StatusChip status="approved" label="Approved by owner" flipKey={`a${version}`} />
            </span>
          ) : (
            <StatusChip status="needs_review" label="Waiting for your snap" flipKey={`w${version}`} />
          )}
        </div>

        {stale && !approved && (
          <div className="s-notice s-notice--attention" role="status">
            <TriangleAlert size={16} aria-hidden="true" />
            <div>
              <strong>Inputs changed. Version v{version} needs a new snap.</strong> The earlier
              approval no longer matches these amounts and was superseded.
            </div>
          </div>
        )}

        <div className="s-panel cr-snap-panel">
          <div className="cr-snap-grid">
            <div className="cr-snap-lines">
              <table className="cr-lines">
                <caption className="s-visually-hidden">
                  Recipients and exact amounts in run v{version}
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Recipient</th>
                    <th scope="col" className="num">
                      Hours
                    </th>
                    <th scope="col" className="num">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.lines.map((l) => (
                    <tr key={l.employeeId}>
                      <td>
                        <strong>{l.name}</strong>
                        <small className="s-mono">{l.recipient}</small>
                      </td>
                      <td className="num">{formatHours(l.approvedHours)}</td>
                      <td className="num">
                        <Php centavos={l.amount} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {snapshot.held.map((h) => (
                <div key={h.employeeId} className="cr-held">
                  <span className="cr-held-name">
                    {h.name}
                  </span>
                  <StatusChip status="held" />
                  <span className="s-note">{h.reason}</span>
                </div>
              ))}
            </div>

            <div className="cr-snap-release">
              <p className="s-label">Run total · {snapshot.lines.length} recipients</p>
              <Php centavos={snapshot.total} size="xl" className="cr-total" />
              <p className="s-note">
                Exact amounts. Approval binds these recipients, amounts and this version.
              </p>

              <div className="cr-testnet">
                <p className="s-label">Testnet demo items</p>
                <p className="s-amount">{formatXlm(snapshot.testnetTotal)}</p>
                <p className="s-note">
                  {snapshot.lines.length} separate items of{" "}
                  {formatXlm(snapshot.lines[0]?.testnetStroops ?? 0n)} for the Stellar Testnet
                  demonstration. Not a conversion of the PHP amounts.
                </p>
              </div>

              {blocked && (
                <div className="s-notice s-notice--attention" role="status">
                  <TriangleAlert size={16} aria-hidden="true" />
                  <div>
                    Add a reason for{" "}
                    {snapshot.problems.length === 1
                      ? `${snapshot.problems[0].employee}'s correction`
                      : `${snapshot.problems.length} corrections`}{" "}
                    before you snap.
                    <div>
                      <button
                        type="button"
                        className="s-btn s-btn--sm s-btn--quiet cr-jump"
                        onClick={() => {
                          setShowErrors(true);
                          reasonRefs.current[snapshot.problems[0].entryId]
                            ?.querySelector<HTMLElement>("input, textarea")
                            ?.focus();
                        }}
                      >
                        Go to the first missing reason
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <HoldToSnap
                label={`Hold to snap v${version}`}
                approvedLabel={`Approved · v${version} · locked`}
                confirmTitle={`Approve run v${version}?`}
                confirmLabel={`Approve v${version}`}
                summary={summary}
                approved={approved}
                disabled={blocked || snapshot.lines.length === 0}
                onSnap={() => {
                  const at = manilaTime();
                  setApproval({ fingerprint: snapshot.fingerprint, version, at });
                  setStale(false);
                  notify(`Approved · v${version} · locked. Preview only, nothing was sent.`);
                }}
              />

              {approved && approval && (
                <div className="cr-approved" role="status">
                  <p>
                    <Lock size={14} aria-hidden="true" /> Approved by owner · {approval.at} ·
                    fingerprint <span className="s-mono">{approval.fingerprint}</span>
                  </p>
                  <p className="s-note">
                    Preview approval. Nothing was sent. In a live run, the agent checks each
                    approved item before it authorizes anything, and any change needs a new
                    snap.
                  </p>
                  <div className="cr-next">
                    <Link className="s-btn s-btn--sm" to="/app/results">
                      See recipient results <ArrowRight size={14} aria-hidden="true" />
                    </Link>
                    <Link className="s-btn s-btn--sm s-btn--agent" to="/app/agent">
                      <Sparkles size={14} aria-hidden="true" /> Payment agent
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
