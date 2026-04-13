import pytest
from src.world_model import MaritimeWorldModel
from src.temporal_model import TemporalModel


@pytest.fixture(scope="module")
def temporal():
    model = MaritimeWorldModel()
    return TemporalModel(model)


class TestGetBaseline:
    def test_returns_dict_with_required_keys(self, temporal):
        result = temporal.get_baseline("rotterdam")
        assert "port_id" in result
        assert "typical_dwell_hours" in result
        assert "congestion_baseline" in result

    def test_rotterdam_baseline_values(self, temporal):
        result = temporal.get_baseline("rotterdam")
        assert result["port_id"] == "rotterdam"
        assert result["typical_dwell_hours"] == 48
        assert 0 <= result["congestion_baseline"] <= 1

    def test_congestion_baseline_is_normalized(self, temporal):
        result = temporal.get_baseline("rotterdam")
        expected = 48 / 72.0
        assert abs(result["congestion_baseline"] - expected) < 0.01

    def test_unknown_port_raises_keyerror(self, temporal):
        with pytest.raises(KeyError):
            temporal.get_baseline("nonexistent_port")


class TestGetDelayDistribution:
    def test_returns_dict_with_required_keys(self, temporal):
        result = temporal.get_delay_distribution("asia_europe_suez")
        assert "route_id" in result
        assert "transit_days" in result
        assert "delay_std_days" in result
        assert "on_time_pct" in result

    def test_asia_europe_suez_values(self, temporal):
        result = temporal.get_delay_distribution("asia_europe_suez")
        assert result["route_id"] == "asia_europe_suez"
        assert result["transit_days"] == 28
        assert abs(result["delay_std_days"] - 2.8) < 0.01
        assert result["on_time_pct"] == 0.85

    def test_unknown_route_raises_keyerror(self, temporal):
        with pytest.raises(KeyError):
            temporal.get_delay_distribution("nonexistent_route")


class TestGetCarrierPattern:
    def test_returns_dict_with_required_keys(self, temporal):
        result = temporal.get_carrier_pattern("maersk")
        assert "carrier_id" in result
        assert "routes" in result
        assert "avg_exposure" in result

    def test_maersk_has_routes(self, temporal):
        result = temporal.get_carrier_pattern("maersk")
        assert len(result["routes"]) > 0
        assert "asia_europe_suez" in result["routes"]

    def test_maersk_avg_exposure(self, temporal):
        result = temporal.get_carrier_pattern("maersk")
        assert 0 <= result["avg_exposure"] <= 1

    def test_unknown_carrier_raises_keyerror(self, temporal):
        with pytest.raises(KeyError):
            temporal.get_carrier_pattern("nonexistent_carrier")

    def test_all_carriers_accessible(self, temporal):
        carriers = ["maersk", "msc", "cma_cgm", "cosco", "hapag_lloyd", "one", "evergreen", "yang_ming", "zim", "pil"]
        for cid in carriers:
            result = temporal.get_carrier_pattern(cid)
            assert result["carrier_id"] == cid
