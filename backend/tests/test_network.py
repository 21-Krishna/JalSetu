import pytest
from app.network.topology import ZONES, ASSETS, LINKS, TANKER_FLEET
from app.network.graph_analysis import (
    Conditions,
    allocate_priority,
    allocate_proportional,
    baseline_pipe,
    calculate_flows,
    remaining_caps,
    get_affected_downstream_zones,
    r2,
)


def test_baseline_network_consistency():
    b = baseline_pipe()
    assert b["Z-01"] == 10.0
    assert b["Z-02"] == 8.0  # Link L-04 limits Z-02 to 8 MLD
    assert b["Z-03"] == 8.0
    assert b["Z-04"] == 6.0
    total = sum(b.values())
    assert total == 32.0


def test_pump_p03_outage_impact():
    cond = Conditions(asset_factor={"P-03": 0.0})
    pipe = allocate_priority(cond)
    # Z-01 and Z-02 depend on P-03, so they must receive 0 MLD
    assert pipe["Z-01"] == 0.0
    assert pipe["Z-02"] == 0.0
    # Z-03 and Z-04 rely on P-04, unaffected
    assert pipe["Z-03"] == 8.0
    assert pipe["Z-04"] == 6.0

    # Downstream graph check
    affected = get_affected_downstream_zones(["P-03"])
    assert "Z-01" in affected
    assert "Z-02" in affected
    assert "Z-03" not in affected


def test_treatment_plant_derating():
    # TP-01 drops to 60% (21 MLD)
    cond = Conditions(asset_factor={"TP-01": 0.6})
    pipe = allocate_priority(cond)
    link_f, asset_f = calculate_flows(pipe)
    assert asset_f["TP-01"] <= 21.0 + 1e-6


def test_demand_surge_calculation():
    cond = Conditions(demand_factor=1.3)
    assert cond.zone_demand("Z-01") == 13.0
    assert cond.zone_demand("Z-02") == 15.6
    assert cond.zone_demand("Z-03") == 10.4
    assert cond.zone_demand("Z-04") == 7.8
