from src.world_model import MaritimeWorldModel
from src.temporal_model import TemporalModel


def test_full_pipeline():
    model = MaritimeWorldModel()
    temporal = TemporalModel(model)

    graph = model.get_port_graph()
    assert len(graph.nodes) >= 40
    assert len(graph.edges) >= 15

    rotterdam_neighbors = model.get_connectivity("rotterdam")
    assert len(rotterdam_neighbors) > 0

    path = model.get_shortest_path("rotterdam", "shanghai")
    assert len(path) >= 2
    assert path[0] == "rotterdam"
    assert path[-1] == "shanghai"

    distance = model.get_path_distance("rotterdam", "shanghai")
    assert distance > 0

    me_chokepoints = model.get_chokepoints_in_region(10, 30, 40, 60)
    assert "strait_of_hormuz" in set(me_chokepoints["id"])

    ports_geojson = model.to_geojson("ports")
    assert ports_geojson["type"] == "FeatureCollection"
    assert len(ports_geojson["features"]) >= 40

    baseline = temporal.get_baseline("rotterdam")
    assert baseline["typical_dwell_hours"] == 48
    assert 0 <= baseline["congestion_baseline"] <= 1

    delay = temporal.get_delay_distribution("asia_europe_suez")
    assert delay["transit_days"] == 28
    assert delay["on_time_pct"] == 0.85

    carrier = temporal.get_carrier_pattern("maersk")
    assert len(carrier["routes"]) > 0
    assert 0 <= carrier["avg_exposure"] <= 1


def test_vessels_loaded():
    model = MaritimeWorldModel()
    vessels = model._vessels
    assert len(vessels) >= 40
    assert "mmsi" in vessels.columns
    assert "carrier_id" in vessels.columns
