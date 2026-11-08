import type { CSSProperties } from "react";
import { Check, Sparkles } from "lucide-react";
import { noirProof, proofRoles, veloProof, type ProofStep } from "../proof";
import { Chip, Meta, PageHeader, ProofLink, StatusChip } from "../ui";
import "./proof.css";

const stages: { stage: ProofStep["stage"]; index: string; title: string; who: string }[] = [
  { stage: "Prepare", index: "01/", title: "Owner setup", who: "Signed by the owner" },
  { stage: "Snap", index: "03/", title: "Agent authorization", who: "Signed by the agent" },
  { stage: "Settle", index: "04/", title: "Merchant claim", who: "Signed by the merchant" },
];

const signerKind = { owner: "human", agent: "agent", merchant: "neutral", client: "neutral" } as const;

/** Split-flap style tiles for a ledger number. One flip on mount, then static. */
function Flaps({ value, delay }: { value: string; delay: number }) {
  return (
    <span className="pf-flaps" aria-label={value}>
      {value.split("").map((ch, i) => (
        <span
          key={i}
          className="pf-flap"
          aria-hidden="true"
          style={{ "--flap-delay": `${delay + i * 30}ms` } as CSSProperties}
        >
          {ch}
        </span>
      ))}
    </span>
  );
}

function Outcome({ step }: { step: ProofStep }) {
  if (step.step === "claim") return <StatusChip status="claimed" />;
  if (step.step === "authorize") return <StatusChip status="authorized" />;
  return <StatusChip status="tx_confirmed" label="Confirmed" />;
}

function Board({ steps, offset }: { steps: ProofStep[]; offset: number }) {
  return (
    <div className="s-table-wrap">
      <table className="pf-board">
        <thead>
          <tr>
            <th scope="col">Step</th>
            <th scope="col">Signer</th>
            <th scope="col">Ledger</th>
            <th scope="col">Transaction</th>
            <th scope="col">Result</th>
          </tr>
        </thead>
        <tbody>
          {steps.map((s, i) => (
            <tr key={s.hash} className={s.signer === "agent" ? "is-agent" : ""}>
              <td>
                <span className="pf-step s-mono">{s.step}</span>
                <small>{s.detail}</small>
              </td>
              <td>
                <span className={`pf-signer pf-signer--${signerKind[s.signer]}`}>
                  {s.signer === "agent" && <Sparkles size={13} aria-hidden="true" />}
                  {s.signer}
                </span>
              </td>
              <td>
                <Flaps value={String(s.ledger)} delay={(offset + i) * 120} />
              </td>
              <td>
                <ProofLink hash={s.hash} compact />
              </td>
              <td>
                <Outcome step={s} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ProofPage() {
  let offset = 0;
  return (
    <div className="s-page pf-page">
      <PageHeader
        title="Testnet proof"
        lede="One owner-approved 1.5 XLM item, decided by Snapp Autopilot and collected by the merchant on Stellar Testnet, Nov 6, 2026. Every transaction below is real and opens on Stellar Expert."
        meta={
          <>
            <Chip icon={<Check size={13} aria-hidden="true" />}>Confirmed by RPC</Chip>
            <Meta>Contract events matched</Meta>
          </>
        }
      />

      <section className="pf-lane" aria-labelledby="pf-noir">
        <div className="s-section-head">
          <h2 id="pf-noir">Agent payment · Noir</h2>
          <p className="s-note">Device, merchant and amount matched on every decoded event</p>
        </div>
        {stages.map(({ stage, index, title, who }) => {
          const steps = noirProof.filter((s) => s.stage === stage);
          const board = (
            <section key={stage} className={`pf-stage s-panel is-${stage.toLowerCase()}`} aria-label={title}>
              <header className="pf-stage-head">
                <span className="pf-index s-mono">
                  {index} {stage}
                </span>
                <h3>{title}</h3>
                <span className="s-note">{who}</span>
              </header>
              <Board steps={steps} offset={offset} />
              {stage === "Snap" && (
                <div className="pf-decision">
                  <Sparkles size={16} aria-hidden="true" />
                  <p>
                    <strong>Agent decision:</strong> payment eligibility passed, Jev risk review
                    returned <span className="s-mono">routine</span> (P=1.00, concern 0.03), verdict{" "}
                    <span className="s-mono">EXECUTE</span>. The agent acted on the owner's signed
                    approval of this exact item.
                  </p>
                  <Chip kind="human">Approved by owner</Chip>
                </div>
              )}
              {stage === "Settle" && (
                <p className="s-note pf-aggregate">
                  The claim collects everything pending for this merchant at once (aggregate
                  15,000,000 stroops). It isn't one receipt per item.
                </p>
              )}
            </section>
          );
          offset += steps.length;
          return board;
        })}

        <dl className="pf-after s-panel">
          <div>
            <dt>Merchant pending after claim</dt>
            <dd className="s-mono">0 XLM · Testnet</dd>
          </div>
          <div>
            <dt>Escrow remaining</dt>
            <dd className="s-mono">3.5000000 XLM · Testnet</dd>
          </div>
          <div>
            <dt>Merchant balance change</dt>
            <dd className="s-mono pf-settled">+1.5000000 XLM · Testnet</dd>
          </div>
        </dl>

        <dl className="pf-roles">
          {Object.entries(proofRoles).map(([role, key]) => (
            <div key={role}>
              <dt className="s-label">{role === "device" ? "Device hash" : role}</dt>
              <dd className="s-mono">{key}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="pf-lane pf-lane--velo" aria-labelledby="pf-velo">
        <div className="s-section-head">
          <h2 id="pf-velo">Client collection · Velo</h2>
          <Meta>Separate from payroll</Meta>
        </div>
        <div className="s-panel pf-velo">
          <div className="pf-velo-main">
            <p className="pf-step s-mono">{veloProof.step}</p>
            <p className="s-muted">
              A client paid 0.5 XLM through a checkout this server created, and Velo reported it as
              paid. It's a client payment into the business: it doesn't fund the agent's escrow and
              doesn't decide anyone's pay.
            </p>
          </div>
          <div className="pf-velo-link">
            <ProofLink hash={veloProof.hash} />
            <Chip icon={<Check size={13} aria-hidden="true" />}>Paid · Velo confirmed</Chip>
          </div>
        </div>
      </section>

      <p className="s-note">
        Testnet only. No real funds, no Mainnet and no bank payout are shown here. A recorded hash
        alone isn't settlement: each step above was confirmed on the network.
      </p>
    </div>
  );
}
