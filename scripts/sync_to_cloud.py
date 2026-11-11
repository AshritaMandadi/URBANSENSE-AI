#!/usr/bin/env python3
"""
UrbanSense AI - Local Processing to Cloud Sync Utility

Enables zero-cost hybrid architecture:
1. Heavy YOLO11n AI video inference runs locally on Apple Silicon Mac (Apple MPS).
2. Detections, telemetry coordinates, and annotated clips are synced to the
   zero-cost cloud backend (Render Free Tier) via authenticated REST APIs.

Security & Deduplication:
- Authenticates using SYNC_API_TOKEN (--token flag or SYNC_API_TOKEN env var).
- Passes unique event IDs so repeat synchronizations do NOT create duplicates.
- Read-only on local database: never modifies or deletes local datasets.

Usage:
    python scripts/sync_to_cloud.py --cloud-url https://urbansense-backend-free.onrender.com --token my_secret_token
    python scripts/sync_to_cloud.py --cloud-url http://localhost:8000 --dry-run
"""

import argparse
import json
import logging
import os
from pathlib import Path
import sys
import time
from typing import Optional

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
        logger.info(
            f"Cloud backend online: status='{data.get('status')}', "
            f"device='{data.get('device')}', database='{data.get('database')}'"
        )
        return data
    except requests.exceptions.ConnectionError:
        logger.error(f"Cannot reach cloud backend at {health_url}. Is the service running or waking up?")
        raise
    except Exception as err:
        logger.error(f"Failed to connect to cloud backend: {err}")
        raise


def sync_local_events(
    cloud_url: str,
    token: Optional[str] = None,
    dry_run: bool = False,
    limit: int = 50,
) -> int:
    """
    Sync locally detected events to the cloud backend.
    Preserves local database integrity (pure read-only).
    """
    from backend.database.session import SessionLocal
    from backend.database.models import DetectionEvent

    db = SessionLocal()
    try:
        events = db.query(DetectionEvent).order_by(DetectionEvent.timestamp.desc()).limit(limit).all()
        logger.info(f"Read {len(events)} local detection events from local database.")

        if not events:
            logger.info("No local detection events found to sync.")
            return 0

        if dry_run:
            logger.info("[DRY RUN] Skipping actual HTTP POST. Events are ready for sync.")
            return len(events)

        sync_url = f"{cloud_url.rstrip('/')}/api/events/sync"
        payload = [
            {
                "id": ev.id,
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

        headers = {"Content-Type": "application/json"}
        if token:
            headers["X-Sync-Token"] = token
            headers["Authorization"] = f"Bearer {token}"

        resp = requests.post(sync_url, json=payload, headers=headers, timeout=25)

        if resp.status_code == 401:
            logger.error(
                "Authentication failed (HTTP 401): Invalid or missing sync token. "
                "Provide a valid token using --token or export SYNC_API_TOKEN."
            )
            resp.raise_for_status()

        if resp.status_code == 403:
            logger.error(
                "Forbidden (HTTP 403): The cloud server requires SYNC_API_TOKEN to be configured "
                "in its environment variables before accepting remote event synchronization."
            )
            resp.raise_for_status()

        resp.raise_for_status()
        synced_data = resp.json()
        logger.info(
            f"Successfully synchronized {len(synced_data)} events to cloud backend at {sync_url} (HTTP {resp.status_code} OK)."
        )
        return len(synced_data)
    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(description="UrbanSense AI Local-to-Cloud Sync")
    parser.add_argument("--cloud-url", required=True, help="Base URL of deployed Render backend")
    parser.add_argument(
        "--token",
        default=os.getenv("SYNC_API_TOKEN"),
        help="Secret API token for authenticating with cloud backend (can also use SYNC_API_TOKEN env var)",
    )
    parser.add_argument("--dry-run", action="store_true", help="Simulate sync without uploading")
    parser.add_argument("--limit", type=int, default=50, help="Maximum events to sync (default: 50)")
    args = parser.parse_args()

    cloud_url = args.cloud_url.rstrip("/")
    try:
        check_cloud_health(cloud_url)
        synced = sync_local_events(
            cloud_url=cloud_url,
            token=args.token,
            dry_run=args.dry_run,
            limit=args.limit,
        )
        logger.info(f"Local-to-cloud synchronization completed successfully ({synced} events verified).")
    except Exception as e:
        logger.error(f"Sync process aborted: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
