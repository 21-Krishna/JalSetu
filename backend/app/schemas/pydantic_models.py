from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field


class HealthStatus(BaseModel):
    status: str
    database: str
    demo_mode: bool
    version: str
    notice: str


class CityModel(BaseModel):
    id: str
    name: str
    state: str
    description: str
    tanker_fleet: int
    zone_count: int
    asset_count: int
    default_scenario: str


class ZoneModel(BaseModel):
    id: str
    city_id: str = "greater_noida"
    name: str
    population: int
    priority: Literal["high", "medium", "low"]
    demand: float
    pipe: float = 0.0
    tanker: float = 0.0
    supplied: float = 0.0
    unmet: float = 0.0
    coverage_pct: float = 0.0


class AssetModel(BaseModel):
    id: str
    city_id: str = "greater_noida"
    name: str
    kind: str
    capacity: float
    effective: float
    flow: float = 0.0
    status: str
    factor: float = 1.0


class LinkModel(BaseModel):
    id: str
    city_id: str = "greater_noida"
    from_node: str
    to_node: str
    capacity: float
    flow: float = 0.0


class ReservoirModel(BaseModel):
    id: str
    city_id: str = "greater_noida"
    name: str
    zone: str
    capacityML: float
    currentML: float
    inflowMLd: float
    outflowMLd: float
    level_pct: float
    status: str
    net_flow: float


class NetworkStateResponse(BaseModel):
    city_id: str = "greater_noida"
    city_name: str = "Greater Noida"
    assets: List[AssetModel]
    zones: List[ZoneModel]
    links: List[LinkModel]
    reservoirs: List[ReservoirModel]
    tanker_fleet: int
    tankers_available: int
    tankers_deployed: int


class AssetInterventionRequest(BaseModel):
    status: Literal["normal", "degraded", "offline"]
    factor: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    reason: Optional[str] = "Manual operator intervention"


class ZoneImpactModel(BaseModel):
    zoneId: str
    demand: float
    baseline: float
    incident: float
    shortage: float
    loss: float
    bottleneck: str


class AnalysisModel(BaseModel):
    impacts: List[ZoneImpactModel]
    affected: List[str]
    totalDemand: float
    totalSupply: float
    totalShortage: float
    reasoning: List[str]
    failed_assets: Optional[List[str]] = None
    failed_links: Optional[List[str]] = None
    explanation: Optional[str] = None
    recommended_plan_id: Optional[str] = None
    scoring_criteria: Optional[Dict[str, Any]] = None
    safety_constraints_checked: Optional[List[str]] = None
    comparison_summary: Optional[Dict[str, Any]] = None
    rationale: Optional[Dict[str, Any]] = None


class PlanModel(BaseModel):
    id: str
    plan_key: str
    name: str
    strategy: str
    objective: Optional[str] = None
    plain_english: Optional[str] = None
    why_useful: Optional[str] = None
    benefiting_zones: Optional[List[Dict[str, Any]]] = None
    resource_consumption: Optional[Dict[str, Any]] = None
    benefits: Optional[List[str]] = None
    alloc: Dict[str, Dict[str, float]]
    tankers: Dict[str, int]
    tankersUsed: int
    totalSupplied: float
    unmet: float
    unmetByZone: Dict[str, float]
    tradeOffs: List[str]
    violations: List[str]
    feasible: bool
    recommended: bool
    decision: Literal["pending", "approved", "rejected", "superseded"]


class AgentRunModel(BaseModel):
    id: int
    incident_id: str
    agent_name: str
    role: str
    step_order: int
    status: str
    input_summary: str
    output_data: Dict[str, Any]
    error_details: Optional[str] = None
    started_at: str
    completed_at: str
    duration_ms: float


class IncidentCreateRequest(BaseModel):
    scenario_type: Optional[str] = None
    city_id: Optional[str] = "greater_noida"
    category: Optional[str] = Field(None, max_length=80)
    asset_type: Optional[str] = Field(None, max_length=40)
    affected_area: Optional[str] = Field(None, max_length=120)
    zone_id: Optional[str] = Field(None, max_length=50)
    asset_id: Optional[str] = Field(None, max_length=50)
    severity: Optional[Literal["LOW", "MODERATE", "HIGH", "CRITICAL"]] = None
    description: Optional[str] = Field(None, min_length=8, max_length=2000)
    reference_id: Optional[str] = Field(None, max_length=80)
    reporter_name: Optional[str] = Field(None, max_length=100)


class IncidentModel(BaseModel):
    id: str
    city_id: str = "greater_noida"
    type: str
    label: str
    severity: str
    status: str
    triggeredAt: str
    analysis: AnalysisModel
    plans: List[PlanModel]
    approvedPlanId: Optional[str] = None
    resolvedAt: Optional[str] = None
    report: Optional[Dict[str, Any]] = None


class DecisionRequest(BaseModel):
    reason: Optional[str] = "Operator evaluation"


class AllocationRecord(BaseModel):
    id: int
    incident_id: str
    plan_id: str
    zone_id: str
    pipe_mld: float
    tanker_mld: float
    total_mld: float
    timestamp: str


class AuditEventModel(BaseModel):
    id: int
    incident_id: Optional[str]
    city_id: Optional[str] = "greater_noida"
    event_type: str
    actor: str
    description: str
    timestamp: str
    metadata: Dict[str, Any] = {}


class DashboardResponse(BaseModel):
    city_id: str = "greater_noida"
    city_name: str = "Greater Noida"
    available_cities: List[CityModel] = []
    current_incident: Optional[IncidentModel]
    total_demand: float
    total_supplied: float
    total_unmet: float
    zones_short: int
    tankers_available: int
    tankers_deployed: int
    assets: List[AssetModel]
    zones: List[ZoneModel]
    recent_agent_runs: List[AgentRunModel]
    recent_audit: List[AuditEventModel]
    demo_mode: bool
    demo_label: str
