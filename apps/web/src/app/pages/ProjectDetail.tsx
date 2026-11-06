import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink, Sparkles } from "lucide-react";
import type { AgentDecision, Project } from "@agentpay/shared";
import { getJson, useApi } from "../api";
import { formatXlm, xlmToStroops } from "../money";
import { ApiState, Chip, PageHeader, Php, StatusChip, type Status } from "../ui";
import "./records.css";

const milestoneStatus: Record<string, Status> = {
  planned: "draft",
  submitted: "needs_review",
  approved: "approved",
  disputed: "disputed",
  paid: "claimed",
};
const decisionLabel: Record<AgentDecision["action"], { label: string; status: Status }> = {
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

export default function ProjectDetailPage() {
  const { id } = useParams();
  const { data, error, loading, retry } = useApi<{ projects: Project[] }>("/api/projects");
  const [decisions, setDecisions] = useState<AgentDecision[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [checkError, setCheckError] = useState("");
  const p = data?.projects.find((x) => x.id === id);

  const runCheck = async () => {
    if (!p) return;
    setBusy(true);
    setCheckError("");
    try {
      const r = await getJson<{ decisions: AgentDecision[] }>(`/api/agent/preview/${p.id}`);
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
          <p className="s-empty">We couldn't find that project. It may have been removed.</p>
        ) : (
          <>
            <PageHeader
              title={p.title}
              lede={`${p.clientName} · ${p.milestones.length} milestones`}
              meta={
                <>
                  <Chip kind={p.status === "active" ? "attention" : "neutral"}>{p.status}</Chip>
                  <Chip>Sample project</Chip>
                </>
              }
              actions={
                <button type="button" className="s-btn s-btn--agent" onClick={runCheck} disabled={busy}>
                  <Sparkles size={16} aria-hidden="true" />
                  {busy ? "Checking…" : decisions ? "Run checks again" : "Run eligibility checks"}
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
                <span className="s-mono">XLM only, never converted from PHP</span>
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
                  <strong>Agent checks complete.</strong> These are eligibility suggestions only. The
                  agent can't approve work or send payments; only an owner-approved, locked run can be
                  executed.
                </div>
              </div>
            )}

            <section className="s-section" aria-labelledby="ms-h">
              <div className="s-section-head">
                <h2 id="ms-h">Milestones and evidence</h2>
                <span className="s-note">This preview never sends payments.</span>
              </div>
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
                        <StatusChip status={milestoneStatus[m.status] ?? "draft"} label={m.status} />
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
                                  <a className="s-link" href={e.url} target="_blank" rel="noreferrer">
                                    {e.type.toUpperCase()} <ExternalLink size={12} aria-hidden="true" />
                                  </a>{" "}
                                  <span className="s-muted">· {e.passed ? "check passed" : "check failed"}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="s-muted">No evidence submitted yet.</p>
                          )}
                        </div>
                        <div>
                          <p className="s-label">Demo item</p>
                          <p className="s-mono">{safeXlm(m.testnetAmountXlm)}</p>
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
            </section>
          </>
        )}
      </ApiState>
    </div>
  );
}
