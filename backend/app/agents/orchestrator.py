import json
from typing import Any, Dict, List, Tuple
from sqlalchemy.orm import Session

from app.agents.incident_analysis_agent import IncidentAnalysisAgent
from app.agents.resource_optimization_agent import ResourceOptimizationAgent
from app.agents.validation_agent import ValidationAgent
from app.agents.response_monitoring_agent import ResponseMonitoringAgent
from app.network.topology import TANKER_FLEET
from app.network.graph_analysis import Conditions
from app.models.entities import AgentRun, AuditEvent, Incident, ResponsePlan


class AgentOrchestrator:
    def __init__(self):
        self.analysis_agent = IncidentAnalysisAgent()
        self.optimization_agent = ResourceOptimizationAgent()
        self.validation_agent = ValidationAgent()
        self.monitoring_agent = ResponseMonitoringAgent()

    def run_workflow(
        self,
        db: Session,
        incident: Incident,
        conditions: Conditions,
        incident_meta: Dict[str, Any],
        available_tankers: int = TANKER_FLEET,
    ) -> Tuple[Dict[str, Any], List[Dict[str, Any]], List[AgentRun]]:
        """
        Coordinates the 4-stage multi-agent pipeline and records execution history to database.
        """
        agent_runs_created: List[AgentRun] = []

        # ---------------------------------------------------------
        # Stage 1: Incident Analysis Agent
        # ---------------------------------------------------------
        res_analysis = self.analysis_agent.execute(
            scenario_type=incident.scenario_type,
            conditions=conditions,
            incident_meta=incident_meta,
        )
        run_1 = AgentRun(
            incident_id=incident.id,
            agent_name=res_analysis.agent_name,
            role=res_analysis.role,
            step_order=res_analysis.step_order,
            status=res_analysis.status,
            input_summary=res_analysis.input_summary,
            output_json=json.dumps(res_analysis.output_data),
            error_details=res_analysis.error_details,
            started_at=res_analysis.started_at,
            completed_at=res_analysis.completed_at,
            duration_ms=res_analysis.duration_ms,
        )
        db.add(run_1)
        agent_runs_created.append(run_1)

        if res_analysis.status != "success":
            db.commit()
            raise RuntimeError(f"Incident Analysis Agent failed: {res_analysis.error_details}")

        analysis_data = res_analysis.output_data

        # ---------------------------------------------------------
        # Stage 2: Resource Optimization Agent
        # ---------------------------------------------------------
        res_opt = self.optimization_agent.execute(
            analysis_result=analysis_data,
            conditions=conditions,
            fleet=available_tankers,
        )
        run_2 = AgentRun(
            incident_id=incident.id,
            agent_name=res_opt.agent_name,
            role=res_opt.role,
            step_order=res_opt.step_order,
            status=res_opt.status,
            input_summary=res_opt.input_summary,
            output_json=json.dumps(res_opt.output_data),
            error_details=res_opt.error_details,
            started_at=res_opt.started_at,
            completed_at=res_opt.completed_at,
            duration_ms=res_opt.duration_ms,
        )
        db.add(run_2)
        agent_runs_created.append(run_2)

        if res_opt.status != "success":
            db.commit()
            raise RuntimeError(f"Resource Optimization Agent failed: {res_opt.error_details}")

        candidate_plans = res_opt.output_data.get("candidate_plans", [])

        # ---------------------------------------------------------
        # Stage 3: Validation and Safety Agent
        # ---------------------------------------------------------
        res_val = self.validation_agent.execute(
            candidate_plans=candidate_plans,
            conditions=conditions,
            fleet=available_tankers,
        )
        run_3 = AgentRun(
            incident_id=incident.id,
            agent_name=res_val.agent_name,
            role=res_val.role,
            step_order=res_val.step_order,
            status=res_val.status,
            input_summary=res_val.input_summary,
            output_json=json.dumps(res_val.output_data),
            error_details=res_val.error_details,
            started_at=res_val.started_at,
            completed_at=res_val.completed_at,
            duration_ms=res_val.duration_ms,
        )
        db.add(run_3)
        agent_runs_created.append(run_3)

        if res_val.status != "success":
            db.commit()
            raise RuntimeError(f"Validation Agent failed: {res_val.error_details}")

        validated_plans = res_val.output_data.get("validated_plans", [])

        # ---------------------------------------------------------
        # Stage 4: Response Monitoring Agent
        # ---------------------------------------------------------
        res_mon = self.monitoring_agent.execute(
            validated_plans=validated_plans,
            conditions=conditions,
        )
        run_4 = AgentRun(
            incident_id=incident.id,
            agent_name=res_mon.agent_name,
            role=res_mon.role,
            step_order=res_mon.step_order,
            status=res_mon.status,
            input_summary=res_mon.input_summary,
            output_json=json.dumps(res_mon.output_data),
            error_details=res_mon.error_details,
            started_at=res_mon.started_at,
            completed_at=res_mon.completed_at,
            duration_ms=res_mon.duration_ms,
        )
        db.add(run_4)
        agent_runs_created.append(run_4)

        if res_mon.status != "success":
            db.commit()
            raise RuntimeError(f"Response Monitoring Agent failed: {res_mon.error_details}")

        final_plans = res_mon.output_data.get("ranked_plans", [])

        # Persist ResponsePlan records into DB
        # Remove any existing plans for this incident first
        db.query(ResponsePlan).filter(ResponsePlan.incident_id == incident.id).delete()

        plan_entities = []
        for p in final_plans:
            metadata_dict = {
                "objective": p.get("objective"),
                "plain_english": p.get("plain_english"),
                "why_useful": p.get("why_useful"),
                "benefiting_zones": p.get("benefiting_zones", []),
                "resource_consumption": p.get("resource_consumption", {}),
                "benefits": p.get("benefits", []),
            }
            plan_entity = ResponsePlan(
                id=f"{incident.id}-PLAN-{p['id']}",
                incident_id=incident.id,
                plan_key=p["id"],
                name=p["name"],
                strategy=p["strategy"],
                allocations_json=json.dumps(p["alloc"]),
                tankers_json=json.dumps(p["tankers"]),
                tankers_used=p["tankersUsed"],
                total_supplied=p["totalSupplied"],
                unmet_demand=p["unmet"],
                unmet_by_zone_json=json.dumps(p["unmetByZone"]),
                trade_offs_json=json.dumps(p["tradeOffs"]),
                violations_json=json.dumps(p["violations"]),
                feasible=p["feasible"],
                recommended=p["recommended"],
                decision="pending",
                metadata_json=json.dumps(metadata_dict),
            )
            db.add(plan_entity)
            plan_entities.append(plan_entity)

        # Update incident analysis with full monitoring and recommendation data
        prior_analysis = json.loads(incident.analysis_json) if incident.analysis_json else {}
        analysis_data_with_meta = {
            **analysis_data,
            **({"report": prior_analysis["report"]} if "report" in prior_analysis else {}),
            "recommended_plan_id": res_mon.output_data.get("recommended_plan_id"),
            "scoring_criteria": res_mon.output_data.get("scoring_criteria"),
            "safety_constraints_checked": res_mon.output_data.get("safety_constraints_checked"),
            "comparison_summary": res_mon.output_data.get("comparison_summary"),
            "rationale": res_mon.output_data.get("rationale"),
        }
        incident.analysis_json = json.dumps(analysis_data_with_meta)

        # Record audit event
        audit = AuditEvent(
            incident_id=incident.id,
            event_type="workflow_executed",
            actor="AgentOrchestrator",
            description=f"Multi-agent assessment completed: {len(final_plans)} plans formulated ({len([p for p in final_plans if p['feasible']])} feasible).",
            metadata_json=json.dumps({
                "shortage": analysis_data["totalShortage"],
                "affected_zones": analysis_data["affected"],
                "recommended_plan": res_mon.output_data.get("recommended_plan_id"),
            }),
        )
        db.add(audit)

        db.commit()
        return analysis_data, final_plans, agent_runs_created
