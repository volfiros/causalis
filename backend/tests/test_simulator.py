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
