// Centralized API Client for JalSetu Backend

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api/v1";

export interface HealthStatus {
  status: "healthy" | "degraded";
  database: string;
  demo_mode: boolean;
  version: string;
  notice: string;
}

export interface CityData {
  id: string;
  name: string;
  state: string;
  description: string;
  tanker_fleet: number;
  zone_count: number;
  asset_count: number;
  default_scenario: string;
}

export interface ZoneData {
  id: string;
  city_id?: string;
  name: string;
  population: number;
  priority: "high" | "medium" | "low";
  demand: number;
  pipe: number;
  tanker: number;
  supplied: number;
  unmet: number;
  coverage_pct: number;
}

export interface AssetData {
  id: string;
  city_id?: string;
  name: string;
  kind: string;
  capacity: number;
  effective: number;
  flow: number;
  status: "normal" | "degraded" | "offline";
  factor: number;
}

export interface LinkData {
  id: string;
  city_id?: string;
  from_node: string;
  to_node: string;
  capacity: number;
  flow: number;
}

export interface ReservoirData {
  id: string;
  city_id?: string;
  name: string;
  zone: string;
  capacityML: number;
  currentML: number;
  inflowMLd: number;
  outflowMLd: number;
  level_pct: number;
  status: string;
  net_flow: number;
}

export interface NetworkState {
  city_id?: string;
  city_name?: string;
  assets: AssetData[];
  zones: ZoneData[];
  links: LinkData[];
  reservoirs: ReservoirData[];
  tanker_fleet: number;
  tankers_available: number;
  tankers_deployed: number;
}

export interface ZoneImpact {
  zoneId: string;
  demand: number;
  baseline: number;
  incident: number;
  shortage: number;
  loss: number;
  bottleneck: string;
}

export interface IncidentAnalysis {
  impacts: ZoneImpact[];
  affected: string[];
  totalDemand: number;
  totalSupply: number;
  totalShortage: number;
  reasoning: string[];
  failed_assets?: string[];
  failed_links?: string[];
  explanation?: string;
  recommended_plan_id?: string | null;
  scoring_criteria?: {
    formula: string;
    explanation: string;
    weights: Record<string, number>;
  } | null;
  safety_constraints_checked?: string[] | null;
  comparison_summary?: {
    strategy_breakdown: string;
    feasible_count: number;
    infeasible_count: number;
    recommendation_reason: string;
  } | null;
  rationale?: {
    provider: string;
    narrative: string;
    is_llm: boolean;
  } | null;
}

export interface BenefitingZoneData {
  zone_id: string;
  zone_name: string;
  priority: "high" | "medium" | "low";
  allocated_mld: number;
  pipe_mld: number;
  tanker_mld: number;
  demand_mld: number;
  unmet_mld: number;
  coverage_pct: number;
  status_note: string;
}

export interface ResourceConsumptionData {
  pipe_mld: number;
  tankers_count: number;
  tankers_mld: number;
  fleet_capacity: number;
  fleet_usage_pct: number;
}

export interface ScenarioData {
  key: string;
  label: string;
  description: string;
  category:
    | "pump_failure"
    | "treatment_reduction"
    | "demand_surge"
    | "pipeline_disruption"
    | "multiple_asset_failure";
  severity: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  simulated_condition: string;
  expected_impact: string;
  city_id: string;
  city_compatibility: string[];
  failed_asset?: string | null;
  failed_link?: string | null;
}

export interface ResponsePlanData {
  id: string;
  plan_key: string;
  name: string;
  strategy: string;
  objective?: string | null;
  plain_english?: string | null;
  why_useful?: string | null;
  benefiting_zones?: BenefitingZoneData[] | null;
  resource_consumption?: ResourceConsumptionData | null;
  benefits?: string[] | null;
  alloc: Record<string, { pipe: number; tanker: number }>;
  tankers: Record<string, number>;
  tankersUsed: number;
  totalSupplied: number;
  unmet: number;
  unmetByZone: Record<string, number>;
  tradeOffs: string[];
  violations: string[];
  feasible: boolean;
  recommended: boolean;
  decision: "pending" | "approved" | "rejected" | "superseded";
}

export interface AgentRunData {
  id: number;
  incident_id: string;
  agent_name: string;
  role: string;
  step_order: number;
  status: "success" | "failed" | "running";
  input_summary: string;
  output_data: Record<string, any>;
  error_details?: string | null;
  started_at: string;
  completed_at: string;
  duration_ms: number;
}

export interface IncidentRecord {
  id: string;
  city_id?: string;
  type: string;
  label: string;
  severity: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  status: "awaiting_approval" | "mitigated" | "all_rejected";
  triggeredAt: string;
  analysis: IncidentAnalysis;
  plans: ResponsePlanData[];
  approvedPlanId?: string | null;
  resolvedAt?: string | null;
}

export interface AuditEventData {
  id: number;
  incident_id?: string | null;
  city_id?: string;
  event_type: string;
  actor: string;
  description: string;
  timestamp: string;
  metadata: Record<string, any>;
}

export interface DashboardData {
  city_id: string;
  city_name: string;
  available_cities: CityData[];
  current_incident: IncidentRecord | null;
  total_demand: number;
  total_supplied: number;
  total_unmet: number;
  zones_short: number;
  tankers_available: number;
  tankers_deployed: number;
  assets: AssetData[];
  zones: ZoneData[];
  recent_agent_runs: AgentRunData[];
  recent_audit: AuditEventData[];
  demo_mode: boolean;
  demo_label: string;
}

class ApiError extends Error {
  status: number;
  details?: any;
  constructor(message: string, status: number, details?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${path}`;
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...options.headers,
  };

  try {
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      let errorBody: any = null;
      try {
        errorBody = await res.json();
      } catch {
        errorBody = await res.text();
      }
      const message =
        typeof errorBody === "object" && errorBody?.detail
          ? errorBody.detail
          : typeof errorBody === "string"
            ? errorBody
            : `HTTP Error ${res.status}: ${res.statusText}`;
      throw new ApiError(message, res.status, errorBody);
    }
    return (await res.json()) as T;
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(
      `Cannot connect to JalSetu Backend at ${url}. Ensure the Python FastAPI server is running on port 8000.`,
      0,
      err,
    );
  }
}

export const api = {
  getHealth: () => request<HealthStatus>("/health"),
  getCities: () => request<CityData[]>("/cities"),
  getCityDetail: (cityId: string) => request<any>(`/cities/${cityId}`),
  getScenarios: (cityId?: string) =>
    request<ScenarioData[]>(
      cityId
        ? `/incidents/scenarios?city_id=${encodeURIComponent(cityId)}`
        : "/incidents/scenarios",
    ),
  getDashboard: (cityId?: string) =>
    request<DashboardData>(
      cityId ? `/dashboard?city_id=${encodeURIComponent(cityId)}` : "/dashboard",
    ),
  getNetwork: (cityId?: string) =>
    request<NetworkState>(cityId ? `/network?city_id=${encodeURIComponent(cityId)}` : "/network"),
  getAssets: (cityId?: string) =>
    request<AssetData[]>(
      cityId ? `/network/assets?city_id=${encodeURIComponent(cityId)}` : "/network/assets",
    ),
  getAsset: (id: string) => request<AssetData>(`/network/assets/${id}`),
  interveneAsset: (
    id: string,
    payload: { status: "normal" | "degraded" | "offline"; factor?: number; reason?: string },
  ) =>
    request<AssetData>(`/network/assets/${id}/intervene`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getIncidents: (status?: string, cityId?: string) => {
    const q = new URLSearchParams();
    if (status) q.set("status", status);
    if (cityId) q.set("city_id", cityId);
    const qs = q.toString();
    return request<IncidentRecord[]>(qs ? `/incidents?${qs}` : "/incidents");
  },
  getIncident: (id: string) => request<IncidentRecord>(`/incidents/${id}`),
  createIncident: (scenario_type: string, city_id?: string) =>
    request<IncidentRecord>("/incidents", {
      method: "POST",
      body: JSON.stringify({ scenario_type, city_id }),
    }),
  analyseIncident: (id: string) =>
    request<IncidentRecord>(`/incidents/${id}/analyse`, {
      method: "POST",
    }),
  getAgentRuns: (incidentId: string) => request<AgentRunData[]>(`/incidents/${incidentId}/agents`),
  getPlans: (incidentId: string) => request<ResponsePlanData[]>(`/incidents/${incidentId}/plans`),
  getPlan: (planId: string) => request<ResponsePlanData>(`/plans/${planId}`),
  approvePlan: (planId: string, reason?: string) =>
    request<ResponsePlanData>(`/plans/${planId}/approve`, {
      method: "POST",
      body: JSON.stringify({ reason: reason || "Operator approved via dashboard" }),
    }),
  rejectPlan: (planId: string, reason?: string) =>
    request<ResponsePlanData>(`/plans/${planId}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason: reason || "Operator rejected via dashboard" }),
    }),
  getAllocations: (incidentId?: string) =>
    incidentId
      ? request<any[]>(`/allocations/incident/${incidentId}`)
      : request<any[]>("/allocations"),
  getAuditTrail: (params?: {
    incident_id?: string;
    city_id?: string;
    event_type?: string;
    actor?: string;
    limit?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.incident_id) q.set("incident_id", params.incident_id);
    if (params?.city_id) q.set("city_id", params.city_id);
    if (params?.event_type) q.set("event_type", params.event_type);
    if (params?.actor) q.set("actor", params.actor);
    if (params?.limit) q.set("limit", String(params.limit));
    const qs = q.toString();
    return request<AuditEventData[]>(qs ? `/audit?${qs}` : "/audit");
  },
  resetDemo: (cityId?: string) =>
    request<{ status: string; message: string; city_id?: string }>(
      cityId ? `/demo/reset?city_id=${encodeURIComponent(cityId)}` : "/demo/reset",
      { method: "POST" },
    ),
  seedDemo: (cityId?: string) =>
    request<IncidentRecord>(
      cityId ? `/demo/seed?city_id=${encodeURIComponent(cityId)}` : "/demo/seed",
      { method: "POST" },
    ),
};
