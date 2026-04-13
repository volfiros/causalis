import pytest
from src.entity_extractor import extract_entities


class TestExtractChokepoints:
    def test_extracts_suez_canal(self):
        result = extract_entities("What happens if the Suez Canal is blocked?")
        assert "suez_canal" in result["chokepoints"]

    def test_extracts_suez_canal_aliases(self):
        for msg in ["Suez disruption", "the canal is closed"]:
            result = extract_entities(msg)
            assert "suez_canal" in result["chokepoints"], f"Failed on: {msg}"

    def test_extracts_hormuz_variants(self):
        for msg in ["Hormuz disruption", "Persian Gulf blocked", "strait of hormuz closure"]:
            result = extract_entities(msg)
            assert "strait_of_hormuz" in result["chokepoints"], f"Failed on: {msg}"

    def test_extracts_multiple_chokepoints(self):
        result = extract_entities("Suez and Hormuz both disrupted")
        assert "suez_canal" in result["chokepoints"]
        assert "strait_of_hormuz" in result["chokepoints"]

    def test_extracts_bab_el_mandeb(self):
        result = extract_entities("Bab el-Mandeb attacks")
        assert "bab_el_mandeb" in result["chokepoints"]

    def test_extracts_panama_canal(self):
        result = extract_entities("Panama Canal closure")
        assert "panama_canal" in result["chokepoints"]

    def test_panama_canal_not_suez(self):
        result = extract_entities("Panama Canal closure")
        assert "panama_canal" in result["chokepoints"]
        assert "suez_canal" not in result["chokepoints"]

    def test_extracts_malacca_strait(self):
        result = extract_entities("Malacca Strait congestion")
        assert "strait_of_malacca" in result["chokepoints"]

    def test_extracts_bosporus(self):
        result = extract_entities("Bosporus transit issues")
        assert "bosporus" in result["chokepoints"]

    def test_extracts_no_chokepoints(self):
        result = extract_entities("What's the weather today?")
        assert result["chokepoints"] == []

    def test_extracts_all_six_chokepoints(self):
        for cp_id in ["suez_canal", "strait_of_hormuz", "strait_of_malacca", "panama_canal", "bab_el_mandeb", "bosporus"]:
            msg = f"Disruption at {cp_id.replace('_', ' ')}"
            result = extract_entities(msg)
            assert cp_id in result["chokepoints"], f"Failed to extract {cp_id}"


class TestExtractSeverity:
    def test_extracts_full_severity(self):
        result = extract_entities("full blockage of Suez")
        assert result["severity"] == "full"

    def test_extracts_temporary_severity(self):
        result = extract_entities("temporary closure of Panama")
        assert result["severity"] == "temporary"

    def test_extracts_partial_severity(self):
        result = extract_entities("Houthi attacks in Red Sea")
        assert result["severity"] == "partial"

    def test_defaults_to_partial(self):
        result = extract_entities("Suez disruption")
        assert result["severity"] == "partial"

    def test_full_blockage_keywords(self):
        for msg in ["completely blocked Suez", "total closure", "shut down completely"]:
            result = extract_entities(msg)
            assert result["severity"] == "full", f"Failed on: {msg}"

    def test_temporary_keywords(self):
        for msg in ["maintenance work", "brief closure", "short-term shutdown"]:
            result = extract_entities(msg)
            assert result["severity"] == "temporary", f"Failed on: {msg}"


class TestExtractPorts:
    def test_extracts_port_name(self):
        result = extract_entities("congestion at Rotterdam")
        assert "rotterdam" in result["ports"]

    def test_extracts_no_ports(self):
        result = extract_entities("Suez Canal disruption")
        assert result["ports"] == []


class TestExtractCarriers:
    def test_extracts_carrier_name(self):
        result = extract_entities("Maersk rerouting vessels")
        assert "maersk" in result["carriers"]

    def test_extracts_msc(self):
        result = extract_entities("MSC shipping delays")
        assert "msc" in result["carriers"]

    def test_extracts_no_carriers(self):
        result = extract_entities("Suez Canal blocked")
        assert result["carriers"] == []

    def test_one_not_false_positive(self):
        result = extract_entities("one chokepoint disrupted")
        assert "one" not in result["carriers"]


class TestReturnStructure:
    def test_returns_dict_with_required_keys(self):
        result = extract_entities("Suez blocked")
        assert "chokepoints" in result
        assert "ports" in result
        assert "carriers" in result
        assert "severity" in result

    def test_all_values_are_lists_or_strings(self):
        result = extract_entities("Suez blocked")
        assert isinstance(result["chokepoints"], list)
        assert isinstance(result["ports"], list)
        assert isinstance(result["carriers"], list)
        assert isinstance(result["severity"], str)
