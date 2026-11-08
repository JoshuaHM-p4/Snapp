import { Signature } from "lucide-react";
import type { AutopilotDecisionRecord, NoirOperationRecord } from "@agentpay/shared";
import { operationLabel, phtTime } from "../evidence";
import { formatXlm, middle, xlmToStroops } from "../money";
import { Chip, ProofLink, StatusChip, type Status } from "../ui";
import "./agent.css";

const pct = (n?: number) => (typeof n === "number" ? n.toFixed(2) : "—");

/** One Jev verdict from the journal, with its probabilities against the thresholds. */
export function DecisionCard({ d, n }: { d: AutopilotDecisionRecord; n: number }) {
  const probs = d.details.probabilities ?? {};
  const t = d.details.thresholds ?? {};
  const bars: [string, number | undefined][] = [
    ["routine", probs.routine],
    ["pending", probs.pending],
    ["escalate", probs.escalate],
    ["concern", d.details.concernProbability],
  ];
  return (
    <article className="s-panel ag-decision">
      <header className="ag-decision-head">
        <span
          className={`ag-v s-mono ${d.decision === "EXECUTE" ? "is-agent" : d.decision === "ESCALATE" ? "is-attention" : ""}`}
        >
          {d.decision}
        </span>
        <span className="s-note">
          Verdict {n} · {phtTime(d.created_at)} · {d.stage} stage
        </span>
      </header>
      <p className="ag-decision-reason">
        <strong>{d.reason === "ROUTINE_REVIEW" ? "Routine review." : d.reason}</strong>{" "}
        {d.details.model && (
          <span className="s-muted">
            Jev via <span className="s-mono">{d.details.model}</span>
          </span>
        )}
      </p>
      <dl className="ag-probs">
        {bars.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>
              <span className="ag-bar" aria-hidden="true">
                <i style={{ width: `${Math.round((v ?? 0) * 100)}%` }} data-k={k} />
              </span>
              <span className="s-mono">{pct(v)}</span>
            </dd>
          </div>
        ))}
      </dl>
      <p className="s-note">
        Execute only if routine ≥ <span className="s-mono">{pct(t.routineMin)}</span> and concern ≤{" "}
        <span className="s-mono">{pct(t.concernMax)}</span>. Pending ≥{" "}
        <span className="s-mono">{pct(t.pendingMin)}</span> defers. Input{" "}
        <span className="s-mono" title={d.input_hash}>
          {middle(d.input_hash, 8, 4)}
        </span>
      </p>
    </article>
  );
}

/** Status vocabulary for one journal operation: claim and authorize are money states, the rest are tx states. */
export function operationStatus(o: NoirOperationRecord): Status {
  if (o.state === "failed") return "failed";
  if (o.kind === "claim") return "claimed";
  if (o.kind === "authorize") return "authorized";
  return o.transactionConfirmed ? "tx_confirmed" : "unconfirmed";
}

/** Stroops string from a contract event, formatted; undefined when the event carries no amount. */
export function eventXlm(o: NoirOperationRecord) {
  const amount = o.evidence.events?.[0]?.amount;
  return amount && /^\d+$/.test(amount) ? formatXlm(BigInt(amount)) : undefined;
}

/** Approved amount from the manifest; the server stores whatever was uploaded, so tolerate a blank. */
export function manifestXlm(amountXlm: string) {
  try {
    return formatXlm(xlmToStroops(amountXlm));
  } catch {
    return "—";
  }
}

/** Every operation of a run: who signed, contract event, ledger and the real transaction link. */
export function OperationsTable({ operations }: { operations: NoirOperationRecord[] }) {
  return (
    <div className="s-panel s-panel--flush">
      <div className="s-table-wrap">
        <table className="s-table ag-ops">
          <thead>
            <tr>
              <th scope="col">Operation</th>
              <th scope="col">Signed by</th>
              <th scope="col">Contract event</th>
              <th scope="col" className="num">
                Ledger
              </th>
              <th scope="col">Transaction</th>
            </tr>
          </thead>
          <tbody>
            {operations.map((o) => {
              const meta = operationLabel[o.kind];
              const ev = o.evidence.events?.[0];
              const xlm = eventXlm(o);
              return (
                <tr key={o.id} className={o.kind === "authorize" ? "is-agent-row" : ""}>
                  <td>
                    <span className="s-mono">{meta.step}</span>
                    <small>{meta.what}</small>
                  </td>
                  <td>
                    {meta.signer === "agent" ? (
                      <Chip kind="agent" icon={<Signature size={13} aria-hidden="true" />}>
                        Signed by the agent
                      </Chip>
                    ) : (
                      <span className="ag-signer">{meta.signer}</span>
                    )}
                  </td>
                  <td>
                    <span className="s-mono">{ev?.type ?? "—"}</span>
                    {xlm && <small className="s-mono">{xlm}</small>}
                  </td>
                  <td className="num">{o.ledger ?? "—"}</td>
                  <td>
                    <div className="ag-op-proof">
                      <StatusChip status={operationStatus(o)} />
                      <ProofLink hash={o.tx_hash} compact />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
