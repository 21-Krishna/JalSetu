import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSim, fmtTime } from "@/lib/sim/store";
import { api, type AuditEventData, type IncidentRecord } from "@/lib/api";
import { Panel, DemoBadge } from "@/components/jal/ui";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Filter,
  History,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Siren,
  User,
} from "lucide-react";

export const Route = createFileRoute("/response")({
  head: () => ({
    meta: [
      { title: "Incident & Response Management — JalSetu" },
      {
        name: "description",
        content: "Review simulated crisis incidents, operator decisions, and audit events.",
      },
    ],
  }),
  component: ResponseManagementPage,
});

const n = (v: number) => (v ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

function ResponseManagementPage() {
  const { state, reset, cityId, cityName } = useSim();

  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEventData[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [auditTypeFilter, setAuditTypeFilter] = useState("all");

  const loadBackendData = async () => {
    setLoadingData(true);
    try {
      const [incs, auds] = await Promise.all([
        api.getIncidents(undefined, cityId),
        api.getAuditTrail({ city_id: cityId, limit: 50 }),
      ]);
      setIncidents(incs);
      setAuditEvents(auds);
    } catch (e) {
      console.warn("Failed to load response & audit data from backend:", e);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    loadBackendData();
  }, [cityId, state.incident?.id, state.incident?.status]);

  const filteredIncidents = incidents.filter((inc) => {
    const matchesSearch =
      inc.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || inc.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const filteredAudit = auditEvents.filter((a) => {
    if (auditTypeFilter === "all") return true;
    return a.event_type.toLowerCase() === auditTypeFilter.toLowerCase();
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Incident & Response Management
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Complete lifecycle registry of simulated water crises, operator decisions, committed
            allocations, and traceable audit trails persisted in SQLite.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DemoBadge>Persisted Registry</DemoBadge>
          <button
            onClick={loadBackendData}
            className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent shadow-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingData ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Active Incident Banner */}
      {state.incident ? (
        <div className="rounded-2xl border border-warning/40 bg-warning/5 p-5 shadow-xs">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span
                className={`grid h-10 w-10 place-items-center rounded-xl ${
                  state.incident.status === "mitigated"
                    ? "bg-success/20 text-success"
                    : "bg-warning/20 text-warning"
                }`}
              >
                {state.incident.status === "mitigated" ? (
                  <CheckCircle2 className="h-6 w-6" />
                ) : (
                  <AlertTriangle className="h-6 w-6" />
                )}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-foreground">
                    {state.incident.id} · {state.incident.label}
                  </h3>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                      state.incident.status === "mitigated"
                        ? "bg-success/20 text-success"
                        : "bg-warning/20 text-warning"
                    }`}
                  >
                    {state.incident.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Triggered: {fmtTime(state.incident.triggeredAt)} · Initial Deficit:{" "}
                  {n(state.incident.analysis?.totalShortage ?? 0)} MLD · Affected Zones:{" "}
                  {state.incident.analysis?.affected?.join(", ") || "None"}
                </p>
                {state.incident.approvedPlanId && (
                  <p className="mt-1.5 text-xs font-semibold text-success">
                    <ShieldCheck className="mr-1 inline h-4 w-4" /> Committed Plan: Plan{" "}
                    {state.incident.approvedPlanId}
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Link
                to="/simulator"
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 shadow-xs"
              >
                Inspect in Simulator <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <button
                onClick={reset}
                className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-3 py-2 text-xs font-medium hover:bg-accent"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border bg-card p-6 text-center shadow-xs">
          <Clock className="mx-auto h-8 w-8 text-muted-foreground/60" />
          <p className="mt-2 text-sm font-bold text-foreground">No Active Crisis Incident</p>
          <p className="mt-1 text-xs text-muted-foreground">
            The simulated municipal water network is currently operating at normal baseline
            capacity.
          </p>
          <Link
            to="/simulator"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Launch Crisis Simulator <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      {/* Incident History Registry Table */}
      <Panel
        title="Persisted Incident History Registry"
        subtitle="Search and filter incidents persisted in SQLite."
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search incidents by ID, scenario..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border bg-background pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="all">All Statuses</option>
              <option value="awaiting_approval">Awaiting Approval</option>
              <option value="mitigated">Mitigated</option>
              <option value="all_rejected">All Rejected</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b">
              <tr>
                <th className="py-2.5 px-4 text-left">Incident ID</th>
                <th className="py-2.5 px-3 text-left">Scenario</th>
                <th className="py-2.5 px-3 text-left">Severity</th>
                <th className="py-2.5 px-3 text-left">Status</th>
                <th className="py-2.5 px-3 text-right">Shortage</th>
                <th className="py-2.5 px-3 text-left">Approved Plan</th>
                <th className="py-2.5 px-4 text-right">Created At</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredIncidents.length > 0 ? (
                filteredIncidents.map((inc) => (
                  <tr key={inc.id} className="hover:bg-muted/30">
                    <td className="py-3 px-4 font-mono text-xs font-bold text-foreground">
                      {inc.id}
                    </td>
                    <td className="py-3 px-3 text-xs font-medium text-foreground">{inc.label}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          inc.severity === "CRITICAL"
                            ? "bg-critical/15 text-critical"
                            : inc.severity === "HIGH"
                              ? "bg-warning/15 text-warning"
                              : "bg-cyan/15 text-cyan"
                        }`}
                      >
                        {inc.severity}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold capitalize text-foreground">
                        {inc.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-xs font-bold text-critical">
                      {n(inc.analysis?.totalShortage ?? 0)} MLD
                    </td>
                    <td className="py-3 px-3 text-xs font-mono">
                      {inc.approvedPlanId ? (
                        <span className="text-success font-semibold">
                          {inc.approvedPlanId.replace(/^.*-PLAN-/, "Plan ")}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[11px] text-muted-foreground">
                      {fmtTime(inc.triggeredAt)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-muted-foreground">
                    No matching incidents found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Chronological Audit Event Trail */}
      <Panel
        title="Chronological Audit History & Event Log"
        subtitle="Immutable records of incident creations, agent pipeline executions, safety gates, and operator decisions."
      >
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Showing newest recorded events first.</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Filter Event:</span>
            <select
              value={auditTypeFilter}
              onChange={(e) => setAuditTypeFilter(e.target.value)}
              className="rounded-lg border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="all">All Events</option>
              <option value="incident_created">Incident Created</option>
              <option value="workflow_executed">Workflow Executed</option>
              <option value="human_approval">Human Approval</option>
              <option value="human_rejection">Human Rejection</option>
              <option value="asset_intervention">Asset Intervention</option>
              <option value="simulation_reset">Simulation Reset</option>
            </select>
          </div>
        </div>

        {filteredAudit.length > 0 ? (
          <div className="space-y-3">
            {filteredAudit.map((a) => (
              <div
                key={a.id}
                className="flex items-start gap-3 rounded-xl border bg-card p-3.5 shadow-xs hover:border-primary/30 transition-colors"
              >
                <span
                  className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-bold ${
                    a.event_type.includes("approval")
                      ? "bg-success/20 text-success"
                      : a.event_type.includes("rejection") || a.event_type.includes("blocked")
                        ? "bg-critical/20 text-critical"
                        : "bg-primary/20 text-primary"
                  }`}
                >
                  {a.actor.slice(0, 2).toUpperCase()}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-foreground">
                      {a.event_type.replace(/_/g, " ").toUpperCase()}{" "}
                      <span className="font-normal text-muted-foreground">by {a.actor}</span>
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {fmtTime(a.timestamp)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    {a.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-xs text-muted-foreground">
            No audit events recorded yet.
          </p>
        )}
      </Panel>
    </div>
  );
}
