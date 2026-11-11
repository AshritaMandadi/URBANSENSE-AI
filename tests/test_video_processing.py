"""
Tests for UrbanSense AI - Video Processing Subsystem

Covers input validation, detector behavior, video metadata extraction,
frame-by-frame streaming processing, and JSON summary generation.
"""

import json
from pathlib import Path
import shutil
import tempfile
import unittest

import cv2
import numpy as np

from ai_engine.detection.detector import GeneralObjectDetector, Detection
from ai_engine.video_processing.video_processor import (
    VideoProcessor,
    VideoProcessingSummary,
    annotate_frame,
)


def create_synthetic_test_video(
    output_path: Path,
    num_frames: int = 15,
    width: int = 320,
    height: int = 240,
    fps: float = 15.0,
) -> Path:
    """
    Generate a simple synthetic video file for pipeline testing.
    Uses basic moving geometric patterns to test video read/write mechanics.
    """
    output_path.parent.mkdir(parents=True, exist_ok=True)
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(str(output_path), fourcc, fps, (width, height))

    if not writer.isOpened():
        raise RuntimeError(f"Could not open VideoWriter for test fixture at {output_path}")

    try:
        for i in range(num_frames):
            # Create a blank frame with a moving rectangle
            frame = np.zeros((height, width, 3), dtype=np.uint8)
            x_pos = int((i / num_frames) * (width - 60))
            cv2.rectangle(frame, (x_pos, 40), (x_pos + 50, 100), (120, 120, 120), -1)
            writer.write(frame)
    finally:
        writer.release()

    return output_path


class TestVideoProcessing(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        # Create a single detector instance to reuse across tests
        cls.detector = GeneralObjectDetector()
        cls.test_dir = Path(tempfile.mkdtemp(prefix="urbansense_test_"))

    @classmethod
    def tearDownClass(cls):
        # Clean up temporary test files
        if cls.test_dir.exists():
            shutil.rmtree(cls.test_dir)

    def test_detector_attributes(self):
        """Verify detector reports correct model name and device."""
        self.assertEqual(self.detector.model_name, "yolo11n.pt")
        self.assertIn(self.detector.device, ("mps", "cpu"))

    def test_detector_invalid_input(self):
        """Verify detector rejects non-numpy or malformed frames."""
        with self.assertRaises(ValueError):
            self.detector.predict(None)  # type: ignore

        with self.assertRaises(ValueError):
            self.detector.predict(np.zeros((10, 10)))  # 2D instead of 3D

        with self.assertRaises(ValueError):
            self.detector.predict(np.zeros((0, 0, 3)))  # Empty array

    def test_detector_blank_frame(self):
        """Verify detector on a blank frame returns an empty list without fabricating detections."""
        blank = np.zeros((240, 320, 3), dtype=np.uint8)
        results = self.detector.predict(blank, conf_threshold=0.25)
        self.assertIsInstance(results, list)
        self.assertEqual(len(results), 0)

    def test_annotate_frame(self):
        """Verify frame annotation draws bounding boxes and text without altering dimensions."""
        frame = np.zeros((240, 320, 3), dtype=np.uint8)
        detections = [
            Detection(class_id=2, class_name="car", confidence=0.88, bbox=(20, 30, 100, 120)),
            Detection(class_id=0, class_name="person", confidence=0.75, bbox=(150, 50, 200, 180)),
        ]
        annotated = annotate_frame(frame, detections)
        self.assertEqual(annotated.shape, frame.shape)
        # Verify annotated frame contains drawn non-zero pixels
        self.assertTrue(np.any(annotated > 0))

    def test_invalid_video_paths(self):
        """Verify validation catches missing files and unsupported formats."""
        processor = VideoProcessor(detector=self.detector)

        # Missing file
        with self.assertRaises(FileNotFoundError):
            processor.validate_video_file(self.test_dir / "non_existent.mp4")

        # Unsupported extension
        dummy_txt = self.test_dir / "file.txt"
        dummy_txt.write_text("not a video")
        with self.assertRaises(ValueError):
            processor.validate_video_file(dummy_txt)

    def test_invalid_processing_parameters(self):
        """Verify validation of frame stride and confidence boundaries."""
        processor = VideoProcessor(detector=self.detector)
        dummy_video = self.test_dir / "valid_ext.mp4"
        dummy_video.touch()

        with self.assertRaises(ValueError):
            processor.process_video(dummy_video, self.test_dir / "out.mp4", frame_stride=0)

        with self.assertRaises(ValueError):
            processor.process_video(dummy_video, self.test_dir / "out.mp4", conf_threshold=-0.1)

        with self.assertRaises(ValueError):
            processor.process_video(dummy_video, self.test_dir / "out.mp4", conf_threshold=1.5)

    def test_end_to_end_video_processing(self):
        """
        Verify end-to-end processing: video reading, YOLO inference,
        annotated video writing, and JSON summary creation.
        """
        input_video = self.test_dir / "synthetic_input.mp4"
        output_video = self.test_dir / "annotated_output.mp4"
        summary_json = self.test_dir / "summary.json"

        # Create a synthetic video fixture (20 frames, 320x240, 10 FPS)
        create_synthetic_test_video(
            output_path=input_video,
            num_frames=20,
            width=320,
            height=240,
            fps=10.0,
        )

        processor = VideoProcessor(detector=self.detector)
        summary = processor.process_video(
            input_path=input_video,
            output_path=output_video,
            summary_path=summary_json,
            conf_threshold=0.25,
            frame_stride=2,
        )

        # 1. Verify summary contents
        self.assertEqual(summary.actual_frame_count, 20)
        self.assertEqual(summary.processed_frame_count, 10)  # stride = 2
        self.assertEqual(summary.fps, 10.0)
        self.assertEqual(summary.resolution, {"width": 320, "height": 240})
        self.assertEqual(summary.inference_device, self.detector.device)
        self.assertEqual(summary.model_name, "yolo11n.pt")
        self.assertGreater(summary.processing_duration_seconds, 0)
        self.assertIsInstance(summary.per_class_observation_counts, dict)

        # 2. Verify output video file
        self.assertTrue(output_video.exists())
        self.assertGreater(output_video.stat().st_size, 0)

        cap = cv2.VideoCapture(str(output_video))
        self.assertTrue(cap.isOpened())
        out_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        out_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        out_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        cap.release()

        self.assertEqual(out_w, 320)
        self.assertEqual(out_h, 240)
        self.assertEqual(out_frames, 20)

        # 3. Verify written JSON summary
        self.assertTrue(summary_json.exists())
        with open(summary_json, "r", encoding="utf-8") as f:
            data = json.load(f)

        self.assertEqual(data["actual_frame_count"], 20)
        self.assertEqual(data["processed_frame_count"], 10)
        self.assertEqual(data["model_name"], "yolo11n.pt")
        self.assertEqual(data["inference_device"], self.detector.device)


if __name__ == "__main__":
    unittest.main()

