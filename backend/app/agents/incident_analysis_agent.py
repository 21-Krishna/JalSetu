from typing import Any, Dict, List
from app.agents.base import BaseAgent
from app.network.topology import zone_label
from app.network.graph_analysis import (
    Conditions,
    allocate_priority,
    baseline_pipe,
    path_to,
    remaining_caps,
    r2,
    get_affected_downstream_zones,
    EPS,
)


class IncidentAnalysisAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="Incident Analysis Agent",
            role="Inspects network graph, isolates failed assets, and calculates zone supply gaps",
            step_order=1,
        )

    def _summarize_input(self, scenario_type: str, conditions: Conditions, incident_meta: Dict[str, Any]) -> str:
        city_name = conditions.topology.name
        return f"[{city_name}] Scenario '{scenario_type}': {incident_meta.get('label', '')}. Asset factors: {conditions.asset_factor}, Demand factor: {conditions.demand_factor}x"

    def _process(self, scenario_type: str, conditions: Conditions, incident_meta: Dict[str, Any]) -> Dict[str, Any]:
        top = conditions.topology
        base = baseline_pipe(conditions.city_id)
        inc = allocate_priority(conditions)
        reasoning: List[str] = [incident_meta.get("description", "Simulated crisis initiated.")]

        failed_assets = [aid for aid, f in conditions.asset_factor.items() if f < 1.0]
        failed_links = [lid for lid, f in conditions.link_factor.items() if f < 1.0]

        for aid, f in conditions.asset_factor.items():
            matched_asset = next((a for a in top.assets if a.id == aid), None)
            if matched_asset:
                downstream_links = [l.id for l in top.links if l.from_node == aid]
                if f == 0.0:
                    reasoning.append(
                        f"Asset {aid} ({matched_asset.name}) is OFFLINE (0/{matched_asset.capacity} MLD). "
                        f"Downstream links ({', '.join(downstream_links) or 'none'}) can carry 0 MLD."
                    )
                else:
                    eff = r2(matched_asset.capacity * f)
                    reasoning.append(
                        f"Asset {aid} ({matched_asset.name}) degraded to {r2(f * 100)}% capacity ({eff} of {matched_asset.capacity} MLD)."
                    )

        for lid, f in conditions.link_factor.items():
            matched_link = next((l for l in top.links if l.id == lid), None)
            if matched_link:
                if f == 0.0:
                    reasoning.append(
                        f"Pipeline {lid} ({matched_link.from_node} → {matched_link.to_node}) is SEVERED/RUPTURED (0/{matched_link.capacity} MLD)."
                    )
                else:
                    eff = r2(matched_link.capacity * f)
                    reasoning.append(
                        f"Pipeline {lid} ({matched_link.from_node} → {matched_link.to_node}) throughput constricted to {r2(f * 100)}% ({eff} of {matched_link.capacity} MLD)."
                    )

        if conditions.demand_factor != 1.0:
            base_tot = sum(z.demand for z in top.zones)
            surge_tot = sum(conditions.zone_demand(z.id) for z in top.zones)
            reasoning.append(
                f"Demand surge multiplier: {conditions.demand_factor}x. "
                f"Total municipal demand for {top.name} increased from {r2(base_tot)} to {r2(surge_tot)} MLD."
            )

        impacts: List[Dict[str, Any]] = []
        for z in top.zones:
            l_ids, a_ids = path_to(z.id, conditions.city_id)
            rem = remaining_caps(conditions, {})
            path_elements = l_ids + a_ids
            limiting = path_elements[0] if path_elements else "—"
            if path_elements:
                limiting = min(path_elements, key=lambda elem: rem.get(elem, 0.0))

            dem = conditions.zone_demand(z.id)
            base_sup = base.get(z.id, 0.0)
            inc_sup = inc.get(z.id, 0.0)
            shortage = r2(max(0.0, dem - inc_sup))
            loss = r2(max(0.0, base_sup - inc_sup))
            bottleneck = limiting if inc_sup < (dem - EPS) else "—"

            impacts.append({
                "zoneId": z.id,
                "demand": dem,
                "baseline": base_sup,
                "incident": inc_sup,
                "shortage": shortage,
                "loss": loss,
                "bottleneck": bottleneck,
            })

        graph_affected = get_affected_downstream_zones(
            failed_assets,
            conditions.city_id,
            failed_link_ids=failed_links,
        )
        affected = [
            i["zoneId"] for i in impacts
            if i["loss"] > EPS or (i["shortage"] > EPS and conditions.demand_factor != 1.0) or i["zoneId"] in graph_affected
        ]

        for i in impacts:
            if i["zoneId"] in affected:
                l_ids, _ = path_to(i["zoneId"], conditions.city_id)
                path_str = " → ".join(l_ids) if l_ids else "Direct"
                reasoning.append(
                    f"{zone_label(i['zoneId'], conditions.city_id)} [Path: {path_str}]: supply reduced from {i['baseline']} to {i['incident']} MLD "
                    f"against demand {i['demand']} MLD (shortfall {i['shortage']} MLD). Limiting bottleneck: {i['bottleneck']}."
                )

        unaffected = [i["zoneId"] for i in impacts if i["zoneId"] not in affected]
        if unaffected:
            reasoning.append(
                f"Stable zones with zero shortfall: {', '.join(zone_label(zid, conditions.city_id) for zid in unaffected)}."
            )

        total_demand = r2(sum(i["demand"] for i in impacts))
        total_supply = r2(sum(i["incident"] for i in impacts))
        total_shortage = r2(sum(i["shortage"] for i in impacts))

        return {
            "impacts": impacts,
            "affected": affected,
            "totalDemand": total_demand,
            "totalSupply": total_supply,
            "totalShortage": total_shortage,
            "reasoning": reasoning,
            "failed_assets": failed_assets,
            "failed_links": failed_links,
            "explanation": f"Incident causes immediate shortage of {total_shortage} MLD affecting {len(affected)} zone(s) in {top.name}.",
        }
