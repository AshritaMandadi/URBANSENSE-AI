"""
UrbanSense AI - API Request and Response Schemas (Pydantic)
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


# --- Health ---
class RoadDamageModelStatus(BaseModel):
    status: str = Field(..., description="'READY' or 'NOT_READY'")
    is_ready: bool
    model_path: str
    loading_error: Optional[str] = None
    supported_classes: Dict[int, str]


class HealthResponse(BaseModel):
    status: str = "ok"
    version: str = "0.2.0"
    device: str
    database: str
    timestamp: datetime
    road_damage_model: Optional[RoadDamageModelStatus] = None


# --- Routes & Buses ---
class RouteResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    start_point: str
    end_point: str

    class Config:
        from_attributes = True


class GPSRecordResponse(BaseModel):
    id: int
    bus_id: str
    route_id: Optional[str] = None
    latitude: float
    longitude: float
    speed_kmh: float
    heading_deg: float
    timestamp: datetime
    is_simulated: bool

    class Config:
        from_attributes = True


class BusResponse(BaseModel):
    id: str
    route_id: Optional[str] = None
    license_plate: str
    model: str
    status: str
    created_at: datetime
    latest_gps: Optional[GPSRecordResponse] = None

    class Config:
        from_attributes = True


class LatestGPSResponse(BaseModel):
    bus_id: str
    route_id: Optional[str]
    latitude: float
    longitude: float
    speed_kmh: float
    heading_deg: float
    timestamp: datetime
    is_simulated: bool


# --- Detection Events ---
class DetectionEventResponse(BaseModel):
    id: str
    event_type: str
    detection_class: str
    confidence: float
    bbox: tuple[int, int, int, int] = Field(..., description="(x1, y1, x2, y2)")
    bus_id: Optional[str] = None
    latitude: float
    longitude: float
    timestamp: datetime
    video_source: Optional[str] = None
    severity: str
    status: str
    is_simulated: bool
    created_at: datetime

    class Config:
        from_attributes = True


class DetectionEventCreate(BaseModel):
    event_type: str
    detection_class: str
    confidence: float
    bbox_x1: int
    bbox_y1: int
    bbox_x2: int
    bbox_y2: int
    bus_id: Optional[str] = None
    latitude: float
    longitude: float
    timestamp: Optional[datetime] = None
    video_source: Optional[str] = None
    severity: Optional[str] = "MEDIUM"
    is_simulated: Optional[bool] = False


class EventStatusUpdate(BaseModel):
    status: str = Field(..., description="'NEW', 'ACKNOWLEDGED', 'VERIFIED', 'RESOLVED', 'DISMISSED'")


# --- Fleet Multi-Camera Channels ---
class CameraChannelStatus(BaseModel):
    channel_id: str
    channel_name: str
    position: str  # front, rear, left, right, cabin
    status: str    # ACTIVE, STANDBY, OFFLINE
    assigned_model: str
    resolution: str
    fps: int


class BusCameraConfigResponse(BaseModel):
    bus_id: str
    license_plate: str
    route_id: Optional[str] = None
    channels: List[CameraChannelStatus]


# --- Traffic & Safety Summaries ---
class TrafficSummaryResponse(BaseModel):
    total_vehicles: int
    cars: int
    buses: int
    trucks: int
    motorcycles: int
    bicycles: int
    estimated_density_level: str  # LOW, MODERATE, HIGH, SEVERE
    active_corridors_monitored: int
    camera_based_bottlenecks: List[Dict[str, Any]]


class SafetySummaryResponse(BaseModel):
    total_pedestrians: int
    school_zones_monitored: int
    active_proximity_alerts: int
    safety_incidents: List[DetectionEventResponse]


class IncidentReviewResponse(BaseModel):
    id: str
    event_id: str
    incident_type: str
    severity: str
    timestamp: datetime
    bus_id: str
    latitude: float
    longitude: float
    video_source: Optional[str] = None
    anpr_status: str  # NOT_CONFIGURED, DETECTED, UNREADABLE
    license_plate_extracted: Optional[str] = None
    review_status: str  # PENDING, REVIEWED, DISMISSED


# --- Videos & Jobs ---
class UploadedVideoResponse(BaseModel):
    id: str
    filename: str
    file_path: str
    file_size_bytes: int
    uploaded_at: datetime
    duration_seconds: Optional[float] = None
    frame_count: Optional[int] = None
    fps: Optional[float] = None
    bus_id: Optional[str] = None
    camera_channel: Optional[str] = "front"
    latest_job_status: Optional[str] = None
    has_annotated: Optional[bool] = False
    events_count: Optional[int] = 0

    class Config:
        from_attributes = True


class ProcessingJobResponse(BaseModel):
    id: str
    video_id: str
    status: str
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    annotated_video_path: Optional[str] = None
    summary_json_path: Optional[str] = None
    error_message: Optional[str] = None
    events_generated_count: int

    class Config:
        from_attributes = True


# --- Analytics Summary ---
class AnalyticsSummaryResponse(BaseModel):
    total_buses: int
    active_buses: int
    total_events: int
    pothole_count: int
    road_crack_count: int
    other_damage_count: int
    longitudinal_crack_count: int = 0
    transverse_crack_count: int = 0
    alligator_crack_count: int = 0
    vehicle_observations: int
    pedestrian_observations: int
    events_by_severity: Dict[str, int]
    events_by_type: Dict[str, int]
    bus_event_distribution: Dict[str, int]
    recent_events: List[DetectionEventResponse]
    road_damage_model_status: Optional[str] = "NOT_READY"


# --- Admin & Governance Schemas ---
class OperatorUserCreate(BaseModel):
    username: str
    role: str = "VIEWER"
    department: Optional[str] = "Road Maintenance"


class OperatorUserResponse(BaseModel):
    id: str
    username: str
    role: str
    department: str
    created_at: datetime

    class Config:
        from_attributes = True


class AuditLogResponse(BaseModel):
    id: int
    timestamp: datetime
    actor: str
    action: str
    entity: str
    entity_id: Optional[str] = None
    details: Optional[str] = None

    class Config:
        from_attributes = True


class WorkOrderCreate(BaseModel):
    defect_id: str
    defect_type: str
    severity: str = "MEDIUM"
    department: str = "ROAD_MAINTENANCE"
    assigned_to: str = "Telangana PWD Squad 4"
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class WorkOrderUpdate(BaseModel):
    status: Optional[str] = None
    assigned_to: Optional[str] = None
    department: Optional[str] = None


class WorkOrderResponse(BaseModel):
    id: str
    defect_id: str
    defect_type: str
    severity: str
    status: str
    department: str
    assigned_to: str
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    transit_passes: int
    confidence: float
    created_at: datetime

    class Config:
        from_attributes = True


class RouteChunkResponse(BaseModel):
    chunk_id: str
    corridor_id: str
    corridor_name: str
    chainage_start_km: float
    chainage_end_km: float
    pci_health_score: float
    status: str  # Good, Fair, Critical
    defect_count: int
    pothole_count: int
    crack_count: int
    coordinates: List[float]  # [lat, lng]


class VerificationPassRequest(BaseModel):
    bus_id: str
    result: str  # CLEAR or DEFECT_PRESENT
    notes: Optional[str] = None


