import pytest
from app.network.topology import get_city_topology, TANKER_MLD
from app.network.graph_analysis import Conditions, calculate_flows, remaining_caps, r2
from app.agents.resource_optimization_agent import ResourceOptimizationAgent
from app.agents.validation_agent import ValidationAgent, validate_plan_constraints
from app.agents.response_monitoring_agent import ResponseMonitoringAgent, score_plan


@pytest.mark.parametrize("city_id", ["greater_noida", "delhi", "jaipur", "lucknow", "bengaluru"])
def test_hard_constraint_demand_ceiling_all_cities(city_id):
    cond = Conditions(city_id=city_id)
    top = cond.topology
    first_zone = top.zones[0]

    # Valid allocation equal to demand
    alloc_valid = {
        z.id: {"pipe": min(z.demand, 5.0), "tanker": 0.0}
        for z in top.zones
    }
    tankers = {z.id: 0 for z in top.zones}
    assert len(validate_plan_constraints(cond, alloc_valid, tankers, top.tanker_fleet)) == 0

    # Over-allocation exceeding demand
    alloc_invalid = {
        z.id: {"pipe": z.demand + 5.0, "tanker": 0.0}
        for z in top.zones
    }
    violations = validate_plan_constraints(cond, alloc_invalid, tankers, top.tanker_fleet)
    assert any("exceeds zone demand" in v for v in violations)


@pytest.mark.parametrize("city_id", ["greater_noida", "delhi", "jaipur", "lucknow", "bengaluru"])
def test_hard_constraint_tanker_fleet_limits_all_cities(city_id):
    cond = Conditions(city_id=city_id)
    top = cond.topology

    # Exceeding fleet
    tankers_excess = {z.id: 0 for z in top.zones}
    tankers_excess[top.zones[0].id] = top.tanker_fleet + 2
    tanker_vol = r2((top.tanker_fleet + 2) * TANKER_MLD)

    alloc = {
        z.id: {
            "pipe": 0.0,
            "tanker": tanker_vol if z.id == top.zones[0].id else 0.0,
        }
        for z in top.zones
    }

    violations = validate_plan_constraints(cond, alloc, tankers_excess, top.tanker_fleet)
    assert any("exceeds available simulated fleet capacity" in v for v in violations)


def test_tanker_volume_math_mismatch_blocked():
    cond = Conditions(city_id="greater_noida")
    alloc = {
        "Z-01": {"pipe": 0.0, "tanker": 2.0},  # says 2.0 MLD
        "Z-02": {"pipe": 0.0, "tanker": 0.0},
        "Z-03": {"pipe": 0.0, "tanker": 0.0},
        "Z-04": {"pipe": 0.0, "tanker": 0.0},
    }
    # But only 2 tankers deployed (2 × 0.5 = 1.0 MLD != 2.0 MLD)
    tankers = {"Z-01": 2, "Z-02": 0, "Z-03": 0, "Z-04": 0}
    violations = validate_plan_constraints(cond, alloc, tankers, 8)
    assert any("does not match" in v for v in violations)


def test_offline_pump_blocks_downstream_pipe():
    # If P-03 in Greater Noida is offline (factor=0.0)
    cond = Conditions(asset_factor={"P-03": 0.0}, city_id="greater_noida")
    # Attempting to allocate any pipe water to Z-01 or Z-02 must violate P-03
    alloc = {
        "Z-01": {"pipe": 1.0, "tanker": 0.0},
        "Z-02": {"pipe": 0.0, "tanker": 0.0},
        "Z-03": {"pipe": 8.0, "tanker": 0.0},
        "Z-04": {"pipe": 6.0, "tanker": 0.0},
    }
    tankers = {"Z-01": 0, "Z-02": 0, "Z-03": 0, "Z-04": 0}
    violations = validate_plan_constraints(cond, alloc, tankers, 8)
    assert any("P-03" in v and "operating capacity" in v for v in violations)


def test_derated_treatment_plant_limits():
    # TP-01 drops to 50% (17.5 MLD) in Greater Noida
    cond = Conditions(asset_factor={"TP-01": 0.5}, city_id="greater_noida")
    # Pushing 20 MLD through the network must trigger violation on TP-01
    alloc = {
        "Z-01": {"pipe": 10.0, "tanker": 0.0},
        "Z-02": {"pipe": 0.0, "tanker": 0.0},
        "Z-03": {"pipe": 8.0, "tanker": 0.0},
        "Z-04": {"pipe": 6.0, "tanker": 0.0},  # total pipe flow = 24 MLD > 17.5 MLD
    }
    tankers = {"Z-01": 0, "Z-02": 0, "Z-03": 0, "Z-04": 0}
    violations = validate_plan_constraints(cond, alloc, tankers, 8)
    assert any("TP-01" in v for v in violations)


def test_multi_agent_pipeline_plan_differentiation():
    cond = Conditions(asset_factor={"P-03": 0.0}, city_id="greater_noida")
    analysis_data = {"totalShortage": 22.0, "affected": ["Z-01", "Z-02"]}

    opt_agent = ResourceOptimizationAgent()
    res_opt = opt_agent.execute(analysis_data, cond, 8)
    plans = res_opt.output_data["candidate_plans"]

    plan_a = next(p for p in plans if p["plan_key"] == "A")
    plan_b = next(p for p in plans if p["plan_key"] == "B")
    plan_c = next(p for p in plans if p["plan_key"] == "C")

    # Plan A prioritizes high-priority Z-01 with emergency tankers
    assert plan_a["tankers"]["Z-01"] > 0

    # Validation
    val_agent = ValidationAgent()
    res_val = val_agent.execute(plans, cond, 8)
    val_plans = res_val.output_data["validated_plans"]

    val_a = next(p for p in val_plans if p["plan_key"] == "A")
    val_c = next(p for p in val_plans if p["plan_key"] == "C")

    assert val_a["feasible"] is True
    assert val_c["feasible"] is False

    # Response monitoring agent selects best feasible plan
    mon_agent = ResponseMonitoringAgent()
    res_mon = mon_agent.execute(val_plans, cond)
    data_mon = res_mon.output_data
    assert data_mon["recommended_plan_id"] == "A"
    assert data_mon["human_approval_required"] is True
