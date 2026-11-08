import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import type { Project } from "@agentpay/shared";
import { useApi } from "../api";
import { ApiState, Chip, Meta, PageHeader, Php } from "../ui";
import "./records.css";

export default function ProjectsPage() {
  const { data, error, loading, retry } = useApi<{ projects: Project[] }>("/api/projects");
  return (
    <div className="s-page">
      <PageHeader
        title="Projects"
        lede="Work context for each cutoff: milestones, acceptance criteria and evidence. Project management and invoicing stay in Proyekto; Snapp links to them."
        meta={<Meta>Sample projects</Meta>}
      />
      <ApiState
        loading={loading}
        error={error}
        onRetry={retry}
        empty={!data?.projects.length}
        emptyText="No projects yet."
      >
        <ul className="rc-cards">
          {data?.projects.map((p) => {
            const done = p.milestones.filter((m) => m.status === "approved" || m.status === "paid").length;
            return (
              <li key={p.id}>
                <Link to={`/app/projects/${p.id}`} className="rc-card s-panel">
                  <span className="rc-card-top">
                    <Chip kind={p.status === "active" ? "attention" : "neutral"}>{p.status}</Chip>
                    <span className="s-mono s-muted">{p.id}</span>
                  </span>
                  <span className="rc-card-title">{p.title}</span>
                  <span className="s-muted">{p.clientName}</span>
                  <span className="rc-ticks" aria-label={`${done} of ${p.milestones.length} milestones approved`}>
                    {p.milestones.map((m) => (
                      <i key={m.id} data-on={m.status === "approved" || m.status === "paid"} />
                    ))}
                  </span>
                  <dl className="s-kv">
                    <dt>Client contract</dt>
                    <dd><Php centavos={p.clientAmountPhp * 100} /></dd>
                    <dt>Team allocation</dt>
                    <dd><Php centavos={p.developerBudgetPhp * 100} /></dd>
                  </dl>
                  <span className="rc-card-cta">
                    Open project <ArrowRight size={16} aria-hidden="true" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </ApiState>
    </div>
  );
}
