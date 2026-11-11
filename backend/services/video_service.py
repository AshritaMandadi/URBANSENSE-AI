"""
UrbanSense AI - Video Management & AI Execution Service

Handles video upload, metadata probing, and bridges directly to the existing
`VideoProcessor`, `GeneralObjectDetector`, and `RoadDamageDetector` pipelines.
"""

from datetime import datetime, timedelta, timezone
import os
from pathlib import Path
import shutil
from typing import Optional
import uuid

import cv2
from fastapi import UploadFile
from sqlalchemy.orm import Session

SUPPORTED_VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv", ".m4v"}

from backend.database.models import ProcessingJob, UploadedVideo
from backend.services.event_service import EventService
from backend.services.gps_service import GPSService


REPO_ROOT = Path(__file__).resolve().parent.parent.parent
data_dir_env = os.getenv("DATA_DIR")
VIDEOS_DIR = (Path(data_dir_env) / "videos") if data_dir_env else (REPO_ROOT / "data" / "videos")
VIDEOS_DIR.mkdir(parents=True, exist_ok=True)


class VideoService:
    """Manages video uploads and coordinates AI inference."""

    @staticmethod
    def save_uploaded_video(
        file: UploadFile,
        bus_id: Optional[str],
        db: Session,
        camera_channel: Optional[str] = "front",
    ) -> UploadedVideo:
        """
        Validate and save an uploaded road video to disk, extracting its metadata.
        """
        filename = file.filename or "uploaded_video.mp4"
        ext = Path(filename).suffix.lower()

        if ext not in SUPPORTED_VIDEO_EXTENSIONS:
            raise ValueError(
                f"Unsupported video format '{ext}'. Supported formats: {sorted(SUPPORTED_VIDEO_EXTENSIONS)}"
            )

        video_id = f"VID-{uuid.uuid4().hex[:8].upper()}"
        save_path = VIDEOS_DIR / f"{video_id}_{filename}"

        # Stream file to disk to preserve memory
        with open(save_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        file_size = save_path.stat().st_size
        if file_size == 0:
            save_path.unlink(missing_ok=True)
            raise ValueError("Uploaded video file is empty (0 bytes).")

        max_upload_mb = int(os.getenv("MAX_UPLOAD_SIZE_MB", "150"))
        if file_size > max_upload_mb * 1024 * 1024:
            save_path.unlink(missing_ok=True)
            raise ValueError(
                f"Uploaded video size ({round(file_size / (1024 * 1024), 1)} MB) exceeds allowed limit of {max_upload_mb} MB."
            )

        # Probe video metadata via OpenCV
        cap = cv2.VideoCapture(str(save_path))
        if not cap.isOpened():
            save_path.unlink(missing_ok=True)
            raise ValueError("OpenCV could not decode the uploaded video file.")

        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = float(cap.get(cv2.CAP_PROP_FPS))
        fps = 25.0 if (fps <= 0 or cv2.CAP_PROP_FPS != cv2.CAP_PROP_FPS) else fps
        duration = round(frame_count / fps, 2) if frame_count > 0 and fps > 0 else 0.0
        cap.release()

        video_record = UploadedVideo(
            id=video_id,
            filename=filename,
            file_path=str(save_path),
            file_size_bytes=file_size,
            uploaded_at=datetime.now(timezone.utc),
            duration_seconds=duration,
            frame_count=frame_count,
            fps=round(fps, 2),
            bus_id=bus_id,
            camera_channel=(camera_channel or "front").lower(),
        )

        db.add(video_record)
        db.commit()
        db.refresh(video_record)
        return video_record

    @staticmethod
    def process_video_job(
        video_id: str,
        db: Session,
        conf_threshold: float = 0.25,
        frame_stride: int = 2,
        detector_type: str = "general",
    ) -> ProcessingJob:
        """
        Execute video detection using the selected detector pipeline.
        Supports both GeneralObjectDetector and RoadDamageDetector.
        Generates real events from actual model detections without fabricating fake predictions.
        """
        video = db.query(UploadedVideo).filter(UploadedVideo.id == video_id).first()
        if not video:
            raise FileNotFoundError(f"Video record '{video_id}' not found.")

        input_path = Path(video.file_path)
        if not input_path.is_file():
            raise FileNotFoundError(f"Video file missing on disk: {input_path}")

        job = ProcessingJob(
            id=f"JOB-{uuid.uuid4().hex[:8].upper()}",
            video_id=video_id,
            status="PROCESSING",
            started_at=datetime.now(timezone.utc),
        )
        db.add(job)
        db.commit()
        db.refresh(job)

        annotated_path = VIDEOS_DIR / f"annotated_{video_id}_{input_path.name}"
        summary_path = VIDEOS_DIR / f"summary_{video_id}.json"

        try:
            is_inference_enabled = os.getenv("ENABLE_SERVER_INFERENCE", "true").lower() in ("true", "1", "yes")
            if not is_inference_enabled:
                raise RuntimeError(
                    "Cloud server-side AI processing is disabled on the Free tier (512 MB RAM limit). "
                    "Execute video processing locally on your Apple Silicon Mac, and sync detection events to this cloud instance."
                )

            from ai_engine.detection.combined_detector import CombinedDetector
            from ai_engine.detection.detector import GeneralObjectDetector
            from ai_engine.detection.road_damage_detector import RoadDamageDetector
            from ai_engine.video_processing.video_processor import VideoProcessor

            # 1. Select and initialize detector
            norm_type = (detector_type or "general").strip().lower()
            if norm_type in ("road_damage", "road-damage", "roaddamage", "damage"):
                damage_detector = RoadDamageDetector()
                if not damage_detector.is_model_ready:
                    raise RuntimeError(
                        f"RoadDamageDetector cannot process video: model is NOT_READY. {damage_detector.loading_error}"
                    )
                detector = damage_detector
            elif norm_type in ("combined", "dual", "all", "both"):
                detector = CombinedDetector()
                if not detector.is_model_ready:
                    raise RuntimeError(
                        "CombinedDetector cannot process video: neither RDD2022 nor COCO model weights are available on disk."
                    )
            elif norm_type in ("general", "general_object", "coco"):
                detector = GeneralObjectDetector()
                if not detector.is_model_ready:
                    raise RuntimeError(
                        f"GeneralObjectDetector cannot process video: model is NOT_READY. {detector.loading_error}"
                    )
            else:
                raise ValueError(
                    f"Unsupported detector_type '{detector_type}'. Choose 'general', 'road_damage', or 'combined'."
                )

            # 2. Use streaming VideoProcessor
            processor = VideoProcessor(detector=detector)
            summary = processor.process_video(
                input_path=input_path,
                output_path=annotated_path,
                summary_path=summary_path,
                conf_threshold=conf_threshold,
                frame_stride=frame_stride,
            )

            # 3. Associate telemetry coordinates for the video's bus
            bus_id = video.bus_id or "BUS-TG-101"
            latest_gps = GPSService.get_latest_bus_location(bus_id, db)
            lat = latest_gps.latitude if latest_gps else 17.4399
            lon = latest_gps.longitude if latest_gps else 78.4983
            is_sim = latest_gps.is_simulated if latest_gps else True

            # 4. Generate structured events from actual deduplicated model detections
            events_count = 0
            if summary.distinct_detections:
                for det in summary.distinct_detections:
                    event_timestamp = None
                    if video.uploaded_at and det.timestamp is not None:
                        event_timestamp = video.uploaded_at + timedelta(seconds=float(det.timestamp))

                    EventService.create_event_from_detection(
                        detection=det,
                        bus_id=bus_id,
                        latitude=lat,
                        longitude=lon,
                        db=db,
                        video_source=video.filename,
                        timestamp=event_timestamp,
                        is_simulated=is_sim,
                    )
                    events_count += 1

            # 5. Mark job as completed
            job.status = "COMPLETED"
            job.completed_at = datetime.now(timezone.utc)
            job.annotated_video_path = str(annotated_path)
            job.summary_json_path = str(summary_path)
            job.events_generated_count = events_count
            db.commit()
            db.refresh(job)
            return job

        except Exception as err:
            job.status = "FAILED"
            job.completed_at = datetime.now(timezone.utc)
            job.error_message = str(err)
            db.commit()
            db.refresh(job)
            raise
