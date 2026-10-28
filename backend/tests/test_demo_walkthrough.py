import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_14_step_exhibition_walkthrough(client):
    # Step 1: Clean reset all cities
    res_reset = client.post("/api/v1/demo/reset")
    assert res_reset.status_code == 200

    # Step 2: Greater Noida baseline check
    res_gn_init = client.get("/api/v1/dashboard?city_id=greater_noida")
    assert res_gn_init.status_code == 200
    gn_data = res_gn_init.json()
    assert gn_data["total_supplied"] == 32.0
    assert gn_data["total_demand"] == 36.0
    assert gn_data["total_unmet"] == 4.0  # Link L-04 limits Z-02 to 8 MLD against 12 MLD demand
    assert gn_data["city_id"] == "greater_noida"

    # Step 3: Trigger simulated P-03 pump failure
    res_inc = client.post("/api/v1/incidents", json={"scenario_type": "pump_failure_p03", "city_id": "greater_noida"})
    assert res_inc.status_code == 201
    inc = res_inc.json()
    assert inc["status"] == "awaiting_approval"

    # Step 4: Show affected zones and calculate shortage
    assert "Z-01" in inc["analysis"]["affected"]
    assert "Z-02" in inc["analysis"]["affected"]
    assert inc["analysis"]["totalShortage"] == 22.0

    # Step 5: Verify all 4 specialist agents executed
    runs_res = client.get(f"/api/v1/incidents/{inc['id']}/agents")
    assert runs_res.status_code == 200
    runs = runs_res.json()
    assert len(runs) == 4
    assert [r["agent_name"] for r in runs] == [
        "Incident Analysis Agent",
        "Resource Optimization Agent",
        "Validation and Safety Agent",
        "Response Monitoring Agent",
    ]

    # Step 6: Verify candidate plans & infeasibility of Plan C
    plans = inc["plans"]
    plan_c = next(p for p in plans if p["plan_key"] == "C")
    assert plan_c["feasible"] is False
    assert len(plan_c["violations"]) > 0

    # Step 7: Demonstrate safety gate: approving Plan C returns 400
    res_bad = client.post(f"/api/v1/plans/{plan_c['id']}/approve")
    assert res_bad.status_code == 400
    assert "Cannot approve infeasible plan" in res_bad.json()["detail"]

    # Step 8: Approve feasible Plan A
    plan_a = next(p for p in plans if p["plan_key"] == "A")
    res_good = client.post(f"/api/v1/plans/{plan_a['id']}/approve")
    assert res_good.status_code == 200
    assert res_good.json()["decision"] == "approved"

    # Step 9: Verify incident mitigated and allocations committed
    res_inc_mitigated = client.get(f"/api/v1/incidents/{inc['id']}")
    assert res_inc_mitigated.json()["status"] == "mitigated"
    alloc_res = client.get(f"/api/v1/allocations/incident/{inc['id']}")
    assert len(alloc_res.json()) == 4

    # Step 10: Verify audit trail contains complete sequence
    audit_res = client.get("/api/v1/audit?city_id=greater_noida")
    ev_types = [e["event_type"] for e in audit_res.json()]
    assert "incident_created" in ev_types
    assert "workflow_executed" in ev_types
    assert "approval_blocked" in ev_types
    assert "human_approval" in ev_types

    # Step 11: Switch to Delhi and verify Delhi has distinct network and no active crisis
    res_del_dash = client.get("/api/v1/dashboard?city_id=delhi")
    assert res_del_dash.status_code == 200
    del_data = res_del_dash.json()
    assert del_data["city_id"] == "delhi"
    assert del_data["current_incident"] is None
    assert any("DEL-Z" in z["id"] for z in del_data["zones"])

    # Step 12: Trigger Delhi scenario and demonstrate city data isolation
    res_del_inc = client.post("/api/v1/incidents", json={"scenario_type": "delhi_wtp_derating", "city_id": "delhi"})
    assert res_del_inc.status_code == 201
    assert res_del_inc.json()["city_id"] == "delhi"

    # Step 13: Verify Greater Noida state is completely untouched by Delhi crisis
    res_gn_check = client.get("/api/v1/dashboard?city_id=greater_noida")
    assert res_gn_check.json()["current_incident"]["id"] == inc["id"]
    assert res_gn_check.json()["current_incident"]["status"] == "mitigated"

    # Step 14: Reset Greater Noida alone, verify Delhi crisis is still active
    client.post("/api/v1/demo/reset?city_id=greater_noida")
    res_gn_after_reset = client.get("/api/v1/dashboard?city_id=greater_noida")
    assert res_gn_after_reset.json()["current_incident"] is None
    res_del_after_reset = client.get("/api/v1/dashboard?city_id=delhi")
    assert res_del_after_reset.json()["current_incident"] is not None
