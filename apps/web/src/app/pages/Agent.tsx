import {
  CirclePause,
  Clock3,
  Gauge,
  Hand,
  Laptop,
  ListChecks,
  Lock,
  OctagonAlert,
  Play,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { ArrowRight } from "lucide-react";
import { secondsBetween, useNoirEvidence } from "../evidence";
import { ApiState, Chip, Meta, PageHeader } from "../ui";
import { DecisionCard, OperationsTable } from "./RunEvidence";
import "./agent.css";

const pipeline = [
  { name: "Owner approval", who: "Owner", hand: "human", text: "Signs one exact item: recipient, amount, asset." },
  { name: "Eligibility Engine", who: "Rules", hand: "neutral", text: "Approval, recipient, cap, expiry, escrow, date." },
  { name: "Jev review", who: "Agent", hand: "agent", text: "Reads feedback and evidence. Can only wait or stop." },
  { name: "Noir authorize", who: "Agent signs", hand: "agent", text: "Executes the approved item on Testnet." },
  { name: "Merchant claim", who: "Recipient", hand: "settled", text: "Recipient signs the claim. Funds arrive." },
] as const;

function Pipeline() {
  return (
    <section className="s-section" aria-labelledby="ag-pipe">
      <h2 id="ag-pipe">How a payout is decided</h2>
      <ol className="ag-pipe">
        {pipeline.map((p, i) => (
          <li key={p.name} className={`ag-pipe-step is-${p.hand}`}>
            <span className="ag-pipe-n s-mono">0{i + 1}</span>
            <span className="ag-pipe-name">{p.name}</span>
            <span className="ag-pipe-who">{p.who}</span>
            <span className="ag-pipe-text">{p.text}</span>
            {i < pipeline.length - 1 && <ArrowRight size={16} aria-hidden="true" className="ag-pipe-arrow" />}
          </li>
        ))}
      </ol>
      <p className="ag-rule">
        Jev can only defer or escalate; it never approves. The owner fixed recipient and amount; the
        agent decided whether and when.
      </p>
    </section>
  );
}

function RecordedRun() {
  const { data, error, loading, retry } = useNoirEvidence();
  const lastExecute = data?.decisions.filter((d) => d.decision === "EXECUTE").at(-1);
  const authorize = data?.operations.find((o) => o.kind === "authorize");
  const lag = secondsBetween(lastExecute?.created_at, authorize?.created_at);
  return (
    <section className="s-section" aria-labelledby="ag-run">
      <div className="s-section-head">
        <h2 id="ag-run">Recorded Testnet run, Nov 6</h2>
        <TempoTicks label="Agent log" />
      </div>
      <ApiState loading={loading} error={error} onRetry={retry}>
        {data && (
          <>
            <p className="s-muted ag-run-lede">
              A snapshot of the operator's journal from one controlled run, not live state. Every
              operation is a confirmed Stellar Testnet transaction with its contract event matched.
            </p>
            {lag !== null && (
              <div className="s-panel ag-measure">
                <span className="s-amount s-amount-xl">{lag} s</span>
                <p className="s-muted">
                  from the agent's final <span className="s-mono">EXECUTE</span> verdict to the
                  recorded authorization, measured from the journal timestamps.
                </p>
              </div>
            )}
            <div className="ag-decisions">
              {data.decisions.map((d, i) => (
                <DecisionCard key={d.id} d={d} n={i + 1} />
              ))}
            </div>
            <OperationsTable operations={data.operations} />
            <p className="s-note">
              Authorization isn't receipt. The merchant's claim is the separate step where funds
              arrive, and it collects all pending funds for that merchant. This preview never sends
              payments.
            </p>
          </>
        )}
      </ApiState>
    </section>
  );
}

const verdicts = [
  {
    id: "EXECUTE",
    Icon: Play,
    tone: "agent",
    meaning: "Authorize now, through the same recorded path as a manual authorization. Once recorded, it never sends again.",
  },
  {
    id: "DEFER",
    Icon: Clock3,
    tone: "neutral",
    meaning: "Check again later: not yet approved, payout date not reached, escrow too low, or the review agent unavailable.",
  },
  {
    id: "ESCALATE",
    Icon: OctagonAlert,
    tone: "attention",
    meaning: "Stop for a person: a dispute, failed evidence, a recipient or amount that differs from the signed approval, an expired approval, or a review that flags concern.",
  },
] as const;

const never = [
  "Set or change anyone's wage",
  "Approve hours",
  "Change a recipient or an amount",
  "Expand an approved run",
];

/** Three Ultraviolet tempo ticks: the agent's thinking indicator. */
function TempoTicks({ label }: { label: string }) {
  return (
    <span className="ag-ticks" role="img" aria-label={label}>
      <i />
      <i />
      <i />
    </span>
  );
}

export default function AgentPage() {
  return (
    <div className="s-page ag-page">
      <PageHeader
        title="Payment agent"
        lede="Snapp Autopilot decides when an item the owner already approved is executed. It checks every rule first and stops for a person whenever something is off."
        meta={
          <>
            <Chip kind="agent" icon={<Sparkles size={13} aria-hidden="true" />}>
              Agent activity
            </Chip>
            <Meta>Recorded evidence snapshot</Meta>
          </>
        }
      />

      <Pipeline />

      <section className="ag-how" aria-labelledby="ag-how">
        <h2 id="ag-how" className="s-visually-hidden">
          How the agent decides
        </h2>
        <article className="s-panel ag-card">
          <ListChecks size={20} aria-hidden="true" className="ag-card-icon" />
          <h3>Payment Eligibility Engine</h3>
          <p className="s-muted">
            Deterministic rules. Checks the owner's signed approval, the exact recipient and amount,
            the policy cap and expiry, escrow balance and the payout date.
          </p>
        </article>
        <article className="s-panel ag-card">
          <Sparkles size={20} aria-hidden="true" className="ag-card-icon is-agent" />
          <h3>Jev · Payout Risk &amp; Review</h3>
          <p className="s-muted">
            Reads the client feedback, evidence and revision notes for the item and reports how
            routine it looks and how much concern it has.
          </p>
        </article>
        <article className="s-panel ag-card ag-card--never">
          <Hand size={20} aria-hidden="true" className="ag-card-icon is-human" />
          <h3>Only the owner decides pay</h3>
          <ul>
            {never.map((n) => (
              <li key={n}>The agent can't {n.charAt(0).toLowerCase() + n.slice(1)}.</li>
            ))}
          </ul>
        </article>
      </section>

      <section className="s-section" aria-labelledby="ag-verdicts">
        <h2 id="ag-verdicts">Verdicts</h2>
        <dl className="ag-verdicts">
          {verdicts.map(({ id, Icon, tone, meaning }) => (
            <div key={id} className={`ag-verdict is-${tone}`}>
              <dt>
                <Icon size={16} aria-hidden="true" />
                <span className="s-mono">{id}</span>
              </dt>
              <dd>{meaning}</dd>
            </div>
          ))}
        </dl>
      </section>

      <RecordedRun />

      <section className="s-section" aria-labelledby="ag-observed">
        <div className="s-section-head">
          <h2 id="ag-observed">Observed test assessments</h2>
          <p className="s-note">Real Jev answers to test items; nothing was paid</p>
        </div>
        <div className="s-panel s-panel--flush">
          <div className="s-table-wrap">
            <table className="s-table">
              <thead>
                <tr>
                  <th scope="col">Situation</th>
                  <th scope="col">Jev</th>
                  <th scope="col" className="num">
                    P
                  </th>
                  <th scope="col" className="num">
                    Concern
                  </th>
                  <th scope="col">Verdict</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Client accepted the work</td>
                  <td className="s-mono">routine</td>
                  <td className="num">1.00</td>
                  <td className="num">0.03</td>
                  <td>
                    <span className="ag-v is-agent s-mono">EXECUTE</span>
                  </td>
                </tr>
                <tr>
                  <td>Tablet revision still open</td>
                  <td className="s-mono">pending</td>
                  <td className="num">0.92</td>
                  <td className="num">0.97</td>
                  <td>
                    <span className="ag-v s-mono">DEFER</span>
                  </td>
                </tr>
                <tr>
                  <td>Completion disputed</td>
                  <td className="s-mono">escalate</td>
                  <td className="num">1.00</td>
                  <td className="num">0.97</td>
                  <td>
                    <span className="ag-v is-attention s-mono">ESCALATE</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="ag-policy" aria-labelledby="ag-policy">
        <article className="s-panel ag-card">
          <Gauge size={20} aria-hidden="true" className="ag-card-icon" />
          <h2 id="ag-policy" className="ag-h3">
            Spending policy
          </h2>
          <dl className="s-kv">
            <dt>Cap per payment</dt>
            <dd className="s-mono">2.0000000 XLM · Testnet</dd>
            <dt>Asset</dt>
            <dd>Native XLM</dd>
            <dt>Expires</dt>
            <dd className="s-mono">2026-11-20</dd>
          </dl>
          <p className="s-note">
            Set by the owner on-chain. Recipient allowlists and run totals are checked by Snapp on
            top of this policy.
          </p>
        </article>
        <article className="s-panel ag-card">
          <CirclePause size={20} aria-hidden="true" className="ag-card-icon" />
          <h2 className="ag-h3">Stop at any time</h2>
          <p className="s-muted">
            Owners can halt new executions at any time. Anything already recorded is reconciled,
            never resent.
          </p>
        </article>
        <article className="s-panel ag-card">
          <Laptop size={20} aria-hidden="true" className="ag-card-icon" />
          <h2 className="ag-h3">Runs on the operator's machine</h2>
          <p className="s-muted">
            The agent signs from the operator's own machine with its own Testnet key. This website
            can't move funds.
          </p>
          <p className="ag-safe">
            <ShieldCheck size={15} aria-hidden="true" /> No signing keys in the browser
          </p>
        </article>
      </section>
    </div>
  );
}
