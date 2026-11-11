import React, { useState } from "react";
import { motion } from "motion/react";
import {
  ShieldAlert,
  AlertTriangle,
  FileText,
  CheckCircle2,
  Clock,
  Eye,
  Camera,
  MapPin,
  Check,
  X,
  Search,
  Filter,
} from "lucide-react";

export default function IncidentTab({ events, buses, onUpdateEventStatus, onSelectEvent }) {
  const [filterSeverity, setFilterSeverity] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Filter high/critical incidents or potholes
  const incidentList = (events || []).filter(
    (e) => e.severity === "CRITICAL" || e.severity === "HIGH" || e.event_type === "POTHOLE"
  );

  const filteredIncidents = incidentList.filter((item) => {
    if (filterSeverity !== "ALL" && item.severity !== filterSeverity) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return item.id.toLowerCase().includes(q) || item.detection_class.toLowerCase().includes(q);
    }
    return true;
  });

  const anprModules = [
    {
      name: "ANPR License Plate Localization",
      task: "Bounding box isolation of vehicle number plates",
      status: "NOT CONFIGURED",
      statusColor: "#d97706",
      statusBg: "#fffbeb",
      note: "Requires dedicated Indian high-resolution license plate detector model.",
    },
    {
      name: "Optical Character Recognition (OCR)",
      task: "Alpha-numeric character extraction from isolated plates",
      status: "NOT CONFIGURED",
      statusColor: "#d97706",
      statusBg: "#fffbeb",
      note: "PaddleOCR / EasyOCR pipeline architected as optional downstream plugin.",
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
              <ShieldAlert size={22} color="#dc2626" />
              Incident Intelligence & Evidence Review Workflow
            </div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "4px" }}>
              Triaged verification of severe road defects, safety hazards, and situational transit video evidence.
            </div>
          </div>
          <span className="badge badge-critical" style={{ padding: "6px 12px" }}>
            {incidentList.length} High-Priority Items
          </span>
        </div>

        <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", background: "#f8fafc", padding: "12px 16px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
          <strong style={{ color: "var(--text-primary)" }}>Academic & Privacy Transparency Notice:</strong> Automatic Number Plate Recognition (ANPR) and Optical Character Recognition (OCR) are currently marked as <code>NOT CONFIGURED</code>. In compliance with strict academic integrity, no synthetic or fabricated license plate numbers are generated.
        </div>
      </div>

      {/* ANPR Architecture Status Banner */}
      <div className="card-panel">
        <div className="panel-header">
          <div className="panel-title">
            <Camera size={18} color="var(--accent-blue)" />
            Automatic Number Plate Recognition (ANPR) Modular Pipeline
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
            Extensible multi-stage pipeline configuration
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "14px" }}>
          {anprModules.map((m, idx) => (
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
                  {m.name}
                </span>
                <span
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: "4px",
                    background: m.statusBg,
                    color: m.statusColor,
                    border: "1px solid #fde68a",
                  }}
                >
                  {m.status}
                </span>
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                {m.task}
              </div>
              <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", borderTop: "1px solid var(--border-color)", paddingTop: "6px" }}>
                Status: {m.note}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Flagged Incidents Queue */}
      <div className="card-panel">
        <div className="panel-header">
          <div className="panel-title">
            <AlertTriangle size={18} color="#dc2626" />
            Flagged Incidents & Severe Hazards Queue ({filteredIncidents.length})
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <div className="tab-pills">
              {["ALL", "CRITICAL", "HIGH"].map((f) => (
                <button
                  key={f}
                  className={`tab-pill ${filterSeverity === f ? "active" : ""}`}
                  onClick={() => setFilterSeverity(f)}
                >
                  {f === "ALL" ? "All Severity" : f}
                </button>
              ))}
            </div>

            <div style={{ position: "relative" }}>
              <Search size={14} color="var(--text-muted)" style={{ position: "absolute", left: "10px", top: "10px" }} />
              <input
                type="text"
                placeholder="Search incident ID..."
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
                <th>Incident ID</th>
                <th>Hazard / Defect Type</th>
                <th>Severity</th>
                <th>Confidence</th>
                <th>Reporting Bus</th>
                <th>Coordinates (Telangana)</th>
                <th>Review Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredIncidents.length > 0 ? (
                filteredIncidents.map((evt) => (
                  <tr key={evt.id}>
                    <td style={{ fontFamily: "monospace", fontSize: "0.82rem", color: "var(--accent-blue)", fontWeight: 700 }}>
                      INC-{evt.id.slice(4, 12)}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{evt.event_type.replace("_", " ")}</div>
                      <div style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>
                        Class: {evt.detection_class}
                      </div>
                    </td>
                    <td>
                      <span className={`badge badge-${evt.severity.toLowerCase()}`}>
                        {evt.severity}
                      </span>
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
                    <td>
                      <span
                        className="badge"
                        style={{
                          background: evt.status === "RESOLVED" ? "#ecfdf5" : evt.status === "VERIFIED" ? "#eff6ff" : "#fffbeb",
                          color: evt.status === "RESOLVED" ? "#047857" : evt.status === "VERIFIED" ? "#1d4ed8" : "#b45309",
                          border: `1px solid ${evt.status === "RESOLVED" ? "#a7f3d0" : evt.status === "VERIFIED" ? "#bfdbfe" : "#fde68a"}`,
                        }}
                      >
                        {evt.status === "NEW" ? "PENDING REVIEW" : evt.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button
                          className="btn-outline"
                          style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                          onClick={() => onSelectEvent && onSelectEvent(evt)}
                        >
                          <Eye size={12} /> Inspect
                        </button>
                        {evt.status !== "VERIFIED" && evt.status !== "RESOLVED" && (
                          <button
                            className="btn-primary"
                            style={{ padding: "4px 8px", fontSize: "0.75rem", background: "#059669" }}
                            onClick={() => onUpdateEventStatus && onUpdateEventStatus(evt.id, "VERIFIED")}
                          >
                            <Check size={12} /> Verify
                          </button>
                        )}
                        {evt.status !== "RESOLVED" && (
                          <button
                            className="btn-outline"
                            style={{ padding: "4px 8px", fontSize: "0.75rem", color: "#059669" }}
                            onClick={() => onUpdateEventStatus && onUpdateEventStatus(evt.id, "RESOLVED")}
                          >
                            Resolve
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center", padding: "28px", color: "var(--text-muted)" }}>
                    No severe incidents currently queued for review.
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

