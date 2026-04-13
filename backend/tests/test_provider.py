import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from src.provider import app


client = TestClient(app)


class TestProviderEndpoint:
    def test_health_check(self):
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}

    def test_chat_stream_requires_messages(self):
        response = client.post("/v1/chat/stream", json={"messages": []})
        assert response.status_code == 400
        assert "No messages" in response.json()["detail"]

    def test_chat_stream_requires_message_content(self):
        response = client.post("/v1/chat/stream", json={"messages": [{"role": "user"}]})
        assert response.status_code == 200

    def test_chat_stream_returns_text(self, monkeypatch):
        monkeypatch.setenv("GEMINI_API_KEY", "test-key")
        with patch("src.provider.genai.GenerativeModel") as mock_model_class:
            mock_model = MagicMock()
            mock_chunk = MagicMock()
            mock_chunk.text = "Suez handles ~12% of global trade."
            mock_model.generate_content.return_value = iter([mock_chunk])
            mock_model_class.return_value = mock_model

            response = client.post("/v1/chat/stream", json={
                "messages": [{"role": "user", "content": "What if Suez Canal is blocked?"}],
                "stream": True,
            })

            assert response.status_code == 200
            assert "text/event-stream" in response.headers["content-type"]
            text = response.text
            assert "Suez handles ~12% of global trade." in text

    def test_chat_stream_handles_no_key(self, monkeypatch):
        monkeypatch.delenv("GEMINI_API_KEY", raising=False)
        response = client.post("/v1/chat/stream", json={
            "messages": [{"role": "user", "content": "What if Suez is blocked?"}],
        })
        assert response.status_code == 200
        text = response.text
        assert "Set GEMINI_API_KEY" in text

    def test_chat_stream_falls_back_to_rag_when_no_chokepoints(self, monkeypatch):
        monkeypatch.setenv("GEMINI_API_KEY", "test-key")
        with patch("src.provider.genai.GenerativeModel") as mock_model_class:
            mock_model = MagicMock()
            mock_chunk = MagicMock()
            mock_chunk.text = "Rotterdam is Europe's largest port."
            mock_model.generate_content.return_value = iter([mock_chunk])
            mock_model_class.return_value = mock_model

            response = client.post("/v1/chat/stream", json={
                "messages": [{"role": "user", "content": "Tell me about Rotterdam"}],
            })
            assert response.status_code == 200
            text = response.text
            assert "Rotterdam is Europe's largest port." in text

    def test_chat_stream_uses_last_message(self, monkeypatch):
        monkeypatch.setenv("GEMINI_API_KEY", "test-key")
        with patch("src.provider.genai.GenerativeModel") as mock_model_class:
            mock_model = MagicMock()
            mock_chunk = MagicMock()
            mock_chunk.text = "Response."
            mock_model.generate_content.return_value = iter([mock_chunk])
            mock_model_class.return_value = mock_model

            response = client.post("/v1/chat/stream", json={
                "messages": [
                    {"role": "user", "content": "First question?"},
                    {"role": "user", "content": "What if Suez is blocked?"},
                ],
            })
            assert response.status_code == 200
            mock_model.generate_content.assert_called_once()
            call_arg = mock_model.generate_content.call_args[0][0]
            assert "What if Suez is blocked?" in call_arg


class TestProviderIntegration:
    def test_full_pipeline_suez_blockage(self, monkeypatch):
        monkeypatch.setenv("GEMINI_API_KEY", "test-key")
        with patch("src.provider.genai.GenerativeModel") as mock_model_class:
            mock_model = MagicMock()
            mock_chunk = MagicMock()
            mock_chunk.text = "A Suez blockage diverts vessels to Cape of Good Hope."
            mock_model.generate_content.return_value = iter([mock_chunk])
            mock_model_class.return_value = mock_model

            response = client.post("/v1/chat/stream", json={
                "messages": [{"role": "user", "content": "What happens if Suez Canal is blocked?"}],
            })

            assert response.status_code == 200
            text = response.text
            assert "Suez" in text or "suez" in text.lower()
