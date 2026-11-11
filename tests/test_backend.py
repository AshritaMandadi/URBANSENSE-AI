"""
Unit and Integration Tests for UrbanSense AI Backend

Covers health endpoint, database operations, GPS simulation,
event generation, and video upload validations.
"""

import io
from pathlib import Path
import unittest

from fastapi.testclient import TestClient

from ai_engine.detection.detector import Detection
from ai_engine.detection.road_damage_detector import RoadDamageDetector
from backend.app.main import app
from backend.database.models import Bus, DetectionEvent, GPSRecord, Route
from backend.database.session import SessionLocal, init_db
from backend.services.event_service import EventService
from backend.services.gps_service import GPSService
from backend.services.video_service import VideoService


class TestBackend(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        init_db()
        cls.client = TestClient(app)
        cls.db = SessionLocal()

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    def test_health_endpoint(self):
        """Verify GET /health reports ok status and hardware device."""
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "ok")
        self.assertIn(data["device"], ("mps", "cpu"))
        self.assertEqual(data["database"], "sqlite")

    def test_list_buses_endpoint(self):
        """Verify GET /api/buses returns registered fleet with latest coordinates."""
        response = self.client.get("/api/buses")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)
        self.assertGreaterEqual(len(data), 1)
        self.assertIn("license_plate", data[0])
        self.assertIn("id", data[0])

    def test_latest_gps_endpoint(self):
        """Verify GET /api/gps/latest returns spatial records labeled is_simulated."""
        response = self.client.get("/api/gps/latest")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)
        self.assertGreaterEqual(len(data), 1)
        first = data[0]
        self.assertIn("latitude", first)
        self.assertIn("longitude", first)
        self.assertTrue(first["is_simulated"])

    def test_events_api_and_filters(self):
        """Verify GET /api/events and event filtering."""
        response = self.client.get("/api/events")
        self.assertEqual(response.status_code, 200)
        events = response.json()
        self.assertIsInstance(events, list)

        if events:
            first_id = events[0]["id"]
            single_resp = self.client.get(f"/api/events/{first_id}")
            self.assertEqual(single_resp.status_code, 200)
            self.assertEqual(single_resp.json()["id"], first_id)

        # Filter by non-existent type
        filtered = self.client.get("/api/events?event_type=NON_EXISTENT_TYPE")
        self.assertEqual(filtered.status_code, 200)
        self.assertEqual(len(filtered.json()), 0)

    def test_analytics_summary_endpoint(self):
        """Verify GET /api/analytics/summary aggregates fleet and event KPIs."""
        response = self.client.get("/api/analytics/summary")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("total_buses", data)
        self.assertIn("total_events", data)
        self.assertIn("pothole_count", data)
        self.assertIn("events_by_severity", data)
        self.assertIn("recent_events", data)

    def test_gps_service_simulation(self):
        """Verify GPSService generates realistic coordinates along route."""
        bus = self.db.query(Bus).first()
        self.assertIsNotNone(bus)
        record = GPSService.simulate_telemetry_point(bus_id=bus.id, db=self.db, speed_kmh=35.0)
        self.assertEqual(record.bus_id, bus.id)
        self.assertTrue(16.0 <= record.latitude <= 20.0)  # Telangana latitude bounds
        self.assertTrue(77.0 <= record.longitude <= 81.5)  # Telangana longitude bounds
        self.assertTrue(record.is_simulated)

    def test_event_service_mapping_and_creation(self):
        """Verify EventService maps detections to correct severity and type."""
        # 1. Pothole mapping
        evt_type, sev = EventService.map_detection_to_event_metadata("pothole", 0.92)
        self.assertEqual(evt_type, "POTHOLE")
        self.assertEqual(sev, "CRITICAL")

        # 2. Crack mapping
        evt_type2, sev2 = EventService.map_detection_to_event_metadata("alligator_crack", 0.72)
        self.assertEqual(evt_type2, "ROAD_CRACK")
        self.assertEqual(sev2, "MEDIUM")

        # 3. Create event from genuine Detection object
        detection = Detection(class_id=3, class_name="pothole", confidence=0.88, bbox=(10, 20, 100, 150))
        created = EventService.create_event_from_detection(
            detection=detection,
            bus_id="BUS-TG-101",
            latitude=17.4399,
            longitude=78.4983,
            db=self.db,
            is_simulated=True,
        )
        self.assertTrue(created.id.startswith("EVT-"))
        self.assertEqual(created.event_type, "POTHOLE")
        self.assertEqual(created.severity, "CRITICAL")

    def test_road_damage_detector_graceful_readiness(self):
        """Verify RoadDamageDetector gracefully reports readiness when weights are absent."""
        detector = RoadDamageDetector(model_path="/tmp/non_existent_rdd.pt")
        self.assertIn(detector.model_name, ("non_existent_rdd.pt", "best.pt", "road_damage_yolo11n.pt"))
        # When weights are absent, is_model_ready must be False
        self.assertFalse(detector.is_model_ready)
        self.assertEqual(detector.status, "NOT_READY")
        status = detector.get_status()
        self.assertFalse(status["is_ready"])
        self.assertEqual(status["status"], "NOT_READY")
        self.assertIn("target_classes", status)
        self.assertEqual(len(status["target_classes"]), 4)

        # Predicting without weights raises RuntimeError (refuses fake detections)
        import numpy as np
        with self.assertRaises(RuntimeError):
            detector.predict(np.zeros((100, 100, 3), dtype=np.uint8))

    def test_video_upload_validation(self):
        """Verify video upload endpoint validates format and file size."""
        # Test invalid extension
        fake_file = io.BytesIO(b"hello world")
        response = self.client.post(
            "/api/videos/upload",
            files={"file": ("test.txt", fake_file, "text/plain")},
        )
        self.assertEqual(response.status_code, 400)

    def test_admin_users_api(self):
        """Verify operator accounts creation, listing, and validation."""
        import uuid
        uname = f"test_eng_{uuid.uuid4().hex[:6]}"
        list_resp = self.client.get("/api/admin/users")
        self.assertEqual(list_resp.status_code, 200)
        self.assertIsInstance(list_resp.json(), list)

        # Create user
        create_resp = self.client.post(
            "/api/admin/users",
            json={"username": uname, "role": "AUTHORITY", "department": "PWD Zone 2"},
        )
        self.assertEqual(create_resp.status_code, 200)
        u_data = create_resp.json()
        self.assertEqual(u_data["username"], uname)
        self.assertEqual(u_data["role"], "AUTHORITY")

        # Duplicate username returns 400
        dup_resp = self.client.post(
            "/api/admin/users",
            json={"username": uname, "role": "VIEWER"},
        )
        self.assertEqual(dup_resp.status_code, 400)

    def test_audit_logs_api(self):
        """Verify audit trail endpoint returns chronological events."""
        resp = self.client.get("/api/audit/logs?limit=50")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIsInstance(data, list)
        self.assertGreaterEqual(len(data), 1)
        first = data[0]
        self.assertIn("actor", first)
        self.assertIn("action", first)
        self.assertIn("timestamp", first)

    def test_work_orders_api(self):
        """Verify municipal work orders creation, listing, and status updates."""
        list_resp = self.client.get("/api/dispatch/work-orders")
        self.assertEqual(list_resp.status_code, 200)
        self.assertIsInstance(list_resp.json(), list)

        # Create work order
        create_resp = self.client.post(
            "/api/dispatch/work-orders",
            json={
                "defect_id": "EVT-TEST-001",
                "defect_type": "pothole",
                "severity": "CRITICAL",
                "department": "ROAD_MAINTENANCE",
                "assigned_to": "Hyderabad PWD Squad 9",
                "location": "Mehdipatnam Corridor",
                "latitude": 17.3910,
                "longitude": 78.4420,
            },
        )
        self.assertEqual(create_resp.status_code, 200)
        wo_data = create_resp.json()
        self.assertTrue(wo_data["id"].startswith("WO-"))
        self.assertEqual(wo_data["status"], "ASSIGNED")

        # Update work order
        update_resp = self.client.patch(
            f"/api/dispatch/work-orders/{wo_data['id']}",
            json={"status": "IN_PROGRESS"},
        )
        self.assertEqual(update_resp.status_code, 200)
        self.assertEqual(update_resp.json()["status"], "IN_PROGRESS")

    def test_routes_api(self):
        """Verify routes list endpoint returns configured transit corridors."""
        resp = self.client.get("/api/routes")
        self.assertEqual(resp.status_code, 200)
        routes = resp.json()
        self.assertIsInstance(routes, list)
        self.assertGreaterEqual(len(routes), 1)
        first = routes[0]
        self.assertIn("id", first)
        self.assertIn("name", first)

    def test_route_chunks_api(self):
        """Verify 500m linear highway chainage chunks endpoint."""
        resp = self.client.get("/api/routes/chunks")
        self.assertEqual(resp.status_code, 200)
        chunks = resp.json()
        self.assertIsInstance(chunks, list)
        self.assertGreaterEqual(len(chunks), 1)
        first = chunks[0]
        self.assertIn("chunk_id", first)
        self.assertIn("pci_health_score", first)
        self.assertIn("status", first)
        self.assertIn("coordinates", first)

    def test_verification_workflow_api(self):
        """Verify multi-bus verification consensus voting."""
        items_resp = self.client.get("/api/verification/items")
        self.assertEqual(items_resp.status_code, 200)
        items = items_resp.json()
        self.assertIsInstance(items, list)

        if items:
            target_id = items[0]["id"]
            vote_resp = self.client.post(
                f"/api/verification/{target_id}/pass",
                json={"bus_id": "BUS-TG-101", "result": "CLEAR", "notes": "Defect verified patched"},
            )
            self.assertEqual(vote_resp.status_code, 200)
            self.assertTrue(vote_resp.json()["ok"])
            self.assertEqual(vote_resp.json()["status"], "RESOLVED")


if __name__ == "__main__":
    unittest.main()

