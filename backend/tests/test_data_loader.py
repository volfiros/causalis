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
