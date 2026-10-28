import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSim, fmtTime } from "@/lib/sim/store";
import { ZONES, zoneLabel } from "@/lib/sim/network";
import { DemoBadge, Panel } from "@/components/jal/ui";
import { CrisisTriggerModal } from "@/components/jal/CrisisTriggerModal";
import { NetworkFlowDiagram } from "@/components/jal/NetworkFlowDiagram";
import { MultiAgentWorkflowStepper } from "@/components/jal/MultiAgentWorkflowStepper";
import { RecommendedPlanPanel } from "@/components/jal/RecommendedPlanPanel";
import { PlanComparisonSection } from "@/components/jal/PlanComparisonSection";
import { HumanApprovalModal } from "@/components/jal/HumanApprovalModal";
import type { Plan } from "@/lib/sim/engine";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Droplets,
  Layers,
  Loader2,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Truck,
  Wrench,
  XCircle,
  Zap,
} from "lucide-react";

export const Route = createFileRoute("/simulator")({
  head: () => ({
    meta: [
      { title: "Crisis Simulator — JalSetu Decision Support" },
      {
        name: "description",
        content:
          "Simulate urban water-network incidents, inspect multi-agent impact assessments, and compare response plans.",
      },
    ],
  }),
  component: SimulatorPage,
});

const btn =
  "inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";
const primaryBtn = `${btn} bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs`;
const secondaryBtn = `${btn} border bg-card hover:bg-accent text-foreground shadow-xs`;

const n = (v: number) => (v ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 1 });

interface ScenarioCardItem {
  key: string;
  category: string;
  title: string;
  severity: string;
  affectedAsset: string;
  consequence: string;
  expectedShortage: string;
}

const SCENARIOS_BY_CITY: Record<string, ScenarioCardItem[]> = {
  greater_noida: [
    {
      key: "pump_failure_p03",
      category: "Pump Failure",
      title: "Pump P-03 Mechanical Failure",
      severity: "HIGH",
      affectedAsset: "Pump P-03",
      consequence:
        "P-03 trips offline (0 of 18 MLD). Severely starves North (Z-01) and Market (Z-02) zones.",
      expectedShortage: "22.0 MLD",
    },
    {
      key: "treatment_reduction",
      category: "Treatment Derating",
      title: "Treatment Plant Derating (TP-01)",
      severity: "HIGH",
      affectedAsset: "Treatment Plant TP-01",
      consequence: "Filter coagulation failure derates TP-01 to 60% capacity (21 of 35 MLD).",
      expectedShortage: "11.0 MLD",
    },
    {
      key: "demand_surge",
      category: "Demand Surge",
      title: "Summer Heatwave Demand Surge",
      severity: "MODERATE",
      affectedAsset: "Distribution Network",
      consequence: "High summer temperatures spike demand by +30% across all 4 municipal zones.",
      expectedShortage: "14.8 MLD",
    },
    {
      key: "pipeline_disruption_l03",
      category: "Pipeline Disruption",
      title: "Primary Feeder L-03 Rupture",
      severity: "HIGH",
      affectedAsset: "Pipeline Link L-03",
      consequence:
        "Structural rupture in 600mm conduit L-03 severs all flow from TP-01 to Pump P-03.",
      expectedShortage: "22.0 MLD",
    },
    {
      key: "multiple_asset_failure",
      category: "Multiple-Asset Blackout",
      title: "Dual Pump Substation Blackout",
      severity: "CRITICAL",
      affectedAsset: "Pumps P-03 & P-04",
      consequence:
        "Electrical grid surge knocks out both P-03 and P-04, cutting 34 MLD of booster capacity.",
      expectedShortage: "36.0 MLD",
    },
  ],
  delhi: [
    {
      key: "delhi_trans_yamuna_pump",
      category: "Pump Failure",
      title: "Trans-Yamuna Booster Trip",
      severity: "HIGH",
      affectedAsset: "Booster P-DEL-01",
      consequence:
        "P-DEL-01 offline (0 of 24 MLD). Cuts off Old Delhi & Shahdara East transmission.",
      expectedShortage: "26.0 MLD",
    },
    {
      key: "delhi_wtp_derating",
      category: "Treatment Derating",
      title: "River Ammonia WTP Derating",
      severity: "HIGH",
      affectedAsset: "Sonia Vihar TP-DEL-01",
      consequence:
        "High raw water ammonia derates Sonia Vihar WTP to 50% capacity (22.5 of 45 MLD).",
      expectedShortage: "18.0 MLD",
    },
    {
      key: "delhi_heatwave_surge",
      category: "Demand Surge",
      title: "NCR Extreme Heatwave (+30%)",
      severity: "MODERATE",
      affectedAsset: "Capital Distribution Grid",
      consequence: "High summer temperatures drive capital civic water demand up by +30%.",
      expectedShortage: "15.6 MLD",
    },
    {
      key: "delhi_pipeline_rupture",
      category: "Pipeline Disruption",
      title: "Trans-Yamuna Trunk Pipeline Rupture",
      severity: "HIGH",
      affectedAsset: "Trunk Conduit DL-03",
      consequence: "Trans-Yamuna conduit DL-03 severed, halting supply to Booster P-DEL-01.",
      expectedShortage: "26.0 MLD",
    },
    {
      key: "delhi_dual_asset_cascade",
      category: "Multiple-Asset Blackout",
      title: "Sonia Vihar Cascade Blackout",
      severity: "CRITICAL",
      affectedAsset: "P-DEL-01 & TP-DEL-01",
      consequence:
        "Grid transformer fault takes down P-DEL-01 and cuts Sonia Vihar throughput to 30%.",
      expectedShortage: "38.5 MLD",
    },
  ],
  jaipur: [
    {
      key: "jaipur_mansarovar_pump",
      category: "Pump Failure",
      title: "Mansarovar Headworks Outage",
      severity: "HIGH",
      affectedAsset: "Primary Pump P-JPR-01",
      consequence:
        "P-JPR-01 offline (0 of 18 MLD). Severely starves C-Scheme and Mansarovar zones.",
      expectedShortage: "20.0 MLD",
    },
    {
      key: "jaipur_wtp_derating",
      category: "Treatment Derating",
      title: "Amanishah Filtration Loss",
      severity: "MODERATE",
      affectedAsset: "Amanishah WTP TP-JPR-01",
      consequence: "Clarifier fouling cuts Amanishah WTP throughput to 60% (19.2 of 32 MLD).",
      expectedShortage: "12.8 MLD",
    },
    {
      key: "jaipur_arid_surge",
      category: "Demand Surge",
      title: "Thar Desert Heatwave Surge (+35%)",
      severity: "MODERATE",
      affectedAsset: "Heritage City Distribution",
      consequence: "Extreme desert heatwave spikes city demand by +35% across all 4 zones.",
      expectedShortage: "14.2 MLD",
    },
    {
      key: "jaipur_pipeline_rupture",
      category: "Pipeline Disruption",
      title: "Mansarovar Main Pipeline Burst",
      severity: "HIGH",
      affectedAsset: "Main Feeder JP-03",
      consequence: "Main feeder line JP-03 burst severs throughput to Mansarovar booster.",
      expectedShortage: "20.0 MLD",
    },
    {
      key: "jaipur_compound_failure",
      category: "Multiple-Asset Blackout",
      title: "Bisalpur Intake & Booster Compound Outage",
      severity: "CRITICAL",
      affectedAsset: "SRC-JPR-01 & P-JPR-01",
      consequence:
        "Conduit breach at Bisalpur dam intake and booster trip cut over 65% of raw water.",
      expectedShortage: "32.0 MLD",
    },
  ],
  lucknow: [
    {
      key: "lucknow_hazratganj_pump",
      category: "Pump Failure",
      title: "Hazratganj Main Pump Trip",
      severity: "HIGH",
      affectedAsset: "Pump P-LKO-01",
      consequence: "P-LKO-01 offline (0 of 20 MLD). Cuts off supply to Hazratganj and Alambagh.",
      expectedShortage: "20.0 MLD",
    },
    {
      key: "lucknow_gomti_lowflow",
      category: "Treatment Derating",
      title: "Gomti Low Inflow WTP Derate",
      severity: "MODERATE",
      affectedAsset: "Aishbagh WTP TP-LKO-01",
      consequence:
        "Low seasonal river discharge derates Aishbagh throughput to 55% (19.8 of 36 MLD).",
      expectedShortage: "14.4 MLD",
    },
    {
      key: "lucknow_heatwave_surge",
      category: "Demand Surge",
      title: "Awadh Heatwave Surge (+30%)",
      severity: "MODERATE",
      affectedAsset: "Municipal Grid",
      consequence: "Intense pre-monsoon heatwave drives city civic demand up by +30%.",
      expectedShortage: "14.4 MLD",
    },
    {
      key: "lucknow_pipeline_rupture",
      category: "Pipeline Disruption",
      title: "Trans-Gomti Transmission Breach",
      severity: "HIGH",
      affectedAsset: "Feeder Line LK-03",
      consequence: "Underground conduit LK-03 collapse cuts water delivery to Hazratganj pump.",
      expectedShortage: "20.0 MLD",
    },
    {
      key: "lucknow_dual_pump",
      category: "Multiple-Asset Blackout",
      title: "Trans-Gomti Dual Pump Substation Trip",
      severity: "CRITICAL",
      affectedAsset: "Pumps P-LKO-01 & P-LKO-02",
      consequence:
        "Substation flood knocks out both booster stations, cutting 36 MLD distribution.",
      expectedShortage: "36.0 MLD",
    },
  ],
  bengaluru: [
    {
      key: "blr_booster_trip",
      category: "Pump Failure",
      title: "Tech Corridor Booster Trip",
      severity: "HIGH",
      affectedAsset: "Booster P-BLR-02",
      consequence:
        "P-BLR-02 trips offline (0 of 18 MLD). Cuts Whitefield Tech Hub and Indiranagar.",
      expectedShortage: "19.0 MLD",
    },
    {
      key: "blr_wtp_derating",
      category: "Treatment Derating",
      title: "T.K. Halli Filter Derating",
      severity: "HIGH",
      affectedAsset: "T.K. Halli WTP TP-BLR-01",
      consequence: "Algal bloom at intake derates T.K. Halli WTP capacity to 55% (22 of 40 MLD).",
      expectedShortage: "17.0 MLD",
    },
    {
      key: "blr_summer_deficit",
      category: "Demand Surge",
      title: "Pre-Monsoon Peak Deficit Surge (+30%)",
      severity: "MODERATE",
      affectedAsset: "IT Corridor Network",
      consequence: "Commercial and hospital facilities drive demand up by +30% across Bengaluru.",
      expectedShortage: "14.0 MLD",
    },
    {
      key: "blr_pipeline_rupture",
      category: "Pipeline Disruption",
      title: "East Corridor Feeder Rupture",
      severity: "HIGH",
      affectedAsset: "Pipeline BL-03",
      consequence: "Metro construction damage ruptures main transmission pipeline BL-03.",
      expectedShortage: "19.0 MLD",
    },
    {
      key: "blr_compound_failure",
      category: "Multiple-Asset Blackout",
      title: "Cauvery Stage IV Dual Station Trip",
      severity: "CRITICAL",
      affectedAsset: "Pumps P-BLR-01 & P-BLR-02",
      consequence: "Lightning strike on high-voltage line trips both Cauvery booster stations.",
      expectedShortage: "38.0 MLD",
    },
  ],
};

function SimulatorPage() {
  const { state, m, cityId, cityName, loading, error, analyse, reset } = useSim();
  const inc = state.incident;
  const analysis = inc?.analysis;
  const scenarioCards = SCENARIOS_BY_CITY[cityId] || SCENARIOS_BY_CITY.greater_noida;

  const [isTriggerModalOpen, setIsTriggerModalOpen] = useState(false);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [planToApprove, setPlanToApprove] = useState<Plan | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const handleOpenApproval = (planId: string) => {
    const p = state.plans.find((x) => x.id === planId);
    if (p) {
      setPlanToApprove(p);
      setIsApprovalModalOpen(true);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Water Crisis Simulator & Decision Support
            </h2>
            <DemoBadge>{cityName} Network</DemoBadge>
          </div>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Trigger operational water-network disruptions in <strong>{cityName}</strong>, inspect
            connected multi-agent impact diagnostics, evaluate physical safety constraints, and
            exercise human-in-the-loop decision-making.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsTriggerModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 shadow-md transition-all cursor-pointer"
          >
            <Zap className="h-4 w-4" /> Run Water Crisis Simulation
          </button>

          {inc && (
            <button
              onClick={() => setConfirmReset(true)}
              className={secondaryBtn}
              disabled={loading}
              title="Reset crisis and return to baseline"
            >
              <RotateCcw className="h-4 w-4" /> Reset
            </button>
          )}

          {loading && (
            <span className="flex items-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Orchestrating...
            </span>
          )}
        </div>
      </div>

      {/* KPI Overview Strip */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            l: "Simulated Daily Demand",
            v: `${n(m.totalDemand)} MLD`,
            h: `${m.zones.length} urban zones in ${cityName}`,
            tone: "text-foreground",
          },
          {
            l: "Available Pipe Supply",
            v: `${n(m.totalSupplied)} MLD`,
            h: inc ? "Constrained by active incident" : "Baseline operating throughput",
            tone: inc && m.totalSupplied < m.totalDemand ? "text-warning" : "text-foreground",
          },
          {
            l: "Unmet Demand (Deficit)",
            v: `${n(m.totalUnmet)} MLD`,
            h: inc ? "Active municipal shortfall" : "Zero deficit (normal baseline)",
            tone: m.totalUnmet > 0 ? "text-critical" : "text-success",
          },
          {
            l: "Emergency Tanker Fleet",
            v: `${m.tankersAvailable} / ${m.tankersAvailable + m.tankersDeployed}`,
            h: `${m.tankersDeployed} deployed on relief routes`,
            tone: "text-primary",
          },
        ].map((x) => (
          <div key={x.l} className="rounded-xl border bg-card p-4 shadow-xs">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {x.l}
            </p>
            <p className={`mt-2 font-display text-2xl font-bold ${x.tone}`}>{x.v}</p>
            <p className="mt-1 text-xs text-muted-foreground">{x.h}</p>
          </div>
        ))}
      </div>

      {/* Connected 4-Stage Multi-Agent Workflow */}
      <MultiAgentWorkflowStepper />

      {/* Section 1: Scenario Triggering & Management */}
      <Panel
        title={`1 · Water Crisis Simulation Scenarios — ${cityName}`}
        subtitle="Select a verified operational disruption supported by the municipal topology to launch the multi-agent decision pipeline."
        action={
          <button
            onClick={() => setIsTriggerModalOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline cursor-pointer"
          >
            <span>Open Advanced Scenario Selector</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        }
      >
        {/* Active Incident Banner */}
        {inc && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-warning/40 bg-warning/5 p-4.5">
            <div className="flex items-center gap-3.5">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-warning/15 text-warning">
                <AlertTriangle className="h-6 w-6" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-foreground">
                    {inc.id}: {inc.label}
                  </p>
                  <span className="rounded-full bg-warning/20 px-2 py-0.5 text-[10px] font-bold uppercase text-warning">
                    {inc.status}
                  </span>
                  {inc.approvedPlanId && (
                    <span className="rounded-full bg-success/20 px-2 py-0.5 text-[10px] font-bold text-success flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3" /> Plan {inc.approvedPlanId} Approved
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Triggered at {fmtTime(inc.triggeredAt)} · Initial net deficit:{" "}
                  <strong className="text-foreground">
                    {n(inc.analysis?.totalShortage ?? 0)} MLD
                  </strong>{" "}
                  across {inc.analysis?.affected.length || 0} civic zones
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsTriggerModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-accent text-foreground shadow-xs cursor-pointer"
              >
                <Layers className="h-3.5 w-3.5 text-primary" /> Switch Scenario
              </button>
              <button
                onClick={() => setConfirmReset(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-warning/40 bg-card px-3 py-1.5 text-xs font-semibold text-warning hover:bg-warning/10 shadow-xs cursor-pointer"
                disabled={loading}
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset Crisis
              </button>
            </div>
          </div>
        )}

        {/* Quick Launch Scenario Cards */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {scenarioCards.map((sc) => {
            const isSelected = inc?.type === sc.key;
            return (
              <div
                key={sc.key}
                className={`flex flex-col justify-between rounded-xl border p-4 transition-all ${
                  isSelected
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30 shadow-sm"
                    : "bg-card hover:border-primary/40 shadow-xs"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground uppercase">
                      {sc.category}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                        sc.severity === "CRITICAL"
                          ? "bg-critical/15 text-critical"
                          : sc.severity === "HIGH"
                            ? "bg-warning/15 text-warning"
                            : "bg-cyan/15 text-cyan"
                      }`}
                    >
                      {sc.severity}
                    </span>
                  </div>

                  <h3 className="mt-2 text-xs font-bold text-foreground leading-snug">
                    {sc.title}
                  </h3>

                  <p className="mt-1 text-[11px] text-muted-foreground">
                    <strong className="text-foreground">Asset: </strong>
                    {sc.affectedAsset}
                  </p>

                  <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground line-clamp-3">
                    {sc.consequence}
                  </p>
                </div>

                <div className="mt-3.5 pt-3 border-t">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-2">
                    <span>Est. Shortage:</span>
                    <span className="font-mono font-bold text-foreground">
                      {sc.expectedShortage}
                    </span>
                  </div>

                  <button
                    className={`w-full ${primaryBtn} text-xs py-1.5 cursor-pointer`}
                    disabled={loading || isSelected}
                    onClick={() => analyse(sc.key)}
                  >
                    {loading && isSelected ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Zap className="h-3.5 w-3.5" />
                    )}
                    {isSelected ? "Active Scenario" : "Trigger Crisis"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* Section 2: Incident Impact Assessment & Flow Diagnostics */}
      {inc && analysis && (
        <Panel
          title={`2 · Incident Impact Assessment & Flow Diagnostics — ${cityName}`}
          subtitle="Formulated by the Incident Analysis Agent via NetworkX graph reachability and capacity constraint tracing."
        >
          {/* Top Impact Metric Cards */}
          <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border bg-muted/30 p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Immediate Net Shortage
              </p>
              <p className="mt-1 font-display text-xl font-bold text-critical">
                {n(analysis.totalShortage)} MLD
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Civic demand deficit before mitigation
              </p>
            </div>

            <div className="rounded-xl border bg-muted/30 p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Affected Civic Zones
              </p>
              <p className="mt-1 font-display text-xl font-bold text-foreground">
                {analysis.affected.length} / {ZONES.length}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {analysis.affected.map((z) => zoneLabel(z)).join(", ") || "None"}
              </p>
            </div>

            <div className="rounded-xl border bg-muted/30 p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Available Supply Ratio
              </p>
              <p className="mt-1 font-display text-xl font-bold text-foreground">
                {Math.round((analysis.totalSupply / Math.max(analysis.totalDemand, 1)) * 100)}%
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {n(analysis.totalSupply)} MLD of {n(analysis.totalDemand)} MLD demand
              </p>
            </div>

            <div className="rounded-xl border bg-muted/30 p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Failed Assets / Links
              </p>
              <p className="mt-1 font-display text-xl font-bold text-critical">
                {(analysis.failed_assets?.length || 0) + (analysis.failed_links?.length || 0) || 1}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground truncate font-mono">
                {[...(analysis.failed_assets || []), ...(analysis.failed_links || [])].join(", ") ||
                  "Disruption"}
              </p>
            </div>
          </div>

          {/* Impact Explanation Callout */}
          <div className="mb-5 rounded-xl border border-warning/30 bg-warning/5 p-4">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wide">
                  Incident Mechanism & Impact Explanation
                </h4>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  {analysis.explanation ||
                    `The disruption caused by ${inc.label} has derated primary transmission throughput, creating downstream hydraulic bottlenecks and starving downstream civic zones.`}
                </p>
                {analysis.reasoning && analysis.reasoning.length > 0 && (
                  <ul className="mt-2.5 space-y-1 text-xs text-muted-foreground border-t pt-2">
                    {analysis.reasoning.map((r, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Interactive Topological Network Flow Diagram */}
          <div className="mb-5">
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Network Flow & Asset Status Diagnostic
              </h4>
              <span className="text-[11px] text-muted-foreground">
                Interactive: Click any asset or zone node to inspect telemetry
              </span>
            </div>
            <NetworkFlowDiagram />
          </div>

          {/* Detailed Zonal Deficit Table */}
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b">
                <tr>
                  <th className="py-2.5 px-4 text-left">Civic Supply Zone</th>
                  <th className="py-2.5 px-3 text-right">Daily Demand</th>
                  <th className="py-2.5 px-3 text-right">Baseline Supply</th>
                  <th className="py-2.5 px-3 text-right">Incident Supply</th>
                  <th className="py-2.5 px-3 text-right">Estimated Deficit</th>
                  <th className="py-2.5 px-4 text-left">Limiting Hydraulic Bottleneck</th>
                </tr>
              </thead>
              <tbody className="divide-y font-mono">
                {analysis.impacts.map((i) => {
                  const isSevered = i.shortage > 0;
                  return (
                    <tr
                      key={i.zoneId}
                      className={`hover:bg-muted/30 ${isSevered ? "bg-critical/5" : ""}`}
                    >
                      <td className="py-3 px-4 font-sans font-semibold text-foreground">
                        {zoneLabel(i.zoneId)}
                      </td>
                      <td className="py-3 px-3 text-right">{n(i.demand)} MLD</td>
                      <td className="py-3 px-3 text-right">{n(i.baseline)} MLD</td>
                      <td className="py-3 px-3 text-right font-bold text-foreground">
                        {n(i.incident)} MLD
                      </td>
                      <td
                        className={`py-3 px-3 text-right font-bold ${
                          isSevered ? "text-critical" : "text-success"
                        }`}
                      >
                        {isSevered ? `-${n(i.shortage)} MLD` : "Fulfilled"}
                      </td>
                      <td className="py-3 px-4 text-xs font-sans text-muted-foreground">
                        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                          {i.bottleneck}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* Recommended Response Panel */}
      {inc && state.plans.length > 0 && <RecommendedPlanPanel onApprove={handleOpenApproval} />}

      {/* Candidate Response Plans & Solution Comparison */}
      {inc && state.plans.length > 0 && <PlanComparisonSection onApprove={handleOpenApproval} />}

      {/* Baseline Network Flow if no incident is active */}
      {!inc && (
        <Panel
          title="Simulated Network Baseline (Normal Operating Conditions)"
          subtitle="All reservoirs, treatment plants, booster pumps, and civic distribution pipelines are operating within nominal limits."
        >
          {/* Baseline Flow Diagram */}
          <div className="mb-6">
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-foreground">
              Municipal Network Flow Topology — {cityName}
            </h4>
            <NetworkFlowDiagram />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <h3 className="mb-3 text-sm font-bold text-foreground">Municipal Zones & Demands</h3>
              <div className="space-y-3">
                {m.zones.map((z) => (
                  <div key={z.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground">
                        {z.id} · {z.name}{" "}
                        <span className="text-[10px] text-muted-foreground font-normal">
                          ({z.priority} priority)
                        </span>
                      </span>
                      <span className="font-mono">
                        {n(z.supplied)} / {n(z.demand)} MLD
                      </span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.min(100, (z.supplied / z.demand) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-bold text-foreground">Infrastructure Assets</h3>
              <div className="space-y-2.5">
                {m.assets.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-foreground">{a.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {a.kind.toUpperCase()} · {a.id}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm font-semibold text-foreground">
                        {n(a.flow)} / {n(a.effective)} MLD
                      </p>
                      <span className="rounded bg-success/15 px-1.5 py-0.5 text-[10px] font-bold text-success">
                        OPERATIONAL
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Panel>
      )}

      {/* Advanced Scenario Selection Modal */}
      <CrisisTriggerModal
        isOpen={isTriggerModalOpen}
        onClose={() => setIsTriggerModalOpen(false)}
      />

      {/* Human Approval Confirmation Modal */}
      <HumanApprovalModal
        isOpen={isApprovalModalOpen}
        onClose={() => {
          setIsApprovalModalOpen(false);
          setPlanToApprove(null);
        }}
        plan={planToApprove}
      />

      {/* Reset Confirmation Modal */}
      {confirmReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-xl">
            <div className="flex items-center gap-3 text-warning">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="text-base font-bold text-foreground">Reset Current Crisis?</h3>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              This will restore the network baseline, remove the active incident from the SQLite
              database, and return all emergency tankers to ready status.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setConfirmReset(false);
                  await reset();
                }}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 cursor-pointer"
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
