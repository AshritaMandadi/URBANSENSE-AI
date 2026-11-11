"""
UrbanSense AI - Tests for Sync API Endpoint and Deduplication
"""

from datetime import datetime, timezone
import os
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from backend.app.main import app
from backend.database.models import DetectionEvent
from backend.database.session import SessionLocal


class TestSyncAPI(unittest.TestCase):
    def setUp(self):
        self.db = SessionLocal()

    def tearDown(self):
        self.db.close()

    def test_sync_token_authentication(self):
        """Verify token authentication for sync endpoint."""
        with patch.dict(os.environ, {"SYNC_API_TOKEN": "secret_test_token_123"}, clear=False):
            with TestClient(app) as client:
                event_payload = [
                    {
                        "id": "EVT-TEST-SYNC-01",
                        "event_type": "POTHOLE",
                        "detection_class": "pothole",
                        "confidence": 0.92,
                        "bbox_x1": 100,
                        "bbox_y1": 150,
                        "bbox_x2": 250,
                        "bbox_y2": 300,
                        "bus_id": "BUS-TG-101",
                        "latitude": 17.442,
                        "longitude": 78.384,
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    }
                ]

                # 1. Unauthenticated request -> 401 Unauthorized
                res = client.post("/api/events/sync", json=event_payload)
                self.assertEqual(res.status_code, 401)

                # 2. Invalid token -> 401 Unauthorized
                res = client.post(
                    "/api/events/sync",
                    json=event_payload,
                    headers={"X-Sync-Token": "wrong_token"},
                )
                self.assertEqual(res.status_code, 401)

                # 3. Valid token via X-Sync-Token -> 200 OK
                res = client.post(
                    "/api/events/sync",
                    json=event_payload,
                    headers={"X-Sync-Token": "secret_test_token_123"},
                )
                self.assertEqual(res.status_code, 200)
                data = res.json()
                self.assertEqual(len(data), 1)
                self.assertEqual(data[0]["id"], "EVT-TEST-SYNC-01")

                # 4. Valid token via Authorization: Bearer -> 200 OK
                res = client.post(
                    "/api/events/sync",
                    json=event_payload,
                    headers={"Authorization": "Bearer secret_test_token_123"},
                )
                self.assertEqual(res.status_code, 200)

    def test_sync_deduplication(self):
        """Verify that retrying sync with existing events does NOT create duplicates."""
        with patch.dict(os.environ, {"SYNC_API_TOKEN": ""}, clear=False):
            with TestClient(app) as client:
                initial_count = self.db.query(DetectionEvent).count()

                test_event_id = "EVT-DEDUP-UNIQUE-01"
                # Clean up if exists from prior run
                self.db.query(DetectionEvent).filter(DetectionEvent.id == test_event_id).delete()
                self.db.commit()

                event_payload = [
                    {
                        "id": test_event_id,
                        "event_type": "POTHOLE",
                        "detection_class": "pothole",
                        "confidence": 0.85,
                        "bbox_x1": 50,
                        "bbox_y1": 80,
                        "bbox_x2": 150,
                        "bbox_y2": 180,
                        "bus_id": "BUS-TG-201",
                        "latitude": 17.500,
                        "longitude": 78.400,
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    }
                ]

                # First sync
                res1 = client.post("/api/events/sync", json=event_payload)
                self.assertEqual(res1.status_code, 200)

                count_after_first = self.db.query(DetectionEvent).filter(DetectionEvent.id == test_event_id).count()
                self.assertEqual(count_after_first, 1)

                # Retry sync (identical event)
                res2 = client.post("/api/events/sync", json=event_payload)
                self.assertEqual(res2.status_code, 200)

                count_after_retry = self.db.query(DetectionEvent).filter(DetectionEvent.id == test_event_id).count()
                # Must STILL be exactly 1 (no duplicate inserted)
                self.assertEqual(count_after_retry, 1)

                # Clean up
                self.db.query(DetectionEvent).filter(DetectionEvent.id == test_event_id).delete()
                self.db.commit()


if __name__ == "__main__":
    unittest.main()
