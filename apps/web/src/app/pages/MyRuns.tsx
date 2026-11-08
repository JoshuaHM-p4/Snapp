import { Lock } from "lucide-react";
import type { RunView } from "@agentpay/shared";
import { useApi } from "../api";
import { useSession } from "../auth/session";
import { phtDay as day, phtTime } from "../evidence";
import { middle } from "../money";
import { ApiState, Chip, CopyButton, PageHeader, TestnetBadge } from "../ui";
import { DecisionCard, manifestXlm, OperationsTable } from "./RunEvidence";
import "../auth/auth.css";

function Run({ run }: { run: RunView }) {
  const m = run.manifest;
  return (
    <section className="s-panel rn-run" aria-labelledby={`run-${run.id}`}>
      <header className="rn-run-head">
        <h2 id={`run-${run.id}`} className="s-mono">
          {m.id}
        </h2>
        <span className="s-note">
          Journal uploaded {day(run.uploadedAt)} · digest{" "}
          <span className="s-mono" title={run.digest}>
            {middle(run.digest, 8, 4)}
          </span>
        </span>
      </header>
      <dl className="s-kv">
        <dt>Approved amount</dt>
        <dd className="s-amount">{manifestXlm(m.amountXlm)}</dd>
        <dt>Recipient (merchant)</dt>
        <dd>
          <span className="s-mono" title={m.merchant}>
            {middle(m.merchant, 6, 4)}
          </span>{" "}
          <CopyButton value={m.merchant} label="recipient address" />
        </dd>
        <dt>Agent</dt>
        <dd>
          <span className="s-mono" title={m.agent}>
            {middle(m.agent, 6, 4)}
          </span>
        </dd>
        <dt>Device hash</dt>
        <dd>
          <span className="s-mono" title={m.deviceHash}>
            {middle(m.deviceHash, 8, 4)}
          </span>
        </dd>
        <dt>Approval expires</dt>
        <dd>
          {day(m.expiresAt)} · {phtTime(m.expiresAt)}
        </dd>
      </dl>
      <div className="s-section">
        <h3 className="s-label">Operations · {run.operations.length}</h3>
        <OperationsTable operations={run.operations} />
      </div>
      <div className="s-section">
        <h3 className="s-label">Agent decision log · {run.decisions.length}</h3>
        {run.decisions.length ? (
          <div className="ag-decisions">
            {run.decisions.map((d, i) => (
              <DecisionCard key={d.id} d={d} n={i + 1} />
            ))}
          </div>
        ) : (
          <p className="s-empty">No agent verdicts were recorded for this run.</p>
        )}
      </div>
    </section>
  );
}

/** Owner view: every run this wallet approved, straight from the uploaded journal. */
export default function MyRunsPage() {
  const { session } = useSession();
  const { data, error, loading, retry } = useApi<{ runs: RunView[] }>("/api/runs");
  return (
    <div className="s-page">
      <PageHeader
        title="Your runs"
        lede="Runs where this wallet is the owner who approved the item. Every row is a confirmed Stellar Testnet transaction from the operator's journal; nothing here is live state or real money."
        meta={
          <>
            <Chip kind="human" icon={<Lock size={13} aria-hidden="true" />}>
              Owner · {session ? middle(session.address, 6, 4) : ""}
            </Chip>
            <TestnetBadge />
          </>
        }
      />
      <ApiState
        loading={loading}
        error={error}
        empty={data?.runs.length === 0}
        emptyText="No uploaded run names this wallet as owner yet."
        onRetry={retry}
      >
        {data?.runs.map((run) => <Run key={run.id} run={run} />)}
      </ApiState>
    </div>
  );
}
