"""
UrbanSense AI - Database Session Management
"""

import os
from pathlib import Path
from typing import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from backend.database.models import Base

# Database path in repository data directory or persistent storage (Render disk)
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
data_dir_env = os.getenv("DATA_DIR")
DB_DIR = Path(data_dir_env) if data_dir_env else (REPO_ROOT / "data")
DB_DIR.mkdir(parents=True, exist_ok=True)
SQLITE_DB_PATH = DB_DIR / "urbansense.db"

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{SQLITE_DB_PATH}")

# SQLite specific settings (check_same_thread=False allows multi-thread FastAPI handlers)
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db() -> None:
    """Create all database tables and apply non-destructive schema migrations."""
    Base.metadata.create_all(bind=engine)
    # Ensure camera_channel exists on uploaded_videos
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE uploaded_videos ADD COLUMN camera_channel VARCHAR(50) DEFAULT 'front'"))
            conn.commit()
        except Exception:
            pass  # Already exists or unsupported engine


def get_db() -> Generator[Session, None, None]:
    """FastAPI database session dependency."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

