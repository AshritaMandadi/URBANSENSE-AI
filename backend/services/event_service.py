"""
UrbanSense AI - Urban Event Generation Service

Transforms raw computer vision detections into structured, location-aware
smart city events with deterministic severity scoring.
Strictly creates events from actual model outputs (never fabricates detections).
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
import uuid

from sqlalchemy import func
from sqlalchemy.orm import Session

from ai_engine.detection.detector import Detection
from backend.database.models import Bus, DetectionEvent, GPSRecord


EVENT_TYPE_MAPPING: Dict[str, Tuple[str, str]] = {
    # Road Hazards
    "pothole": ("POTHOLE", "HIGH"),
    "alligator_crack": ("ROAD_CRACK", "MEDIUM"),
    "longitudinal_crack": ("ROAD_CRACK", "LOW"),
    "transverse_crack": ("ROAD_CRACK", "LOW"),
    "road_damage": ("ROAD_DAMAGE", "MEDIUM"),
    # Transit & Traffic Context
    "car": ("VEHICLE_DETECTION", "INFO"),
    "bus": ("VEHICLE_DETECTION", "INFO"),
    "truck": ("VEHICLE_DETECTION", "INFO"),
    "motorcycle": ("VEHICLE_DETECTION", "INFO"),
    "bicycle": ("VEHICLE_DETECTION", "INFO"),
    "person": ("PEDESTRIAN_DETECTION", "INFO"),
    "traffic light": ("TRAFFIC_OBSERVATION", "INFO"),
    "stop sign": ("TRAFFIC_OBSERVATION", "INFO"),
}


class EventService:
    """Handles event creation, categorization, and query services."""

    @staticmethod
    def map_detection_to_event_metadata(
        detection_class: str,
        confidence: float,
    ) -> Tuple[str, str]:
        """
        Determine event type and severity from class and confidence score.
        """
        cls_lower = detection_class.lower()

        if cls_lower in EVENT_TYPE_MAPPING:
            event_type, base_sev = EVENT_TYPE_MAPPING[cls_lower]
        else:
            event_type = "ROAD_DAMAGE" if "crack" in cls_lower or "damage" in cls_lower else "TRAFFIC_OBSERVATION"
            base_sev = "MEDIUM"

        # Elevate severity for high confidence hazardous road conditions
        if event_type == "POTHOLE":
            severity = "CRITICAL" if confidence >= 0.85 else "HIGH"
        elif event_type in ("ROAD_CRACK", "ROAD_DAMAGE"):
            if confidence >= 0.85:
                severity = "HIGH"
            elif confidence >= 0.70:
                severity = "MEDIUM"
            else:
                severity = "LOW"
        else:
            severity = base_sev

        return event_type, severity

    @staticmethod
    def create_event_from_detection(
        detection: Detection,
        bus_id: Optional[str],
        latitude: float,
        longitude: float,
        db: Session,
        video_source: Optional[str] = None,
        timestamp: Optional[datetime] = None,
        is_simulated: bool = False,
    ) -> DetectionEvent:
        """
        Persist a single real detection as an urban event.
        """
        event_type, severity = EventService.map_detection_to_event_metadata(
            detection.class_name, detection.confidence
        )
        x1, y1, x2, y2 = detection.bbox

        event = DetectionEvent(
            id=f"EVT-{uuid.uuid4().hex[:10].upper()}",
            event_type=event_type,
            detection_class=detection.class_name,
            confidence=round(detection.confidence, 4),
            bbox_x1=x1,
            bbox_y1=y1,
            bbox_x2=x2,
            bbox_y2=y2,
            bus_id=bus_id,
            latitude=round(latitude, 6),
            longitude=round(longitude, 6),
            timestamp=timestamp or datetime.now(timezone.utc),
            video_source=video_source,
            severity=severity,
            status="NEW",
            is_simulated=is_simulated,
        )

        db.add(event)
        db.commit()
        db.refresh(event)
        return event

    @staticmethod
    def get_events(
        db: Session,
        event_type: Optional[str] = None,
        severity: Optional[str] = None,
        bus_id: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[DetectionEvent]:
        """Query events with filtering and pagination."""
        query = db.query(DetectionEvent)

        if event_type:
            query = query.filter(DetectionEvent.event_type == event_type.upper())
        if severity:
            query = query.filter(DetectionEvent.severity == severity.upper())
        if bus_id:
            query = query.filter(DetectionEvent.bus_id == bus_id)
        if status:
            query = query.filter(DetectionEvent.status == status.upper())

        return query.order_by(DetectionEvent.timestamp.desc()).offset(offset).limit(limit).all()

    @staticmethod
    def get_event_by_id(event_id: str, db: Session) -> Optional[DetectionEvent]:
        """Fetch a specific event by ID."""
        return db.query(DetectionEvent).filter(DetectionEvent.id == event_id).first()

    @staticmethod
    def update_event_status(event_id: str, new_status: str, db: Session) -> Optional[DetectionEvent]:
        """Update review or verification status of an urban sensing event."""
        event = db.query(DetectionEvent).filter(DetectionEvent.id == event_id).first()
        if not event:
            return None
        valid_statuses = {"NEW", "ACKNOWLEDGED", "VERIFIED", "RESOLVED", "DISMISSED"}
        norm_status = new_status.strip().upper()
        if norm_status in valid_statuses:
            event.status = norm_status
            db.commit()
            db.refresh(event)
        return event

    @staticmethod
    def get_analytics_summary(db: Session) -> Dict[str, Any]:
        """Aggregate statistical summary for dashboard analytics."""
        total_buses = db.query(Bus).count()
        active_buses = db.query(Bus).filter(Bus.status == "ACTIVE").count()
        total_events = db.query(DetectionEvent).count()

        pothole_count = db.query(DetectionEvent).filter(DetectionEvent.event_type == "POTHOLE").count()
        road_crack_count = db.query(DetectionEvent).filter(DetectionEvent.event_type == "ROAD_CRACK").count()
        other_damage_count = db.query(DetectionEvent).filter(DetectionEvent.event_type == "ROAD_DAMAGE").count()
        longitudinal_crack_count = db.query(DetectionEvent).filter(DetectionEvent.detection_class == "longitudinal_crack").count()
        transverse_crack_count = db.query(DetectionEvent).filter(DetectionEvent.detection_class == "transverse_crack").count()
        alligator_crack_count = db.query(DetectionEvent).filter(DetectionEvent.detection_class == "alligator_crack").count()

        vehicle_observations = db.query(DetectionEvent).filter(DetectionEvent.event_type == "VEHICLE_DETECTION").count()
        pedestrian_observations = db.query(DetectionEvent).filter(DetectionEvent.event_type == "PEDESTRIAN_DETECTION").count()

        from ai_engine.detection.road_damage_detector import RoadDamageDetector
        rdd_status = RoadDamageDetector().status

        # Group by severity
        sev_counts = (
            db.query(DetectionEvent.severity, func.count(DetectionEvent.id))
            .group_by(DetectionEvent.severity)
            .all()
        )
        events_by_severity = {sev: count for sev, count in sev_counts}

        # Group by event type
        type_counts = (
            db.query(DetectionEvent.event_type, func.count(DetectionEvent.id))
            .group_by(DetectionEvent.event_type)
            .all()
        )
        events_by_type = {t: count for t, count in type_counts}

        # Group by bus
        bus_counts = (
            db.query(DetectionEvent.bus_id, func.count(DetectionEvent.id))
            .filter(DetectionEvent.bus_id.isnot(None))
            .group_by(DetectionEvent.bus_id)
            .all()
        )
        bus_event_distribution = {b: count for b, count in bus_counts}

        # Recent 10 events
        recent = db.query(DetectionEvent).order_by(DetectionEvent.timestamp.desc()).limit(10).all()

        return {
            "total_buses": total_buses,
            "active_buses": active_buses,
            "total_events": total_events,
            "pothole_count": pothole_count,
            "road_crack_count": road_crack_count,
            "other_damage_count": other_damage_count,
            "longitudinal_crack_count": longitudinal_crack_count,
            "transverse_crack_count": transverse_crack_count,
            "alligator_crack_count": alligator_crack_count,
            "vehicle_observations": vehicle_observations,
            "pedestrian_observations": pedestrian_observations,
            "road_damage_model_status": rdd_status,
            "events_by_severity": events_by_severity,
            "events_by_type": events_by_type,
            "bus_event_distribution": bus_event_distribution,
            "recent_events": [
                {
                    "id": e.id,
                    "event_type": e.event_type,
                    "detection_class": e.detection_class,
                    "confidence": e.confidence,
                    "bbox": (e.bbox_x1, e.bbox_y1, e.bbox_x2, e.bbox_y2),
                    "bus_id": e.bus_id,
                    "latitude": e.latitude,
                    "longitude": e.longitude,
                    "timestamp": e.timestamp,
                    "video_source": e.video_source,
                    "severity": e.severity,
                    "status": e.status,
                    "is_simulated": e.is_simulated,
                    "created_at": e.created_at,
                }
                for e in recent
            ],
        }

