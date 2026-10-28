import json
from sqlalchemy.orm import Session

from app.network.topology import (
    CITY_TOPOLOGIES,
    GREATER_NOIDA,
)
from app.network.graph_analysis import baseline_pipe
from app.models.entities import (
    City,
    NetworkAsset,
    Zone,
    NetworkLink,
    Reservoir,
    AuditEvent,
    Incident,
    AgentRun,
    ResponsePlan,
    Allocation,
)


def seed_database(db: Session, force_reset: bool = False, city_id: str = None):
    """Initializes or resets the local database with canonical simulation assets and baseline supply for all cities."""
    if force_reset:
        if city_id:
            # Clean up only for the specific city
            city_id = city_id.lower()
            incidents_to_delete = db.query(Incident).filter(Incident.city_id == city_id).all()
            inc_ids = [inc.id for inc in incidents_to_delete]
            if inc_ids:
                db.query(Allocation).filter(Allocation.incident_id.in_(inc_ids)).delete(synchronize_session=False)
                db.query(ResponsePlan).filter(ResponsePlan.incident_id.in_(inc_ids)).delete(synchronize_session=False)
                db.query(AgentRun).filter(AgentRun.incident_id.in_(inc_ids)).delete(synchronize_session=False)
                db.query(Incident).filter(Incident.id.in_(inc_ids)).delete(synchronize_session=False)
            db.query(AuditEvent).filter(AuditEvent.city_id == city_id).delete(synchronize_session=False)

            # Reset zones and assets for this city to baseline
            top = CITY_TOPOLOGIES.get(city_id, GREATER_NOIDA)
            base_sup = baseline_pipe(city_id)
            for z in top.zones:
                z_obj = db.query(Zone).filter(Zone.id == z.id, Zone.city_id == city_id).first()
                if z_obj:
                    z_obj.current_demand = z.demand
                    z_obj.current_pipe_supply = base_sup.get(z.id, 0.0)
                    z_obj.current_tanker_supply = 0.0
            for a in top.assets:
                a_obj = db.query(NetworkAsset).filter(NetworkAsset.id == a.id, NetworkAsset.city_id == city_id).first()
                if a_obj:
                    a_obj.factor = 1.0
                    a_obj.status = "normal"
                    a_obj.effective_capacity = a.capacity
            db.commit()
            return
        else:
            db.query(Allocation).delete()
            db.query(ResponsePlan).delete()
            db.query(AgentRun).delete()
            db.query(Incident).delete()
            db.query(AuditEvent).delete()
            db.query(Reservoir).delete()
            db.query(NetworkLink).delete()
            db.query(Zone).delete()
            db.query(NetworkAsset).delete()
            db.query(City).delete()
            db.commit()

    # Seed Cities
    for c in CITY_TOPOLOGIES.values():
        existing_city = db.query(City).filter(City.id == c.id).first()
        if not existing_city:
            db.add(City(
                id=c.id,
                name=c.name,
                state=c.state,
                description=c.description,
                tanker_fleet=c.tanker_fleet,
                default_scenario=next(iter(c.scenarios.keys())),
            ))

    # Seed Assets, Zones, Links, and Reservoirs for every supported city
    for c in CITY_TOPOLOGIES.values():
        # Assets
        for a in c.assets:
            existing_asset = db.query(NetworkAsset).filter(NetworkAsset.id == a.id).first()
            if not existing_asset:
                db.add(NetworkAsset(
                    id=a.id,
                    city_id=c.id,
                    name=a.name,
                    kind=a.kind,
                    capacity=a.capacity,
                    effective_capacity=a.capacity,
                    status="normal",
                    factor=1.0,
                    metadata_json=json.dumps({"description": f"{c.name} municipal {a.kind} unit"}),
                ))
            elif force_reset:
                existing_asset.status = "normal"
                existing_asset.factor = 1.0
                existing_asset.effective_capacity = existing_asset.capacity

        # Zones
        city_base_supply = baseline_pipe(c.id)
        for z in c.zones:
            existing_zone = db.query(Zone).filter(Zone.id == z.id).first()
            if not existing_zone:
                db.add(Zone(
                    id=z.id,
                    city_id=c.id,
                    name=z.name,
                    population=z.population,
                    priority=z.priority,
                    base_demand=z.demand,
                    current_demand=z.demand,
                    current_pipe_supply=city_base_supply.get(z.id, 0.0),
                    current_tanker_supply=0.0,
                ))
            elif force_reset:
                existing_zone.current_demand = z.demand
                existing_zone.current_pipe_supply = city_base_supply.get(z.id, 0.0)
                existing_zone.current_tanker_supply = 0.0

        # Links
        for l in c.links:
            existing_link = db.query(NetworkLink).filter(NetworkLink.id == l.id).first()
            if not existing_link:
                db.add(NetworkLink(
                    id=l.id,
                    city_id=c.id,
                    from_node=l.from_node,
                    to_node=l.to_node,
                    capacity=l.capacity,
                    current_flow=0.0,
                ))

        # Reservoirs
        for r in c.reservoirs:
            existing_res = db.query(Reservoir).filter(Reservoir.id == r.id).first()
            if not existing_res:
                db.add(Reservoir(
                    id=r.id,
                    city_id=c.id,
                    name=r.name,
                    zone=r.zone,
                    capacity_ml=r.capacity_ml,
                    current_ml=r.current_ml,
                    inflow_mld=r.inflow_mld,
                    outflow_mld=r.outflow_mld,
                    status="normal" if (r.current_ml / r.capacity_ml) >= 0.5 else "warning",
                ))

    # Initial audit event
    if db.query(AuditEvent).count() == 0:
        db.add(AuditEvent(
            incident_id=None,
            city_id="greater_noida",
            event_type="system_initialized",
            actor="System",
            description="JalSetu Multi-City Decision Support Engine initialized with 5 canonical municipal topologies.",
            metadata_json=json.dumps({"cities": list(CITY_TOPOLOGIES.keys()), "status": "online"}),
        ))

    db.commit()
