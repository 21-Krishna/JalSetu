import pytest
from app.network.topology import TANKER_FLEET
from app.network.graph_analysis import Conditions
from app.agents.validation_agent import validate_plan_constraints


def test_reject_allocations_exceeding_capacity():
    # If P-03 is offline, pushing 10 MLD to Z-01 must violate P-03 capacity
    cond = Conditions(asset_factor={"P-03": 0.0})
    alloc = {
        "Z-01": {"pipe": 10.0, "tanker": 0.0},
        "Z-02": {"pipe": 0.0, "tanker": 0.0},
        "Z-03": {"pipe": 8.0, "tanker": 0.0},
        "Z-04": {"pipe": 6.0, "tanker": 0.0},
    }
    tankers = {"Z-01": 0, "Z-02": 0, "Z-03": 0, "Z-04": 0}
    violations = validate_plan_constraints(cond, alloc, tankers, TANKER_FLEET)
    assert any("P-03" in v for v in violations)


def test_reject_tanker_exceeding_fleet():
    cond = Conditions()
    alloc = {
        "Z-01": {"pipe": 10.0, "tanker": 5.0},  # 10 tankers = 5 MLD
        "Z-02": {"pipe": 8.0, "tanker": 0.0},
        "Z-03": {"pipe": 8.0, "tanker": 0.0},
        "Z-04": {"pipe": 6.0, "tanker": 0.0},
    }
    tankers = {"Z-01": 10, "Z-02": 0, "Z-03": 0, "Z-04": 0}
    violations = validate_plan_constraints(cond, alloc, tankers, TANKER_FLEET)  # fleet is 8
    assert any("exceeds available simulated fleet" in v for v in violations)


def test_reject_negative_allocations():
    cond = Conditions()
    alloc = {
        "Z-01": {"pipe": -2.0, "tanker": 0.0},
        "Z-02": {"pipe": 8.0, "tanker": 0.0},
        "Z-03": {"pipe": 8.0, "tanker": 0.0},
        "Z-04": {"pipe": 6.0, "tanker": 0.0},
    }
    tankers = {"Z-01": 0, "Z-02": 0, "Z-03": 0, "Z-04": 0}
    violations = validate_plan_constraints(cond, alloc, tankers, TANKER_FLEET)
    assert any("negative allocation" in v for v in violations)


def test_reject_allocation_exceeding_zone_demand():
    cond = Conditions()
    alloc = {
        "Z-01": {"pipe": 15.0, "tanker": 0.0},  # demand is 10
        "Z-02": {"pipe": 0.0, "tanker": 0.0},
        "Z-03": {"pipe": 0.0, "tanker": 0.0},
        "Z-04": {"pipe": 0.0, "tanker": 0.0},
    }
    tankers = {"Z-01": 0, "Z-02": 0, "Z-03": 0, "Z-04": 0}
    violations = validate_plan_constraints(cond, alloc, tankers, TANKER_FLEET)
    assert any("exceeds zone demand" in v for v in violations)
