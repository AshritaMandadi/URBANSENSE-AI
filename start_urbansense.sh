#!/usr/bin/env bash
# ==============================================================================
# UrbanSense AI - Demonstration Startup Script
# AI-Powered Mobile Urban Intelligence Platform (SIH26124)
# Optimized for Apple Silicon Mac (8 GB RAM)
# ==============================================================================

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${REPO_ROOT}"

echo "=================================================================="
echo "          Starting UrbanSense AI Demonstration Platform           "
echo "  Theme Based Project VI Sem • Bharat Electronics Limited (BEL)   "
echo "=================================================================="

# 1. Check Python virtual environment
VENV_PYTHON="${REPO_ROOT}/.venv/bin/python"
VENV_UVICORN="${REPO_ROOT}/.venv/bin/uvicorn"

if [ ! -f "${VENV_PYTHON}" ] || [ ! -f "${VENV_UVICORN}" ]; then
    echo "[-] Error: Python virtual environment not found at ${REPO_ROOT}/.venv"
    echo "    Please create it using: python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt"
    exit 1
fi

# 2. Check Road Damage Model Checkpoint
if [ -f "${REPO_ROOT}/models/road_damage/best.pt" ]; then
    echo "[+] Custom Road Damage Model: FOUND (models/road_damage/best.pt)"
else
    echo "[!] Notice: Custom Road Damage Model weights not found at models/road_damage/best.pt"
    echo "    The platform will start with RoadDamageDetector in NOT_READY state."
fi

# 3. Check and build frontend if dist missing
if [ ! -d "${REPO_ROOT}/frontend/dist" ]; then
    echo "[*] Frontend production build missing. Building with Vite..."
    (cd "${REPO_ROOT}/frontend" && npm run build)
fi

# 4. Check if port 8000 is already running
PORT_CHECK=$("${VENV_PYTHON}" -c "
import socket
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
res = s.connect_ex(('127.0.0.1', 8000))
s.close()
print('BUSY' if res == 0 else 'FREE')
")

if [ "${PORT_CHECK}" = "BUSY" ]; then
    echo "[!] Warning: Port 8000 is already in use by an active service."
    echo "    UrbanSense AI may already be running."
    echo "    Access the dashboard at: http://localhost:8000/"
    echo "    To stop the running process, run: lsof -ti :8000 | xargs kill -9"
    exit 0
fi

# 5. Launch FastAPI backend
echo "[*] Initializing UrbanSense AI backend on http://127.0.0.1:8000..."
echo "[*] Direct Dashboard & API integrated on port 8000 (Low RAM Mode for 8 GB Mac)"
echo ""
echo "=================================================================="
echo " Application URLs:"
echo "   • Full Interactive Dashboard: http://localhost:8000/"
echo "   • Interactive API Docs (Swagger): http://localhost:8000/docs"
echo "   • Health & Device Diagnostics: http://localhost:8000/health"
echo "   • Road Damage Model Status: http://localhost:8000/api/models/road-damage/status"
echo "=================================================================="
echo "Press Ctrl+C to stop the application."
echo ""

export PYTHONPATH="${REPO_ROOT}"
exec "${VENV_UVICORN}" backend.app.main:app --host 127.0.0.1 --port 8000

