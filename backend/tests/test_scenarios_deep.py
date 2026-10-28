import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models.entities import Allocation, AuditEvent, Incident, ResponsePlan, Zone
from app.network.topology import CITY_TOPOLOGIES, get_city_topology

client = TestClient(app)


def test_scenarios_listing_endpoint():
    """Verify GET /api/v1/incidents/scenarios returns all supported scenarios with proper metadata."""
    res = client.get("/api/v1/incidents/scenarios")
    assert res.status_code == 200
    scenarios = res.json()
    assert len(scenarios) >= 15

    # Check categories
    categories = {s["category"] for s in scenarios}
    assert "pump_failure" in categories
    assert "treatment_reduction" in categories
    assert "demand_surge" in categories
    assert "pipeline_disruption" in categories
    assert "multiple_asset_failure" in categories

    # Query with city_id=greater_noida
    res_gn = client.get("/api/v1/incidents/scenarios?city_id=greater_noida")
    assert res_gn.status_code == 200
    gn_scenarios = res_gn.json()
    assert len(gn_scenarios) >= 5
    for s in gn_scenarios:
        assert s["city_id"] == "greater_noida"
        assert s["simulated_condition"] != ""
        assert s["expected_impact"] != ""


@pytest.mark.parametrize("scenario_key,city_id,expected_category", [
    ("pump_failure_p03", "greater_noida", "pump_failure"),
    ("treatment_reduction", "greater_noida", "treatment_reduction"),
    ("demand_surge", "greater_noida", "demand_surge"),
    ("pipeline_disruption_l03", "greater_noida", "pipeline_disruption"),
    ("multiple_asset_failure", "greater_noida", "multiple_asset_failure"),
    ("delhi_trans_yamuna_pump", "delhi", "pump_failure"),
    ("delhi_pipeline_rupture", "delhi", "pipeline_disruption"),
    ("jaipur_mansarovar_pump", "jaipur", "pump_failure"),
    ("lucknow_dual_pump", "lucknow", "multiple_asset_failure"),
    ("blr_booster_trip", "bengaluru", "pump_failure"),
])
def test_scenario_triggering_all_categories(scenario_key, city_id, expected_category):
    """Verify triggering incidents across categories creates structured incident with impact analysis and candidate plans."""
    res = client.post("/api/v1/incidents", json={"scenario_type": scenario_key, "city_id": city_id})
    assert res.status_code == 201
    data = res.json()
    assert data["city_id"] == city_id
    assert data["status"] == "awaiting_approval"
    assert len(data["plans"]) == 3

    # Verify Analysis
    analysis = data["analysis"]
    assert analysis["totalDemand"] > 0
    assert analysis["totalShortage"] >= 0
    assert len(analysis["impacts"]) == len(get_city_topology(city_id).zones)


def test_zone_impact_calculations():
    """Verify zone-level shortage, baseline, and bottleneck calculations."""
    res = client.post("/api/v1/incidents", json={"scenario_type": "pump_failure_p03", "city_id": "greater_noida"})
    assert res.status_code == 201
    data = res.json()
    analysis = data["analysis"]

    # In Greater Noida P-03 failure: Z-01 (10 MLD) and Z-02 (12 MLD) are starved
    impacts = {i["zoneId"]: i for i in analysis["impacts"]}
    assert "Z-01" in impacts
    assert "Z-02" in impacts
    assert impacts["Z-01"]["incident"] == 0.0
    assert impacts["Z-01"]["shortage"] == 10.0
    assert impacts["Z-02"]["incident"] == 0.0
    assert impacts["Z-02"]["shortage"] == 12.0
    assert "P-03" in impacts["Z-01"]["bottleneck"]

    # Unaffected zones Z-03 and Z-04 should have supply intact
    assert impacts["Z-03"]["incident"] == 8.0
    assert impacts["Z-03"]["shortage"] == 0.0
    assert impacts["Z-04"]["incident"] == 6.0
    assert impacts["Z-04"]["shortage"] == 0.0


def test_solution_plan_calculations_and_water_balance():
    """Verify that Plan A, B, C strictly maintain water conservation: Total Supplied + Unmet == Total Demand."""
    res = client.post("/api/v1/incidents", json={"scenario_type": "pump_failure_p03", "city_id": "greater_noida"})
    assert res.status_code == 201
    data = res.json()
    total_demand = data["analysis"]["totalDemand"]

    for plan in data["plans"]:
        # Conservation check: Total Supplied + Unmet == Total Demand
        assert abs((plan["totalSupplied"] + plan["unmet"]) - total_demand) < 0.01

        # Check zone level sums
        for zid, alloc in plan["alloc"].items():
            zone_supply = alloc["pipe"] + alloc["tanker"]
            unmet = plan["unmetByZone"][zid]
            zone_demand = data["analysis"]["impacts"][0]["demand"] if zid == data["analysis"]["impacts"][0]["zoneId"] else None
            # Find matching zone demand
            for imp in data["analysis"]["impacts"]:
                if imp["zoneId"] == zid:
                    assert abs((zone_supply + unmet) - imp["demand"]) < 0.01

        # Tanker math consistency
        assert plan["tankersUsed"] <= 8
        tanker_sum = sum(plan["tankers"].values())
        assert tanker_sum == plan["tankersUsed"]
        tanker_vol_sum = sum(alloc["tanker"] for alloc in plan["alloc"].values())
        assert abs(tanker_vol_sum - (tanker_sum * 0.5)) < 0.01


def test_benefit_and_trade_off_summaries():
    """Verify Plan A, B, and C include rich operational objectives, plain-English summaries, and trade-offs."""
    res = client.post("/api/v1/incidents", json={"scenario_type": "pump_failure_p03", "city_id": "greater_noida"})
    assert res.status_code == 201
    data = res.json()

    for p in data["plans"]:
        assert p["objective"] is not None and len(p["objective"]) > 10
        assert p["plain_english"] is not None and len(p["plain_english"]) > 10
        assert p["why_useful"] is not None and len(p["why_useful"]) > 10
        assert isinstance(p["benefits"], list) and len(p["benefits"]) >= 2
        assert isinstance(p["tradeOffs"], list) and len(p["tradeOffs"]) >= 2
        assert isinstance(p["benefiting_zones"], list) and len(p["benefiting_zones"]) == 4
        assert isinstance(p["resource_consumption"], dict)
        assert "fleet_usage_pct" in p["resource_consumption"]


def test_feasibility_validation_hard_gate():
    """Verify Validation Agent marks Plan A & B as feasible, and strictly rejects Plan C."""
    res = client.post("/api/v1/incidents", json={"scenario_type": "pump_failure_p03", "city_id": "greater_noida"})
    assert res.status_code == 201
    plans = {p["plan_key"]: p for p in res.json()["plans"]}

    assert plans["A"]["feasible"] is True
    assert len(plans["A"]["violations"]) == 0

    assert plans["B"]["feasible"] is True
    assert len(plans["B"]["violations"]) == 0

    # Plan C must be strictly infeasible
    assert plans["C"]["feasible"] is False
    assert len(plans["C"]["violations"]) > 0
    assert any("P-03" in v or "offline" in v for v in plans["C"]["violations"])


def test_recommendation_consistency():
    """Verify Response Monitoring Agent recommends exactly one feasible plan with lowest penalty score."""
    res = client.post("/api/v1/incidents", json={"scenario_type": "pump_failure_p03", "city_id": "greater_noida"})
    assert res.status_code == 201
    plans = res.json()["plans"]

    rec_plans = [p for p in plans if p["recommended"]]
    assert len(rec_plans) == 1
    assert rec_plans[0]["feasible"] is True
    assert rec_plans[0]["plan_key"] in ["A", "B"]


def test_human_approval_persistence_and_rejection():
    """Verify human approval commits allocations to SQLite and re-validates constraints."""
    res_inc = client.post("/api/v1/incidents", json={"scenario_type": "pump_failure_p03", "city_id": "greater_noida"})
    assert res_inc.status_code == 201
    inc_id = res_inc.json()["id"]

    # 1. Attempting to approve Plan C must be rejected with HTTP 400
    res_bad = client.post(f"/api/v1/plans/{inc_id}-PLAN-C/approve", json={"reason": "Test illegal approval"})
    assert res_bad.status_code == 400
    assert "infeasible" in res_bad.json()["detail"].lower()

    # 2. Approving feasible Plan A must succeed
    res_ok = client.post(f"/api/v1/plans/{inc_id}-PLAN-A/approve", json={"reason": "Operator exhibition test"})
    assert res_ok.status_code == 200
    approved_plan = res_ok.json()
    assert approved_plan["decision"] == "approved"

    # 3. Check SQLite persistence
    db = SessionLocal()
    try:
        inc = db.query(Incident).filter(Incident.id == inc_id).first()
        assert inc.status == "mitigated"
        assert inc.approved_plan_id == f"{inc_id}-PLAN-A"

        allocs = db.query(Allocation).filter(Allocation.incident_id == inc_id).all()
        assert len(allocs) == 4
        z01_alloc = next((a for a in allocs if a.zone_id == "Z-01"), None)
        assert z01_alloc is not None
        assert z01_alloc.tanker_mld == 4.0  # 8 tankers x 0.5 MLD

        # Check AuditEvent recorded
        audit = db.query(AuditEvent).filter(AuditEvent.incident_id == inc_id, AuditEvent.event_type == "human_approval").first()
        assert audit is not None
        assert "Operator exhibition test" in audit.description
    finally:
        db.close()


def test_city_isolation_deep():
    """Verify incidents and allocations in Jaipur do not corrupt or leak into Bengaluru."""
    # Reset both cities first
    client.post("/api/v1/demo/reset?city_id=jaipur")
    client.post("/api/v1/demo/reset?city_id=bengaluru")

    # Trigger crisis in Jaipur
    res_jpr = client.post("/api/v1/incidents", json={"scenario_type": "jaipur_mansarovar_pump", "city_id": "jaipur"})
    assert res_jpr.status_code == 201
    jpr_inc_id = res_jpr.json()["id"]

    # Check Bengaluru dashboard - must have 0 incidents and no shortfall
    res_blr = client.get("/api/v1/dashboard?city_id=bengaluru")
    assert res_blr.status_code == 200
    blr_dash = res_blr.json()
    assert blr_dash["current_incident"] is None
    assert blr_dash["city_id"] == "bengaluru"

    # Check Jaipur dashboard - has active incident
    res_jpr_dash = client.get("/api/v1/dashboard?city_id=jaipur")
    assert res_jpr_dash.status_code == 200
    assert res_jpr_dash.json()["current_incident"]["id"] == jpr_inc_id
