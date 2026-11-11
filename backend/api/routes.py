"""
UrbanSense AI - FastAPI REST API Router

Provides all endpoints for bus fleet telemetry, urban sensing events,
video upload/processing, and smart city analytics.
"""

from datetime import datetime, timezone
import os
from pathlib import Path
import re
from typing import List, Optional
import uuid

from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, Query, Request, UploadFile, status
from fastapi.responses import FileResponse, Response, StreamingResponse
from sqlalchemy.orm import Session
try:
    import torch
    TORCH_AVAILABLE = True
except ImportError:
    torch = None
    TORCH_AVAILABLE = False

from backend.api.schemas import (
    AnalyticsSummaryResponse,
    AuditLogResponse,
    BusCameraConfigResponse,
    BusResponse,
    CameraChannelStatus,
    DetectionEventCreate,
    DetectionEventResponse,
    EventStatusUpdate,
    HealthResponse,
    IncidentReviewResponse,
    LatestGPSResponse,
    OperatorUserCreate,
    OperatorUserResponse,
    ProcessingJobResponse,
    RoadDamageModelStatus,
    RouteChunkResponse,
    RouteResponse,
    SafetySummaryResponse,
    TrafficSummaryResponse,
    UploadedVideoResponse,
    VerificationPassRequest,
    WorkOrderCreate,
    WorkOrderResponse,
    WorkOrderUpdate,
)
from ai_engine.detection.road_damage_detector import RoadDamageDetector
from backend.database.models import (
    AuditLog,
    Bus,
    DetectionEvent,
    OperatorUser,
    ProcessingJob,
    Route,
    UploadedVideo,
    WorkOrder,
)
from backend.database.session import get_db
from backend.services.event_service import EventService
from backend.services.gps_service import GPSService
from backend.services.video_service import VideoService

router = APIRouter()


# ---------------------------------------------------------
# Health & Model Status Endpoints
# ---------------------------------------------------------
@router.get("/health", response_model=HealthResponse, tags=["System"])
def get_health():
    """System health check and runtime device/model status."""
    inference_enabled = os.getenv("ENABLE_SERVER_INFERENCE", "true").lower() in ("true", "1", "yes")

    if not inference_enabled or not TORCH_AVAILABLE:
        device = "cloud-free-tier"
        model_status = RoadDamageModelStatus(
            status="LOCAL_ONLY",
            is_ready=False,
            model_path="N/A (Cloud inference disabled on Free tier)",
            loading_error="Server-side AI processing is disabled on the Free tier (512 MB RAM limit). Video processing is LOCAL_ONLY on Apple Silicon Mac.",
            supported_classes={
                "0": "longitudinal_crack",
                "1": "transverse_crack",
                "2": "alligator_crack",
                "3": "pothole",
            },
        )
    else:
        device = "mps" if (torch and torch.backends.mps.is_available()) else "cpu"
        rdd = RoadDamageDetector()
        model_status = RoadDamageModelStatus(
            status=rdd.status,
            is_ready=rdd.is_model_ready,
            model_path=rdd.model_path,
            loading_error=rdd.loading_error,
            supported_classes=rdd.supported_classes,
        )

    db_mode = "sqlite (ephemeral - resets on restart)" if os.getenv("CLOUD_MODE") == "free" else "sqlite"
    return HealthResponse(
        status="ok",
        version="0.2.0",
        device=device,
        database=db_mode,
        timestamp=datetime.now(timezone.utc),
        road_damage_model=model_status,
    )


@router.get("/api/models/road-damage/status", tags=["System"])
def get_road_damage_model_status():
    """Detailed runtime diagnostic status for the specialized road damage model."""
    inference_enabled = os.getenv("ENABLE_SERVER_INFERENCE", "true").lower() in ("true", "1", "yes")
    if not inference_enabled or not TORCH_AVAILABLE:
        return {
            "model_name": "YOLO11n-RDD2022",
            "model_path": "N/A (Local Processing Only)",
            "device": "cloud-free-tier",
            "status": "LOCAL_ONLY",
            "is_ready": False,
            "loading_error": "Server-side AI inference is disabled on Free tier to guarantee zero hosting cost within 512 MB RAM. Process road videos locally using your Apple Silicon Mac (Apple MPS) and sync detection telemetry to this dashboard.",
            "supported_classes": {
                0: "longitudinal_crack",
                1: "transverse_crack",
                2: "alligator_crack",
                3: "pothole",
            },
            "target_classes": {
                0: "longitudinal_crack",
                1: "transverse_crack",
                2: "alligator_crack",
                3: "pothole",
            },
            "message": "Local processing mode active. Zero cloud hosting cost.",
        }
    detector = RoadDamageDetector()
    return detector.get_status()


# ---------------------------------------------------------
# Bus Fleet & Telemetry Endpoints
# ---------------------------------------------------------
@router.get("/api/buses", response_model=List[BusResponse], tags=["Fleet"])
def list_buses(db: Session = Depends(get_db)):
    """Retrieve all monitored transit buses with their latest GPS telemetry."""
    buses = db.query(Bus).all()
    results = []

    for bus in buses:
        latest_gps = GPSService.get_latest_bus_location(bus.id, db)
        results.append(
            BusResponse(
                id=bus.id,
                route_id=bus.route_id,
                license_plate=bus.license_plate,
                model=bus.model,
                status=bus.status,
                created_at=bus.created_at,
                latest_gps=latest_gps,
            )
        )
    return results


@router.get("/api/gps/latest", response_model=List[LatestGPSResponse], tags=["Fleet"])
def get_all_latest_gps(db: Session = Depends(get_db)):
    """Retrieve the latest spatial coordinates for all buses in the fleet."""
    locations = GPSService.get_all_latest_locations(db)
    return [
        LatestGPSResponse(
            bus_id=loc["bus_id"],
            route_id=loc["route_id"],
            latitude=loc["latitude"],
            longitude=loc["longitude"],
            speed_kmh=loc["speed_kmh"],
            heading_deg=loc["heading_deg"],
            timestamp=loc["timestamp"],
            is_simulated=loc["is_simulated"],
        )
        for loc in locations
    ]


@router.post("/api/gps/simulate/{bus_id}", tags=["Fleet"])
def trigger_gps_simulation(bus_id: str, db: Session = Depends(get_db)):
    """Simulate a telemetry movement tick for a specific transit bus."""
    record = GPSService.simulate_telemetry_point(bus_id=bus_id, db=db)
    return {
        "status": "success",
        "bus_id": bus_id,
        "latitude": record.latitude,
        "longitude": record.longitude,
        "speed_kmh": record.speed_kmh,
        "timestamp": record.timestamp,
        "is_simulated": record.is_simulated,
    }


# ---------------------------------------------------------
# Urban Detection Events Endpoints
# ---------------------------------------------------------
@router.get("/api/events", response_model=List[DetectionEventResponse], tags=["Events"])
def list_events(
    event_type: Optional[str] = Query(None, description="POTHOLE, ROAD_CRACK, ROAD_DAMAGE, VEHICLE_DETECTION, etc."),
    severity: Optional[str] = Query(None, description="LOW, MEDIUM, HIGH, CRITICAL, INFO"),
    bus_id: Optional[str] = Query(None, description="Filter by reporting bus"),
    status: Optional[str] = Query(None, description="NEW, VERIFIED, RESOLVED"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """Retrieve list of detected urban events with optional filtering and pagination."""
    events = EventService.get_events(
        db=db,
        event_type=event_type,
        severity=severity,
        bus_id=bus_id,
        status=status,
        limit=limit,
        offset=offset,
    )
    return [
        DetectionEventResponse(
            id=e.id,
            event_type=e.event_type,
            detection_class=e.detection_class,
            confidence=e.confidence,
            bbox=(e.bbox_x1, e.bbox_y1, e.bbox_x2, e.bbox_y2),
            bus_id=e.bus_id,
            latitude=e.latitude,
            longitude=e.longitude,
            timestamp=e.timestamp,
            video_source=e.video_source,
            severity=e.severity,
            status=e.status,
            is_simulated=e.is_simulated,
            created_at=e.created_at,
        )
        for e in events
    ]


@router.post("/api/events/sync", response_model=List[DetectionEventResponse], tags=["Events"])
def sync_detection_events(
    events: List[DetectionEventCreate],
    db: Session = Depends(get_db),
    x_sync_token: Optional[str] = Header(None, alias="X-Sync-Token"),
    authorization: Optional[str] = Header(None, alias="Authorization"),
):
    """
    Ingest pre-processed road hazard detection events from local Mac processing.
    Allows zero-cost cloud deployments to reflect local Apple MPS inference results.

    Security & Deduplication:
      - Authenticates via configurable SYNC_API_TOKEN (Header 'X-Sync-Token' or 'Authorization: Bearer <token>').
      - Deduplicates events by event ID or coordinate/timestamp tuple, preventing duplicate inserts on retry.
      - Ephemeral notice: on free cloud tiers without persistent disks, events persist for the container lifetime.
    """
    expected_token = os.getenv("SYNC_API_TOKEN", "").strip()
    is_cloud_mode = os.getenv("CLOUD_MODE") == "free" or os.getenv("RENDER") == "true"

    if expected_token:
        provided_token = x_sync_token
        if not provided_token and authorization:
            if authorization.lower().startswith("bearer "):
                provided_token = authorization[7:].strip()
            else:
                provided_token = authorization.strip()

        if not provided_token or provided_token != expected_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Unauthorized: Invalid or missing sync token. Provide valid X-Sync-Token or Bearer token.",
                headers={"WWW-Authenticate": "Bearer"},
            )
    elif is_cloud_mode:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cloud sync endpoint is disabled: SYNC_API_TOKEN must be configured in environment variables.",
        )

    processed = []
    for item in events:
        # 1. Deduplication check by event ID
        existing = None
        if item.id:
            existing = db.query(DetectionEvent).filter(DetectionEvent.id == item.id).first()

        # 2. Fallback deduplication check by bus, detection class, and timestamp
        if not existing and item.bus_id and item.timestamp:
            existing = (
                db.query(DetectionEvent)
                .filter(
                    DetectionEvent.bus_id == item.bus_id,
                    DetectionEvent.detection_class == item.detection_class,
                    DetectionEvent.timestamp == item.timestamp,
                )
                .first()
            )

        if existing:
            # Idempotent update: update confidence/severity if newer, do not insert duplicate row
            existing.confidence = max(existing.confidence, round(item.confidence, 4))
            if item.severity:
                existing.severity = item.severity
            processed.append(existing)
        else:
            event_id = item.id if item.id else f"EVT-{uuid.uuid4().hex[:10].upper()}"
            ev = DetectionEvent(
                id=event_id,
                event_type=item.event_type,
                detection_class=item.detection_class,
                confidence=round(item.confidence, 4),
                bbox_x1=item.bbox_x1,
                bbox_y1=item.bbox_y1,
                bbox_x2=item.bbox_x2,
                bbox_y2=item.bbox_y2,
                bus_id=item.bus_id,
                latitude=round(item.latitude, 6),
                longitude=round(item.longitude, 6),
                timestamp=item.timestamp or datetime.now(timezone.utc),
                video_source=item.video_source,
                severity=item.severity or "MEDIUM",
                status="NEW",
                is_simulated=item.is_simulated or False,
            )
            db.add(ev)
            processed.append(ev)

    db.commit()
    for ev in processed:
        db.refresh(ev)

    return [
        DetectionEventResponse(
            id=e.id,
            event_type=e.event_type,
            detection_class=e.detection_class,
            confidence=e.confidence,
            bbox=(e.bbox_x1, e.bbox_y1, e.bbox_x2, e.bbox_y2),
            bus_id=e.bus_id,
            latitude=e.latitude,
            longitude=e.longitude,
            timestamp=e.timestamp,
            video_source=e.video_source,
            severity=e.severity,
            status=e.status,
            is_simulated=e.is_simulated,
            created_at=e.created_at,
        )
        for e in processed
    ]


@router.get("/api/events/{event_id}", response_model=DetectionEventResponse, tags=["Events"])
def get_event(event_id: str, db: Session = Depends(get_db)):
    """Fetch details for a single urban detection event."""
    event = EventService.get_event_by_id(event_id, db)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Event '{event_id}' not found.",
        )
    return DetectionEventResponse(
        id=event.id,
        event_type=event.event_type,
        detection_class=event.detection_class,
        confidence=event.confidence,
        bbox=(event.bbox_x1, event.bbox_y1, event.bbox_x2, event.bbox_y2),
        bus_id=event.bus_id,
        latitude=event.latitude,
        longitude=event.longitude,
        timestamp=event.timestamp,
        video_source=event.video_source,
        severity=event.severity,
        status=event.status,
        is_simulated=event.is_simulated,
        created_at=event.created_at,
    )


@router.patch("/api/events/{event_id}/status", response_model=DetectionEventResponse, tags=["Events"])
def update_event_status(event_id: str, payload: EventStatusUpdate, db: Session = Depends(get_db)):
    """Update review status of an urban sensing event."""
    event = EventService.update_event_status(event_id, payload.status, db)
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Event '{event_id}' not found.")
    
    # Record audit log
    audit = AuditLog(
        actor="operator",
        action="STATUS_UPDATED",
        entity="ISSUE",
        entity_id=event.id,
        details=f'{{"status": "{payload.status}"}}',
    )
    db.add(audit)
    db.commit()

    return DetectionEventResponse(
        id=event.id,
        event_type=event.event_type,
        detection_class=event.detection_class,
        confidence=event.confidence,
        bbox=(event.bbox_x1, event.bbox_y1, event.bbox_x2, event.bbox_y2),
        bus_id=event.bus_id,
        latitude=event.latitude,
        longitude=event.longitude,
        timestamp=event.timestamp,
        video_source=event.video_source,
        severity=event.severity,
        status=event.status,
        is_simulated=event.is_simulated,
        created_at=event.created_at,
    )


# ---------------------------------------------------------
# Analytics Summary
# ---------------------------------------------------------
@router.get("/api/analytics/summary", response_model=AnalyticsSummaryResponse, tags=["Analytics"])
def get_analytics(db: Session = Depends(get_db)):
    """Retrieve aggregate platform metrics for executive dashboard."""
    summary_data = EventService.get_analytics_summary(db)
    return AnalyticsSummaryResponse(**summary_data)


# ---------------------------------------------------------
# Video Ingestion & Processing Endpoints
# ---------------------------------------------------------
def stream_file_with_range(file_path: Path, request: Request, media_type: str = "video/mp4") -> Response:
    """Helper to serve video files supporting HTTP 206 Partial Content range requests."""
    if not file_path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video file not found.")

    file_size = file_path.stat().st_size
    range_header = request.headers.get("range") or request.headers.get("Range")

    if not range_header:
        def full_file_iterator(chunk_size: int = 128 * 1024):
            with open(file_path, "rb") as f:
                while chunk := f.read(chunk_size):
                    yield chunk

        headers = {
            "Content-Range": f"bytes 0-{file_size - 1}/{file_size}",
            "Accept-Ranges": "bytes",
            "Content-Length": str(file_size),
            "Content-Type": media_type,
        }
        return StreamingResponse(full_file_iterator(), status_code=status.HTTP_200_OK, headers=headers)

    range_match = re.search(r"bytes=(\d+)-(\d*)", range_header)
    if not range_match:
        raise HTTPException(status_code=status.HTTP_416_REQUESTED_RANGE_NOT_SATISFIABLE, detail="Invalid Range header")

    start = int(range_match.group(1))
    end_str = range_match.group(2)
    end = int(end_str) if end_str else file_size - 1

    if start >= file_size:
        return Response(
            status_code=status.HTTP_416_REQUESTED_RANGE_NOT_SATISFIABLE,
            headers={"Content-Range": f"bytes */{file_size}"},
        )

    end = min(end, file_size - 1)
    content_length = end - start + 1

    def range_file_iterator(start_pos: int, length: int, chunk_size: int = 128 * 1024):
        with open(file_path, "rb") as f:
            f.seek(start_pos)
            bytes_left = length
            while bytes_left > 0:
                chunk = f.read(min(chunk_size, bytes_left))
                if not chunk:
                    break
                bytes_left -= len(chunk)
                yield chunk

    headers = {
        "Content-Range": f"bytes {start}-{end}/{file_size}",
        "Accept-Ranges": "bytes",
        "Content-Length": str(content_length),
        "Content-Type": media_type,
    }
    return StreamingResponse(
        range_file_iterator(start, content_length),
        status_code=status.HTTP_206_PARTIAL_CONTENT,
        headers=headers,
    )


@router.post("/api/videos/upload", response_model=UploadedVideoResponse, tags=["Videos"])
def upload_video(
    file: UploadFile = File(...),
    bus_id: Optional[str] = Form(None),
    camera_channel: Optional[str] = Form("front"),
    db: Session = Depends(get_db),
):
    """Upload a recorded road video for AI analysis with multi-camera channel assignment."""
    try:
        video_record = VideoService.save_uploaded_video(
            file=file, bus_id=bus_id, db=db, camera_channel=camera_channel
        )
        return UploadedVideoResponse(
            id=video_record.id,
            filename=video_record.filename,
            file_path=video_record.file_path,
            file_size_bytes=video_record.file_size_bytes,
            uploaded_at=video_record.uploaded_at,
            duration_seconds=video_record.duration_seconds,
            frame_count=video_record.frame_count,
            fps=video_record.fps,
            bus_id=video_record.bus_id,
            camera_channel=getattr(video_record, "camera_channel", "front") or "front",
            latest_job_status="NOT_PROCESSED",
            has_annotated=False,
            events_count=0,
        )
    except ValueError as val_err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(val_err))
    except Exception as err:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Upload error: {err}")


@router.get("/api/videos", response_model=List[UploadedVideoResponse], tags=["Videos"])
def list_videos(db: Session = Depends(get_db)):
    """List all ingested road videos with latest job status, camera channel, and annotations."""
    videos = db.query(UploadedVideo).order_by(UploadedVideo.uploaded_at.desc()).all()
    result = []
    for vid in videos:
        latest_job = (
            db.query(ProcessingJob)
            .filter(ProcessingJob.video_id == vid.id)
            .order_by(ProcessingJob.created_at.desc())
            .first()
        )
        has_annotated = bool(
            (latest_job and latest_job.status == "COMPLETED")
            or (latest_job and latest_job.annotated_video_path and Path(latest_job.annotated_video_path).is_file())
            or (vid.id in ("VID-TG-101-SURVEY", "VID-TG-201-SURVEY"))
        )
        job_status = latest_job.status if latest_job else ("COMPLETED" if vid.id in ("VID-TG-101-SURVEY", "VID-TG-201-SURVEY") else "NOT_PROCESSED")
        ev_count = latest_job.events_generated_count if latest_job else (12 if vid.id == "VID-TG-101-SURVEY" else (8 if vid.id == "VID-TG-201-SURVEY" else 0))

        demo_media_url = None
        annotated_demo_url = None
        if vid.id == "VID-TG-101-SURVEY":
            demo_media_url = "/demo_media/bus_tg_101_front_survey.mp4"
            annotated_demo_url = "/demo_media/bus_tg_101_annotated_survey.mp4"
        elif vid.id == "VID-TG-201-SURVEY":
            demo_media_url = "/demo_media/bus_tg_201_front_survey.mp4"
            annotated_demo_url = "/demo_media/bus_tg_201_annotated_survey.mp4"

        result.append(
            UploadedVideoResponse(
                id=vid.id,
                filename=vid.filename,
                file_path=vid.file_path,
                file_size_bytes=vid.file_size_bytes,
                uploaded_at=vid.uploaded_at,
                duration_seconds=vid.duration_seconds,
                frame_count=vid.frame_count,
                fps=vid.fps,
                bus_id=vid.bus_id,
                camera_channel=getattr(vid, "camera_channel", "front") or "front",
                latest_job_status=job_status,
                has_annotated=has_annotated,
                events_count=ev_count,
                demo_media_url=demo_media_url,
                annotated_demo_url=annotated_demo_url,
            )
        )
    return result


@router.post("/api/videos/{video_id}/process", response_model=ProcessingJobResponse, tags=["Videos"])
def trigger_video_processing(
    video_id: str,
    conf_threshold: float = Query(0.25, ge=0.05, le=0.95),
    frame_stride: int = Query(2, ge=1, le=10),
    detector_type: str = Query("general", description="Detector type: 'general' (COCO YOLO11n) or 'road_damage' (custom RDD2022)"),
    db: Session = Depends(get_db),
):
    """Trigger YOLO video detection on an uploaded video."""
    try:
        job = VideoService.process_video_job(
            video_id=video_id,
            db=db,
            conf_threshold=conf_threshold,
            frame_stride=frame_stride,
            detector_type=detector_type,
        )
        return job
    except FileNotFoundError as fnf:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(fnf))
    except (RuntimeError, ValueError) as client_err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(client_err))
    except Exception as err:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Processing failed: {err}")


@router.api_route("/api/videos/{video_id}/stream", methods=["GET", "HEAD"], tags=["Videos"])
def stream_original_video(video_id: str, request: Request, db: Session = Depends(get_db)):
    """Stream original uploaded video file with HTTP 206 range requests, HEAD support, and inline browser playback."""
    video = db.query(UploadedVideo).filter(UploadedVideo.id == video_id).first()
    if not video or not video.file_path:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Video '{video_id}' not found.")
    path = Path(video.file_path)
    if not path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Video file '{video.filename}' missing on disk.")
    return FileResponse(path, media_type="video/mp4", content_disposition_type="inline")


@router.api_route("/api/videos/{video_id}/annotated", methods=["GET", "HEAD"], tags=["Videos"])
def download_annotated_video(video_id: str, request: Request, db: Session = Depends(get_db)):
    """Stream or download the processed annotated video file with HTTP 206 range requests, HEAD support, and inline browser playback."""
    job = (
        db.query(ProcessingJob)
        .filter(ProcessingJob.video_id == video_id)
        .order_by(ProcessingJob.created_at.desc())
        .first()
    )
    if not job or not job.annotated_video_path or not Path(job.annotated_video_path).is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No annotated video available for video '{video_id}'.",
        )
    path = Path(job.annotated_video_path)
    return FileResponse(path, media_type="video/mp4", content_disposition_type="inline")


# ---------------------------------------------------------
# Fleet Multi-Camera Channels
# ---------------------------------------------------------
@router.get("/api/fleet/cameras", response_model=List[BusCameraConfigResponse], tags=["Fleet"])
def list_fleet_camera_configs(db: Session = Depends(get_db)):
    """Retrieve multi-camera channel allocations and streaming status for all fleet buses."""
    buses = db.query(Bus).all()
    results = []
    for b in buses:
        channels = [
            CameraChannelStatus(
                channel_id=f"{b.id}-CAM-FRONT",
                channel_name="Forward Road & Traffic Dashcam",
                position="front",
                status="ACTIVE",
                assigned_model="RDD2022 YOLO11n + General Object",
                resolution="1920x1080",
                fps=30,
            ),
            CameraChannelStatus(
                channel_id=f"{b.id}-CAM-REAR",
                channel_name="Rear Traffic & Tailgating Camera",
                position="rear",
                status="ACTIVE",
                assigned_model="General Object (Vehicle Following)",
                resolution="1280x720",
                fps=25,
            ),
            CameraChannelStatus(
                channel_id=f"{b.id}-CAM-LEFT",
                channel_name="Left Kerb & Pavement Surface Camera",
                position="left",
                status="ACTIVE",
                assigned_model="RDD2022 Road Damage",
                resolution="1280x720",
                fps=20,
            ),
            CameraChannelStatus(
                channel_id=f"{b.id}-CAM-RIGHT",
                channel_name="Right Overtaking & Lane Scanner",
                position="right",
                status="ACTIVE",
                assigned_model="General Object (Proximity)",
                resolution="1280x720",
                fps=20,
            ),
            CameraChannelStatus(
                channel_id=f"{b.id}-CAM-CABIN",
                channel_name="Internal Driver & Passenger Safety",
                position="cabin",
                status="STANDBY",
                assigned_model="Privacy Blur / Incident Review",
                resolution="1280x720",
                fps=15,
            ),
        ]
        results.append(
            BusCameraConfigResponse(
                bus_id=b.id,
                license_plate=b.license_plate,
                route_id=b.route_id,
                channels=channels,
            )
        )
    return results


# ---------------------------------------------------------
# Traffic & Congestion Intelligence
# ---------------------------------------------------------
@router.get("/api/traffic/summary", response_model=TrafficSummaryResponse, tags=["Traffic"])
def get_traffic_summary(db: Session = Depends(get_db)):
    """Aggregate vehicle classifications, counting, and congestion estimations."""
    cars = db.query(DetectionEvent).filter(DetectionEvent.detection_class == "car").count()
    buses = db.query(DetectionEvent).filter(DetectionEvent.detection_class == "bus").count()
    trucks = db.query(DetectionEvent).filter(DetectionEvent.detection_class == "truck").count()
    motorcycles = db.query(DetectionEvent).filter(DetectionEvent.detection_class == "motorcycle").count()
    bicycles = db.query(DetectionEvent).filter(DetectionEvent.detection_class == "bicycle").count()
    total_vehicles = cars + buses + trucks + motorcycles + bicycles

    if total_vehicles > 50:
        density = "HIGH"
    elif total_vehicles > 15:
        density = "MODERATE"
    elif total_vehicles > 0:
        density = "LOW"
    else:
        density = "LOW"

    bottlenecks = [
        {
            "corridor": "ROUTE-TG-01 (Secunderabad - Tank Bund)",
            "density_index": "Moderate",
            "vehicle_observations": max(total_vehicles, 1),
            "status": "Monitored Flow",
        },
        {
            "corridor": "ROUTE-TG-02 (Hyderabad - Siddipet - Karimnagar)",
            "density_index": "Free Flowing",
            "vehicle_observations": max(int(total_vehicles * 0.4), 0),
            "status": "Normal Transit",
        },
        {
            "corridor": "ROUTE-TG-03 (Hyderabad - Warangal Highway)",
            "density_index": "Optimal Flow",
            "vehicle_observations": max(int(total_vehicles * 0.3), 0),
            "status": "Normal Transit",
        },
    ]

    return TrafficSummaryResponse(
        total_vehicles=total_vehicles,
        cars=cars,
        buses=buses,
        trucks=trucks,
        motorcycles=motorcycles,
        bicycles=bicycles,
        estimated_density_level=density,
        active_corridors_monitored=6,
        camera_based_bottlenecks=bottlenecks,
    )


# ---------------------------------------------------------
# Pedestrian & Public Safety
# ---------------------------------------------------------
@router.get("/api/safety/summary", response_model=SafetySummaryResponse, tags=["Safety"])
def get_safety_summary(db: Session = Depends(get_db)):
    """Pedestrian detection summary and school-zone corridor safety context."""
    pedestrians = db.query(DetectionEvent).filter(DetectionEvent.detection_class == "person").count()
    ped_events = (
        db.query(DetectionEvent)
        .filter(DetectionEvent.event_type == "PEDESTRIAN_DETECTION")
        .order_by(DetectionEvent.timestamp.desc())
        .limit(20)
        .all()
    )
    formatted = [
        DetectionEventResponse(
            id=e.id,
            event_type=e.event_type,
            detection_class=e.detection_class,
            confidence=e.confidence,
            bbox=(e.bbox_x1, e.bbox_y1, e.bbox_x2, e.bbox_y2),
            bus_id=e.bus_id,
            latitude=e.latitude,
            longitude=e.longitude,
            timestamp=e.timestamp,
            video_source=e.video_source,
            severity=e.severity,
            status=e.status,
            is_simulated=e.is_simulated,
            created_at=e.created_at,
        )
        for e in ped_events
    ]
    return SafetySummaryResponse(
        total_pedestrians=pedestrians,
        school_zones_monitored=4,
        active_proximity_alerts=len([e for e in formatted if e.severity in ("HIGH", "CRITICAL")]),
        safety_incidents=formatted,
    )


# ---------------------------------------------------------
# Incident Intelligence & Evidence Review
# ---------------------------------------------------------
@router.get("/api/incidents", response_model=List[IncidentReviewResponse], tags=["Incidents"])
def list_incident_reviews(db: Session = Depends(get_db)):
    """Flagged incidents and hazardous road defect reviews."""
    events = (
        db.query(DetectionEvent)
        .filter(DetectionEvent.severity.in_(["HIGH", "CRITICAL"]))
        .order_by(DetectionEvent.timestamp.desc())
        .limit(30)
        .all()
    )
    reviews = []
    for e in events:
        reviews.append(
            IncidentReviewResponse(
                id=f"INC-{e.id[4:]}",
                event_id=e.id,
                incident_type="Severe Road Surface Defect" if "POTHOLE" in e.event_type else "Transit Hazard",
                severity=e.severity,
                timestamp=e.timestamp,
                bus_id=e.bus_id or "BUS-TG-101",
                latitude=e.latitude,
                longitude=e.longitude,
                video_source=e.video_source,
                anpr_status="NOT_CONFIGURED",
                license_plate_extracted=None,
                review_status="PENDING" if e.status == "NEW" else e.status,
            )
        )
    return reviews


# ---------------------------------------------------------
# Municipal Dispatch & Work Orders (Reference Page 10)
# ---------------------------------------------------------
@router.get("/api/dispatch/work-orders", response_model=List[WorkOrderResponse], tags=["Municipal"])
def list_work_orders(db: Session = Depends(get_db)):
    """List municipal maintenance work orders and inter-agency dispatch status."""
    orders = db.query(WorkOrder).order_by(WorkOrder.created_at.desc()).all()
    return orders


@router.post("/api/dispatch/work-orders", response_model=WorkOrderResponse, tags=["Municipal"])
def create_work_order(payload: WorkOrderCreate, db: Session = Depends(get_db)):
    """Create a new municipal work order dispatched to maintenance departments."""
    order = WorkOrder(
        defect_id=payload.defect_id,
        defect_type=payload.defect_type,
        severity=payload.severity,
        status="ASSIGNED",
        department=payload.department,
        assigned_to=payload.assigned_to,
        location=payload.location or "Telangana Transit Network",
        latitude=payload.latitude,
        longitude=payload.longitude,
    )
    db.add(order)
    db.commit()
    db.refresh(order)

    # Log audit
    audit = AuditLog(
        actor="dispatcher",
        action="WORK_ORDER_ASSIGNED",
        entity="WORK_ORDER",
        entity_id=order.id,
        details=f'{{"defect_id": "{order.defect_id}", "department": "{order.department}", "assigned_to": "{order.assigned_to}"}}',
    )
    db.add(audit)
    db.commit()
    return order


@router.patch("/api/dispatch/work-orders/{wo_id}", response_model=WorkOrderResponse, tags=["Municipal"])
def update_work_order(wo_id: str, payload: WorkOrderUpdate, db: Session = Depends(get_db)):
    """Update dispatch and resolution status of a municipal work order."""
    order = db.query(WorkOrder).filter(WorkOrder.id == wo_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Work order '{wo_id}' not found.")
    
    if payload.status:
        order.status = payload.status
    if payload.assigned_to:
        order.assigned_to = payload.assigned_to
    if payload.department:
        order.department = payload.department

    db.commit()
    db.refresh(order)

    audit = AuditLog(
        actor="operator",
        action="WORK_ORDER_UPDATED",
        entity="WORK_ORDER",
        entity_id=order.id,
        details=f'{{"status": "{order.status}", "assigned_to": "{order.assigned_to}"}}',
    )
    db.add(audit)
    db.commit()
    return order


# ---------------------------------------------------------
# Multi-Bus Verification Centre (Reference Page 9)
# ---------------------------------------------------------
@router.get("/api/verification/items", tags=["Verification"])
def list_verification_items(db: Session = Depends(get_db)):
    """Retrieve defect anomalies requiring multi-bus cross-validation and consensus."""
    events = (
        db.query(DetectionEvent)
        .filter(DetectionEvent.event_type.in_(["POTHOLE", "ROAD_CRACK", "ROAD_DAMAGE"]))
        .order_by(DetectionEvent.timestamp.desc())
        .limit(20)
        .all()
    )
    items = []
    for idx, e in enumerate(events):
        items.append({
            "id": e.id,
            "defect_id": e.id,
            "defect_class": e.detection_class,
            "confidence": e.confidence,
            "severity": e.severity,
            "status": e.status,
            "bus_id": e.bus_id or "BUS-TG-101",
            "latitude": e.latitude,
            "longitude": e.longitude,
            "timestamp": e.timestamp,
            "passes_count": 2 + (idx % 5),
            "consensus_lifecycle": "VERIFICATION" if e.status == "VERIFIED" else "DETECTED" if e.status == "NEW" else e.status,
            "sensor_fused_score": round(min(99.0, e.confidence * 100 + 4), 1),
            "department": "ROAD_MAINTENANCE",
        })
    return items


@router.post("/api/verification/{event_id}/pass", tags=["Verification"])
def submit_verification_pass(event_id: str, payload: VerificationPassRequest, db: Session = Depends(get_db)):
    """Submit a transit pass verification consensus vote."""
    event = db.query(DetectionEvent).filter(DetectionEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Defect '{event_id}' not found.")
    
    new_status = "RESOLVED" if payload.result == "CLEAR" else "VERIFIED"
    event.status = new_status
    db.commit()
    db.refresh(event)

    # Log audit entry
    notes_val = payload.notes or ""
    audit = AuditLog(
        actor=payload.bus_id,
        action="VERIFICATION_PASS",
        entity="ISSUE",
        entity_id=event.id,
        details=f'{{"result": "{payload.result}", "new_status": "{new_status}", "notes": "{notes_val}"}}',
    )
    db.add(audit)
    db.commit()

    return {"ok": True, "event_id": event.id, "status": event.status, "result": payload.result}


# ---------------------------------------------------------
# Route Intelligence & 500m Linear Chunks (Reference Page 6)
# ---------------------------------------------------------
@router.get("/api/routes", response_model=List[RouteResponse], tags=["Routes"])
def get_routes(db: Session = Depends(get_db)):
    """Return all configured transit corridors/routes."""
    routes = db.query(Route).all()
    return routes


@router.get("/api/routes/chunks", response_model=List[RouteChunkResponse], tags=["Routes"])
def get_route_chunks(db: Session = Depends(get_db)):
    """Return 500m linear highway chainage chunks across monitored corridors."""
    routes = db.query(Route).all()
    events = db.query(DetectionEvent).all()

    # Pre-calculated corridor metadata with real coordinates
    corridor_data = [
        {"id": "ROUTE-TG-01", "name": "Hyderabad Urban Transit Spine", "len_km": 32.0, "lat": 17.4399, "lng": 78.4983, "potholes": 12, "cracks": 8, "pci": 82.5},
        {"id": "ROUTE-TG-02", "name": "Northern Telangana Corridor", "len_km": 105.0, "lat": 18.1050, "lng": 78.8540, "potholes": 8, "cracks": 4, "pci": 79.0},
        {"id": "ROUTE-TG-03", "name": "Warangal Heritage Transit Highway", "len_km": 145.0, "lat": 17.9740, "lng": 79.5890, "potholes": 15, "cracks": 9, "pci": 68.4},
        {"id": "ROUTE-TG-04", "name": "Eastern Agro-Industrial Corridor", "len_km": 85.0, "lat": 17.3457, "lng": 78.5522, "potholes": 6, "cracks": 3, "pci": 88.0},
        {"id": "ROUTE-TG-05", "name": "North-Western Inter-City Line", "len_km": 175.0, "lat": 18.2540, "lng": 78.3210, "potholes": 18, "cracks": 11, "pci": 64.2},
        {"id": "ROUTE-TG-06", "name": "Southern Telangana Transit Highway", "len_km": 100.0, "lat": 17.0210, "lng": 78.1890, "potholes": 9, "cracks": 5, "pci": 81.3},
    ]

    chunks = []
    for c in corridor_data:
        # Generate 4 representative 500m segments for each corridor
        for seg in range(1, 5):
            start_km = round((seg - 1) * 0.5 + 2.0, 1)
            end_km = round(start_km + 0.5, 1)
            # Alternate health status
            pci = c["pci"] - (seg * 3.2)
            st = "Good" if pci >= 75.0 else "Fair" if pci >= 50.0 else "Critical"
            chunks.append(
                RouteChunkResponse(
                    chunk_id=f"CHK-{c['id'][-2:]}-{seg:03d}",
                    corridor_id=c["id"],
                    corridor_name=c["name"],
                    chainage_start_km=start_km,
                    chainage_end_km=end_km,
                    pci_health_score=round(pci, 1),
                    status=st,
                    defect_count=seg * 2,
                    pothole_count=seg,
                    crack_count=seg,
                    coordinates=[c["lat"] + (seg * 0.004), c["lng"] + (seg * 0.003)],
                )
            )
    return chunks


# ---------------------------------------------------------
# Admin Console & Operator Accounts (Reference Page 12)
# ---------------------------------------------------------
@router.get("/api/admin/users", response_model=List[OperatorUserResponse], tags=["Admin"])
def list_operator_users(db: Session = Depends(get_db)):
    """Retrieve registered operator accounts with roles and permissions."""
    users = db.query(OperatorUser).order_by(OperatorUser.created_at.desc()).all()
    return users


@router.post("/api/admin/users", response_model=OperatorUserResponse, tags=["Admin"])
def create_operator_user(payload: OperatorUserCreate, db: Session = Depends(get_db)):
    """Provision a new municipal operator account."""
    existing = db.query(OperatorUser).filter(OperatorUser.username == payload.username.strip()).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Username '{payload.username}' already registered.")
    
    user = OperatorUser(
        username=payload.username.strip(),
        role=payload.role.upper(),
        department=payload.department or "Road Maintenance",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    audit = AuditLog(
        actor="admin",
        action="USER_CREATED",
        entity="OPERATOR_USER",
        entity_id=user.id,
        details=f'{{"username": "{user.username}", "role": "{user.role}", "department": "{user.department}"}}',
    )
    db.add(audit)
    db.commit()
    return user


@router.delete("/api/admin/users/{user_id}", tags=["Admin"])
def delete_operator_user(user_id: str, db: Session = Depends(get_db)):
    """Delete an operator account."""
    user = db.query(OperatorUser).filter(OperatorUser.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User '{user_id}' not found.")
    
    username = user.username
    db.delete(user)
    db.commit()

    audit = AuditLog(
        actor="admin",
        action="USER_DELETED",
        entity="OPERATOR_USER",
        entity_id=user_id,
        details=f'{{"username": "{username}"}}',
    )
    db.add(audit)
    db.commit()
    return {"ok": True, "deleted_user_id": user_id}


# ---------------------------------------------------------
# Audit Logs (Reference Page 13)
# ---------------------------------------------------------
@router.get("/api/audit/logs", response_model=List[AuditLogResponse], tags=["Admin"])
def list_audit_logs(limit: int = 100, db: Session = Depends(get_db)):
    """Immutable audit trail of state transitions and authority decisions."""
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(limit).all()
    return logs


# ---------------------------------------------------------
# System Lifecycle & Demo Controls (Reference Page 13)
# ---------------------------------------------------------
@router.post("/api/system/seed", tags=["System"])
def trigger_seed_demo_data(db: Session = Depends(get_db)):
    """Re-seed demo events and ensure Telangana transit state is active."""
    from backend.database.seed import seed_database
    seed_database()
    audit = AuditLog(actor="admin", action="SYSTEM_RESEEDED", entity="DATABASE", details='{"action": "demo_seed"}')
    db.add(audit)
    db.commit()
    return {"ok": True, "message": "Telangana transit demo state synchronized."}


