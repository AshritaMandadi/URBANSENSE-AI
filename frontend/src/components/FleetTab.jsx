import React, { useState } from "react";
import { motion } from "motion/react";
import {
  Bus,
  Camera,
  MapPin,
  Activity,
  CheckCircle2,
  Clock,
  Radio,
  RefreshCw,
  Cpu,
  Layers,
  ChevronRight,
} from "lucide-react";

export default function FleetTab({ buses, onSimulateTick }) {
  const [selectedBusId, setSelectedBusId] = useState(buses && buses.length > 0 ? buses[0].id : "BUS-TG-101");

  const selectedBus = (buses || []).find((b) => b.id === selectedBusId) || (buses && buses[0]);

  const cameraChannels = [
    {
      id: "CAM-01-FRONT",
      name: "Forward Road Surface & Traffic Dashcam",
      position: "Front Windshield (Forward Looking)",
      resolution: "1920x1080 (1080p)",
      fps: 30,
      assignedModel: "Custom YOLO11n RDD2022 (4 Classes) + General COCO",
      status: "STREAMING (SIMULATED)",
      statusColor: "#059669",
      statusBg: "#ecfdf5",
      description: "Primary visual sensor for pavement distress (D00, D10, D20, D40) and lead vehicle tracking.",
    },
    {
      id: "CAM-02-REAR",
      name: "Rear Traffic & Tailgating Surveillance",
      position: "Rear Window (Reverse Facing)",
      resolution: "1280x720 (720p)",
      fps: 25,
      assignedModel: "General Object Detector (Vehicle Classes)",
      status: "STREAMING (SIMULATED)",
      statusColor: "#059669",
      statusBg: "#ecfdf5",
      description: "Monitors trailing traffic, sudden tailgating, and hit-and-run rear incident evidence.",
    },
    {
      id: "CAM-03-LEFT",
      name: "Left Kerb & Sidewalk Surface Scanner",
      position: "Left Mirror Mount (Downward 45°)",
      resolution: "1280x720 (720p)",
      fps: 20,
      assignedModel: "Custom YOLO11n Pothole & Edge Crack Detection",
      status: "STREAMING (SIMULATED)",
      statusColor: "#059669",
      statusBg: "#ecfdf5",
      description: "Continuous surveillance of gutter potholes, edge crumbling, and bus-stop boarding zones.",
    },
    {
      id: "CAM-04-RIGHT",
      name: "Right Overtaking & Lane Deviation Scanner",
      position: "Right Mirror Mount (Rearward & Lateral)",
      resolution: "1280x720 (720p)",
      fps: 20,
      assignedModel: "General Object Detector (Proximity Alerts)",
      status: "STREAMING (SIMULATED)",
      statusColor: "#059669",
      statusBg: "#ecfdf5",
      description: "Monitors blind-spot two-wheeler overtakes and close proximity incidents.",
    },
    {
      id: "CAM-05-CABIN",
      name: "Internal Passenger & Driver Safety Camera",
      position: "Cabin Overhead (Interior Facing)",
      resolution: "1280x720 (720p)",
      fps: 15,
      assignedModel: "Driver Alertness / Incident Evidence Buffer",
      status: "STANDBY BUFFER",
      statusColor: "#d97706",
      statusBg: "#fffbeb",
      description: "Selective local video buffering for rash driving verification and emergency incident review.",
    },
  ];

  return (
    <motion.div
      className="page-body"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
    >
      {/* Header */}
      <div className="card-panel">
        <div className="panel-header" style={{ marginBottom: "12px" }}>
          <div>
            <div className="panel-title" style={{ fontSize: "1.2rem" }}>
              <Bus size={22} color="var(--accent-blue)" />
              Public Transit Fleet & Multi-Camera Edge Architecture
            </div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "4px" }}>
              Multi-channel camera allocation and edge-processing topology across Telangana state transit buses.
            </div>
          </div>
          <span className="metric-pill">
            <Radio size={14} color="#b45309" />
            7 Monitored Transit Units
          </span>
        </div>

        <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", background: "#f8fafc", padding: "12px 16px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
          <strong style={{ color: "var(--text-primary)" }}>Edge AI Hardware Topology:</strong> In the proposed physical implementation, each public bus is fitted with an onboard NVIDIA Jetson Orin Nano edge unit running lightweight YOLO11n inference. In this college prototype, edge pipelines are simulated via FastAPI worker processes running on Apple Silicon.
        </div>
      </div>

      {/* Fleet Buses & Active Unit Split View */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "24px" }}>
        {/* Left: Bus Fleet List */}
        <div className="card-panel">
          <div className="panel-header">
            <div className="panel-title" style={{ fontSize: "1.05rem" }}>
              <Bus size={18} color="var(--accent-blue)" />
              Telangana Bus Fleet ({buses?.length || 0})
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {(buses || []).map((bus) => {
              const isSelected = selectedBusId === bus.id;
              return (
                <div
                  key={bus.id}
                  style={{
                    padding: "12px 14px",
                    borderRadius: "var(--radius-md)",
                    border: `1px solid ${isSelected ? "var(--accent-blue)" : "var(--border-color)"}`,
                    background: isSelected ? "var(--accent-blue-light)" : "#ffffff",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    transition: "all 0.15s ease",
                  }}
                  onClick={() => setSelectedBusId(bus.id)}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.92rem", color: isSelected ? "var(--accent-blue)" : "var(--text-primary)" }}>
                      {bus.id}
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                      {bus.route_id || "Fleet Corridor"} • {bus.license_plate}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span className="badge badge-low" style={{ fontSize: "0.68rem" }}>
                      {bus.status}
                    </span>
                    <ChevronRight size={16} color="var(--text-muted)" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Bus Multi-Camera Details */}
        {selectedBus && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Bus Summary Banner */}
            <div className="card-panel">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--accent-blue)" }}>
                      {selectedBus.id}
                    </span>
                    <span className="badge badge-low">{selectedBus.status}</span>
                    <span className="sim-indicator">SIMULATED TELEMETRY</span>
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                    Assigned Corridor: <strong>{selectedBus.route_id}</strong> • Model: {selectedBus.model} • Plate: {selectedBus.license_plate}
                  </div>
                </div>

                <button
                  className="btn-primary"
                  onClick={() => onSimulateTick && onSimulateTick(selectedBus.id)}
                  style={{ fontSize: "0.82rem", padding: "6px 12px" }}
                >
                  <RefreshCw size={13} /> Simulate Movement Tick
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginTop: "16px", borderTop: "1px solid var(--border-color)", paddingTop: "12px", fontSize: "0.82rem" }}>
                <div>
                  <span style={{ color: "var(--text-secondary)" }}>Operating Speed:</span>
                  <div style={{ fontWeight: 700 }}>{selectedBus.latest_gps?.speed_kmh || 0} km/h</div>
                </div>
                <div>
                  <span style={{ color: "var(--text-secondary)" }}>Heading:</span>
                  <div style={{ fontWeight: 700 }}>{selectedBus.latest_gps?.heading_deg || 0}° N</div>
                </div>
                <div>
                  <span style={{ color: "var(--text-secondary)" }}>Current Coordinates:</span>
                  <div style={{ fontFamily: "monospace", fontSize: "0.78rem" }}>
                    {selectedBus.latest_gps ? `${selectedBus.latest_gps.latitude.toFixed(4)}, ${selectedBus.latest_gps.longitude.toFixed(4)}` : "17.4399, 78.4983"}
                  </div>
                </div>
              </div>
            </div>

            {/* 5 Logical Multi-Camera Channels */}
            <div className="card-panel">
              <div className="panel-header">
                <div className="panel-title" style={{ fontSize: "1.05rem" }}>
                  <Camera size={18} color="var(--accent-blue)" />
                  Logical Multi-Camera Channels ({cameraChannels.length})
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {cameraChannels.map((cam) => (
                  <div
                    key={cam.id}
                    style={{
                      padding: "14px 16px",
                      background: "#f8fafc",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border-color)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <Camera size={16} color="var(--accent-blue)" />
                        <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text-primary)" }}>
                          {cam.name}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "4px",
                          background: cam.statusBg,
                          color: cam.statusColor,
                        }}
                      >
                        {cam.status}
                      </span>
                    </div>

                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                      {cam.description}
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.76rem", color: "var(--text-muted)", borderTop: "1px solid var(--border-color)", paddingTop: "6px", marginTop: "2px" }}>
                      <span>Position: <strong>{cam.position}</strong></span>
                      <span>Format: <strong>{cam.resolution} @ {cam.fps} FPS</strong></span>
                      <span>Model: <strong>{cam.assignedModel}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

