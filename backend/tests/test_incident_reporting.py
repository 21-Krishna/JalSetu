from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def payload(**overrides):
    data = {"city_id":"greater_noida", "category":"Pump malfunction", "asset_type":"Pump", "affected_area":"Knowledge Park", "zone_id":"Z-01", "asset_id":"P-03", "severity":"HIGH", "description":"Pump has stopped and nearby supply is interrupted."}
    data.update(overrides)
    return data

def test_report_creates_incident_and_preserves_report_metadata():
    client.post("/api/v1/demo/reset")
    response = client.post("/api/v1/incidents", json=payload())
    assert response.status_code == 201, response.text
    data = response.json()
    assert data["id"].startswith("INC-")
    assert data["report"]["category"] == "Pump malfunction"
    assert data["report"]["asset_resolved"] is True
    assert len(data["plans"]) == 3
    assert data["status"] == "awaiting_approval"

def test_report_rejects_unknown_asset_and_unknown_zone():
    assert client.post("/api/v1/incidents", json=payload(asset_id="P-999")).status_code == 422
    assert client.post("/api/v1/incidents", json=payload(zone_id="Z-99")).status_code == 422

def test_report_requires_description_and_supported_city():
    assert client.post("/api/v1/incidents", json=payload(description="short")).status_code == 422
    assert client.post("/api/v1/incidents", json=payload(city_id="delhi")).status_code == 422

def test_tanker_fleet_and_whole_vehicle_allocation_regression():
    client.post("/api/v1/demo/reset")
    response = client.post("/api/v1/incidents", json={"scenario_type":"pump_failure_p03", "city_id":"greater_noida"})
    assert response.status_code == 201
    for plan in response.json()["plans"]:
        assert 0 <= plan["tankersUsed"] <= 8
        assert sum(plan["tankers"].values()) == plan["tankersUsed"]
        assert all(isinstance(n, int) and n >= 0 for n in plan["tankers"].values())
        if plan["feasible"]:
            assert all(plan["alloc"][z]["tanker"] == count * 0.5 for z, count in plan["tankers"].items())
