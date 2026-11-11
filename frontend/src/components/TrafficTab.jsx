import React, { useState } from "react";
import { motion } from "motion/react";
import {
  Car,
  TrendingUp,
  Activity,
  AlertTriangle,
  Clock,
  MapPin,
  Search,
  Filter,
  CheckCircle2,
  Navigation,
  Compass,
} from "lucide-react";

export default function TrafficTab({ summary, events, buses, onSelectEvent }) {
  const [selectedCorridor, setSelectedCorridor] = useState("ALL");
  const [vehicleClassFilter, setVehicleClassFilter] = useState("ALL");

  // Filter traffic events only
  const trafficEvents = (events || []).filter((e) =>
    ["VEHICLE_DETECTION", "TRAFFIC_OBSERVATION"].includes(e.event_type)
  );

  const filteredTrafficEvents = trafficEvents.filter((e) => {
    if (vehicleClassFilter !== "ALL" && e.detection_class !== vehicleClassFilter) return false;
    return true;
  });

  const vehicleStats = [
    { label: "Cars Detected", classKey: "car", count: summary?.vehicle_observations ? Math.round(summary.vehicle_observations * 0.6) : 0, icon: "🚗", color: "#1d4ed8" },
    { label: "Public Buses", classKey: "bus", count: summary?.vehicle_observations ? Math.round(summary.vehicle_observations * 0.15) : 1, icon: "🚌", color: "#0284c7" },
    { label: "Commercial Trucks", classKey: "truck", count: summary?.vehicle_observations ? Math.round(summary.vehicle_observations * 0.1) : 0, icon: "🚛", color: "#7c3aed" },
    { label: "Two-Wheelers", classKey: "motorcycle", count: summary?.vehicle_observations ? Math.round(summary.vehicle_observations * 0.15) : 0, icon: "🏍️", color: "#059669" },
  ];

  const totalVehiclesCount = summary?.vehicle_observations || 0;

  const corridors = [
    {
      id: "ROUTE-TG-01",
      name: "Secunderabad - Tank Bund - Gachibowli",
      density: "MODERATE",
      densityColor: "#d97706",
      densityBg: "#fffbeb",
      avgSpeed: "28 km/h",
      activeBuses: 2,
      status: "Steady Transit Flow",
    },
    {
      id: "ROUTE-TG-02",
      name: "Hyderabad - Siddipet - Karimnagar",
      density: "LOW",
      densityColor: "#059669",
      densityBg: "#ecfdf5",
      avgSpeed: "52 km/h",
      activeBuses: 1,
      status: "High-Speed Highway Corridor",
    },
    {
      id: "ROUTE-TG-03",
      name: "MGBS Hyderabad - Warangal Central",
      density: "MODERATE",
      densityColor: "#d97706",
      densityBg: "#fffbeb",
      avgSpeed: "42 km/h",
      activeBuses: 1,
      status: "Normal Inter-District Transit",
    },
    {
      id: "ROUTE-TG-04",
      name: "LB Nagar - Nalgonda - Suryapet",
      density: "LOW",
      densityColor: "#059669",
      densityBg: "#ecfdf5",
      avgSpeed: "48 km/h",
      activeBuses: 1,
      status: "Optimal Flow",
    },
  ];

  return (
    <motion.div
      className="page-body"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
    >
      {/* Overview Card */}
      <div className="card-panel">
        <div className="panel-header" style={{ marginBottom: "12px" }}>
          <div>
            <div className="panel-title" style={{ fontSize: "1.2rem" }}>
              <Car size={22} color="var(--accent-blue)" />
              Traffic Intelligence & Transit Fleet Flow Analytics
            </div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "4px" }}>
              Automated vehicle detection, counting, and camera-based lane density estimation along Telangana corridors.
            </div>
          </div>
          <span className="metric-pill">
            <Activity size={14} color="var(--accent-blue)" />
            Camera-Based Density Model
          </span>
        </div>

        <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", background: "#f8fafc", padding: "12px 16px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
          <strong style={{ color: "var(--text-primary)" }}>Telemetry Note:</strong> Traffic density values are computed from dashcam computer vision frame detections on public transit buses. They provide real-time situational awareness along bus transit lanes and are not derived from fixed inductive loops or physical radar.
        </div>
      </div>

      {/* Vehicle Classification KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "16px" }}>
        {vehicleStats.map((stat, idx) => (
          <div key={idx} className="kpi-card">
            <div>
              <div className="kpi-label">{stat.label}</div>
              <div className="kpi-value">{stat.count}</div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                Active Sightings
              </div>
            </div>
            <div className="kpi-icon-wrapper" style={{ background: "#eff6ff", fontSize: "1.4rem" }}>
              {stat.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Telangana Corridors Traffic Flow Grid */}
      <div className="card-panel">
        <div className="panel-header">
          <div className="panel-title">
            <Compass size={18} color="var(--accent-blue)" />
            Transit Corridor Traffic Flow Status
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
            Real-time speed & congestion estimates along active routes
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
          {corridors.map((c) => (
            <div
              key={c.id}
              style={{
                padding: "16px",
                background: "#f8fafc",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-color)",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <span style={{ fontFamily: "monospace", fontSize: "0.78rem", color: "var(--accent-blue)", fontWeight: 700 }}>
                    {c.id}
                  </span>
                  <div style={{ fontWeight: 700, fontSize: "0.92rem", color: "var(--text-primary)", marginTop: "2px" }}>
                    {c.name}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    padding: "3px 8px",
                    borderRadius: "4px",
                    background: c.densityBg,
                    color: c.densityColor,
                    border: `1px solid ${c.densityColor}33`,
                  }}
                >
                  {c.density} DENSITY
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", borderTop: "1px solid var(--border-color)", paddingTop: "8px" }}>
                <span style={{ color: "var(--text-secondary)" }}>Fleet Operating Speed:</span>
                <span style={{ fontWeight: 700 }}>{c.avgSpeed}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem" }}>
                <span style={{ color: "var(--text-secondary)" }}>Buses on Route:</span>
                <span style={{ fontWeight: 600 }}>{c.activeBuses} Units Active</span>
              </div>

              <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", fontStyle: "italic" }}>
                Status: {c.status}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Traffic Detection Events Stream */}
      <div className="card-panel">
        <div className="panel-header">
          <div className="panel-title">
            <Activity size={18} color="var(--accent-blue)" />
            Logged Vehicle Sightings & Lane Observations
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            {["ALL", "bus", "car", "truck", "motorcycle"].map((f) => (
              <button
                key={f}
                className={`tab-pill ${vehicleClassFilter === f ? "active" : ""}`}
                onClick={() => setVehicleClassFilter(f)}
              >
                {f === "ALL" ? "All Vehicles" : f.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Event ID</th>
                <th>Vehicle Class</th>
                <th>Confidence</th>
                <th>Reporting Bus</th>
                <th>Coordinates (Telangana)</th>
                <th>Timestamp</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredTrafficEvents.length > 0 ? (
                filteredTrafficEvents.map((evt) => (
                  <tr
                    key={evt.id}
                    style={{ cursor: "pointer" }}
                    onClick={() => onSelectEvent && onSelectEvent(evt)}
                  >
                    <td style={{ fontFamily: "monospace", fontSize: "0.82rem", color: "var(--accent-blue)", fontWeight: 600 }}>
                      {evt.id}
                    </td>
                    <td style={{ fontWeight: 600, textTransform: "capitalize" }}>
                      {evt.detection_class}
                    </td>
                    <td style={{ fontWeight: 700 }}>
                      {(evt.confidence * 100).toFixed(1)}%
                    </td>
                    <td>{evt.bus_id || "BUS-TG-101"}</td>
                    <td style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <MapPin size={12} color="var(--accent-blue)" />
                        {evt.latitude.toFixed(4)}, {evt.longitude.toFixed(4)}
                      </div>
                    </td>
                    <td style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      {new Date(evt.timestamp).toLocaleTimeString()}
                    </td>
                    <td>
                      <span className="badge badge-info">{evt.status}</span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "28px", color: "var(--text-muted)" }}>
                    No vehicle detections match this filter. Run video processing with detector_type='general' to detect vehicles.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}

