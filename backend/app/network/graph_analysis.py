import math
from typing import Dict, List, Tuple
import networkx as nx

from app.network.topology import (
    ASSETS,
    LINKS,
    PRIORITY_RANK,
    TANKER_FLEET,
    TANKER_MLD,
    ZONES,
    get_city_topology,
    zone_label,
)

EPS = 1e-6

def r2(n: float) -> float:
    return round(n, 2)

def floor2(n: float) -> float:
    return math.floor(n * 100 + EPS) / 100.0


class Conditions:
    def __init__(
        self,
        asset_factor: Dict[str, float] = None,
        demand_factor: float = 1.0,
        city_id: str = "greater_noida",
        link_factor: Dict[str, float] = None,
    ):
        self.asset_factor = asset_factor or {}
        self.link_factor = link_factor or {}
        self.demand_factor = demand_factor
        self.city_id = (city_id or "greater_noida").lower()
        self.topology = get_city_topology(self.city_id)

    def asset_cap(self, asset_id: str) -> float:
        for a in self.topology.assets:
            if a.id == asset_id:
                factor = self.asset_factor.get(asset_id, 1.0)
                return a.capacity * factor
        return 0.0

    def link_cap(self, link_id: str) -> float:
        for l in self.topology.links:
            if l.id == link_id:
                factor = self.link_factor.get(link_id, 1.0)
                return l.capacity * factor
        return 0.0

    def zone_demand(self, zone_id: str) -> float:
        for z in self.topology.zones:
            if z.id == zone_id:
                return r2(z.demand * self.demand_factor)
        return 0.0


NORMAL_CONDITIONS = Conditions(city_id="greater_noida")


def build_network_graph(conditions: Conditions = None, city_id: str = "greater_noida") -> nx.DiGraph:
    c = conditions if conditions else Conditions(city_id=city_id)
    top = c.topology
    G = nx.DiGraph()
    for a in top.assets:
        cap = c.asset_cap(a.id)
        G.add_node(a.id, kind=a.kind, capacity=a.capacity, effective=cap)
    for z in top.zones:
        dem = c.zone_demand(z.id)
        G.add_node(z.id, kind="zone", demand=dem, priority=z.priority, population=z.population)
    for l in top.links:
        cap = c.link_cap(l.id)
        G.add_edge(l.from_node, l.to_node, id=l.id, capacity=l.capacity, effective=cap)
    return G


def path_to(zone_id: str, city_id: str = "greater_noida") -> Tuple[List[str], List[str]]:
    top = get_city_topology(city_id)
    links: List[str] = []
    assets: List[str] = []
    curr = zone_id
    while True:
        matched = None
        for l in top.links:
            if l.to_node == curr:
                matched = l
                break
        if not matched:
            break
        links.insert(0, matched.id)
        assets.insert(0, matched.from_node)
        curr = matched.from_node
    return links, assets


def calculate_flows(pipe: Dict[str, float], city_id: str = "greater_noida") -> Tuple[Dict[str, float], Dict[str, float]]:
    top = get_city_topology(city_id)
    link_flow: Dict[str, float] = {l.id: 0.0 for l in top.links}
    asset_flow: Dict[str, float] = {a.id: 0.0 for a in top.assets}
    for z in top.zones:
        q = pipe.get(z.id, 0.0)
        l_ids, a_ids = path_to(z.id, city_id)
        for lid in l_ids:
            if lid in link_flow:
                link_flow[lid] += q
        for aid in a_ids:
            if aid in asset_flow:
                asset_flow[aid] += q
    return link_flow, asset_flow


def remaining_caps(conditions: Conditions, pipe: Dict[str, float]) -> Dict[str, float]:
    link_f, asset_f = calculate_flows(pipe, conditions.city_id)
    rem: Dict[str, float] = {}
    for l in conditions.topology.links:
        rem[l.id] = conditions.link_cap(l.id) - link_f.get(l.id, 0.0)
    for a in conditions.topology.assets:
        rem[a.id] = conditions.asset_cap(a.id) - asset_f.get(a.id, 0.0)
    return rem


def allocate_priority(conditions: Conditions, start: Dict[str, float] = None) -> Dict[str, float]:
    top = conditions.topology
    pipe = {z.id: (start.get(z.id, 0.0) if start else 0.0) for z in top.zones}
    sorted_zones = sorted(
        top.zones,
        key=lambda z: (PRIORITY_RANK[z.priority], z.demand, z.id),
        reverse=True,
    )
    for z in sorted_zones:
        rem = remaining_caps(conditions, pipe)
        l_ids, a_ids = path_to(z.id, conditions.city_id)
        head = min(rem[elem] for elem in (l_ids + a_ids)) if (l_ids + a_ids) else 0.0
        target = conditions.zone_demand(z.id)
        add = floor2(max(0.0, min(target - pipe[z.id], head)))
        pipe[z.id] = r2(pipe[z.id] + add)
    return pipe


def is_pipe_feasible(conditions: Conditions, pipe: Dict[str, float]) -> bool:
    rem = remaining_caps(conditions, pipe)
    return all(v >= -EPS for v in rem.values())


def allocate_proportional(conditions: Conditions) -> Dict[str, float]:
    top = conditions.topology
    lo = 0.0
    hi = 1.0

    def at_fraction(f: float) -> Dict[str, float]:
        return {z.id: floor2(conditions.zone_demand(z.id) * f) for z in top.zones}

    for _ in range(40):
        mid = (lo + hi) / 2.0
        if is_pipe_feasible(conditions, at_fraction(mid)):
            lo = mid
        else:
            hi = mid

    return allocate_priority(conditions, at_fraction(lo))


def baseline_pipe(city_id: str = "greater_noida") -> Dict[str, float]:
    return allocate_priority(Conditions(city_id=city_id))


def get_affected_downstream_zones(
    failed_asset_ids: List[str],
    city_id: str = "greater_noida",
    failed_link_ids: List[str] = None,
) -> List[str]:
    G = build_network_graph(city_id=city_id)
    top = get_city_topology(city_id)
    affected = set()
    for fa in failed_asset_ids:
        if fa in G:
            desc = nx.descendants(G, fa)
            for d in desc:
                if any(z.id == d for z in top.zones):
                    affected.add(d)
    if failed_link_ids:
        for fl in failed_link_ids:
            matched_link = next((l for l in top.links if l.id == fl), None)
            if matched_link:
                target = matched_link.to_node
                if any(z.id == target for z in top.zones):
                    affected.add(target)
                elif target in G:
                    for d in nx.descendants(G, target):
                        if any(z.id == d for z in top.zones):
                            affected.add(d)
    return sorted(list(affected))
