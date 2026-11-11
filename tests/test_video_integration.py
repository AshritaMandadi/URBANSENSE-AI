"""
End-to-End Integration Test for Video Ingestion, YOLO Processing, and Event Generation
"""

from pathlib import Path
import tempfile
import unittest

from fastapi.testclient import TestClient

from backend.app.main import app
from backend.database.models import ProcessingJob, UploadedVideo
from backend.database.session import SessionLocal, init_db
from tests.test_video_processing import create_synthetic_test_video


class TestVideoIntegration(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        init_db()
        cls.client = TestClient(app)
        cls.db = SessionLocal()
        cls.test_dir = Path(tempfile.mkdtemp(prefix="urbansense_integration_"))

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    def test_upload_and_process_pipeline(self):
        """Verify video upload, metadata extraction, YOLO processing, and event generation."""
        # 1. Create temporary synthetic video (10 frames)
        raw_video = self.test_dir / "route_camera_sample.mp4"
        create_synthetic_test_video(raw_video, num_frames=10, width=320, height=240, fps=10.0)

        # 2. Upload video via API
        with open(raw_video, "rb") as f:
            upload_resp = self.client.post(
                "/api/videos/upload",
                files={"file": ("route_camera_sample.mp4", f, "video/mp4")},
                data={"bus_id": "BUS-TG-101"},
            )

        self.assertEqual(upload_resp.status_code, 200)
        video_data = upload_resp.json()
        video_id = video_data["id"]
        self.assertTrue(video_id.startswith("VID-"))
        self.assertEqual(video_data["bus_id"], "BUS-TG-101")
        self.assertEqual(video_data["frame_count"], 10)

        # 3. List uploaded videos
        list_resp = self.client.get("/api/videos")
        self.assertEqual(list_resp.status_code, 200)
        vids = list_resp.json()
        self.assertTrue(any(v["id"] == video_id for v in vids))

        # 4. Trigger video processing
        proc_resp = self.client.post(
            f"/api/videos/{video_id}/process?conf_threshold=0.25&frame_stride=2"
        )
        self.assertEqual(proc_resp.status_code, 200)
        job_data = proc_resp.json()
        self.assertEqual(job_data["status"], "COMPLETED")
        self.assertIsNotNone(job_data["annotated_video_path"])

        # 5. Stream original video (with HTTP 206 Range request & HEAD request)
        orig_head_resp = self.client.head(f"/api/videos/{video_id}/stream")
        self.assertEqual(orig_head_resp.status_code, 200)
        self.assertEqual(orig_head_resp.headers.get("accept-ranges"), "bytes")
        self.assertIsNotNone(orig_head_resp.headers.get("content-length"))

        orig_full_resp = self.client.get(f"/api/videos/{video_id}/stream")
        self.assertEqual(orig_full_resp.status_code, 200)
        self.assertIsNone(orig_full_resp.headers.get("content-range"))

        orig_stream_resp = self.client.get(
            f"/api/videos/{video_id}/stream",
            headers={"Range": "bytes=0-100"},
        )
        self.assertEqual(orig_stream_resp.status_code, 206)
        self.assertEqual(orig_stream_resp.headers.get("content-type"), "video/mp4")
        self.assertIn("bytes 0-100/", orig_stream_resp.headers.get("content-range", ""))

        # 6. Fetch annotated video (with HTTP 206 Range request & HEAD request)
        ann_head_resp = self.client.head(f"/api/videos/{video_id}/annotated")
        self.assertEqual(ann_head_resp.status_code, 200)
        self.assertEqual(ann_head_resp.headers.get("accept-ranges"), "bytes")
        self.assertIsNotNone(ann_head_resp.headers.get("content-length"))

        stream_resp = self.client.get(
            f"/api/videos/{video_id}/annotated",
            headers={"Range": "bytes=0-100"},
        )
        self.assertEqual(stream_resp.status_code, 206)
        self.assertEqual(stream_resp.headers.get("content-type"), "video/mp4")
        self.assertIn("bytes 0-100/", stream_resp.headers.get("content-range", ""))

        # 7. Verify list_videos reports latest_job_status and has_annotated
        list_after = self.client.get("/api/videos").json()
        target_vid = next(v for v in list_after if v["id"] == video_id)
        self.assertEqual(target_vid["latest_job_status"], "COMPLETED")
        self.assertTrue(target_vid["has_annotated"])

        # 8. Clean up test video record so it does not pollute the production UI with a 1-second synthetic fixture
        video_rec = self.db.query(UploadedVideo).filter(UploadedVideo.id == video_id).first()
        if video_rec:
            self.db.delete(video_rec)
            self.db.commit()


if __name__ == "__main__":
    unittest.main()

