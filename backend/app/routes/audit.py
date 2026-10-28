import json
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.entities import AuditEvent
from app.schemas.pydantic_models import AuditEventModel

router = APIRouter(prefix="/audit", tags=["Audit"])


def fetch_audit_trail(
    db: Session,
    incident_id: Optional[str] = None,
    city_id: Optional[str] = None,
    event_type: Optional[str] = None,
    actor: Optional[str] = None,
    limit: int = 100,
) -> List[AuditEventModel]:
    query = db.query(AuditEvent).order_by(AuditEvent.timestamp.desc(), AuditEvent.id.desc())

    if incident_id is not None:
        query = query.filter(AuditEvent.incident_id == incident_id)
    if city_id is not None:
        query = query.filter(AuditEvent.city_id == city_id.lower())
    if event_type is not None:
        query = query.filter(AuditEvent.event_type == event_type)
    if actor is not None:
        query = query.filter(AuditEvent.actor == actor)

    events = query.limit(limit).all()
    out: List[AuditEventModel] = []
    for e in events:
        out.append(AuditEventModel(
            id=e.id,
            incident_id=e.incident_id,
            city_id=e.city_id or "greater_noida",
            event_type=e.event_type,
            actor=e.actor,
            description=e.description,
            timestamp=e.timestamp,
            metadata=json.loads(e.metadata_json) if e.metadata_json else {},
        ))
    return out


@router.get("", response_model=List[AuditEventModel])
def get_audit_trail(
    incident_id: Optional[str] = Query(default=None),
    city_id: Optional[str] = Query(default=None),
    event_type: Optional[str] = Query(default=None),
    actor: Optional[str] = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    return fetch_audit_trail(
        db=db,
        incident_id=incident_id,
        city_id=city_id,
        event_type=event_type,
        actor=actor,
        limit=limit,
    )
