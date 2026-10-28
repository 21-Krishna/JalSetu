from datetime import datetime, timezone
import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.entities import Allocation, AuditEvent, Incident, ResponsePlan, Zone
from app.network.topology import get_city_topology, TANKER_FLEET
from app.network.graph_analysis import Conditions, r2
from app.agents.validation_agent import validate_plan_constraints
from app.routes.incidents import SCENARIO_CONFIGS
from app.schemas.pydantic_models import DecisionRequest, PlanModel

router = APIRouter(prefix="/plans", tags=["Plans"])


def utcnow_str() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.get("/{plan_id}", response_model=PlanModel)
def get_plan(plan_id: str, db: Session = Depends(get_db)):
    plan = db.query(ResponsePlan).filter(ResponsePlan.id == plan_id).first()
    if not plan:
        # Also try by plan_key if passed like "A"
        plan = db.query(ResponsePlan).filter(ResponsePlan.plan_key == plan_id).order_by(ResponsePlan.created_at.desc()).first()
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Plan '{plan_id}' not found")

    meta = json.loads(plan.metadata_json) if getattr(plan, "metadata_json", None) else {}
    return PlanModel(
        id=plan.id,
        plan_key=plan.plan_key,
        name=plan.name,
        strategy=plan.strategy,
        objective=meta.get("objective"),
        plain_english=meta.get("plain_english"),
        why_useful=meta.get("why_useful"),
        benefiting_zones=meta.get("benefiting_zones"),
        resource_consumption=meta.get("resource_consumption"),
        benefits=meta.get("benefits", []),
        alloc=json.loads(plan.allocations_json) if plan.allocations_json else {},
        tankers=json.loads(plan.tankers_json) if plan.tankers_json else {},
        tankersUsed=plan.tankers_used,
        totalSupplied=plan.total_supplied,
        unmet=plan.unmet_demand,
        unmetByZone=json.loads(plan.unmet_by_zone_json) if plan.unmet_by_zone_json else {},
        tradeOffs=json.loads(plan.trade_offs_json) if plan.trade_offs_json else [],
        violations=json.loads(plan.violations_json) if plan.violations_json else [],
        feasible=plan.feasible,
        recommended=plan.recommended,
        decision=plan.decision,
    )


@router.post("/{plan_id}/approve", response_model=PlanModel)
def approve_plan(plan_id: str, req: DecisionRequest = None, db: Session = Depends(get_db)):
    plan = db.query(ResponsePlan).filter(ResponsePlan.id == plan_id).first()
    if not plan:
        plan = db.query(ResponsePlan).filter(ResponsePlan.plan_key == plan_id).order_by(ResponsePlan.created_at.desc()).first()
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Plan '{plan_id}' not found")

    incident = db.query(Incident).filter(Incident.id == plan.incident_id).first()
    if not incident:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Associated incident {plan.incident_id} not found")

    city_id = incident.city_id or "greater_noida"
    top = get_city_topology(city_id)

    # Guard 1: Prevent duplicate approval
    if plan.decision == "approved":
        return get_plan(plan.id, db)

    # Guard 2: Prevent overwriting an already mitigated incident with another plan
    if incident.approved_plan_id and incident.approved_plan_id != plan.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Incident {incident.id} already has approved plan '{incident.approved_plan_id}'. Reset simulation to test a different plan.",
        )

    # Guard 3: INDEPENDENT BACKEND CONSTRAINT RE-VALIDATION
    cfg = SCENARIO_CONFIGS.get(incident.scenario_type, {
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
    alloc_dict = json.loads(plan.allocations_json) if plan.allocations_json else {}
    tankers_dict = json.loads(plan.tankers_json) if plan.tankers_json else {}

    violations = validate_plan_constraints(
        conditions=cond,
        alloc=alloc_dict,
        tankers=tankers_dict,
        fleet_limit=top.tanker_fleet,
    )

    if violations or not plan.feasible:
        # Record audit of blocked attempt
        audit_violation = AuditEvent(
            incident_id=incident.id,
            city_id=city_id,
            event_type="approval_blocked",
            actor="ValidationGate",
            description=f"Approval rejected for Plan {plan.id} ({top.name}): plan violates safety constraints ({'; '.join(violations)}).",
            metadata_json=json.dumps({"plan_id": plan.id, "city_id": city_id, "violations": violations}),
        )
        db.add(audit_violation)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot approve infeasible plan '{plan.id}'. Constraint violations: {violations}",
        )

    now_iso = utcnow_str()

    try:
        # 1. Update plan status
        plan.decision = "approved"

        # 2. Mark other pending plans for this incident as superseded
        competing_plans = (
            db.query(ResponsePlan)
            .filter(ResponsePlan.incident_id == incident.id, ResponsePlan.id != plan.id)
            .all()
        )
        for cp in competing_plans:
            if cp.decision == "pending":
                cp.decision = "superseded"

        # 3. Update Incident record
        incident.status = "mitigated"
        incident.approved_plan_id = plan.id
        incident.resolved_at = now_iso

        # 4. Commit Allocations into database table
        db.query(Allocation).filter(Allocation.incident_id == incident.id).delete()
        for zid, vols in alloc_dict.items():
            pipe_vol = r2(vols.get("pipe", 0.0))
            tanker_vol = r2(vols.get("tanker", 0.0))
            tot_vol = r2(pipe_vol + tanker_vol)
            alloc_rec = Allocation(
                incident_id=incident.id,
                plan_id=plan.id,
                zone_id=zid,
                pipe_mld=pipe_vol,
                tanker_mld=tanker_vol,
                total_mld=tot_vol,
                timestamp=now_iso,
            )
            db.add(alloc_rec)

            # Update live zone supply in Zone table for this city
            zone_obj = db.query(Zone).filter(Zone.id == zid, Zone.city_id == city_id).first()
            if not zone_obj:
                zone_obj = db.query(Zone).filter(Zone.id == zid).first()
            if zone_obj:
                zone_obj.current_pipe_supply = pipe_vol
                zone_obj.current_tanker_supply = tanker_vol

        # 5. Record Audit Event
        reason_txt = req.reason if req and req.reason else "Operator formal approval"
        audit = AuditEvent(
            incident_id=incident.id,
            city_id=city_id,
            event_type="human_approval",
            actor="Operator",
            description=f"Operator approved {plan.name} ({plan.id}) for {top.name}. Dispatches {plan.tankers_used} tankers, delivering {plan.total_supplied} MLD. Reason: {reason_txt}",
            metadata_json=json.dumps({
                "plan_id": plan.id,
                "city_id": city_id,
                "tankers_used": plan.tankers_used,
                "total_supplied": plan.total_supplied,
                "unmet_demand": plan.unmet_demand,
            }),
        )
        db.add(audit)

        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database transaction failure during plan approval: {str(e)}",
        )

    return get_plan(plan.id, db)


@router.post("/{plan_id}/reject", response_model=PlanModel)
def reject_plan(plan_id: str, req: DecisionRequest = None, db: Session = Depends(get_db)):
    plan = db.query(ResponsePlan).filter(ResponsePlan.id == plan_id).first()
    if not plan:
        plan = db.query(ResponsePlan).filter(ResponsePlan.plan_key == plan_id).order_by(ResponsePlan.created_at.desc()).first()
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Plan '{plan_id}' not found")

    incident = db.query(Incident).filter(Incident.id == plan.incident_id).first()
    if not incident:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Associated incident {plan.incident_id} not found")

    city_id = incident.city_id or "greater_noida"
    top = get_city_topology(city_id)

    if plan.decision == "approved":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Plan '{plan.id}' is already approved and committed. Reset simulation to change state.",
        )

    plan.decision = "rejected"

    # Check if all plans for this incident are now rejected
    all_plans = db.query(ResponsePlan).filter(ResponsePlan.incident_id == incident.id).all()
    if all(p.decision == "rejected" for p in all_plans):
        incident.status = "all_rejected"

    reason_txt = req.reason if req and req.reason else "Operator deemed suboptimal"
    audit = AuditEvent(
        incident_id=incident.id,
        city_id=city_id,
        event_type="human_rejection",
        actor="Operator",
        description=f"Operator rejected {plan.name} ({plan.id}) in {top.name}. Simulation state unchanged. Reason: {reason_txt}",
        metadata_json=json.dumps({"plan_id": plan.id, "city_id": city_id}),
    )
    db.add(audit)
    db.commit()

    return get_plan(plan.id, db)
