"""
UrbanSense AI - Specialized Road Damage Model Integration Tests

Tests model loading from environment variable, default expected path,
readiness reporting, exact 4-class mapping, detection output format,
video pipeline integration, and rejection of fake detections when weights are missing.
"""

from datetime import datetime, timezone
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient
import numpy as np
import torch

from ai_engine.detection.detector import Detection
from ai_engine.detection.road_damage_detector import (
    ROAD_DAMAGE_CLASSES,
    RoadDamageDetector,
    resolve_road_damage_model_path,
)
from backend.app.main import app
from backend.database.models import DetectionEvent, UploadedVideo
from backend.database.session import SessionLocal, init_db
from backend.services.video_service import VideoService


class TestRoadDamageIntegration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        cls.client = TestClient(app)
        cls.db = SessionLocal()

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    def test_default_expected_model_path(self):
        """Verify default model path resolves to models/road_damage/best.pt."""
        with patch.dict(os.environ, {}, clear=True):
            resolved = resolve_road_damage_model_path()
            self.assertTrue(resolved.endswith("models/road_damage/best.pt"))

    def test_env_var_model_path_override(self):
        """Verify ROAD_DAMAGE_MODEL_PATH environment variable overrides default path."""
        custom_path = "/tmp/custom_models/road_damage_best.pt"
        with patch.dict(os.environ, {"ROAD_DAMAGE_MODEL_PATH": custom_path}):
            resolved = resolve_road_damage_model_path()
            self.assertEqual(resolved, str(Path(custom_path).resolve()))

    def test_missing_model_weights_status_not_ready(self):
        """Verify detector reports NOT_READY and refuses inference when weights are absent."""
        detector = RoadDamageDetector(model_path="/tmp/definitely_non_existent_weights.pt")
        self.assertFalse(detector.is_model_ready)
        self.assertEqual(detector.status, "NOT_READY")
        self.assertIsNotNone(detector.loading_error)
        self.assertIn("not found", detector.loading_error.lower())

        status = detector.get_status()
        self.assertFalse(status["is_ready"])
        self.assertEqual(status["status"], "NOT_READY")
        self.assertEqual(status["model_name"], "definitely_non_existent_weights.pt")

        # Refuses prediction and produces zero fake detections
        with self.assertRaises(RuntimeError) as ctx:
            detector.predict(np.zeros((640, 640, 3), dtype=np.uint8))
        self.assertIn("NOT_READY", str(ctx.exception))

    def test_exact_four_class_mapping(self):
        """Verify strict 4-class taxonomy without silent remapping."""
        detector = RoadDamageDetector()
        classes = detector.supported_classes

        self.assertEqual(len(classes), 4)
        self.assertEqual(classes[0], "longitudinal_crack")
        self.assertEqual(classes[1], "transverse_crack")
        self.assertEqual(classes[2], "alligator_crack")
        self.assertEqual(classes[3], "pothole")

        # Verify global taxonomy matches
        self.assertEqual(ROAD_DAMAGE_CLASSES[0], "longitudinal_crack")
        self.assertEqual(ROAD_DAMAGE_CLASSES[1], "transverse_crack")
        self.assertEqual(ROAD_DAMAGE_CLASSES[2], "alligator_crack")
        self.assertEqual(ROAD_DAMAGE_CLASSES[3], "pothole")

    def test_detection_output_structure_and_timestamp(self):
        """Verify Detection dataclass supports class_id, class_name, confidence, bbox, frame_number, timestamp."""
        det = Detection(
            class_id=3,
            class_name="pothole",
            confidence=0.9125,
            bbox=(120, 350, 480, 520),
            frame_number=45,
            timestamp=1.800,
        )
        self.assertEqual(det.class_id, 3)
        self.assertEqual(det.class_name, "pothole")
        self.assertEqual(det.confidence, 0.9125)
        self.assertEqual(det.bbox, (120, 350, 480, 520))
        self.assertEqual(det.frame_number, 45)
        self.assertEqual(det.timestamp, 1.800)

    def test_health_endpoint_road_damage_status(self):
        """Verify GET /health includes road damage model readiness and error info."""
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertIn("road_damage_model", data)
        rdd_info = data["road_damage_model"]
        self.assertIn(rdd_info["status"], ("READY", "NOT_READY"))
        self.assertIn("is_ready", rdd_info)
        self.assertIn("model_path", rdd_info)
        self.assertIn("supported_classes", rdd_info)
        self.assertEqual(len(rdd_info["supported_classes"]), 4)

    def test_dedicated_road_damage_status_endpoint(self):
        """Verify GET /api/models/road-damage/status returns full diagnostics."""
        response = self.client.get("/api/models/road-damage/status")
        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertIn("status", data)
        self.assertIn("is_ready", data)
        self.assertIn("model_name", data)
        self.assertIn("model_path", data)
        self.assertIn("supported_classes", data)

    def test_video_processing_with_road_damage_when_not_ready_fails_cleanly(self):
        """Verify video processing with detector_type='road_damage' rejects execution when weights are absent."""
        # Find or create a video record in DB
        video = self.db.query(UploadedVideo).first()
        if not video:
            video = UploadedVideo(
                id="VID-TEST-RDD",
                filename="test_rdd.mp4",
                file_path="data/sample/sample_road_test.mp4",
                file_size_bytes=1000,
                uploaded_at=datetime.now(timezone.utc),
            )
            self.db.add(video)
            self.db.commit()

        # Count events before attempt
        initial_events = self.db.query(DetectionEvent).count()

        # Trigger processing with road_damage detector when weights are absent
        with patch.dict(os.environ, {"ROAD_DAMAGE_MODEL_PATH": "/tmp/definitely_non_existent_weights.pt"}):
            response = self.client.post(
                f"/api/videos/{video.id}/process?detector_type=road_damage&conf_threshold=0.25&frame_stride=2"
            )
            # Must fail with 400 Bad Request because model is NOT_READY
            self.assertEqual(response.status_code, 400)
            detail = response.json()["detail"]
            self.assertIn("NOT_READY", detail)

        # Confirm zero fake events were created
        after_events = self.db.query(DetectionEvent).count()
        self.assertEqual(initial_events, after_events)

    def test_road_damage_model_ready_when_weights_present(self):
        """Verify RoadDamageDetector is READY and functional when weights exist."""
        weights_path = Path("models/road_damage/best.pt")
        if not weights_path.is_file():
            self.skipTest("models/road_damage/best.pt not present")

        detector = RoadDamageDetector()
        self.assertTrue(detector.is_model_ready)
        self.assertEqual(detector.status, "READY")
        self.assertIsNone(detector.loading_error)
        self.assertEqual(len(detector.supported_classes), 4)

        # Blank frame should produce 0 detections without error
        blank = np.zeros((480, 640, 3), dtype=np.uint8)
        dets = detector.predict(blank)
        self.assertIsInstance(dets, list)
        self.assertEqual(len(dets), 0)


if __name__ == "__main__":
    unittest.main()

