import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  initialState,
  metrics,
  type Incident,
  type IncidentType,
  type LogEntry,
  type Plan,
  type SimState,
} from "./engine";
import {
  api,
  type CityData,
  type DashboardData,
  type IncidentRecord,
  type ResponsePlanData,
} from "@/lib/api";

export interface SimMetrics {
  zones: Array<{
    id: string;
    name: string;
    population: number;
    priority: "high" | "medium" | "low";
    demand: number;
    pipe: number;
    tanker: number;
    supplied: number;
    unmet: number;
    coverage_pct?: number;
  }>;
  totalDemand: number;
  totalSupplied: number;
  totalUnmet: number;
  zonesShort: number;
  assetsDegraded: number;
  tankersAvailable: number;
  tankersDeployed: number;
  assets: Array<{
    id: string;
    name: string;
    kind: string;
    capacity: number;
    effective: number;
    flow: number;
    status?: string;
    factor: number;
  }>;
  links: Array<{
    id: string;
    from?: string;
    to?: string;
    capacity: number;
    flow: number;
  }>;
}

interface Ctx {
  state: SimState;
  m: SimMetrics;
  cityId: string;
  cityName: string;
  availableCities: CityData[];
  setCity: (cityId: string) => Promise<void>;
  loading: boolean;
  error: string | null;
  backendConnected: boolean;
  clearError: () => void;
  analyse: (t: string) => Promise<void>;
  approve: (id: string, reason?: string) => Promise<void>;
  reject: (id: string, reason?: string) => Promise<void>;
  reset: () => Promise<void>;
  refresh: () => Promise<void>;
  intervene: (
    assetId: string,
    status: "normal" | "degraded" | "offline",
    factor?: number,
  ) => Promise<void>;
}

const SimContext = createContext<Ctx | null>(null);

function mapBackendPlanToSimPlan(p: ResponsePlanData): Plan {
  return {
    id: p.plan_key || p.id,
    name: p.name,
    strategy: p.strategy,
    objective: p.objective,
    plain_english: p.plain_english,
    why_useful: p.why_useful,
    benefiting_zones: p.benefiting_zones,
    resource_consumption: p.resource_consumption,
    benefits: p.benefits,
    alloc: p.alloc,
    tankers: p.tankers,
    tankersUsed: p.tankersUsed,
    totalSupplied: p.totalSupplied,
    unmet: p.unmet,
    unmetByZone: p.unmetByZone,
    tradeOffs: p.tradeOffs,
    violations: p.violations,
    feasible: p.feasible,
    recommended: p.recommended,
    decision: p.decision,
  };
}

function mapBackendIncidentToSimIncident(inc: IncidentRecord): Incident {
  return {
    id: inc.id,
    type: (inc.type as IncidentType) || "pump_failure_p03",
    label: inc.label,
    triggeredAt: inc.triggeredAt,
    status: inc.status,
    analysis: inc.analysis,
    before: {},
    approvedPlanId: inc.approvedPlanId ? inc.approvedPlanId.replace(/^.*-PLAN-/, "") : null,
    resolvedAt: inc.resolvedAt ?? null,
  };
}

export function SimProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SimState>(initialState);
  const [cityId, setCityId] = useState<string>("greater_noida");
  const [cityName, setCityName] = useState<string>("Greater Noida");
  const [availableCities, setAvailableCities] = useState<CityData[]>([
    {
      id: "greater_noida",
      name: "Greater Noida",
      state: "Uttar Pradesh",
      description: "NCR industrial/residential hub",
      tanker_fleet: 8,
      zone_count: 4,
      asset_count: 4,
      default_scenario: "pump_failure_p03",
    },
    {
      id: "delhi",
      name: "Delhi",
      state: "National Capital Territory",
      description: "Capital metropolitan region",
      tanker_fleet: 10,
      zone_count: 4,
      asset_count: 4,
      default_scenario: "delhi_trans_yamuna_pump",
    },
    {
      id: "jaipur",
      name: "Jaipur",
      state: "Rajasthan",
      description: "Semi-arid heritage capital",
      tanker_fleet: 12,
      zone_count: 4,
      asset_count: 4,
      default_scenario: "jaipur_mansarovar_pump",
    },
    {
      id: "lucknow",
      name: "Lucknow",
      state: "Uttar Pradesh",
      description: "Administrative capital on Gomti basin",
      tanker_fleet: 8,
      zone_count: 4,
      asset_count: 4,
      default_scenario: "lucknow_hazratganj_pump",
    },
    {
      id: "bengaluru",
      name: "Bengaluru",
      state: "Karnataka",
      description: "Southern IT capital on Cauvery Stage IV",
      tanker_fleet: 14,
      zone_count: 4,
      asset_count: 4,
      default_scenario: "blr_booster_trip",
    },
  ]);
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [backendConnected, setBackendConnected] = useState<boolean>(false);

  const clearError = useCallback(() => setError(null), []);

  const syncFromDashboard = useCallback(
    async (targetCity?: string) => {
      const activeCity = targetCity || cityId;
      try {
        const data: DashboardData = await api.getDashboard(activeCity);
        setBackendConnected(true);
        if (data.city_name) setCityName(data.city_name);
        if (data.available_cities && data.available_cities.length > 0) {
          setAvailableCities(data.available_cities);
        }
        setDashboardMetrics(data);

        setState((prev) => {
          let activeIncident: Incident | null = null;
          let activePlans: Plan[] = [];
          const tankersDeployed = data.tankers_deployed || 0;

          // Current zone allocations from DB
          const currentAlloc = Object.fromEntries(
            data.zones.map((z) => [z.id, { pipe: z.pipe, tanker: z.tanker }]),
          );

          // Assets factors from DB
          const assetFactor = Object.fromEntries(data.assets.map((a) => [a.id, a.factor]));

          if (data.current_incident) {
            activeIncident = mapBackendIncidentToSimIncident(data.current_incident);
            activePlans = (data.current_incident.plans || []).map(mapBackendPlanToSimPlan);
          }

          // Logs from recent audit & agent runs
          const logEntries: LogEntry[] = [];
          for (const ar of data.recent_agent_runs || []) {
            logEntries.push({
              at: ar.completed_at || ar.started_at,
              step: ar.agent_name.includes("Analysis")
                ? "Crisis Assessment"
                : ar.agent_name.includes("Optimization")
                  ? "Resource Planning"
                  : ar.agent_name.includes("Validation")
                    ? "Resource Planning"
                    : "Response Coordination",
              message: `${ar.agent_name}: ${ar.input_summary} → Status: ${ar.status.toUpperCase()}`,
            });
          }
          for (const au of data.recent_audit || []) {
            logEntries.push({
              at: au.timestamp,
              step: au.actor === "Operator" ? "Operator" : "Monitoring",
              message: au.description,
            });
          }

          return {
            ...prev,
            conditions: {
              assetFactor,
              demandFactor: activeIncident?.type === "demand_surge" ? 1.3 : 1.0,
            },
            current: currentAlloc,
            tankersDeployed,
            incident: activeIncident,
            plans: activePlans,
            log: logEntries,
          };
        });
      } catch (err: any) {
        setBackendConnected(false);
        console.warn("Backend sync failed, running in fallback mode:", err.message);
      }
    },
    [cityId],
  );

  // Initial sync on mount and periodic refresh
  useEffect(() => {
    syncFromDashboard();
    const interval = setInterval(() => syncFromDashboard(), 5000);
    return () => clearInterval(interval);
  }, [syncFromDashboard]);

  const setCity = useCallback(
    async (newCityId: string) => {
      setCityId(newCityId);
      setLoading(true);
      setError(null);
      try {
        await syncFromDashboard(newCityId);
      } catch (err: any) {
        setError(`Failed to switch city to ${newCityId}`);
      } finally {
        setLoading(false);
      }
    },
    [syncFromDashboard],
  );

  const analyse = useCallback(
    async (type: string) => {
      setLoading(true);
      setError(null);
      try {
        await api.createIncident(type, cityId);
        await syncFromDashboard(cityId);
      } catch (err: any) {
        setError(err.message || "Failed to trigger incident analysis on backend");
      } finally {
        setLoading(false);
      }
    },
    [cityId, syncFromDashboard],
  );

  const approve = useCallback(
    async (planId: string, reason?: string) => {
      setLoading(true);
      setError(null);
      try {
        await api.approvePlan(planId, reason);
        await syncFromDashboard(cityId);
      } catch (err: any) {
        setError(err.message || "Failed to approve plan on backend");
      } finally {
        setLoading(false);
      }
    },
    [cityId, syncFromDashboard],
  );

  const reject = useCallback(
    async (planId: string, reason?: string) => {
      setLoading(true);
      setError(null);
      try {
        await api.rejectPlan(planId, reason);
        await syncFromDashboard(cityId);
      } catch (err: any) {
        setError(err.message || "Failed to reject plan on backend");
      } finally {
        setLoading(false);
      }
    },
    [cityId, syncFromDashboard],
  );

  const reset = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await api.resetDemo(cityId);
      await syncFromDashboard(cityId);
    } catch (err: any) {
      setError(err.message || "Failed to reset simulation on backend");
    } finally {
      setLoading(false);
    }
  }, [cityId, syncFromDashboard]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      await syncFromDashboard(cityId);
    } finally {
      setLoading(false);
    }
  }, [cityId, syncFromDashboard]);

  const intervene = useCallback(
    async (assetId: string, status: "normal" | "degraded" | "offline", factor?: number) => {
      setLoading(true);
      setError(null);
      try {
        await api.interveneAsset(assetId, { status, factor });
        await syncFromDashboard(cityId);
      } catch (err: any) {
        setError(err.message || "Failed to update asset status on backend");
      } finally {
        setLoading(false);
      }
    },
    [cityId, syncFromDashboard],
  );

  const computedMetrics = useMemo<SimMetrics>(() => {
    if (dashboardMetrics && dashboardMetrics.zones && dashboardMetrics.zones.length > 0) {
      return {
        zones: dashboardMetrics.zones.map((z) => ({
          ...z,
          priority: z.priority as "high" | "medium" | "low",
        })),
        totalDemand: dashboardMetrics.total_demand,
        totalSupplied: dashboardMetrics.total_supplied,
        totalUnmet: dashboardMetrics.total_unmet,
        zonesShort: dashboardMetrics.zones_short,
        assetsDegraded: dashboardMetrics.assets.filter((a) => a.factor < 1.0).length,
        tankersAvailable: dashboardMetrics.tankers_available,
        tankersDeployed: dashboardMetrics.tankers_deployed,
        assets: dashboardMetrics.assets,
        links: metrics(state).links || [],
      };
    }
    return metrics(state);
  }, [dashboardMetrics, state]);

  const value = useMemo<Ctx>(() => {
    return {
      state,
      m: computedMetrics,
      cityId,
      cityName,
      availableCities,
      setCity,
      loading,
      error,
      backendConnected,
      clearError,
      analyse,
      approve,
      reject,
      reset,
      refresh,
      intervene,
    };
  }, [
    state,
    computedMetrics,
    cityId,
    cityName,
    availableCities,
    setCity,
    loading,
    error,
    backendConnected,
    clearError,
    analyse,
    approve,
    reject,
    reset,
    refresh,
    intervene,
  ]);

  return <SimContext.Provider value={value}>{children}</SimContext.Provider>;
}

export function useSim() {
  const c = useContext(SimContext);
  if (!c) throw new Error("useSim must be used inside SimProvider");
  return c;
}

export const fmtTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
};
