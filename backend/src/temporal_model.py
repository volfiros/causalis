import pandas as pd

from src.data_loader import load_carriers
from src.world_model import MaritimeWorldModel


class TemporalModel:
    def __init__(self, world_model: MaritimeWorldModel):
        self._ports = world_model.get_port_graph()
        self._routes = world_model.get_routes()
        self._carriers = load_carriers()
        self._port_data = {port["id"]: port for _, port in world_model._ports.iterrows()}
        self._route_data = {route["id"]: route for _, route in self._routes.iterrows()}
        self._carrier_data = {carrier["id"]: carrier for _, carrier in self._carriers.iterrows()}

    def get_baseline(self, port_id: str) -> dict:
        if port_id not in self._port_data:
            raise KeyError(f"Port not found: {port_id}")
        port = self._port_data[port_id]
        dwell = int(port["typical_dwell_hours"])
        return {
            "port_id": port_id,
            "typical_dwell_hours": dwell,
            "congestion_baseline": dwell / 72.0,
        }

    def get_delay_distribution(self, route_id: str) -> dict:
        if route_id not in self._route_data:
            raise KeyError(f"Route not found: {route_id}")
        route = self._route_data[route_id]
        transit = int(route["transit_days"])
        return {
            "route_id": route_id,
            "transit_days": transit,
            "delay_std_days": transit * 0.1,
            "on_time_pct": 0.85,
        }

    def get_carrier_pattern(self, carrier_id: str) -> dict:
        if carrier_id not in self._carrier_data:
            raise KeyError(f"Carrier not found: {carrier_id}")
        carrier = self._carrier_data[carrier_id]
        exposures = carrier["chokepoint_exposure"]
        avg_exposure = sum(exposures.values()) / len(exposures) if exposures else 0.0
        return {
            "carrier_id": carrier_id,
            "routes": list(carrier["typical_routes"]),
            "avg_exposure": round(avg_exposure, 4),
        }
