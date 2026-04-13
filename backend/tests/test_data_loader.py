import json
import pytest
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"


def test_ports_json_exists():
    assert (DATA_DIR / "ports.json").exists(), "ports.json not found in backend/data/"


def test_ports_json_is_valid_json():
    with open(DATA_DIR / "ports.json") as f:
        data = json.load(f)
    assert isinstance(data, list), "ports.json must be a JSON array"
    assert len(data) >= 40, f"Expected at least 40 ports, got {len(data)}"


def test_ports_json_has_required_fields():
    with open(DATA_DIR / "ports.json") as f:
        data = json.load(f)
    required = {"id", "name", "country", "latitude", "longitude", "type", "annual_teu", "max_draft_meters", "typical_dwell_hours"}
    for i, port in enumerate(data):
        missing = required - set(port.keys())
        assert not missing, f"Port at index {i} ({port.get('id', 'UNKNOWN')}) missing fields: {missing}"


def test_ports_json_ids_are_unique():
    with open(DATA_DIR / "ports.json") as f:
        data = json.load(f)
    ids = [p["id"] for p in data]
    assert len(ids) == len(set(ids)), f"Duplicate port IDs found"


def test_ports_json_coordinates_are_valid():
    with open(DATA_DIR / "ports.json") as f:
        data = json.load(f)
    for port in data:
        assert -90 <= port["latitude"] <= 90, f"{port['id']}: latitude {port['latitude']} out of range"
        assert -180 <= port["longitude"] <= 180, f"{port['id']}: longitude {port['longitude']} out of range"


def test_chokepoints_geojson_exists():
    assert (DATA_DIR / "chokepoints.geojson").exists(), "chokepoints.geojson not found"


def test_chokepoints_geojson_is_valid_geojson():
    with open(DATA_DIR / "chokepoints.geojson") as f:
        data = json.load(f)
    assert data["type"] == "FeatureCollection"
    assert len(data["features"]) >= 5, f"Expected at least 5 chokepoints, got {len(data['features'])}"


def test_chokepoints_have_polygons():
    with open(DATA_DIR / "chokepoints.geojson") as f:
        data = json.load(f)
    for feature in data["features"]:
        assert feature["geometry"]["type"] == "Polygon", f"{feature['properties']['id']} is not a Polygon"
        coords = feature["geometry"]["coordinates"][0]
        assert len(coords) >= 4, f"{feature['properties']['id']} polygon has fewer than 4 coordinates"


def test_chokepoints_have_required_properties():
    with open(DATA_DIR / "chokepoints.geojson") as f:
        data = json.load(f)
    required = {"id", "name", "daily_vessels", "type", "strategic_importance"}
    for feature in data["features"]:
        props = feature["properties"]
        missing = required - set(props.keys())
        assert not missing, f"{props.get('id', 'UNKNOWN')} missing: {missing}"


def test_chokepoints_ids_are_unique():
    with open(DATA_DIR / "chokepoints.geojson") as f:
        data = json.load(f)
    ids = [f["properties"]["id"] for f in data["features"]]
    assert len(ids) == len(set(ids)), f"Duplicate chokepoint IDs"


def test_vessels_json_exists():
    assert (DATA_DIR / "vessels.json").exists(), "vessels.json not found"


def test_vessels_json_valid():
    with open(DATA_DIR / "vessels.json") as f:
        data = json.load(f)
    assert isinstance(data, list)
    assert len(data) >= 40
    required = {"mmsi", "name", "carrier_id", "type", "latitude", "longitude", "speed_knots", "heading"}
    for v in data:
        missing = required - set(v.keys())
        assert not missing, f"Vessel {v.get('mmsi', '?')} missing: {missing}"


def test_carriers_json_exists():
    assert (DATA_DIR / "carriers.json").exists(), "carriers.json not found"


def test_carriers_json_valid():
    with open(DATA_DIR / "carriers.json") as f:
        data = json.load(f)
    assert isinstance(data, list)
    assert len(data) >= 8
    required = {"id", "name", "country", "vessel_count", "typical_routes", "chokepoint_exposure"}
    for c in data:
        missing = required - set(c.keys())
        assert not missing, f"Carrier {c.get('id', '?')} missing: {missing}"


def test_routes_json_exists():
    assert (DATA_DIR / "routes.json").exists(), "routes.json not found"


def test_routes_json_valid():
    with open(DATA_DIR / "routes.json") as f:
        data = json.load(f)
    assert isinstance(data, list)
    assert len(data) >= 15
    required = {"id", "name", "origin_port_id", "destination_port_id", "distance_nm", "transit_days", "chokepoints_transited"}
    for r in data:
        missing = required - set(r.keys())
        assert not missing, f"Route {r.get('id', '?')} missing: {missing}"


def test_route_port_ids_reference_real_ports():
    with open(DATA_DIR / "ports.json") as f:
        port_ids = {p["id"] for p in json.load(f)}
    with open(DATA_DIR / "routes.json") as f:
        routes = json.load(f)
    for r in routes:
        assert r["origin_port_id"] in port_ids, f"Route {r['id']}: unknown origin {r['origin_port_id']}"
        assert r["destination_port_id"] in port_ids, f"Route {r['id']}: unknown destination {r['destination_port_id']}"


def test_route_chokepoint_ids_reference_real_chokepoints():
    with open(DATA_DIR / "chokepoints.geojson") as f:
        cp_ids = {feat["properties"]["id"] for feat in json.load(f)["features"]}
    with open(DATA_DIR / "routes.json") as f:
        routes = json.load(f)
    for r in routes:
        for cp in r["chokepoints_transited"]:
            assert cp in cp_ids, f"Route {r['id']}: unknown chokepoint {cp}"
