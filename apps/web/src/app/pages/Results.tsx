import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Building2, RefreshCw } from "lucide-react";
import {
  cutoff,
  employees,
  sampleResults,
  type RecipientOutcome,
} from "../fixtures";
import { formatXlm, xlmToStroops } from "../money";
import { useNotify } from "../toast";
import { Chip, PageHeader, PreviewNotice, StatusChip, type Status } from "../ui";
import "./results.css";

const order: RecipientOutcome[] = ["unconfirmed", "held", "failed", "authorized", "claimed"];
const outcomeStatus: Record<RecipientOutcome, Status> = {
  claimed: "claimed",
  authorized: "authorized",
  unconfirmed: "unconfirmed",
  failed: "failed",
  held: "held",
};
const outcomeWord: Record<RecipientOutcome, string> = {
  claimed: "claimed",
  authorized: "authorized",
  unconfirmed: "unconfirmed",
  failed: "failed",
  held: "held",
};

export default function ResultsPage() {
  const notify = useNotify();
  const [checked, setChecked] = useState<Record<string, string>>({});
  const rows = sampleResults
    .map((r) => ({ ...r, employee: employees.find((e) => e.id === r.employeeId)! }))
    .sort((a, b) => order.indexOf(a.outcome) - order.indexOf(b.outcome));
  const counts = order
    .map((o) => [o, rows.filter((r) => r.outcome === o).length] as const)
    .filter(([, n]) => n > 0);
  const total = rows.reduce((t, r) => t + xlmToStroops(r.employee.testnetItemXlm), 0n);
  const claimed = rows.filter((r) => r.outcome === "claimed").length;
  const unresolved = rows.length - claimed;

  return (
    <div className="s-page">
      <PageHeader
        stage="Settle"
        title="Recipient results"
        lede="Each recipient is executed and reconciled on its own. A run is finished only when every recipient is accounted for."
        meta={
          <>
            <Chip>Sample data</Chip>
            <Chip>
              {cutoff.label} · run v{cutoff.runVersion}
            </Chip>
          </>
        }
      />

      <section className="rr-totals s-panel" aria-labelledby="rr-totals-title">
        <div className="rr-totals-main">
          <h2 id="rr-totals-title" className="s-label rr-totals-title">
            Run outcome
          </h2>
          <p className="rr-totals-line">
            {claimed} of {rows.length} recipients confirmed.{" "}
            <span className="s-muted">{unresolved} still need attention.</span>
          </p>
          <p className="s-mono rr-totals-amount">
            {rows.length} demo items · {formatXlm(total)}
          </p>
        </div>
        <ul className="rr-counts" aria-label="Recipients by outcome">
          {counts.map(([o, n]) => (
            <li key={o}>
              <StatusChip status={outcomeStatus[o]} label={`${n} ${outcomeWord[o]}`} />
            </li>
          ))}
        </ul>
        <div className="rr-bar" aria-hidden="true">
          {rows.map((r) => (
            <span key={r.employeeId} className={`rr-bar-seg is-${r.outcome}`} />
          ))}
        </div>
      </section>

      <section className="s-section" aria-labelledby="rr-list-title">
        <div className="s-section-head">
          <h2 id="rr-list-title">Recipients</h2>
          <p className="s-note">Needs attention first</p>
        </div>
        <ul className="rr-list">
          {rows.map((r) => (
            <li
              key={r.employeeId}
              className={`rr-item s-panel is-${r.outcome} ${r.outcome === "unconfirmed" ? "s-hatch" : ""}`}
            >
              <div className="rr-item-who">
                <p className="s-row-title">{r.employee.name}</p>
                <p className="s-row-sub">{r.employee.recipient.label}</p>
              </div>
              <p className="s-mono rr-item-amount">
                {formatXlm(xlmToStroops(r.employee.testnetItemXlm))}
              </p>
              <div className="rr-item-status">
                <StatusChip status={outcomeStatus[r.outcome]} />
                <span className="s-note">{r.at}</span>
              </div>
              <p className="rr-item-note">
                {r.note}
                {r.outcome === "unconfirmed" && (
                  <strong className="rr-noretry"> Do not retry.</strong>
                )}
              </p>
              {r.outcome === "unconfirmed" && (
                <div className="rr-item-actions">
                  <button
                    type="button"
                    className="s-btn s-btn--sm"
                    onClick={() => {
                      const msg = "Preview check: still unconfirmed. Nothing was resent.";
                      setChecked((c) => ({ ...c, [r.employeeId]: msg }));
                      notify(msg, "warning");
                    }}
                  >
                    <RefreshCw size={14} aria-hidden="true" /> Reconcile
                  </button>
                  <span className="s-note" role="status" aria-live="polite">
                    {checked[r.employeeId] ?? ""}
                  </span>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      <div className="rr-explain">
        <section className="s-panel rr-explain-card" aria-labelledby="rr-partial">
          <h2 id="rr-partial" className="rr-h3">
            Why this run is partial
          </h2>
          <p>
            Authorization is not a claim. Money has arrived only when the recipient signs the claim
            and it's confirmed. An unknown outcome stays unknown until it's reconciled, and it's
            never resent automatically. A held recipient doesn't block the others.
          </p>
          <Link to="/app/proof" className="s-btn s-btn--sm rr-proof-link">
            See real recorded Testnet transactions <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </section>
        <section className="s-panel rr-explain-card rr-bank" aria-labelledby="rr-bank">
          <h2 id="rr-bank" className="rr-h3">
            <Building2 size={18} aria-hidden="true" /> Bank payouts
          </h2>
          <p className="s-muted">
            Planned: export the approved run to your bank's bulk-upload format. Your bank's own
            approval steps stay in place, and each transfer result is recorded per recipient.
          </p>
        </section>
      </div>

      <PreviewNotice>
        Sample data. These results show how outcomes are reported; they aren't real transfers and
        carry no transaction hashes. The Testnet items are separate demo values, not a conversion of
        anyone's pay.
      </PreviewNotice>
    </div>
  );
}
