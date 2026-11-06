import type { Project } from "@agentpay/shared";
import { Lock } from "lucide-react";
import { useApi } from "../api";
import { ApiState, Chip, PageHeader, StatusChip, type Status } from "../ui";
import "./records.css";

const statusOf: Record<string, Status> = {
  planned: "draft",
  submitted: "needs_review",
  approved: "approved",
  disputed: "disputed",
  paid: "claimed",
};

export default function DevelopersPage() {
  const { data, error, loading, retry } = useApi<{ projects: Project[] }>("/api/projects");
  const people = new Map<string, { project: string; title: string; due: string; status: string }[]>();
  data?.projects.forEach((p) =>
    p.milestones.forEach((m) => {
      const list = people.get(m.assignee) ?? [];
      list.push({ project: p.title, title: m.title, due: m.dueDate, status: m.status });
      people.set(m.assignee, list);
    }),
  );
  return (
    <div className="s-page">
      <PageHeader
        title="Developers"
        lede="Who is assigned to which deliverable. In the full product each person sees only their own agreement and pay."
        meta={
          <Chip icon={<Lock size={13} aria-hidden="true" />}>Owner view · sample people</Chip>
        }
      />
      <ApiState loading={loading} error={error} onRetry={retry} empty={people.size === 0} emptyText="No assignments yet.">
        <div className="s-grid">
          {[...people.entries()].map(([name, items]) => (
            <section key={name} className="s-panel rc-person" aria-label={name}>
              <div className="rc-person-head">
                <span className="rc-avatar" aria-hidden="true">
                  {name
                    .split(" ")
                    .map((w) => w[0])
                    .slice(-2)
                    .join("")}
                </span>
                <div>
                  <h3>{name}</h3>
                  <p className="s-row-sub">{items.length} deliverables</p>
                </div>
              </div>
              <ul className="rc-person-list">
                {items.map((i) => (
                  <li key={i.title}>
                    <span>
                      {i.title}
                      <small>
                        {i.project} · Due {i.due}
                      </small>
                    </span>
                    <StatusChip status={statusOf[i.status] ?? "draft"} label={i.status} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </ApiState>
    </div>
  );
}
