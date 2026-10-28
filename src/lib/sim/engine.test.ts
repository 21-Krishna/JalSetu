import { describe, expect, it } from "vitest";
import { analyse, baselinePipe, generatePlans, initialState, metrics, reducer } from "./engine";

const now = "2026-10-27T06:00:00.000Z";

describe("simulation engine", () => {
  it("baseline serves 32 of 36 MLD (L-04 limits Z-02 to 8)", () => {
    const b = baselinePipe();
    expect(b).toEqual({ "Z-01": 10, "Z-02": 8, "Z-03": 8, "Z-04": 6 });
  });

  it("P-03 failure affects exactly Z-01 and Z-02 with 22 MLD shortage", () => {
    const a = analyse("pump_failure_p03");
    expect(a.affected).toEqual(["Z-01", "Z-02"]);
    expect(a.totalShortage).toBe(22);
  });

  it("generates at least two feasible plans and rejects the full-restoration plan", () => {
    const plans = generatePlans("pump_failure_p03");
    expect(plans.filter((p) => p.feasible).length).toBeGreaterThanOrEqual(2);
    const c = plans.find((p) => p.id === "C")!;
    expect(c.feasible).toBe(false);
    expect(c.recommended).toBe(false);
    expect(c.violations.some((v) => v.includes("P-03"))).toBe(true);
  });

  it("never uses more tankers than the fleet", () => {
    for (const p of generatePlans("pump_failure_p03", 3))
      if (p.feasible) expect(p.tankersUsed).toBeLessThanOrEqual(3);
  });

  it("rejecting leaves state unchanged; approving applies once only", () => {
    let s = reducer(initialState(), { type: "analyse", incident: "pump_failure_p03", now });
    const before = s.current;
    s = reducer(s, { type: "reject", planId: "B", now });
    expect(s.current).toBe(before);
    s = reducer(s, { type: "approve", planId: "A", now });
    expect(s.tankersDeployed).toBe(8);
    expect(metrics(s).totalUnmet).toBe(18);
    const again = reducer(s, { type: "approve", planId: "A", now });
    expect(again).toBe(s);
    expect(reducer(s, { type: "reset" }).current).toEqual(initialState().current);
  });

  it("cannot approve an infeasible plan", () => {
    const s = reducer(initialState(), { type: "analyse", incident: "pump_failure_p03", now });
    expect(reducer(s, { type: "approve", planId: "C", now })).toBe(s);
  });
});
