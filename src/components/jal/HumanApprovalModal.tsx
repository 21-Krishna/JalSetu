import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Droplets,
  Loader2,
  Lock,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Truck,
  X,
} from "lucide-react";
import { useSim } from "@/lib/sim/store";
import { zoneLabel } from "@/lib/sim/network";
import type { Plan } from "@/lib/sim/engine";

interface HumanApprovalModalProps {
  plan: Plan | null;
  isOpen: boolean;
  onClose: () => void;
  onApproved?: () => void;
}

const n = (v: number) => (v ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 1 });

export function HumanApprovalModal({ plan, isOpen, onClose, onApproved }: HumanApprovalModalProps) {
  const { state, m, cityName, cityId, approve, loading, error, clearError } = useSim();
  const inc = state.incident;

  const [operatorNotes, setOperatorNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !plan) return null;

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true);
      await approve(
        plan.id,
        operatorNotes.trim() || `Operator formal authorization for ${cityName} emergency response`,
      );
      onClose();
      if (onApproved) onApproved();
    } catch {
      // error handled in store
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl border bg-card shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b px-6 py-4 bg-muted/30">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15 text-primary">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <h3 className="text-base font-bold text-foreground">
                Authorize Response Plan — {plan.name}
              </h3>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Human-in-the-Loop decision gate for <strong>{cityName}</strong>. Review allocations,
              resource commitments, and safety guarantees before authorization.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="rounded-xl border border-critical/40 bg-critical/10 p-3 text-xs text-critical flex items-center justify-between">
              <span>{error}</span>
              <button onClick={clearError} className="underline font-bold">
                Dismiss
              </button>
            </div>
          )}

          {/* Operational Strategy Summary */}
          <div className="rounded-xl border bg-muted/20 p-3.5 text-xs">
            <span className="font-bold text-foreground text-[11px] uppercase tracking-wider">
              Strategy & Objective:
            </span>
            <p className="mt-1 text-muted-foreground leading-relaxed">
              {plan.objective || plan.strategy}
            </p>
          </div>

          {/* Key Resource Numbers */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl border bg-card p-3 shadow-xs">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                Total Supply Delivered
              </span>
              <p className="mt-1 font-mono text-base font-bold text-primary">
                {n(plan.totalSupplied)} MLD
              </p>
              <span className="text-[10px] text-muted-foreground">Pipes + Tankers</span>
            </div>
            <div className="rounded-xl border bg-card p-3 shadow-xs">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                Emergency Fleet Deployed
              </span>
              <p className="mt-1 font-mono text-base font-bold text-primary flex items-center justify-center gap-1">
                <Truck className="h-4 w-4" /> {plan.tankersUsed} Tankers
              </p>
              <span className="text-[10px] text-muted-foreground">
                {n(plan.tankersUsed * 0.5)} MLD road capacity
              </span>
            </div>
            <div className="rounded-xl border bg-card p-3 shadow-xs">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                Remaining Civic Shortage
              </span>
              <p
                className={`mt-1 font-mono text-base font-bold ${
                  plan.unmet > 0 ? "text-critical" : "text-success"
                }`}
              >
                {n(plan.unmet)} MLD
              </p>
              <span className="text-[10px] text-muted-foreground">Net residual deficit</span>
            </div>
          </div>

          {/* Zone-by-Zone Commitments Table */}
          <div>
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">
              Zonal Water Allocations & Coverage Breakdown
            </h4>
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 border-b text-[10px] font-semibold uppercase text-muted-foreground">
                  <tr>
                    <th className="py-2 px-3 text-left">Zone Name</th>
                    <th className="py-2 px-2 text-right">Daily Demand</th>
                    <th className="py-2 px-2 text-right">Pipe Supply</th>
                    <th className="py-2 px-2 text-right">Road Tanker</th>
                    <th className="py-2 px-2 text-right">Total Delivered</th>
                    <th className="py-2 px-3 text-right">Residual Shortage</th>
                  </tr>
                </thead>
                <tbody className="divide-y font-mono text-xs">
                  {m.zones.map((z) => {
                    const alloc = plan.alloc[z.id] || { pipe: 0, tanker: 0 };
                    const totalAlloc = alloc.pipe + alloc.tanker;
                    const unmet = plan.unmetByZone[z.id] ?? 0;
                    return (
                      <tr key={z.id} className="hover:bg-muted/20">
                        <td className="py-2.5 px-3 font-sans font-semibold text-foreground">
                          {z.id} · {z.name}{" "}
                          <span className="text-[10px] text-muted-foreground font-normal">
                            ({z.priority})
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-right">{n(z.demand)} MLD</td>
                        <td className="py-2.5 px-2 text-right">{n(alloc.pipe)} MLD</td>
                        <td className="py-2.5 px-2 text-right text-primary">
                          {alloc.tanker > 0 ? `+${n(alloc.tanker)} MLD` : "—"}
                        </td>
                        <td className="py-2.5 px-2 text-right font-bold text-foreground">
                          {n(totalAlloc)} MLD
                        </td>
                        <td
                          className={`py-2.5 px-3 text-right font-bold ${
                            unmet > 0 ? "text-critical" : "text-success"
                          }`}
                        >
                          {unmet > 0 ? `-${n(unmet)} MLD` : "0.0 MLD"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Backend Hard-Constraint Safety Guarantee Notice */}
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-3.5 text-xs">
            <div className="flex items-center gap-2 text-primary font-bold text-[11px] uppercase tracking-wider">
              <Lock className="h-3.5 w-3.5" /> Backend Independent Re-validation Guarantee
            </div>
            <p className="mt-1 text-muted-foreground text-[11px] leading-relaxed">
              When confirmed, the FastAPI backend independently re-validates all 7 hydraulic and
              physical constraints before committing the allocation to SQLite. Any constraint breach
              returns an immediate HTTP 400 rejection and aborts the transaction.
            </p>
          </div>

          {/* Operator Authorization Note Input */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Operator Authorization Notes & Signature (Optional):
            </label>
            <input
              type="text"
              value={operatorNotes}
              onChange={(e) => setOperatorNotes(e.target.value)}
              placeholder="e.g. Approved under emergency operating protocol for college exhibition"
              className="w-full rounded-lg border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="border-t bg-muted/20 px-6 py-3 flex items-center justify-between">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg border bg-background px-4 py-2 text-xs font-medium hover:bg-accent"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isSubmitting || !plan.feasible}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-xs disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Committing to SQLite...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" /> Confirm & Commit Allocation
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
