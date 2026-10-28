import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_health_endpoint(client):
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] in ["healthy", "degraded"]
    assert data["database"] == "connected"
    assert data["demo_mode"] is True


def test_network_state_endpoint(client):
    res = client.get("/api/v1/network")
    assert res.status_code == 200
    data = res.json()
    assert len(data["assets"]) >= 4
    assert len(data["zones"]) == 4
    assert data["tanker_fleet"] == 8


def test_e2e_pump_failure_workflow(client):
    # 1. Reset first to ensure clean state
    res_reset = client.post("/api/v1/demo/reset")
    assert res_reset.status_code == 200


    # 2. Trigger Pump P-03 failure
    res_inc = client.post("/api/v1/incidents", json={"scenario_type": "pump_failure_p03"})
    assert res_inc.status_code == 201
    inc_data = res_inc.json()
    inc_id = inc_data["id"]
    assert inc_data["status"] == "awaiting_approval"
    assert inc_data["analysis"]["totalShortage"] == 22.0
    assert "Z-01" in inc_data["analysis"]["affected"]
    assert "Z-02" in inc_data["analysis"]["affected"]

    # 3. Verify Agent Runs were logged to DB
    res_agents = client.get(f"/api/v1/incidents/{inc_id}/agents")
    assert res_agents.status_code == 200
    agent_runs = res_agents.json()
    assert len(agent_runs) == 4
    agent_names = [r["agent_name"] for r in agent_runs]
    assert "Incident Analysis Agent" in agent_names
    assert "Resource Optimization Agent" in agent_names
    assert "Validation and Safety Agent" in agent_names
    assert "Response Monitoring Agent" in agent_names

    # 4. Verify candidate plans were generated
    res_plans = client.get(f"/api/v1/incidents/{inc_id}/plans")
    assert res_plans.status_code == 200
    plans = res_plans.json()
    assert len(plans) >= 3

    plan_c = next(p for p in plans if p["plan_key"] == "C")
    assert plan_c["feasible"] is False

    plan_a = next(p for p in plans if p["plan_key"] == "A")
    assert plan_a["feasible"] is True

    # 5. Safety gate: Approving infeasible Plan C MUST fail with 400
    res_bad_approve = client.post(f"/api/v1/plans/{plan_c['id']}/approve")
    assert res_bad_approve.status_code == 400
    assert "Cannot approve infeasible plan" in res_bad_approve.json()["detail"]

    # 6. Approving feasible Plan A succeeds and commits
    res_good_approve = client.post(f"/api/v1/plans/{plan_a['id']}/approve")
    assert res_good_approve.status_code == 200
    approved_plan = res_good_approve.json()
    assert approved_plan["decision"] == "approved"

    # 7. Verify incident status is mitigated
    res_inc_updated = client.get(f"/api/v1/incidents/{inc_id}")
    assert res_inc_updated.status_code == 200
    assert res_inc_updated.json()["status"] == "mitigated"
    assert res_inc_updated.json()["approvedPlanId"] == plan_a["id"]

    # 8. Verify allocations were persisted in DB
    res_alloc = client.get(f"/api/v1/allocations/incident/{inc_id}")
    assert res_alloc.status_code == 200
    allocations = res_alloc.json()
    assert len(allocations) == 4

    # 9. Verify audit log captures creation, execution, and approval
    res_audit = client.get("/api/v1/audit")
    assert res_audit.status_code == 200
    audit_events = res_audit.json()
    event_types = [e["event_type"] for e in audit_events]
    assert "incident_created" in event_types
    assert "workflow_executed" in event_types
    assert "human_approval" in event_types

    # 10. Verify dashboard metrics reflect updated state
    res_dash = client.get("/api/v1/dashboard")
    assert res_dash.status_code == 200
    dash_data = res_dash.json()
    assert dash_data["current_incident"]["id"] == inc_id
    assert dash_data["total_unmet"] == 18.0  # 22 - 4 (tankers deployed)


def test_cities_api_endpoints(client):
    res = client.get("/api/v1/cities")
    assert res.status_code == 200
    cities = res.json()
    assert len(cities) == 5

    res_detail = client.get("/api/v1/cities/bengaluru")
    assert res_detail.status_code == 200
    bengaluru_data = res_detail.json()
    assert bengaluru_data["name"] == "Bengaluru"
    assert len(bengaluru_data["zones"]) == 4
    assert len(bengaluru_data["scenarios"]) >= 3


def test_dashboard_multi_city_query(client):
    res_jaipur = client.get("/api/v1/dashboard?city_id=jaipur")
    assert res_jaipur.status_code == 200
    data = res_jaipur.json()
    assert data["city_id"] == "jaipur"
    assert data["city_name"] == "Jaipur"
    assert len(data["available_cities"]) == 5


def test_seed_demo_by_city(client):
    res_seed = client.post("/api/v1/demo/seed?city_id=lucknow")
    assert res_seed.status_code == 200
    inc_data = res_seed.json()
    assert inc_data["city_id"] == "lucknow"
    assert "LKO-Z01" in inc_data["analysis"]["affected"] or "LKO-Z02" in inc_data["analysis"]["affected"]

