/**
 * FICTIONAL preview data for the branded workflow screens. Names, hours, rates and
 * amounts are invented; nothing here comes from Proyekto, a bank or a payroll
 * record, and nothing here can move funds. Money is integer centavos, hours are
 * integer tenths (see money.ts). Testnet demo items are separate XLM values and
 * never a conversion of the PHP amounts (no implicit FX).
 */
import type { Centavos, HourTenths } from "./money";

export type Agreement =
  | { kind: "hourly"; version: string; rate: Centavos }
  | { kind: "fixed"; version: string; perCutoff: Centavos };

export type ClientEvaluation =
  | "accepted"
  | "revision_requested"
  | "awaiting_feedback";

export type HoursEntry = {
  id: string;
  project: string;
  proyektoRef: string; // proposed reference shape; no live Proyekto sync exists
  task: string;
  submitted: HourTenths;
  deliverable: { title: string; version: number; evaluation: ClientEvaluation };
  agentFlag?: { note: string; suggested?: HourTenths };
  /** Optional fictional day-by-day split of `submitted` (sums to it exactly). */
  days?: { date: string; hours: HourTenths }[];
};

export type Employee = {
  id: string;
  name: string;
  role: string;
  agreement: Agreement;
  entries: HoursEntry[];
  recipient: { label: string; verified: boolean };
  testnetItemXlm: string; // separate demo item, decimal string
};

export const cutoff = {
  id: "cutoff-2026-11-a",
  label: "Nov 1–15, 2026",
  timezone: "Asia/Manila",
  inclusion: "Entries dated Nov 1 00:00 through Nov 15 23:59 PHT",
  runVersion: 3,
  preparedAt: "Nov 16, 2026 · 09:12 PHT",
} as const;

export const employees: Employee[] = [
  {
    id: "emp-alex",
    name: "Alex Rivera",
    role: "Frontend developer",
    agreement: { kind: "hourly", version: "Hourly agreement v2", rate: 30_000 },
    entries: [
      {
        id: "e-alex-1",
        project: "Website rebuild",
        proyektoRef: "PRJ-WEB · T-114",
        task: "Responsive layouts",
        submitted: 400,
        deliverable: { title: "Website delivery", version: 2, evaluation: "revision_requested" },
        agentFlag: {
          note: "Nov 7 has two identical 2.0 h entries for T-114. Possible duplicate.",
          suggested: 380,
        },
        days: [
          { date: "2026-11-03", hours: 60 },
          { date: "2026-11-04", hours: 50 },
          { date: "2026-11-05", hours: 70 },
          { date: "2026-11-06", hours: 40 },
          { date: "2026-11-07", hours: 60 },
          { date: "2026-11-10", hours: 50 },
          { date: "2026-11-11", hours: 40 },
          { date: "2026-11-12", hours: 30 },
        ],
      },
    ],
    recipient: { label: "Testnet wallet GBXQ…VKE6", verified: true },
    testnetItemXlm: "0.5",
  },
  {
    id: "emp-sam",
    name: "Sam Cruz",
    role: "Brand designer",
    agreement: { kind: "hourly", version: "Hourly agreement v1", rate: 30_000 },
    entries: [
      {
        id: "e-sam-1",
        project: "Brand identity",
        proyektoRef: "PRJ-BRD · T-031",
        task: "Logo system and guidelines",
        submitted: 320,
        deliverable: { title: "Identity guidelines", version: 1, evaluation: "accepted" },
      },
    ],
    recipient: { label: "Testnet wallet GB7K…Q2LM", verified: true },
    testnetItemXlm: "0.5",
  },
  {
    id: "emp-mika",
    name: "Mika Santos",
    role: "Mobile developer",
    agreement: { kind: "hourly", version: "Hourly agreement v3", rate: 45_000 },
    entries: [
      {
        id: "e-mika-1",
        project: "Field app",
        proyektoRef: "PRJ-APP · T-208",
        task: "Offline sync",
        submitted: 560,
        deliverable: { title: "Field app beta", version: 3, evaluation: "awaiting_feedback" },
        agentFlag: {
          note: "6.5 h on Nov 12 have no linked Proyekto task. Context missing.",
        },
      },
      {
        id: "e-mika-2",
        project: "Website rebuild",
        proyektoRef: "PRJ-WEB · T-121",
        task: "API integration",
        submitted: 240,
        deliverable: { title: "Website delivery", version: 2, evaluation: "revision_requested" },
      },
    ],
    recipient: { label: "Testnet wallet GDQ3…7HXA", verified: true },
    testnetItemXlm: "0.5",
  },
  {
    id: "emp-jo",
    name: "Jo Villanueva",
    role: "Project coordinator",
    agreement: { kind: "fixed", version: "Fixed compensation v1", perCutoff: 1_800_000 },
    entries: [
      {
        id: "e-jo-1",
        project: "All projects",
        proyektoRef: "PRJ-OPS",
        task: "Coordination and client calls",
        submitted: 720,
        deliverable: { title: "Weekly status reports", version: 2, evaluation: "accepted" },
      },
    ],
    recipient: { label: "Testnet wallet — not verified", verified: false },
    testnetItemXlm: "0.5",
  },
];

export const evaluationLabel: Record<ClientEvaluation, string> = {
  accepted: "Client accepted",
  revision_requested: "Revision requested",
  awaiting_feedback: "Awaiting client feedback",
};

/** The signed-in fictional employee for the statement view (own data only). */
export const statementEmployeeId = "emp-alex";

export type RecipientOutcome =
  | "claimed"
  | "authorized"
  | "unconfirmed"
  | "failed"
  | "held";

/** FICTIONAL recipient results for a sample run; not real transactions. */
export const sampleResults: {
  employeeId: string;
  outcome: RecipientOutcome;
  at: string;
  note: string;
}[] = [
  { employeeId: "emp-sam", outcome: "claimed", at: "Nov 16 · 10:04 PHT", note: "Recipient signed the claim." },
  { employeeId: "emp-alex", outcome: "authorized", at: "Nov 16 · 10:03 PHT", note: "Authorized by agent. Waiting for the recipient's claim." },
  { employeeId: "emp-mika", outcome: "unconfirmed", at: "Last checked 10:09 PHT", note: "Submission outcome unknown. Reconcile before any retry." },
  { employeeId: "emp-jo", outcome: "held", at: "Nov 16 · 09:40 PHT", note: "Held by rule: recipient not verified." },
];
