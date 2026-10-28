import { Link, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Bell,
  Bot,
  Building2,
  Database,
  Droplets,
  FlaskConical,
  LayoutDashboard,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Siren,
  Truck,
  Waves,
  X,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useSim } from "@/lib/sim/store";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/report", label: "Report an Issue", icon: AlertTriangle },
  { to: "/reservoirs", label: "Reservoir Monitoring", icon: Waves },
  { to: "/simulator", label: "Crisis Simulator", icon: FlaskConical },
  { to: "/agents", label: "AI Agent Network", icon: Bot },
  { to: "/allocation", label: "Resource Allocation", icon: Truck },
  { to: "/response", label: "Response Management", icon: Siren },
] as const;

export const pageTitles: Record<string, string> = {
  "/": "Water Management Overview",
  "/report": "Report a Water-Supply Issue",
  "/reservoirs": "Reservoir Monitoring & Asset Control",
  "/simulator": "Crisis Simulator & Multi-Agent Planning",
  "/agents": "AI Multi-Agent Control Center",
  "/allocation": "Resource Allocation & Flow Balances",
  "/response": "Incident & Response Management",
};

export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const {
    state,
    m,
    cityId,
    cityName,
    availableCities,
    setCity,
    loading,
    error,
    clearError,
    backendConnected,
    reset,
    refresh,
  } = useSim();
  const [showResetDialog, setShowResetDialog] = useState(false);

  const activeAlerts = state.incident
    ? [
        {
          id: state.incident.id,
          time: new Date(state.incident.triggeredAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          title: `${state.incident.label} (Shortage: ${state.incident.analysis?.totalShortage ?? 0} MLD)`,
          severity: state.incident.status === "mitigated" ? "MODERATE" : "CRITICAL",
        },
      ]
    : [];

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      {/* Sidebar Navigation */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
            <Droplets className="h-6 w-6" />
          </span>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="font-display text-lg font-bold leading-none tracking-tight text-sidebar-accent-foreground">
                JalSetu
              </p>
              <span className="rounded bg-primary/20 px-1 py-0.5 text-[9px] font-semibold text-primary">
                v1.0
              </span>
            </div>
            <p className="mt-1 text-[10px] uppercase tracking-wider text-sidebar-muted">
              Water Crisis Decision Support
            </p>
          </div>
        </div>

        {/* Active City Card */}
        <div className="mx-3 mt-3 rounded-lg border border-sidebar-border bg-sidebar-accent/40 p-2.5 text-xs">
          <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-sidebar-muted">
            <span className="flex items-center gap-1">
              <Building2 className="h-3 w-3 text-sidebar-primary" /> Active Network
            </span>
            <span className="rounded bg-primary/20 px-1 py-0.5 text-[9px] font-bold text-primary">
              {cityId === "greater_noida" ? "Default" : "Simulated"}
            </span>
          </div>
          <p className="mt-1 font-bold text-sidebar-accent-foreground text-sm">{cityName}</p>
          <p className="text-[11px] text-sidebar-muted">
            {availableCities.find((c) => c.id === cityId)?.state || "Urban Territory"} ·{" "}
            {m.zones.length} Zones
          </p>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          <p className="px-3 pb-2 pt-2 text-[10px] font-semibold uppercase tracking-wider text-sidebar-muted">
            Command Center
          </p>
          {nav.map((n) => {
            const active = path === n.to;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-xs"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
                )}
              >
                {active && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-md bg-sidebar-primary" />
                )}
                <n.icon
                  className={cn(
                    "h-4 w-4",
                    active ? "text-sidebar-primary" : "text-muted-foreground",
                  )}
                />
                {n.label}
              </Link>
            );
          })}
        </nav>

        {/* Backend & Persistence Info */}
        <div className="m-3 space-y-2 rounded-xl border border-sidebar-border bg-sidebar-accent/30 p-3 text-xs text-sidebar-muted">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-medium text-sidebar-foreground">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  backendConnected ? "bg-success animate-pulse" : "bg-warning animate-ping",
                )}
              />
              {backendConnected ? "FastAPI & SQLite" : "Connecting..."}
            </span>
            <button
              onClick={() => refresh()}
              title="Refresh backend state"
              className="rounded p-1 hover:bg-sidebar-accent text-sidebar-muted hover:text-sidebar-foreground"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            </button>
          </div>
          <p className="text-[11px] leading-tight">
            {backendConnected
              ? "Persisting to local jalsetu.db"
              : "Attempting connection to 127.0.0.1:8000"}
          </p>
          <button
            onClick={() => setShowResetDialog(true)}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md border border-sidebar-border bg-sidebar px-2 py-1.5 text-[11px] font-medium text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            <RotateCcw className="h-3 w-3" /> Reset Simulation
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Persistent Demo Mode Banner */}
        <div className="flex items-center justify-between border-b bg-muted/60 px-6 py-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-cyan" />
            <span className="font-semibold text-foreground">DEMO MODE</span> — Simulated water
            network and illustrative data only.
          </div>
          <div className="hidden sm:flex items-center gap-3 text-[11px]">
            <span>Exhibition: AgentX 2026</span>
            <span>·</span>
            <span>Deterministic MAS Baseline</span>
          </div>
        </div>

        {/* Header */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b bg-card/95 px-6 backdrop-blur">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold tracking-tight text-foreground">
              {pageTitles[path] ?? "JalSetu"}
            </h1>
            <span
              className={cn(
                "rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                backendConnected
                  ? "bg-success/15 text-success border border-success/30"
                  : "bg-warning/15 text-warning border border-warning/30",
              )}
            >
              {backendConnected ? "Backend Online" : "Backend Standby"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* City Selector */}
            <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-2.5 py-1.5 shadow-xs">
              <Building2 className="h-3.5 w-3.5 text-primary" />
              <label
                htmlFor="city-select"
                className="text-xs font-semibold text-muted-foreground hidden sm:inline"
              >
                City:
              </label>
              <select
                id="city-select"
                value={cityId}
                onChange={(e) => setCity(e.target.value)}
                disabled={loading}
                className="bg-transparent text-xs font-bold text-foreground focus:outline-none cursor-pointer"
              >
                {availableCities.map((c) => (
                  <option key={c.id} value={c.id} className="bg-popover text-popover-foreground">
                    {c.name} ({c.state})
                  </option>
                ))}
              </select>
              {cityId === "greater_noida" && (
                <span className="hidden md:inline rounded bg-primary/20 px-1.5 py-0.5 text-[9px] font-semibold text-primary">
                  Default
                </span>
              )}
            </div>
            {/* Notifications Popover */}
            <Popover>
              <PopoverTrigger
                aria-label="Alerts"
                className="relative grid h-9 w-9 place-items-center rounded-lg border bg-card text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                <Bell className="h-4 w-4" />
                {activeAlerts.length > 0 && (
                  <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-critical px-1 text-[10px] font-bold text-destructive-foreground">
                    {activeAlerts.length}
                  </span>
                )}
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0 shadow-lg">
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <p className="text-sm font-semibold">Active Crisis Alerts</p>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                    {activeAlerts.length} Active
                  </span>
                </div>
                {activeAlerts.length > 0 ? (
                  <ul className="divide-y max-h-60 overflow-y-auto">
                    {activeAlerts.map((a) => (
                      <li key={a.id} className="p-3 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <span className="rounded bg-critical/15 px-1.5 py-0.5 text-[10px] font-semibold text-critical">
                            {a.severity}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{a.time}</span>
                        </div>
                        <p className="mt-1 text-xs font-medium text-foreground">{a.title}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="p-6 text-center text-xs text-muted-foreground">
                    No critical alerts active. Normal simulated baseline.
                  </div>
                )}
                <Link
                  to="/response"
                  className="block border-t bg-muted/30 px-4 py-2.5 text-center text-xs font-semibold text-primary hover:bg-muted transition-colors"
                >
                  View full incident response log
                </Link>
              </PopoverContent>
            </Popover>

            {/* Operator Badge */}
            <div className="flex items-center gap-2.5 rounded-lg border bg-card px-3 py-1.5 shadow-xs">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                OP
              </span>
              <div className="hidden leading-tight sm:block">
                <p className="text-xs font-semibold text-foreground">Municipal Decision-Maker</p>
                <p className="text-[10px] text-muted-foreground">Human-in-the-Loop Gate</p>
              </div>
            </div>
          </div>
        </header>

        {/* Global Error Alert Banner if any */}
        {error && (
          <div className="mx-6 mt-4 flex items-start justify-between gap-3 rounded-lg border border-critical/30 bg-critical/10 p-3 text-xs text-critical">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-critical" />
              <div>
                <p className="font-semibold">Backend Notice</p>
                <p className="mt-0.5 text-muted-foreground">{error}</p>
              </div>
            </div>
            <button onClick={clearError} className="rounded p-1 hover:bg-critical/20 text-critical">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Mobile Navigation bar */}
        <nav className="flex gap-1 overflow-x-auto border-b bg-card px-4 py-2 md:hidden">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className={cn(
                "whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium",
                path === n.to
                  ? "bg-sidebar text-sidebar-accent-foreground"
                  : "text-muted-foreground",
              )}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        {/* Page Content */}
        <main className="flex-1 p-6">{children}</main>
      </div>

      {/* Reset Confirmation Dialog */}
      {showResetDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-xl">
            <div className="flex items-center gap-3 text-warning">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="text-base font-bold text-foreground">Reset Simulation?</h3>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              This will restore the simulated municipal water network to its normal operational
              baseline, clear active crisis disruptions, and revert committed tanker assignments.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowResetDialog(false)}
                className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowResetDialog(false);
                  await reset();
                }}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
