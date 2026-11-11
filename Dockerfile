# UrbanSense AI - Production Dockerfile
# Optimized for cloud container deployment on Render, Railway, Fly.io, and Docker Desktop
# Built with CPU-only PyTorch & headless OpenCV for cloud host environments

FROM python:3.11-slim

# System configuration & environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    YOLO_CONFIG_DIR=/tmp \
    DATA_DIR=/app/data \
    PORT=8000 \
    HOST=0.0.0.0

WORKDIR /app

# Install essential system runtime libraries for video decoding, OpenCV, and PyTorch OpenMP
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libglib2.0-0 \
    libgomp1 \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install production Python dependencies (using CPU-only PyTorch wheels to avoid multi-GB CUDA bloat)
COPY requirements-prod.txt .
RUN pip install --no-cache-dir -r requirements-prod.txt

# Copy application source modules
# Note: Heavy model weights (*.pt) and raw videos (*.mp4) are excluded from git.
# In production, models and videos reside in persistent storage (/app/data) or are provisioned via URL.
COPY backend/ ./backend/
COPY ai_engine/ ./ai_engine/
COPY models/ ./models/

# Prepare persistent data structure (mount target for Render persistent disk)
RUN mkdir -p /app/data/videos /app/data/models /tmp \
    && chmod -R 777 /app/data /tmp

EXPOSE 8000

# Container health probe
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/health || exit 1

# Start FastAPI application using exec form so Uvicorn directly handles SIGTERM signals
CMD ["sh", "-c", "exec uvicorn backend.app.main:app --host ${HOST:-0.0.0.0} --port ${PORT:-8000} --workers 1"]
