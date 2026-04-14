import json
import os
import warnings
from pathlib import Path

warnings.filterwarnings("ignore", message=".*urllib3 v2 only supports OpenSSL.*")
warnings.filterwarnings("ignore", category=FutureWarning, module="google")

from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    model_name = os.environ.get("GEMINI_MODEL", "gemini-flash-latest")
    model = genai.GenerativeModel(model_name)

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


@app.get("/v1/spatial/ports")
async def get_ports():
    world, _, _, _ = _get_world()
    ports = []
    for _, port in world._ports.iterrows():
        ports.append({
            "id": port["id"],
            "name": port["name"],
            "latitude": float(port["latitude"]),
            "longitude": float(port["longitude"]),
            "country": port["country"],
            "type": port["type"],
            "annual_teu": int(port["annual_teu"]),
            "max_draft_meters": float(port["max_draft_meters"]),
            "typical_dwell_hours": int(port["typical_dwell_hours"]),
        })
    return {"ports": ports}


@app.get("/v1/spatial/chokepoints")
async def get_chokepoints():
    world, _, _, _ = _get_world()
    chokepoints = []
    for _, cp in world._chokepoints.iterrows():
        centroid = cp.geometry.centroid
        chokepoints.append({
            "id": cp["id"],
            "name": cp["name"],
            "latitude": centroid.y,
            "longitude": centroid.x,
            "type": cp["type"],
            "daily_vessels": int(cp["daily_vessels"]),
            "strategic_importance": int(cp["strategic_importance"]),
        })
    return {"chokepoints": chokepoints}


@app.get("/v1/spatial/routes")
async def get_routes():
    world, _, _, _ = _get_world()
    routes = []
    for _, route in world._routes.iterrows():
        routes.append({
            "id": route["id"],
            "name": route["name"],
            "origin_port_id": route["origin_port_id"],
            "destination_port_id": route["destination_port_id"],
            "chokepoints_transited": route["chokepoints_transited"],
            "distance_nm": float(route["distance_nm"]),
            "transit_days": float(route["transit_days"]),
        })
    return {"routes": routes}


@app.get("/v1/spatial/port/{port_id}")
async def get_port(port_id: str):
    world, _, _, _ = _get_world()
    port_row = world._ports[world._ports["id"] == port_id]
    if port_row.empty:
        raise HTTPException(status_code=404, detail=f"Port '{port_id}' not found")
    port = port_row.iloc[0]
    return {
        "id": port["id"],
        "name": port["name"],
        "latitude": float(port["latitude"]),
        "longitude": float(port["longitude"]),
        "country": port["country"],
        "type": port["type"],
        "annual_teu": int(port["annual_teu"]),
        "max_draft_meters": float(port["max_draft_meters"]),
        "typical_dwell_hours": int(port["typical_dwell_hours"]),
    }


@app.get("/v1/spatial/chokepoint/{chokepoint_id}")
async def get_chokepoint(chokepoint_id: str):
    world, _, _, _ = _get_world()
    cp_row = world._chokepoints[world._chokepoints["id"] == chokepoint_id]
    if cp_row.empty:
        raise HTTPException(status_code=404, detail=f"Chokepoint '{chokepoint_id}' not found")
    cp = cp_row.iloc[0]
    centroid = cp.geometry.centroid
    return {
        "id": cp["id"],
        "name": cp["name"],
        "latitude": centroid.y,
        "longitude": centroid.x,
        "type": cp["type"],
        "daily_vessels": int(cp["daily_vessels"]),
        "strategic_importance": int(cp["strategic_importance"]),
    }


@app.get("/v1/spatial/route/{route_id}")
async def get_route(route_id: str):
    world, _, _, _ = _get_world()
    route_row = world._routes[world._routes["id"] == route_id]
    if route_row.empty:
        raise HTTPException(status_code=404, detail=f"Route '{route_id}' not found")
    route = route_row.iloc[0]
    return {
        "id": route["id"],
        "name": route["name"],
        "origin_port_id": route["origin_port_id"],
        "destination_port_id": route["destination_port_id"],
        "chokepoints_transited": route["chokepoints_transited"],
        "distance_nm": float(route["distance_nm"]),
        "transit_days": float(route["transit_days"]),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
