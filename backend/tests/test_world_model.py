import pytest
import networkx as nx
import geopandas as gpd
from src.world_model import MaritimeWorldModel


@pytest.fixture(scope="module")
def model():
    return MaritimeWorldModel()


class TestPortGraph:
    def test_returns_networkx_graph(self, model):
        graph = model.get_port_graph()
        assert isinstance(graph, nx.Graph)

    def test_graph_has_port_nodes(self, model):
        graph = model.get_port_graph()
        assert len(graph.nodes) >= 40

    def test_graph_has_route_edges(self, model):
        graph = model.get_port_graph()
        assert len(graph.edges) >= 15

    def test_edges_have_distance_weight(self, model):
        graph = model.get_port_graph()
        for u, v, data in graph.edges(data=True):
            assert "weight" in data, f"Edge {u}-{v} missing weight"
            assert data["weight"] > 0, f"Edge {u}-{v} has non-positive weight"

    def test_rotterdam_in_graph(self, model):
        graph = model.get_port_graph()
        assert "rotterdam" in graph.nodes


class TestConnectivity:
    def test_rotterdam_has_neighbors(self, model):
        neighbors = model.get_connectivity("rotterdam")
        assert len(neighbors) > 0
        assert isinstance(neighbors, list)
        for n in neighbors:
            assert isinstance(n, str)

    def test_unknown_port_returns_empty(self, model):
        neighbors = model.get_connectivity("nonexistent_port")
        assert neighbors == []

    def test_directly_connected_ports_have_edge(self, model):
        graph = model.get_port_graph()
        neighbors = model.get_connectivity("rotterdam")
        for n in neighbors:
            assert graph.has_edge("rotterdam", n), f"rotterdam-{n} not in graph"


class TestChokepointsInRegion:
    def test_middle_east_region_returns_hormuz(self, model):
        result = model.get_chokepoints_in_region(min_lat=20, max_lat=30, min_lon=50, max_lon=60)
        ids = set(result["id"])
        assert "strait_of_hormuz" in ids

    def test_empty_region_returns_empty(self, model):
        result = model.get_chokepoints_in_region(min_lat=0, max_lat=1, min_lon=0, max_lon=1)
        assert len(result) == 0

    def test_returns_geodataframe(self, model):
        result = model.get_chokepoints_in_region(min_lat=-90, max_lat=90, min_lon=-180, max_lon=180)
        assert isinstance(result, gpd.GeoDataFrame)


class TestShortestPath:
    def test_rotterdam_to_shanghai_has_path(self, model):
        path = model.get_shortest_path("rotterdam", "shanghai")
        assert len(path) >= 2
        assert path[0] == "rotterdam"
        assert path[-1] == "shanghai"

    def test_path_distance_positive(self, model):
        dist = model.get_path_distance("rotterdam", "shanghai")
        assert dist > 0

    def test_same_port_returns_single(self, model):
        path = model.get_shortest_path("rotterdam", "rotterdam")
        assert path == ["rotterdam"]


class TestGeoJSON:
    def test_ports_geojson(self, model):
        geojson = model.to_geojson("ports")
        assert geojson["type"] == "FeatureCollection"
        assert len(geojson["features"]) >= 40

    def test_chokepoints_geojson(self, model):
        geojson = model.to_geojson("chokepoints")
        assert geojson["type"] == "FeatureCollection"
        assert len(geojson["features"]) >= 5

    def test_unknown_entity_raises(self, model):
        with pytest.raises(ValueError, match="Unknown entity type"):
            model.to_geojson("unknown")

    def test_ports_geojson_has_point_geometry(self, model):
        geojson = model.to_geojson("ports")
        for feature in geojson["features"]:
            assert feature["geometry"]["type"] == "Point"
