import json
from pathlib import Path

import geopandas as gpd
import networkx as nx
import pandas as pd
from shapely.geometry import Point, mapping

from src.data_loader import load_ports, load_chokepoints, load_routes, load_vessels


class MaritimeWorldModel:
    def __init__(self):
        self._ports = load_ports()
        self._chokepoints = load_chokepoints()
        self._routes = load_routes()
        self._vessels = load_vessels()
        self._graph = self._build_graph()

    def _build_graph(self) -> nx.Graph:
        graph = nx.Graph()
        for _, port in self._ports.iterrows():
            graph.add_node(port["id"], name=port["name"], latitude=port["latitude"], longitude=port["longitude"])
        for _, route in self._routes.iterrows():
            graph.add_edge(
                route["origin_port_id"],
                route["destination_port_id"],
                weight=route["distance_nm"],
                route_id=route["id"],
                route_name=route["name"],
                transit_days=route["transit_days"],
                chokepoints_transited=route["chokepoints_transited"],
            )
        return graph

    def get_port_graph(self) -> nx.Graph:
        return self._graph

    def get_chokepoints(self) -> gpd.GeoDataFrame:
        return self._chokepoints

    def get_routes(self) -> pd.DataFrame:
        return self._routes

    def get_connectivity(self, port_id: str) -> list:
        if port_id not in self._graph:
            return []
        return list(self._graph.neighbors(port_id))

    def get_chokepoints_in_region(self, min_lat: float, max_lat: float, min_lon: float, max_lon: float) -> gpd.GeoDataFrame:
        centroids = self._chokepoints.geometry.centroid
        mask = (
            (centroids.y >= min_lat) & (centroids.y <= max_lat) &
            (centroids.x >= min_lon) & (centroids.x <= max_lon)
        )
        return self._chokepoints[mask].copy()

    def get_shortest_path(self, origin_id: str, destination_id: str) -> list:
        if origin_id == destination_id:
            return [origin_id]
        try:
            return nx.shortest_path(self._graph, origin_id, destination_id, weight="weight")
        except nx.NetworkXNoPath:
            return []

    def get_path_distance(self, origin_id: str, destination_id: str) -> float:
        path = self.get_shortest_path(origin_id, destination_id)
        if len(path) < 2:
            return 0.0
        total = 0.0
        for i in range(len(path) - 1):
            edge_data = self._graph.edges[path[i], path[i + 1]]
            total += edge_data["weight"]
        return total

    def to_geojson(self, entity_type: str) -> dict:
        if entity_type == "ports":
            features = []
            for _, port in self._ports.iterrows():
                feature = {
                    "type": "Feature",
                    "properties": {
                        "id": port["id"],
                        "name": port["name"],
                        "country": port["country"],
                        "type": port["type"],
                        "annual_teu": int(port["annual_teu"]),
                        "max_draft_meters": float(port["max_draft_meters"]),
                        "typical_dwell_hours": int(port["typical_dwell_hours"]),
                    },
                    "geometry": mapping(Point(port["longitude"], port["latitude"])),
                }
                features.append(feature)
            return {"type": "FeatureCollection", "features": features}
        elif entity_type == "chokepoints":
            return json.loads(self._chokepoints.to_json())
        else:
            raise ValueError(f"Unknown entity type: {entity_type}")
