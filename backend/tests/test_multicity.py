import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.network.topology import CITY_TOPOLOGIES, get_city_topology
from app.network.graph_analysis import Conditions, baseline_pipe, get_affected_downstream_zones


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_all_five_cities_registered(client):
    res = client.get("/api/v1/cities")
    assert res.status_code == 200
    cities = res.json()
    assert len(cities) == 5
    city_ids = [c["id"] for c in cities]
    assert "greater_noida" in city_ids
    assert "delhi" in city_ids
    assert "jaipur" in city_ids
    assert "lucknow" in city_ids
    assert "bengaluru" in city_ids


@pytest.mark.parametrize("city_id", ["greater_noida", "delhi", "jaipur", "lucknow", "bengaluru"])
def test_city_baseline_network_integrity(city_id):
    top = get_city_topology(city_id)
    assert len(top.zones) >= 4
    assert len(top.assets) >= 4
    assert len(top.links) >= 7

    b = baseline_pipe(city_id)
    # Every zone in the city should receive non-negative baseline pipe supply
    for z in top.zones:
        assert b[z.id] > 0
        assert b[z.id] <= z.demand


def test_city_network_isolation(client):
    res_gn = client.get("/api/v1/network?city_id=greater_noida")
    assert res_gn.status_code == 200
    data_gn = res_gn.json()
    assert data_gn["city_id"] == "greater_noida"
    gn_zone_ids = [z["id"] for z in data_gn["zones"]]
    assert "Z-01" in gn_zone_ids
    assert "DEL-Z01" not in gn_zone_ids

    res_del = client.get("/api/v1/network?city_id=delhi")
    assert res_del.status_code == 200
    data_del = res_del.json()
    assert data_del["city_id"] == "delhi"
    del_zone_ids = [z["id"] for z in data_del["zones"]]
    assert "DEL-Z01" in del_zone_ids
    assert "Z-01" not in del_zone_ids


def test_delhi_incident_workflow_and_isolation(client):
    # 1. Reset Delhi
    client.post("/api/v1/demo/reset?city_id=delhi")

    # 2. Trigger Delhi Booster Pump P-DEL-01 trip
    res_inc = client.post("/api/v1/incidents", json={
        "scenario_type": "delhi_trans_yamuna_pump",
        "city_id": "delhi",
    })
    assert res_inc.status_code == 201
    inc_del = res_inc.json()
    assert inc_del["city_id"] == "delhi"
    assert "DEL-Z01" in inc_del["analysis"]["affected"]
    assert "DEL-Z02" in inc_del["analysis"]["affected"]

    # 3. Check dashboard for Delhi vs Greater Noida
    dash_del = client.get("/api/v1/dashboard?city_id=delhi").json()
    assert dash_del["current_incident"] is not None
    assert dash_del["current_incident"]["id"] == inc_del["id"]

    dash_gn = client.get("/api/v1/dashboard?city_id=greater_noida").json()
    # Delhi incident must not be Greater Noida's active incident
    if dash_gn["current_incident"]:
        assert dash_gn["current_incident"]["city_id"] == "greater_noida"

    # 4. Infeasible plan rejection for Delhi
    plans = inc_del["plans"]
    plan_c = next(p for p in plans if p["plan_key"] == "C")
    assert plan_c["feasible"] is False

    res_approve_bad = client.post(f"/api/v1/plans/{plan_c['id']}/approve")
    assert res_approve_bad.status_code == 400

    # 5. Feasible plan approval for Delhi
    plan_a = next(p for p in plans if p["plan_key"] == "A")
    assert plan_a["feasible"] is True

    res_approve_good = client.post(f"/api/v1/plans/{plan_a['id']}/approve")
    assert res_approve_good.status_code == 200


def test_bengaluru_booster_incident_workflow(client):
    client.post("/api/v1/demo/reset?city_id=bengaluru")
    res_inc = client.post("/api/v1/incidents", json={
        "scenario_type": "blr_booster_trip",
        "city_id": "bengaluru",
    })
    assert res_inc.status_code == 201
    inc_blr = res_inc.json()
    assert inc_blr["city_id"] == "bengaluru"
    assert "BLR-Z03" in inc_blr["analysis"]["affected"]
    assert "BLR-Z04" in inc_blr["analysis"]["affected"]

    # Candidate plans generated and plan C rejected
    plans = inc_blr["plans"]
    plan_c = next(p for p in plans if p["plan_key"] == "C")
    assert plan_c["feasible"] is False
    assert any("P-BLR-02" in v for v in plan_c["violations"])


def test_jaipur_arid_demand_surge(client):
    client.post("/api/v1/demo/reset?city_id=jaipur")
    res_inc = client.post("/api/v1/incidents", json={
        "scenario_type": "jaipur_arid_surge",
        "city_id": "jaipur",
    })
    assert res_inc.status_code == 201
    inc_jpr = res_inc.json()
    assert inc_jpr["analysis"]["totalDemand"] > 36.0  # Surge increases demand


def test_lucknow_hazratganj_incident(client):
    client.post("/api/v1/demo/reset?city_id=lucknow")
    res_inc = client.post("/api/v1/incidents", json={
        "scenario_type": "lucknow_hazratganj_pump",
        "city_id": "lucknow",
    })
    assert res_inc.status_code == 201
    inc_lko = res_inc.json()
    assert "LKO-Z01" in inc_lko["analysis"]["affected"]
    assert "LKO-Z02" in inc_lko["analysis"]["affected"]
