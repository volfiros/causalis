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
2. **Next.js API route** (`/api/chat/stream/route.ts`) normalizes the Vercel AI SDK message format and proxies the request to the FastAPI backend
3. **Entity extraction** parses chokepoint names, port names, carriers, and severity from natural language using alias dictionaries with exact, fuzzy, and phonetic matching
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
│   │   ├── provider.py               # FastAPI app entry point
│   │   │                             # Endpoints: POST /v1/chat/stream, GET /v1/simulate,
│   │   │                             #           GET /v1/spatial/*, GET /health
│   │   │                             # Lazy-loads world model, simulator, and RAG on first request
│   │   ├── world_model.py            # MaritimeWorldModel — NetworkX graph of ports & routes
│   │   │                             # Nodes = ports, edges = shipping routes with distance/chokepoints
│   │   │                             # Provides: shortest path, connectivity, region queries, GeoJSON export
│   │   ├── temporal_model.py         # TemporalModel — time-dependent baselines & patterns
│   │   │                             # Port congestion baselines, route delay distributions,
│   │   │                             # carrier exposure patterns
│   │   ├── simulator.py              # DisruptionSimulator — scenario engine
│   │   │                             # run_scenario(chokepoints, severity) → SimulationResult
│   │   │                             # Stages: affected routes → vessels → rerouting →
│   │   │                             #           carrier scores → port congestion → cascade BFS
│   │   ├── entity_extractor.py       # NLP-free entity & severity extraction from free text
│   │   │                             # Three-tier matching: exact substring → fuzzy (rapidfuzz)
│   │   │                             #   → phonetic (Metaphone). Keyword-based severity detection.
│   │   ├── prompt_builder.py         # Assembles OpenUI Lang prompts with formatted simulation data,
│   │   │                             # RAG context, and component syntax rules
│   │   ├── rag.py                    # Vector search over maritime knowledge base
│   │   │                             # Uses sentence-transformers embeddings + cosine similarity
│   │   │                             # Indexes: disruptions, ports, carriers, routes
│   │   └── data_loader.py            # JSON/GeoJSON data loaders (ports, chokepoints, routes,
│   │                                 #   carriers, vessels) → pandas DataFrames / GeoDataFrames
│   ├── data/                         # Maritime datasets
│   │   ├── ports.json                # 45 global ports (TEU, draft, dwell hours)
│   │   ├── chokepoints.geojson       # 6 chokepoints (Suez, Hormuz, Malacca, Panama,
│   │   │                             #   Bab el-Mandeb, Bosporus)
│   │   ├── routes.json               # 20 shipping routes with chokepoint transits
│   │   ├── carriers.json             # 10 carriers with route portfolios & chokepoint exposure
│   │   ├── vessels.json              # 52 vessels with carrier assignments
│   │   └── disruptions.json          # 7 historical disruption events
│   ├── tests/                        # Backend test suite
│   ├── conftest.py                   # Pytest configuration
│   └── requirements.txt
│
├── frontend/                         # Next.js 16 + React 19 frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx              # Landing page — 3D globe + tagline + "Begin Session" CTA
│   │   │   ├── layout.tsx            # Root layout (Outfit + JetBrains Mono fonts)
│   │   │   ├── globals.css           # Global styles (Tailwind v4)
│   │   │   ├── chat/
│   │   │   │   └── page.tsx          # Chat interface — useChat hook, OpenUI renderer,
│   │   │   │                         #   GlobeSidebar integration, globe event subscription
│   │   │   └── api/                  # Next.js API route handlers (proxy to backend)
│   │   │       ├── chat/
│   │   │       │   └── stream/
│   │   │       │       └── route.ts  # POST — proxies to backend /v1/chat/stream,
│   │   │       │                     #   normalizes Vercel AI SDK message format, streams SSE
│   │   │       ├── simulate/
│   │   │       │   └── route.ts      # GET — proxies to backend /v1/simulate,
│   │   │       │                     #   returns JSON simulation data
│   │   │       └── spatial/          # GET — proxies to backend /v1/spatial/*
│   │   │           ├── ports/        #   Returns all ports as JSON
│   │   │           ├── chokepoints/  #   Returns all chokepoints as JSON
│   │   │           └── routes/       #   Returns all routes as JSON
│   │   ├── components/
│   │   │   ├── SideGlobe.tsx         # Three.js WebGL globe (React Three Fiber)
│   │   │   │                         # Landmesh from GeoJSON, pin markers, route arcs (Bézier),
│   │   │   │                         #   animated dashed lines for affected routes, glow effects
│   │   │   └── globe-sidebar/        # Sidebar with simulation data panels
│   │   │       ├── index.tsx         # GlobeSidebar — sidebar shell with dropdown sections,
│   │   │       │                     #   embedded SideGlobe, Framer Motion animations
│   │   │       ├── ImpactStatsCard   # Vessels/routes/cost metrics display
│   │   │       ├── CarrierTableCard  # Carrier exposure rankings with progress bars
│   │   │       ├── PortCard          # Port congestion details
│   │   │       ├── RouteCard         # Route disruption info
│   │   │       ├── PinDetails        # Selected pin (port/chokepoint) details
│   │   │       ├── Menus             # Entity selection menus for scenarios
│   │   │       ├── FilterControls    # Filter UI for entity selection
│   │   │       ├── GlobeVersionCard  # Globe version indicator
│   │   │       ├── VersionPanel      # Version panel component
│   │   │       └── FullscreenToggle  # Fullscreen toggle for globe view
│   │   └── lib/
│   │       ├── openui-library.tsx    # OpenUI component definitions with Zod schemas:
│   │       │                         #   Stack, TextBlock, ImpactStats, CarrierTable,
│   │       │                         #   ReroutingCard, PortCongestion, CascadeTimeline, GlobeVersion
│   │       ├── globe-events.ts       # Pub/sub event bridge — emit/subscribe for globe state updates
│   │       ├── spatial-data.ts       # Client-side cache for ports, chokepoints, routes
│   │       │                         #   Fetches from /api/spatial/*, provides lookup helpers
│   │       ├── arc-utils.ts          # 3D arc geometry — QuadraticBezierCurve3 for route arcs
│   │       ├── globe-constants.ts    # Globe radius, altitude offsets, lat/lng → Vector3 converter
│   │       └── use-simulation.ts     # React hook for on-demand simulation queries via /api/simulate
│   ├── package.json
│   ├── next.config.ts                # Next.js configuration (env var loading)
│   ├── tsconfig.json
│   ├── postcss.config.mjs
│   └── eslint.config.mjs
│
├── Dockerfile                        # Backend container (Python 3.11, GDAL, PyTorch for embeddings)
├── start.sh                          # Local dev launcher — pre-flight checks, dep install,
│                                     #   starts backend (uvicorn) + frontend (pnpm dev)
├── .env.example                      # Environment variable template
└── .github/workflows/
    └── deploy-backend.yml            # CI: auto-deploy backend to Hugging Face Spaces
```

## World Model & Temporal Model

The backend separates **spatial structure** from **temporal behavior**:

| Model | Purpose | Key responsibility |
|-------|---------|-------------------|
| **MaritimeWorldModel** (`world_model.py`) | "The map" — static spatial structure | NetworkX graph of ports (nodes) and shipping routes (edges). Provides shortest path, connectivity, region queries, and GeoJSON export. |
| **TemporalModel** (`temporal_model.py`) | "The clock" — time-dependent baselines | Port congestion baselines (dwell hours → congestion ratio), route delay distributions (transit days ± std dev), carrier exposure patterns. |

The `DisruptionSimulator` uses both: the World Model identifies *which* ports and routes are affected by a disruption; the Temporal Model provides the *normal baseline* so the simulator can compute the delta between normal and disrupted states.

## Simulation engine

`DisruptionSimulator.run_scenario()` accepts a list of chokepoint IDs and a severity level.

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
| **Rerouting** | Alternative routes avoiding blocked chokepoints, with Δ days and Δ cost | Direct route lookup with blocked-set exclusion ($60,000/day per vessel) |
| **Carrier exposure** | Per-carrier exposure score and daily risk in USD | Weighted chokepoint exposure × routes exposed × severity ($500,000 base risk) |
| **Port congestion** | Baseline → forecast congestion, dwell time increase | Vessel displacement model against baseline dwell ratios |
| **Cascade timeline** | Ordered list of ports with hours-to-impact | BFS on port graph, propagating impact across edges weighted by distance/speed (up to 720h) |

### Entity extraction

The `entity_extractor` maps natural language to structured IDs using three-tier matching:

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

1. **Exact substring match** against alias dictionaries
2. **Fuzzy matching** via `rapidfuzz` (threshold: 75) for typos
3. **Phonetic matching** via custom Metaphone algorithm for phonetic misspellings

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
- Chokepoint markers (glowing pins with pulse animations via instanced meshes)
- Port markers with interactive hover/click
- Route arcs via quadratic Bézier curves (`arc-utils.ts`), with affected routes rendered as animated dashed blue lines
- Interactive: click pins to select, orbit to rotate
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

**Backend**

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn src.provider:app --host 0.0.0.0 --port 8000
```

**Frontend**

```bash
cd frontend
pnpm install
pnpm dev
```

The frontend reads `../.env` automatically via `next.config.ts` and proxies API requests through Next.js API route handlers.

### Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `GEMINI_API_KEY` | Yes | — | Google Gemini API key |
| `GEMINI_MODEL` | No | `gemini-flash-latest` | Gemini model to use |
| `BACKEND_URL` | No | `http://localhost:8000` | Backend URL (used by Next.js API routes) |

## Deployment

| Component | Platform | Trigger |
|---|---|---|
| **Backend** | Hugging Face Spaces (Docker) | Push to `main` with changes in `backend/**`, `Dockerfile`, or `.dockerignore` |
| **Frontend** | Vercel | Push to `main` |

The GitHub Actions workflow (`.github/workflows/deploy-backend.yml`) clones the HF Space repo, copies backend files into it, and pushes. The HF_TOKEN secret must have write access to the Space.

## API endpoints

### Backend (FastAPI)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/v1/chat/stream` | Chat with streaming SSE. Accepts `{messages: [{role, content}]}` |
| `GET` | `/v1/simulate` | Run simulation. Params: `chokepoints`, `severity`, `message` |
| `GET` | `/v1/spatial/ports` | List all ports |
| `GET` | `/v1/spatial/chokepoints` | List all chokepoints |
| `GET` | `/v1/spatial/routes` | List all routes |
| `GET` | `/v1/spatial/port/{id}` | Get single port by ID |
| `GET` | `/v1/spatial/chokepoint/{id}` | Get single chokepoint by ID |
| `GET` | `/v1/spatial/route/{id}` | Get single route by ID |
| `GET` | `/health` | Health check |

### Frontend (Next.js API routes)

| Method | Route | Proxies to |
|---|---|---|
| `POST` | `/api/chat/stream` | `POST /v1/chat/stream` |
| `GET` | `/api/simulate` | `GET /v1/simulate` |
| `GET` | `/api/spatial/ports` | `GET /v1/spatial/ports` |
| `GET` | `/api/spatial/chokepoints` | `GET /v1/spatial/chokepoints` |
| `GET` | `/api/spatial/routes` | `GET /v1/spatial/routes` |

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
