from dataclasses import dataclass, field
from typing import Any, Optional

import pandas as pd

from src.data_loader import load_carriers, load_vessels
from src.temporal_model import TemporalModel
from src.world_model import MaritimeWorldModel

SEVERITY_MULTIPLIERS = {"full": 1.0, "partial": 0.6, "temporary": 0.3}
DAILY_VESSEL_COST_USD = 60000
DAILY_RISK_BASE_USD = 500000
AVERAGE_SPEED_KNOTS = 14


@dataclass
class SimulationResult:
    scenario: dict
    rerouting: dict
    carriers: list
    port_congestion: list
    cascade: dict

    def __getitem__(self, key: str):
        return getattr(self, key)

    def to_dict(self) -> dict:
        return {
            "scenario": self.scenario,
            "rerouting": self.rerouting,
            "carriers": self.carriers,
            "port_congestion": self.port_congestion,
            "cascade": self.cascade,
        }


class DisruptionSimulator:
    def __init__(self, world_model: MaritimeWorldModel, temporal_model: TemporalModel):
        self._world_model = world_model
        self._temporal_model = temporal_model
        self._routes = world_model.get_routes()
        self._carriers_df = load_carriers()
        self._vessels = world_model._vessels
        self._graph = world_model.get_port_graph()
        self._route_data = {route["id"]: route for _, route in self._routes.iterrows()}
        self._carrier_data = {c["id"]: c for _, c in self._carriers_df.iterrows()}

    def run_scenario(self, chokepoint_ids: list, severity: str) -> SimulationResult:
        if severity not in SEVERITY_MULTIPLIERS:
            raise ValueError(f"Unknown severity: {severity}. Must be one of {list(SEVERITY_MULTIPLIERS.keys())}")

        blocked_set = set(chokepoint_ids)
        affected_routes = self._find_affected_routes(chokepoint_ids)
        affected_route_ids = {r["id"] for r in affected_routes}
        affected_vessels = self._count_affected_vessels(affected_route_ids, severity)

        rerouting = self._compute_rerouting(affected_routes, blocked_set, severity)
        carriers = self._score_carriers(affected_route_ids, chokepoint_ids, severity)
        port_congestion = self._forecast_port_congestion(affected_routes, chokepoint_ids, severity)
        cascade = self._compute_cascade(affected_routes, severity)

        return SimulationResult(
            scenario={
                "chokepoints": chokepoint_ids,
                "severity": severity,
                "affected_vessels": affected_vessels,
            },
            rerouting=rerouting,
            carriers=carriers,
            port_congestion=port_congestion,
            cascade=cascade,
        )

    def _find_affected_routes(self, chokepoint_ids: list) -> list[dict]:
        if not chokepoint_ids:
            return []
        blocked_set = set(chokepoint_ids)
        results = []
        for _, route in self._routes.iterrows():
            transit_set = set(route["chokepoints_transited"])
            if transit_set & blocked_set:
                results.append(route.to_dict())
        return results

    def _count_affected_vessels(self, affected_route_ids: set, severity: str) -> int:
        if not affected_route_ids:
            return 0
        multiplier = SEVERITY_MULTIPLIERS[severity]
        carrier_ids_with_affected_routes = set()
        for carrier_id, carrier in self._carrier_data.items():
            for route_id in carrier["typical_routes"]:
                if route_id in affected_route_ids:
                    carrier_ids_with_affected_routes.add(carrier_id)
                    break
        vessels_df = self._vessels[self._vessels["carrier_id"].isin(carrier_ids_with_affected_routes)]
        return int(len(vessels_df) * multiplier)

    def _compute_rerouting(self, affected_routes: list, blocked_set: set, severity: str) -> dict:
        multiplier = SEVERITY_MULTIPLIERS[severity]
        alternatives = []
        seen_pairs = set()
        for route in affected_routes:
            origin = route["origin_port_id"]
            dest = route["destination_port_id"]
            pair_key = (origin, dest)
            if pair_key in seen_pairs:
                continue
            seen_pairs.add(pair_key)
            alt_route = self._find_alternative_route(origin, dest, blocked_set)
            if alt_route is None:
                continue
            additional_days = alt_route["transit_days"] - route["transit_days"]
            additional_cost = additional_days * DAILY_VESSEL_COST_USD
            vessels_affected = self._count_vessels_on_route(route["id"]) * multiplier
            alternatives.append({
                "route_id": alt_route["id"],
                "original_route_id": route["id"],
                "additional_days": additional_days,
                "additional_cost_usd": additional_cost,
                "vessels_affected": vessels_affected,
            })
        return {"alternatives": alternatives}

    def _find_alternative_route(self, origin: str, dest: str, blocked_set: set) -> Optional[dict]:
        for _, candidate in self._routes.iterrows():
            if candidate["origin_port_id"] == origin and candidate["destination_port_id"] == dest:
                if not set(candidate["chokepoints_transited"]) & blocked_set:
                    return candidate.to_dict()
        return None

    def _count_vessels_on_route(self, route_id: str) -> int:
        route = self._route_data.get(route_id)
        if route is None:
            return 0
        exposed_carriers = [
            cid for cid, c in self._carrier_data.items()
            if route_id in c["typical_routes"]
        ]
        return len(self._vessels[self._vessels["carrier_id"].isin(exposed_carriers)])

    def _score_carriers(self, affected_route_ids: set, chokepoint_ids: list, severity: str) -> list:
        if not affected_route_ids:
            return []
        multiplier = SEVERITY_MULTIPLIERS[severity]
        blocked_set = set(chokepoint_ids)
        results = []
        for carrier_id, carrier in self._carrier_data.items():
            routes_exposed = sum(1 for rid in carrier["typical_routes"] if rid in affected_route_ids)
            if routes_exposed == 0:
                continue
            exposure_values = [
                carrier["chokepoint_exposure"].get(cp, 0.0)
                for cp in chokepoint_ids
            ]
            exposure_score = sum(exposure_values) / len(exposure_values) if exposure_values else 0.0
            daily_risk = routes_exposed * exposure_score * multiplier * DAILY_RISK_BASE_USD
            results.append({
                "name": carrier["name"],
                "carrier_id": carrier_id,
                "exposure_score": round(exposure_score, 4),
                "routes_exposed": routes_exposed,
                "estimated_daily_risk_usd": int(daily_risk),
            })
        results.sort(key=lambda x: x["exposure_score"], reverse=True)
        return results

    def _forecast_port_congestion(self, affected_routes: list, chokepoint_ids: list, severity: str) -> list:
        multiplier = SEVERITY_MULTIPLIERS[severity]
        port_vessel_counts = {}
        for route in affected_routes:
            for port_id in [route["origin_port_id"], route["destination_port_id"]]:
                port_vessel_counts[port_id] = port_vessel_counts.get(port_id, 0) + 1
        results = []
        for port_id, vessel_count in port_vessel_counts.items():
            try:
                baseline = self._temporal_model.get_baseline(port_id)["congestion_baseline"]
            except KeyError:
                baseline = 0.5
            delta = min(0.95 - baseline, (vessel_count / 20.0) * multiplier)
            forecast = min(0.95, baseline + delta)
            dwell_increase = (forecast - baseline) * 72
            results.append({
                "port_id": port_id,
                "baseline_congestion": round(baseline, 4),
                "forecast_congestion": round(forecast, 4),
                "dwell_increase_hours": round(dwell_increase, 2),
            })
        return results

    def _compute_cascade(self, affected_routes: list, severity: str) -> dict:
        impacted_ports = {}
        for route in affected_routes:
            impacted_ports[route["origin_port_id"]] = 0
            impacted_ports[route["destination_port_id"]] = 0
        frontier = set(impacted_ports.keys())
        visited = set(impacted_ports.keys())
        while frontier:
            next_frontier = set()
            for port_id in frontier:
                for neighbor in self._world_model.get_connectivity(port_id):
                    if neighbor in visited:
                        continue
                    try:
                        edge_data = self._graph.edges[port_id, neighbor]
                        distance_nm = edge_data.get("weight", 1000)
                        transit_hours = distance_nm / AVERAGE_SPEED_KNOTS
                    except Exception:
                        transit_hours = 100
                    new_impact = impacted_ports[port_id] + transit_hours
                    if new_impact <= 720:
                        impacted_ports[neighbor] = new_impact
                        visited.add(neighbor)
                        next_frontier.add(neighbor)
            frontier = next_frontier
        timeline = sorted(
            [{"port": pid, "hours_to_impact": int(hours)} for pid, hours in impacted_ports.items()],
            key=lambda x: x["hours_to_impact"],
        )
        return {"impact_timeline": timeline}
