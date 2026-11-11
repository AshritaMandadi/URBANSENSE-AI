"""
UrbanSense AI - GPS Simulation & Telemetry Service

Provides simulated and physical GPS ingestion for monitored transit fleets.
Clearly marks simulated telemetry with `is_simulated = True`.
Designed with an abstraction layer so real NMEA/MQTT GPS devices can be plugged in.
"""

from datetime import datetime, timezone
import math
from typing import Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from backend.database.models import Bus, GPSRecord, Route


# Geographically validated transit route waypoints across Telangana State (Lat, Lng)
ROUTE_WAYPOINTS: Dict[str, List[Tuple[float, float]]] = {
    # Route 1: Hyderabad Urban Transit Spine
    "ROUTE-TG-01": [
        (17.4399, 78.4983),  # Secunderabad Railway Station
        (17.4065, 78.4772),  # Tank Bund / Secretariat
        (17.3789, 78.4812),  # MGBS Central Bus Station
        (17.3916, 78.4400),  # Mehdipatnam Junction
        (17.4265, 78.4120),  # Jubilee Hills Check Post
        (17.4504, 78.3808),  # Hitec City Cyber Towers
        (17.4401, 78.3489),  # Gachibowli Financial District
    ],
    # Route 2: Northern Telangana Corridor (Hyderabad -> Siddipet -> Karimnagar)
    "ROUTE-TG-02": [
        (17.4455, 78.4980),  # Jubilee Bus Station (JBS), Secunderabad
        (17.6520, 78.5830),  # Shamirpet ORR Junction
        (17.8500, 78.6800),  # Pragnapur / Gajwel
        (18.1018, 78.8520),  # Siddipet Integrated Bus Station
        (18.2850, 78.9800),  # Thimmapur Highway
        (18.4386, 79.1288),  # Karimnagar Central Bus Station
    ],
    # Route 3: Warangal Heritage Transit Highway (Hyderabad -> Yadagirigutta -> Jangaon -> Warangal)
    "ROUTE-TG-03": [
        (17.3789, 78.4812),  # MGBS Hyderabad
        (17.4050, 78.5600),  # Uppal Cross Roads
        (17.5115, 78.8890),  # Bhongir / Yadagirigutta Junction
        (17.6200, 79.0300),  # Alair Bypass
        (17.7231, 79.1550),  # Jangaon Bus Station
        (17.8800, 79.3500),  # Kazipet Junction
        (17.9784, 79.5941),  # Warangal / Hanamkonda Central Depot
    ],
    # Route 4: Eastern Telangana Corridor (Hyderabad -> Nalgonda -> Suryapet -> Khammam)
    "ROUTE-TG-04": [
        (17.3457, 78.5522),  # LB Nagar Bus Station, Hyderabad
        (17.2000, 78.9000),  # Choutuppal NH-65
        (17.0575, 79.2689),  # Nalgonda Clock Tower / Bus Station
        (17.1439, 79.6239),  # Suryapet Hi-Tech Bus Station
        (17.2473, 80.1514),  # Khammam Old Bus Stand
    ],
    # Route 5: North-Western Inter-City Line (Hyderabad -> Kamareddy -> Nizamabad -> Adilabad)
    "ROUTE-TG-05": [
        (17.4670, 78.4450),  # Balanagar / Kukatpally, Hyderabad
        (17.7800, 78.3600),  # Medchal NH-44 Corridor
        (18.3200, 78.3400),  # Kamareddy Bus Station
        (18.6725, 78.0941),  # Nizamabad Central Bus Stand
        (19.1000, 78.3500),  # Nirmal Gateway
        (19.6641, 78.5320),  # Adilabad Collectorate Junction
    ],
    # Route 6: Southern Transit Highway (Hyderabad -> Mahabubnagar)
    "ROUTE-TG-06": [
        (17.3190, 78.4320),  # Aramghar Junction, Hyderabad
        (17.0700, 78.2100),  # Shadnagar Bus Station
        (16.8500, 78.1400),  # Jadcherla Bypass
        (16.7488, 77.9856),  # Mahabubnagar Integrated Bus Depot
    ],
}

# Backward compatibility route aliases
ROUTE_WAYPOINTS["ROUTE-101"] = ROUTE_WAYPOINTS["ROUTE-TG-01"]
ROUTE_WAYPOINTS["ROUTE-202"] = ROUTE_WAYPOINTS["ROUTE-TG-02"]
ROUTE_WAYPOINTS["ROUTE-303"] = ROUTE_WAYPOINTS["ROUTE-TG-03"]


class GPSService:
    """Manages vehicle localization and trajectory simulation."""

    @staticmethod
    def get_latest_bus_location(bus_id: str, db: Session) -> Optional[GPSRecord]:
        """Fetch the most recent recorded GPS position for a bus."""
        return (
            db.query(GPSRecord)
            .filter(GPSRecord.bus_id == bus_id)
            .order_by(GPSRecord.timestamp.desc())
            .first()
        )

    @staticmethod
    def get_all_latest_locations(db: Session) -> List[dict]:
        """Fetch the latest location for all registered buses."""
        buses = db.query(Bus).all()
        locations = []

        for bus in buses:
            latest = (
                db.query(GPSRecord)
                .filter(GPSRecord.bus_id == bus.id)
                .order_by(GPSRecord.timestamp.desc())
                .first()
            )
            if latest:
                locations.append({
                    "bus_id": bus.id,
                    "route_id": bus.route_id,
                    "license_plate": bus.license_plate,
                    "status": bus.status,
                    "latitude": latest.latitude,
                    "longitude": latest.longitude,
                    "speed_kmh": latest.speed_kmh,
                    "heading_deg": latest.heading_deg,
                    "timestamp": latest.timestamp,
                    "is_simulated": latest.is_simulated,
                })
            else:
                # Fallback to default route starting point if no record exists yet
                route_id = bus.route_id or "ROUTE-101"
                waypoints = ROUTE_WAYPOINTS.get(route_id, ROUTE_WAYPOINTS["ROUTE-101"])
                lat, lon = waypoints[0]
                locations.append({
                    "bus_id": bus.id,
                    "route_id": bus.route_id,
                    "license_plate": bus.license_plate,
                    "status": bus.status,
                    "latitude": lat,
                    "longitude": lon,
                    "speed_kmh": 0.0,
                    "heading_deg": 0.0,
                    "timestamp": datetime.now(timezone.utc),
                    "is_simulated": True,
                })

        return locations

    @staticmethod
    def simulate_telemetry_point(
        bus_id: str,
        db: Session,
        progress_ratio: Optional[float] = None,
        speed_kmh: float = 34.0,
    ) -> GPSRecord:
        """
        Generate and persist a simulated GPS telemetry point along the bus's route.

        Args:
            bus_id: Identifier of the bus.
            db: Database session.
            progress_ratio: Optional float [0.0, 1.0] along the route. If None, derived from time.
            speed_kmh: Simulated transit speed.

        Returns:
            Newly created and committed GPSRecord.
        """
        bus = db.query(Bus).filter(Bus.id == bus_id).first()
        route_id = bus.route_id if bus and bus.route_id else "ROUTE-101"
        waypoints = ROUTE_WAYPOINTS.get(route_id, ROUTE_WAYPOINTS["ROUTE-101"])

        now = datetime.now(timezone.utc)

        if progress_ratio is None:
            # Use current second to smoothly loop along the route (every 120 seconds per cycle)
            cycle_seconds = 120.0
            elapsed = (now.minute * 60 + now.second) % cycle_seconds
            t = elapsed / cycle_seconds
        else:
            t = max(0.0, min(progress_ratio, 1.0))

        # Interpolate across waypoints
        num_segments = len(waypoints) - 1
        segment_float = t * num_segments
        segment_idx = min(int(segment_float), num_segments - 1)
        segment_t = segment_float - segment_idx

        p1 = waypoints[segment_idx]
        p2 = waypoints[segment_idx + 1]

        lat = p1[0] + (p2[0] - p1[0]) * segment_t
        lon = p1[1] + (p2[1] - p1[1]) * segment_t

        # Calculate bearing / heading in degrees
        d_lat = p2[0] - p1[0]
        d_lon = p2[1] - p1[1]
        heading = (math.degrees(math.atan2(d_lon, d_lat)) + 360) % 360

        record = GPSRecord(
            bus_id=bus_id,
            route_id=route_id,
            latitude=round(lat, 6),
            longitude=round(lon, 6),
            speed_kmh=round(speed_kmh, 1),
            heading_deg=round(heading, 1),
            timestamp=now,
            is_simulated=True,  # Clearly tagged
        )

        db.add(record)
        db.commit()
        db.refresh(record)
        return record

    @staticmethod
    def record_hardware_telemetry(
        bus_id: str,
        latitude: float,
        longitude: float,
        speed_kmh: float,
        heading_deg: float,
        db: Session,
        is_simulated: bool = False,
    ) -> GPSRecord:
        """
        Ingest hardware GPS telemetry from physical on-board units.
        """
        bus = db.query(Bus).filter(Bus.id == bus_id).first()
        route_id = bus.route_id if bus else None

        record = GPSRecord(
            bus_id=bus_id,
            route_id=route_id,
            latitude=round(latitude, 6),
            longitude=round(longitude, 6),
            speed_kmh=round(speed_kmh, 1),
            heading_deg=round(heading_deg, 1),
            timestamp=datetime.now(timezone.utc),
            is_simulated=is_simulated,
        )

        db.add(record)
        db.commit()
        db.refresh(record)
        return record

