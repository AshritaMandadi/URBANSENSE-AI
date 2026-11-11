import React, { useState } from "react";
import { motion } from "motion/react";
import {
  AlertTriangle,
  Layers,
  CheckCircle2,
  AlertCircle,
  Cpu,
  ShieldCheck,
  Search,
  Filter,
  Eye,
  Info,
  Clock,
  MapPin,
  ExternalLink,
} from "lucide-react";

export default function RoadInfrastructureTab({ summary, events, health, onSelectEvent }) {
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const isModelReady = health?.road_damage_model?.status === "READY";

  // Filter road damage events only
  const roadEvents = (events || []).filter((e) =>
    ["POTHOLE", "ROAD_CRACK", "ROAD_DAMAGE"].includes(e.event_type)
  );

  const filteredEvents = roadEvents.filter((e) => {
    if (activeFilter === "POTHOLE" && e.detection_class !== "pothole") return false;
    if (activeFilter === "LONGITUDINAL" && e.detection_class !== "longitudinal_crack") return false;
    if (activeFilter === "TRANSVERSE" && e.detection_class !== "transverse_crack") return false;
    if (activeFilter === "ALLIGATOR" && e.detection_class !== "alligator_crack") return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return e.id.toLowerCase().includes(q) || e.detection_class.toLowerCase().includes(q);
    }
    return true;
  });

  const distressClasses = [
    {
      code: "D40",
      label: "Pothole",
      classKey: "pothole",
      count: summary?.pothole_count || 0,
      severity: "CRITICAL / HIGH",
      color: "#dc2626",
      bg: "#fef2f2",
      border: "#fecaca",
      description: "Depressions / cavities in pavement surface created by water infiltration and heavy traffic load.",
      impact: "Severe vehicle wheel/suspension damage, sudden swerve hazard, two-wheeler collision risk.",
    },
    {
      code: "D00",
      label: "Longitudinal Crack",
      classKey: "longitudinal_crack",
      count: summary?.longitudinal_crack_count || 0,
      severity: "MEDIUM / LOW",
      color: "#d97706",
      bg: "#fffbeb",
      border: "#fde68a",
      description: "Linear fractures running parallel to the direction of transit vehicle travel along wheel tracks.",
      impact: "Initial pavement fatigue, joint construction separation, precursor to water ingress.",
    },
    {
      code: "D10",
      label: "Transverse Crack",
      classKey: "transverse_crack",
      count: summary?.transverse_crack_count || 0,
      severity: "LOW",
      color: "#7c3aed",
      bg: "#f5f3ff",
      border: "#ddd6fe",
      description: "Perpendicular fractures across the road width caused by thermal shrinkage and sub-base movement.",
      impact: "Ride roughness, thermal expansion stress, gradual degradation if left unsealed.",
    },
    {
      code: "D20",
      label: "Alligator Crack",
      classKey: "alligator_crack",
      count: summary?.alligator_crack_count || 0,
      severity: "MEDIUM / HIGH",
      color: "#ea580c",
      bg: "#fff7ed",
      border: "#fed7aa",
      description: "Interconnected multi-sided polygonal mesh pattern resembling reptile skin, indicating structural fatigue.",
      impact: "Complete base failure, rapid aggregate loss, precursor to full pothole development.",
    },
  ];

  const modularPlugins = [
    {
      title: "Missing / Damaged Road Dividers",
      category: "Roadway Infrastructure",
      status: "PLANNED MODULE",
      statusColor: "#d97706",
      statusBg: "#fffbeb",
      description: "Edge detection of broken median curbs, displaced concrete dividers, or missing crash barriers along transit corridors.",
      readiness: "Architecture defined; waiting for specialized multi-class dataset training.",
    },
    {
      title: "Missing / Faded Zebra Crossings",
      category: "Pedestrian Facilities",
      status: "PLANNED MODULE",
      statusColor: "#d97706",
      statusBg: "#fffbeb",
      description: "Computer vision segmentation of faded crosswalk stripes near intersections and school transit stops.",
      readiness: "Semantic segmentation edge plugin ready for YOLO11-seg weights.",
    },
    {
      title: "Damaged / Missing Traffic Signboards",
      category: "Traffic Control Devices",
      status: "PLANNED MODULE",
      statusColor: "#d97706",
      statusBg: "#fffbeb",
      description: "Visual inspection of tilted, vandalized, obscured, or missing regulatory and warning road signboards.",
      readiness: "Edge bounding box taxonomy ready; awaiting Indian traffic sign dataset integration.",
    },
    {
      title: "Roadway Waterlogging & Flooding",
      category: "Surface Drainage Hazards",
      status: "PLANNED MODULE",
      statusColor: "#d97706",
      statusBg: "#fffbeb",
      description: "Monsoon urban surface water accumulation detection along bus lanes and gutter channels.",
      readiness: "Specular reflectance heuristic pipeline configured for monsoon field deployment.",
    },
  ];

  return (
    <motion.div
      className="page-body"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
    >
      {/* Module Overview Header */}
      <div className="card-panel">
        <div className="panel-header" style={{ marginBottom: "12px" }}>
          <div>
            <div className="panel-title" style={{ fontSize: "1.2rem" }}>
              <Layers size={22} color="var(--accent-blue)" />
              Road Infrastructure & Surface Distress AI
            </div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "4px" }}>
              Continuous automated pavement surface monitoring utilizing bus-mounted dashcams and custom YOLO11n inference.
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span className="metric-pill">
              <Cpu size={14} color="var(--accent-blue)" />
              Weights: <code>models/road_damage/best.pt</code>
            </span>
            <span
              className="badge"
              style={{
                background: isModelReady ? "#ecfdf5" : "#fffbeb",
                color: isModelReady ? "#047857" : "#b45309",
                border: `1px solid ${isModelReady ? "#a7f3d0" : "#fde68a"}`,
                padding: "6px 10px",
              }}
            >
              {isModelReady ? "YOLO11n READY (MPS)" : "WEIGHTS PENDING"}
            </span>
          </div>
        </div>

        <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", background: "#f8fafc", padding: "12px 16px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
          <strong style={{ color: "var(--text-primary)" }}>Academic Integrity & Technical Transparency:</strong>{" "}
          UrbanSense AI is strictly honest about model capabilities. The active model loaded at <code>models/road_damage/best.pt</code> was trained on the official RDD2022 India dataset and supports exactly four distress classes (D00, D10, D20, D40). Additional infrastructure categories are displayed below with their true modular readiness status.
        </div>
      </div>

      {/* The 4 Trained Distress Classes Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
        {distressClasses.map((item) => (
          <motion.div
            key={item.code}
            className="kpi-card"
            style={{ flexDirection: "column", gap: "10px", border: `1px solid ${item.border}`, cursor: "pointer" }}
            whileHover={{ y: -3, boxShadow: "var(--shadow-md)" }}
            onClick={() => setActiveFilter(activeFilter === item.code ? "ALL" : item.code)}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
              <span style={{ fontSize: "0.82rem", fontWeight: 700, color: item.color }}>
                {item.label} ({item.code})
              </span>
              <span
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: "10px",
                  background: item.bg,
                  color: item.color,
                  border: `1px solid ${item.border}`,
                }}
              >
                ACTIVE MODEL
              </span>
            </div>

            <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--text-primary)", lineHeight: 1 }}>
              {item.count}
            </div>

            <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
              {item.description}
            </div>

            <div style={{ fontSize: "0.74rem", color: item.color, fontWeight: 600, borderTop: `1px solid ${item.border}`, paddingTop: "8px", width: "100%" }}>
              Severity: {item.severity}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Modular Infrastructure Deficiencies Section */}
      <div className="card-panel">
        <div className="panel-header">
          <div>
            <div className="panel-title" style={{ fontSize: "1.05rem" }}>
              <ShieldCheck size={18} color="var(--accent-blue)" />
              Prospective Infrastructure Deficiencies (Modular Edge Architecture)
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "2px" }}>
              Modular software hooks architected for future multi-task edge model updates.
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "14px" }}>
          {modularPlugins.map((plugin, idx) => (
            <div
              key={idx}
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
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--text-primary)" }}>
                  {plugin.title}
                </span>
                <span
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: "4px",
                    background: plugin.statusBg,
                    color: plugin.statusColor,
                    border: "1px solid #fde68a",
                  }}
                >
                  {plugin.status}
                </span>
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                {plugin.description}
              </div>
              <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: "auto", borderTop: "1px solid var(--border-color)", paddingTop: "6px" }}>
                Status: {plugin.readiness}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recorded Road Damage Detections Table */}
      <div className="card-panel">
        <div className="panel-header">
          <div className="panel-title">
            <AlertTriangle size={18} color="var(--accent-orange)" />
            Verified Road Surface Distress Records ({filteredEvents.length})
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            {/* Filter pills */}
            <div className="tab-pills">
              {["ALL", "POTHOLE", "LONGITUDINAL", "TRANSVERSE", "ALLIGATOR"].map((f) => (
                <button
                  key={f}
                  className={`tab-pill ${activeFilter === f ? "active" : ""}`}
                  onClick={() => setActiveFilter(f)}
                >
                  {f === "ALL" ? "All Damages" : f}
                </button>
              ))}
            </div>

            <div style={{ position: "relative" }}>
              <Search size={14} color="var(--text-muted)" style={{ position: "absolute", left: "10px", top: "10px" }} />
              <input
                type="text"
                placeholder="Search event ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ padding: "6px 12px 6px 30px", fontSize: "0.82rem" }}
              />
            </div>
          </div>
        </div>

        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Event ID</th>
                <th>Distress Class</th>
                <th>Classification Code</th>
                <th>Confidence</th>
                <th>Severity</th>
                <th>Reporting Bus</th>
                <th>Coordinates (Telangana)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.length > 0 ? (
                filteredEvents.map((evt) => (
                  <tr
                    key={evt.id}
                    style={{ cursor: "pointer" }}
                    onClick={() => onSelectEvent && onSelectEvent(evt)}
                  >
                    <td style={{ fontFamily: "monospace", fontSize: "0.82rem", color: "var(--accent-blue)", fontWeight: 600 }}>
                      {evt.id}
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {evt.detection_class.replace("_", " ")}
                    </td>
                    <td>
                      <span className="badge badge-info">
                        {evt.detection_class === "pothole"
                          ? "D40"
                          : evt.detection_class === "longitudinal_crack"
                          ? "D00"
                          : evt.detection_class === "transverse_crack"
                          ? "D10"
                          : "D20"}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700 }}>
                      {(evt.confidence * 100).toFixed(1)}%
                    </td>
                    <td>
                      <span className={`badge badge-${evt.severity.toLowerCase()}`}>
                        {evt.severity}
                      </span>
                    </td>
                    <td>{evt.bus_id || "Recorded Run"}</td>
                    <td style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <MapPin size={12} color="var(--accent-blue)" />
                        {evt.latitude.toFixed(4)}, {evt.longitude.toFixed(4)}
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-low">{evt.status}</span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center", padding: "28px", color: "var(--text-muted)" }}>
                    No road damage events match the current filter. Upload or process a road video to populate detections.
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

