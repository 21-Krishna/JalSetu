from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.entities import Incident
from app.network.topology import get_city_topology, list_supported_cities
from app.network.graph_analysis import r2
from app.routes.incidents import build_incident_model, get_incident_agent_runs
from app.routes.network import get_network_state
from app.routes.audit import fetch_audit_trail
from app.schemas.pydantic_models import CityModel, DashboardResponse

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("", response_model=DashboardResponse)
def get_dashboard_metrics(
    city_id: Optional[str] = Query("greater_noida"),
    db: Session = Depends(get_db),
):
    target_city = (city_id or "greater_noida").lower()
    top = get_city_topology(target_city)

    # 1. Active or most recent incident for this city
    active_inc = (
        db.query(Incident)
        .filter(
            Incident.city_id == target_city,
            Incident.status.in_(["awaiting_approval", "mitigated", "all_rejected"]),
        )
        .order_by(Incident.triggered_at.desc())
        .first()
    )
    inc_model = build_incident_model(active_inc, db) if active_inc else None

    # 2. Network and zones from DB for this city
    net_state = get_network_state(city_id=target_city, db=db)

    total_demand = r2(sum(z.demand for z in net_state.zones))
    total_supplied = r2(sum(z.supplied for z in net_state.zones))
    total_unmet = r2(max(0.0, sum(z.unmet for z in net_state.zones)))
    zones_short = sum(1 for z in net_state.zones if z.unmet > 0.001)

    # 3. Recent agent runs
    recent_agent_runs = []
    if active_inc:
        recent_agent_runs = get_incident_agent_runs(active_inc.id, db)

    # 4. Recent audit events for this city
    recent_audit = fetch_audit_trail(db=db, city_id=target_city, limit=8)

    # 5. Supported cities list
    supported_cities = [
        CityModel(
            id=c["id"],
            name=c["name"],
            state=c["state"],
            description=c["description"],
            tanker_fleet=c["tanker_fleet"],
            zone_count=c["zone_count"],
            asset_count=c["asset_count"],
            default_scenario=c["default_scenario"],
        )
        for c in list_supported_cities()
    ]

    return DashboardResponse(
        city_id=target_city,
        city_name=top.name,
        available_cities=supported_cities,
        current_incident=inc_model,
        total_demand=total_demand,
        total_supplied=total_supplied,
        total_unmet=total_unmet,
        zones_short=zones_short,
        tankers_available=net_state.tankers_available,
        tankers_deployed=net_state.tankers_deployed,
        assets=net_state.assets,
        zones=net_state.zones,
        recent_agent_runs=recent_agent_runs,
        recent_audit=recent_audit,
        demo_mode=settings.DEMO_MODE,
        demo_label=settings.DEMO_LABEL,
    )
