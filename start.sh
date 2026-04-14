#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

log()  { echo -e "${CYAN}[INFO]${RESET}  $*"; }
warn() { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
ok()   { echo -e "${GREEN}[OK]${RESET}    $*"; }
err()  { echo -e "${RED}[ERROR]${RESET} $*"; }

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
VENV_DIR="$BACKEND_DIR/venv"
ENV_FILE="$PROJECT_ROOT/.env"

BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
    echo ""
    log "Shutting down..."
    [ -n "$BACKEND_PID" ] && kill "$BACKEND_PID" 2>/dev/null && ok "Backend stopped"
    [ -n "$FRONTEND_PID" ] && kill "$FRONTEND_PID" 2>/dev/null && ok "Frontend stopped"
    wait 2>/dev/null
    log "Done."
    exit 0
}
trap cleanup SIGINT SIGTERM

# ──────────────────────────────────────────────
#  Pre-flight checks
# ──────────────────────────────────────────────

log "${BOLD}Running pre-flight checks...${RESET}"

# 1) .env file
if [ ! -f "$ENV_FILE" ]; then
    err ".env file not found at $ENV_FILE"
    if [ -f "$PROJECT_ROOT/.env.example" ]; then
        log "Creating .env from .env.example..."
        cp "$PROJECT_ROOT/.env.example" "$ENV_FILE"
        warn "GEMINI_API_KEY is empty — set it in .env before using LLM features."
    else
        err "No .env.example found either. Create .env manually."
        exit 1
    fi
else
    ok ".env file present"
fi

# 2) GEMINI_API_KEY
if grep -q '^GEMINI_API_KEY=$' "$ENV_FILE" 2>/dev/null || \
   grep -q '^GEMINI_API_KEY="$' "$ENV_FILE" 2>/dev/null; then
    warn "GEMINI_API_KEY is empty in .env — LLM streaming will not work."
fi

# 3) Python
if ! command -v python3 &>/dev/null; then
    err "python3 is not installed or not on PATH."
    exit 1
fi
PYTHON_VERSION=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
ok "python3 found ($PYTHON_VERSION)"

# 4) Virtual environment
if [ ! -d "$VENV_DIR" ]; then
    log "Virtual environment not found. Creating one..."
    python3 -m venv "$VENV_DIR"
    ok "Virtual environment created at $VENV_DIR"
else
    ok "Virtual environment found at $VENV_DIR"
fi

# 5) Install backend dependencies
source "$VENV_DIR/bin/activate"
PIP_OUTDATED=$(pip3 list --outdated 2>/dev/null | head -1 || true)

if [ ! -f "$VENV_DIR/.deps_installed" ] || \
   [ "$PROJECT_ROOT/backend/requirements.txt" -nt "$VENV_DIR/.deps_installed" ]; then
    log "Installing backend dependencies..."
    pip3 install -r "$BACKEND_DIR/requirements.txt" --quiet
    touch "$VENV_DIR/.deps_installed"
    ok "Backend dependencies installed"
else
    ok "Backend dependencies up to date"
fi

# 6) pnpm (frontend package manager)
if ! command -v pnpm &>/dev/null; then
    err "pnpm is not installed. Install it: npm install -g pnpm"
    exit 1
fi
ok "pnpm found ($(pnpm --version))"

# 7) Frontend node_modules
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    log "Installing frontend dependencies..."
    (cd "$FRONTEND_DIR" && pnpm install)
    ok "Frontend dependencies installed"
else
    ok "Frontend dependencies present"
fi

# 8) Backend data directory
if [ ! -d "$BACKEND_DIR/data" ]; then
    warn "backend/data/ directory not found — the world model may fail to load."
fi

echo ""
log "${BOLD}All checks passed. Starting services...${RESET}"
echo ""

# ──────────────────────────────────────────────
#  Start Backend
# ──────────────────────────────────────────────

log "Starting backend on http://localhost:8000 ..."
cd "$BACKEND_DIR"
python3 -m uvicorn src.provider:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd "$PROJECT_ROOT"

sleep 2

if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    err "Backend failed to start. Check the logs above."
    exit 1
fi
ok "Backend running (PID $BACKEND_PID) at http://localhost:8000"

# ──────────────────────────────────────────────
#  Start Frontend
# ──────────────────────────────────────────────

log "Starting frontend on http://localhost:3000 ..."
cd "$FRONTEND_DIR"
pnpm dev &
FRONTEND_PID=$!
cd "$PROJECT_ROOT"

sleep 3

if ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
    err "Frontend failed to start. Check the logs above."
    kill "$BACKEND_PID" 2>/dev/null
    exit 1
fi
ok "Frontend running (PID $FRONTEND_PID) at http://localhost:3000"

echo ""
log "${BOLD}Both services are running:${RESET}"
log "  Backend  → http://localhost:8000"
log "  Frontend → http://localhost:3000"
log "  Press Ctrl+C to stop both."
echo ""

wait