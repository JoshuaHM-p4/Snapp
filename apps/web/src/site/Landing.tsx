import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  CircleDashed,
  FolderGit2,
  Hand,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";
import { SnappLogo } from "../components/SnappLogo";
import { useSnappTheme } from "../theme/ThemeProvider";
import { HoldToSnap } from "../app/HoldToSnap";
import { Php, ProofLink, StatusChip, TestnetBadge } from "../app/ui";
import { employees } from "../app/fixtures";
import { formatHours, formatPhp, hourlyPay, sum } from "../app/money";
import { noirProof, proofRoles, repoUrl, veloProof } from "../app/proof";
import "./landing.css";

/* ---------- Sample run used by the hero and the stage scene (fictional) ---------- */
const reviewed: Record<string, number> = { "e-alex-1": 380 }; // owner correction, with reason
const sampleRun = employees
  .filter((e) => e.recipient.verified)
  .map((e) => {
    const amount =
      e.agreement.kind === "fixed"
        ? e.agreement.perCutoff
        : sum(e.entries.map((x) => hourlyPay(reviewed[x.id] ?? x.submitted, (e.agreement as { rate: number }).rate)));
    return { id: e.id, name: e.name, amount };
  });
const runTotal = sum(sampleRun.map((r) => r.amount));
const alex = employees.find((e) => e.id === "emp-alex")!;
const alexRate = (alex.agreement as { rate: number }).rate;

/** Reveal once when the element scrolls into view. */
function useInView<T extends Element>(threshold = 0.25) {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    if (!("IntersectionObserver" in window)) return setSeen(true);
    const io = new IntersectionObserver(
      (entries) => entries.some((e) => e.isIntersecting) && setSeen(true),
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [seen, threshold]);
  return [ref, seen] as const;
}

/* ---------- Hero supergraphic: the Slip S, waiting for the visitor's release ---------- */
function Supergraphic({ state }: { state: "idle" | "holding" | "snapped" }) {
  return (
    <div className="ld-super" data-state={state} aria-hidden="true">
      <svg viewBox="-17.5 -39.5 30 34" fill="none" strokeWidth={7}>
        <path className="ld-super-track" d="M9 -27A9 9 0 1 0 0 -18" />
        <path className="ld-super-prep" d="M9 -27A9 9 0 1 0 0 -18" />
        <path className="ld-super-ghost" d="M4 -18A9 9 0 1 1 -5 -9" />
        <path className="ld-super-release" d="M4 -18A9 9 0 1 1 -5 -9" />
      </svg>
      <span className="ld-super-gap">
        {state === "snapped" && (
          <>
            <i />
            <i />
            <i />
          </>
        )}
      </span>
    </div>
  );
}

function Hero() {
  const { sound, setSound } = useSnappTheme();
  const [state, setState] = useState<"idle" | "holding" | "snapped">("idle");
  const [at, setAt] = useState("");
  return (
    <section className="ld-hero" aria-labelledby="hero-title">
      <Supergraphic state={state} />
      <div className="ld-wrap ld-hero-inner">
        <h1 id="hero-title" className="ld-hero-title">
          Pay fast,
          <br />
          in a <span className="ld-snapword">snap.</span>
        </h1>
        <div className="ld-hero-body">
          <p className="ld-hero-lede">
            Snapp turns verified work into one exact pay run. The agent prepares the cutoff. You
            approve it with a single snap. Each payout then settles on its own, with proof.
          </p>

          <div className="ld-run" data-state={state}>
            <div className="ld-run-head">
              <span>Sample run · Nov 1–15, 2026</span>
              <span className="s-mono">v3</span>
            </div>
            <div className="ld-run-total">
              <Php centavos={runTotal} />
              <span className="ld-run-count">{sampleRun.length} recipients</span>
            </div>
            <ul className="ld-run-lines">
              {sampleRun.map((r) => (
                <li key={r.id}>
                  <span>{r.name}</span>
                  <span className="s-mono">{formatPhp(r.amount)}</span>
                </li>
              ))}
            </ul>
            <div className="ld-run-action">
              <HoldToSnap
                size="lg"
                label="Hold to snap"
                approvedLabel="Approved · v3 · locked"
                approved={state === "snapped"}
                confirmTitle="Approve this sample run?"
                confirmLabel="Snap to approve"
                onHoldChange={(h) => setState((s) => (s === "snapped" ? s : h ? "holding" : "idle"))}
                onSnap={() => {
                  setState("snapped");
                  setAt(
                    new Date().toLocaleTimeString("en-PH", {
                      timeZone: "Asia/Manila",
                      hour: "2-digit",
                      minute: "2-digit",
                    }),
                  );
                }}
                summary={
                  <>
                    <p>
                      Version 3 · {sampleRun.length} recipients · <strong>{formatPhp(runTotal)}</strong>
                    </p>
                    <p className="s-muted">Sample run. Approving it here sends nothing.</p>
                  </>
                }
              />
              <button
                type="button"
                className="ld-sound"
                aria-pressed={sound}
                onClick={() => setSound(!sound)}
              >
                {sound ? <Volume2 size={16} aria-hidden="true" /> : <VolumeX size={16} aria-hidden="true" />}
                Sound {sound ? "on" : "off"}
              </button>
            </div>
            <p className="ld-run-status" aria-live="polite">
              {state === "snapped" ? (
                <>
                  <span className="ld-run-locked">
                    <Check size={14} aria-hidden="true" /> Approved by you at {at} PHT.
                  </span>{" "}
                  That's the only step a person has to take. Sample run, nothing was sent.
                </>
              ) : (
                "Press and hold for under a second. Let go early and nothing happens."
              )}
            </p>
          </div>

          <div className="ld-hero-links">
            <Link className="ld-textlink" to="/app">
              Open the workspace <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <a className="ld-textlink" href="#proof">
              See it on Stellar Testnet <ArrowDown size={16} aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Tension: today's payday ---------- */
const manualSteps = ["Open the bank", "Copy account", "Type the amount", "Authorize"];
function Today() {
  const [ref, seen] = useInView<HTMLDivElement>(0.3);
  const people = employees.map((e) => e.name.split(" ")[0]);
  return (
    <section className="ld-today ld-section" aria-labelledby="today-title">
      <div className="ld-wrap">
        <div className="ld-today-copy">
          <h2 id="today-title" className="ld-h2">
            Payday, one transfer at a time.
          </h2>
          <p className="ld-body">
            In a small service team, the owner reviews everyone's hours, opens the bank, copies each
            person's account details, types each amount and completes the bank's authorization.
            Then does it again for the next person. Every cutoff, twice a month.
          </p>
          <p className="ld-body ld-dim">
            Employees can't easily check the money they get against the hours and rates behind it.
            The owner can't see the actual work behind the hours.
          </p>
        </div>
        <div ref={ref} className="ld-compare" data-seen={seen}>
          <div className="ld-compare-col">
            <p className="ld-compare-label">Today, for {people.length} people</p>
            <ol className="ld-manual">
              {people.flatMap((p, i) =>
                manualSteps.map((step, j) => (
                  <li key={`${p}-${step}`} style={{ "--i": i * manualSteps.length + j } as CSSProperties}>
                    <span className="ld-manual-tick" />
                    <span className="ld-manual-who">{p}</span>
                    <span>{step}</span>
                  </li>
                )),
              )}
            </ol>
            <p className="ld-compare-foot s-mono">{people.length * manualSteps.length} manual steps</p>
          </div>
          <div className="ld-compare-col ld-compare-col--snapp">
            <p className="ld-compare-label">With Snapp</p>
            <div className="ld-one">
              <SnappLogo variant="mark" release="var(--color-volt-400)" className="ld-one-mark" />
              <div>
                <p className="ld-one-title">One reviewed run. One snap.</p>
                <p className="ld-dim">
                  Recipients and amounts come from the hours you approved. Nothing is re-typed.
                </p>
              </div>
            </div>
            <p className="ld-compare-foot ld-dim">
              Your bank's own approval steps stay in place. Snapp doesn't automate banking screens or
              one-time PINs.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- tick, tick, SNAP: the four stages ---------- */
type StageDef = {
  n: string;
  name: string;
  who: string;
  hand: "agent" | "human" | "settled";
  text: string;
  fragment: ReactNode;
};

const stages: StageDef[] = [
  {
    n: "01/",
    name: "Prepare",
    who: "The agent",
    hand: "agent",
    text: "The agent snaps the cutoff into order: hours, agreed rates, deliverables and client feedback, checked and sorted. Anything odd goes to the top for you.",
    fragment: (
      <div className="ld-frag ld-frag--agent">
        <div className="ld-frag-head">
          <span className="ld-agent-ticks" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          Agent · preparing Nov 1–15
        </div>
        {employees
          .flatMap((e) => e.entries.filter((x) => x.agentFlag).map((x) => ({ e, x })))
          .map(({ e, x }) => (
            <div key={x.id} className="ld-frag-row ld-frag-row--flag">
              <StatusChip status="needs_review" label="Flagged" />
              <span>
                <strong>{e.name}</strong> · {x.agentFlag!.note}
              </span>
            </div>
          ))}
        {employees
          .flatMap((e) => e.entries.filter((x) => !x.agentFlag).map((x) => ({ e, x })))
          .slice(0, 3)
          .map(({ e, x }) => (
            <div key={x.id} className="ld-frag-row">
              <StatusChip status="prepared" label="Checked" />
              <span>
                <strong>{e.name}</strong> · {x.project} · {formatHours(x.submitted)}
              </span>
            </div>
          ))}
      </div>
    ),
  },
  {
    n: "02/",
    name: "Review",
    who: "You",
    hand: "human",
    text: "You review hours against the real work. Corrections need a reason, and the original stays on record. Client feedback is context; it never silently holds back hourly pay.",
    fragment: (
      <div className="ld-frag">
        <div className="ld-frag-head">Alex Rivera · Website rebuild</div>
        <div className="ld-review">
          <div>
            <span className="ld-k">Submitted</span>
            <span className="s-mono ld-strike">{formatHours(400)}</span>
          </div>
          <ArrowRight size={18} aria-hidden="true" className="ld-dim" />
          <div>
            <span className="ld-k">Reviewed by you</span>
            <span className="s-mono ld-big">{formatHours(380)}</span>
          </div>
        </div>
        <p className="ld-frag-reason">
          <span className="ld-k">Reason</span> Duplicate time entry on Nov 7
        </p>
        <div className="ld-frag-row">
          <StatusChip status="needs_review" label="Revision requested" />
          <span>Website delivery v2 · context, not a pay gate</span>
        </div>
      </div>
    ),
  },
  {
    n: "03/",
    name: "Snap",
    who: "You",
    hand: "human",
    text: "You approve one locked version: exact recipients, exact amounts, exact total. Change anything afterwards and it becomes a new version that needs a new snap.",
    fragment: (
      <div className="ld-frag ld-frag--snap">
        <div className="ld-frag-head">
          Run v3 · {sampleRun.length} recipients
          <StatusChip status="approved" label="Approved by owner" />
        </div>
        <Php centavos={runTotal} size="xl" />
        <ul className="ld-frag-lines">
          {sampleRun.map((r) => (
            <li key={r.id}>
              <span>{r.name}</span>
              <span className="s-mono">{formatPhp(r.amount)}</span>
            </li>
          ))}
        </ul>
        <p className="ld-dim ld-small">Locked at 09:41 PHT. Edits create v4.</p>
      </div>
    ),
  },
  {
    n: "04/",
    name: "Settle",
    who: "Each recipient",
    hand: "settled",
    text: "Each payout confirms on its own. The agent only executes what you approved. If an outcome is unknown, it's checked and reconciled, never blindly retried.",
    fragment: (
      <div className="ld-frag">
        <div className="ld-frag-head">Per-recipient results · sample</div>
        <div className="ld-frag-row">
          <StatusChip status="claimed" />
          <span>
            <strong>Sam</strong> signed the claim · funds received
          </span>
        </div>
        <div className="ld-frag-row">
          <StatusChip status="authorized" />
          <span>
            <strong>Alex</strong> · authorized, waiting for the claim
          </span>
        </div>
        <div className="ld-frag-row s-hatch">
          <StatusChip status="unconfirmed" />
          <span>
            <strong>Mika</strong> · outcome unknown, don't retry
          </span>
        </div>
        <p className="ld-dim ld-small">Never all green at once unless all of them really are.</p>
      </div>
    ),
  },
];

function Stages() {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries)
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.i));
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);
  const s = stages[active];
  return (
    <section id="how" className="ld-stages ld-section" aria-labelledby="stages-title">
      <div className="ld-wrap">
        <h2 id="stages-title" className="ld-h2 ld-stages-title">
          Tick, tick, <span className="ld-snapword">snap.</span>
        </h2>
        <p className="ld-body ld-stages-lede">
          A finger snap isn't one instant. The finger presses, slips, and the sound rings out.
          Snapp's pay run works the same way: speed comes from the preparation, not from skipping
          steps.
        </p>
        <div className="ld-stages-grid">
          <div className="ld-stages-sticky" data-hand={s.hand} aria-hidden="true">
            <div className="ld-stage-n" key={s.n}>
              {s.n}
            </div>
            <div className="ld-stage-name" key={s.name}>
              {s.name}
            </div>
            <div className="ld-stage-who">
              <span className="ld-stage-dot" />
              {s.who}
            </div>
            <ol className="ld-stage-rail">
              {stages.map((x, i) => (
                <li key={x.name} data-on={i <= active}>
                  {x.n} {x.name}
                </li>
              ))}
            </ol>
          </div>
          <div className="ld-stages-steps">
            {stages.map((x, i) => (
              <div
                key={x.name}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                data-i={i}
                data-active={i === active}
                className="ld-step"
                data-hand={x.hand}
              >
                <h3 className="ld-step-title">
                  <span className="s-mono">{x.n}</span> {x.name}
                  <span className="ld-step-who">{x.who}</span>
                </h3>
                <p className="ld-body">{x.text}</p>
                {x.fragment}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Two hands ---------- */
function Hands() {
  return (
    <section className="ld-hands" aria-labelledby="hands-title">
      <div className="ld-wrap ld-hands-head">
        <h2 id="hands-title" className="ld-h2">
          Color shows whose hand moved it.
        </h2>
      </div>
      <div className="ld-hands-fields">
        <div className="ld-field ld-field--agent">
          <Sparkles size={28} aria-hidden="true" />
          <h3>The agent's hand</h3>
          <p>
            Prepares the cutoff, flags what needs a look, and checks every approved item against
            your policy before it executes.
          </p>
          <ul>
            <li>Never sets a wage</li>
            <li>Never approves hours</li>
            <li>Never changes a recipient or an amount</li>
          </ul>
        </div>
        <div className="ld-field ld-field--human">
          <Hand size={28} aria-hidden="true" />
          <h3>Your hand</h3>
          <p>
            Reviews the hours and the work behind them, then releases one exact, locked run. Only a
            person releases money.
          </p>
          <ul>
            <li>One clear approval per run</li>
            <li>Any change needs a new snap</li>
            <li>Every decision on the record</li>
          </ul>
        </div>
      </div>
      <div className="ld-field ld-field--settled">
        <div className="ld-wrap">
          <p>
            <strong>Only teal means money arrived.</strong> Authorized isn't paid. Paid is when the
            recipient's claim confirms.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ---------- Every peso, traced ---------- */
function Trace() {
  const pay = hourlyPay(380, alexRate);
  return (
    <section className="ld-trace ld-section" aria-labelledby="trace-title">
      <div className="ld-wrap">
        <h2 id="trace-title" className="ld-h2">
          Every peso, traced to the work.
        </h2>
        <p className="ld-body ld-trace-lede">
          Employees see exactly how their pay was calculated: their hours, their rate, every
          correction and why. They see their own pay, never a colleague's.
        </p>
        <p className="ld-equation s-mono" aria-label={`38.0 approved hours times PHP 300.00 equals ${formatPhp(pay)}`}>
          <span>{formatHours(380)}</span>
          <span className="ld-op">×</span>
          <span>{formatPhp(alexRate)}</span>
          <span className="ld-op">=</span>
          <span className="ld-eq-total">{formatPhp(pay)}</span>
        </p>
        <ol className="ld-trace-list">
          <li>
            <span className="ld-k">Hours</span>
            <p>40.0 h submitted. 38.0 h approved by the owner.</p>
            <p className="ld-dim">Reason kept on record: duplicate time entry on Nov 7.</p>
          </li>
          <li>
            <span className="ld-k">Rate</span>
            <p>{formatPhp(alexRate)} per hour</p>
            <p className="ld-dim">Hourly agreement v2, in effect for this cutoff.</p>
          </li>
          <li>
            <span className="ld-k">Work</span>
            <p>Website delivery v2</p>
            <p className="ld-dim">Client asked for a revision. That's context for the owner, not a pay gate.</p>
          </li>
          <li>
            <span className="ld-k">Question it</span>
            <p>Raise a discrepancy from the statement.</p>
            <p className="ld-dim">The original stays. A correction means a new approval.</p>
          </li>
        </ol>
        <Link className="ld-textlink" to="/app/statement">
          Open a sample statement <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}

/* ---------- Proof: the real Testnet record ---------- */
const signerHand: Record<string, string> = {
  owner: "human",
  agent: "agent",
  merchant: "settled",
  client: "neutral",
};
function Proof() {
  const [ref, seen] = useInView<HTMLDivElement>(0.2);
  return (
    <section id="proof" className="ld-proof ld-section" aria-labelledby="proof-title">
      <div className="ld-wrap">
        <div className="ld-proof-head">
          <h2 id="proof-title" className="ld-h2">
            It ran. On Stellar Testnet.
          </h2>
          <p className="ld-body">
            On Nov 6, 2026, an owner-approved 1.5 XLM payout was checked and executed by Snapp's
            agent through Noir, then claimed by the recipient. Every row below is a real transaction
            you can open.
          </p>
        </div>
        <div ref={ref} className="ld-board" data-seen={seen} role="table" aria-label="Recorded Noir Testnet transactions">
          <div className="ld-board-row ld-board-row--head" role="row">
            <span role="columnheader">Stage</span>
            <span role="columnheader">Step</span>
            <span role="columnheader">Signed by</span>
            <span role="columnheader">Ledger</span>
            <span role="columnheader">Transaction</span>
          </div>
          {noirProof.map((p, i) => (
            <div
              key={p.hash}
              className="ld-board-row"
              role="row"
              data-hand={signerHand[p.signer]}
              style={{ "--i": i } as CSSProperties}
            >
              <span role="cell" className="ld-board-stage s-mono">
                {p.stage}
              </span>
              <span role="cell" className="ld-board-step">
                <span className="s-mono">{p.step}</span>
                <small>{p.detail}</small>
              </span>
              <span role="cell" className="ld-board-signer">
                <i />
                {p.signer}
              </span>
              <span role="cell" className="s-mono ld-board-ledger">
                {p.ledger.toLocaleString("en-US")}
              </span>
              <span role="cell">
                <ProofLink hash={p.hash} compact />
              </span>
            </div>
          ))}
        </div>
        <div className="ld-proof-facts">
          <p>
            <span className="ld-k">After the claim</span> Recipient pending 0 · Escrow 3.5 XLM ·
            Recipient +1.5 XLM · all Testnet
          </p>
          <p>
            <span className="ld-k">Roles</span> Owner <span className="s-mono">{proofRoles.owner}</span> · Agent{" "}
            <span className="s-mono">{proofRoles.agent}</span> · Recipient{" "}
            <span className="s-mono">{proofRoles.merchant}</span>
          </p>
        </div>
        <div className="ld-lane">
          <div>
            <p className="ld-k">Separate lane · client collection</p>
            <p>
              A client paid 0.5 XLM through a Velo Testnet checkout this server created. Client money
              never funds payroll and never decides whether someone gets paid.
            </p>
          </div>
          <ProofLink hash={veloProof.hash} />
        </div>
        <Link className="ld-textlink" to="/app/proof">
          Inspect the full record <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}

/* ---------- Built with / honest scope / team ---------- */
const team = [
  { name: "JoshuaHM-p4", role: "Founder · full stack · Noir integration" },
  { name: "JCarloZ24", role: "UI/UX and frontend" },
  { name: "Stobeeney", role: "API integration" },
  { name: "aidantiu", role: "Integration and deployment" },
];
function Closing() {
  return (
    <>
      <section className="ld-section ld-built" aria-labelledby="built-title">
        <div className="ld-wrap">
          <h2 id="built-title" className="ld-h2">
            Built on open rails.
          </h2>
          <ul className="ld-partners">
            <li>
              <img src="/partners/stellar.png" alt="Stellar" loading="lazy" className="ld-logo-stellar" />
              <p>Every money-moving step runs on Stellar Testnet. No real funds.</p>
            </li>
            <li>
              <span className="ld-noir">
                <img src="/partners/noir.png" alt="" loading="lazy" className="ld-logo-noir" />
                Noir
              </span>
              <p>Delegated payouts: device, policy, escrow, agent authorization and recipient claim.</p>
            </li>
            <li>
              <img src="/partners/velo.png" alt="Velo" loading="lazy" className="ld-logo-velo" />
              <p>Client checkout with signed webhooks, in its own lane.</p>
            </li>
            <li>
              <span className="ld-proyekto">Proyekto</span>
              <p>Projects, tasks and invoices stay where the team already works. Snapp sits alongside.</p>
            </li>
          </ul>
        </div>
      </section>

      <section className="ld-section ld-scope" aria-labelledby="scope-title">
        <div className="ld-wrap">
          <h2 id="scope-title" className="ld-h2">
            What's real today.
          </h2>
          <div className="ld-scope-grid">
            <ul>
              <li>
                <Check size={18} aria-hidden="true" /> Owner-approved Noir payout, executed by the agent and
                claimed, on Stellar Testnet
              </li>
              <li>
                <Check size={18} aria-hidden="true" /> Agent decisions: rule checks plus a review model that
                decides to execute, wait or escalate
              </li>
              <li>
                <Check size={18} aria-hidden="true" /> Velo Testnet collection, confirmed from Velo, never from a
                redirect
              </li>
              <li>
                <Check size={18} aria-hidden="true" /> The workspace you can open now, with sample data
              </li>
            </ul>
            <ul className="ld-scope-next">
              <li>
                <CircleDashed size={18} aria-hidden="true" /> Linking Proyekto projects and hours
              </li>
              <li>
                <CircleDashed size={18} aria-hidden="true" /> Sign-in with owner, employee and client roles
              </li>
              <li>
                <CircleDashed size={18} aria-hidden="true" /> Export approved runs to the company bank's
                bulk-upload format
              </li>
              <li>
                <CircleDashed size={18} aria-hidden="true" /> Running approved multi-recipient pay runs from the
                web app
              </li>
            </ul>
          </div>
        </div>
      </section>

      <footer className="ld-footer">
        <div className="ld-wrap">
          <p className="ld-footer-line">Prepare. Release. Snapp.</p>
          <div className="ld-footer-cta">
            <Link className="s-btn s-btn--primary ld-btn-lg" to="/app">
              Open the workspace <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <a className="s-btn ld-btn-lg" href={repoUrl} target="_blank" rel="noreferrer">
              <FolderGit2 size={18} aria-hidden="true" /> Source on GitHub
            </a>
          </div>
          <SnappLogo release="var(--color-volt-400)" className="ld-footer-mark" />
          <div className="ld-footer-meta">
            <ul className="ld-team" aria-label="Team">
              {team.map((t) => (
                <li key={t.name}>
                  <a href={`https://github.com/${t.name}`} target="_blank" rel="noreferrer">
                    {t.name} <ArrowUpRight size={12} aria-hidden="true" />
                  </a>
                  <span>{t.role}</span>
                </li>
              ))}
            </ul>
            <p className="ld-dim">
              Snapp by Prodigitality. Built for the Velo × Noir Agentic Payment Hackathon, 2026.
              Stellar Testnet only; no real funds, payroll records or bank access.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}

function Nav() {
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    const on = () => setSolid(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <header className="ld-nav" data-solid={solid}>
      <div className="ld-wrap ld-nav-inner">
        <Link to="/" aria-label="Snapp home" className="ld-nav-logo">
          <SnappLogo release="var(--color-volt-400)" sting />
        </Link>
        <nav aria-label="Page" className="ld-nav-links">
          <a href="#how">How it works</a>
          <a href="#proof">Proof</a>
          <a href={repoUrl} target="_blank" rel="noreferrer">
            GitHub
          </a>
        </nav>
        <div className="ld-nav-right">
          <TestnetBadge />
          <Link className="s-btn s-btn--sm ld-nav-cta" to="/app">
            Workspace <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Landing() {
  useEffect(() => {
    document.title = "Snapp · Pay fast, in a snap.";
  }, []);
  return (
    <div className="ld">
      <a className="s-skip" href="#hero-title">
        Skip to content
      </a>
      <Nav />
      <main>
        <Hero />
        <Today />
        <Stages />
        <Hands />
        <Trace />
        <Proof />
        <Closing />
      </main>
    </div>
  );
}
