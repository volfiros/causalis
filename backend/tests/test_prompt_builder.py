import json
import pytest
from src.world_model import MaritimeWorldModel
from src.temporal_model import TemporalModel
from src.simulator import DisruptionSimulator
from src.prompt_builder import build_prompt


@pytest.fixture(scope="module")
def sample_simulation():
    world = MaritimeWorldModel()
    temporal = TemporalModel(world)
    sim = DisruptionSimulator(world, temporal)
    return sim.run_scenario(["suez_canal"], "full")


class TestBuildPrompt:
    def test_returns_string(self, sample_simulation):
        prompt = build_prompt("What happens if Suez is blocked?", sample_simulation, "")
        assert isinstance(prompt, str)
        assert len(prompt) > 0

    def test_contains_user_message(self, sample_simulation):
        prompt = build_prompt("What happens if Suez is blocked?", sample_simulation, "")
        assert "What happens if Suez is blocked?" in prompt

    def test_contains_simulation_data(self, sample_simulation):
        prompt = build_prompt("Suez blocked", sample_simulation, "")
        assert "suez_canal" in prompt
        assert "full" in prompt.lower()

    def test_contains_causal_chain_instruction(self, sample_simulation):
        prompt = build_prompt("Suez blocked", sample_simulation, "")
        assert "causal chain" in prompt.lower() or "→" in prompt

    def test_no_rag_context(self, sample_simulation):
        prompt = build_prompt("Suez blocked", sample_simulation, "")
        assert "No additional reference material" in prompt

    def test_with_rag_context(self, sample_simulation):
        rag_text = "Historical data shows Suez disruptions cause 2-week delays."
        prompt = build_prompt("Suez blocked", sample_simulation, rag_text)
        assert rag_text in prompt
        assert "Reference Material" in prompt

    def test_contains_carrier_data(self, sample_simulation):
        prompt = build_prompt("Suez blocked", sample_simulation, "")
        assert "Maersk" in prompt or "exposure" in prompt.lower()

    def test_contains_port_congestion(self, sample_simulation):
        prompt = build_prompt("Suez blocked", sample_simulation, "")
        assert "congestion" in prompt.lower() or "port" in prompt.lower()
