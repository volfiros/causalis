import pytest
from src.world_model import MaritimeWorldModel
from src.temporal_model import TemporalModel
from src.simulator import DisruptionSimulator, SimulationResult


@pytest.fixture(scope="module")
def simulator():
    world = MaritimeWorldModel()
    temporal = TemporalModel(world)
    return DisruptionSimulator(world, temporal)


class TestFindAffectedRoutes:
    def test_suez_affects_asia_europe(self, simulator):
        routes = simulator._find_affected_routes(["suez_canal"])
        route_ids = {r["id"] for r in routes}
        assert "asia_europe_suez" in route_ids

    def test_hormuz_affects_gulf_routes(self, simulator):
        routes = simulator._find_affected_routes(["strait_of_hormuz"])
        route_ids = {r["id"] for r in routes}
        assert "me_india" in route_ids
        assert "intra_gulf" in route_ids
        assert "asia_me_hormuz" in route_ids

    def test_no_chokepoints_returns_empty(self, simulator):
        routes = simulator._find_affected_routes([])
        assert routes == []

    def test_malacca_affects_intra_asia(self, simulator):
        routes = simulator._find_affected_routes(["strait_of_malacca"])
        route_ids = {r["id"] for r in routes}
        assert "intra_asia" in route_ids
        assert "asia_europe_suez" in route_ids

    def test_multiple_chokepoints_combines_routes(self, simulator):
        routes = simulator._find_affected_routes(["suez_canal", "strait_of_hormuz"])
        route_ids = {r["id"] for r in routes}
        assert "asia_europe_suez" in route_ids
        assert "me_india" in route_ids


class TestCountAffectedVessels:
    def test_suez_affects_vessels(self, simulator):
        count = simulator._count_affected_vessels({"asia_europe_suez", "europe_me"}, "full")
        assert count > 0

    def test_severity_modifies_count(self, simulator):
        full = simulator._count_affected_vessels({"asia_europe_suez"}, "full")
        partial = simulator._count_affected_vessels({"asia_europe_suez"}, "partial")
        temporary = simulator._count_affected_vessels({"asia_europe_suez"}, "temporary")
        assert full >= partial >= temporary
        assert full > temporary

    def test_empty_routes_returns_zero(self, simulator):
        count = simulator._count_affected_vessels(set(), "full")
        assert count == 0


class TestComputeRerouting:
    def test_suez_blocked_finds_cape_route(self, simulator):
        affected = simulator._find_affected_routes(["suez_canal"])
        rerouting = simulator._compute_rerouting(affected, {"suez_canal"}, "full")
        alt_ids = {a["route_id"] for a in rerouting["alternatives"]}
        assert "asia_europe_cape" in alt_ids

    def test_rerouting_additional_days_positive(self, simulator):
        affected = simulator._find_affected_routes(["suez_canal"])
        rerouting = simulator._compute_rerouting(affected, {"suez_canal"}, "full")
        for alt in rerouting["alternatives"]:
            assert alt["additional_days"] > 0, f"{alt['route_id']} has non-positive additional_days"

    def test_rerouting_additional_cost_positive(self, simulator):
        affected = simulator._find_affected_routes(["suez_canal"])
        rerouting = simulator._compute_rerouting(affected, {"suez_canal"}, "full")
        for alt in rerouting["alternatives"]:
            assert alt["additional_cost_usd"] > 0, f"{alt['route_id']} has non-positive additional_cost"

    def test_rerouting_vessels_affected_positive(self, simulator):
        affected = simulator._find_affected_routes(["suez_canal"])
        rerouting = simulator._compute_rerouting(affected, {"suez_canal"}, "full")
        for alt in rerouting["alternatives"]:
            assert alt["vessels_affected"] >= 0
            assert isinstance(alt["vessels_affected"], int)

    def test_rerouting_vessels_affected_is_int(self, simulator):
        affected = simulator._find_affected_routes(["suez_canal"])
        rerouting = simulator._compute_rerouting(affected, {"suez_canal"}, "full")
        for alt in rerouting["alternatives"]:
            assert isinstance(alt["vessels_affected"], int), f"Expected int, got {type(alt['vessels_affected'])}"


class TestScoreCarriers:
    def test_suez_maersk_high_exposure(self, simulator):
        result = simulator._score_carriers({"asia_europe_suez"}, ["suez_canal"], "full")
        names = [c["carrier_id"] for c in result]
        assert "maersk" in names
        maersk = next(c for c in result if c["carrier_id"] == "maersk")
        assert maersk["exposure_score"] > 0.5

    def test_suez_all_carriers_scored(self, simulator):
        affected = simulator._find_affected_routes(["suez_canal"])
        affected_ids = {r["id"] for r in affected}
        result = simulator._score_carriers(affected_ids, ["suez_canal"], "full")
        assert len(result) > 0
        assert len(result) <= 10

    def test_carriers_sorted_by_exposure(self, simulator):
        result = simulator._score_carriers({"asia_europe_suez", "europe_me"}, ["suez_canal"], "full")
        scores = [c["exposure_score"] for c in result]
        assert scores == sorted(scores, reverse=True)

    def test_carrier_routes_exposed_count(self, simulator):
        result = simulator._score_carriers({"asia_europe_suez"}, ["suez_canal"], "full")
        maersk = next((c for c in result if c["carrier_id"] == "maersk"), None)
        assert maersk is not None
        assert maersk["routes_exposed"] == 1

    def test_carrier_daily_risk_positive(self, simulator):
        result = simulator._score_carriers({"asia_europe_suez"}, ["suez_canal"], "full")
        for c in result:
            if c["routes_exposed"] > 0:
                assert c["estimated_daily_risk_usd"] > 0

    def test_no_carriers_for_empty_routes(self, simulator):
        result = simulator._score_carriers(set(), ["suez_canal"], "full")
        assert result == []


class TestForecastPortCongestion:
    def test_suez_fujairah_congestion_rises(self, simulator):
        affected = simulator._find_affected_routes(["suez_canal"])
        result = simulator._forecast_port_congestion(affected, ["suez_canal"], "full")
        port_ids = {p["port_id"] for p in result}
        assert "fujairah" in port_ids
        fujairah = next(p for p in result if p["port_id"] == "fujairah")
        assert fujairah["forecast_congestion"] > fujairah["baseline_congestion"]

    def test_congestion_never_exceeds_95pct(self, simulator):
        affected = simulator._find_affected_routes(["suez_canal"])
        result = simulator._forecast_port_congestion(affected, ["suez_canal"], "full")
        for p in result:
            assert p["forecast_congestion"] <= 0.95

    def test_congestion_increase_proportional_to_severity(self, simulator):
        affected = simulator._find_affected_routes(["suez_canal"])
        full_result = simulator._forecast_port_congestion(affected, ["suez_canal"], "full")
        partial_result = simulator._forecast_port_congestion(affected, ["suez_canal"], "partial")
        full_max = max(p["forecast_congestion"] for p in full_result)
        partial_max = max(p["forecast_congestion"] for p in partial_result)
        assert full_max >= partial_max

    def test_port_congestion_has_required_fields(self, simulator):
        affected = simulator._find_affected_routes(["suez_canal"])
        result = simulator._forecast_port_congestion(affected, ["suez_canal"], "full")
        for p in result:
            assert "port_id" in p
            assert "baseline_congestion" in p
            assert "forecast_congestion" in p
            assert "dwell_increase_hours" in p

    def test_dwell_increase_non_negative(self, simulator):
        affected = simulator._find_affected_routes(["suez_canal"])
        result = simulator._forecast_port_congestion(affected, ["suez_canal"], "full")
        for p in result:
            assert p["dwell_increase_hours"] >= 0


class TestCascadePropagation:
    def test_suez_cascade_has_timeline(self, simulator):
        affected = simulator._find_affected_routes(["suez_canal"])
        cascade = simulator._compute_cascade(affected, "full")
        assert "impact_timeline" in cascade
        assert len(cascade["impact_timeline"]) > 0

    def test_cascade_timeline_sorted(self, simulator):
        affected = simulator._find_affected_routes(["suez_canal"])
        cascade = simulator._compute_cascade(affected, "full")
        hours = [entry["hours_to_impact"] for entry in cascade["impact_timeline"]]
        assert hours == sorted(hours)

    def test_directly_impacted_ports_at_hour_zero(self, simulator):
        affected = simulator._find_affected_routes(["suez_canal"])
        cascade = simulator._compute_cascade(affected, "full")
        hour_zero_ports = [e["port"] for e in cascade["impact_timeline"] if e["hours_to_impact"] == 0]
        affected_port_ids = {
            port for r in affected for port in [r["origin_port_id"], r["destination_port_id"]]
        }
        assert affected_port_ids.issubset(set(hour_zero_ports))

    def test_cascade_reaches_distant_ports(self, simulator):
        affected = simulator._find_affected_routes(["suez_canal"])
        cascade = simulator._compute_cascade(affected, "full")
        port_ids = {e["port"] for e in cascade["impact_timeline"]}
        assert "rotterdam" in port_ids

    def test_cascade_hours_non_negative(self, simulator):
        affected = simulator._find_affected_routes(["suez_canal"])
        cascade = simulator._compute_cascade(affected, "full")
        for entry in cascade["impact_timeline"]:
            assert entry["hours_to_impact"] >= 0

    def test_cascade_max_30_days(self, simulator):
        affected = simulator._find_affected_routes(["suez_canal"])
        cascade = simulator._compute_cascade(affected, "full")
        for entry in cascade["impact_timeline"]:
            assert entry["hours_to_impact"] <= 720

    def test_cascade_port_ids_valid(self, simulator):
        affected = simulator._find_affected_routes(["suez_canal"])
        cascade = simulator._compute_cascade(affected, "full")
        graph_nodes = set(simulator._graph.nodes)
        for entry in cascade["impact_timeline"]:
            assert entry["port"] in graph_nodes, f"Invalid port: {entry['port']}"

    def test_full_pipeline_integration(self, simulator):
        result = simulator.run_scenario(["suez_canal"], "full")
        assert len(result.rerouting["alternatives"]) > 0
        assert len(result.carriers) > 0
        assert len(result.port_congestion) > 0
        assert len(result.cascade["impact_timeline"]) > 0


class TestRunScenario:
    def test_returns_simulation_result(self, simulator):
        result = simulator.run_scenario(["suez_canal"], "full")
        assert result is not None

    def test_scenario_has_all_fields(self, simulator):
        result = simulator.run_scenario(["suez_canal"], "full")
        assert hasattr(result, "scenario")
        assert hasattr(result, "rerouting")
        assert hasattr(result, "carriers")
        assert hasattr(result, "port_congestion")
        assert hasattr(result, "cascade")

    def test_scenario_fields_correct(self, simulator):
        result = simulator.run_scenario(["suez_canal"], "full")
        assert result.scenario["chokepoints"] == ["suez_canal"]
        assert result.scenario["severity"] == "full"

    def test_suez_scenario_smoke(self, simulator):
        result = simulator.run_scenario(["suez_canal"], "full")
        assert len(result.rerouting["alternatives"]) > 0
        assert len(result.carriers) > 0

    def test_hormuz_scenario_smoke(self, simulator):
        result = simulator.run_scenario(["strait_of_hormuz"], "partial")
        assert isinstance(result, SimulationResult)

    def test_unknown_severity_raises(self, simulator):
        with pytest.raises(ValueError, match="Unknown severity"):
            simulator.run_scenario(["suez_canal"], "invalid")
