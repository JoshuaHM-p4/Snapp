import { useId, useState, type ReactNode } from "react";
import "./report-parts.css";

/**
 * Report building blocks shared by the workspace and the dev design library:
 * a focusable data tooltip and hours bars on a shared zero-based scale.
 */
export function DataTip({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span
      className="lib-data-tip"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onKeyDown={(event) => {
        if (event.key === "Escape") setOpen(false);
      }}
    >
      <button
        type="button"
        className="lib-data-target"
        aria-describedby={open ? id : undefined}
        onClick={() => setOpen(true)}
      >
        {children}
      </button>
      {open && (
        <span id={id} className="lib-data-tooltip" role="tooltip">
          {label}
        </span>
      )}
    </span>
  );
}

export type HoursBarRow = { label: string; submitted: number; approved: number };

/** Submitted (light) and approved (solid) hours per row. Numbers stay visible; bars are decoration. */
export function HoursBars({
  rows,
  scale,
  format,
}: {
  rows: HoursBarRow[];
  scale: number;
  format: (hours: number) => string;
}) {
  return (
    <ul className="lib-project-bars">
      {rows.map((row) => (
        <li key={row.label}>
          <span>{row.label}</span>
          <strong>
            <DataTip
              label={`${row.label}: ${format(row.approved)} approved of ${format(row.submitted)} submitted.`}
            >
              {format(row.approved)} / {format(row.submitted)}
            </DataTip>
          </strong>
          <span className="lib-project-track" aria-hidden="true">
            <i className="is-submitted" style={{ transform: `scaleX(${Math.min(1, row.submitted / scale)})` }} />
            <i className="is-approved" style={{ transform: `scaleX(${Math.min(1, row.approved / scale)})` }} />
          </span>
        </li>
      ))}
    </ul>
  );
}
