from typing import Any, Dict, List
from fastapi import APIRouter, HTTPException, status

from app.network.topology import CITY_TOPOLOGIES, get_city_topology, list_supported_cities
from app.schemas.pydantic_models import CityModel

router = APIRouter(prefix="/cities", tags=["Cities"])


@router.get("", response_model=List[CityModel])
def list_cities():
    """Returns all supported municipal water networks with their base parameters."""
    return [
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


@router.get("/{city_id}")
def get_city_detail(city_id: str):
    """Returns detailed configuration, assets, zones, and supported scenarios for a city."""
    cid = city_id.lower()
    if cid not in CITY_TOPOLOGIES:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"City '{city_id}' not found. Supported cities: {list(CITY_TOPOLOGIES.keys())}",
        )
    top = CITY_TOPOLOGIES[cid]
    return {
        "id": top.id,
        "name": top.name,
        "state": top.state,
        "description": top.description,
        "tanker_fleet": top.tanker_fleet,
        "zones": [
            {
                "id": z.id,
                "name": z.name,
                "population": z.population,
                "priority": z.priority,
                "demand": z.demand,
            }
            for z in top.zones
        ],
        "assets": [
            {
                "id": a.id,
                "name": a.name,
                "kind": a.kind,
                "capacity": a.capacity,
            }
            for a in top.assets
        ],
        "scenarios": [
            {
                "key": k,
                "label": v["label"],
                "description": v["description"],
                "severity": v["severity"],
                "failed_asset": v.get("failed_asset"),
            }
            for k, v in top.scenarios.items()
        ],
    }
