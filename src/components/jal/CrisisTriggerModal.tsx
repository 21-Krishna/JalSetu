import { useState, useMemo } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Droplets,
  Layers,
  Loader2,
  MapPin,
  Play,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Truck,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { useSim } from "@/lib/sim/store";
import { DemoBadge } from "./ui";

interface CrisisTriggerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggered?: (scenarioKey: string) => void;
}

export type ScenarioCategory =
  | "all"
  | "pump_failure"
  | "treatment_reduction"
  | "demand_surge"
  | "pipeline_disruption"
  | "multiple_asset_failure";

const CATEGORY_TABS: Array<{ id: ScenarioCategory; label: string; icon: any }> = [
  { id: "all", label: "All Scenarios", icon: Layers },
  { id: "pump_failure", label: "Pump Failure", icon: Wrench },
  { id: "treatment_reduction", label: "Treatment Derating", icon: Droplets },
  { id: "demand_surge", label: "Demand Surge", icon: AlertTriangle },
  { id: "pipeline_disruption", label: "Pipeline Disruption", icon: ShieldAlert },
  { id: "multiple_asset_failure", label: "Multiple-Asset Blackout", icon: Zap },
];

export function CrisisTriggerModal({ isOpen, onClose, onTriggered }: CrisisTriggerModalProps) {
  const { state, cityId, cityName, availableCities, setCity, analyse, loading, error, clearError } =
    useSim();

  const [activeCategory, setActiveCategory] = useState<ScenarioCategory>("all");
  const [selectedScenarioKey, setSelectedScenarioKey] = useState<string | null>(null);

  // Consolidated supported scenarios by city
  const scenariosByCity = useMemo(
    () => ({
      greater_noida: [
        {
          key: "pump_failure_p03",
          label: "Pump Failure: P-03",
          description:
            "Booster pump P-03 trips offline (0 of 18 MLD). Severely starves North (Z-01) and Market (Z-02) zones.",
          category: "pump_failure" as const,
          severity: "HIGH" as const,
          simulated_condition: "Pump P-03 operating at 0 MLD (offline)",
          expected_impact:
            "Downstream flow severed to Z-01 North & Z-02 Market; 22.0 MLD immediate shortage",
          city_compatibility: ["Greater Noida"],
          affected_asset: "Pump P-03",
          deficit: "22.0 MLD",
        },
        {
          key: "treatment_reduction",
          label: "Treatment Capacity Reduction",
          description:
            "Kasna WTP (TP-01) throughput drops to 60% (21 of 35 MLD) following coagulant filter breakdown.",
          category: "treatment_reduction" as const,
          severity: "HIGH" as const,
          simulated_condition: "TP-01 operating at 21.0 MLD (60% effective capacity)",
          expected_impact:
            "Upstream treatment constriction limits total supply across city; 11.0 MLD shortage",
          city_compatibility: ["Greater Noida"],
          affected_asset: "Treatment Plant TP-01",
          deficit: "11.0 MLD",
        },
        {
          key: "demand_surge",
          label: "Heatwave Demand Surge (+30%)",
          description:
            "Unprecedented summer heatwave raises civic water demand by +30% across all 4 municipal zones.",
          category: "demand_surge" as const,
          severity: "MODERATE" as const,
          simulated_condition: "Civic demand multiplier at 1.30x (total 46.8 MLD)",
          expected_impact:
            "Network pipes operating at capacity ceiling; 14.8 MLD unmet municipal demand",
          city_compatibility: ["Greater Noida"],
          affected_asset: "Municipal Grid",
          deficit: "14.8 MLD",
        },
        {
          key: "pipeline_disruption_l03",
          label: "Transmission Pipeline Rupture: L-03",
          description:
            "Primary 800mm trunk pipeline L-03 (P-03 → Z-01) bursts under pressure, cutting delivery to North Zone.",
          category: "pipeline_disruption" as const,
          severity: "HIGH" as const,
          simulated_condition: "Link L-03 flow constricted to 0 MLD (ruptured pipe)",
          expected_impact:
            "Z-01 North completely isolated from pipe supply (10.0 MLD deficit); P-03 continues feeding Z-02",
          city_compatibility: ["Greater Noida"],
          affected_asset: "Pipeline Link L-03",
          deficit: "10.0 MLD",
        },
        {
          key: "multiple_asset_failure",
          label: "Dual Booster Station Blackout",
          description:
            "Simultaneous substation trip takes both booster pumping stations P-03 and P-04 offline.",
          category: "multiple_asset_failure" as const,
          severity: "CRITICAL" as const,
          simulated_condition: "Pumps P-03 (0 MLD) and P-04 (0 MLD) both offline",
          expected_impact:
            "Complete distribution grid collapse across all 4 zones; 36.0 MLD municipal deficit",
          city_compatibility: ["Greater Noida"],
          affected_asset: "Pumps P-03 & P-04",
          deficit: "36.0 MLD",
        },
      ],
      delhi: [
        {
          key: "delhi_trans_yamuna_pump",
          label: "Trans-Yamuna Booster Trip",
          description:
            "Booster P-DEL-01 fails unexpectedly (0 of 24 MLD). Supply severed to Civil Lines and Shahdara East.",
          category: "pump_failure" as const,
          severity: "HIGH" as const,
          simulated_condition: "Booster P-DEL-01 offline (0.0 / 24.0 MLD)",
          expected_impact:
            "Downstream flow cut off to DEL-Z01 and DEL-Z02; 26.0 MLD immediate deficit",
          city_compatibility: ["Delhi"],
          affected_asset: "Booster P-DEL-01",
          deficit: "26.0 MLD",
        },
        {
          key: "delhi_wtp_derating",
          label: "Raw Water Quality Drop: WTP Derated",
          description:
            "High river ammonia derates Sonia Vihar WTP (TP-DEL-01) to 50% capacity (22.5 of 45 MLD).",
          category: "treatment_reduction" as const,
          severity: "HIGH" as const,
          simulated_condition: "TP-DEL-01 constrained to 22.5 MLD (50% throughput)",
          expected_impact:
            "Upstream treatment cut reduces capacity across all Delhi zones; 18.0 MLD deficit",
          city_compatibility: ["Delhi"],
          affected_asset: "Sonia Vihar WTP",
          deficit: "18.0 MLD",
        },
        {
          key: "delhi_heatwave_surge",
          label: "NCR Severe Heatwave (+30% Surge)",
          description:
            "Civic water demand spikes by +30% during an intense summer heatwave in the national capital.",
          category: "demand_surge" as const,
          severity: "MODERATE" as const,
          simulated_condition: "Demand multiplier 1.30x across all capital zones",
          expected_impact: "Transmission links saturated at design ceiling; 15.6 MLD shortfall",
          city_compatibility: ["Delhi"],
          affected_asset: "Capital Distribution Grid",
          deficit: "15.6 MLD",
        },
        {
          key: "delhi_pipeline_rupture",
          label: "Trans-Yamuna Trunk Pipeline Burst: DL-03",
          description:
            "Main transmission conduit DL-03 (P-DEL-01 → DEL-Z01) ruptures under high river pressure.",
          category: "pipeline_disruption" as const,
          severity: "HIGH" as const,
          simulated_condition: "Link DL-03 severed to 0 MLD throughput",
          expected_impact:
            "Civil Lines & Old Delhi cut off (12.0 MLD deficit) while P-DEL-01 feeds DEL-Z02",
          city_compatibility: ["Delhi"],
          affected_asset: "Pipeline Link DL-03",
          deficit: "12.0 MLD",
        },
        {
          key: "delhi_dual_asset_cascade",
          label: "Compound Intake & Pumping Cascade",
          description:
            "P-DEL-01 trips offline while Sonia Vihar WTP derates to 50% due to turbidity shock.",
          category: "multiple_asset_failure" as const,
          severity: "CRITICAL" as const,
          simulated_condition: "P-DEL-01 at 0 MLD and TP-DEL-01 at 22.5 MLD (50%)",
          expected_impact:
            "Severe multi-stage outage starving Old Delhi, Shahdara, and throttling Lutyens; 31.0 MLD deficit",
          city_compatibility: ["Delhi"],
          affected_asset: "P-DEL-01 & TP-DEL-01",
          deficit: "31.0 MLD",
        },
      ],
      jaipur: [
        {
          key: "jaipur_mansarovar_pump",
          label: "Mansarovar Headworks Outage",
          description:
            "Primary pump P-JPR-01 trips offline (0 of 18 MLD). C-Scheme and Mansarovar supply severed.",
          category: "pump_failure" as const,
          severity: "HIGH" as const,
          simulated_condition: "P-JPR-01 offline (0.0 / 18.0 MLD)",
          expected_impact:
            "Downstream flow cut off to JPR-Z01 and JPR-Z02; 20.0 MLD immediate shortage",
          city_compatibility: ["Jaipur"],
          affected_asset: "Pump P-JPR-01",
          deficit: "20.0 MLD",
        },
        {
          key: "jaipur_wtp_derating",
          label: "Surajpura Filtration Throughput Constriction",
          description:
            "Surajpura WTP (TP-JPR-01) throughput constricted to 55% (18.7 of 34 MLD) due to raw water intake siltation.",
          category: "treatment_reduction" as const,
          severity: "HIGH" as const,
          simulated_condition: "TP-JPR-01 operating at 18.7 MLD (55% capacity)",
          expected_impact:
            "Filtration shortfall constrains distribution across all Jaipur zones; 15.3 MLD deficit",
          city_compatibility: ["Jaipur"],
          affected_asset: "Surajpura Filtration Works",
          deficit: "15.3 MLD",
        },
        {
          key: "jaipur_arid_surge",
          label: "Thar Desert Heatwave (+35% Surge)",
          description:
            "Intense arid summer conditions drive demand up by +35% across Jaipur historic zones.",
          category: "demand_surge" as const,
          severity: "MODERATE" as const,
          simulated_condition: "Civic demand multiplier at 1.35x across historic city",
          expected_impact: "High evaporation and peak residential usage; 14.2 MLD deficit",
          city_compatibility: ["Jaipur"],
          affected_asset: "Heritage Distribution Grid",
          deficit: "14.2 MLD",
        },
        {
          key: "jaipur_pipeline_rupture",
          label: "Mansarovar Conduit Rupture: JP-03",
          description: "Main supply conduit JP-03 (P-JPR-01 → JPR-Z01) fractures along Ajmer Road.",
          category: "pipeline_disruption" as const,
          severity: "HIGH" as const,
          simulated_condition: "Link JP-03 severed to 0 MLD throughput",
          expected_impact:
            "C-Scheme & Civil Lines cut off (8.0 MLD deficit) while P-JPR-01 feeds Mansarovar",
          city_compatibility: ["Jaipur"],
          affected_asset: "Pipeline Link JP-03",
          deficit: "8.0 MLD",
        },
        {
          key: "jaipur_compound_failure",
          label: "Bisalpur Dam Feeder & Booster Compound Trip",
          description:
            "Bisalpur Intake drops to 50% while Mansarovar headworks pump P-JPR-01 trips.",
          category: "multiple_asset_failure" as const,
          severity: "CRITICAL" as const,
          simulated_condition: "P-JPR-01 offline (0 MLD) and SRC-JPR-01 at 19 MLD (50%)",
          expected_impact:
            "Severe multi-stage failure starving Mansarovar and constraining Jawahar Circle; 24.0 MLD deficit",
          city_compatibility: ["Jaipur"],
          affected_asset: "P-JPR-01 & SRC-JPR-01",
          deficit: "24.0 MLD",
        },
      ],
      lucknow: [
        {
          key: "lucknow_hazratganj_pump",
          label: "Hazratganj Primary Pump Trip",
          description:
            "Distribution pump P-LKO-01 fails (0 of 20 MLD). Hazratganj and Alambagh zones severed.",
          category: "pump_failure" as const,
          severity: "HIGH" as const,
          simulated_condition: "P-LKO-01 offline (0.0 / 20.0 MLD)",
          expected_impact:
            "Downstream flow cut off to LKO-Z01 and LKO-Z02; 20.0 MLD immediate shortage",
          city_compatibility: ["Lucknow"],
          affected_asset: "Pump P-LKO-01",
          deficit: "20.0 MLD",
        },
        {
          key: "lucknow_gomti_lowflow",
          label: "Gomti Low Inflow: WTP Derated",
          description:
            "River silt and low seasonal discharge reduce Aishbagh throughput to 55% (19.8 of 36 MLD).",
          category: "treatment_reduction" as const,
          severity: "MODERATE" as const,
          simulated_condition: "Aishbagh WTP (TP-LKO-01) at 19.8 MLD (55% throughput)",
          expected_impact:
            "Treatment plant throttled, causing widespread delivery cuts; 14.4 MLD shortage",
          city_compatibility: ["Lucknow"],
          affected_asset: "Aishbagh WTP",
          deficit: "14.4 MLD",
        },
        {
          key: "lucknow_heatwave_surge",
          label: "Gangetic Plain Heatwave (+30% Surge)",
          description:
            "Peak summer temperature drives civic demand up by +30% across Lucknow administrative zones.",
          category: "demand_surge" as const,
          severity: "MODERATE" as const,
          simulated_condition: "Demand multiplier 1.30x across state capital",
          expected_impact: "Distribution piping bottlenecked at capacity ceiling; 13.8 MLD deficit",
          city_compatibility: ["Lucknow"],
          affected_asset: "State Capital Grid",
          deficit: "13.8 MLD",
        },
        {
          key: "lucknow_pipeline_rupture",
          label: "Hazratganj Trunk Pipeline Burst: LK-03",
          description:
            "Main feeder conduit LK-03 (P-LKO-01 → LKO-Z01) ruptures at Vidhan Sabha Marg.",
          category: "pipeline_disruption" as const,
          severity: "HIGH" as const,
          simulated_condition: "Link LK-03 severed to 0 MLD throughput",
          expected_impact:
            "Administrative Core (LKO-Z01) loses all pipe delivery (9.0 MLD deficit); P-LKO-01 feeds Alambagh",
          city_compatibility: ["Lucknow"],
          affected_asset: "Pipeline Link LK-03",
          deficit: "9.0 MLD",
        },
        {
          key: "lucknow_dual_pump",
          label: "Trans-Gomti & Hazratganj Dual Pump Outage",
          description:
            "Grid voltage surge knocks out both P-LKO-01 (20 MLD) and P-LKO-02 (16 MLD) simultaneously.",
          category: "multiple_asset_failure" as const,
          severity: "CRITICAL" as const,
          simulated_condition: "P-LKO-01 (0 MLD) and P-LKO-02 (0 MLD) both offline",
          expected_impact:
            "Complete shutdown of municipal pipeline delivery across all 4 zones; 32.0 MLD deficit",
          city_compatibility: ["Lucknow"],
          affected_asset: "P-LKO-01 & P-LKO-02",
          deficit: "32.0 MLD",
        },
      ],
      bengaluru: [
        {
          key: "blr_booster_trip",
          label: "East Tech Corridor Booster Trip",
          description:
            "Booster pump P-BLR-02 fails (0 of 18 MLD). Whitefield Tech Hub and Indiranagar cut off.",
          category: "pump_failure" as const,
          severity: "HIGH" as const,
          simulated_condition: "P-BLR-02 offline (0.0 / 18.0 MLD)",
          expected_impact:
            "Downstream flow cut off to Whitefield (BLR-Z03) and Indiranagar (BLR-Z04); 19.0 MLD deficit",
          city_compatibility: ["Bengaluru"],
          affected_asset: "Booster P-BLR-02",
          deficit: "19.0 MLD",
        },
        {
          key: "blr_wtp_derating",
          label: "T.K. Halli Inflow Clarifier Derate",
          description:
            "Cauvery intake high turbidity derates T.K. Halli purification plant to 55% (22.0 of 40 MLD).",
          category: "treatment_reduction" as const,
          severity: "HIGH" as const,
          simulated_condition: "TP-BLR-01 constricted to 22.0 MLD (55% throughput)",
          expected_impact:
            "Bulk purification deficit choking both booster stages; 18.0 MLD municipal shortage",
          city_compatibility: ["Bengaluru"],
          affected_asset: "T.K. Halli Purification Plant",
          deficit: "18.0 MLD",
        },
        {
          key: "blr_summer_deficit",
          label: "Pre-Monsoon Peak Deficit (+30% Surge)",
          description:
            "Rapid commercial and hospital demand surge increases municipal water demand by +30% across Bengaluru zones.",
          category: "demand_surge" as const,
          severity: "MODERATE" as const,
          simulated_condition: "Demand multiplier 1.30x across technology and residential clusters",
          expected_impact:
            "Lifting pipelines pushed past hydraulic capacity limits; 14.0 MLD shortfall",
          city_compatibility: ["Bengaluru"],
          affected_asset: "Cauvery Lifting Pipeline",
          deficit: "14.0 MLD",
        },
        {
          key: "blr_pipeline_rupture",
          label: "Koramangala CBD Transmission Burst: BL-03",
          description:
            "High-pressure transmission line BL-03 (P-BLR-01 → BLR-Z01) ruptures along Hosur Road.",
          category: "pipeline_disruption" as const,
          severity: "HIGH" as const,
          simulated_condition: "Link BL-03 flow constricted to 0 MLD",
          expected_impact:
            "Koramangala & CBD completely cut off from pipe supply (11.0 MLD deficit); P-BLR-01 feeds HSR Layout",
          city_compatibility: ["Bengaluru"],
          affected_asset: "Pipeline Link BL-03",
          deficit: "11.0 MLD",
        },
        {
          key: "blr_compound_failure",
          label: "Cauvery Lifting Cascade & Booster Fault",
          description:
            "Simultaneous grid blackout trips both South Lifting Station P-BLR-01 and Tech Booster P-BLR-02.",
          category: "multiple_asset_failure" as const,
          severity: "CRITICAL" as const,
          simulated_condition: "P-BLR-01 (0 MLD) and P-BLR-02 (0 MLD) both offline",
          expected_impact:
            "Total collapse of piped municipal supply across all 4 IT and residential zones (40.0 MLD deficit)",
          city_compatibility: ["Bengaluru"],
          affected_asset: "P-BLR-01 & P-BLR-02",
          deficit: "40.0 MLD",
        },
      ],
    }),
    [],
  );

  const cityScenarios =
    scenariosByCity[cityId as keyof typeof scenariosByCity] || scenariosByCity.greater_noida;

  const filteredScenarios = useMemo(() => {
    if (activeCategory === "all") return cityScenarios;
    return cityScenarios.filter((s) => s.category === activeCategory);
  }, [cityScenarios, activeCategory]);

  if (!isOpen) return null;

  const handleTrigger = async (key: string) => {
    try {
      setSelectedScenarioKey(key);
      await analyse(key);
      onClose();
      if (onTriggered) onTriggered(key);
    } catch {
      // error handled in store
    } finally {
      setSelectedScenarioKey(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border bg-card shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b px-6 py-4 bg-muted/30">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15 text-primary">
                <Zap className="h-4 w-4" />
              </span>
              <h2 className="text-lg font-bold text-foreground">Run Water Crisis Simulation</h2>
              <DemoBadge>{cityName} Network</DemoBadge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Select a municipal network and trigger a verified crisis scenario. All models operate
              with genuine NetworkX graph topology and deterministic 4-stage multi-agent
              orchestration.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* City Switcher Banner */}
        <div className="border-b bg-card/60 px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary shrink-0" />
            <span className="text-xs font-semibold text-foreground">Select Municipal City:</span>
            <select
              value={cityId}
              onChange={(e) => setCity(e.target.value)}
              disabled={loading}
              className="rounded-lg border bg-background px-3 py-1 text-xs font-medium text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40"
            >
              {availableCities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.state}) · {c.tanker_fleet} Tankers
                </option>
              ))}
            </select>
          </div>
          <div className="text-xs text-muted-foreground">
            Available scenarios for <strong>{cityName}</strong>: {cityScenarios.length}
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="border-b px-6 py-2.5 flex items-center gap-2 overflow-x-auto bg-muted/10">
          {CATEGORY_TABS.map((tab) => {
            const Icon = tab.icon;
            const count =
              tab.id === "all"
                ? cityScenarios.length
                : cityScenarios.filter((s) => s.category === tab.id).length;
            const isActive = activeCategory === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveCategory(tab.id)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-3 w-3" />
                <span>{tab.label}</span>
                <span
                  className={`ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                    isActive
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-card text-muted-foreground"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Error Notification if any */}
        {error && (
          <div className="mx-6 mt-4 flex items-center justify-between rounded-xl border border-critical/30 bg-critical/10 p-3 text-xs text-critical">
            <span>{error}</span>
            <button onClick={clearError} className="font-bold underline hover:no-underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Active Incident Warning if already triggered */}
        {state.incident && (
          <div className="mx-6 mt-4 flex items-center justify-between rounded-xl border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                Active crisis{" "}
                <strong>
                  {state.incident.id} ({state.incident.label})
                </strong>{" "}
                is currently in progress. Triggering a new scenario will replace active candidate
                plans.
              </span>
            </div>
          </div>
        )}

        {/* Scenarios Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredScenarios.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <AlertTriangle className="mx-auto h-8 w-8 opacity-40 mb-2" />
              <p className="text-sm font-semibold">No scenarios in this category for {cityName}.</p>
              <p className="text-xs mt-1">
                Select "All Scenarios" or switch cities to view other crisis modes.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredScenarios.map((sc) => {
                const isActiveScenario = state.incident?.type === sc.key;
                const isTriggeringThis = selectedScenarioKey === sc.key && loading;

                return (
                  <div
                    key={sc.key}
                    className={`flex flex-col justify-between rounded-xl border p-4.5 transition-all ${
                      isActiveScenario
                        ? "border-primary bg-primary/5 ring-1 ring-primary/40 shadow-sm"
                        : "bg-card hover:border-primary/40 hover:shadow-md"
                    }`}
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                              sc.severity === "CRITICAL"
                                ? "bg-critical/15 text-critical"
                                : sc.severity === "HIGH"
                                  ? "bg-warning/15 text-warning"
                                  : "bg-cyan/15 text-cyan"
                            }`}
                          >
                            {sc.severity}
                          </span>
                          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground capitalize">
                            {sc.category.replace("_", " ")}
                          </span>
                        </div>
                        <span className="font-mono text-xs font-bold text-critical">
                          -{sc.deficit}
                        </span>
                      </div>

                      {/* Title & Description */}
                      <h3 className="mt-2 text-sm font-bold text-foreground">{sc.label}</h3>
                      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                        {sc.description}
                      </p>

                      {/* Detailed Specifications */}
                      <div className="mt-3 space-y-1.5 rounded-lg bg-muted/40 p-2.5 text-[11px]">
                        <p className="flex items-start gap-1 text-muted-foreground">
                          <strong className="text-foreground shrink-0">Simulated Condition:</strong>
                          <span className="font-mono text-foreground/90">
                            {sc.simulated_condition}
                          </span>
                        </p>
                        <p className="flex items-start gap-1 text-muted-foreground">
                          <strong className="text-foreground shrink-0">Expected Impact:</strong>
                          <span>{sc.expected_impact}</span>
                        </p>
                        <p className="flex items-center gap-1 text-muted-foreground">
                          <strong className="text-foreground shrink-0">City Compatibility:</strong>
                          <span className="rounded bg-background px-1.5 py-0.2 font-semibold text-primary">
                            {sc.city_compatibility.join(", ")}
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Trigger Button */}
                    <div className="mt-4 pt-3 border-t flex items-center justify-between gap-3">
                      <span className="text-[11px] text-muted-foreground font-mono">
                        Target: {sc.affected_asset}
                      </span>
                      <button
                        onClick={() => handleTrigger(sc.key)}
                        disabled={loading}
                        className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all shadow-xs ${
                          isActiveScenario
                            ? "bg-warning text-warning-foreground hover:bg-warning/90"
                            : "bg-primary text-primary-foreground hover:bg-primary/90"
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {isTriggeringThis ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Orchestrating...
                          </>
                        ) : isActiveScenario ? (
                          <>
                            <RotateCcw className="h-3.5 w-3.5" /> Re-trigger Scenario
                          </>
                        ) : (
                          <>
                            <Play className="h-3.5 w-3.5 fill-current" /> Trigger Crisis
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="border-t bg-muted/20 px-6 py-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Simulated demonstration network for <strong>{cityName}</strong>. No live municipal valve
            control.
          </span>
          <button
            onClick={onClose}
            className="rounded-lg border bg-background px-4 py-1.5 font-medium hover:bg-accent"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
