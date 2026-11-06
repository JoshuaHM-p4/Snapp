import { Link } from "react-router-dom";
import { ArrowLeft, CircleHelp, Clock3, XCircle } from "lucide-react";
import { SnappLogo } from "../components/SnappLogo";
import { TestnetBadge } from "../app/ui";
import "./status.css";

/**
 * Velo checkout return pages. A redirect is never proof of payment: the
 * collection is confirmed only from a verified webhook or the provider's API.
 */
export function CheckoutResult({ outcome }: { outcome: "success" | "cancel" }) {
  const success = outcome === "success";
  return (
    <div className="s-status">
      <header className="s-status-top">
        <Link to="/" aria-label="Snapp home">
          <SnappLogo release="var(--logo-release)" className="s-status-logo" />
        </Link>
        <TestnetBadge />
      </header>
      <main className="s-status-main" id="main">
        <span className={`s-status-icon ${success ? "is-pending" : "is-cancel"}`} aria-hidden="true">
          {success ? <Clock3 size={28} /> : <XCircle size={28} />}
        </span>
        <h1>{success ? "Checkout received." : "Checkout canceled."}</h1>
        <p className="s-status-lede">
          {success
            ? "Thanks. We're confirming the payment with Velo on Stellar Testnet. The invoice shows paid only after the confirmation arrives, not because you landed on this page."
            : "No payment was taken and nothing is marked as received. You can return to the invoice and start a new checkout whenever you're ready."}
        </p>
        <dl className="s-status-facts">
          <div>
            <dt>Status</dt>
            <dd>{success ? "Awaiting confirmation" : "Canceled by you"}</dd>
          </div>
          <div>
            <dt>Network</dt>
            <dd>Stellar Testnet · no real funds</dd>
          </div>
        </dl>
        <div className="s-status-actions">
          <Link className="s-btn s-btn--primary" to="/app/invoices">
            View invoices
          </Link>
          <Link className="s-btn" to="/">
            <ArrowLeft size={16} aria-hidden="true" /> Snapp home
          </Link>
        </div>
      </main>
    </div>
  );
}

export function NotFound({ inApp = false }: { inApp?: boolean }) {
  const body = (
    <>
      <span className="s-status-icon" aria-hidden="true">
        <CircleHelp size={28} />
      </span>
      <h1>This page doesn't exist.</h1>
      <p className="s-status-lede">The link may be old or mistyped. Nothing was changed.</p>
      <div className="s-status-actions">
        <Link className="s-btn s-btn--primary" to={inApp ? "/app" : "/"}>
          {inApp ? "Back to overview" : "Snapp home"}
        </Link>
      </div>
    </>
  );
  if (inApp) return <div className="s-status-main s-status-main--inline">{body}</div>;
  return (
    <div className="s-status">
      <header className="s-status-top">
        <Link to="/" aria-label="Snapp home">
          <SnappLogo release="var(--logo-release)" className="s-status-logo" />
        </Link>
      </header>
      <main className="s-status-main">{body}</main>
    </div>
  );
}
