import React from "react";
import { motion } from "motion/react";
import {
  BarChart3,
  PieChart,
  Layers,
  AlertTriangle,
  Bus,
  Download,
  FileText,
  TrendingUp,
  ShieldCheck,
  Calendar,
} from "lucide-react";

export default function AnalyticsTab({ summary }) {
  if (!summary) {
    return <div className="card-panel">Loading analytics data...</div>;
  }

  const totalEvents = summary.total_events || 1; // Prevent division by zero

  const severityOrder = [
    { key: "CRITICAL", label: "Critical Priority (Immediate Hazard)", color: "#dc2626" },
    { key: "HIGH", label: "High Priority (Structural Distress)", color: "#d97706" },
    { key: "MEDIUM", label: "Medium Priority (Active Cracking)", color: "#1d4ed8" },
    { key: "LOW", label: "Low Priority (Surface Monitoring)", color: "#059669" },
    { key: "INFO", label: "Information / Context", color: "#64748b" },
  ];

  // Calculate Maintenance Priority Index (Potholes weight 4, Alligator weight 3, Longitudinal weight 2, Transverse weight 1)
  const maintenancePriorities = [
    {
      category: "Pothole Repair & Patching (D40)",
      score: (summary.pothole_count || 0) * 4,
      urgency: (summary.pothole_count || 0) > 0 ? "URGENT ACTION" : "NORMAL",
      urgencyColor: (summary.pothole_count || 0) > 0 ? "#dc2626" : "#059669",
      urgencyBg: (summary.pothole_count || 0) > 0 ? "#fef2f2" : "#ecfdf5",
      recommendedAction: "Cold-mix asphalt patching and compaction on wheel tracks.",
    },
    {
      category: "Alligator Crack Base Rehabilitation (D20)",
      score: (summary.alligator_crack_count || 0) * 3,
      urgency: (summary.alligator_crack_count || 0) > 0 ? "MEDIUM ACTION" : "NORMAL",
      urgencyColor: "#d97706",
      urgencyBg: "#fffbeb",
      recommendedAction: "Structural mill and overlay to restore base foundation layer.",
    },
    {
      category: "Longitudinal & Transverse Crack Sealing (D00/D10)",
      score: ((summary.longitudinal_crack_count || 0) + (summary.transverse_crack_count || 0)) * 2,
      urgency: "PREVENTIVE ACTION",
      urgencyColor: "#1d4ed8",
      urgencyBg: "#eff6ff",
      recommendedAction: "Hot-pour rubberized bitumen crack sealing to prevent water ingress.",
    },
  ];

  // Export report as JSON file
  const handleExportReport = () => {
    const reportData = {
      project: "UrbanSense AI - Mobile Urban Intelligence Platform",
      problem_id: "SIH26124",
      organization: "Bharat Electronics Limited (BEL)",
      generated_at: new Date().toISOString(),
      fleet_summary: {
        total_buses: summary.total_buses,
        active_buses: summary.active_buses,
        total_events_captured: summary.total_events,
      },
      road_surface_distress: {
        potholes_D40: summary.pothole_count || 0,
        longitudinal_cracks_D00: summary.longitudinal_crack_count || 0,
        transverse_cracks_D10: summary.transverse_crack_count || 0,
        alligator_cracks_D20: summary.alligator_crack_count || 0,
      },
      traffic_and_pedestrian: {
        vehicles_observed: summary.vehicle_observations,
        pedestrians_observed: summary.pedestrian_observations,
      },
      severity_distribution: summary.events_by_severity,
      bus_event_distribution: summary.bus_event_distribution,
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `UrbanSense_City_Analytics_Report_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      className="page-body"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
    >
      {/* Top Header Card */}
      <div className="card-panel">
        <div className="panel-header" style={{ marginBottom: "12px" }}>
          <div>
            <div className="panel-title" style={{ fontSize: "1.2rem" }}>
              <BarChart3 size={22} color="var(--accent-blue)" />
              Executive Smart City & Road Maintenance Analytics
            </div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "4px" }}>
              Aggregate pavement degradation trends, fleet capture distribution, and municipal repair prioritization.
            </div>
          </div>
          <button
            className="btn-primary"
            onClick={handleExportReport}
            style={{ fontSize: "0.85rem", padding: "8px 16px" }}
          >
            <Download size={15} /> Export Municipal Report (JSON)
          </button>
        </div>

        <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", background: "#f8fafc", padding: "12px 16px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
          <strong style={{ color: "var(--text-primary)" }}>Data Authenticity:</strong> All analytics are calculated in real time from SQLite database records populated by genuine YOLO11n inference runs on Apple Silicon.
        </div>
      </div>

      {/* Analytics Top Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        {/* Events by Category Card */}
        <div className="card-panel">
          <div className="panel-header">
            <div className="panel-title">
              <Layers size={18} color="var(--accent-blue)" />
              Detections by Category
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {summary.events_by_type && Object.keys(summary.events_by_type).length > 0 ? (
              Object.entries(summary.events_by_type).map(([cat, count]) => {
                const pct = Math.round((count / totalEvents) * 100);
                return (
                  <div key={cat}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "0.85rem" }}>
                      <span style={{ fontWeight: 600 }}>{cat.replace("_", " ")}</span>
                      <span style={{ color: "var(--text-secondary)" }}>{count} ({pct}%)</span>
                    </div>
                    <div style={{ width: "100%", height: "8px", background: "#e2e8f0", borderRadius: "4px", overflow: "hidden" }}>
                      <div
                        style={{
                          width: `${pct}%`,
                          height: "100%",
                          background: "linear-gradient(90deg, #1d4ed8, #3b82f6)",
                          borderRadius: "4px",
                        }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ color: "var(--text-muted)", textAlign: "center", padding: "20px" }}>
                No events recorded yet.
              </div>
            )}
          </div>
        </div>

        {/* Severity Distribution Card */}
        <div className="card-panel">
          <div className="panel-header">
            <div className="panel-title">
              <AlertTriangle size={18} color="#dc2626" />
              Hazard Severity Prioritization
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {severityOrder.map((sev) => {
              const count = summary.events_by_severity?.[sev.key] || 0;
              const pct = Math.round((count / totalEvents) * 100);

              return (
                <div key={sev.key}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "0.85rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: sev.color }} />
                      <span style={{ fontWeight: 600 }}>{sev.label}</span>
                    </div>
                    <span style={{ color: "var(--text-secondary)" }}>{count} ({pct}%)</span>
                  </div>
                  <div style={{ width: "100%", height: "8px", background: "#e2e8f0", borderRadius: "4px", overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${pct}%`,
                        height: "100%",
                        background: sev.color,
                        borderRadius: "4px",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Municipal Maintenance Priority Scoring */}
      <div className="card-panel">
        <div className="panel-header">
          <div className="panel-title">
            <TrendingUp size={18} color="var(--accent-blue)" />
            Data-Driven Maintenance Priority Index (Telangana Transit Corridors)
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
          {maintenancePriorities.map((item, idx) => (
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
                  {item.category}
                </span>
                <span
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: "4px",
                    background: item.urgencyBg,
                    color: item.urgencyColor,
                  }}
                >
                  {item.urgency}
                </span>
              </div>
              <div style={{ fontSize: "1.3rem", fontWeight: 800, color: item.urgencyColor }}>
                Priority Score: {item.score}
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", borderTop: "1px solid var(--border-color)", paddingTop: "6px" }}>
                Recommended Action: {item.recommendedAction}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Transit Fleet Detection Distribution */}
      <div className="card-panel">
        <div className="panel-header">
          <div className="panel-title">
            <Bus size={18} color="var(--accent-blue)" />
            Transit Fleet Detection Distribution (Telangana Corridors)
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
          {summary.bus_event_distribution && Object.keys(summary.bus_event_distribution).length > 0 ? (
            Object.entries(summary.bus_event_distribution).map(([busId, count]) => (
              <div
                key={busId}
                style={{
                  padding: "16px",
                  background: "#f8fafc",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-color)",
                }}
              >
                <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--accent-blue)" }}>
                  {busId}
                </div>
                <div style={{ fontSize: "1.4rem", fontWeight: 800, marginTop: "6px", color: "var(--text-primary)" }}>
                  {count} <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 500 }}>events captured</span>
                </div>
                <div style={{ fontSize: "0.75rem", color: "#b45309", marginTop: "4px", fontWeight: 600 }}>
                  Simulated Route Fleet
                </div>
              </div>
            ))
          ) : (
            <div style={{ color: "var(--text-muted)", padding: "16px" }}>
              No fleet distribution data yet.
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
