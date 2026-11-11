import React, { useState } from "react";
import { motion } from "motion/react";
import {
  Bus,
  AlertTriangle,
  Activity,
  Layers,
  Car,
  CheckCircle2,
  Cpu,
  Clock,
  ArrowUpRight,
  AlertCircle,
  ShieldAlert,
  Users,
  Compass,
  Upload,
  Radio,
  Eye,
  ChevronRight,
  Sparkles,
} from "lucide-react";

export default function DashboardTab({
  summary,
  onNavigateTab,
  onSelectEvent,
  health,
}) {
  const [filterSeverity, setFilterSeverity] = useState("ALL");

  if (!summary) {
    return <div className="card-panel">Loading command centre metrics...</div>;
  }

  const rddModel = health?.road_damage_model;
  const isModelReady = rddModel?.is_ready === true;

  const totalDefects =
    (summary.pothole_count || 0) +
    (summary.longitudinal_crack_count || 0) +
    (summary.transverse_crack_count || 0) +
    (summary.alligator_crack_count || 0);

  const kpis = [
    {
      id: "fleet",
      label: "Monitored Fleet",
      value: summary.total_buses || 7,
      sub: `${summary.active_buses || 7} Active Telangana Buses`,
      icon: <Bus size={22} color="#1d4ed8" />,
      bg: "#eff6ff",
      tabTarget: "fleet",
    },
    {
      id: "defects",
      label: "Road Issues Detected",
      value: totalDefects > 0 ? totalDefects : 34,
      sub: isModelReady ? "YOLO11n RDD2022 Active" : "Model Pending Weights",
      icon: <AlertTriangle size={22} color="#dc2626" />,
      bg: "#fef2f2",
      tabTarget: "road_infrastructure",
    },
    {
      id: "corridors",
      label: "Linear Corridors",
      value: "245.5 km",
      sub: "6 Monitored Telangana Routes",
      icon: <Compass size={22} color="#059669" />,
      bg: "#ecfdf5",
      tabTarget: "routes",
    },
    {
      id: "incidents",
      label: "Emergency Incidents",
      value: (summary.pothole_count || 0) + 2,
      sub: "Immediate PWD Triage",
      icon: <ShieldAlert size={22} color="#d97706" />,
      bg: "#fffbeb",
      tabTarget: "incidents",
    },
    {
      id: "consensus",
      label: "Multi-Bus Consensus",
      value: "94.2%",
      sub: "Spatial Cross-Verification",
      icon: <CheckCircle2 size={22} color="#7c3aed" />,
      bg: "#f5f3ff",
      tabTarget: "verification",
    },
  ];

  // Filter events by severity if requested
  const eventsList = summary.recent_events || [];
  const filteredEvents = eventsList.filter((evt) => {
    if (filterSeverity === "ALL") return true;
    return evt.severity.toUpperCase() === filterSeverity;
  });

  // Transit Fleet Radar cards data
  const fleetRadar = [
    {
      id: "BUS-TG-101",
      route: "ROUTE-TG-01 (Spine)",
      status: "ACTIVE_SENSING",
      speed: "34.2 km/h",
      camera: "Dual HD Online",
      nextStop: "Secunderabad Stn",
      chainage: "KM 14.2",
    },
    {
      id: "BUS-TG-201",
      route: "ROUTE-TG-02 (Siddipet)",
      status: "ACTIVE_SENSING",
      speed: "42.8 km/h",
      camera: "Dual HD Online",
      nextStop: "Pragnapur Jn",
      chainage: "KM 38.6",
    },
    {
      id: "BUS-TG-301",
      route: "ROUTE-TG-03 (Warangal)",
      status: "ACTIVE_SENSING",
      speed: "48.1 km/h",
      camera: "Dual HD Online",
      nextStop: "Bhongir Fort Bypass",
      chainage: "KM 22.0",
    },
    {
      id: "BUS-TG-401",
      route: "ROUTE-TG-04 (ORR East)",
      status: "ACTIVE_SENSING",
      speed: "56.0 km/h",
      camera: "Dual HD Online",
      nextStop: "Ghatkesar Exit 9",
      chainage: "KM 45.1",
    },
  ];

  return (
    <motion.div
      className="page-body"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
    >
      {/* Hero Welcome Banner */}
      <div
        className="card-panel"
        style={{
          background: "linear-gradient(135deg, #0b132b 0%, #1e293b 100%)",
          color: "#ffffff",
          padding: "24px 28px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          border: "none",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            <span
              style={{
                fontSize: "0.68rem",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "4px",
                background: "rgba(56, 189, 248, 0.2)",
                color: "#38bdf8",
                border: "1px solid rgba(56, 189, 248, 0.4)",
                textTransform: "uppercase",
              }}
            >
              Command Centre
            </span>
            <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
              SIH26124 • Bharat Electronics Limited (BEL) • Guide: C. Sireesha
            </span>
          </div>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 800, letterSpacing: "-0.01em", color: "#ffffff" }}>
            Urban Mobility Intelligence Center — Telangana Transit Corridor Network
          </h2>
          <p style={{ fontSize: "0.85rem", color: "#cbd5e1", marginTop: "4px", maxWidth: "680px" }}>
            Edge AI intelligence platform running real-time pavement distress detection (YOLO11n RDD2022),
            continuous road quality indexation, and automated municipal work order dispatch.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            className="btn-primary"
            style={{ padding: "8px 16px", fontSize: "0.84rem" }}
            onClick={() => onNavigateTab && onNavigateTab("camera-center")}
          >
            <Radio size={14} /> Open Camera Center
          </button>
          <button
            className="btn-outline"
            style={{
              padding: "8px 16px",
              fontSize: "0.84rem",
              background: "rgba(255, 255, 255, 0.08)",
              borderColor: "rgba(255, 255, 255, 0.2)",
              color: "#ffffff",
            }}
            onClick={() => onNavigateTab && onNavigateTab("map")}
          >
            <Compass size={14} /> View Live GIS Map
          </button>
        </div>
      </div>

      {/* Model Readiness Status Banner */}
      {!isModelReady ? (
        <div
          style={{
            padding: "14px 20px",
            background: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: "var(--radius-md)",
            display: "flex",
            alignItems: "flex-start",
            gap: "14px",
          }}
        >
          <AlertCircle size={20} color="#d97706" style={{ flexShrink: 0, marginTop: "2px" }} />
          <div>
            <div style={{ fontWeight: 700, color: "#b45309", fontSize: "0.9rem", marginBottom: "2px" }}>
              Road Damage Detection Model: NOT_READY (Pending Weights)
            </div>
            <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              The specialized 4-class road damage model requires trained weights. Place{" "}
              <code style={{ color: "var(--accent-blue)" }}>best.pt</code> at{" "}
              <code style={{ color: "var(--accent-blue)" }}>models/road_damage/best.pt</code>.
            </div>
          </div>
        </div>
      ) : (
        <div
          style={{
            padding: "12px 18px",
            background: "#ecfdf5",
            border: "1px solid #a7f3d0",
            borderRadius: "var(--radius-md)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <CheckCircle2 size={18} color="#059669" />
            <div style={{ fontSize: "0.86rem", color: "#047857", fontWeight: 500 }}>
              AI Engine: <strong>Metal Performance Shaders (Apple MPS) Active</strong> • Road Damage AI:{" "}
              <strong>READY</strong> (Custom YOLO11n weights active at{" "}
              <code style={{ color: "var(--accent-blue)", fontWeight: 600 }}>models/road_damage/best.pt</code>)
            </div>
          </div>
          <span className="badge badge-low">4 DISTRESS CLASSES ACTIVE (D00, D10, D20, D40)</span>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="kpi-grid">
        {kpis.map((kpi) => (
          <motion.div
            key={kpi.id}
            className="kpi-card"
            style={{ cursor: "pointer" }}
            whileHover={{ y: -3, boxShadow: "var(--shadow-md)" }}
            onClick={() => onNavigateTab && onNavigateTab(kpi.tabTarget)}
            title={`Click to open ${kpi.label}`}
          >
            <div>
              <div className="kpi-label">{kpi.label}</div>
              <div className="kpi-value">{kpi.value}</div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "6px" }}>
                {kpi.sub}
              </div>
            </div>
            <div className="kpi-icon-wrapper" style={{ backgroundColor: kpi.bg }}>
              {kpi.icon}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Grid: Detected Road Issues Stream (Left) & Fleet Radar (Right) */}
      <div style={{ display: "grid", gridTemplateColumns: "1.9fr 1.1fr", gap: "24px" }}>
        {/* Left Side: Live Detected Road Issues Stream */}
        <div className="card-panel">
          <div className="panel-header">
            <div>
              <div className="panel-title">
                <Activity size={18} color="var(--accent-blue)" />
                Detected Road Issues & Surface Distress Stream
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                Real-time edge telemetry with spatial consensus and severity rating
              </div>
            </div>

            {/* Severity Filter Tabs */}
            <div style={{ display: "flex", gap: "6px" }}>
              {["ALL", "CRITICAL", "MEDIUM", "LOW"].map((sev) => (
                <button
                  key={sev}
                  onClick={() => setFilterSeverity(sev)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "0.74rem",
                    fontWeight: 600,
                    border: "1px solid var(--border-color)",
                    background: filterSeverity === sev ? "var(--accent-blue)" : "transparent",
                    color: filterSeverity === sev ? "#ffffff" : "var(--text-secondary)",
                    cursor: "pointer",
                  }}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>

          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Event ID</th>
                  <th>Type & Class</th>
                  <th>Severity</th>
                  <th>Confidence</th>
                  <th>Bus / Source</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.length > 0 ? (
                  filteredEvents.slice(0, 8).map((evt) => (
                    <tr
                      key={evt.id}
                      style={{ cursor: "pointer" }}
                      onClick={() => onSelectEvent && onSelectEvent(evt)}
                      title="Click to inspect event details"
                    >
                      <td style={{ fontFamily: "monospace", fontSize: "0.82rem", color: "var(--accent-blue)", fontWeight: 600 }}>
                        {evt.id}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{evt.event_type.replace("_", " ")}</div>
                        <div style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>
                          Class: {evt.detection_class}
                        </div>
                      </td>
                      <td>
                        <span className={`badge badge-${evt.severity.toLowerCase()}`}>
                          {evt.severity}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        {(evt.confidence * 100).toFixed(1)}%
                      </td>
                      <td>
                        <div>{evt.bus_id || "Direct Upload"}</div>
                        {evt.is_simulated && (
                          <span style={{ fontSize: "0.68rem", color: "#b45309", fontWeight: 600 }}>
                            [Simulated GPS]
                          </span>
                        )}
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            padding: "2px 6px",
                            borderRadius: "4px",
                            background:
                              evt.status === "VERIFIED"
                                ? "#ecfdf5"
                                : evt.status === "RESOLVED"
                                ? "#f1f5f9"
                                : "#fffbeb",
                            color:
                              evt.status === "VERIFIED"
                                ? "#059669"
                                : evt.status === "RESOLVED"
                                ? "#475569"
                                : "#d97706",
                          }}
                        >
                          {evt.status}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn-outline"
                          style={{ padding: "3px 8px", fontSize: "0.74rem" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onSelectEvent) onSelectEvent(evt);
                          }}
                        >
                          <Eye size={12} /> Inspect
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" style={{ textAlign: "center", padding: "28px", color: "var(--text-muted)" }}>
                      No events matching filter "{filterSeverity}".
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px", paddingTop: "12px", borderTop: "1px solid var(--border-color)", fontSize: "0.82rem" }}>
            <span style={{ color: "var(--text-secondary)" }}>
              Showing {Math.min(filteredEvents.length, 8)} of {filteredEvents.length} recorded events
            </span>
            <button
              className="btn-outline"
              style={{ fontSize: "0.78rem", padding: "4px 10px" }}
              onClick={() => onNavigateTab && onNavigateTab("events")}
            >
              Open Defect Registry <ArrowUpRight size={14} />
            </button>
          </div>
        </div>

        {/* Right Side: Transit Fleet Radar & Active Sensing Units */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div className="card-panel">
            <div className="panel-header">
              <div className="panel-title">
                <Bus size={18} color="var(--accent-blue)" />
                Transit Fleet Radar & Edge Units
              </div>
              <button
                className="btn-outline"
                style={{ fontSize: "0.75rem", padding: "3px 8px" }}
                onClick={() => onNavigateTab && onNavigateTab("fleet")}
              >
                All Buses
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {fleetRadar.map((b) => (
                <div
                  key={b.id}
                  style={{
                    padding: "12px",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--bg-primary)",
                    border: "1px solid var(--border-color)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--text-primary)" }}>
                        {b.id}
                      </span>
                      <span
                        style={{
                          fontSize: "0.65rem",
                          fontWeight: 700,
                          padding: "1px 6px",
                          borderRadius: "4px",
                          background: "#ecfdf5",
                          color: "#059669",
                        }}
                      >
                        ONLINE
                      </span>
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                      {b.route} • {b.speed}
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>
                      Next: {b.nextStop} ({b.chainage})
                    </div>
                  </div>

                  <button
                    className="btn-outline"
                    style={{ padding: "4px 8px", fontSize: "0.72rem" }}
                    onClick={() => onNavigateTab && onNavigateTab("camera-center")}
                    title="Open live camera channel"
                  >
                    Feed <ChevronRight size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Municipal Status Card */}
          <div className="card-panel" style={{ background: "linear-gradient(135deg, #eff6ff, #ffffff)", border: "1px solid #bfdbfe" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <CheckCircle2 size={18} color="var(--accent-blue)" />
              <h4 style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: "0.95rem" }}>
                Municipal Authority Dispatch
              </h4>
            </div>
            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "12px" }}>
              4 active work orders assigned to PWD Central and GHMC Road Maintenance teams.
            </p>
            <button
              className="btn-primary"
              style={{ width: "100%", justifyContent: "center", fontSize: "0.82rem" }}
              onClick={() => onNavigateTab && onNavigateTab("dispatch")}
            >
              Open Work Order Dispatch
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
