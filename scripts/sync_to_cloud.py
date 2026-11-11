#!/usr/bin/env python3
"""
UrbanSense AI - Local Processing to Cloud Sync Utility

Enables zero-cost hybrid architecture:
1. Heavy YOLO11n AI video inference runs locally on Apple Silicon Mac (Apple MPS).
2. Detections, telemetry coordinates, and annotated clips are synced to the
   zero-cost cloud backend (Render Free Tier) via standard REST APIs.

Usage:
    python scripts/sync_to_cloud.py --cloud-url https://urbansense-backend.onrender.com
    python scripts/sync_to_cloud.py --cloud-url http://localhost:8000 --dry-run
"""

import argparse
import json
import logging
import os
from pathlib import Path
import sys
import time

try:
    import requests
except ImportError:
    print("Error: 'requests' package required. Install via 'pip install requests'.", file=sys.stderr)
    sys.exit(1)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("urbansense.sync")

REPO_ROOT = Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))


def check_cloud_health(cloud_url: str) -> dict:
    """Verify that cloud backend is reachable and query its operational mode."""
    health_url = f"{cloud_url.rstrip('/')}/health"
    logger.info(f"Checking cloud backend health at {health_url}...")
    try:
        resp = requests.get(health_url, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        logger.info(f"Cloud backend online: status='{data.get('status')}', version='{data.get('version')}', device='{data.get('device')}'")
        return data
    except Exception as err:
        logger.error(f"Failed to connect to cloud backend: {err}")
        raise


def sync_local_events(cloud_url: str, dry_run: bool = False, limit: int = 50) -> int:
    """Sync locally detected events to the cloud backend."""
    from backend.database.session import SessionLocal
    from backend.database.models import DetectionEvent

    db = SessionLocal()
    try:
        events = db.query(DetectionEvent).order_by(DetectionEvent.timestamp.desc()).limit(limit).all()
        logger.info(f"Found {len(events)} local detection events to sync.")

        if dry_run:
            logger.info("[DRY RUN] Skipping actual HTTP POST.")
            return len(events)

        sync_url = f"{cloud_url.rstrip('/')}/api/events/sync"
        payload = [
            {
                "bus_id": ev.bus_id,
                "event_type": ev.event_type,
                "severity": ev.severity,
                "latitude": ev.latitude,
                "longitude": ev.longitude,
                "detection_class": ev.detection_class,
                "confidence": ev.confidence,
                "bbox_x1": ev.bbox_x1,
                "bbox_y1": ev.bbox_y1,
                "bbox_x2": ev.bbox_x2,
                "bbox_y2": ev.bbox_y2,
                "video_source": ev.video_source,
                "is_simulated": ev.is_simulated,
                "timestamp": ev.timestamp.isoformat() if ev.timestamp else None,
            }
            for ev in events
        ]

        resp = requests.post(sync_url, json=payload, timeout=20)
        resp.raise_for_status()
        synced_data = resp.json()
        logger.info(f"Successfully synced {len(synced_data)} events to cloud backend at {sync_url}.")
        return len(synced_data)
    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(description="UrbanSense AI Local-to-Cloud Sync")
    parser.add_argument("--cloud-url", required=True, help="Base URL of deployed Render backend")
    parser.add_argument("--dry-run", action="store_true", help="Simulate sync without uploading")
    parser.add_argument("--limit", type=int, default=50, help="Maximum events to sync")
    args = parser.parse_args()

    cloud_url = args.cloud_url.rstrip("/")
    try:
        check_cloud_health(cloud_url)
        sync_local_events(cloud_url, dry_run=args.dry_run, limit=args.limit)
        logger.info("Local-to-cloud synchronization complete.")
    except Exception as e:
        logger.error(f"Sync process aborted: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()

