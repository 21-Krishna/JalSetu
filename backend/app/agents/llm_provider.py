from typing import Any, Dict, List
from app.config import settings


def generate_incident_explanation(
    incident_label: str,
    severity: str,
    affected_zones: List[str],
    total_shortage: float,
    failed_assets: List[str],
) -> Dict[str, Any]:
    """Generates an executive narrative for the incident assessment."""
    if settings.LLM_PROVIDER == "external" and settings.LLM_API_KEY:
        # Placeholder for external LLM call if user injects API key
        pass

    # Deterministic explainable template
    failed_str = ", ".join(failed_assets) if failed_assets else "hydraulic capacity throttle"
    zones_str = ", ".join(affected_zones) if affected_zones else "None identified"
    narrative = (
        f"[Deterministic Analysis Engine] Incident '{incident_label}' classified at {severity} severity. "
        f"A failure in {failed_str} directly restricts downstream pipeline throughput, precipitating "
        f"an aggregate municipal water deficit of {total_shortage} MLD. Impacted zones include {zones_str}. "
        f"Emergency relief strategies must balance high-priority civic infrastructure with equitable distribution."
    )
    return {
        "provider": "deterministic",
        "narrative": narrative,
        "is_llm": False,
    }


def generate_plan_recommendation_rationale(
    recommended_plan: Dict[str, Any],
    feasible_plans: List[Dict[str, Any]],
    infeasible_plans: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """Generates an executive narrative explaining why a specific plan was recommended."""
    rec_id = recommended_plan.get("id", "A")
    unmet = recommended_plan.get("unmet", 0.0)
    tankers = recommended_plan.get("tankersUsed", 0)

    infeasible_reasons = []
    for ip in infeasible_plans:
        reason = ip.get("violations", ["violates network limits"])[0]
        infeasible_reasons.append(f"Plan {ip.get('id')}: {reason}")

    infeasible_summary = (
        f" Alternatives rejected by safety gate: {'; '.join(infeasible_reasons)}."
        if infeasible_reasons
        else ""
    )

    narrative = (
        f"[Deterministic Advisory Engine] Recommends Plan {rec_id} as the optimal mitigation strategy. "
        f"It curtails civic deficit to {unmet} MLD by deploying {tankers} tankers while strictly adhering "
        f"to physical flow limits.{infeasible_summary} Human operator confirmation is required prior to committing dispatch."
    )
    return {
        "provider": "deterministic",
        "narrative": narrative,
        "is_llm": False,
    }
