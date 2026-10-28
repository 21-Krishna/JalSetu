from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.entities import Allocation
from app.schemas.pydantic_models import AllocationRecord

router = APIRouter(prefix="/allocations", tags=["Allocations"])


@router.get("", response_model=List[AllocationRecord])
def get_all_allocations(db: Session = Depends(get_db)):
    recs = db.query(Allocation).order_by(Allocation.timestamp.desc()).all()
    return [
        AllocationRecord(
            id=r.id,
            incident_id=r.incident_id,
            plan_id=r.plan_id,
            zone_id=r.zone_id,
            pipe_mld=r.pipe_mld,
            tanker_mld=r.tanker_mld,
            total_mld=r.total_mld,
            timestamp=r.timestamp,
        )
        for r in recs
    ]


@router.get("/incident/{incident_id}", response_model=List[AllocationRecord])
def get_incident_allocations(incident_id: str, db: Session = Depends(get_db)):
    recs = (
        db.query(Allocation)
        .filter(Allocation.incident_id == incident_id)
        .order_by(Allocation.zone_id.asc())
        .all()
    )
    return [
        AllocationRecord(
            id=r.id,
            incident_id=r.incident_id,
            plan_id=r.plan_id,
            zone_id=r.zone_id,
            pipe_mld=r.pipe_mld,
            tanker_mld=r.tanker_mld,
            total_mld=r.total_mld,
            timestamp=r.timestamp,
        )
        for r in recs
    ]
