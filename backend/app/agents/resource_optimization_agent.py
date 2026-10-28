import math
from typing import Any, Dict, List
from app.agents.base import BaseAgent
from app.network.topology import (
    PRIORITY_RANK,
    TANKER_FLEET,
    TANKER_MLD,
    ZONES,
)
from app.network.graph_analysis import (
    Conditions,
    allocate_priority,
    allocate_proportional,
    r2,
    floor2,
    EPS,
)


def tankers_priority(conditions: Conditions, pipe: Dict[str, float], fleet: int) -> Dict[str, int]:
    top = conditions.topology
    t: Dict[str, int] = {}
    left = fleet
    sorted_zones = sorted(
        top.zones,
        key=lambda z: (PRIORITY_RANK[z.priority], z.demand, z.id),
        reverse=True,
    )
    for z in sorted_zones:
        shortfall = max(0.0, conditions.zone_demand(z.id) - pipe.get(z.id, 0.0))
        n = min(left, math.floor(shortfall / TANKER_MLD + EPS))
        t[z.id] = max(0, int(n))
        left -= t[z.id]
    for z in top.zones:
        if z.id not in t:
            t[z.id] = 0
    return t


def tankers_proportional(conditions: Conditions, pipe: Dict[str, float], fleet: int) -> Dict[str, int]:
    top = conditions.topology
    short_list = []
    for z in top.zones:
        s = max(0.0, conditions.zone_demand(z.id) - pipe.get(z.id, 0.0))
        short_list.append({"zone": z, "shortfall": s})

    def max_n(s: float) -> int:
        return int(math.floor(s / TANKER_MLD + EPS))

    total_cap = sum(max_n(item["shortfall"]) for item in short_list)
    n = min(fleet, total_cap)
    total_s = sum(item["shortfall"] for item in short_list) or 1.0

    t: Dict[str, int] = {}
    remainders = []
    used = 0
    for item in short_list:
        zid = item["zone"].id
        exact = (item["shortfall"] / total_s) * n
        base_int = min(max_n(item["shortfall"]), math.floor(exact))
        t[zid] = base_int
        used += base_int
        remainders.append({"id": zid, "r": exact - math.floor(exact), "max": max_n(item["shortfall"])})

    remainders.sort(key=lambda x: (x["r"], -ord(x["id"][-1])), reverse=True)
    i = 0
    while used < n and i < len(remainders) * 4:
        cand = remainders[i % len(remainders)]
        if t[cand["id"]] < cand["max"]:
            t[cand["id"]] += 1
            used += 1
        i += 1

    return t


class ResourceOptimizationAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="Resource Optimization Agent",
            role="Evaluates multi-source network capacities and synthesizes candidate resource allocation plans",
            step_order=2,
        )

    def _summarize_input(self, analysis_result: Dict[str, Any], conditions: Conditions, fleet: int) -> str:
        city_name = conditions.topology.name
        return (
            f"[{city_name}] Analysed shortage: {analysis_result.get('totalShortage', 0)} MLD. "
            f"Available tanker fleet: {fleet} vehicles ({r2(fleet * TANKER_MLD)} MLD capacity)"
        )

    def _process(self, analysis_result: Dict[str, Any], conditions: Conditions, fleet: int = None) -> Dict[str, Any]:
        top = conditions.topology
        active_fleet = fleet if fleet is not None else top.tanker_fleet

        pipe_a = allocate_priority(conditions)
        tankers_a = tankers_priority(conditions, pipe_a, active_fleet)

        pipe_b = allocate_proportional(conditions)
        tankers_b = tankers_proportional(conditions, pipe_b, active_fleet)

        pipe_c = {z.id: conditions.zone_demand(z.id) for z in top.zones}
        tankers_c = {z.id: 0 for z in top.zones}

        high_priority_zone = next((z.name for z in top.zones if z.priority == "high"), "High Priority")

        raw_candidates = [
            {
                "id": "A",
                "plan_key": "A",
                "name": "Plan A — Priority reroute + targeted tankers",
                "objective": "Safeguard critical civic infrastructure and high-priority zones first, targeting emergency tankers to residual critical deficits.",
                "strategy": "Route all feasible pipe supply to high-priority zones first, then dispatch available tankers to the highest-priority shortfalls.",
                "plain_english": "Directs remaining pipe water to critical zones like hospitals and dense residential centers first. Emergency road tankers are then deployed directly to high-priority shortfalls.",
                "why_useful": "Essential during severe emergencies where life-safety and vital public infrastructure cannot be allowed to fail.",
                "benefits": [
                    f"Guarantees maximum possible pipeline delivery to {high_priority_zone}.",
                    "Directs municipal emergency tanker fleet strictly to high-priority vulnerabilities.",
                    "Minimizes life-safety and essential medical service disruptions.",
                ],
                "pipe": pipe_a,
                "tankers": tankers_a,
                "tradeOffs": [
                    f"Guarantees maximum possible supply to {high_priority_zone}.",
                    "Concentrates relief; lower-priority zones carry remaining shortfall.",
                    f"Dispatches {sum(tankers_a.values())} of {active_fleet} emergency tankers.",
                ],
            },
            {
                "id": "B",
                "plan_key": "B",
                "name": "Plan B — Fair-share rationing + vulnerability tankers",
                "objective": "Distribute available pipeline water equitably across all zones as a uniform percentage of demand, deploying tankers to balance remaining deficits.",
                "strategy": "Share pipe supply as an equal fraction of demand across all zones, then split tankers in proportion to each zone's deficit.",
                "plain_english": "Scales down water delivery proportionally across all zones so everyone shares the burden equally. Emergency tankers are distributed in proportion to each zone's deficit.",
                "why_useful": "Best when municipal fairness and public equity are paramount, ensuring no single community is completely cut off from water.",
                "benefits": [
                    f"No single zone in {top.name} suffers a complete water shutoff.",
                    "Evenly shares municipal hardship across all civic communities.",
                    "Distributes road tanker relief broadly across city sectors.",
                ],
                "pipe": pipe_b,
                "tankers": tankers_b,
                "tradeOffs": [
                    f"Distributes supply equitably across all civic zones in {top.name}.",
                    "Spreads hardship evenly; multiple zones carry partial deficits.",
                    f"Dispatches {sum(tankers_b.values())} of {active_fleet} emergency tankers.",
                ],
            },
            {
                "id": "C",
                "plan_key": "C",
                "name": "Plan C — Full-demand pipe restoration",
                "objective": "Attempt to fulfill 100% of municipal demand through the physical pipe network without emergency tankers (counter-factual test).",
                "strategy": "Push every zone's full demand through the existing pipeline network without emergency tankers (counter-factual test).",
                "plain_english": "Assumes normal pipe delivery can meet full demand without any rationing or tankers. Deliberately ignores damaged pumps, broken pipes, or derated treatment plants.",
                "why_useful": "Serves as an operational negative-control benchmark to verify that the Validation & Safety Agent strictly blocks hazardous and infeasible actions.",
                "benefits": [
                    "Hypothetically meets 100% of municipal demand across all zones.",
                    "Zero emergency tanker logistics or fuel expenditure.",
                ],
                "pipe": pipe_c,
                "tankers": tankers_c,
                "tradeOffs": [
                    "Hypothetically meets 100% of municipal demand.",
                    "Ignores offline pumping assets and hydraulic physical limits.",
                    "Provides a baseline counter-factual to test safety validation.",
                ],
            },
        ]

        candidate_plans = []
        for cand in raw_candidates:
            alloc = {
                z.id: {
                    "pipe": cand["pipe"].get(z.id, 0.0),
                    "tanker": r2(cand["tankers"].get(z.id, 0) * TANKER_MLD),
                }
                for z in top.zones
            }
            unmet_by_zone = {
                z.id: r2(max(0.0, conditions.zone_demand(z.id) - alloc[z.id]["pipe"] - alloc[z.id]["tanker"]))
                for z in top.zones
            }
            total_supplied = r2(sum(alloc[z.id]["pipe"] + alloc[z.id]["tanker"] for z in top.zones))
            total_unmet = r2(sum(unmet_by_zone.values()))
            tankers_used = sum(cand["tankers"].values())

            benefiting_zones = []
            for z in top.zones:
                p_sup = alloc[z.id]["pipe"]
                t_sup = alloc[z.id]["tanker"]
                tot = r2(p_sup + t_sup)
                dem = conditions.zone_demand(z.id)
                pct = r2((tot / dem) * 100) if dem > 0 else 100.0
                unm = unmet_by_zone[z.id]
                benefiting_zones.append({
                    "zone_id": z.id,
                    "zone_name": z.name,
                    "priority": z.priority,
                    "allocated_mld": tot,
                    "pipe_mld": p_sup,
                    "tanker_mld": t_sup,
                    "demand_mld": dem,
                    "unmet_mld": unm,
                    "coverage_pct": pct,
                    "status_note": (
                        "Fully satisfied (100%)" if unm <= EPS
                        else f"Partially supplied ({pct}%)" if tot > 0
                        else "Completely starved (0%)"
                    ),
                })

            pipe_used = r2(sum(alloc[z.id]["pipe"] for z in top.zones))
            tanker_vol_used = r2(tankers_used * TANKER_MLD)
            fleet_pct = r2((tankers_used / active_fleet) * 100) if active_fleet > 0 else 0.0

            resource_consumption = {
                "pipe_mld": pipe_used,
                "tankers_count": tankers_used,
                "tankers_mld": tanker_vol_used,
                "fleet_capacity": active_fleet,
                "fleet_usage_pct": fleet_pct,
            }

            candidate_plans.append({
                "id": cand["id"],
                "plan_key": cand["plan_key"],
                "name": cand["name"],
                "objective": cand["objective"],
                "strategy": cand["strategy"],
                "plain_english": cand["plain_english"],
                "why_useful": cand["why_useful"],
                "benefits": cand["benefits"],
                "tradeOffs": cand["tradeOffs"],
                "benefiting_zones": benefiting_zones,
                "resource_consumption": resource_consumption,
                "alloc": alloc,
                "tankers": cand["tankers"],
                "tankersUsed": tankers_used,
                "totalSupplied": total_supplied,
                "unmet": total_unmet,
                "unmetByZone": unmet_by_zone,
                "violations": [],
                "feasible": True,
                "recommended": False,
                "decision": "pending",
            })

        return {
            "candidate_plans": candidate_plans,
            "generated_count": len(candidate_plans),
            "fleet_limit": active_fleet,
        }
