"""
UrbanSense AI - Video Processing Subsystem

Provides frame-by-frame streaming video processing for object detection.
Optimized for Apple Silicon unified memory (8 GB) by strictly processing
one frame at a time without accumulating video frames in memory.
"""

from dataclasses import asdict, dataclass, field
import json
import os
from pathlib import Path
import struct
import time
from typing import Any, Dict, List, Optional, Sequence

import cv2
import numpy as np

from ai_engine.detection.detector import BaseDetector, Detection, GeneralObjectDetector


SUPPORTED_VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv", ".m4v"}

# Domain color coding for road hazard visual clarity and traffic object classification
DAMAGE_CLASS_COLORS: Dict[str, tuple[int, int, int]] = {
    # Road surface distress
    "pothole": (0, 0, 220),              # Red
    "alligator_crack": (0, 140, 255),    # Orange
    "longitudinal_crack": (0, 220, 220), # Yellow
    "transverse_crack": (220, 0, 220),   # Magenta
    "road_damage": (0, 165, 255),        # Deep Orange
    # Vehicles & Traffic objects
    "car": (0, 200, 0),                  # Green
    "truck": (255, 180, 0),              # Cyan
    "bus": (255, 120, 0),                # Blue
    "motorcycle": (0, 180, 120),         # Teal
    "bicycle": (180, 220, 0),            # Lime
    "traffic light": (0, 255, 255),      # Bright Yellow
    "stop sign": (0, 0, 255),            # Bright Red
    # Pedestrians & Vulnerable Road Users
    "person": (220, 60, 140),            # Purple / Magenta
}


def calculate_iou(boxA: tuple[int, int, int, int], boxB: tuple[int, int, int, int]) -> float:
    """Calculate Intersection over Union (IoU) of two bounding boxes (x1, y1, x2, y2)."""
    xA = max(boxA[0], boxB[0])
    yA = max(boxA[1], boxB[1])
    xB = min(boxA[2], boxB[2])
    yB = min(boxA[3], boxB[3])

    interArea = max(0, xB - xA) * max(0, yB - yA)
    boxAArea = max(0, boxA[2] - boxA[0]) * max(0, boxA[3] - boxA[1])
    boxBArea = max(0, boxB[2] - boxB[0]) * max(0, boxB[3] - boxB[1])

    denom = float(boxAArea + boxBArea - interArea)
    return (interArea / denom) if denom > 0 else 0.0


@dataclass
class VideoProcessingSummary:
    """Summary of video object detection run."""
    input_path: str
    output_path: str
    actual_frame_count: int
    processed_frame_count: int
    per_class_observation_counts: Dict[str, int]
    processing_duration_seconds: float
    fps: float
    resolution: Dict[str, int]
    inference_device: str
    model_name: str
    frame_stride: int
    confidence_threshold: float
    distinct_detections: List[Detection] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        data = asdict(self)
        # Ensure Detection dataclass objects are serialized cleanly
        data["distinct_detections"] = [
            {
                "class_id": d.class_id,
                "class_name": d.class_name,
                "confidence": d.confidence,
                "bbox": list(d.bbox),
                "frame_number": d.frame_number,
                "timestamp": d.timestamp,
            }
            for d in self.distinct_detections
        ]
        return data


def annotate_frame(
    frame: np.ndarray,
    detections: Sequence[Detection],
    box_color: tuple[int, int, int] = (0, 255, 0),
) -> np.ndarray:
    """
    Draw bounding boxes, class names, and confidence scores on a BGR frame.

    Args:
        frame: BGR image frame (H, W, 3).
        detections: Sequence of Detection objects.
        box_color: Fallback BGR tuple for bounding box borders.

    Returns:
        Annotated BGR image frame.
    """
    annotated = frame.copy()
    h, w = annotated.shape[:2]

    for det in detections:
        x1, y1, x2, y2 = det.bbox

        # Clamp bounding box coordinates within frame boundaries
        x1 = max(0, min(x1, w - 1))
        y1 = max(0, min(y1, h - 1))
        x2 = max(0, min(x2, w - 1))
        y2 = max(0, min(y2, h - 1))

        if x2 <= x1 or y2 <= y1:
            continue

        # Use category-specific color if road distress, else fallback
        color = DAMAGE_CLASS_COLORS.get(det.class_name, box_color)

        # Draw bounding rectangle
        cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)

        # Prepare label text
        label = f"{det.class_name} {det.confidence:.2f}"
        font = cv2.FONT_HERSHEY_SIMPLEX
        font_scale = 0.5
        thickness = 1

        (text_w, text_h), baseline = cv2.getTextSize(label, font, font_scale, thickness)

        # Place label above the box if possible, else just below the top edge
        text_y = y1 - 4 if y1 - text_h - 4 > 0 else y1 + text_h + 4
        text_x = x1

        # Background badge for text legibility
        bg_p1 = (text_x, text_y - text_h - 2)
        bg_p2 = (text_x + text_w + 4, text_y + baseline)
        cv2.rectangle(annotated, bg_p1, bg_p2, color, cv2.FILLED)

        # Text label in black
        cv2.putText(
            annotated,
            label,
            (text_x + 2, text_y - 2),
            font,
            font_scale,
            (0, 0, 0),
            thickness,
            cv2.LINE_AA,
        )

    return annotated


def optimize_mp4_for_web_streaming(file_path: str | Path) -> bool:
    """
    Relocates the MP4 'moov' atom before 'mdat' (faststart) to enable
    instant progressive streaming and timeline seeking in web browsers (Safari, Chrome).
    """
    path = Path(file_path)
    if not path.is_file() or path.stat().st_size < 32:
        return False

    try:
        with open(path, "rb") as f:
            atoms = []
            while True:
                pos = f.tell()
                header = f.read(8)
                if len(header) < 8:
                    break
                size, name_bytes = struct.unpack(">I4s", header)
                name = name_bytes.decode("ascii", errors="replace")
                if size == 1:
                    size = struct.unpack(">Q", f.read(8))[0]
                elif size == 0:
                    f.seek(0, 2)
                    size = f.tell() - pos

                atoms.append({"name": name, "pos": pos, "size": size})
                f.seek(pos + size)

        atom_names = [a["name"] for a in atoms]
        if "moov" not in atom_names or "mdat" not in atom_names:
            return False

        moov_idx = atom_names.index("moov")
        mdat_idx = atom_names.index("mdat")

        if moov_idx < mdat_idx:
            return True  # Already optimized for web streaming

        moov_info = atoms[moov_idx]
        mdat_info = atoms[mdat_idx]
        shift = moov_info["size"]

        with open(path, "rb") as f:
            f.seek(moov_info["pos"])
            moov_data = bytearray(f.read(moov_info["size"]))

        # Adjust chunk offsets in stco boxes (32-bit offsets)
        idx = 0
        while True:
            idx = moov_data.find(b"stco", idx)
            if idx == -1:
                break
            entry_count = struct.unpack(">I", moov_data[idx + 8 : idx + 12])[0]
            offset_pos = idx + 12
            for _ in range(entry_count):
                curr_offset = struct.unpack(">I", moov_data[offset_pos : offset_pos + 4])[0]
                moov_data[offset_pos : offset_pos + 4] = struct.pack(">I", curr_offset + shift)
                offset_pos += 4
            idx += 4

        # Adjust chunk offsets in co64 boxes (64-bit offsets)
        idx = 0
        while True:
            idx = moov_data.find(b"co64", idx)
            if idx == -1:
                break
            entry_count = struct.unpack(">I", moov_data[idx + 8 : idx + 12])[0]
            offset_pos = idx + 12
            for _ in range(entry_count):
                curr_offset = struct.unpack(">Q", moov_data[offset_pos : offset_pos + 8])[0]
                moov_data[offset_pos : offset_pos + 8] = struct.pack(">Q", curr_offset + shift)
                offset_pos += 8
            idx += 4

        tmp_path = path.with_suffix(".tmp_faststart.mp4")
        with open(path, "rb") as infile, open(tmp_path, "wb") as outfile:
            for a in atoms[:mdat_idx]:
                if a["name"] not in ("moov", "mdat"):
                    infile.seek(a["pos"])
                    outfile.write(infile.read(a["size"]))

            outfile.write(moov_data)

            infile.seek(mdat_info["pos"])
            rem = mdat_info["size"]
            while rem > 0:
                chunk = infile.read(min(rem, 512 * 1024))
                if not chunk:
                    break
                outfile.write(chunk)
                rem -= len(chunk)

        tmp_path.replace(path)
        return True
    except Exception:
        return False


class VideoProcessor:
    """
    Processes video streams frame-by-frame with a detection engine.
    
    Designed to prevent memory accumulation and operate within tight unified
    RAM envelopes on Apple Silicon.
    """

    def __init__(self, detector: Optional[BaseDetector] = None):
        """
        Initialize VideoProcessor with a detection model.

        Args:
            detector: Model implementing BaseDetector. Defaults to GeneralObjectDetector.
        """
        if detector is None:
            self._detector: BaseDetector = GeneralObjectDetector()
        else:
            self._detector = detector

    @property
    def detector(self) -> BaseDetector:
        return self._detector

    def validate_video_file(self, video_path: str | Path) -> Path:
        """
        Validate that the input path exists, is a file, and has a supported video extension.
        """
        path = Path(video_path).resolve()
        if not path.exists():
            raise FileNotFoundError(f"Input video file not found: {path}")
        if not path.is_file():
            raise ValueError(f"Input video path is not a file: {path}")
        if path.suffix.lower() not in SUPPORTED_VIDEO_EXTENSIONS:
            raise ValueError(
                f"Unsupported video extension '{path.suffix}'. "
                f"Supported: {sorted(SUPPORTED_VIDEO_EXTENSIONS)}"
            )
        return path

    def process_video(
        self,
        input_path: str | Path,
        output_path: str | Path,
        summary_path: Optional[str | Path] = None,
        conf_threshold: float = 0.25,
        frame_stride: int = 1,
    ) -> VideoProcessingSummary:
        """
        Process a video file frame-by-frame, writing an annotated video and returning a summary.

        Args:
            input_path: Path to the input video.
            output_path: Destination path for the annotated video.
            summary_path: Optional destination path to write the JSON summary.
            conf_threshold: Minimum confidence score for detections.
            frame_stride: Process inference on every N-th frame (>= 1).

        Returns:
            VideoProcessingSummary instance.
        """
        if frame_stride < 1:
            raise ValueError(f"frame_stride must be >= 1, got {frame_stride}")
        if not (0.0 <= conf_threshold <= 1.0):
            raise ValueError(f"conf_threshold must be between 0.0 and 1.0, got {conf_threshold}")

        valid_input = self.validate_video_file(input_path)
        out_path = Path(output_path).resolve()
        out_path.parent.mkdir(parents=True, exist_ok=True)

        cap: Optional[cv2.VideoCapture] = None
        writer: Optional[cv2.VideoWriter] = None

        start_time = time.time()
        actual_frame_count = 0
        processed_frame_count = 0
        per_class_counts: Dict[str, int] = {}
        tracked_instances: List[Detection] = []

        try:
            cap = cv2.VideoCapture(str(valid_input))
            if not cap.isOpened():
                raise ValueError(f"OpenCV could not open video file: {valid_input}")

            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            fps = float(cap.get(cv2.CAP_PROP_FPS))

            if width <= 0 or height <= 0:
                raise ValueError(
                    f"Invalid video dimensions: width={width}, height={height} from {valid_input}"
                )

            # Fallback to standard 25.0 FPS if metadata is missing/invalid
            if fps <= 0.0 or np.isnan(fps):
                fps = 25.0

            # Set up video writer (attempt avc1 for native browser HTML5 playback, fallback to mp4v)
            writer = None
            for codec_tag in ("avc1", "mp4v"):
                try:
                    fourcc = cv2.VideoWriter_fourcc(*codec_tag)
                    test_writer = cv2.VideoWriter(str(out_path), fourcc, fps, (width, height))
                    if test_writer.isOpened():
                        writer = test_writer
                        break
                except Exception:
                    continue

            if writer is None or not writer.isOpened():
                raise RuntimeError(
                    f"OpenCV failed to open VideoWriter for destination: {out_path}"
                )

            current_detections: list[Detection] = []

            # Streaming loop: strictly one frame in memory at a time
            while True:
                ret, frame = cap.read()
                if not ret or frame is None:
                    break

                actual_frame_count += 1
                current_time_sec = round((actual_frame_count - 1) / fps, 3)

                # Perform inference on selected stride intervals
                if (actual_frame_count - 1) % frame_stride == 0:
                    current_detections = self._detector.predict(
                        frame,
                        conf_threshold=conf_threshold,
                        frame_number=actual_frame_count,
                        timestamp=current_time_sec,
                    )
                    processed_frame_count += 1

                    for det in current_detections:
                        per_class_counts[det.class_name] = (
                            per_class_counts.get(det.class_name, 0) + 1
                        )

                        # Deduplicate across consecutive frames to avoid multiple events for 1 object
                        matched = False
                        for idx, track in enumerate(tracked_instances):
                            if track.class_name == det.class_name:
                                # If detected within 1.5s and overlapping spatially
                                if (
                                    track.timestamp is not None
                                    and det.timestamp is not None
                                    and abs(det.timestamp - track.timestamp) <= 1.5
                                    and calculate_iou(track.bbox, det.bbox) >= 0.20
                                ):
                                    # Update track with higher confidence observation
                                    if det.confidence > track.confidence:
                                        tracked_instances[idx] = det
                                    matched = True
                                    break
                        if not matched:
                            tracked_instances.append(det)

                # Annotate and write to destination
                annotated = annotate_frame(frame, current_detections)
                writer.write(annotated)

        finally:
            # Guarantee resource cleanup on both success and error
            if cap is not None:
                cap.release()
            if writer is not None:
                writer.release()
            
            # Post-process MP4 to relocate moov atom to front for immediate web browser streaming
            optimize_mp4_for_web_streaming(out_path)

        duration = round(time.time() - start_time, 3)

        summary = VideoProcessingSummary(
            input_path=str(valid_input),
            output_path=str(out_path),
            actual_frame_count=actual_frame_count,
            processed_frame_count=processed_frame_count,
            per_class_observation_counts=per_class_counts,
            processing_duration_seconds=duration,
            fps=round(fps, 2),
            resolution={"width": width, "height": height},
            inference_device=self._detector.device,
            model_name=self._detector.model_name,
            frame_stride=frame_stride,
            confidence_threshold=conf_threshold,
            distinct_detections=tracked_instances,
        )

        # Write JSON summary if path was provided
        if summary_path is not None:
            sum_path = Path(summary_path).resolve()
            sum_path.parent.mkdir(parents=True, exist_ok=True)
            with open(sum_path, "w", encoding="utf-8") as f:
                json.dump(summary.to_dict(), f, indent=2)

        return summary
