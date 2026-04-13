import json
import os
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv
import google.generativeai as genai

from src.world_model import MaritimeWorldModel
from src.temporal_model import TemporalModel
from src.simulator import DisruptionSimulator
from src.entity_extractor import extract_entities
from src.prompt_builder import build_prompt
from src.rag import MaritimeKnowledgeBase

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

app = FastAPI(title="Causalis Streaming Provider")

_world = None
_temporal = None
_simulator = None
_kb = None


def _get_world():
    global _world, _temporal, _simulator, _kb
    if _world is None:
        _world = MaritimeWorldModel()
        _temporal = TemporalModel(_world)
        _simulator = DisruptionSimulator(_world, _temporal)
        _kb = MaritimeKnowledgeBase()
    return _world, _temporal, _simulator, _kb


class ChatRequest(BaseModel):
    messages: list
    stream: bool = True


@app.post("/v1/chat/stream")
async def chat_stream(request: ChatRequest):
    if not request.messages:
        raise HTTPException(status_code=400, detail="No messages provided")

    user_message = request.messages[-1].get("content", "")
    _, _, simulator, kb = _get_world()

    entities = extract_entities(user_message)
    chokepoints = entities.get("chokepoints", [])
    ports = entities.get("ports", [])
    severity = entities.get("severity", "partial")

    simulation = None
    if chokepoints:
        simulation = simulator.run_scenario(chokepoints, severity)

    rag_results = kb.retrieve(user_message, n_results=3)
    rag_context = "\n\n".join(r["content"] for r in rag_results) if rag_results else ""

    all_entities = chokepoints + ports

    if simulation:
        prompt = build_prompt(user_message, simulation, rag_context, all_entities)
    else:
        entity_instruction = (
            f"Relevant spatial entities: {all_entities}\n"
            if all_entities
            else "Relevant spatial entities: []\n"
        )
        prompt = (
            f"User Question: {user_message}\n\n"
            f"Reference Material:\n{rag_context}\n\n"
            "Use OpenUI Lang when presenting structured data. Available components:\n"
            "- TextBlock(text: str)\n"
            "- GlobeVersion(version: int, entities: list[str])\n\n"
            f"{entity_instruction}\n"
            "When discussing spatial entities, render GlobeVersion(version=1, entities=<relevant ids>). "
            "Answer based on the reference material. If no relevant material is available, "
            "explain that you need a specific chokepoint to simulate disruptions."
        )

    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        async def no_key():
            yield "[Set GEMINI_API_KEY in .env to enable LLM responses]"
        return StreamingResponse(no_key(), media_type="text/event-stream")

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-1.5-flash")

    async def text_stream():
        try:
            response = model.generate_content(prompt, stream=True)
            for chunk in response:
                if chunk.text:
                    yield chunk.text
        except Exception as e:
            yield f"[Error: {e}]"

    return StreamingResponse(text_stream(), media_type="text/event-stream")


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
