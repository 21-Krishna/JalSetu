import json
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.entities import AuditEvent
from app.network.topology import get_city_topology
from app.seed import seed_database
from app.routes.incidents import create_incident
from app.schemas.pydantic_models import IncidentCreateRequest, IncidentModel

router = APIRouter(prefix="/demo", tags=["Demo Controls"])


@router.post("/reset")
def reset_simulation(
    city_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Restores baseline network, removes active incidents, and resets zones to normal baseline supply."""
    target_city = city_id.lower() if city_id else None
    top = get_city_topology(target_city or "greater_noida")

    seed_database(db, force_reset=True, city_id=target_city)

    scope_desc = f"for {top.name}" if target_city else "for all cities"
    audit = AuditEvent(
        incident_id=None,
        city_id=target_city or "greater_noida",
        event_type="simulation_reset",
        actor="Operator",
        description=f"Operator initiated simulation reset {scope_desc}. Baseline network restored, allocations reverted to normal.",
        metadata_json=json.dumps({"status": "reset_complete", "scope": target_city or "all"}),
    )
    db.add(audit)
    db.commit()

    return {
        "status": "success",
        "message": f"Simulation reset to initial operational baseline {scope_desc}.",
        "city_id": target_city or "all",
    }


@router.post("/seed", response_model=IncidentModel)
def seed_demo_scenario(
    city_id: Optional[str] = Query("greater_noida"),
    db: Session = Depends(get_db),
):
    """Seeds the canonical demonstration scenario for the given city with full multi-agent analysis."""
    target_city = (city_id or "greater_noida").lower()
    top = get_city_topology(target_city)

    # Reset city first
    seed_database(db, force_reset=True, city_id=target_city)

    # Trigger default scenario for this city
    default_scenario = next(iter(top.scenarios.keys()))
    req = IncidentCreateRequest(scenario_type=default_scenario, city_id=target_city)
    return create_incident(req, db)
