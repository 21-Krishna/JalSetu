import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.entities import AuditEvent, NetworkAsset, NetworkLink, Reservoir, Zone
from app.network.topology import get_city_topology, TANKER_FLEET
from app.network.graph_analysis import calculate_flows, r2
from app.schemas.pydantic_models import (
    AssetInterventionRequest,
    AssetModel,
    LinkModel,
    NetworkStateResponse,
    ReservoirModel,
    ZoneModel,
)

router = APIRouter(prefix="/network", tags=["Network"])


@router.get("", response_model=NetworkStateResponse)
def get_network_state(
    city_id: Optional[str] = Query("greater_noida"),
    db: Session = Depends(get_db),
):
    target_city = (city_id or "greater_noida").lower()
    top = get_city_topology(target_city)

    assets_db = db.query(NetworkAsset).filter(NetworkAsset.city_id == target_city).all()
    zones_db = db.query(Zone).filter(Zone.city_id == target_city).all()
    links_db = db.query(NetworkLink).filter(NetworkLink.city_id == target_city).all()
    res_db = db.query(Reservoir).filter(Reservoir.city_id == target_city).all()

    # Fallback to all if city-specific records not found
    if not assets_db:
        assets_db = db.query(NetworkAsset).all()
    if not zones_db:
        zones_db = db.query(Zone).all()
    if not links_db:
        links_db = db.query(NetworkLink).all()
    if not res_db:
        res_db = db.query(Reservoir).all()

    # Calculate actual pipe flows based on current zone pipe supply
    pipe = {z.id: z.current_pipe_supply for z in zones_db}
    link_flow, asset_flow = calculate_flows(pipe, target_city)

    # Calculate tanker deployment
    fleet = top.tanker_fleet or TANKER_FLEET
    tankers_deployed = int(round(sum(z.current_tanker_supply for z in zones_db) / 0.5))
    tankers_avail = max(0, fleet - tankers_deployed)

    assets_out: List[AssetModel] = []
    for a in assets_db:
        assets_out.append(AssetModel(
            id=a.id,
            city_id=a.city_id or target_city,
            name=a.name,
            kind=a.kind,
            capacity=a.capacity,
            effective=a.effective_capacity,
            flow=r2(asset_flow.get(a.id, 0.0)),
            status=a.status,
            factor=a.factor,
        ))

    zones_out: List[ZoneModel] = []
    for z in zones_db:
        sup = r2(z.current_pipe_supply + z.current_tanker_supply)
        unmet = r2(max(0.0, z.current_demand - sup))
        cov = r2((sup / z.current_demand * 100.0) if z.current_demand > 0 else 100.0)
        zones_out.append(ZoneModel(
            id=z.id,
            city_id=z.city_id or target_city,
            name=z.name,
            population=z.population,
            priority=z.priority,
            demand=z.current_demand,
            pipe=z.current_pipe_supply,
            tanker=z.current_tanker_supply,
            supplied=sup,
            unmet=unmet,
            coverage_pct=cov,
        ))

    links_out: List[LinkModel] = []
    for l in links_db:
        links_out.append(LinkModel(
            id=l.id,
            city_id=l.city_id or target_city,
            from_node=l.from_node,
            to_node=l.to_node,
            capacity=l.capacity,
            flow=r2(link_flow.get(l.id, 0.0)),
        ))

    res_out: List[ReservoirModel] = []
    for r in res_db:
        level_pct = r2((r.current_ml / r.capacity_ml) * 100.0)
        net_flow = r2(r.inflow_mld - r.outflow_mld)
        res_out.append(ReservoirModel(
            id=r.id,
            city_id=r.city_id or target_city,
            name=r.name,
            zone=r.zone,
            capacityML=r.capacity_ml,
            currentML=r.current_ml,
            inflowMLd=r.inflow_mld,
            outflowMLd=r.outflow_mld,
            level_pct=level_pct,
            status=r.status,
            net_flow=net_flow,
        ))

    return NetworkStateResponse(
        city_id=target_city,
        city_name=top.name,
        assets=assets_out,
        zones=zones_out,
        links=links_out,
        reservoirs=res_out,
        tanker_fleet=fleet,
        tankers_available=tankers_avail,
        tankers_deployed=tankers_deployed,
    )


@router.get("/assets", response_model=List[AssetModel])
def get_assets(city_id: Optional[str] = Query("greater_noida"), db: Session = Depends(get_db)):
    net = get_network_state(city_id=city_id, db=db)
    return net.assets


@router.get("/assets/{asset_id}", response_model=AssetModel)
def get_asset_by_id(asset_id: str, db: Session = Depends(get_db)):
    asset = db.query(NetworkAsset).filter(NetworkAsset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Asset {asset_id} not found")

    city_id = asset.city_id or "greater_noida"
    net = get_network_state(city_id=city_id, db=db)
    for a in net.assets:
        if a.id == asset_id:
            return a
    return AssetModel(
        id=asset.id,
        city_id=city_id,
        name=asset.name,
        kind=asset.kind,
        capacity=asset.capacity,
        effective=asset.effective_capacity,
        flow=0.0,
        status=asset.status,
        factor=asset.factor,
    )


@router.post("/assets/{asset_id}/intervene", response_model=AssetModel)
def intervene_asset(asset_id: str, req: AssetInterventionRequest, db: Session = Depends(get_db)):
    asset = db.query(NetworkAsset).filter(NetworkAsset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Asset {asset_id} not found")

    old_status = asset.status
    old_factor = asset.factor

    if req.status == "offline":
        factor = 0.0
    elif req.status == "degraded":
        factor = req.factor if req.factor is not None else 0.5
    else:  # normal
        factor = 1.0

    asset.status = req.status
    asset.factor = factor
    asset.effective_capacity = r2(asset.capacity * factor)

    audit = AuditEvent(
        incident_id=None,
        city_id=asset.city_id or "greater_noida",
        event_type="asset_intervention",
        actor="Operator",
        description=f"Operator changed asset {asset.id} status from '{old_status}' (factor {old_factor}) to '{req.status}' (factor {factor}). Reason: {req.reason}",
        metadata_json=json.dumps({"asset_id": asset.id, "old_status": old_status, "new_status": req.status, "factor": factor}),
    )
    db.add(audit)
    db.commit()

    return get_asset_by_id(asset_id, db)
