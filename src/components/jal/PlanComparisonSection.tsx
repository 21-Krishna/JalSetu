import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Info,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Truck,
  XCircle,
  Zap,
} from "lucide-react";
import { useSim } from "@/lib/sim/store";
import { zoneLabel } from "@/lib/sim/network";

interface PlanComparisonSectionProps {
  onApprove: (planId: string) => void;
  className?: string;
}

const n = (v: number) => (v ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 1 });

export function PlanComparisonSection({ onApprove, className = "" }: PlanComparisonSectionProps) {
  const { state, m, cityName, cityId } = useSim();
  const inc = state.incident;
  const plans = state.plans;

  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"cards" | "matrix">("cards");

  if (!inc || plans.length === 0) return null;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Comparison View Header & Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
        <div>
          <h3 className="text-base font-bold text-foreground">
            3 · Candidate Response Plans & Trade-off Analysis
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Compare candidate strategies formulated by the Resource Optimization Agent and vetted by
            the Validation Gate.
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border bg-muted/40 p-1 text-xs">
          <button
            onClick={() => setViewMode("cards")}
            className={`rounded-md px-2.5 py-1 font-semibold transition-colors ${
              viewMode === "cards"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Detailed Cards
          </button>
          <button
            onClick={() => setViewMode("matrix")}
            className={`rounded-md px-2.5 py-1 font-semibold transition-colors ${
              viewMode === "matrix"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Side-by-Side Matrix
          </button>
        </div>
      </div>

      {/* Comparison Narrative Summary */}
      {inc.analysis?.comparison_summary && (
        <div className="rounded-xl border bg-muted/30 p-4 text-xs text-muted-foreground leading-relaxed">
          <p className="font-bold text-foreground text-[11px] uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Scale className="h-3.5 w-3.5 text-primary" /> Strategy Comparison Summary
          </p>
          <p>{inc.analysis.comparison_summary.strategy_breakdown}</p>
        </div>
      )}

      {/* View 1: Detailed Cards Layout */}
      {viewMode === "cards" && (
        <div className="grid gap-6 xl:grid-cols-3">
          {plans.map((p) => {
            const isApproved = p.decision === "approved";
            const isRejected = p.decision === "rejected";
            const isSuperseded = p.decision === "superseded";
            const isExpanded = expandedPlanId === p.id;

            return (
              <div
                key={p.id}
                className={`flex flex-col justify-between rounded-xl border p-5 transition-all ${
                  isApproved
                    ? "border-success bg-success/5 shadow-md ring-1 ring-success/30"
                    : p.recommended
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30 shadow-xs"
                      : !p.feasible
                        ? "border-critical/30 bg-critical/5 shadow-xs"
                        : "bg-card shadow-xs"
                }`}
              >
                <div>
                  {/* Top Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
                          Plan {p.id}
                        </span>
                        {p.recommended && (
                          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                            RECOMMENDED
                          </span>
                        )}
                        {isApproved && (
                          <span className="rounded-full bg-success/20 px-2 py-0.5 text-[10px] font-bold text-success">
                            APPROVED
                          </span>
                        )}
                      </div>
                      <h4 className="mt-1 text-sm font-bold text-foreground">
                        {p.name.replace(/^Plan [A-C] — /, "")}
                      </h4>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        p.feasible ? "bg-success/15 text-success" : "bg-critical/15 text-critical"
                      }`}
                    >
                      {p.feasible ? "Feasible" : "Infeasible"}
                    </span>
                  </div>

                  {/* Objective & Plain-English Description */}
                  <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                    <p className="leading-relaxed">
                      <strong className="text-foreground">Objective: </strong>
                      {p.objective || p.strategy}
                    </p>
                    {p.plain_english && (
                      <p className="leading-relaxed text-[11px] bg-muted/40 p-2 rounded-lg border">
                        <strong className="text-foreground">How it works: </strong>
                        {p.plain_english}
                      </p>
                    )}
                    {p.why_useful && (
                      <p className="leading-relaxed text-[11px] italic text-muted-foreground">
                        <strong className="not-italic text-foreground">Why useful: </strong>
                        {p.why_useful}
                      </p>
                    )}
                  </div>

                  {/* Metric Strip */}
                  <div className="my-3.5 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-muted/50 p-2.5">
                      <p className="text-[10px] uppercase font-semibold text-muted-foreground">
                        Total Supplied
                      </p>
                      <p className="mt-0.5 font-mono text-sm font-bold text-primary">
                        {n(p.totalSupplied)} MLD
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-2.5">
                      <p className="text-[10px] uppercase font-semibold text-muted-foreground">
                        Remaining Shortfall
                      </p>
                      <p
                        className={`mt-0.5 font-mono text-sm font-bold ${
                          p.unmet > 0 ? "text-critical" : "text-success"
                        }`}
                      >
                        {n(p.unmet)} MLD
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-2.5">
                      <p className="text-[10px] uppercase font-semibold text-muted-foreground">
                        Tankers Deployed
                      </p>
                      <p className="mt-0.5 font-mono text-xs font-bold text-foreground flex items-center gap-1">
                        <Truck className="h-3 w-3" /> {p.tankersUsed} ({n(p.tankersUsed * 0.5)} MLD)
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-2.5">
                      <p className="text-[10px] uppercase font-semibold text-muted-foreground">
                        Safety Check
                      </p>
                      <p
                        className={`mt-0.5 text-xs font-bold ${
                          p.feasible ? "text-success" : "text-critical"
                        }`}
                      >
                        {p.feasible ? "Passed (7/7)" : "Blocked (Violations)"}
                      </p>
                    </div>
                  </div>

                  {/* Benefits & Trade-offs */}
                  <div className="space-y-2 text-xs">
                    {p.benefits && p.benefits.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-success mb-1">
                          Key Benefits:
                        </p>
                        <ul className="space-y-1 text-[11px] text-muted-foreground">
                          {p.benefits.map((b, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-success" />
                              <span>{b}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                        Trade-offs & Constraints:
                      </p>
                      <ul className="space-y-1 text-[11px] text-muted-foreground">
                        {p.tradeOffs.map((t, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
                            <span>{t}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Safety Violations for Infeasible Plans */}
                  {!p.feasible && (
                    <div className="mt-3 rounded-lg border border-critical/40 bg-critical/10 p-3 text-xs text-critical">
                      <div className="flex items-center gap-1.5 font-bold">
                        <XCircle className="h-4 w-4 shrink-0" /> Physical Constraint Violations:
                      </div>
                      <ul className="mt-1.5 space-y-1 text-[11px] list-disc list-inside text-muted-foreground">
                        {p.violations.map((v, i) => (
                          <li key={i} className="leading-relaxed">
                            {v}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Expandable Zone Breakdown Table */}
                  <div className="mt-3 pt-2.5 border-t">
                    <button
                      onClick={() => setExpandedPlanId(isExpanded ? null : p.id)}
                      className="w-full flex items-center justify-between text-xs font-semibold text-primary hover:underline"
                    >
                      <span>
                        {isExpanded ? "Hide Zonal Breakdown" : "View Zone Allocations & Coverage"}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="mt-2.5 overflow-x-auto rounded-lg border bg-muted/20">
                        <table className="w-full text-xs">
                          <thead className="bg-muted/50 border-b text-[10px] font-semibold uppercase text-muted-foreground">
                            <tr>
                              <th className="py-1.5 px-2 text-left">Zone</th>
                              <th className="py-1.5 px-2 text-right">Pipe</th>
                              <th className="py-1.5 px-2 text-right">Tanker</th>
                              <th className="py-1.5 px-2 text-right">Shortage</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y font-mono text-[11px]">
                            {m.zones.map((z) => {
                              const alloc = p.alloc[z.id] || { pipe: 0, tanker: 0 };
                              const unmet = p.unmetByZone[z.id] ?? 0;
                              return (
                                <tr key={z.id}>
                                  <td className="py-1.5 px-2 font-sans font-medium text-foreground">
                                    {z.id} ({z.priority})
                                  </td>
                                  <td className="py-1.5 px-2 text-right">{n(alloc.pipe)}</td>
                                  <td className="py-1.5 px-2 text-right text-primary">
                                    {alloc.tanker > 0 ? `+${n(alloc.tanker)}` : "—"}
                                  </td>
                                  <td
                                    className={`py-1.5 px-2 text-right font-bold ${
                                      unmet > 0 ? "text-critical" : "text-success"
                                    }`}
                                  >
                                    {unmet > 0 ? `-${n(unmet)}` : "0.0"}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Action Controls */}
                <div className="mt-4 pt-3 border-t">
                  {isApproved ? (
                    <div className="flex items-center justify-center gap-1.5 rounded-lg bg-success/15 py-2 text-xs font-bold text-success">
                      <CheckCircle2 className="h-4 w-4" /> Approved & Committed
                    </div>
                  ) : isRejected ? (
                    <div className="rounded-lg bg-muted py-2 text-center text-xs font-medium text-muted-foreground">
                      Rejected by Operator
                    </div>
                  ) : isSuperseded ? (
                    <div className="rounded-lg bg-muted py-2 text-center text-xs font-medium text-muted-foreground">
                      Superseded by Active Approval
                    </div>
                  ) : (
                    <button
                      onClick={() => onApprove(p.id)}
                      disabled={!p.feasible || !!inc.approvedPlanId}
                      className={`w-full inline-flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition-all shadow-xs ${
                        p.feasible
                          ? "bg-primary text-primary-foreground hover:bg-primary/90"
                          : "bg-muted text-muted-foreground cursor-not-allowed opacity-60"
                      }`}
                    >
                      {p.feasible ? (
                        <>
                          <ShieldCheck className="h-4 w-4" /> Review & Approve Response
                        </>
                      ) : (
                        <>
                          <ShieldAlert className="h-4 w-4" /> Blocked (Infeasible)
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* View 2: Side-by-Side Comparison Matrix */}
      {viewMode === "matrix" && (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 border-b text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="py-3 px-4 text-left w-1/4">Evaluation Dimension</th>
                {plans.map((p) => (
                  <th key={p.id} className="py-3 px-4 text-left">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-foreground">Plan {p.id}</span>
                      {p.recommended && (
                        <span className="rounded bg-primary/20 px-1.5 py-0.2 text-[9px] font-bold text-primary">
                          REC
                        </span>
                      )}
                    </div>
                    <span className="font-normal text-[10px] text-muted-foreground block truncate">
                      {p.name.replace(/^Plan [A-C] — /, "")}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y text-xs">
              <tr className="hover:bg-muted/20">
                <td className="py-3 px-4 font-semibold text-foreground">Operational Strategy</td>
                {plans.map((p) => (
                  <td key={p.id} className="py-3 px-4 text-muted-foreground">
                    {p.objective || p.strategy}
                  </td>
                ))}
              </tr>
              <tr className="hover:bg-muted/20">
                <td className="py-3 px-4 font-semibold text-foreground">Total Water Delivered</td>
                {plans.map((p) => (
                  <td key={p.id} className="py-3 px-4 font-mono font-bold text-primary">
                    {n(p.totalSupplied)} MLD
                  </td>
                ))}
              </tr>
              <tr className="hover:bg-muted/20">
                <td className="py-3 px-4 font-semibold text-foreground">Remaining Deficit</td>
                {plans.map((p) => (
                  <td
                    key={p.id}
                    className={`py-3 px-4 font-mono font-bold ${
                      p.unmet > 0 ? "text-critical" : "text-success"
                    }`}
                  >
                    {n(p.unmet)} MLD
                  </td>
                ))}
              </tr>
              <tr className="hover:bg-muted/20">
                <td className="py-3 px-4 font-semibold text-foreground">Tanker Fleet Used</td>
                {plans.map((p) => (
                  <td key={p.id} className="py-3 px-4 font-mono">
                    {p.tankersUsed} tankers ({n(p.tankersUsed * 0.5)} MLD)
                  </td>
                ))}
              </tr>
              <tr className="hover:bg-muted/20">
                <td className="py-3 px-4 font-semibold text-foreground">Safety Gate Result</td>
                {plans.map((p) => (
                  <td key={p.id} className="py-3 px-4">
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                        p.feasible ? "bg-success/20 text-success" : "bg-critical/20 text-critical"
                      }`}
                    >
                      {p.feasible ? "PASSED (7/7 CONSTRAINTS)" : "BLOCKED AS INFEASIBLE"}
                    </span>
                  </td>
                ))}
              </tr>
              <tr className="hover:bg-muted/20">
                <td className="py-3 px-4 font-semibold text-foreground">Approval Action</td>
                {plans.map((p) => (
                  <td key={p.id} className="py-3 px-4">
                    {p.decision === "approved" ? (
                      <span className="text-success font-bold flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Approved
                      </span>
                    ) : (
                      <button
                        onClick={() => onApprove(p.id)}
                        disabled={!p.feasible || !!inc.approvedPlanId}
                        className={`rounded px-2.5 py-1 text-xs font-semibold ${
                          p.feasible
                            ? "bg-primary text-primary-foreground hover:bg-primary/90"
                            : "bg-muted text-muted-foreground opacity-50 cursor-not-allowed"
                        }`}
                      >
                        {p.feasible ? "Approve Plan" : "Ineligible"}
                      </button>
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
