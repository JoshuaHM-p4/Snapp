import { ExternalLink } from "lucide-react";
import type { Collection, CollectionStatus, Project } from "@agentpay/shared";
import { useApi } from "../api";
import { formatXlm, xlmToStroops } from "../money";
import { ApiState, Chip, PageHeader, Php, ProofLink, StatusChip, type Status } from "../ui";
import "./records.css";

const collectionStatus = (s: CollectionStatus): { status: Status; label: string } => {
  switch (s) {
    case "paid":
      return { status: "confirmed", label: "Collected · confirmed by Velo" };
    case "failed":
      return { status: "failed", label: "Failed" };
    case "expired":
      return { status: "failed", label: "Expired" };
    case "cancelled":
      return { status: "held", label: "Cancelled" };
    case "pending":
      return { status: "unconfirmed", label: "Pending on-chain" };
    case "created":
      return { status: "needs_review", label: "Awaiting client payment" };
    default:
      return { status: "draft", label: "Awaiting route" };
  }
};

const safeXlm = (v: string) => {
  try {
    return formatXlm(xlmToStroops(v));
  } catch {
    return `${v} XLM · Testnet`;
  }
};
const when = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" }) + " PHT";
};

export default function InvoicesPage() {
  const projects = useApi<{ projects: Project[] }>("/api/projects");
  const collections = useApi<{ collections: Collection[] }>("/api/collections");
  return (
    <div className="s-page">
      <PageHeader
        title="Invoices & collections"
        lede="Client invoices live in Proyekto. Snapp can collect a client payment through a Velo Testnet checkout. A collection never funds payroll and never decides whether someone gets paid."
        meta={<Chip>Client lane</Chip>}
      />

      <section className="s-section" aria-labelledby="inv-h">
        <h2 id="inv-h">Invoice snapshots</h2>
        <div className="s-panel s-panel--flush">
          <ApiState
            loading={projects.loading}
            error={projects.error}
            onRetry={projects.retry}
            empty={!projects.data?.projects.length}
            emptyText="No invoices yet."
          >
            <div className="s-table-wrap">
              <table className="s-table">
                <thead>
                  <tr>
                    <th scope="col">Invoice</th>
                    <th scope="col">Client · project</th>
                    <th scope="col" className="num">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.data?.projects.map((p) => (
                    <tr key={p.id}>
                      <td className="s-mono">INV-{p.id.toUpperCase()}</td>
                      <td>
                        {p.clientName}
                        <small>{p.title}</small>
                      </td>
                      <td className="num">
                        <Php centavos={p.clientAmountPhp * 100} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ApiState>
        </div>
      </section>

      <section className="s-section" aria-labelledby="col-h">
        <div className="s-section-head">
          <h2 id="col-h">Client collections (Velo Testnet)</h2>
          <span className="s-note">Status comes from Velo, never from a checkout redirect. A collection isn't invoice settlement or employee pay.</span>
        </div>
        <div className="s-panel s-panel--flush">
          <ApiState
            loading={collections.loading}
            error={collections.error}
            onRetry={collections.retry}
            empty={!collections.data?.collections.length}
            emptyText="No collections recorded on this server yet. Records reset when the demo server redeploys."
          >
            <ul className="rc-collections">
              {collections.data?.collections.map((c) => {
                const s = collectionStatus(c.status);
                return (
                  <li key={c.paymentIntentId} className="s-row">
                    <div>
                      <p className="s-row-title"><span className="s-mono">{safeXlm(c.amountXlm)}</span> <span className="s-muted">· client collection</span></p>
                      <p className="s-row-sub">
                        Project {c.projectId} · intent <span className="s-mono">{c.paymentIntentId}</span> ·{" "}
                        {when(c.updatedAt)}
                      </p>
                    </div>
                    <div className="rc-row-end">
                      {c.status === "created" && c.checkoutUrl && /^https:\/\//.test(c.checkoutUrl) && (
                        <a className="s-link" href={c.checkoutUrl} target="_blank" rel="noreferrer">
                          Velo checkout <ExternalLink size={12} aria-hidden="true" />
                        </a>
                      )}
                      {c.txHash && <ProofLink hash={c.txHash} compact />}
                      <StatusChip status={s.status} label={s.label} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </ApiState>
        </div>
      </section>
    </div>
  );
}
