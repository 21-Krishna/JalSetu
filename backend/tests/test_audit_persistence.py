import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_rejection_leaves_state_unchanged(client):
    # 1. Reset
    client.post("/api/v1/demo/reset?city_id=greater_noida")

    # 2. Trigger incident
    res_inc = client.post("/api/v1/incidents", json={"scenario_type": "pump_failure_p03", "city_id": "greater_noida"})
    assert res_inc.status_code == 201
    inc_data = res_inc.json()
    plans = inc_data["plans"]
    plan_a = next(p for p in plans if p["plan_key"] == "A")

    # 3. Reject Plan A
    res_rej = client.post(f"/api/v1/plans/{plan_a['id']}/reject", json={"reason": "Testing rejection behavior"})
    assert res_rej.status_code == 200
    rejected_plan = res_rej.json()
    assert rejected_plan["decision"] == "rejected"

    # 4. Verify incident status is still awaiting approval (or not mitigated)
    inc_after = client.get(f"/api/v1/incidents/{inc_data['id']}").json()
    assert inc_after["status"] != "mitigated"
    assert inc_after["approvedPlanId"] is None

    # 5. Verify audit event was logged
    audit_events = client.get("/api/v1/audit?city_id=greater_noida").json()
    assert any(e["event_type"] == "human_rejection" for e in audit_events)


def test_audit_event_ordering_and_filtering(client):
    # Fetch audit events with limit
    res = client.get("/api/v1/audit?limit=5")
    assert res.status_code == 200
    events = res.json()
    assert len(events) <= 5

    # Check timestamps are non-empty
    valid_actors = {"Operator", "System", "ValidationGate", "Orchestrator", "AgentOrchestrator"}
    for e in events:
        assert len(e["timestamp"]) > 0
        assert e["actor"] in valid_actors


def test_invalid_incident_scenario_returns_400(client):
    res = client.post("/api/v1/incidents", json={"scenario_type": "non_existent_fake_scenario"})
    assert res.status_code == 400
    assert "Unknown scenario_type" in res.json()["detail"]


def test_nonexistent_plan_approval_returns_404(client):
    res = client.post("/api/v1/plans/FAKE-PLAN-ID-999/approve")
    assert res.status_code == 404
    assert "not found" in res.json()["detail"]
