import pytest
from app.network.topology import TANKER_FLEET
from app.network.graph_analysis import Conditions
from app.agents.incident_analysis_agent import IncidentAnalysisAgent
from app.agents.resource_optimization_agent import ResourceOptimizationAgent
from app.agents.validation_agent import ValidationAgent
from app.agents.response_monitoring_agent import ResponseMonitoringAgent


def test_incident_analysis_agent_output_structure():
    agent = IncidentAnalysisAgent()
    cond = Conditions(asset_factor={"P-03": 0.0})
    meta = {"label": "Pump failure P-03", "description": "P-03 is offline"}
    res = agent.execute("pump_failure_p03", cond, meta)
    assert res.status == "success"
    assert res.agent_name == "Incident Analysis Agent"
    data = res.output_data
    assert data["totalShortage"] == 22.0
    assert "Z-01" in data["affected"]
    assert "Z-02" in data["affected"]
    assert len(data["reasoning"]) > 0


def test_resource_optimization_agent_generates_candidates():
    analysis_data = {"totalShortage": 22.0, "affected": ["Z-01", "Z-02"]}
    cond = Conditions(asset_factor={"P-03": 0.0})
    agent = ResourceOptimizationAgent()
    res = agent.execute(analysis_data, cond, TANKER_FLEET)
    assert res.status == "success"
    plans = res.output_data["candidate_plans"]
    assert len(plans) >= 3
    plan_keys = [p["id"] for p in plans]
    assert "A" in plan_keys
    assert "B" in plan_keys
    assert "C" in plan_keys


def test_validation_agent_evaluates_plans_honestly():
    analysis_data = {"totalShortage": 22.0, "affected": ["Z-01", "Z-02"]}
    cond = Conditions(asset_factor={"P-03": 0.0})
    opt_agent = ResourceOptimizationAgent()
    plans = opt_agent.execute(analysis_data, cond, TANKER_FLEET).output_data["candidate_plans"]

    val_agent = ValidationAgent()
    res = val_agent.execute(plans, cond, TANKER_FLEET)
    assert res.status == "success"
    validated = res.output_data["validated_plans"]
    plan_c = next(p for p in validated if p["id"] == "C")
    assert plan_c["feasible"] is False
    assert any("P-03" in v for v in plan_c["violations"])

    plan_a = next(p for p in validated if p["id"] == "A")
    assert plan_a["feasible"] is True


def test_response_monitoring_agent_recommends_best_feasible():
    analysis_data = {"totalShortage": 22.0, "affected": ["Z-01", "Z-02"]}
    cond = Conditions(asset_factor={"P-03": 0.0})
    plans = ResourceOptimizationAgent().execute(analysis_data, cond, TANKER_FLEET).output_data["candidate_plans"]
    validated = ValidationAgent().execute(plans, cond, TANKER_FLEET).output_data["validated_plans"]

    mon_agent = ResponseMonitoringAgent()
    res = mon_agent.execute(validated, cond)
    assert res.status == "success"
    data = res.output_data
    assert data["recommended_plan_id"] is not None
    assert any(p["recommended"] for p in data["ranked_plans"])
    rec_plan = next(p for p in data["ranked_plans"] if p["recommended"])
    assert rec_plan["feasible"] is True
