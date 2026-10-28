import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  Activity,
  Bot,
  CheckCircle2,
  Database,
  Droplets,
  Layers,
  MapPinned,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Truck,
  Zap,
} from "lucide-react";
import { StatCard, Panel, DemoBadge } from "@/components/jal/ui";
import { DemandChart } from "@/components/jal/sections";
import { CrisisTriggerModal } from "@/components/jal/CrisisTriggerModal";
import { useSim, fmtTime } from "@/lib/sim/store";
import { TANKER_FLEET, zoneLabel } from "@/lib/sim/network";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Overview — JalSetu Water Command Center" },
      {
        name: "description",
        content: "Overview of the JalSetu urban water network simulation and decision system.",
      },
    ],
  }),
  component: OverviewPage,
});

const linkCls = "inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline";
const n = (v: number) => (v ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

function OverviewPage() {
  const { state, m, cityName, loading, refresh } = useSim();
  const navigate = useNavigate();
  const [isTriggerModalOpen, setIsTriggerModalOpen] = useState(false);
  const shortCount = m.zones.filter((z) => z.unmet > 0.001).length;
  const isMitigated = state.incident?.status === "mitigated";
  const totalFleet = m.tankersAvailable + m.tankersDeployed;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Urban Water Crisis Command Center — {cityName}
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Real-time decision support for simulated municipal water emergencies in{" "}
            <strong>{cityName}</strong>. Inspect live flow balances, monitor cooperating AI agents,
            and review response plans before human operator authorization.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <DemoBadge>{cityName} Active Network</DemoBadge>
          <Link to="/report" className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground shadow-md transition-colors hover:bg-primary/90">
            <AlertTriangle className="h-3.5 w-3.5" /> Report a Water-Supply Issue
          </Link>
          <button
            onClick={() => setIsTriggerModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 shadow-md transition-all cursor-pointer"
          >
            <Zap className="h-3.5 w-3.5" /> Advanced Scenario Demo
          </button>
          <button
            onClick={() => refresh()}
            className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent shadow-xs cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Top Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Daily Demand"
          value={`${n(m.totalDemand)} MLD`}
          hint={`Across ${m.zones.length} zones in ${cityName}`}
          icon={Droplets}
          tone="primary"
        />
        <StatCard
          label="Estimated Shortage"
          value={`${n(m.totalUnmet)} MLD`}
          hint={
            state.incident
              ? `Shortfall under ${state.incident.id}`
              : "Zero deficit (normal baseline)"
          }
          icon={AlertTriangle}
          tone={m.totalUnmet > 0 ? "critical" : "success"}
        />
        <StatCard
          label="Deficit Zones"
          value={`${shortCount} / ${m.zones.length}`}
          hint="Zones below demand ceiling"
          icon={MapPinned}
          tone={shortCount > 0 ? "warning" : "success"}
        />
        <StatCard
          label="Emergency Tankers"
          value={`${m.tankersAvailable} / ${totalFleet}`}
          hint={`${state.tankersDeployed} committed to relief`}
          icon={Truck}
          tone="cyan"
        />
      </div>

      {/* Grid: Zone Coverage & Active Incident */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left: Zone Coverage */}
        <Panel
          className="lg:col-span-3"
          title="Zone Supply Coverage & Deficits"
          subtitle="Committed pipeline throughput and road tanker delivery vs. daily demand"
          action={
            <Link to="/allocation" className={linkCls}>
              View Allocation <ArrowRight className="h-3 w-3" />
            </Link>
          }
        >
          <div className="space-y-4">
            {m.zones.map((z) => {
              const pct = Math.round((z.supplied / z.demand) * 100);
              return (
                <div key={z.id}>
                  <div className="mb-1.5 flex justify-between gap-3 text-xs">
                    <span className="font-semibold text-foreground">
                      {zoneLabel(z.id)}{" "}
                      <span className="text-[10px] font-normal text-muted-foreground">
                        · {z.priority} priority
                      </span>
                    </span>
                    <span className="font-mono">
                      {n(z.supplied)} / {n(z.demand)} MLD ({pct}%)
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all ${
                        pct < 60 ? "bg-critical" : pct < 90 ? "bg-warning" : "bg-success"
                      }`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                  <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
                    <span>
                      Pipe: {n(z.pipe)} MLD · Tanker: {n(z.tanker)} MLD
                    </span>
                    <span
                      className={
                        z.unmet > 0 ? "text-critical font-bold" : "text-success font-semibold"
                      }
                    >
                      {z.unmet > 0 ? `Shortage: -${n(z.unmet)} MLD` : "Fulfilled"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        {/* Right: Active Incident Card */}
        <Panel
          className="lg:col-span-2"
          title="Current Incident Workflow"
          subtitle="Shared state from backend SQLite database"
          action={
            <Link to="/response" className={linkCls}>
              Details <ArrowRight className="h-3 w-3" />
            </Link>
          }
        >
          {state.incident ? (
            <div className="space-y-3.5">
              <div className="rounded-xl border border-warning/40 bg-warning/5 p-4">
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg ${
                      isMitigated ? "bg-success/20 text-success" : "bg-warning/20 text-warning"
                    }`}
                  >
                    {isMitigated ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-warning" />
                    )}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-foreground">{state.incident.id}</p>
                      <span className="rounded-full bg-warning/20 px-2 py-0.5 text-[9px] font-bold uppercase text-warning">
                        {state.incident.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs font-semibold text-foreground">
                      {state.incident.label}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Initial deficit: {n(state.incident.analysis?.totalShortage ?? 0)} MLD ·
                      Triggered at {fmtTime(state.incident.triggeredAt)}
                    </p>
                    {state.incident.approvedPlanId && (
                      <p className="mt-2 text-xs font-bold text-success flex items-center gap-1">
                        <ShieldCheck className="h-4 w-4" /> Plan {state.incident.approvedPlanId}{" "}
                        Approved
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Link
                  to="/simulator"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 shadow-xs"
                >
                  <Zap className="h-3.5 w-3.5" /> Continue in Crisis Simulator
                </Link>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsTriggerModalOpen(true)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-accent text-foreground shadow-xs cursor-pointer"
                  >
                    <Layers className="h-3.5 w-3.5 text-primary" /> Switch Scenario
                  </button>
                  <Link
                    to="/agents"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-accent text-foreground shadow-xs"
                  >
                    <Bot className="h-3.5 w-3.5 text-primary" /> Agents
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center">
              <Activity className="mx-auto h-9 w-9 text-muted-foreground/60" />
              <p className="mt-2.5 text-sm font-bold text-foreground">No Active Crisis</p>
              <p className="mt-1 text-xs text-muted-foreground max-w-xs mx-auto">
                Trigger a verified pump outage, treatment derate, pipeline burst, or multi-asset
                blackout.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <button
                  onClick={() => setIsTriggerModalOpen(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 shadow-md cursor-pointer"
                >
                  <Zap className="h-3.5 w-3.5" /> Advanced Scenario Demo
                </button>
                <Link
                  to="/simulator"
                  className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-2 text-xs font-semibold hover:bg-accent text-foreground shadow-xs"
                >
                  Simulator <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          )}
        </Panel>
      </div>

      {/* Demand Chart Section */}
      <DemandChart />

      {/* Network Asset Telemetry */}
      <Panel
        title="Infrastructure Asset Operating Telemetry"
        subtitle="Effective operating capacities and actual flow throughput derived from hydraulic graph balances"
        action={
          <Link to="/reservoirs" className={linkCls}>
            Asset Controls <ArrowRight className="h-3 w-3" />
          </Link>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {m.assets.map((a) => {
            const isDegraded = a.factor < 1;
            return (
              <div key={a.id} className="rounded-xl border bg-card p-3.5 shadow-xs">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-foreground">{a.name}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      {a.kind.toUpperCase()} · {a.id}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                      a.factor === 0
                        ? "bg-critical/20 text-critical"
                        : isDegraded
                          ? "bg-warning/20 text-warning"
                          : "bg-success/20 text-success"
                    }`}
                  >
                    {a.factor === 0 ? "OFFLINE" : isDegraded ? "DEGRADED" : "NORMAL"}
                  </span>
                </div>
                <p className="mt-2.5 font-mono text-sm font-bold text-foreground">
                  {n(a.flow)} / {n(a.effective)} MLD
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${isDegraded ? "bg-critical" : "bg-primary"}`}
                    style={{
                      width: `${a.effective > 0 ? Math.min(100, (a.flow / a.effective) * 100) : 0}%`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* Bottom Grid: Agent Activity & System Scope */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          title="Recent Agent Activity Trail"
          subtitle="Handoff records from the deterministic multi-agent pipeline"
          action={
            <Link to="/agents" className={linkCls}>
              Agent Network <ArrowRight className="h-3 w-3" />
            </Link>
          }
        >
          {state.log.length > 0 ? (
            <ol className="space-y-3">
              {state.log.slice(0, 4).map((l, i) => (
                <li key={`${l.at}-${i}`} className="flex gap-3">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-foreground">
                      {l.step}{" "}
                      <span className="ml-2 font-mono text-[10px] font-normal text-muted-foreground">
                        {fmtTime(l.at)}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed truncate">
                      {l.message}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="py-4 text-xs text-muted-foreground">
              No recent agent activities logged. Trigger a scenario in Crisis Simulator to populate.
            </p>
          )}
        </Panel>

        <Panel
          title="Demonstration Guide & Operational Scope"
          subtitle="Deterministic Decision-Support Architecture"
        >
          <ul className="space-y-2.5 text-xs text-muted-foreground leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span>
                <strong className="text-foreground">Canonical 4-Zone Network:</strong> Models source
                reservoir, treatment plant, 2 pumping stations, 4 distribution zones, and an
                8-tanker emergency fleet.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span>
                <strong className="text-foreground">4 Specialized AI Agents:</strong> Incident
                Analysis Agent, Resource Optimization Agent, Validation & Safety Agent, and Response
                Monitoring Agent.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span>
                <strong className="text-foreground">Safety Gate Enforcement:</strong> Infeasible
                candidate plans violating hydraulic pipe throughput or tanker availability are
                strictly rejected.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span>
                <strong className="text-foreground">Human-in-the-Loop:</strong> Plans require
                explicit operator confirmation before allocations are committed to the SQLite
                database.
              </span>
            </li>
          </ul>
        </Panel>
      </div>

      {/* Advanced Scenario Selection Modal */}
      <CrisisTriggerModal
        isOpen={isTriggerModalOpen}
        onClose={() => setIsTriggerModalOpen(false)}
        onTriggered={() => navigate({ to: "/simulator" })}
      />
    </div>
  );
}
