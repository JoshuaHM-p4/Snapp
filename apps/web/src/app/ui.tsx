import { useState, type CSSProperties, type ReactNode } from "react";
import {
  ArrowDownToLine,
  Check,
  CheckCheck,
  CircleDashed,
  CircleHelp,
  Copy,
  ExternalLink,
  Eye,
  FlaskConical,
  Lock,
  MessageCircleWarning,
  Pause,
  RotateCw,
  Signature,
  Sparkles,
  TriangleAlert,
  X,
} from "lucide-react";
import { SnappLoading } from "../components/ui/SnappLoading";
import { explorerTx } from "./proof";
import { middle, phpNumber, phpSpoken, type Centavos } from "./money";

/** Payment status vocabulary from SNAPP_BRAND.md §10. Icon + label, never colour alone. */
export const statusSpec = {
  draft: { label: "Draft", kind: "neutral", Icon: CircleDashed },
  needs_review: { label: "Needs review", kind: "attention", Icon: Eye },
  disputed: { label: "Disputed", kind: "attention", Icon: MessageCircleWarning },
  prepared: { label: "Prepared by agent", kind: "agent", Icon: Sparkles },
  approved: { label: "Approved", kind: "human", Icon: Lock },
  authorized: { label: "Authorized", kind: "agent", Icon: Signature },
  claimed: { label: "Claimed", kind: "settled", Icon: ArrowDownToLine },
  reconciled: { label: "Reconciled", kind: "reconciled", Icon: CheckCheck },
  held: { label: "Held", kind: "held", Icon: Pause },
  failed: { label: "Failed", kind: "stop", Icon: X },
  unconfirmed: { label: "Unconfirmed", kind: "unconfirmed", Icon: CircleHelp },
  confirmed: { label: "Confirmed", kind: "settled", Icon: Check },
  /** On-chain transaction confirmed; not money arrival, so never teal. */
  tx_confirmed: { label: "Tx confirmed", kind: "neutral", Icon: Check },
} as const;
export type Status = keyof typeof statusSpec;

export function StatusChip({
  status,
  label,
  flipKey,
}: {
  status: Status;
  label?: string;
  flipKey?: string | number;
}) {
  const { label: base, kind, Icon } = statusSpec[status];
  return (
    <span
      key={flipKey}
      className={`s-chip s-chip--${kind} ${flipKey !== undefined ? "s-chip-flip" : ""}`}
    >
      <Icon aria-hidden="true" />
      {label ?? base}
    </span>
  );
}

export function Chip({
  kind = "neutral",
  icon,
  children,
}: {
  kind?: "neutral" | "agent" | "human" | "attention" | "settled" | "stop";
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <span className={`s-chip s-chip--${kind}`}>
      {icon}
      {children}
    </span>
  );
}

/**
 * Context, not state: timezone, run version, "Sample data", lane names. Quiet inline text so the
 * status chips keep their meaning.
 */
export function Meta({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <span className="s-meta">
      {icon}
      {children}
    </span>
  );
}

export function TestnetBadge() {
  return (
    <span className="s-chip s-chip--testnet" title="Stellar Testnet only. No real funds.">
      <FlaskConical aria-hidden="true" />
      Testnet
    </span>
  );
}

/** PHP amount: Geist Mono, tabular, code before the number, spoken in full. */
export function Php({
  centavos,
  size,
  className = "",
}: {
  centavos: Centavos;
  size?: "xl";
  className?: string;
}) {
  return (
    <span
      className={`s-amount ${size === "xl" ? "s-amount-xl" : ""} ${className}`}
      aria-label={phpSpoken(centavos)}
    >
      <span className="s-amount-code" aria-hidden="true">
        PHP
      </span>
      <span aria-hidden="true">{phpNumber(centavos)}</span>
    </span>
  );
}

export function CopyButton({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="s-btn s-btn--quiet s-btn--sm"
      style={{ minWidth: 36, padding: 0, minHeight: 36 }}
      aria-label={done ? `${label} copied` : `Copy ${label}`}
      title={value}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          setDone(false);
        }
      }}
    >
      {done ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
    </button>
  );
}

/** Real transaction link only. Never pass a placeholder hash. */
export function ProofLink({ hash, compact = false }: { hash: string; compact?: boolean }) {
  return (
    <span className="s-proof">
      <a
        className="s-proof-link"
        href={explorerTx(hash)}
        target="_blank"
        rel="noreferrer"
        title={hash}
      >
        <span className="s-mono">{middle(hash, 8, 4)}</span>
        {!compact && <span className="s-proof-where">Stellar Expert · Testnet</span>}
        <ExternalLink size={14} aria-hidden="true" />
        <span className="s-visually-hidden">(opens in a new tab)</span>
      </a>
      <CopyButton value={hash} label="transaction hash" />
    </span>
  );
}

export const STAGES = ["Prepare", "Review", "Snap", "Settle"] as const;
export type Stage = (typeof STAGES)[number];

/** 01/ Prepare · 02/ Review · 03/ Snap · 04/ Settle, slip divider between Review and Snap. */
export function StageIndex({
  current,
  actor = "human",
}: {
  current?: Stage;
  actor?: "human" | "agent";
}) {
  return (
    <ol
      className="s-stages"
      aria-label="Pay-run stage"
      style={
        actor === "agent"
          ? ({ "--stage-color": "var(--agent)" } as CSSProperties)
          : undefined
      }
    >
      {STAGES.map((s, i) => (
        <li key={s} aria-current={s === current ? "step" : undefined}>
          {i === 2 && <span className="s-stage-slip" aria-hidden="true" />}
          0{i + 1}/ {s}
        </li>
      ))}
    </ol>
  );
}

export function PreviewNotice({ children }: { children: ReactNode }) {
  return (
    <div className="s-notice s-notice--attention" role="note">
      <TriangleAlert size={16} aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}

export function PageHeader({
  title,
  lede,
  stage,
  actions,
  meta,
}: {
  title: string;
  lede?: ReactNode;
  stage?: Stage;
  actions?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <header className="s-page-head">
      {stage && <StageIndex current={stage} />}
      <div className="s-page-head-row">
        <div className="s-page-head-text">
          <h1>{title}</h1>
          {lede && <p className="s-page-lede">{lede}</p>}
        </div>
        {actions && <div className="s-page-actions">{actions}</div>}
      </div>
      {meta && <div className="s-page-meta">{meta}</div>}
    </header>
  );
}

/** Loading / error / empty wrapper for API-backed sections. Never fabricates success. */
export function ApiState({
  loading,
  error,
  empty,
  emptyText,
  onRetry,
  children,
}: {
  loading: boolean;
  error: string;
  empty?: boolean;
  emptyText?: string;
  onRetry?: () => void;
  children: ReactNode;
}) {
  if (loading)
    return (
      <div className="s-api-state">
        <SnappLoading label="Loading from the demo server" />
        <p className="s-note">
          The free demo server sleeps when idle. The first request can take up to a minute.
        </p>
      </div>
    );
  if (error)
    return (
      <div className="s-notice s-notice--stop" role="alert">
        <TriangleAlert size={16} aria-hidden="true" />
        <div>
          <strong>We couldn't load this.</strong> The demo server didn't respond ({error}).
          Nothing was changed. Try again in a moment.
          {onRetry && (
            <div style={{ marginTop: 10 }}>
              <button type="button" className="s-btn s-btn--sm" onClick={onRetry}>
                <RotateCw size={14} aria-hidden="true" /> Try again
              </button>
            </div>
          )}
        </div>
      </div>
    );
  if (empty) return <p className="s-empty">{emptyText ?? "Nothing here yet."}</p>;
  return <>{children}</>;
}
