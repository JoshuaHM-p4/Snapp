import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Sparkles } from "lucide-react";
import type { Collection, Project } from "@agentpay/shared";
import { useApi } from "../api";
import { useNoirEvidence } from "../evidence";
import { cutoff, employees } from "../fixtures";
import { hourlyPay, sum } from "../money";
import { noirProof } from "../proof";
import { ApiState, Meta, PageHeader, Php, ProofLink, StatusChip } from "../ui";
import "./records.css";

const flagged = employees.flatMap((e) => e.entries.filter((x) => x.agentFlag)).length;
const verified = employees.filter((e) => e.recipient.verified);
const preparedTotal = sum(
  verified.map((e) =>
    e.agreement.kind === "fixed"
      ? e.agreement.perCutoff
      : sum(e.entries.map((x) => hourlyPay(x.submitted, (e.agreement as { rate: number }).rate))),
  ),
);

const stages = [
  {
    n: "01/",
    name: "Prepare",
    who: "Agent",
    text: `Hours, rates and deliverables for ${employees.length} people, sorted and checked. ${flagged} entries flagged.`,
    to: "/app/cutoffs",
    status: "prepared" as const,
  },
  {
    n: "02/",
    name: "Review",
    who: "You",
    text: "Check submitted hours against the work. Correct with a reason; originals are kept.",
    to: "/app/cutoffs",
    status: "needs_review" as const,
  },
  {
    n: "03/",
    name: "Snap",
    who: "You",
    text: "Approve one locked version: exact recipients, amounts and total. Any change needs a new snap.",
    to: "/app/cutoffs#snap",
    status: "draft" as const,
  },
  {
    n: "04/",
    name: "Settle",
    who: "Each recipient",
    text: "Every payout confirms on its own. Unknown outcomes are reconciled, never retried blindly.",
    to: "/app/results",
    status: "draft" as const,
  },
];

export default function OverviewPage() {
  const { data, error, loading, retry } = useApi<{ projects: Project[] }>("/api/projects");
  const collections = useApi<{ collections: Collection[] }>("/api/collections");
  const evidence = useNoirEvidence();
  const authorize = noirProof.find((p) => p.step === "authorize")!;
  const claim = noirProof.find((p) => p.step === "claim")!;
  return (
    <div className="s-page">
      <PageHeader
        stage="Review"
        title={`${cutoff.label} cutoff`}
        lede={
          <>
            {verified.length} recipients prepared · {flagged} entries flagged by the agent · ready
            for your review.
          </>
        }
        actions={
          <Link className="s-btn s-btn--primary" to="/app/cutoffs">
            Review hours <ArrowRight size={16} aria-hidden="true" />
          </Link>
        }
        meta={
          <>
            <StatusChip status="prepared" />
            <Meta>Sample data</Meta>
            <Meta>{cutoff.timezone}</Meta>
          </>
        }
      />

      <section className="rc-hero s-panel" aria-label="Prepared run">
        <div>
          <p className="s-label">Prepared, not approved</p>
          <Php centavos={preparedTotal} size="xl" />
          <p className="s-muted">
            Before your review, at submitted hours. One recipient is held until their wallet is
            verified.
          </p>
        </div>
        <div className="rc-agent-note">
          <Sparkles size={18} aria-hidden="true" />
          <p>
            <strong>Agent:</strong> {flagged} time entries need context before you approve. Flagged
            rows are at the top of the review.
          </p>
        </div>
      </section>

      <section className="rc-counts" aria-label="Recorded activity">
        <Link to="/app/agent" className="s-panel rc-count">
          <span className="s-label">Recorded Noir transactions</span>
          <span className="rc-count-n s-mono">{evidence.data ? evidence.data.operations.length : "…"}</span>
          <span className="s-row-sub">
            {evidence.data
              ? `${evidence.data.operations.filter((o) => o.transactionConfirmed).length} confirmed · ${evidence.data.decisions.length} agent verdicts`
              : evidence.error
                ? "Snapshot unavailable"
                : "Loading the recorded run"}
          </span>
          <span className="rc-card-cta">
            Payment agent <ArrowRight size={16} aria-hidden="true" />
          </span>
        </Link>
        <Link to="/app/invoices" className="s-panel rc-count">
          <span className="s-label">Client collections</span>
          <span className="rc-count-n s-mono">
            {collections.data ? collections.data.collections.length : collections.error ? "—" : "…"}
          </span>
          <span className="s-row-sub">
            {collections.data
              ? `${collections.data.collections.filter((c) => c.status === "paid").length} collected via Velo Testnet`
              : collections.error
                ? "Demo server didn't respond"
                : "Waking the demo server, this can take 30 s"}
          </span>
          <span className="rc-card-cta">
            Invoices &amp; collections <ArrowRight size={16} aria-hidden="true" />
          </span>
        </Link>
      </section>

      <section className="s-section" aria-labelledby="stages-h">
        <h2 id="stages-h">This cutoff, step by step</h2>
        <ol className="rc-stages">
          {stages.map((s) => (
            <li key={s.name}>
              <Link to={s.to} className="rc-stage">
                <span className="rc-stage-n s-mono">{s.n}</span>
                <span className="rc-stage-name">{s.name}</span>
                <span className="rc-stage-who">{s.who}</span>
                <span className="rc-stage-text">{s.text}</span>
                <StatusChip status={s.status} />
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <div className="rc-split">
        <section className="s-section" aria-labelledby="projects-h">
          <div className="s-section-head">
            <h2 id="projects-h">Active projects</h2>
            <Link className="s-link" to="/app/projects">
              All projects
            </Link>
          </div>
          <div className="s-panel s-panel--flush">
            <ApiState
              loading={loading}
              error={error}
              onRetry={retry}
              empty={!data?.projects.length}
              emptyText="No projects yet."
            >
              {data?.projects.map((p) => (
                <Link key={p.id} to={`/app/projects/${p.id}`} className="s-row rc-row-link">
                  <span>
                    <span className="s-row-title">{p.title}</span>
                    <span className="s-row-sub" style={{ display: "block" }}>
                      {p.clientName} · {p.milestones.length} milestones
                    </span>
                  </span>
                  <span className="rc-row-end">
                    <Php centavos={p.clientAmountPhp * 100} />
                    <ArrowRight size={16} aria-hidden="true" />
                  </span>
                </Link>
              ))}
            </ApiState>
          </div>
        </section>

        <section className="s-section" aria-labelledby="proof-h">
          <div className="s-section-head">
            <h2 id="proof-h">Latest Testnet proof</h2>
            <Link className="s-link" to="/app/proof">
              Full record
            </Link>
          </div>
          <div className="s-panel rc-proof">
            <div>
              <StatusChip status="authorized" />
              <p className="rc-proof-line">Agent authorized 1.5 XLM · Testnet</p>
              <ProofLink hash={authorize.hash} />
            </div>
            <div>
              <StatusChip status="claimed" />
              <p className="rc-proof-line">Merchant claimed the pending funds</p>
              <ProofLink hash={claim.hash} />
            </div>
            <p className="s-note">
              Real transactions, Nov 6, 2026. Confirmed by RPC with matching contract events.{" "}
              <a
                className="s-link"
                href="https://stellar.expert/explorer/testnet"
                target="_blank"
                rel="noreferrer"
              >
                Stellar Expert <ArrowUpRight size={12} aria-hidden="true" />
              </a>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
