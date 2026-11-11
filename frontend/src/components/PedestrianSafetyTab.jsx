import React, { useState } from "react";
import { motion } from "motion/react";
import {
  Users,
  ShieldAlert,
  AlertTriangle,
  School,
  MapPin,
  Clock,
  Eye,
  CheckCircle2,
  Info,
} from "lucide-react";

export default function PedestrianSafetyTab({ summary, events, buses, onSelectEvent }) {
  const [activeTab, setActiveTab] = useState("ALL");

  const pedestrianEvents = (events || []).filter(
    (e) => e.event_type === "PEDESTRIAN_DETECTION" || e.detection_class === "person"
  );

  const schoolZones = [
    {
      id: "SZ-TG-01",
      name: "St. Patrick's High School / Secunderabad Station",
      corridor: "ROUTE-TG-01",
      speedLimit: "25 km/h",
      status: "ACTIVE MONITORING",
      statusBg: "#ecfdf5",
      statusColor: "#059669",
      riskLevel: "LOW",
    },
    {
      id: "SZ-TG-02",
      name: "Siddipet Govt Girls High School Transit Zone",
      corridor: "ROUTE-TG-02",
      speedLimit: "30 km/h",
      status: "ACTIVE MONITORING",
      statusBg: "#ecfdf5",
      statusColor: "#059669",
      riskLevel: "MODERATE",
    },
    {
      id: "SZ-TG-03",
      name: "Kakatiya University Crossroad Campus Zone",
      corridor: "ROUTE-TG-03",
      speedLimit: "30 km/h",
      status: "ACTIVE MONITORING",
      statusBg: "#ecfdf5",
      statusColor: "#059669",
      riskLevel: "LOW",
    },
    {
      id: "SZ-TG-04",
      name: "Mahabubnagar Integrated School Transit Halt",
      corridor: "ROUTE-TG-06",
      speedLimit: "25 km/h",
      status: "SCHEDULED SURVEILLANCE",
      statusBg: "#fffbeb",
      statusColor: "#d97706",
      riskLevel: "LOW",
    },
  ];

  return (
    <motion.div
      className="page-body"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
    >
      {/* Header Panel */}
      <div className="card-panel">
        <div className="panel-header" style={{ marginBottom: "12px" }}>
          <div>
            <div className="panel-title" style={{ fontSize: "1.2rem" }}>
              <Users size={22} color="var(--accent-blue)" />
              Pedestrian Safety & Vulnerable Road User Surveillance
            </div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "4px" }}>
              Bus-mounted camera detection of pedestrians, crosswalk proximity, and designated school zone speed enforcement.
            </div>
          </div>
          <span className="metric-pill">
            <School size={14} color="var(--accent-blue)" />
            4 School Corridors Configured
          </span>
        </div>

        <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", background: "#f8fafc", padding: "12px 16px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
          <strong style={{ color: "var(--text-primary)" }}>Ethical AI & Academic Integrity Notice:</strong> UrbanSense AI does not attempt to guess or classify a person's age, gender, or vulnerability based on visual appearance. Safety scores are calculated strictly from spatial distance, crosswalk proximity heuristics, and verified school-zone geofenced locations along Telangana transit routes.
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "16px" }}>
        <div className="kpi-card">
          <div>
            <div className="kpi-label">Pedestrian Observations</div>
            <div className="kpi-value">{summary?.pedestrian_observations || pedestrianEvents.length}</div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "4px" }}>
              Logged Detections
            </div>
          </div>
          <div className="kpi-icon-wrapper" style={{ background: "#ecfdf5", color: "#059669" }}>
            <Users size={22} />
          </div>
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-label">School Transit Zones</div>
            <div className="kpi-value">{schoolZones.length}</div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "4px" }}>
              Active Corridor Geofences
            </div>
          </div>
          <div className="kpi-icon-wrapper" style={{ background: "#eff6ff", color: "#1d4ed8" }}>
            <School size={22} />
          </div>
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-label">Proximity Alerts</div>
            <div className="kpi-value">0</div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "4px" }}>
              Safe Stopping Distances Maintained
            </div>
          </div>
          <div className="kpi-icon-wrapper" style={{ background: "#eff6ff", color: "#0284c7" }}>
            <ShieldAlert size={22} />
          </div>
        </div>
      </div>

      {/* School Zone Context Geofences */}
      <div className="card-panel">
        <div className="panel-header">
          <div className="panel-title">
            <School size={18} color="var(--accent-blue)" />
            Monitored School & Educational Transit Zones
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
            Configured spatial zones with reduced bus speed limits & pedestrian priority
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "14px" }}>
          {schoolZones.map((sz) => (
            <div
              key={sz.id}
              style={{
                padding: "16px",
                background: "#f8fafc",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-color)",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <span style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "var(--accent-blue)", fontWeight: 700 }}>
                    {sz.id} • {sz.corridor}
                  </span>
                  <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--text-primary)", marginTop: "2px" }}>
                    {sz.name}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: "4px",
                    background: sz.statusBg,
                    color: sz.statusColor,
                  }}
                >
                  {sz.status}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", borderTop: "1px solid var(--border-color)", paddingTop: "8px" }}>
                <span style={{ color: "var(--text-secondary)" }}>Designated Zone Speed Limit:</span>
                <span style={{ fontWeight: 700, color: "#b45309" }}>{sz.speedLimit}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                <span style={{ color: "var(--text-secondary)" }}>Pedestrian Ingress Risk:</span>
                <span style={{ fontWeight: 600 }}>{sz.riskLevel}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pedestrian Detection Records */}
      <div className="card-panel">
        <div className="panel-header">
          <div className="panel-title">
            <Users size={18} color="var(--accent-blue)" />
            Pedestrian Sighting Records ({pedestrianEvents.length})
          </div>
        </div>

        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Event ID</th>
                <th>Classification</th>
                <th>Confidence</th>
                <th>Reporting Bus</th>
                <th>Location (Telangana)</th>
                <th>Timestamp</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {pedestrianEvents.length > 0 ? (
                pedestrianEvents.map((evt) => (
                  <tr
                    key={evt.id}
                    style={{ cursor: "pointer" }}
                    onClick={() => onSelectEvent && onSelectEvent(evt)}
                  >
                    <td style={{ fontFamily: "monospace", fontSize: "0.82rem", color: "var(--accent-blue)", fontWeight: 600 }}>
                      {evt.id}
                    </td>
                    <td style={{ fontWeight: 600 }}>Pedestrian (person)</td>
                    <td style={{ fontWeight: 700 }}>{(evt.confidence * 100).toFixed(1)}%</td>
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
                    No pedestrian events logged yet. Process a dashcam recording with general scene model to detect pedestrians.
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

