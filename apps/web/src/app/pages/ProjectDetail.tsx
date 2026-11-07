import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink, Sparkles } from "lucide-react";
import type { AgentDecision, Milestone, Project } from "@agentpay/shared";
import { SnappTabs } from "../../components/ui/SnappControls";
import {
  GanttChart,
  OutcomeSummary,
  ReportTable,
  type GanttRow,
  type ReportColumn,
} from "../../components/ui/ReportParts";
import { getJson, useApi } from "../api";
import { formatXlm, xlmToStroops } from "../money";
import {
  ApiState,
  Chip,
  PageHeader,
  Php,
  StatusChip,
  type Status,
} from "../ui";
import "./records.css";

const milestoneStatus: Record<string, Status> = {
  planned: "draft",
  submitted: "needs_review",
  approved: "approved",
  disputed: "disputed",
  paid: "claimed",
};
const decisionLabel: Record<
  AgentDecision["action"],
  { label: string; status: Status }
> = {
  hold: { label: "Hold", status: "held" },
  human_review: { label: "Needs you", status: "needs_review" },
  pay: { label: "Eligible", status: "prepared" },
};
const safeXlm = (v: string) => {
  try {
    return formatXlm(xlmToStroops(v));
  } catch {
    return `${v} XLM · Testnet`;
  }
};

const VIEWS = ["Cards", "Timeline", "Table"] as const;
type View = (typeof VIEWS)[number];
const isoDay = (v: string) => v.slice(0, 10);
const day = (v: string) =>
  new Date(`${isoDay(v)}T00:00:00Z`).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
const evidenceLine = (m: Milestone) =>
  m.evidence.length
    ? `${m.evidence.filter((e) => e.passed).length} of ${m.evidence.length} checks passed`
    : "No evidence yet";

/**
 * Milestones record only a due date. Each bar runs from the previous milestone's due date
 * to its own; the earliest has nothing before it, so it shows as a due-date marker.
 */
function timelineRows(milestones: Milestone[]): GanttRow[] {
  const sorted = [...milestones].sort((a, b) =>
    isoDay(a.dueDate).localeCompare(isoDay(b.dueDate)),
  );
  const first = sorted.length ? isoDay(sorted[0].dueDate) : "";
  return sorted.map((m) => {
    const before = sorted
      .filter((o) => isoDay(o.dueDate) < isoDay(m.dueDate))
      .pop();
    const start =
      isoDay(m.dueDate) === first
        ? undefined
        : before && isoDay(before.dueDate);
    return {
      id: m.id,
      label: m.title,
      sub: `${m.assignee} · ${evidenceLine(m)}`,
      start,
      end: isoDay(m.dueDate),
      planned: m.status === "planned",
      status: (
        <StatusChip
          status={milestoneStatus[m.status] ?? "draft"}
          label={m.status}
        />
      ),
      window: start
        ? `${day(start)} → ${day(m.dueDate)}`
        : `Due ${day(m.dueDate)}`,
    };
  });
}

export default function ProjectDetailPage() {
  const { id } = useParams();
  const { data, error, loading, retry } = useApi<{ projects: Project[] }>(
    "/api/projects",
  );
  const [decisions, setDecisions] = useState<AgentDecision[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [checkError, setCheckError] = useState("");
  const [view, setView] = useState<View>("Cards");
  const p = data?.projects.find((x) => x.id === id);
  const evidence = p?.milestones.flatMap((m) => m.evidence) ?? [];
  const waiting = p?.milestones.filter((m) => !m.evidence.length).length ?? 0;
  const agentFor = (m: Milestone) =>
    decisions?.find((x) => x.milestoneId === m.id);
  const columns: ReportColumn<Milestone>[] = [
    {
      key: "title",
      label: "Milestone",
      value: (m) => m.title,
      render: (m) => m.title,
    },
    {
      key: "assignee",
      label: "Assignee",
      value: (m) => m.assignee,
      render: (m) => m.assignee,
    },
    {
      key: "due",
      label: "Due",
      value: (m) => isoDay(m.dueDate),
      render: (m) => day(m.dueDate),
      csv: (m) => isoDay(m.dueDate),
    },
    {
      key: "status",
      label: "Status",
      value: (m) => m.status,
      render: (m) => (
        <StatusChip
          status={milestoneStatus[m.status] ?? "draft"}
          label={m.status}
        />
      ),
    },
    {
      key: "evidence",
      label: "Evidence",
      value: (m) =>
        m.evidence.length
          ? m.evidence.filter((e) => e.passed).length / m.evidence.length
          : -1,
      render: (m) => evidenceLine(m),
      csv: (m) => evidenceLine(m),
    },
    {
      key: "agent",
      label: "Agent check",
      render: (m) => {
        const d = agentFor(m);
        return d ? (
          <StatusChip
            status={decisionLabel[d.action].status}
            label={decisionLabel[d.action].label}
          />
        ) : (
          <span className="s-muted">Not run</span>
        );
      },
      csv: (m) => {
        const d = agentFor(m);
        return d ? `${decisionLabel[d.action].label}: ${d.reason}` : "Not run";
      },
    },
    {
      key: "item",
      label: "Demo item",
      numeric: true,
      value: (m) => Number(m.testnetAmountXlm) || 0,
      render: (m) => (
        <span className="s-mono">{safeXlm(m.testnetAmountXlm)}</span>
      ),
      csv: (m) => `${m.testnetAmountXlm} XLM (Testnet)`,
    },
  ];

  const runCheck = async () => {
    if (!p) return;
    setBusy(true);
    setCheckError("");
    try {
      const r = await getJson<{ decisions: AgentDecision[] }>(
        `/api/agent/preview/${p.id}`,
      );
      setDecisions(r.decisions);
    } catch (e) {
      setCheckError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="s-page">
      <Link to="/app/projects" className="rc-back">
        <ArrowLeft size={16} aria-hidden="true" /> Projects
      </Link>
      <ApiState loading={loading} error={error} onRetry={retry}>
        {!p ? (
          <p className="s-empty">
            We couldn't find that project. It may have been removed.
          </p>
        ) : (
          <>
            <PageHeader
              title={p.title}
              lede={`${p.clientName} · ${p.milestones.length} milestones`}
              meta={
                <>
                  <Chip kind={p.status === "active" ? "attention" : "neutral"}>
                    {p.status}
                  </Chip>
                  <Chip>Sample project</Chip>
                </>
              }
              actions={
                <button
                  type="button"
                  className="s-btn s-btn--agent"
                  onClick={runCheck}
                  disabled={busy}
                >
                  <Sparkles size={16} aria-hidden="true" />
                  {busy
                    ? "Checking…"
                    : decisions
                      ? "Run checks again"
                      : "Run eligibility checks"}
                </button>
              }
            />
            <div className="s-grid">
              <div className="s-panel rc-figure">
                <p className="s-label">Client contract</p>
                <Php centavos={p.clientAmountPhp * 100} />
              </div>
              <div className="s-panel rc-figure">
                <p className="s-label">Team allocation</p>
                <Php centavos={p.developerBudgetPhp * 100} />
              </div>
              <div className="s-panel rc-figure">
                <p className="s-label">Testnet demo items</p>
                <span className="s-mono">
                  XLM only, never converted from PHP
                </span>
              </div>
            </div>

            {checkError && (
              <div className="s-notice s-notice--stop" role="alert">
                We couldn't run the checks ({checkError}). Nothing was changed.
              </div>
            )}
            {decisions && (
              <div className="s-notice s-notice--agent" role="status">
                <Sparkles size={16} aria-hidden="true" />
                <div>
                  <strong>Agent checks complete.</strong> These are eligibility
                  suggestions only. The agent can't approve work or send
                  payments; only an owner-approved, locked run can be executed.
                </div>
              </div>
            )}

            <section className="s-section" aria-labelledby="ms-h">
              <div className="s-section-head">
                <h2 id="ms-h">Milestones and evidence</h2>
                <span className="s-note">
                  This preview never sends payments.
                </span>
              </div>
              <div className="s-panel rc-evidence-summary">
                <p className="s-label">Evidence checks</p>
                <OutcomeSummary
                  label="Evidence check outcomes across milestones"
                  items={[
                    {
                      label: "passed",
                      tone: "positive",
                      count: evidence.filter((e) => e.passed).length,
                      description:
                        "Evidence checks that passed. A passed check doesn't approve work or release pay.",
                    },
                    {
                      label: "failed",
                      tone: "negative",
                      count: evidence.filter((e) => !e.passed).length,
                      description:
                        "Evidence checks that failed. The milestone needs a fix before review.",
                    },
                    {
                      label:
                        waiting === 1
                          ? "milestone without evidence"
                          : "milestones without evidence",
                      tone: "pending",
                      count: waiting,
                      description:
                        "Milestones with no evidence submitted yet. No outcome is known.",
                    },
                  ]}
                />
              </div>
              <SnappTabs
                label="Milestone view"
                options={VIEWS}
                value={view}
                onChange={(v) => setView(v as View)}
                panelId="ms-panel"
              />
              <div
                id="ms-panel"
                role="tabpanel"
                aria-labelledby={`ms-panel-${VIEWS.indexOf(view)}`}
                className="rc-ms-panel"
              >
                {view === "Timeline" && (
                  <div className="s-panel">
                    <GanttChart
                      rows={timelineRows(p.milestones)}
                      label={`${p.title} milestone timeline`}
                      today={new Date().toISOString()}
                    />
                    <p className="s-note rc-ms-foot">
                      Milestones record a due date only. Each bar runs from the
                      previous milestone's due date to its own; the first shows
                      its due date alone.
                    </p>
                  </div>
                )}
                {view === "Table" && (
                  <div className="s-panel s-panel--flush">
                    <ReportTable
                      rows={p.milestones}
                      columns={columns}
                      rowKey={(m) => m.id}
                      caption={`${p.title} milestones`}
                      csvName={`snapp-${p.id}-milestones.csv`}
                      initialSort={{ key: "due" }}
                    />
                  </div>
                )}
                {view === "Cards" && (
                  <ol className="rc-milestones">
                    {p.milestones.map((m) => {
                      const d = decisions?.find((x) => x.milestoneId === m.id);
                      return (
                        <li key={m.id} className="s-panel rc-milestone">
                          <div className="rc-milestone-head">
                            <div>
                              <h3>{m.title}</h3>
                              <p className="s-row-sub">
                                {m.assignee} · Due {m.dueDate}
                              </p>
                            </div>
                            <StatusChip
                              status={milestoneStatus[m.status] ?? "draft"}
                              label={m.status}
                            />
                          </div>
                          <div className="rc-milestone-body">
                            <div>
                              <p className="s-label">Acceptance criteria</p>
                              <ul className="rc-list">
                                {m.acceptanceCriteria.map((c) => (
                                  <li key={c}>{c}</li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <p className="s-label">Evidence</p>
                              {m.evidence.length ? (
                                <ul className="rc-list">
                                  {m.evidence.map((e) => (
                                    <li key={e.url}>
                                      <a
                                        className="s-link"
                                        href={e.url}
                                        target="_blank"
                                        rel="noreferrer"
                                      >
                                        {e.type.toUpperCase()}{" "}
                                        <ExternalLink
                                          size={12}
                                          aria-hidden="true"
                                        />
                                      </a>{" "}
                                      <span className="s-muted">
                                        ·{" "}
                                        {e.passed
                                          ? "check passed"
                                          : "check failed"}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="s-muted">
                                  No evidence submitted yet.
                                </p>
                              )}
                            </div>
                            <div>
                              <p className="s-label">Demo item</p>
                              <p className="s-mono">
                                {safeXlm(m.testnetAmountXlm)}
                              </p>
                            </div>
                          </div>
                          {d && (
                            <div className="rc-decision" aria-live="polite">
                              <Sparkles size={16} aria-hidden="true" />
                              <span>
                                <strong>Agent:</strong> {d.reason}.
                              </span>
                              <StatusChip
                                status={decisionLabel[d.action].status}
                                label={decisionLabel[d.action].label}
                                flipKey={d.action}
                              />
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                )}
              </div>
            </section>
          </>
        )}
      </ApiState>
    </div>
  );
}
