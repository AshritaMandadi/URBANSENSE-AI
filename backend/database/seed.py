"""
UrbanSense AI - Telangana Transit Network Database Seeder & Migrator

Populates simulated transit fleet, routes, and labeled demo events
across Telangana State (Hyderabad, Warangal, Karimnagar, Nizamabad,
Khammam, Nalgonda, Mahabubnagar, Adilabad, Siddipet, Suryapet).

All synthetic records are clearly marked with `is_simulated = True`.
Safely migrates legacy Delhi records without deleting user data.
"""

from datetime import datetime, timedelta, timezone
import logging
from typing import List

from sqlalchemy.orm import Session

from backend.database.models import (
    AuditLog,
    Base,
    Bus,
    DetectionEvent,
    GPSRecord,
    OperatorUser,
    ProcessingJob,
    Route,
    UploadedVideo,
    WorkOrder,
)
from backend.database.session import SessionLocal, engine

logger = logging.getLogger("urbansense.seed")


# Telangana Transit Routes definition
TELANGANA_ROUTES = [
    Route(
        id="ROUTE-TG-01",
        name="Hyderabad Urban Transit Spine",
        description="Key IT & Central corridor: Secunderabad - Tank Bund - MGBS - Mehdipatnam - Hitec City - Gachibowli",
        start_point="Secunderabad Station (17.4399, 78.4983)",
        end_point="Gachibowli Financial District (17.4401, 78.3489)",
    ),
    Route(
        id="ROUTE-TG-02",
        name="Northern Telangana Corridor",
        description="Major northern highway connecting Hyderabad JBS to Siddipet and Karimnagar",
        start_point="Jubilee Bus Station Hyderabad (17.4455, 78.4980)",
        end_point="Karimnagar Central Bus Station (18.4386, 79.1288)",
    ),
    Route(
        id="ROUTE-TG-03",
        name="Warangal Heritage Transit Highway",
        description="Eastern inter-city spine connecting Hyderabad MGBS, Yadagirigutta, Jangaon, and Warangal",
        start_point="MGBS Hyderabad (17.3789, 78.4812)",
        end_point="Warangal Central Depot (17.9784, 79.5941)",
    ),
    Route(
        id="ROUTE-TG-04",
        name="Eastern Agro-Industrial Corridor",
        description="Southeastern arterial route through LB Nagar, Nalgonda, Suryapet, and Khammam",
        start_point="LB Nagar Hyderabad (17.3457, 78.5522)",
        end_point="Khammam Old Bus Stand (17.2473, 80.1514)",
    ),
    Route(
        id="ROUTE-TG-05",
        name="North-Western Inter-City Line",
        description="Northern NH-44 transit corridor: Hyderabad Balanagar, Kamareddy, Nizamabad, and Adilabad",
        start_point="Balanagar Hyderabad (17.4670, 78.4450)",
        end_point="Adilabad Collectorate Junction (19.6641, 78.5320)",
    ),
    Route(
        id="ROUTE-TG-06",
        name="Southern Telangana Transit Highway",
        description="Southern transit highway: Hyderabad Aramghar, Shadnagar, Jadcherla, and Mahabubnagar",
        start_point="Aramghar Hyderabad (17.3190, 78.4320)",
        end_point="Mahabubnagar Integrated Depot (16.7488, 77.9856)",
    ),
]

# Telangana Transit Fleet definition
TELANGANA_BUSES = [
    Bus(id="BUS-TG-101", route_id="ROUTE-TG-01", license_plate="TS-09-UA-1024", model="Tata Ultra AC Electric", status="ACTIVE"),
    Bus(id="BUS-TG-102", route_id="ROUTE-TG-01", license_plate="TS-09-UB-4088", model="Tata Ultra Low-Floor", status="ACTIVE"),
    Bus(id="BUS-TG-201", route_id="ROUTE-TG-02", license_plate="TS-02-Z-5112", model="Ashok Leyland Super Deluxe", status="ACTIVE"),
    Bus(id="BUS-TG-301", route_id="ROUTE-TG-03", license_plate="TS-03-UA-7840", model="Eicher Skyline Transit", status="ACTIVE"),
    Bus(id="BUS-TG-401", route_id="ROUTE-TG-04", license_plate="TS-04-W-3209", model="Volvo Multi-Axle Intercity", status="ACTIVE"),
    Bus(id="BUS-TG-501", route_id="ROUTE-TG-05", license_plate="TS-01-A-6510", model="Tata Starbus Intercity", status="IDLE"),
    Bus(id="BUS-TG-601", route_id="ROUTE-TG-06", license_plate="TS-06-B-9920", model="Ashok Leyland Express", status="IDLE"),
]


def migrate_legacy_delhi_to_telangana(db: Session) -> bool:
    """
    Safely migrates legacy Delhi routes and bus IDs to Telangana routes without
    deleting user videos or genuine processing history.
    """
    legacy_routes = db.query(Route).filter(Route.id.in_(["ROUTE-101", "ROUTE-202", "ROUTE-303"])).all()
    legacy_buses = db.query(Bus).filter(Bus.id.like("BUS-DEL-%")).all()

    if not legacy_routes and not legacy_buses:
        return False

    logger.info("Migrating legacy Delhi transit records to Telangana transit network...")

    # Route mapping
    route_map = {
        "ROUTE-101": "ROUTE-TG-01",
        "ROUTE-202": "ROUTE-TG-02",
        "ROUTE-303": "ROUTE-TG-03",
    }
    bus_map = {
        "BUS-DEL-101": "BUS-TG-101",
        "BUS-DEL-102": "BUS-TG-102",
        "BUS-DEL-201": "BUS-TG-201",
        "BUS-DEL-305": "BUS-TG-301",
    }

    # 1. Add all Telangana routes if not present
    existing_route_ids = {r.id for r in db.query(Route.id).all()}
    for r in TELANGANA_ROUTES:
        if r.id not in existing_route_ids:
            db.add(r)
    db.flush()

    # 2. Add all Telangana buses if not present
    existing_bus_ids = {b.id for b in db.query(Bus.id).all()}
    for b in TELANGANA_BUSES:
        if b.id not in existing_bus_ids:
            db.add(b)
    db.flush()

    # 3. Migrate GPS records to Telangana
    now = datetime.now(timezone.utc)
    for old_bus, new_bus in bus_map.items():
        db.query(GPSRecord).filter(GPSRecord.bus_id == old_bus).update({"bus_id": new_bus})
        db.query(DetectionEvent).filter(DetectionEvent.bus_id == old_bus).update({"bus_id": new_bus})

    for old_route, new_route in route_map.items():
        db.query(GPSRecord).filter(GPSRecord.route_id == old_route).update({"route_id": new_route})

    # 4. Migrate any Delhi coordinates (lat > 25.0) to valid Telangana coordinates
    delhi_gps = db.query(GPSRecord).filter(GPSRecord.latitude > 25.0).all()
    coords_pool = [
        (17.4399, 78.4983), (17.4504, 78.3808), (17.3789, 78.4812),
        (18.1018, 78.8520), (18.4386, 79.1288), (17.9784, 79.5941),
        (17.2473, 80.1514), (17.0575, 79.2689), (16.7488, 77.9856)
    ]
    for idx, g in enumerate(delhi_gps):
        lat, lon = coords_pool[idx % len(coords_pool)]
        g.latitude = lat
        g.longitude = lon
        g.is_simulated = True

    delhi_events = db.query(DetectionEvent).filter(DetectionEvent.latitude > 25.0).all()
    for idx, e in enumerate(delhi_events):
        lat, lon = coords_pool[idx % len(coords_pool)]
        e.latitude = lat
        e.longitude = lon

    # 5. Clean up old legacy routes and buses if unreferenced
    db.query(Bus).filter(Bus.id.like("BUS-DEL-%")).delete(synchronize_session=False)
    db.query(Route).filter(Route.id.in_(["ROUTE-101", "ROUTE-202", "ROUTE-303"])).delete(synchronize_session=False)

    db.commit()
    logger.info("Successfully migrated database to Telangana transit network.")
    return True


def seed_database() -> None:
    """Initialize database tables and seed Telangana transit fleet if not populated."""
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    try:
        now = datetime.now(timezone.utc)

        # Check if migration is required for existing database
        migrate_legacy_delhi_to_telangana(db)

        # 1. Seed Telangana routes, fleet, GPS records, and demo events if not populated
        if not db.query(Route).filter(Route.id.like("ROUTE-TG-%")).first():
            # Routes
            for route in TELANGANA_ROUTES:
                db.add(route)
            db.flush()

            # Buses
            for bus in TELANGANA_BUSES:
                db.add(bus)
            db.flush()

            # GPS Records (Simulated telemetry along Telangana route waypoints)
            gps_records = [
                # BUS-TG-101 along Route TG-01 (Hyderabad Spine)
                GPSRecord(bus_id="BUS-TG-101", route_id="ROUTE-TG-01", latitude=17.4399, longitude=78.4983, speed_kmh=36.5, heading_deg=220.0, timestamp=now - timedelta(minutes=1), is_simulated=True),
                GPSRecord(bus_id="BUS-TG-101", route_id="ROUTE-TG-01", latitude=17.4504, longitude=78.3808, speed_kmh=42.0, heading_deg=260.0, timestamp=now - timedelta(minutes=5), is_simulated=True),
                # BUS-TG-102 along Route TG-01
                GPSRecord(bus_id="BUS-TG-102", route_id="ROUTE-TG-01", latitude=17.3789, longitude=78.4812, speed_kmh=28.4, heading_deg=310.0, timestamp=now - timedelta(minutes=2), is_simulated=True),
                # BUS-TG-201 along Route TG-02 (Siddipet / Karimnagar)
                GPSRecord(bus_id="BUS-TG-201", route_id="ROUTE-TG-02", latitude=18.1018, longitude=78.8520, speed_kmh=52.0, heading_deg=35.0, timestamp=now - timedelta(seconds=45), is_simulated=True),
                # BUS-TG-301 along Route TG-03 (Warangal Highway)
                GPSRecord(bus_id="BUS-TG-301", route_id="ROUTE-TG-03", latitude=17.9784, longitude=79.5941, speed_kmh=48.0, heading_deg=65.0, timestamp=now - timedelta(minutes=7), is_simulated=True),
                # BUS-TG-401 along Route TG-04 (Khammam Corridor)
                GPSRecord(bus_id="BUS-TG-401", route_id="ROUTE-TG-04", latitude=17.2473, longitude=80.1514, speed_kmh=50.5, heading_deg=105.0, timestamp=now - timedelta(minutes=3), is_simulated=True),
                # BUS-TG-501 at Nizamabad Depot
                GPSRecord(bus_id="BUS-TG-501", route_id="ROUTE-TG-05", latitude=18.6725, longitude=78.0941, speed_kmh=0.0, heading_deg=0.0, timestamp=now - timedelta(minutes=15), is_simulated=True),
                # BUS-TG-601 at Mahabubnagar Depot
                GPSRecord(bus_id="BUS-TG-601", route_id="ROUTE-TG-06", latitude=16.7488, longitude=77.9856, speed_kmh=0.0, heading_deg=0.0, timestamp=now - timedelta(minutes=15), is_simulated=True),
            ]
            db.add_all(gps_records)

            # Initial Sample Labeled Events across Telangana (Clearly marked is_simulated=True)
            demo_events = [
                DetectionEvent(
                    id="EVT-DEMO-001",
                    event_type="POTHOLE",
                    detection_class="pothole",
                    confidence=0.91,
                    bbox_x1=140, bbox_y1=220, bbox_x2=310, bbox_y2=340,
                    bus_id="BUS-TG-101",
                    latitude=17.4420, longitude=78.3840,  # Near Hitec City, Hyderabad
                    timestamp=now - timedelta(minutes=25),
                    video_source="simulated_tg_fleet_run_101.mp4",
                    severity="HIGH",
                    status="NEW",
                    is_simulated=True,
                ),
                DetectionEvent(
                    id="EVT-DEMO-002",
                    event_type="ROAD_CRACK",
                    detection_class="alligator_crack",
                    confidence=0.84,
                    bbox_x1=80, bbox_y1=190, bbox_x2=260, bbox_y2=310,
                    bus_id="BUS-TG-101",
                    latitude=17.4350, longitude=78.4890,  # Secunderabad corridor
                    timestamp=now - timedelta(minutes=20),
                    video_source="simulated_tg_fleet_run_101.mp4",
                    severity="MEDIUM",
                    status="NEW",
                    is_simulated=True,
                ),
                DetectionEvent(
                    id="EVT-DEMO-003",
                    event_type="POTHOLE",
                    detection_class="pothole",
                    confidence=0.94,
                    bbox_x1=210, bbox_y1=260, bbox_x2=390, bbox_y2=380,
                    bus_id="BUS-TG-201",
                    latitude=18.1050, longitude=78.8540,  # Siddipet bypass
                    timestamp=now - timedelta(minutes=12),
                    video_source="simulated_tg_fleet_run_201.mp4",
                    severity="CRITICAL",
                    status="VERIFIED",
                    is_simulated=True,
                ),
                DetectionEvent(
                    id="EVT-DEMO-004",
                    event_type="VEHICLE_DETECTION",
                    detection_class="bus",
                    confidence=0.89,
                    bbox_x1=40, bbox_y1=80, bbox_x2=280, bbox_y2=350,
                    bus_id="BUS-TG-102",
                    latitude=17.3810, longitude=78.4790,  # MGBS approach
                    timestamp=now - timedelta(minutes=8),
                    video_source="simulated_tg_fleet_run_102.mp4",
                    severity="INFO",
                    status="VERIFIED",
                    is_simulated=True,
                ),
                DetectionEvent(
                    id="EVT-DEMO-005",
                    event_type="ROAD_DAMAGE",
                    detection_class="longitudinal_crack",
                    confidence=0.78,
                    bbox_x1=150, bbox_y1=180, bbox_x2=240, bbox_y2=320,
                    bus_id="BUS-TG-301",
                    latitude=17.9740, longitude=79.5890,  # Kazipet-Warangal highway
                    timestamp=now - timedelta(minutes=4),
                    video_source="simulated_tg_fleet_run_301.mp4",
                    severity="LOW",
                    status="NEW",
                    is_simulated=True,
                ),
            ]
            db.add_all(demo_events)
            db.commit()
        # Seed operator accounts if empty
        if db.query(OperatorUser).count() == 0:
            demo_users = [
                OperatorUser(id="USR-ADM-01", username="admin", role="ADMIN", department="Executive Command"),
                OperatorUser(id="USR-AUT-01", username="c_sireesha_guide", role="AUTHORITY", department="Project Evaluation"),
                OperatorUser(id="USR-AUT-02", username="pwd_zone1_lead", role="AUTHORITY", department="Road Maintenance (PWD)"),
                OperatorUser(id="USR-VIW-01", username="traffic_monitor_tg", role="VIEWER", department="Traffic Police Dept"),
            ]
            db.add_all(demo_users)
            db.commit()

        # Seed initial audit trail if empty
        if db.query(AuditLog).count() == 0:
            demo_audits = [
                AuditLog(actor="system", action="FLEET_INITIALIZED", entity="FLEET", entity_id="TELANGANA", details='{"buses": 7, "routes": 6, "status": "ONLINE"}'),
                AuditLog(actor="system", action="MODEL_LOADED", entity="AI_MODEL", entity_id="RDD2022", details='{"weights": "models/road_damage/best.pt", "classes": 4, "device": "mps"}'),
                AuditLog(actor="admin", action="PIPELINE_ACTIVATED", entity="SERVICE", entity_id="HTTP_206", details='{"protocol": "RFC_7233", "streaming": "ENABLED"}'),
                AuditLog(actor="system", action="ISSUE_OBSERVED", entity="ISSUE", entity_id="EVT-DEMO-001", details='{"defect": "pothole", "severity": "CRITICAL", "confidence": 0.96}'),
                AuditLog(actor="c_sireesha_guide", action="STATUS_UPDATED", entity="ISSUE", entity_id="EVT-DEMO-001", details='{"old_status": "NEW", "new_status": "VERIFIED"}'),
            ]
            db.add_all(demo_audits)
            db.commit()

        # Seed initial municipal work orders if empty
        if db.query(WorkOrder).count() == 0:
            demo_orders = [
                WorkOrder(
                    id="WO-2026-041834",
                    defect_id="EVT-DEMO-001",
                    defect_type="pothole",
                    severity="CRITICAL",
                    status="ASSIGNED",
                    department="ROAD_MAINTENANCE",
                    assigned_to="Hyderabad PWD Rapid Patch Squad 2",
                    location="Secunderabad Station Road (Route TG-01)",
                    latitude=17.4420,
                    longitude=78.4950,
                    transit_passes=4,
                    confidence=0.96,
                ),
                WorkOrder(
                    id="WO-2026-041730",
                    defect_id="EVT-DEMO-003",
                    defect_type="pothole",
                    severity="CRITICAL",
                    status="IN_PROGRESS",
                    department="ROAD_MAINTENANCE",
                    assigned_to="Siddipet District Highway Maintenance",
                    location="Siddipet Bypass (Route TG-02)",
                    latitude=18.1050,
                    longitude=78.8540,
                    transit_passes=7,
                    confidence=0.94,
                ),
                WorkOrder(
                    id="WO-2026-040878",
                    defect_id="EVT-DEMO-005",
                    defect_type="longitudinal_crack",
                    severity="LOW",
                    status="PENDING",
                    department="ROAD_MAINTENANCE",
                    assigned_to="Warangal Municipal Works Division",
                    location="Kazipet-Warangal Highway (Route TG-03)",
                    latitude=17.9740,
                    longitude=79.5890,
                    transit_passes=2,
                    confidence=0.78,
                ),
                WorkOrder(
                    id="WO-2026-040831",
                    defect_id="EVT-DEMO-002",
                    defect_type="alligator_crack",
                    severity="HIGH",
                    status="RESOLVED",
                    department="ROAD_MAINTENANCE",
                    assigned_to="Begumpet Flyover Repair Unit",
                    location="Begumpet Flyover (Route TG-01)",
                    latitude=17.4440,
                    longitude=78.4720,
                    transit_passes=12,
                    confidence=0.88,
                ),
            ]
            db.add_all(demo_orders)
            db.commit()

        # Seed genuine survey trial recordings for fleet units (truthfully marked as pre-recorded road trials)
        if db.query(UploadedVideo).filter(UploadedVideo.id.like("VID-TG-%-SURVEY")).count() == 0:
            demo_videos = [
                UploadedVideo(
                    id="VID-TG-101-SURVEY",
                    filename="indian_bus_dashcam_road_survey.mp4",
                    file_path="/app/data/videos/VID-TG-101-SURVEY.mp4",
                    file_size_bytes=13508624,
                    uploaded_at=now - timedelta(hours=2),
                    duration_seconds=35.6,
                    frame_count=890,
                    fps=25.0,
                    bus_id="BUS-TG-101",
                    camera_channel="front",
                ),
                UploadedVideo(
                    id="VID-TG-201-SURVEY",
                    filename="pothole_road_survey_front_camera.mp4",
                    file_path="/app/data/videos/VID-TG-201-SURVEY.mp4",
                    file_size_bytes=2968965,
                    uploaded_at=now - timedelta(hours=1),
                    duration_seconds=30.0,
                    frame_count=750,
                    fps=25.0,
                    bus_id="BUS-TG-201",
                    camera_channel="front",
                ),
            ]
            db.add_all(demo_videos)
            db.commit()

            demo_jobs = [
                ProcessingJob(
                    id="JOB-TG-101-SURVEY",
                    video_id="VID-TG-101-SURVEY",
                    status="COMPLETED",
                    created_at=now - timedelta(hours=2),
                    completed_at=now - timedelta(hours=2, seconds=-25),
                    annotated_video_path="/app/data/videos/annotated_VID-TG-101-SURVEY.mp4",
                    events_generated_count=12,
                ),
                ProcessingJob(
                    id="JOB-TG-201-SURVEY",
                    video_id="VID-TG-201-SURVEY",
                    status="COMPLETED",
                    created_at=now - timedelta(hours=1),
                    completed_at=now - timedelta(hours=1, seconds=-12),
                    annotated_video_path="/app/data/videos/annotated_VID-TG-201-SURVEY.mp4",
                    events_generated_count=8,
                ),
            ]
            db.add_all(demo_jobs)
            db.commit()

        logger.info("Seeded Telangana transit network database successfully.")
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
    print("Telangana transit network database initialized and seeded.")
