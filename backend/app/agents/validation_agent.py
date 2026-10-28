from typing import Any, Dict, List
from app.agents.base import BaseAgent
from app.network.topology import (
    ASSETS,
    LINKS,
    TANKER_FLEET,
    TANKER_MLD,
    ZONES,
    zone_label,
)
from app.network.graph_analysis import (
    Conditions,
    calculate_flows,
    r2,
    EPS,
)


def validate_plan_constraints(
    conditions: Conditions,
    alloc: Dict[str, Dict[str, float]],
    tankers: Dict[str, int],
    fleet_limit: int = None,
) -> List[str]:
    violations: List[str] = []
    top = conditions.topology
    effective_fleet = fleet_limit if fleet_limit is not None else top.tanker_fleet
    pipe = {z.id: alloc.get(z.id, {}).get("pipe", 0.0) for z in top.zones}

    # 1. Non-negativity & demand ceiling per zone
    for z in top.zones:
        zone_alloc = alloc.get(z.id, {"pipe": 0.0, "tanker": 0.0})
        pipe_vol = zone_alloc.get("pipe", 0.0)
        tanker_vol = zone_alloc.get("tanker", 0.0)

        if pipe_vol < -EPS or tanker_vol < -EPS:
            violations.append(
                f"{zone_label(z.id, conditions.city_id)}: negative allocation detected (pipe: {pipe_vol}, tanker: {tanker_vol})."
            )

        total_vol = pipe_vol + tanker_vol
        demand = conditions.zone_demand(z.id)
        if total_vol > demand + EPS:
            violations.append(
                f"{zone_label(z.id, conditions.city_id)}: total allocation {r2(total_vol)} MLD exceeds zone demand {demand} MLD."
            )

        # Tanker count and volume consistency
        tk_count = tankers.get(z.id, 0)
        if not isinstance(tk_count, int) or tk_count < 0:
            violations.append(
                f"{zone_label(z.id, conditions.city_id)}: tanker count must be a non-negative whole integer (got {tk_count})."
            )
        expected_tanker_vol = r2(tk_count * TANKER_MLD)
        if abs(expected_tanker_vol - tanker_vol) > EPS:
            violations.append(
                f"{zone_label(z.id, conditions.city_id)}: tanker volume {tanker_vol} MLD does not match {tk_count} tankers × {TANKER_MLD} MLD ({expected_tanker_vol} MLD)."
            )

    # 2. Hydraulic flows and network capacity constraints
    link_flow, asset_flow = calculate_flows(pipe, conditions.city_id)

    for l in top.links:
        flow = link_flow.get(l.id, 0.0)
        eff_link_cap = r2(conditions.link_cap(l.id))
        if flow > eff_link_cap + EPS:
            status_note = " (link severed)" if eff_link_cap == 0.0 else (f" (capacity derated to {eff_link_cap} MLD)" if eff_link_cap < l.capacity else "")
            violations.append(
                f"Link {l.id} ({l.from_node} → {l.to_node}) throughput {r2(flow)} MLD exceeds available capacity {eff_link_cap} MLD{status_note}."
            )

    for a in top.assets:
        eff_cap = r2(conditions.asset_cap(a.id))
        flow = asset_flow.get(a.id, 0.0)
        if flow > eff_cap + EPS:
            status_note = " (asset offline)" if eff_cap == 0.0 else f" (derated to {eff_cap} MLD)"
            violations.append(
                f"{a.name} ({a.id}) throughput {r2(flow)} MLD exceeds available operating capacity {eff_cap} MLD{status_note}."
            )

    # 3. Tanker fleet constraint
    total_tankers = sum(tankers.values())
    if total_tankers > effective_fleet:
        violations.append(
            f"Total tankers requested ({total_tankers}) exceeds available simulated fleet capacity ({effective_fleet} tankers)."
        )

    return violations


class ValidationAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="Validation and Safety Agent",
            role="Independently verifies hard physical constraints, network bottlenecks, and fleet limits",
            step_order=3,
        )

    def _summarize_input(self, candidate_plans: List[Dict[str, Any]], conditions: Conditions, fleet: int) -> str:
        top = conditions.topology
        active_fleet = fleet if fleet is not None else top.tanker_fleet
        return f"[{top.name}] Evaluating {len(candidate_plans)} candidate plans against physical asset and fleet limits (fleet max: {active_fleet})"

    def _process(self, candidate_plans: List[Dict[str, Any]], conditions: Conditions, fleet: int = None) -> Dict[str, Any]:
        top = conditions.topology
        active_fleet = fleet if fleet is not None else top.tanker_fleet
        validated_plans = []
        feasible_count = 0
        infeasible_count = 0

        for p in candidate_plans:
            violations = validate_plan_constraints(
                conditions=conditions,
                alloc=p["alloc"],
                tankers=p["tankers"],
                fleet_limit=active_fleet,
            )
            is_feasible = len(violations) == 0
            if is_feasible:
                feasible_count += 1
            else:
                infeasible_count += 1

            validated_plans.append({
                **p,
                "violations": violations,
                "feasible": is_feasible,
            })

        return {
            "validated_plans": validated_plans,
            "feasible_count": feasible_count,
            "infeasible_count": infeasible_count,
            "summary": f"Validated {len(validated_plans)} plans for {top.name}: {feasible_count} feasible, {infeasible_count} rejected.",
        }
