"""
UrbanSense AI - Database Models (SQLAlchemy)

Structured for SQLite in local development and designed for straightforward
migration to PostgreSQL/PostGIS in production.
"""

from datetime import datetime, timezone
import uuid

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Route(Base):
    """Public transport bus route."""
    __tablename__ = "routes"

    id = Column(String(50), primary_key=True)  # e.g., "ROUTE-101"
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    start_point = Column(String(100), nullable=False)
    end_point = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=utc_now)

    buses = relationship("Bus", back_populates="route")


class Bus(Base):
    """Monitored public transit vehicle equipped with sensing units."""
    __tablename__ = "buses"

    id = Column(String(50), primary_key=True)  # e.g., "BUS-DEL-101"
    route_id = Column(String(50), ForeignKey("routes.id"), nullable=True)
    license_plate = Column(String(20), nullable=False)
    model = Column(String(50), default="Standard Transit Bus")
    status = Column(String(20), default="ACTIVE")  # ACTIVE, IDLE, MAINTENANCE
    created_at = Column(DateTime, default=utc_now)

    route = relationship("Route", back_populates="buses")
    gps_records = relationship("GPSRecord", back_populates="bus", cascade="all, delete-orphan")
    events = relationship("DetectionEvent", back_populates="bus")


class GPSRecord(Base):
    """Simulated or physical vehicle telemetry point."""
    __tablename__ = "gps_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    bus_id = Column(String(50), ForeignKey("buses.id"), nullable=False, index=True)
    route_id = Column(String(50), nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    speed_kmh = Column(Float, default=0.0)
    heading_deg = Column(Float, default=0.0)
    timestamp = Column(DateTime, default=utc_now, index=True)
    is_simulated = Column(Boolean, default=True)  # Clearly labels simulated data

    bus = relationship("Bus", back_populates="gps_records")


class DetectionEvent(Base):
    """
    Structured urban intelligence event generated from computer vision inference.
    Pairs detection metadata with location coordinates and timestamp.
    """
    __tablename__ = "detection_events"

    id = Column(String(50), primary_key=True, default=lambda: f"EVT-{uuid.uuid4().hex[:10].upper()}")
    event_type = Column(String(50), nullable=False, index=True)
    # POTHOLE, ROAD_CRACK, ROAD_DAMAGE, VEHICLE_DETECTION, PEDESTRIAN_DETECTION, TRAFFIC_OBSERVATION
    
    detection_class = Column(String(50), nullable=False)
    confidence = Column(Float, nullable=False)
    
    # Bounding box coordinates in normalized or pixel space
    bbox_x1 = Column(Integer, nullable=False)
    bbox_y1 = Column(Integer, nullable=False)
    bbox_x2 = Column(Integer, nullable=False)
    bbox_y2 = Column(Integer, nullable=False)
    
    bus_id = Column(String(50), ForeignKey("buses.id"), nullable=True, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    timestamp = Column(DateTime, default=utc_now, index=True)
    video_source = Column(String(255), nullable=True)
    
    severity = Column(String(20), default="MEDIUM")  # LOW, MEDIUM, HIGH, CRITICAL, INFO
    status = Column(String(20), default="NEW")  # NEW, VERIFIED, RESOLVED, DISMISSED
    is_simulated = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utc_now)

    bus = relationship("Bus", back_populates="events")


class UploadedVideo(Base):
    """Recorded road video file ingested for processing."""
    __tablename__ = "uploaded_videos"

    id = Column(String(50), primary_key=True, default=lambda: f"VID-{uuid.uuid4().hex[:8].upper()}")
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    uploaded_at = Column(DateTime, default=utc_now)
    duration_seconds = Column(Float, nullable=True)
    frame_count = Column(Integer, nullable=True)
    fps = Column(Float, nullable=True)
    bus_id = Column(String(50), nullable=True)
    camera_channel = Column(String(50), default="front")

    jobs = relationship("ProcessingJob", back_populates="video", cascade="all, delete-orphan")


class ProcessingJob(Base):
    """Tracks asynchronous or synchronous video detection pipeline execution."""
    __tablename__ = "processing_jobs"

    id = Column(String(50), primary_key=True, default=lambda: f"JOB-{uuid.uuid4().hex[:8].upper()}")
    video_id = Column(String(50), ForeignKey("uploaded_videos.id"), nullable=False, index=True)
    status = Column(String(20), default="QUEUED")  # QUEUED, PROCESSING, COMPLETED, FAILED
    created_at = Column(DateTime, default=utc_now)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    annotated_video_path = Column(String(500), nullable=True)
    summary_json_path = Column(String(500), nullable=True)
    error_message = Column(Text, nullable=True)
    events_generated_count = Column(Integer, default=0)

    video = relationship("UploadedVideo", back_populates="jobs")


class OperatorUser(Base):
    """Registered administrative or municipal operator account."""
    __tablename__ = "operator_users"

    id = Column(String(50), primary_key=True, default=lambda: f"USR-{uuid.uuid4().hex[:8].upper()}")
    username = Column(String(50), unique=True, nullable=False)
    role = Column(String(20), default="VIEWER")  # ADMIN, AUTHORITY, VIEWER
    department = Column(String(50), default="Road Maintenance")
    created_at = Column(DateTime, default=utc_now)


class AuditLog(Base):
    """Immutable audit trail of system events, detections, and user workflow actions."""
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=utc_now, index=True)
    actor = Column(String(50), default="system")
    action = Column(String(50), nullable=False)  # ISSUE_OBSERVED, ISSUE_CREATED, STATUS_UPDATED, WORK_ORDER_ASSIGNED, USER_CREATED
    entity = Column(String(50), default="ISSUE")
    entity_id = Column(String(50), nullable=True)
    details = Column(Text, nullable=True)  # JSON representation of changes or payload


class WorkOrder(Base):
    """Municipal maintenance work order dispatched to public works departments."""
    __tablename__ = "work_orders"

    id = Column(String(50), primary_key=True, default=lambda: f"WO-{uuid.uuid4().hex[:8].upper()}")
    defect_id = Column(String(50), nullable=False)
    defect_type = Column(String(50), nullable=False)
    severity = Column(String(20), default="MEDIUM")  # LOW, MEDIUM, HIGH, CRITICAL
    status = Column(String(50), default="PENDING")  # PENDING, ASSIGNED, IN_PROGRESS, RESOLVED
    department = Column(String(50), default="ROAD_MAINTENANCE")  # ROAD_MAINTENANCE, DRAINAGE, TRAFFIC_MANAGEMENT
    assigned_to = Column(String(100), default="Telangana PWD Squad 4")
    location = Column(String(150), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    transit_passes = Column(Integer, default=1)
    confidence = Column(Float, default=0.85)
    created_at = Column(DateTime, default=utc_now)

