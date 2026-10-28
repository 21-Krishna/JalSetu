import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSim, fmtTime } from "@/lib/sim/store";
import { api, type AgentRunData } from "@/lib/api";
import { Panel, DemoBadge } from "@/components/jal/ui";
import {
  Activity,
  ArrowRight,
  Bot,
  CheckCircle2,
  ChevronRight,
  Clock,
  Eye,
  FileCode,
  Radar,
  RefreshCw,
  ShieldCheck,
  Truck,
  X,
  XCircle,
  Zap,
} from "lucide-react";

export const Route = createFileRoute("/agents")({
  head: () => ({
    meta: [
      { title: "AI Multi-Agent Control Center — JalSetu" },
      {
        name: "description",
        content: "Traceable execution sequence of specialized decision agents.",
      },
    ],
  }),
  component: AgentsPage,
});

const AGENT_ROLES = [
  {
    name: "Incident Analysis Agent",
    icon: Radar,
    step: 1,
    role: "Graph Impact & Capacity Analysis",
    description:
      "Inspects network graph topology, identifies failed components, evaluates downstream zone exposure, and calculates immediate water supply deficit.",
  },
  {
    name: "Resource Optimization Agent",
    icon: Truck,
    step: 2,
    role: "Candidate Allocation Synthesis",
    description:
      "Evaluates multi-source network capacities and synthesizes alternative response strategies (Priority-first, Fair-share rationing, Counter-factual).",
  },
  {
    name: "Validation and Safety Agent",
    icon: ShieldCheck,
    step: 3,
    role: "Physical Constraint Verification",
    description:
      "Independently validates candidate plans against hard physical constraints: treatment throughput, pump limits, link design capacities, and tanker availability.",
  },
  {
    name: "Response Monitoring Agent",
    icon: Activity,
    step: 4,
    role: "Trade-off Ranking & Human Advisory",
    description:
      "Ranks feasible candidates using multi-criteria scoring, produces transparent explanations, and enforces human-in-the-loop confirmation before dispatch.",
  },
];

function AgentsPage() {
  const { state, cityName } = useSim();
  const inc = state.incident;

  const [backendRuns, setBackendRuns] = useState<AgentRunData[]>([]);
  const [selectedRun, setSelectedRun] = useState<AgentRunData | null>(null);
  const [loadingRuns, setLoadingRuns] = useState<boolean>(false);

  const fetchRuns = async () => {
    if (!inc?.id) {
      setBackendRuns([]);
      return;
    }
    setLoadingRuns(true);
    try {
      const runs = await api.getAgentRuns(inc.id);
      setBackendRuns(runs);
    } catch (e) {
      console.warn("Failed to fetch agent runs from backend:", e);
    } finally {
      setLoadingRuns(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, [inc?.id]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Multi-Agent Control Center — {cityName}
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Specialized decision-support agents execute distinct responsibilities for{" "}
            <strong>{cityName}</strong> in a deterministic, explainable pipeline. Each agent's
            input, output, execution time, and safety status are persisted to SQLite.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DemoBadge>{cityName} Decision Pipeline</DemoBadge>
          {inc && (
            <button
              onClick={fetchRuns}
              className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent shadow-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingRuns ? "animate-spin" : ""}`} /> Refresh
              Trace
            </button>
          )}
        </div>
      </div>

      {/* Sequential Agent Workflow Pipeline */}
      <Panel
        title="Execution Sequence & Pipeline Flow"
        subtitle={
          inc
            ? `Active incident: ${inc.id} (${inc.label}) · 4 stages executed`
            : "Trigger an incident in Crisis Simulator to observe live multi-agent execution."
        }
      >
        <div className="grid gap-4 md:grid-cols-4">
          {AGENT_ROLES.map((spec, idx) => {
            const Icon = spec.icon;
            const executedRun = backendRuns.find((r) =>
              r.agent_name.includes(spec.name.split(" ")[0]),
            );
            const isRan = !!executedRun;
            const isSuccess = executedRun?.status === "success";

            return (
              <div
                key={spec.name}
                className={`flex flex-col justify-between rounded-xl border p-4 transition-all ${
                  isRan
                    ? isSuccess
                      ? "border-success/40 bg-success/5 shadow-xs"
                      : "border-critical/40 bg-critical/5 shadow-xs"
                    : "bg-muted/30 opacity-70"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span
                      className={`grid h-9 w-9 place-items-center rounded-lg ${
                        isRan
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        isRan
                          ? isSuccess
                            ? "bg-success/20 text-success"
                            : "bg-critical/20 text-critical"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {isRan ? (isSuccess ? "EXECUTED" : "FAILED") : "IDLE"}
                    </span>
                  </div>

                  <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Stage {spec.step}
                  </p>
                  <h3 className="text-sm font-bold text-foreground">{spec.name}</h3>
                  <p className="mt-0.5 text-xs font-medium text-primary">{spec.role}</p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {spec.description}
                  </p>
                </div>

                <div className="mt-4 border-t pt-3">
                  {executedRun ? (
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {executedRun.duration_ms} ms
                      </span>
                      <button
                        onClick={() => setSelectedRun(executedRun)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                      >
                        <Eye className="h-3 w-3" /> Inspect JSON
                      </button>
                    </div>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">Awaiting trigger</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* Recorded Agent Runs from Backend Database */}
      <Panel
        title="Recorded Agent Execution Records"
        subtitle="Fetched from backend SQLite 'agent_runs' table with complete input summaries and duration logs."
      >
        {backendRuns.length > 0 ? (
          <div className="space-y-3">
            {backendRuns.map((run) => (
              <div
                key={run.id}
                className="flex flex-wrap items-start justify-between gap-4 rounded-xl border bg-card p-4 shadow-xs hover:border-primary/40 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 grid h-8 w-8 place-items-center rounded-lg ${
                      run.status === "success"
                        ? "bg-success/15 text-success"
                        : "bg-critical/15 text-critical"
                    }`}
                  >
                    {run.status === "success" ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-foreground">{run.agent_name}</span>
                      <span className="text-xs text-muted-foreground">({run.role})</span>
                      <span className="rounded bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                        {run.duration_ms} ms
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-foreground font-medium">
                      <strong>Input: </strong>
                      <span className="text-muted-foreground font-normal">{run.input_summary}</span>
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Started: {fmtTime(run.started_at)} · Completed: {fmtTime(run.completed_at)}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedRun(run)}
                  className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent transition-colors"
                >
                  <FileCode className="h-3.5 w-3.5 text-primary" /> Inspect Output
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center">
            <Bot className="mx-auto h-10 w-10 text-muted-foreground/60" />
            <p className="mt-3 text-sm font-semibold text-foreground">
              No agent runs recorded in database
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Trigger an incident scenario in the Crisis Simulator to generate traceable backend
              agent records.
            </p>
            <Link
              to="/simulator"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Open Crisis Simulator <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}
      </Panel>

      {/* Agent Output Inspection Modal */}
      {selectedRun && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="flex h-[80vh] w-full max-w-3xl flex-col rounded-2xl border bg-card shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b px-6 py-4 bg-muted/40">
              <div className="flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
                  <FileCode className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-foreground">{selectedRun.agent_name}</h3>
                  <p className="text-xs text-muted-foreground">
                    Incident: {selectedRun.incident_id} · Duration: {selectedRun.duration_ms} ms ·
                    Status: {selectedRun.status.toUpperCase()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRun(null)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Input Summary
                </p>
                <p className="mt-1 rounded-lg border bg-muted/30 p-3 text-xs text-foreground font-mono">
                  {selectedRun.input_summary}
                </p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Structured Output Data
                </p>
                <pre className="mt-1 overflow-x-auto rounded-lg border bg-slate-950 p-4 font-mono text-xs text-emerald-400">
                  {JSON.stringify(selectedRun.output_data, null, 2)}
                </pre>
              </div>

              {selectedRun.error_details && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-critical">
                    Error Details
                  </p>
                  <p className="mt-1 rounded-lg border border-critical/30 bg-critical/10 p-3 text-xs text-critical font-mono">
                    {selectedRun.error_details}
                  </p>
                </div>
              )}
            </div>

            <div className="border-t bg-muted/30 px-6 py-3 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedRun(null)}
                className="rounded-lg border bg-background px-4 py-2 text-xs font-semibold hover:bg-accent"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
