/**
 * Pure derivation for the owner cutoff review preview. The owner's reviewed
 * hours and reasons go in; an exact recipient + amount snapshot comes out.
 * Integer centavos and hour tenths only. Nothing here sends or signs anything.
 */
import { validateText, reasonRules } from "../components/ui/validation";
import type { Employee, HoursEntry } from "./fixtures";
import {
  hourlyPay,
  sum,
  xlmToStroops,
  type Centavos,
  type HourTenths,
} from "./money";

export type EntryReview = { reviewed: HourTenths; reason: string };
export type Reviews = Record<string, EntryReview>;

export function initialReviews(employees: Employee[]): Reviews {
  return Object.fromEntries(
    employees.flatMap((e) =>
      e.entries.map((x) => [x.id, { reviewed: x.submitted, reason: "" }]),
    ),
  );
}

export function reviewOf(reviews: Reviews, entry: HoursEntry): EntryReview {
  return reviews[entry.id] ?? { reviewed: entry.submitted, reason: "" };
}

export const isCorrected = (entry: HoursEntry, r: EntryReview) =>
  r.reviewed !== entry.submitted;

/** A correction needs a recorded reason; unchanged hours need none. */
export function entryProblem(entry: HoursEntry, r: EntryReview): string | undefined {
  if (!Number.isSafeInteger(r.reviewed) || r.reviewed < 0)
    return "Reviewed hours must be zero or more, in 0.1 h steps.";
  if (!isCorrected(entry, r)) return undefined;
  return validateText(r.reason, reasonRules);
}

/** Parse "38.5" → 385 tenths without float math. Returns null when invalid. */
export function parseHours(text: string): HourTenths | null {
  const m = /^(\d{1,3})(?:\.(\d))?$/.exec(text.trim());
  if (!m) return null;
  return Number(m[1]) * 10 + Number(m[2] ?? "0");
}

export function entryAmount(employee: Employee, r: EntryReview): Centavos | null {
  return employee.agreement.kind === "hourly"
    ? hourlyPay(r.reviewed, employee.agreement.rate)
    : null;
}

export function employeeAmount(employee: Employee, reviews: Reviews): Centavos {
  if (employee.agreement.kind === "fixed") return employee.agreement.perCutoff;
  return sum(employee.entries.map((x) => entryAmount(employee, reviewOf(reviews, x)) ?? 0));
}

export const isFlagged = (employee: Employee) => employee.entries.some((x) => x.agentFlag);

/** Flagged people first (snap-to-order); otherwise keep the prepared order. */
export function orderForReview(employees: Employee[]): Employee[] {
  return employees
    .map((e, i) => ({ e, i }))
    .sort((a, b) => Number(isFlagged(b.e)) - Number(isFlagged(a.e)) || a.i - b.i)
    .map(({ e }) => e);
}

export type SnapshotLine = {
  employeeId: string;
  name: string;
  recipient: string;
  approvedHours: HourTenths;
  amount: Centavos;
  testnetStroops: bigint;
};
export type HeldLine = { employeeId: string; name: string; reason: string };
export type Snapshot = {
  lines: SnapshotLine[];
  held: HeldLine[];
  total: Centavos;
  testnetTotal: bigint;
  problems: { entryId: string; employee: string; message: string }[];
  fingerprint: string;
};

/** FNV-1a 32-bit, hex. Only identifies a preview snapshot; not a security hash. */
function fnv1a(text: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

export function buildSnapshot(employees: Employee[], reviews: Reviews): Snapshot {
  const lines: SnapshotLine[] = [];
  const held: HeldLine[] = [];
  const problems: Snapshot["problems"] = [];
  for (const e of employees) {
    for (const x of e.entries) {
      const message = entryProblem(x, reviewOf(reviews, x));
      if (message) problems.push({ entryId: x.id, employee: e.name, message });
    }
    if (!e.recipient.verified) {
      held.push({
        employeeId: e.id,
        name: e.name,
        reason: "Recipient not verified. Held out of this run until it is.",
      });
      continue;
    }
    lines.push({
      employeeId: e.id,
      name: e.name,
      recipient: e.recipient.label,
      approvedHours: sum(e.entries.map((x) => reviewOf(reviews, x).reviewed)),
      amount: employeeAmount(e, reviews),
      testnetStroops: xlmToStroops(e.testnetItemXlm),
    });
  }
  const total = sum(lines.map((l) => l.amount));
  const testnetTotal = lines.reduce((a, l) => a + l.testnetStroops, 0n);
  // Every reviewed value and reason is bound, so any edit invalidates an approval.
  const material = [
    ...lines.map((l) => `L:${l.employeeId}:${l.recipient}:${l.amount}:${l.testnetStroops}`),
    ...held.map((h) => `H:${h.employeeId}`),
    ...employees.flatMap((e) =>
      e.entries.map((x) => {
        const r = reviewOf(reviews, x);
        return `R:${x.id}:${r.reviewed}:${r.reason.trim()}`;
      }),
    ),
    `T:${total}:${testnetTotal}`,
  ].join("|");
  return { lines, held, total, testnetTotal, problems, fingerprint: fnv1a(material) };
}

export type Approval = { fingerprint: string; version: number; at: string };

export const approvalHolds = (approval: Approval | null, snapshot: Snapshot) =>
  approval !== null && approval.fingerprint === snapshot.fingerprint;
