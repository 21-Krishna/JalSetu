import json
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.agents.orchestrator import AgentOrchestrator
from app.database import get_db
from app.models.entities import AgentRun, AuditEvent, Incident, NetworkAsset, ResponsePlan, Zone
from app.network.topology import CITY_TOPOLOGIES, get_city_topology, TANKER_FLEET
from app.network.graph_analysis import Conditions, allocate_priority, r2
from app.schemas.pydantic_models import (
    AgentRunModel,
    AnalysisModel,
    IncidentCreateRequest,
    IncidentModel,
    PlanModel,
)

router = APIRouter(prefix="/incidents", tags=["Incidents"])

orchestrator = AgentOrchestrator()

# Consolidate all scenarios across all 5 cities
SCENARIO_CONFIGS: Dict[str, Dict[str, Any]] = {}
for c_top in CITY_TOPOLOGIES.values():
    for skey, scfg in c_top.scenarios.items():
        SCENARIO_CONFIGS[skey] = {**scfg, "city_id": c_top.id}


def build_incident_model(incident: Incident, db: Session) -> IncidentModel:
    analysis_dict = json.loads(incident.analysis_json) if incident.analysis_json else {}
    plans_db = db.query(ResponsePlan).filter(ResponsePlan.incident_id == incident.id).all()

    plans_out: List[PlanModel] = []
    for p in plans_db:
        meta = json.loads(p.metadata_json) if getattr(p, "metadata_json", None) else {}
        plans_out.append(PlanModel(
            id=p.id,
            plan_key=p.plan_key,
            name=p.name,
            strategy=p.strategy,
            objective=meta.get("objective"),
            plain_english=meta.get("plain_english"),
            why_useful=meta.get("why_useful"),
            benefiting_zones=meta.get("benefiting_zones"),
            resource_consumption=meta.get("resource_consumption"),
            benefits=meta.get("benefits", []),
            alloc=json.loads(p.allocations_json) if p.allocations_json else {},
            tankers=json.loads(p.tankers_json) if p.tankers_json else {},
            tankersUsed=p.tankers_used,
            totalSupplied=p.total_supplied,
            unmet=p.unmet_demand,
            unmetByZone=json.loads(p.unmet_by_zone_json) if p.unmet_by_zone_json else {},
            tradeOffs=json.loads(p.trade_offs_json) if p.trade_offs_json else [],
            violations=json.loads(p.violations_json) if p.violations_json else [],
            feasible=p.feasible,
            recommended=p.recommended,
            decision=p.decision,
        ))

    analysis_out = AnalysisModel(
        impacts=analysis_dict.get("impacts", []),
        affected=analysis_dict.get("affected", []),
        totalDemand=analysis_dict.get("totalDemand", 0.0),
        totalSupply=analysis_dict.get("totalSupply", 0.0),
        totalShortage=analysis_dict.get("totalShortage", 0.0),
        reasoning=analysis_dict.get("reasoning", []),
        failed_assets=analysis_dict.get("failed_assets", []),
        failed_links=analysis_dict.get("failed_links", []),
        explanation=analysis_dict.get("explanation", ""),
        recommended_plan_id=analysis_dict.get("recommended_plan_id"),
        scoring_criteria=analysis_dict.get("scoring_criteria"),
        safety_constraints_checked=analysis_dict.get("safety_constraints_checked"),
        comparison_summary=analysis_dict.get("comparison_summary"),
        rationale=analysis_dict.get("rationale"),
    )

    return IncidentModel(
        id=incident.id,
        city_id=incident.city_id or "greater_noida",
        type=incident.scenario_type,
        label=incident.label,
        severity=incident.severity,
        status=incident.status,
        triggeredAt=incident.triggered_at,
        analysis=analysis_out,
        plans=plans_out,
        approvedPlanId=incident.approved_plan_id,
        resolvedAt=incident.resolved_at,
        report=analysis_dict.get("report"),
    )


@router.get("", response_model=List[IncidentModel])
def list_incidents(
    city_id: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
):
    query = db.query(Incident).order_by(Incident.triggered_at.desc())
    # Active product is intentionally scoped to the Greater Noida demo network.
    target_city = (city_id or "greater_noida").lower()
    if target_city != "greater_noida":
        return []
    query = query.filter(Incident.city_id == "greater_noida")
    if status_filter:
        query = query.filter(Incident.status == status_filter)
    incidents = query.all()
    return [build_incident_model(inc, db) for inc in incidents]


@router.get("/scenarios", response_model=List[Dict[str, Any]])
def list_scenarios(city_id: Optional[str] = Query(None)):
    target_city = city_id.lower() if city_id else None
    results = []
    for skey, scfg in SCENARIO_CONFIGS.items():
        if target_city and scfg.get("city_id") != target_city:
            continue
        results.append({
            "key": skey,
            "label": scfg.get("label"),
            "description": scfg.get("description"),
            "category": scfg.get("category", "pump_failure"),
            "severity": scfg.get("severity", "HIGH"),
            "simulated_condition": scfg.get("simulated_condition", ""),
            "expected_impact": scfg.get("expected_impact", ""),
            "city_id": scfg.get("city_id"),
            "city_compatibility": scfg.get("city_compatibility", [scfg.get("city_id")]),
            "failed_asset": scfg.get("failed_asset"),
            "failed_link": scfg.get("failed_link"),
        })
    return results


@router.get("/{incident_id}", response_model=IncidentModel)
def get_incident(incident_id: str, db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Incident {incident_id} not found")
    return build_incident_model(incident, db)


@router.post("", response_model=IncidentModel, status_code=status.HTTP_201_CREATED)
def create_incident(req: IncidentCreateRequest, db: Session = Depends(get_db)):
    city_id = (req.city_id or "greater_noida").lower()
    if city_id != "greater_noida":
        raise HTTPException(status_code=422, detail="Only the Greater Noida demonstration network is supported.")
    top = get_city_topology(city_id)
    cfg = SCENARIO_CONFIGS.get(req.scenario_type) if req.scenario_type else None
    report_mode = bool(req.category or req.description or req.asset_id or req.affected_area)
    if not cfg and not report_mode:
        raise HTTPException(status_code=400 if req.scenario_type else 422, detail=(f"Unknown scenario_type: '{req.scenario_type}'." if req.scenario_type else "Provide a valid scenario_type or submit an incident report."))
    if report_mode:
        if not req.category or not req.description or not req.affected_area or not req.zone_id or not req.severity:
            raise HTTPException(status_code=422, detail="Category, description, affected area, zone, and severity are required.")
        valid_zones = {z.id for z in top.zones}
        if req.zone_id not in valid_zones:
            raise HTTPException(status_code=422, detail=f"Unknown Greater Noida demo zone: {req.zone_id}.")
        assets = {a.id: a for a in top.assets}
        links = {l.id: l for l in top.links}
        if req.asset_id and req.asset_id not in assets and req.asset_id not in links:
            raise HTTPException(status_code=422, detail=f"Asset '{req.asset_id}' is not in the Greater Noida demo topology. Submit without an asset ID or select a listed asset.")
        resolved = req.asset_id in assets if req.asset_id else False
        failed_asset = req.asset_id if resolved else None
        failed_link = req.asset_id if req.asset_id in links else None
        asset_factor = {failed_asset: 0.0} if failed_asset and req.category in {"Pump malfunction", "Reservoir problem", "Water treatment plant problem"} else {}
        link_factor = {failed_link: 0.0} if failed_link and req.category == "Pipeline leakage or rupture" else {}
        cfg = {"label": f"Reported: {req.category}", "description": req.description, "severity": req.severity,
               "category": req.category, "asset_factor": asset_factor, "link_factor": link_factor,
               "demand_factor": 1.0, "city_id": city_id, "failed_asset": failed_asset,
               "failed_link": failed_link}
        scenario_type = "reported_incident"
        report = {"category": req.category, "asset_type": req.asset_type, "affected_area": req.affected_area,
                  "zone_id": req.zone_id, "asset_id": req.asset_id, "asset_resolved": resolved,
                  "resolution_note": (f"Matched {req.asset_id} to the illustrative topology." if resolved else
                    "No specific asset was confidently resolved; assessment uses the reported zone and requires operator review."),
                  "description": req.description, "reference_id": req.reference_id, "reporter_name": req.reporter_name}
    else:
        scenario_type = req.scenario_type
        report = None
        if not cfg:
            raise HTTPException(status_code=422, detail=f"Unknown scenario_type: '{req.scenario_type}'.")
    all_inc_ids = [row[0] for row in db.query(Incident.id).all()]
    nums = [int(x.split("-")[-1]) for x in all_inc_ids if x.startswith("INC-") and x.split("-")[-1].isdigit()]
    inc_id = f"INC-{(max(nums) + 1) if nums else 1:03d}"
    incident = Incident(id=inc_id, city_id=city_id, scenario_type=scenario_type, label=cfg["label"],
                        severity=cfg["severity"], status="awaiting_approval", analysis_json=json.dumps({"report": report} if report else {}))
    db.add(incident)
    db.add(AuditEvent(incident_id=inc_id, city_id=city_id, event_type="incident_created", actor="Field Reporter" if report else "Operator",
       description=f"Incident {inc_id} submitted for {top.name}: {cfg['label']}. Severity: {cfg['severity']}.",
       metadata_json=json.dumps({"scenario_type": scenario_type, "city_id": city_id, "severity": cfg["severity"], "report": report})))
    db.commit()
    cond = Conditions(asset_factor=cfg.get("asset_factor", {}), link_factor=cfg.get("link_factor", {}), demand_factor=cfg.get("demand_factor", 1.0), city_id=city_id)
    orchestrator.run_workflow(db=db, incident=incident, conditions=cond, incident_meta=cfg, available_tankers=top.tanker_fleet)
    for aid, factor in cfg.get("asset_factor", {}).items():
        asset = db.query(NetworkAsset).filter(NetworkAsset.id == aid, NetworkAsset.city_id == city_id).first()
        if asset:
            asset.factor = factor
            asset.status = "offline" if factor == 0.0 else "degraded"
            asset.effective_capacity = r2(asset.capacity * factor)
    db.commit()
    return build_incident_model(incident, db)


@router.post("/{incident_id}/analyse", response_model=IncidentModel)
def analyse_incident(incident_id: str, db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Incident {incident_id} not found")

    city_id = incident.city_id or "greater_noida"
    top = get_city_topology(city_id)

    cfg = SCENARIO_CONFIGS.get(incident.scenario_type, {
        "label": incident.label,
        "description": "Simulated water network incident",
        "severity": incident.severity,
        "asset_factor": {},
        "demand_factor": 1.0,
        "city_id": city_id,
    })

    cond = Conditions(
        asset_factor=cfg.get("asset_factor", {}),
        link_factor=cfg.get("link_factor", {}),
        demand_factor=cfg.get("demand_factor", 1.0),
        city_id=city_id,
    )
    orchestrator.run_workflow(
        db=db,
        incident=incident,
        conditions=cond,
        incident_meta=cfg,
        available_tankers=top.tanker_fleet,
    )

    return build_incident_model(incident, db)


@router.get("/{incident_id}/agents", response_model=List[AgentRunModel])
def get_incident_agent_runs(incident_id: str, db: Session = Depends(get_db)):
    runs = (
        db.query(AgentRun)
        .filter(AgentRun.incident_id == incident_id)
        .order_by(AgentRun.step_order.asc())
        .all()
    )
    out: List[AgentRunModel] = []
    for r in runs:
        out.append(AgentRunModel(
            id=r.id,
            incident_id=r.incident_id,
            agent_name=r.agent_name,
            role=r.role,
            step_order=r.step_order,
            status=r.status,
            input_summary=r.input_summary,
            output_data=json.loads(r.output_json) if r.output_json else {},
            error_details=r.error_details,
            started_at=r.started_at,
            completed_at=r.completed_at,
            duration_ms=r.duration_ms,
        ))
    return out


@router.get("/{incident_id}/plans", response_model=List[PlanModel])
def get_incident_plans(incident_id: str, db: Session = Depends(get_db)):
    inc_model = get_incident(incident_id, db)
    return inc_model.plans
