import { createFileRoute, Link } from "@tanstack/react-router";
import { useSim, fmtTime } from "@/lib/sim/store";
import { ZONES, ASSETS, LINKS, TANKER_FLEET, TANKER_MLD, zoneLabel } from "@/lib/sim/network";
import { Panel, DemoBadge } from "@/components/jal/ui";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Database,
  Droplets,
  Layers,
  ShieldCheck,
  Truck,
} from "lucide-react";

export const Route = createFileRoute("/allocation")({
  head: () => ({
    meta: [
      { title: "Resource Allocation & Flow Balances — JalSetu" },
      {
        name: "description",
        content:
          "Committed zone allocations, tanker fleet dispatches, and hydraulic capacity utilization.",
      },
    ],
  }),
  component: AllocationPage,
});

const n = (v: number) => (v ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

function AllocationPage() {
  const { state, m, cityName } = useSim();
  const approvedPlan = state.plans.find((p) => p.decision === "approved");
  const isCommitted = !!approvedPlan;
  const totalFleet = m.tankersAvailable + m.tankersDeployed;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Resource Allocation & Flow Balances — {cityName}
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Current simulated municipal distribution state for <strong>{cityName}</strong>. Figures
            reflect committed database allocations obeying physical pipe, asset, and tanker fleet
            capacity limits.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DemoBadge>{cityName} Authoritative State</DemoBadge>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${
              isCommitted ? "bg-success/20 text-success" : "bg-warning/20 text-warning"
            }`}
          >
            {isCommitted ? "Committed Allocations" : "Normal Baseline"}
          </span>
        </div>
      </div>

      {/* Incident Status Notice */}
      {state.incident && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning/40 bg-warning/5 p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <div>
              <p className="text-sm font-bold text-foreground">
                {state.incident.id} · {state.incident.label}
              </p>
              <p className="text-xs text-muted-foreground">
                Status: {state.incident.status.toUpperCase()}
                {approvedPlan
                  ? ` · Mitigation committed under Plan ${approvedPlan.id}`
                  : " · Proposed candidates awaiting operator approval"}
              </p>
            </div>
          </div>
          {!isCommitted && (
            <Link
              to="/simulator"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Review Proposed Plans <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            l: "Aggregate Demand",
            v: `${n(m.totalDemand)} MLD`,
            h: `Across ${m.zones.length} urban zones in ${cityName}`,
          },
          { l: "Committed Supply", v: `${n(m.totalSupplied)} MLD`, h: "Pipe + Emergency Tankers" },
          {
            l: "Remaining Shortfall",
            v: `${n(m.totalUnmet)} MLD`,
            h: isCommitted ? "Post-mitigation deficit" : "Current shortfall",
          },
          {
            l: "Tanker Fleet Status",
            v: `${state.tankersDeployed} / ${totalFleet} Deployed`,
            h: `${m.tankersAvailable} vehicles available`,
          },
        ].map((x) => (
          <div key={x.l} className="rounded-xl border bg-card p-4 shadow-xs">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {x.l}
            </p>
            <p className="mt-2 font-display text-2xl font-bold text-foreground">{x.v}</p>
            <p className="mt-1 text-xs text-muted-foreground">{x.h}</p>
          </div>
        ))}
      </div>

      {/* Zone Supply Gap Breakdown */}
      <Panel
        title="Civic Zone Supply vs. Demand Balances"
        subtitle="Breakdown of pipeline flow and emergency road tanker volume for each municipal zone."
      >
        <div className="space-y-4">
          {m.zones.map((z) => {
            const cov = Math.round((z.supplied / z.demand) * 100);
            return (
              <div key={z.id} className="rounded-xl border bg-card p-4 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-sm font-bold text-foreground">
                      {z.id} · {z.name}
                    </span>
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      · {z.priority.toUpperCase()} Priority · {z.population.toLocaleString("en-IN")}{" "}
                      residents
                    </span>
                  </div>
                  <div className="text-right font-mono text-xs">
                    <span className="font-bold text-foreground">{n(z.supplied)}</span> /{" "}
                    {n(z.demand)} MLD (
                    <span
                      className={
                        cov < 60 ? "text-critical" : cov < 90 ? "text-warning" : "text-success"
                      }
                    >
                      {cov}%
                    </span>
                    )
                  </div>
                </div>

                <div className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full transition-all ${
                      cov < 60 ? "bg-critical" : cov < 90 ? "bg-warning" : "bg-success"
                    }`}
                    style={{ width: `${Math.min(100, cov)}%` }}
                  />
                </div>

                <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>
                    Pipeline: <strong className="text-foreground">{n(z.pipe)} MLD</strong> · Tanker:{" "}
                    <strong className="text-foreground">{n(z.tanker)} MLD</strong>
                  </span>
                  <span
                    className={
                      z.unmet > 0 ? "font-bold text-critical" : "font-semibold text-success"
                    }
                  >
                    {z.unmet > 0 ? `Unmet Shortage: ${n(z.unmet)} MLD` : "100% Demand Fulfilled"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* Grid: Tanker Dispatches & Network Asset Capacities */}
      <div className="grid gap-6 xl:grid-cols-2">
        {/* Tanker Fleet Deployment Panel */}
        <Panel
          title="Emergency Road Tanker Fleet Dispatches"
          subtitle={`${state.tankersDeployed} of ${TANKER_FLEET} vehicles deployed · Each vehicle delivers ${TANKER_MLD} MLD (12 KL × 42 trips/day)`}
        >
          {isCommitted ? (
            <div className="mb-4 rounded-lg bg-success/10 p-3 text-xs text-success font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>
                Dispatch plan committed under Plan {approvedPlan.id} at{" "}
                {state.incident?.resolvedAt
                  ? fmtTime(state.incident.resolvedAt)
                  : "recent approval"}
                .
              </span>
            </div>
          ) : (
            <p className="mb-4 text-xs text-muted-foreground">
              Tankers remain in standby at regional depots until emergency response plan approval in
              Crisis Simulator.
            </p>
          )}

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b">
                <tr>
                  <th className="py-2.5 px-4 text-left">Zone</th>
                  <th className="py-2.5 px-3 text-right">Tankers Assigned</th>
                  <th className="py-2.5 px-4 text-right">Supplied Volume</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {ZONES.map((z) => {
                  const count = approvedPlan?.tankers[z.id] ?? 0;
                  return (
                    <tr key={z.id} className="hover:bg-muted/30">
                      <td className="py-3 px-4 font-semibold text-foreground">{zoneLabel(z.id)}</td>
                      <td className="py-3 px-3 text-right font-mono text-xs">{count} tankers</td>
                      <td className="py-3 px-4 text-right font-mono text-xs font-bold text-primary">
                        {n(count * TANKER_MLD)} MLD
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>

        {/* Network Infrastructure Utilization */}
        <Panel
          title="Infrastructure Capacity & Utilization"
          subtitle="Pipeline flows are governed by physical asset and trunk main limits."
        >
          <div className="space-y-3.5">
            {m.assets.map((a) => {
              const pct =
                a.effective > 0 ? Math.min(100, Math.round((a.flow / a.effective) * 100)) : 0;
              return (
                <div key={a.id} className="rounded-xl border bg-card p-3.5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-foreground">{a.name}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">
                        {a.kind.toUpperCase()} · {a.id}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-xs font-bold text-foreground">
                        {n(a.flow)} / {n(a.effective)} MLD
                      </p>
                      <span className="text-[10px] text-muted-foreground">{pct}% Utilization</span>
                    </div>
                  </div>

                  <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all ${
                        a.factor < 1 ? "bg-critical" : "bg-primary"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  {a.factor < 1 && (
                    <p className="mt-1.5 text-[11px] font-semibold text-critical">
                      Incident constraint: Effective capacity restricted to{" "}
                      {Math.round(a.factor * 100)}% ({a.factor === 0 ? "Offline" : "Derated"}).
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
    </div>
  );
}
