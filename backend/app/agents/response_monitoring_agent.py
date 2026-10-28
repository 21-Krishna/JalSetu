from typing import Any, Dict, List
from app.agents.base import BaseAgent
from app.agents.llm_provider import generate_plan_recommendation_rationale
from app.network.topology import ZONES, PRIORITY_RANK
from app.network.graph_analysis import Conditions, r2


def score_plan(plan: Dict[str, Any], conditions: Conditions) -> float:
    # Lower score is better: unmet demand + priority weight + tanker usage penalty
    top = conditions.topology
    high_unmet = sum(
        plan["unmetByZone"].get(z.id, 0.0)
        for z in top.zones
        if z.priority == "high"
    )
    score = (
        plan["unmet"] * 10.0
        + high_unmet * 15.0
        + plan["tankersUsed"] * 0.5
    )
    return r2(score)


class ResponseMonitoringAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="Response Monitoring Agent",
            role="Tracks incident life-cycle, ranks alternatives, synthesizes explanations, and enforces human gate",
            step_order=4,
        )

    def _summarize_input(self, validated_plans: List[Dict[str, Any]], conditions: Conditions) -> str:
        city_name = conditions.topology.name
        feasible = [p for p in validated_plans if p.get("feasible")]
        return f"[{city_name}] Reviewing {len(feasible)} feasible of {len(validated_plans)} candidate plans for ranking and operational handoff"

    def _process(self, validated_plans: List[Dict[str, Any]], conditions: Conditions) -> Dict[str, Any]:
        feasible = [p for p in validated_plans if p.get("feasible")]
        infeasible = [p for p in validated_plans if not p.get("feasible")]

        ranked_plans = []
        for p in validated_plans:
            score = score_plan(p, conditions) if p.get("feasible") else 999999.0
            ranked_plans.append({**p, "score": score})

        safety_constraints_checked = [
            "1. Treatment Plant Throughput: Flow <= Effective Treatment Capacity",
            "2. Booster Pumping Limits: Flow <= Available Pump Capacity (0 MLD if offline)",
            "3. Pipeline Design Hydraulic Limits: Link Flow <= Design Rating",
            "4. Municipal Tanker Fleet Limit: Deployed Tankers <= Fleet Capacity",
            "5. Tanker Physical Math: Delivered Volume == Count x 0.5 MLD",
            "6. Non-negativity Constraint: Allocations >= 0 MLD",
            "7. Zonal Demand Ceiling: Pipe + Tanker <= Zone Current Demand",
        ]

        scoring_criteria = {
            "formula": "Penalty = (Total Unmet x 10.0) + (High-Priority Unmet x 15.0) + (Tankers Dispatched x 0.5)",
            "explanation": "Calculates operational disruption penalty. Lower score indicates superior candidate. Heavily penalizes high-priority civic vulnerabilities (15x) and unmet municipal demand (10x), with a minor penalty on emergency fleet deployment (0.5x).",
            "weights": {
                "total_unmet_penalty": 10.0,
                "high_priority_unmet_penalty": 15.0,
                "fleet_usage_penalty": 0.5,
            },
        }

        if feasible:
            best_plan = min(
                [p for p in ranked_plans if p.get("feasible")],
                key=lambda x: (x["score"], x["unmet"], x["tankersUsed"]),
            )
            for p in ranked_plans:
                p["recommended"] = (p["id"] == best_plan["id"])
            recommendation_rationale = generate_plan_recommendation_rationale(
                recommended_plan=best_plan,
                feasible_plans=feasible,
                infeasible_plans=infeasible,
            )
            rec_id = best_plan["id"]
            action_status = f"Recommends Plan {rec_id} (remaining unmet {best_plan['unmet']} MLD in {conditions.topology.name}). Awaiting human operator approval."
            comparison_summary = {
                "strategy_breakdown": (
                    f"Plan A concentrates water in high-priority zones first to safeguard vital infrastructure, then dispatches tankers to high-priority gaps. "
                    f"Plan B shares available water proportionally across all zones to maximize civic equity and prevent complete shutoffs. "
                    f"Plan C tests a counter-factual benchmark attempting 100% restoration, but is physically blocked by the Safety Gate due to damaged infrastructure."
                ),
                "feasible_count": len(feasible),
                "infeasible_count": len(infeasible),
                "recommendation_reason": (
                    f"Plan {rec_id} scored lowest penalty ({best_plan['score']}), delivering {best_plan['totalSupplied']} MLD while "
                    f"protecting high-priority infrastructure within simulated fleet limits ({best_plan['tankersUsed']} tankers used)."
                ),
            }
        else:
            best_plan = None
            action_status = f"No feasible plan meets physical safety constraints in {conditions.topology.name}. Manual operational escalation required."
            recommendation_rationale = {
                "provider": "deterministic",
                "narrative": action_status,
                "is_llm": False,
            }
            comparison_summary = {
                "strategy_breakdown": "All formulated plans violate physical or hydraulic boundaries under current network conditions.",
                "feasible_count": 0,
                "infeasible_count": len(infeasible),
                "recommendation_reason": "No feasible plan available. Approvals strictly blocked.",
            }

        return {
            "ranked_plans": ranked_plans,
            "recommended_plan_id": best_plan["id"] if best_plan else None,
            "action_status": action_status,
            "rationale": recommendation_rationale,
            "scoring_criteria": scoring_criteria,
            "safety_constraints_checked": safety_constraints_checked,
            "comparison_summary": comparison_summary,
            "human_approval_required": True,
            "notice": "Simulated operational recommendation only. Physical execution remains gated by human confirmation.",
        }
