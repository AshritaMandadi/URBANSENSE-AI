"""
UrbanSense AI - FastAPI Application Entry Point

AI-Powered Mobile Urban Intelligence Platform Using Public Transport Fleet (SIH26124)
"""

from contextlib import asynccontextmanager
import logging
import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from backend.api.routes import router
from backend.database.seed import seed_database
from backend.database.session import init_db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("urbansense")

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
FRONTEND_DIST = REPO_ROOT / "frontend" / "dist"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown hooks."""
    logger.info("Initializing UrbanSense AI database and fleet telemetry...")
    init_db()
    seed_database()
    logger.info("UrbanSense AI backend ready.")
    yield
    logger.info("UrbanSense AI backend shutting down.")


app = FastAPI(
    title="UrbanSense AI Platform",
    description="Mobile Urban Intelligence Platform using Public Transport Fleets (SIH26124)",
    version="0.2.0",
    lifespan=lifespan,
)

# Configurable CORS Origins supporting local development and deployed Vercel domains
cors_origins_env = os.getenv("CORS_ORIGINS", "")
if cors_origins_env:
    allow_origins = [orig.strip() for orig in cors_origins_env.split(",") if orig.strip()]
else:
    allow_origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]

# Default regex allows any Vercel preview or production deployment (*.vercel.app)
cors_origin_regex = os.getenv("CORS_ORIGIN_REGEX", r"^https://.*\.vercel\.app$")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_origin_regex=cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Range", "Accept-Ranges", "Content-Length", "Content-Type"],
)

# Include core REST API routes
app.include_router(router)

# Mount frontend production build if available
if FRONTEND_DIST.is_dir() and (FRONTEND_DIST / "assets").is_dir():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    @app.get("/")
    def serve_dashboard():
        """Serve compiled React SPA dashboard."""
        return FileResponse(FRONTEND_DIST / "index.html")
else:
    @app.get("/")
    def root_info():
        return {
            "project": "UrbanSense AI",
            "title": "AI-Powered Mobile Urban Intelligence Platform Using Public Transport Fleet",
            "problem_statement": "SIH26124",
            "organization": "Bharat Electronics Limited",
            "docs_url": "/docs",
            "health_check": "/health",
        }


if __name__ == "__main__":
    import uvicorn
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    reload = os.getenv("RELOAD", "false").lower() in ("true", "1")
    uvicorn.run("backend.app.main:app", host=host, port=port, reload=reload)
