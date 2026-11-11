# UrbanSense AI - Production Dockerfile
# Optimized for cloud deployment (Render, Railway, Fly.io, Cloud Run)

FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    YOLO_CONFIG_DIR=/tmp \
    PORT=8000 \
    HOST=0.0.0.0

WORKDIR /app

# Install minimal OS dependencies for video processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python production dependencies
COPY requirements-prod.txt .
RUN pip install --no-cache-dir -r requirements-prod.txt

# Copy application codebase
COPY backend/ ./backend/
COPY ai_engine/ ./ai_engine/
COPY models/ ./models/
COPY yolo11n.pt ./yolo11n.pt
COPY data/ ./data/

# Ensure data directory exists with write permissions
RUN mkdir -p /app/data/videos /tmp && chmod -R 777 /app/data /tmp

EXPOSE 8000

# Start FastAPI application with dynamic PORT binding
CMD ["sh", "-c", "uvicorn backend.app.main:app --host ${HOST} --port ${PORT}"]

