import json
import os
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import google.generativeai as genai

from src.world_model import MaritimeWorldModel
from src.temporal_model import TemporalModel
from src.simulator import DisruptionSimulator
from src.entity_extractor import extract_entities
from src.prompt_builder import build_prompt
from src.rag import MaritimeKnowledgeBase

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

    if simulation:
        prompt = build_prompt(user_message, simulation, rag_context)
    else:
        prompt = (
            f"User Question: {user_message}\n\n"
            f"Reference Material:\n{rag_context}\n\n"
            "Answer based on the reference material. If no relevant material is available, "
            "explain that you need a specific chokepoint to simulate disruptions."
        )

    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        async def no_key():
            yield "event: text\ndata: " + json.dumps({"content": "[Set GEMINI_API_KEY in .env to enable LLM responses]"}) + "\n\n"
            yield "event: done\ndata: {}\n\n"
        return StreamingResponse(no_key(), media_type="text/event-stream")

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-1.5-flash")

    async def event_stream():
        all_entities = chokepoints + ports
        if all_entities:
            yield "event: globe_version\ndata: " + json.dumps(
                {"version": 1, "entities": all_entities}
            ) + "\n\n"

        try:
            response = model.generate_content(prompt, stream=True)
            for chunk in response:
                if chunk.text:
                    yield "event: text\ndata: " + json.dumps({"content": chunk.text}) + "\n\n"
        except Exception as e:
            yield "event: text\ndata: " + json.dumps({"content": f"[Error: {e}]"}) + "\n\n"

        yield "event: done\ndata: {}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
