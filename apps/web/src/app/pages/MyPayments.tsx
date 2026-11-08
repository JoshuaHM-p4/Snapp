import { ArrowDownToLine, Signature } from "lucide-react";
import type { NoirOperationRecord, RunView } from "@agentpay/shared";
import { useApi } from "../api";
import { useSession } from "../auth/session";
import { phtDay as day, phtTime } from "../evidence";
import { middle } from "../money";
import { ApiState, Chip, PageHeader, ProofLink, StatusChip, TestnetBadge } from "../ui";
import { eventXlm, manifestXlm, operationStatus } from "./RunEvidence";
import "../auth/auth.css";

function Step({
  title,
  what,
  op,
  fallbackXlm,
  pending,
}: {
  title: string;
  what: string;
  op: NoirOperationRecord | undefined;
  fallbackXlm?: string;
  pending: string;
}) {
  const xlm = op ? (eventXlm(op) ?? fallbackXlm) : undefined;
  return (
    <div className="rn-amount">
      <span className="s-label">{title}</span>
      {op ? (
        <>
          <span className="s-amount">{xlm ?? "—"}</span>
          <span className="s-note">
            {what} · {day(op.created_at)} · {phtTime(op.created_at)}
            {op.ledger !== null && (
              <>
                {" "}
                · ledger <span className="s-mono">{op.ledger}</span>
              </>
            )}
          </span>
          <div className="rn-amount-foot">
            <StatusChip status={operationStatus(op)} />
            <ProofLink hash={op.tx_hash} compact />
          </div>
        </>
      ) : (
        <>
          <span className="s-amount s-muted">—</span>
          <span className="s-note">{pending}</span>
        </>
      )}
    </div>
  );
}

function Payment({ run }: { run: RunView }) {
  const m = run.manifest;
  const authorize = run.operations.find((o) => o.kind === "authorize");
  const claim = run.operations.find((o) => o.kind === "claim");
  const approved = manifestXlm(m.amountXlm);
  return (
    <section className="s-panel rn-run" aria-labelledby={`pay-${run.id}`}>
      <header className="rn-run-head">
        <h2 id={`pay-${run.id}`} className="s-mono">
          {m.id}
        </h2>
        <span className="s-note">
          From owner{" "}
          <span className="s-mono" title={m.owner}>
            {middle(m.owner, 6, 4)}
          </span>{" "}
          · approved {approved}
        </span>
      </header>
      <div className="rn-amounts">
        <Step
          title="Authorization"
          what="The agent authorized the approved item to your address"
          op={authorize}
          fallbackXlm={approved}
          pending="Not authorized yet. Nothing is pending for you from this run."
        />
        <Step
          title="Claim"
          what="You signed the claim; the escrow released pending funds to you"
          op={claim}
          pending="Not claimed yet. An authorization is a pending amount, not a receipt, until you claim it."
        />
      </div>
      <p className="s-note">
        Authorization and claim are two separate on-chain steps. The claim collects every pending
        amount for your address at once, so its figure can differ from a single authorization.
        Approval expires {day(m.expiresAt)}.
      </p>
    </section>
  );
}

/** Developer view: what was authorized to this wallet on Testnet and whether it was claimed. */
export default function MyPaymentsPage() {
  const { session } = useSession();
  const { data, error, loading, retry } = useApi<{ runs: RunView[] }>("/api/runs");
  return (
    <div className="s-page">
      <PageHeader
        title="Your payments"
        lede="Items an owner approved for this wallet and the agent authorized on Stellar Testnet, with the claim that moved the funds. Amounts are XLM from the contract events; every link opens the real transaction."
        meta={
          <>
            <Chip icon={<Signature size={13} aria-hidden="true" />}>
              Developer · {session ? middle(session.address, 6, 4) : ""}
            </Chip>
            <Chip kind="settled" icon={<ArrowDownToLine size={13} aria-hidden="true" />}>
              Claim = funds received
            </Chip>
            <TestnetBadge />
          </>
        }
      />
      <ApiState
        loading={loading}
        error={error}
        empty={data?.runs.length === 0}
        emptyText="No uploaded run pays this wallet yet."
        onRetry={retry}
      >
        {data?.runs.map((run) => <Payment key={run.id} run={run} />)}
      </ApiState>
    </div>
  );
}
