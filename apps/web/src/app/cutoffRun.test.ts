import { describe, expect, it } from "vitest";
import { employees } from "./fixtures";
import {
  approvalHolds,
  buildSnapshot,
  employeeAmount,
  entryProblem,
  initialReviews,
  orderForReview,
  parseHours,
} from "./cutoffRun";

const reason = "Duplicate entry on Nov 7 removed after checking T-114.";

describe("cutoff run snapshot", () => {
  it("totals verified recipients exactly in centavos", () => {
    const s = buildSnapshot(employees, initialReviews(employees));
    // Alex 40.0 h × 300 = 12,000.00; Sam 32.0 h × 300 = 9,600.00; Mika 80.0 h × 450 = 36,000.00
    expect(s.lines.map((l) => l.amount)).toEqual([1_200_000, 960_000, 3_600_000]);
    expect(s.total).toBe(5_760_000);
    expect(s.testnetTotal).toBe(15_000_000n);
    expect(s.problems).toEqual([]);
  });

  it("uses per-cutoff compensation for fixed agreements, hours as context only", () => {
    const jo = employees.find((e) => e.id === "emp-jo")!;
    const r = initialReviews(employees);
    expect(employeeAmount(jo, r)).toBe(1_800_000);
    r["e-jo-1"] = { reviewed: 100, reason };
    expect(employeeAmount(jo, r)).toBe(1_800_000);
  });

  it("holds unverified recipients out of the snapshot", () => {
    const s = buildSnapshot(employees, initialReviews(employees));
    expect(s.lines.some((l) => l.employeeId === "emp-jo")).toBe(false);
    expect(s.held).toEqual([expect.objectContaining({ employeeId: "emp-jo" })]);
  });

  it("requires a reason for any correction", () => {
    const alex = employees[0].entries[0];
    expect(entryProblem(alex, { reviewed: 380, reason: "" })).toMatch(/adjustment reason/);
    expect(entryProblem(alex, { reviewed: 380, reason: "too short" })).toMatch(/more/);
    expect(entryProblem(alex, { reviewed: 380, reason })).toBeUndefined();
    expect(entryProblem(alex, { reviewed: 400, reason: "" })).toBeUndefined();
    const r = initialReviews(employees);
    r[alex.id] = { reviewed: 380, reason: "" };
    expect(buildSnapshot(employees, r).problems).toHaveLength(1);
  });

  it("invalidates an approval when hours or reasons change", () => {
    const r = initialReviews(employees);
    const first = buildSnapshot(employees, r);
    const approval = { fingerprint: first.fingerprint, version: 3, at: "now" };
    expect(approvalHolds(approval, first)).toBe(true);
    r["e-alex-1"] = { reviewed: 380, reason };
    const changed = buildSnapshot(employees, r);
    expect(changed.total).toBe(5_700_000);
    expect(approvalHolds(approval, changed)).toBe(false);
    r["e-alex-1"] = { reviewed: 380, reason: `${reason} Confirmed.` };
    expect(buildSnapshot(employees, r).fingerprint).not.toBe(changed.fingerprint);
    expect(approvalHolds(null, first)).toBe(false);
  });

  it("parses hours without floats and orders flagged people first", () => {
    expect(parseHours("38.5")).toBe(385);
    expect(parseHours("40")).toBe(400);
    expect(parseHours("1.25")).toBeNull();
    expect(parseHours("-1")).toBeNull();
    expect(orderForReview(employees).map((e) => e.id)).toEqual([
      "emp-alex",
      "emp-mika",
      "emp-sam",
      "emp-jo",
    ]);
  });
});
