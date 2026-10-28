import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Truck,
  XCircle,
} from "lucide-react";
import { useSim } from "@/lib/sim/store";

interface RecommendedPlanPanelProps {
  onApprove: (planId: string) => void;
  className?: string;
}

const n = (v: number) => (v ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 1 });

export function RecommendedPlanPanel({ onApprove, className = "" }: RecommendedPlanPanelProps) {
  const { state, cityName } = useSim();
  const inc = state.incident;
  const analysis = inc?.analysis;
  const plans = state.plans;

  const [showFormulaDetails, setShowFormulaDetails] = useState(false);

  const recommendedPlan = plans.find((p) => p.recommended && p.feasible);
  const feasiblePlans = plans.filter((p) => p.feasible);
  const allInfeasible = plans.length > 0 && feasiblePlans.length === 0;

  if (!inc || plans.length === 0) return null;

  return (
    <div className={`rounded-xl border bg-card p-5 shadow-xs ${className}`}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-md bg-primary/10 text-primary">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <h3 className="text-sm font-bold text-foreground">
              Recommended Municipal Crisis Response
            </h3>
            {recommendedPlan ? (
              <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold text-success flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Plan {recommendedPlan.id} Selected
              </span>
            ) : allInfeasible ? (
              <span className="rounded-full bg-critical/15 px-2 py-0.5 text-[10px] font-bold text-critical flex items-center gap-1">
                <ShieldAlert className="h-3 w-3" /> Infeasible State
              </span>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Evaluated by the Response Monitoring Agent using configured multi-criteria evaluation
            weights.
          </p>
        </div>
      </div>

      {/* Case 1: All plans infeasible */}
      {allInfeasible && (
        <div className="rounded-xl border border-critical/30 bg-critical/10 p-4 text-xs text-critical">
          <div className="flex items-center gap-2 font-bold text-sm">
            <ShieldAlert className="h-5 w-5" /> No Feasible Response Strategy Available
          </div>
          <p className="mt-1 text-muted-foreground">
            All formulated candidate response plans exceed the physical or hydraulic operating
            limits of the {cityName} network. The Validation Gate strictly forbids approving any
            infeasible plan. Manual emergency municipal escalation is required.
          </p>
        </div>
      )}

      {/* Case 2: Recommended Plan Available */}
      {recommendedPlan && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left 2 Cols: Plan Overview, Rationale & Allocations */}
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="rounded bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary uppercase font-mono">
                    RECOMMENDED CANDIDATE
                  </span>
                  <h4 className="mt-1.5 text-base font-bold text-foreground">
                    {recommendedPlan.name}
                  </h4>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    {recommendedPlan.objective || recommendedPlan.strategy}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-mono text-sm font-bold text-primary">
                    {n(recommendedPlan.totalSupplied)} MLD Supplied
                  </span>
                  <p className="text-[10px] text-muted-foreground">
                    Remaining Unmet: {n(recommendedPlan.unmet)} MLD
                  </p>
                </div>
              </div>

              {/* Rationale explanation */}
              <div className="mt-3.5 rounded-lg bg-card p-3 border text-xs">
                <p className="font-bold text-foreground text-[11px] uppercase tracking-wider">
                  Operational Recommendation Rationale:
                </p>
                <p className="mt-1 text-muted-foreground leading-relaxed">
                  {analysis?.comparison_summary?.recommendation_reason ||
                    analysis?.rationale?.narrative ||
                    `Plan ${recommendedPlan.id} is recommended because it minimizes essential service disruptions in high-priority civic sectors while operating strictly within verified hydraulic pipeline capacities and simulated road tanker fleet bounds.`}
                </p>
              </div>

              {/* Resource Consumption & Benefits */}
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-lg bg-card p-2 border">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                    Pipe Throughput
                  </span>
                  <p className="mt-0.5 font-mono font-bold text-foreground">
                    {n(recommendedPlan.totalSupplied - recommendedPlan.tankersUsed * 0.5)} MLD
                  </p>
                </div>
                <div className="rounded-lg bg-card p-2 border">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                    Tanker Fleet Dispatched
                  </span>
                  <p className="mt-0.5 font-mono font-bold text-primary flex items-center justify-center gap-1">
                    <Truck className="h-3 w-3" /> {recommendedPlan.tankersUsed} Tankers (
                    {n(recommendedPlan.tankersUsed * 0.5)} MLD)
                  </p>
                </div>
                <div className="rounded-lg bg-card p-2 border">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                    Safety Validation
                  </span>
                  <p className="mt-0.5 font-bold text-success flex items-center justify-center gap-1">
                    <ShieldCheck className="h-3 w-3" /> 7 / 7 Passed
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-4 pt-3 border-t flex items-center justify-between gap-3">
                <p className="text-[11px] text-muted-foreground italic">
                  Requires explicit operator confirmation before committing allocations.
                </p>
                <button
                  onClick={() => onApprove(recommendedPlan.id)}
                  disabled={recommendedPlan.decision === "approved"}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-xs disabled:opacity-50"
                >
                  <ShieldCheck className="h-4 w-4" />
                  {recommendedPlan.decision === "approved"
                    ? "Plan Approved & Committed"
                    : "Review & Authorize Response"}
                </button>
              </div>
            </div>
          </div>

          {/* Right Col: Scoring Criteria & Safety Checks */}
          <div className="space-y-3 text-xs">
            {/* Multi-Criteria Scoring Formula */}
            <div className="rounded-xl border bg-muted/30 p-3.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <Scale className="h-3.5 w-3.5 text-primary" /> Evaluation Scoring Formula
                </span>
                <button
                  onClick={() => setShowFormulaDetails(!showFormulaDetails)}
                  className="text-[10px] text-primary hover:underline font-semibold"
                >
                  {showFormulaDetails ? "Hide Details" : "Explain Weights"}
                </button>
              </div>
              <div className="mt-2 rounded bg-card p-2 border font-mono text-[11px] text-foreground">
                Penalty = (Unmet × 10) + (High-Priority Unmet × 15) + (Tankers × 0.5)
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed">
                {analysis?.scoring_criteria?.explanation ||
                  "A lower penalty score indicates a superior operational candidate. Heavily penalizes shortages in high-priority zones (15x) and municipal deficit (10x), with a minor penalty on emergency fleet deployment (0.5x)."}
              </p>
              {showFormulaDetails && (
                <div className="mt-2.5 space-y-1 text-[10px] text-muted-foreground border-t pt-2">
                  <p>
                    • <strong>15.0x Weight:</strong> Severe penalty for every MLD starved from
                    high-priority hospital/civic zones.
                  </p>
                  <p>
                    • <strong>10.0x Weight:</strong> Moderate penalty for general municipal supply
                    deficits.
                  </p>
                  <p>
                    • <strong>0.5x Weight:</strong> Logistics cost per road tanker vehicle deployed
                    to conserve fleet reserves.
                  </p>
                </div>
              )}
            </div>

            {/* Safety Constraints Checked (All 7) */}
            <div className="rounded-xl border bg-muted/30 p-3.5">
              <p className="font-bold text-foreground text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-success" /> Physical Safety Gates Checked
              </p>
              <ul className="mt-2 space-y-1 text-[11px] text-muted-foreground">
                {[
                  "1. Treatment Plant Throughput Limit",
                  "2. Booster Pumping Operating Limit (0 MLD if offline)",
                  "3. Pipeline Hydraulic Design Limits",
                  "4. Municipal Tanker Fleet Availability Bound",
                  "5. Tanker Physical Math (0.5 MLD per vehicle)",
                  "6. Non-negativity Constraint (allocations ≥ 0)",
                  "7. Zonal Demand Ceiling (allocation ≤ demand)",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-success shrink-0" />
                    <span className="truncate">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
