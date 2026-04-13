import json
import pytest
import pandas as pd
import geopandas as gpd
from pathlib import Path

from src.data_loader import load_ports, load_chokepoints, load_vessels, load_carriers, load_routes

DATA_DIR = Path(__file__).parent.parent / "data"


class TestLoadPorts:
    def test_returns_dataframe(self):
        result = load_ports()
        assert isinstance(result, pd.DataFrame)

    def test_has_correct_columns(self):
        result = load_ports()
        expected_cols = {"id", "name", "country", "latitude", "longitude", "type", "annual_teu", "max_draft_meters", "typical_dwell_hours"}
        assert expected_cols.issubset(set(result.columns))

    def test_has_minimum_rows(self):
        result = load_ports()
        assert len(result) >= 40

    def test_ids_are_unique(self):
        result = load_ports()
        assert result["id"].is_unique


class TestLoadChokepoints:
    def test_returns_geodataframe(self):
        result = load_chokepoints()
        assert isinstance(result, gpd.GeoDataFrame)

    def test_has_polygon_geometry(self):
        result = load_chokepoints()
        assert (result.geometry.type == "Polygon").all()

    def test_has_minimum_rows(self):
        result = load_chokepoints()
        assert len(result) >= 5

    def test_has_required_properties(self):
        result = load_chokepoints()
        required = {"id", "name", "daily_vessels", "type", "strategic_importance"}
        assert required.issubset(set(result.columns))


class TestLoadVessels:
    def test_returns_dataframe(self):
        result = load_vessels()
        assert isinstance(result, pd.DataFrame)

    def test_has_correct_columns(self):
        result = load_vessels()
        expected = {"mmsi", "name", "carrier_id", "type", "latitude", "longitude", "speed_knots", "heading"}
        assert expected.issubset(set(result.columns))

    def test_has_minimum_rows(self):
        result = load_vessels()
        assert len(result) >= 40


class TestLoadCarriers:
    def test_returns_dataframe(self):
        result = load_carriers()
        assert isinstance(result, pd.DataFrame)

    def test_has_correct_columns(self):
        result = load_carriers()
        expected = {"id", "name", "country", "vessel_count", "typical_routes", "chokepoint_exposure"}
        assert expected.issubset(set(result.columns))

    def test_has_minimum_rows(self):
        result = load_carriers()
        assert len(result) >= 8


class TestLoadRoutes:
    def test_returns_dataframe(self):
        result = load_routes()
        assert isinstance(result, pd.DataFrame)

    def test_has_correct_columns(self):
        result = load_routes()
        expected = {"id", "name", "origin_port_id", "destination_port_id", "distance_nm", "transit_days", "chokepoints_transited"}
        assert expected.issubset(set(result.columns))

    def test_has_minimum_rows(self):
        result = load_routes()
        assert len(result) >= 15

    def test_origin_and_destination_ports_exist(self):
        ports = load_ports()
        port_ids = set(ports["id"])
        routes = load_routes()
        for _, r in routes.iterrows():
            assert r["origin_port_id"] in port_ids, f"Route {r['id']}: unknown origin {r['origin_port_id']}"
            assert r["destination_port_id"] in port_ids, f"Route {r['id']}: unknown dest {r['destination_port_id']}"

    def test_chokepoints_referenced_exist(self):
        chokepoints = load_chokepoints()
        cp_ids = set(chokepoints["id"])
        routes = load_routes()
        for _, r in routes.iterrows():
            for cp in r["chokepoints_transited"]:
                assert cp in cp_ids, f"Route {r['id']}: unknown chokepoint {cp}"
