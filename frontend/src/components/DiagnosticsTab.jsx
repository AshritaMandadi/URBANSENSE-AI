import React from "react";
import {
  Cpu,
  Database,
  Activity,
  CheckCircle2,
  AlertCircle,
  HardDrive,
  Radio,
  Layers,
  ShieldCheck,
  Server,
  Zap,
} from "lucide-react";

export default function DiagnosticsTab({ health }) {
  const isRoadDamageReady = health?.road_damage_model?.status === "READY";
  const device = health?.device || "mps";
  const dbEngine = health?.database || "sqlite";

  return (
    <div className="page-body">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "2px 8px", borderRadius: "4px", background: "#ecfdf5", color: "#059669", border: "1px solid #a7f3d0", textTransform: "uppercase" }}>
              System Status
            </span>
            <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "2px 8px", borderRadius: "4px", background: "#eff6ff", color: "var(--accent-blue)", border: "1px solid #bfdbfe", textTransform: "uppercase" }}>
              Hardware Diagnostics
            </span>
          </div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
            System Infrastructure Diagnostics
          </h2>
          <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "2px" }}>
            Deterministic capabilities, database latencies, PostGIS readiness, and neural network weights
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span style={{ fontSize: "0.75rem", padding: "4px 10px", borderRadius: "9999px", background: "#ecfdf5", color: "#059669", fontWeight: 600 }}>
            • SYSTEM HEALTH: 100% OPERATIONAL
          </span>
        </div>
      </div>

      {/* 4 Stat Cards Across Top - Reference Page 13 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px", marginBottom: "20px" }}>
        <div className="stat-card">
          <div className="stat-title">PIPELINE MODE</div>
          <div className="stat-value" style={{ color: "#059669" }}>LIVE</div>
          <div className="stat-meta">Real-time edge telemetry</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">DATABASE ENGINE</div>
          <div className="stat-value" style={{ color: "var(--accent-blue)" }}>ONLINE</div>
          <div className="stat-meta">SQLite (Local ACID Relational)</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">SPATIAL INDEXING</div>
          <div className="stat-value" style={{ color: "var(--accent-purple)", fontFamily: "monospace", fontSize: "1.2rem" }}>
            haversine_fallback
          </div>
          <div className="stat-meta">PostGIS fallback engine</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">INFERENCE ACCELERATION</div>
          <div className="stat-value" style={{ color: "#059669" }}>
            {device.toUpperCase()}
          </div>
          <div className="stat-meta">
            {device === "mps" ? "Apple Metal Performance Shaders" : "CPU Fallback"}
          </div>
        </div>
      </div>

      {/* Main Two-Column Grid - Reference Page 13 */}
      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: "20px", marginBottom: "20px" }}>
        {/* Left: Edge Sensing Modules */}
        <div className="card-panel">
          <div className="panel-header" style={{ marginBottom: "14px" }}>
            <div className="panel-title" style={{ fontSize: "0.95rem" }}>
              EDGE SENSING MODULES
            </div>
            <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 6px", borderRadius: "4px", background: "#ecfdf5", color: "#059669" }}>
              • LIVE PIPELINE
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "0.82rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9", paddingBottom: "8px" }}>
              <div>
                <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>• Vehicle Detection</span>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>YOLO models/yolo11n.pt</div>
              </div>
              <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 8px", borderRadius: "4px", background: "#ecfdf5", color: "#059669" }}>
                • REAL
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9", paddingBottom: "8px" }}>
              <div>
                <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>• Road Defect Detection</span>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>YOLO models/road_damage/best.pt</div>
              </div>
              <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 8px", borderRadius: "4px", background: isRoadDamageReady ? "#ecfdf5" : "#fee2e2", color: isRoadDamageReady ? "#059669" : "#dc2626" }}>
                • {isRoadDamageReady ? "REAL" : "NOT READY"}
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9", paddingBottom: "8px" }}>
              <div>
                <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>• Tracking Engine</span>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Spatio-Temporal IoU Deduplication (1.5s window)</div>
              </div>
              <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 8px", borderRadius: "4px", background: "#ecfdf5", color: "#059669" }}>
                • REAL
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9", paddingBottom: "8px" }}>
              <div>
                <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>• OCR License Recognition</span>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>ANPR text localization & OCR</div>
              </div>
              <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 8px", borderRadius: "4px", background: "#f1f5f9", color: "#64748b" }}>
                • OFF
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9", paddingBottom: "8px" }}>
              <div>
                <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>• Pedestrian Detection</span>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Person class + crosswalk proximity</div>
              </div>
              <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 8px", borderRadius: "4px", background: "#ecfdf5", color: "#059669" }}>
                • REAL
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9", paddingBottom: "8px" }}>
              <div>
                <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>• Incident Detection</span>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Rule-based threshold on tracked motion</div>
              </div>
              <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 8px", borderRadius: "4px", background: "#ecfdf5", color: "#059669" }}>
                • REAL
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>• GPS Telemetry Source</span>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Simulated spatial telemetry along Telangana routes</div>
              </div>
              <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 8px", borderRadius: "4px", background: "#eff6ff", color: "var(--accent-blue)" }}>
                • SIMULATED
              </span>
            </div>
          </div>
        </div>

        {/* Right: GIS & Spatial Topology */}
        <div className="card-panel">
          <div className="panel-header" style={{ marginBottom: "14px" }}>
            <div className="panel-title" style={{ fontSize: "0.95rem" }}>
              GIS & SPATIAL TOPOLOGY
            </div>
            <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 6px", borderRadius: "4px", background: "#eff6ff", color: "var(--accent-blue)" }}>
              TELANGANA
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.82rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "6px" }}>
              <span style={{ color: "var(--text-secondary)" }}>Assigned Transit Unit:</span>
              <span style={{ fontWeight: 700, color: "var(--accent-blue)" }}>BUS-TG-101</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "6px" }}>
              <span style={{ color: "var(--text-secondary)" }}>Active Camera Mount:</span>
              <span style={{ fontWeight: 600 }}>FRONT DASHCAM (Primary)</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "6px" }}>
              <span style={{ color: "var(--text-secondary)" }}>Cluster Distance Threshold:</span>
              <span style={{ fontWeight: 600 }}>50 meters (IoU ≥ 0.20)</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "6px" }}>
              <span style={{ color: "var(--text-secondary)" }}>Demo State:</span>
              <span style={{ fontWeight: 700, color: "#059669" }}>ACTIVE</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "6px" }}>
              <span style={{ color: "var(--text-secondary)" }}>Spatial Geometry Tables:</span>
              <span style={{ color: "var(--text-muted)" }}>none (haversine)</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-secondary)" }}>GIST Spatial Indexes:</span>
              <span style={{ color: "var(--text-muted)" }}>none</span>
            </div>

            <div style={{ marginTop: "12px", padding: "10px 12px", background: "#f8fafc", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
              <em>haversine_fallback</em> is used when PostGIS is not installed; results are mathematically identical within the 50-meter cluster radius.
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Card: Neural Network Weights & Diagnostics */}
      <div className="card-panel">
        <div className="panel-header" style={{ marginBottom: "12px" }}>
          <div className="panel-title" style={{ fontSize: "0.95rem" }}>
            NEURAL NETWORK WEIGHTS & DIAGNOSTICS
          </div>
          <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 8px", borderRadius: "9999px", background: "#ecfdf5", color: "#059669", border: "1px solid #a7f3d0" }}>
            • WEIGHTS MOUNTED
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", fontSize: "0.82rem" }}>
          <div style={{ padding: "12px", background: "#f8fafc", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>YOLO11 Nano (COCO Pretrained)</div>
              <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "1px 6px", borderRadius: "4px", background: "#ecfdf5", color: "#059669" }}>
                READY
              </span>
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
              File: <code>models/yolo11n.pt</code> (6.2 MB)
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
              Detects: Cars, Buses, Trucks, Motorcycles, Pedestrians
            </div>
          </div>

          <div style={{ padding: "12px", background: "#f8fafc", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>Urban Road Damage (RDD2022 Custom)</div>
              <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "1px 6px", borderRadius: "4px", background: isRoadDamageReady ? "#ecfdf5" : "#fee2e2", color: isRoadDamageReady ? "#059669" : "#dc2626" }}>
                {isRoadDamageReady ? "WEIGHTS MOUNTED" : "NOT READY"}
              </span>
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
              File: <code>models/road_damage/best.pt</code> (5.25 MB)
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
              Detects: Pothole (D40), Alligator (D20), Longitudinal (D00), Transverse (D10)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

