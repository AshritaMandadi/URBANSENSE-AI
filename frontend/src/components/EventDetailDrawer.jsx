import React from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  MapPin,
  Clock,
  Film,
  Bus,
  Check,
  ShieldAlert,
  AlertTriangle,
  Layers,
  CheckCircle2,
  Maximize2,
} from "lucide-react";

export default function EventDetailDrawer({ event, onClose, onUpdateStatus, buses }) {
  if (!event) return null;

  const bus = (buses || []).find((b) => b.id === event.bus_id);

  return (
    <AnimatePresence>
      <div className="drawer-backdrop" onClick={onClose}>
        <motion.div
          className="drawer-panel"
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="drawer-header">
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "0.78rem", fontWeight: 700, fontFamily: "monospace", color: "var(--accent-blue)" }}>
                  {event.id}
                </span>
                <span className={`badge badge-${event.severity.toLowerCase()}`}>
                  {event.severity}
                </span>
              </div>
              <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--text-primary)", marginTop: "4px" }}>
                {event.event_type.replace("_", " ")}
              </div>
            </div>
            <button className="btn-outline" style={{ padding: "6px" }} onClick={onClose}>
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="drawer-body">
            {/* Classification & Confidence Card */}
            <div style={{ padding: "16px", background: "#f8fafc", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: 600 }}>
                  Detected Distress Class
                </span>
                <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--text-primary)", marginTop: "2px", textTransform: "capitalize" }}>
                  {event.detection_class.replace("_", " ")}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: 600 }}>
                  Model Confidence
                </span>
                <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--accent-blue)", marginTop: "2px" }}>
                  {(event.confidence * 100).toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Bounding Box Information */}
            <div style={{ padding: "14px", background: "#f8fafc", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  Spatial Bounding Box (Pixels)
                </span>
                <span style={{ fontFamily: "monospace", fontSize: "0.78rem", color: "var(--accent-blue)" }}>
                  [{event.bbox ? (Array.isArray(event.bbox) ? event.bbox.join(", ") : `${event.bbox[0]}, ${event.bbox[1]}, ${event.bbox[2]}, ${event.bbox[3]}`) : "N/A"}]
                </span>
              </div>
              <div style={{ fontSize: "0.76rem", color: "var(--text-secondary)" }}>
                Coordinates normalized from <code>(x1, y1)</code> top-left to <code>(x2, y2)</code> bottom-right extracted during inference.
              </div>
            </div>

            {/* Telemetry & Geographic Location */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ fontWeight: 700, fontSize: "0.92rem", color: "var(--text-primary)" }}>
                Geographic Provenance & Fleet Context
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "0.82rem" }}>
                <div style={{ padding: "10px 12px", background: "#f8fafc", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Reporting Bus:</span>
                  <div style={{ fontWeight: 700, marginTop: "2px" }}>{event.bus_id || "Recorded Dashcam"}</div>
                  {bus && <div style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>{bus.license_plate}</div>}
                </div>

                <div style={{ padding: "10px 12px", background: "#f8fafc", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Coordinates (Telangana):</span>
                  <div style={{ fontFamily: "monospace", fontWeight: 700, marginTop: "2px" }}>
                    {event.latitude.toFixed(5)}, {event.longitude.toFixed(5)}
                  </div>
                  <div style={{ fontSize: "0.74rem", color: "#b45309", fontWeight: 600 }}>Simulated GPS Traces</div>
                </div>

                <div style={{ padding: "10px 12px", background: "#f8fafc", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Timestamp:</span>
                  <div style={{ fontWeight: 600, marginTop: "2px" }}>
                    {new Date(event.timestamp).toLocaleString()}
                  </div>
                </div>

                <div style={{ padding: "10px 12px", background: "#f8fafc", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Video Source:</span>
                  <div style={{ fontWeight: 600, marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={event.video_source}>
                    {event.video_source || "Recorded Run"}
                  </div>
                </div>
              </div>
            </div>

            {/* Status Management Actions */}
            <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "16px", marginTop: "auto" }}>
              <div style={{ fontWeight: 700, fontSize: "0.88rem", marginBottom: "10px", color: "var(--text-primary)" }}>
                Workflow Review Status: <span style={{ color: "var(--accent-blue)" }}>{event.status}</span>
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {event.status !== "ACKNOWLEDGED" && (
                  <button
                    className="btn-outline"
                    style={{ flex: 1, justifyContent: "center" }}
                    onClick={() => onUpdateStatus && onUpdateStatus(event.id, "ACKNOWLEDGED")}
                  >
                    Acknowledge
                  </button>
                )}
                {event.status !== "VERIFIED" && (
                  <button
                    className="btn-primary"
                    style={{ flex: 1, justifyContent: "center", background: "#059669" }}
                    onClick={() => onUpdateStatus && onUpdateStatus(event.id, "VERIFIED")}
                  >
                    <Check size={14} /> Mark Verified
                  </button>
                )}
                {event.status !== "RESOLVED" && (
                  <button
                    className="btn-primary"
                    style={{ flex: 1, justifyContent: "center" }}
                    onClick={() => onUpdateStatus && onUpdateStatus(event.id, "RESOLVED")}
                  >
                    <CheckCircle2 size={14} /> Resolve Hazard
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

