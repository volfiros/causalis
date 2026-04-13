import pytest
from src.rag import MaritimeKnowledgeBase


class TestMaritimeKnowledgeBase:
    def test_loads_documents(self, tmp_path):
        kb = MaritimeKnowledgeBase(
            persist_directory=str(tmp_path / "chroma"),
            collection_name="test-loads-documents",
        )
        assert kb.collection.count() > 0

    def test_retrieves_returns_list(self, tmp_path):
        kb = MaritimeKnowledgeBase(
            persist_directory=str(tmp_path / "chroma"),
            collection_name="test-retrieves-returns-list",
        )
        results = kb.retrieve("Suez Canal blockage", n_results=3)
        assert isinstance(results, list)
        assert len(results) >= 1

    def test_results_have_required_fields(self, tmp_path):
        kb = MaritimeKnowledgeBase(
            persist_directory=str(tmp_path / "chroma"),
            collection_name="test-results-have-required-fields",
        )
        results = kb.retrieve("Suez Canal blockage", n_results=3)
        for r in results:
            assert "id" in r
            assert "content" in r
            assert "metadata" in r
            assert r["metadata"]["type"] in (
                "disruption_event",
                "port",
                "carrier",
            )

    def test_empty_query_returns_empty_list(self, tmp_path):
        kb = MaritimeKnowledgeBase(
            persist_directory=str(tmp_path / "chroma"),
            collection_name="test-empty-query-returns-empty-list",
        )
        assert kb.retrieve("", n_results=3) == []
        assert kb.retrieve("   ", n_results=3) == []

    def test_disruption_events_retrieved(self, tmp_path):
        kb = MaritimeKnowledgeBase(
            persist_directory=str(tmp_path / "chroma"),
            collection_name="test-disruption-events-retrieved",
        )
        results = kb.retrieve("Ever Given Suez Canal blockage 2021", n_results=10)
        disruption_ids = [r["id"] for r in results if r["metadata"]["type"] == "disruption_event"]
        assert "suez_ever_given_2021" in disruption_ids

    def test_ports_retrieved(self, tmp_path):
        kb = MaritimeKnowledgeBase(
            persist_directory=str(tmp_path / "chroma"),
            collection_name="test-ports-retrieved",
        )
        results = kb.retrieve("Rotterdam port details Netherlands", n_results=10)
        port_ids = [r["id"] for r in results if r["metadata"]["type"] == "port"]
        assert "port_rotterdam" in port_ids

    def test_carriers_retrieved(self, tmp_path):
        kb = MaritimeKnowledgeBase(
            persist_directory=str(tmp_path / "chroma"),
            collection_name="test-carriers-retrieved",
        )
        results = kb.retrieve("Maersk shipping carrier exposure chokepoints", n_results=10)
        carrier_ids = [r["id"] for r in results if r["metadata"]["type"] == "carrier"]
        assert "carrier_maersk" in carrier_ids

    def test_results_content_contains_json(self, tmp_path):
        kb = MaritimeKnowledgeBase(
            persist_directory=str(tmp_path / "chroma"),
            collection_name="test-results-content-contains-json",
        )
        results = kb.retrieve("Suez Canal disruption", n_results=3)
        assert len(results) >= 1
        assert "{" in results[0]["content"]

    def test_n_results_respects_limit(self, tmp_path):
        kb = MaritimeKnowledgeBase(
            persist_directory=str(tmp_path / "chroma"),
            collection_name="test-n-results-respects-limit",
        )
        results = kb.retrieve("shipping port carrier", n_results=2)
        assert len(results) <= 2

    def test_no_hallucinated_ids(self, tmp_path):
        kb = MaritimeKnowledgeBase(
            persist_directory=str(tmp_path / "chroma"),
            collection_name="test-no-hallucinated-ids",
        )
        results = kb.retrieve("Maersk", n_results=20)
        carrier_ids = {r["id"] for r in results if r["metadata"]["type"] == "carrier"}
        assert carrier_ids <= {"carrier_maersk", "carrier_msc", "carrier_cma_cgm",
                               "carrier_cosco", "carrier_hapag_lloyd", "carrier_one",
                               "carrier_evergreen", "carrier_yang_ming",
                               "carrier_zim", "carrier_pil"}

    def test_extract_id_from_content(self, tmp_path):
        kb = MaritimeKnowledgeBase(
            persist_directory=str(tmp_path / "chroma"),
            collection_name="test-extract-id-from-content",
        )
        results = kb.retrieve("Ever Given Suez Canal", n_results=5)
        for r in results:
            assert r["id"] in r["content"]
