<div align="center">

```
   ██████╗ █████╗ ██╗   ██╗███████╗ █████╗ ██╗     ██╗███████╗
  ██╔════╝██╔══██╗██║   ██║██╔════╝██╔══██╗██║     ██║██╔════╝
  ██║     ███████║██║   ██║███████╗███████║██║     ██║███████╗
  ██║     ██╔══██║██║   ██║╚════██║██╔══██║██║     ██║╚════██║
  ╚██████╗██║  ██║╚██████╔╝███████║██║  ██║███████╗██║███████║
   ╚═════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═╝╚══════╝╚═╝╚══════╝
```

**Maritime World Model — Predict disruption before it cascades.**

[![Deploy](https://github.com/volfiros/causalis/actions/workflows/deploy-backend.yml/badge.svg)](https://github.com/volfiros/causalis/actions/workflows/deploy-backend.yml)

</div>

---

Causalis is a maritime supply-chain intelligence platform that simulates disruptions at global chokepoints and models how they cascade through shipping routes, carrier networks, and port congestion. It combines a graph-based world model with an LLM-powered conversational interface rendered through a structured component system, all visualized on an interactive 3D globe.

## Current Status

Causalis is **functional and operational** — the simulation engine, chat interface, and 3D visualization are all working end-to-end. That said, this is an active development project, and you may encounter unresolved edge cases, UI quirks, or simulation inaccuracies. We welcome bug reports, feature requests, and feedback from the community to help improve the platform.

## How it works

```
  User Query
      │
      ▼
 ┌──────────────┐       ┌──────────────────────────────────────────┐
 │  Next.js     │       │  FastAPI Backend                         │
 │  Frontend    │──────▶│                                          │
 │              │       │  Entity Extractor ──▶ Simulation Engine   │
 │  · Chat UI   │◀──────│        │                    │            │
 │  · 3D Globe  │ SSE   │        ▼                    ▼            │
 │  · OpenUI    │stream │  RAG Retrieval    Prompt Builder          │
 │    Renderer  │       │        │                    │            │
 └──────────────┘       │        └──────┬─────────────┘            │
                         │               ▼                          │
                         │     Gemini Flash (streaming)             │
                         │               │                          │
                         │               ▼                          │
                         │     OpenUI Lang structured response      │
                         └──────────────────────────────────────────┘
```

### Request lifecycle

1. **User asks a question** in the chat interface (e.g. "Simulate a full closure of the Suez Canal")
2. **Next.js API proxy** forwards the request to the FastAPI backend, normalizing message format from the Vercel AI SDK
3. **Entity extraction** parses chokepoint names, port names, carriers, and severity from natural language using an alias dictionary
4. **Simulation engine** runs a disruption scenario on a NetworkX graph of 45 ports and 20 routes, computing:
   - Affected vessels and routes
   - Rerouting alternatives with cost/time deltas
   - Carrier exposure scores ranked by risk
   - Port congestion forecasts (baseline → projected)
   - Cascade timelines showing impact propagation across the graph (BFS up to 720 hours)
5. **RAG retrieval** searches a vector-indexed knowledge base of ports, carriers, routes, and historical disruption events using `sentence-transformers` (`all-MiniLM-L6-v2`) with cosine similarity
6. **Prompt builder** combines simulation data, RAG context, and OpenUI Lang syntax rules into a structured prompt
7. **Gemini Flash** generates a streaming OpenUI Lang response — a declarative DSL that the frontend Renderer parses into React components in real-time
8. **OpenUI Renderer** progressively parses the streamed DSL and renders interactive cards (stats grids, carrier tables, congestion bars, cascade timelines)
9. **Globe events** emitted by OpenUI components (via `GlobeVersion`) highlight affected entities and routes on the 3D WebGL globe

## Architecture

```
causalis/
├── backend/                          # Python FastAPI backend
│   ├── src/
│   │   ├── provider.py               # FastAPI app, /v1/chat/stream endpoint, SSE proxy
│   │   ├── world_model.py            # MaritimeWorldModel — NetworkX graph of ports & routes
│   │   ├── simulator.py              # DisruptionSimulator — scenario engine
│   │   ├── temporal_model.py         # TemporalModel — baselines, delay distributions
│   │   ├── entity_extractor.py       # NLP entity & severity extraction from free text
│   │   ├── prompt_builder.py         # Assembles OpenUI Lang prompts with simulation data
│   │   ├── rag.py                    # Vector search over maritime knowledge base
│   │   └── data_loader.py            # JSON/GeoJSON data loaders
│   ├── data/                         # Maritime datasets
│   │   ├── ports.json                # 45 global ports (TEU, draft, dwell)
│   │   ├── chokepoints.geojson       # 6 chokepoints (Suez, Hormuz, Malacca, Panama, Bab el-Mandeb, Bosporus)
│   │   ├── routes.json               # 20 shipping routes with chokepoint transits
│   │   ├── carriers.json             # 10 carriers with route portfolios & chokepoint exposure
│   │   ├── vessels.json              # 52 vessels with carrier assignments
│   │   └── disruptions.json          # 7 historical disruption events
│   └── requirements.txt
│
├── frontend/                         # Next.js 16 + React 19 frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx              # Landing page with 3D globe
│   │   │   ├── chat/page.tsx         # Chat interface with OpenUI rendering
│   │   │   ├── globals.css           # Global styles (Tailwind v4)
│   │   │   └── layout.tsx            # Root layout (Outfit + JetBrains Mono)
│   │   ├── components/
│   │   │   ├── SideGlobe.tsx         # Three.js WebGL globe (React Three Fiber)
│   │   │   └── globe-sidebar/        # Sidebar with simulation data panels
│   │   │       ├── index.tsx         # Sidebar shell with dropdown sections
│   │   │       ├── ImpactStatsCard   # Vessels/routes/cost metrics
│   │   │       ├── CarrierTableCard  # Carrier exposure rankings
│   │   │       ├── PortCard          # Port congestion details
│   │   │       ├── RouteCard         # Route disruption info
│   │   │       ├── PinDetails        # Selected pin details
│   │   │       └── ...
│   │   └── lib/
│   │       ├── openui-library.tsx     # OpenUI component definitions (Stack, TextBlock, ImpactStats, etc.)
│   │       ├── globe-events.ts       # Pub/sub bridge between OpenUI components and the globe
│   │       ├── spatial-data.ts       # Client-side cache for ports, chokepoints, routes
│   │       ├── arc-utils.ts          # 3D arc geometry for route visualization
│   │       └── use-simulation.ts     # React hook for on-demand simulation queries
│   └── package.json
│
├── Dockerfile                        # Backend container (Python 3.11, GDAL, PyTorch for embeddings)
├── start.sh                         # Local dev launcher (backend + frontend, with pre-flight checks)
└── .github/workflows/
    └── deploy-backend.yml            # CI: auto-deploy backend to Hugging Face Spaces
```

## Simulation engine

The core simulation runs on a `MaritimeWorldModel` — a NetworkX graph where nodes are ports and edges are shipping routes annotated with distance, transit time, and chokepoints transited. `DisruptionSimulator.run_scenario()` accepts a list of chokepoint IDs and a severity level.

```
 Severity: full (1.0) · partial (0.6) · temporary (0.3)

 ┌─────────────────────────────────────────────────────┐
 │                   run_scenario()                     │
 │                                                     │
 │  chokepoint_ids ──▶ _find_affected_routes()         │
 │                          │                          │
 │              ┌───────────┼───────────┐              │
 │              ▼           ▼           ▼              │
 │   _count_affected   _compute    _score_carriers()   │
 │      _vessels()    _rerouting()       │              │
 │              │           │           │              │
 │              └───────────┼───────────┘              │
 │                          │                          │
 │              ┌───────────┴───────────┐              │
 │              ▼                       ▼              │
 │   _forecast_port_congestion()   _compute_cascade()  │
 │         (per-port)              (BFS propagation)    │
 └─────────────────────────────────────────────────────┘
```

### What each stage computes

| Stage | Output | Method |
|---|---|---|
| **Affected routes** | Routes that transit any blocked chokepoint | Set intersection on `chokepoints_transited` |
| **Affected vessels** | Count of vessels on affected carriers, scaled by severity | Carrier-to-route mapping × severity multiplier |
| **Rerouting** | Alternative routes avoiding blocked chokepoints, with Δ days and Δ cost | Direct route lookup with blocked-set exclusion |
| **Carrier exposure** | Per-carrier exposure score and daily risk in USD | Weighted chokepoint exposure × routes exposed × severity |
| **Port congestion** | Baseline → forecast congestion, dwell time increase | Vessel displacement model against baseline dwell ratios |
| **Cascade timeline** | Ordered list of ports with hours-to-impact | BFS on port graph, propagating impact across edges weighted by distance/speed |

### Entity extraction

The `entity_extractor` maps natural language to structured IDs using alias dictionaries:

```
"Simulate a full closure of the Suez Canal"
         │
         ▼
  ┌─────────────────────┐
  │  Chokepoints: ["suez_canal"]      ← "suez canal" → suez_canal
  │  Ports: []                         (no port mentions)
  │  Severity: "full"                  ← "full closure" keyword
  └─────────────────────┘
```

Supports 6 chokepoints, 20 port names, and 13 carrier names with aliases (e.g. "persian gulf" → `strait_of_hormuz`, "jebel ali" → `dubai`).

## OpenUI rendering pipeline

The backend returns structured responses in **OpenUI Lang** — a declarative DSL that the frontend progressively parses into React components during streaming.

```
  Gemini streams:                     Frontend renders:

  root = Stack([                      ┌─────────────────────┐
    TextBlock(text="Blockage          │ "Blockage affects    │
      affects 125 vessels..."),       │  125 vessels..."     │
    ImpactStats(vessels=125,          ├─────────────────────┤
      routes=47, cost_usd=2400000),   │  125   47    $2.4M  │
    CarrierTable(carriers=[           │ Vessels Routes Cost  │
      {name: "Maersk",               ├─────────────────────┤
       exposure: 0.82}, ...]),        │  Maersk  ████ 82%   │
    GlobeVersion(version=1,           │  MSC     ███  73%    │
      entities=["suez_canal"])        ├─────────────────────┤
  ])                                  │  🌐 Globe V1        │
                                      └─────────────────────┘
```

The `OpenUIRenderer` component manages a state machine (`streaming → success | failed`) to decide whether to render the parsed component tree or fall back to extracted plain text. The `@openuidev/react-lang` `Renderer` handles progressive parsing, and custom components are defined in `openui-library.tsx` using `defineComponent` with Zod schemas.

Components can emit side effects — `GlobeVersion` triggers globe visualization updates through a lightweight pub/sub bridge (`globe-events.ts`) that highlights affected chokepoints and routes.

## 3D Globe

Built with **React Three Fiber** (`@react-three/fiber`) and **Three.js**:

- Natural Earth landmass geometry rendered from GeoJSON
- Chokepoint markers (glowing pins with pulse animations)
- Port markers with size proportional to annual TEU
- Route arcs via quadratic Bézier curves (`arc-utils.ts`), with affected routes colored blue and animated
- Interactive: click pins to select, orbit to rotate, scroll to zoom
- Appears on both the landing page (chokepoints-only view) and the chat sidebar (full simulation view)

## Data coverage

| Entity | Count | Details |
|---|---|---|
| Ports | 45 | Global coverage — TEU capacity, max draft, typical dwell hours |
| Chokepoints | 6 | Suez Canal, Strait of Hormuz, Strait of Malacca, Panama Canal, Bab el-Mandeb, Bosporus |
| Routes | 20 | Origin/destination ports, distance (nm), transit days, chokepoints transited |
| Carriers | 10 | Maersk, MSC, CMA CGM, COSCO, Hapag-Lloyd, ONE, Evergreen, Yang Ming, ZIM, PIL |
| Vessels | 52 | Carrier-assigned with type, flag, and position |
| Disruption events | 7 | Historical events with duration and vessel impact |

## Tech stack

| Layer | Technology |
|---|---|
| **Frontend framework** | Next.js 16, React 19, Tailwind CSS v4 |
| **3D rendering** | React Three Fiber, Three.js, `@react-three/drei` |
| **Chat streaming** | Vercel AI SDK (`useChat`, `TextStreamChatTransport`) |
| **Structured output** | OpenUI (`@openuidev/react-lang`) — declarative DSL → React components |
| **Validation** | Zod (component prop schemas) |
| **Animation** | Framer Motion |
| **Backend framework** | FastAPI, Uvicorn |
| **Graph engine** | NetworkX (port connectivity, shortest paths, cascade BFS) |
| **Geospatial** | GeoPandas, Shapely, Fiona (chokepoint geometries) |
| **Embeddings** | sentence-transformers (`all-MiniLM-L6-v2`), NumPy vector search |
| **LLM** | Google Gemini Flash (streaming) |
| **Deployment** | Docker (HF Spaces), Vercel (frontend), GitHub Actions (CI/CD) |

## Setup

### Prerequisites

- **Python** 3.11+
- **Node.js** 20+ with **pnpm**
- **Gemini API key** (for LLM features)

### Quick start

```bash
# Clone
git clone https://github.com/volfiros/causalis.git
cd causalis

# Configure environment
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY

# Start both services (runs pre-flight checks, installs deps, starts backend + frontend)
./start.sh
```

This launches:
- **Backend** at `http://localhost:8000`
- **Frontend** at `http://localhost:3000`

### Manual setup

<details>
<summary>Backend</summary>

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn src.provider:app --host 0.0.0.0 --port 8000
```

</details>

<details>
<summary>Frontend</summary>

```bash
cd frontend
pnpm install
pnpm dev
```

The frontend reads `../.env` automatically via `next.config.ts` and proxies API requests through Next.js rewrites.

</details>

### Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `GEMINI_API_KEY` | Yes | — | Google Gemini API key |
| `GEMINI_MODEL` | No | `gemini-flash-latest` | Gemini model to use |
| `BACKEND_URL` | No | `http://localhost:8000` | Backend URL (used by Next.js proxy) |

## Deployment

| Component | Platform | Trigger |
|---|---|---|
| **Backend** | Hugging Face Spaces (Docker) | Push to `main` with changes in `backend/**`, `Dockerfile`, or `.dockerignore` |
| **Frontend** | Vercel | Push to `main` |

The GitHub Actions workflow (`.github/workflows/deploy-backend.yml`) clones the HF Space repo, copies backend files into it, and pushes. The HF_TOKEN secret must have write access to the Space.

## Project structure (dependency graph)

```
                      ┌─────────────┐
                      │  provider.py│  FastAPI endpoints, streaming
                      └──────┬──────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
     ┌────────────┐  ┌────────────┐  ┌────────────┐
     │ entity_    │  │ simulator  │  │ rag.py     │
     │ extractor  │  │   .py      │  │            │
     └────────────┘  └─────┬──────┘  └─────┬──────┘
                           │               │
              ┌────────────┼────────┐      │
              ▼            ▼        ▼      │
     ┌────────────┐ ┌──────────┐ ┌───────┐│
     │ world_     │ │ temporal │ │ data_ ││
     │ model.py   │ │ _model   │ │ loader││
     └─────┬──────┘ └────┬─────┘ └───┬───┘│
           │             │           │    │
           └─────────────┴───────────┘    │
                    data/                  │
              (JSON + GeoJSON)             │
                                        ┌──┴──┐
                                        │ vec │
                                        │ db  │
                                        └─────┘
```

## License

MIT License — see [LICENSE](LICENSE) for details.

## Future Improvements

We are actively expanding Causalis in several directions:

- **Broader geographic coverage** — extending the world model to additional chokepoints, secondary ports, and inland logistics hubs
- **Enhanced temporal modeling** — introducing seasonal trade patterns, weather disruptions, and dynamic congestion forecasting
- **Multi-modal integration** — connecting maritime flows with rail and trucking networks for end-to-end supply chain visibility
- **Advanced scenario modeling** — supporting compound disruptions, gradual degradation, and recovery timeline simulations
- **Collaborative intelligence** — enabling analysts to share scenarios, compare outcomes, and build institutional knowledge
- **API ecosystem** — exposing simulation endpoints for third-party integrations and custom visualization tools
