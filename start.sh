#!/usr/bin/env bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "============================================================"
echo "  Starting JalSetu AI Water Crisis Management System"
echo "  Exhibition: AgentX 2026"
echo "============================================================"

# Check Python venv
if [ ! -d "backend/.venv" ]; then
  echo "[1/3] Creating backend virtual environment..."
  python3 -m venv backend/.venv
  backend/.venv/bin/pip install -r backend/requirements.txt
fi

echo "[1/2] Starting FastAPI Backend on http://127.0.0.1:8000..."
(cd backend && PYTHONPATH=. .venv/bin/python run.py) &
BACKEND_PID=$!

cleanup() {
  echo ""
  echo "Shutting down JalSetu servers..."
  kill $BACKEND_PID 2>/dev/null || true
  exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# Wait briefly for backend to initialize
sleep 2

echo "[2/2] Starting Frontend Vite Dev Server..."
echo "------------------------------------------------------------"
echo "  Frontend Dashboard : http://localhost:8080 (or port shown below)"
echo "  Backend REST API   : http://127.0.0.1:8000"
echo "  Swagger API Docs   : http://127.0.0.1:8000/docs"
echo "------------------------------------------------------------"

npm run dev
