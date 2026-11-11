import React, { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Video,
  Bus,
  MapPin,
  Compass,
  Film,
  Layers,
  Car,
  Users,
  ClipboardList,
  CheckCircle2,
  ShieldAlert,
  Truck,
  TrendingUp,
  BarChart2,
  UserCheck,
  History,
  Settings,
  Cpu,
  RefreshCw,
  Radio,
  Clock,
} from "lucide-react";

import DashboardTab from "./components/DashboardTab";
import CameraCenterTab from "./components/CameraCenterTab";
import FleetTab from "./components/FleetTab";
import MapTab from "./components/MapTab";
import RouteIntelligenceTab from "./components/RouteIntelligenceTab";
import VideoTab from "./components/VideoTab";
import RoadInfrastructureTab from "./components/RoadInfrastructureTab";
import TrafficTab from "./components/TrafficTab";
import PedestrianSafetyTab from "./components/PedestrianSafetyTab";
import EventsTab from "./components/EventsTab";
import VerificationTab from "./components/VerificationTab";
import IncidentTab from "./components/IncidentTab";
import DispatchTab from "./components/DispatchTab";
import TrafficAnalyticsTab from "./components/TrafficAnalyticsTab";
import AnalyticsTab from "./components/AnalyticsTab";
import AdminTab from "./components/AdminTab";
import AuditTab from "./components/AuditTab";
import SettingsTab from "./components/SettingsTab";
import DiagnosticsTab from "./components/DiagnosticsTab";
import EventDetailDrawer from "./components/EventDetailDrawer";
import { apiFetch, API_BASE_URL } from "./api/client";

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [summary, setSummary] = useState(null);
  const [buses, setBuses] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [events, setEvents] = useState([]);
  const [videos, setVideos] = useState([]);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingState, setProcessingState] = useState({});
  const [selectedDrawerEvent, setSelectedDrawerEvent] = useState(null);
  const [currentTime, setCurrentTime] = useState("");

  // Live Clock updater (IST)
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-IN", {
          timeZone: "Asia/Kolkata",
          hour12: false,
        }) + " IST"
      );
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch all platform data
  const fetchData = async () => {
    try {
      setError(null);
      const [healthRes, sumRes, busRes, routesRes, evtRes, vidRes] = await Promise.all([
        apiFetch("/health").then((r) => (r.ok ? r.json() : null)),
        apiFetch("/api/analytics/summary").then((r) => (r.ok ? r.json() : null)),
        apiFetch("/api/buses").then((r) => (r.ok ? r.json() : [])),
        apiFetch("/api/routes").then((r) => (r.ok ? r.json() : [])),
        apiFetch("/api/events?limit=250").then((r) => (r.ok ? r.json() : [])),
        apiFetch("/api/videos").then((r) => (r.ok ? r.json() : [])),
      ]);

      if (healthRes) setHealth(healthRes);
      if (sumRes) setSummary(sumRes);
      if (busRes) setBuses(busRes);
      if (routesRes) setRoutes(routesRes);
      if (evtRes) setEvents(evtRes);
      if (vidRes) setVideos(vidRes);
    } catch (err) {
      console.error("API Fetch Error:", err);
      const backendTarget = API_BASE_URL || "http://localhost:8000";
      setError(
        `Unable to connect to UrbanSense AI backend at ${backendTarget}. Please ensure the backend is running and CORS allows this domain.`
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  // Handle video upload
  const handleUpload = async (file, busId) => {
    const formData = new FormData();
    formData.append("file", file);
    if (busId) formData.append("bus_id", busId);
    formData.append("camera_channel", "front");

    const res = await apiFetch("/api/videos/upload", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Video upload failed");
    }

    await fetchData();
  };

  // Handle video processing trigger
  const handleProcess = async (videoId, detectorType = "road_damage") => {
    setProcessingState((prev) => ({ ...prev, [videoId]: "PROCESSING" }));

    try {
      const res = await apiFetch(
        `/api/videos/${videoId}/process?frame_stride=2&conf_threshold=0.25&detector_type=${detectorType}`,
        {
          method: "POST",
        }
      );

      if (!res.ok) {
        const err = await res.json();
        alert(`Video processing failed: ${err.detail || "Unknown error"}`);
      } else {
        await fetchData();
      }
    } catch (err) {
      alert(`Processing error: ${err.message}`);
    } finally {
      setProcessingState((prev) => ({ ...prev, [videoId]: "IDLE" }));
    }
  };

  // Handle GPS simulation tick
  const handleSimulateTick = async (busId) => {
    try {
      await apiFetch(`/api/gps/simulate/${busId || "BUS-TG-101"}`, { method: "POST" });
      await fetchData();
    } catch (err) {
      console.error("GPS simulation error:", err);
    }
  };

  // Handle event status update
  const handleUpdateEventStatus = async (eventId, newStatus) => {
    try {
      const res = await apiFetch(`/api/events/${eventId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        if (selectedDrawerEvent && selectedDrawerEvent.id === eventId) {
          setSelectedDrawerEvent(updated);
        }
        await fetchData();
      }
    } catch (err) {
      console.error("Status update error:", err);
    }
  };

  // Page title mapping for top navbar
  const pageTitles = {
    dashboard: "Executive Command Centre Dashboard",
    "camera-center": "Fleet Camera Command Centre — Multi-Channel Edge View",
    fleet: "Public Transit Fleet & Edge Unit Telemetry",
    map: "Live Transit Fleet & Road Surface GIS Mapping",
    routes: "Transit Corridor & Route Segment Intelligence",
    videos: "Video Ingestion & Dual-View AI Playback",
    road_infrastructure: "Road Infrastructure & Pavement Distress AI",
    traffic: "Traffic Intelligence & Flow Analytics",
    pedestrians: "Pedestrian Safety & Vulnerable Zone Analytics",
    events: "Defect Registry & Comprehensive Event Ledger",
    verification: "Multi-Bus Verification & Cross-Corridor Consensus",
    incidents: "Incident Review Queue & Critical Hazard Triage",
    dispatch: "Municipal Authority Dispatch & Work Orders",
    "traffic-analytics": "Traffic Analytics & Corridor Congestion Profile",
    analytics: "Smart City Infrastructure & Pavement Quality Analytics",
    admin: "Admin Console & Municipal Operator Access Control",
    audit: "System Audit Logs & Immutable Action Trail",
    settings: "System Configuration & Runtime Settings",
    diagnostics: "System Infrastructure Diagnostics & Model Runtimes",
  };

  return (
    <div className="app-container">
      {/* Reference Doc1 Dark Navy Sidebar */}
      <aside className="sidebar">
        <div className="brand-section">
          <div className="brand-icon">US</div>
          <div>
            <div className="brand-title">UrbanSense AI</div>
            <div className="brand-subtitle">Transit Intelligence</div>
          </div>
        </div>

        <nav className="nav-menu">
          {/* GROUP 1: Overview */}
          <div className="nav-section-title">Overview</div>
          <button
            className={`nav-item ${activeTab === "dashboard" ? "active" : ""}`}
            onClick={() => setActiveTab("dashboard")}
          >
            <div className="nav-item-content">
              <LayoutDashboard size={16} />
              <span>Command Centre</span>
            </div>
          </button>

          {/* GROUP 2: Fleet Operations */}
          <div className="nav-section-title">Fleet Operations</div>
          <button
            className={`nav-item ${activeTab === "camera-center" ? "active" : ""}`}
            onClick={() => setActiveTab("camera-center")}
          >
            <div className="nav-item-content">
              <Video size={16} />
              <span>Camera Command</span>
            </div>
            <span className="nav-badge-pill nav-badge-stream">STREAM</span>
          </button>
          <button
            className={`nav-item ${activeTab === "fleet" ? "active" : ""}`}
            onClick={() => setActiveTab("fleet")}
          >
            <div className="nav-item-content">
              <Bus size={16} />
              <span>Fleet Management</span>
            </div>
            <span className="nav-badge-pill nav-badge-live">7 BUSES</span>
          </button>
          <button
            className={`nav-item ${activeTab === "map" ? "active" : ""}`}
            onClick={() => setActiveTab("map")}
          >
            <div className="nav-item-content">
              <MapPin size={16} />
              <span>GIS Map</span>
            </div>
            <span className="nav-badge-pill nav-badge-live">LIVE</span>
          </button>
          <button
            className={`nav-item ${activeTab === "routes" ? "active" : ""}`}
            onClick={() => setActiveTab("routes")}
          >
            <div className="nav-item-content">
              <Compass size={16} />
              <span>Route Intelligence</span>
            </div>
          </button>

          {/* GROUP 3: AI Intelligence */}
          <div className="nav-section-title">AI Intelligence</div>
          <button
            className={`nav-item ${activeTab === "videos" ? "active" : ""}`}
            onClick={() => setActiveTab("videos")}
          >
            <div className="nav-item-content">
              <Film size={16} />
              <span>Video Monitoring</span>
            </div>
          </button>
          <button
            className={`nav-item ${activeTab === "road_infrastructure" ? "active" : ""}`}
            onClick={() => setActiveTab("road_infrastructure")}
          >
            <div className="nav-item-content">
              <Layers size={16} />
              <span>Road Defects</span>
            </div>
            <span className="nav-badge-pill nav-badge-control">YOLO11</span>
          </button>
          <button
            className={`nav-item ${activeTab === "traffic" ? "active" : ""}`}
            onClick={() => setActiveTab("traffic")}
          >
            <div className="nav-item-content">
              <Car size={16} />
              <span>Traffic Intelligence</span>
            </div>
          </button>
          <button
            className={`nav-item ${activeTab === "pedestrians" ? "active" : ""}`}
            onClick={() => setActiveTab("pedestrians")}
          >
            <div className="nav-item-content">
              <Users size={16} />
              <span>Pedestrian Safety</span>
            </div>
          </button>

          {/* GROUP 4: Municipal Operations */}
          <div className="nav-section-title">Municipal Operations</div>
          <button
            className={`nav-item ${activeTab === "events" ? "active" : ""}`}
            onClick={() => setActiveTab("events")}
          >
            <div className="nav-item-content">
              <ClipboardList size={16} />
              <span>Defect Registry</span>
            </div>
          </button>
          <button
            className={`nav-item ${activeTab === "verification" ? "active" : ""}`}
            onClick={() => setActiveTab("verification")}
          >
            <div className="nav-item-content">
              <CheckCircle2 size={16} />
              <span>Verification Centre</span>
            </div>
            <span className="nav-badge-pill nav-badge-audit">CONSENSUS</span>
          </button>
          <button
            className={`nav-item ${activeTab === "incidents" ? "active" : ""}`}
            onClick={() => setActiveTab("incidents")}
          >
            <div className="nav-item-content">
              <ShieldAlert size={16} />
              <span>Incident Review</span>
            </div>
            <span className="nav-badge-pill nav-badge-alert">ALERT</span>
          </button>
          <button
            className={`nav-item ${activeTab === "dispatch" ? "active" : ""}`}
            onClick={() => setActiveTab("dispatch")}
          >
            <div className="nav-item-content">
              <Truck size={16} />
              <span>Authority Dispatch</span>
            </div>
          </button>

          {/* GROUP 5: Insights */}
          <div className="nav-section-title">Insights</div>
          <button
            className={`nav-item ${activeTab === "traffic-analytics" ? "active" : ""}`}
            onClick={() => setActiveTab("traffic-analytics")}
          >
            <div className="nav-item-content">
              <TrendingUp size={16} />
              <span>Traffic Analytics</span>
            </div>
          </button>
          <button
            className={`nav-item ${activeTab === "analytics" ? "active" : ""}`}
            onClick={() => setActiveTab("analytics")}
          >
            <div className="nav-item-content">
              <BarChart2 size={16} />
              <span>City Analytics</span>
            </div>
          </button>

          {/* GROUP 6: Administration */}
          <div className="nav-section-title">Administration</div>
          <button
            className={`nav-item ${activeTab === "admin" ? "active" : ""}`}
            onClick={() => setActiveTab("admin")}
          >
            <div className="nav-item-content">
              <UserCheck size={16} />
              <span>Admin Console</span>
            </div>
            <span className="nav-badge-pill nav-badge-control">CONTROL</span>
          </button>
          <button
            className={`nav-item ${activeTab === "audit" ? "active" : ""}`}
            onClick={() => setActiveTab("audit")}
          >
            <div className="nav-item-content">
              <History size={16} />
              <span>Audit Logs</span>
            </div>
            <span className="nav-badge-pill nav-badge-audit">AUDIT</span>
          </button>
          <button
            className={`nav-item ${activeTab === "settings" ? "active" : ""}`}
            onClick={() => setActiveTab("settings")}
          >
            <div className="nav-item-content">
              <Settings size={16} />
              <span>System Settings</span>
            </div>
          </button>
          <button
            className={`nav-item ${activeTab === "diagnostics" ? "active" : ""}`}
            onClick={() => setActiveTab("diagnostics")}
          >
            <div className="nav-item-content">
              <Cpu size={16} />
              <span>System Diagnostics</span>
            </div>
            <span className="nav-badge-pill nav-badge-live">MPS</span>
          </button>
        </nav>

        {/* Sidebar Footer with Operator Info & Pipeline Status */}
        <div className="sidebar-footer">
          <div className="sidebar-user-card">
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div className="sidebar-user-avatar">A</div>
              <div>
                <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#ffffff" }}>
                  admin SYSTEM
                </div>
                <div style={{ fontSize: "0.68rem", color: "#94a3b8" }}>
                  Operations Center
                </div>
              </div>
            </div>
            <span
              style={{
                fontSize: "0.65rem",
                fontWeight: 700,
                padding: "2px 6px",
                background: "#1d4ed8",
                color: "#ffffff",
                borderRadius: "4px",
                textTransform: "uppercase",
              }}
            >
              ADMIN
            </span>
          </div>

          <div className="sidebar-pipeline-status">
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span className="status-dot" />
              <span style={{ fontWeight: 600, color: "#cbd5e1" }}>PIPELINE LIVE</span>
            </div>
            <span style={{ color: "#38bdf8", fontWeight: 700 }}>99.98%</span>
          </div>

          <div
            style={{
              fontSize: "0.7rem",
              color: "#64748b",
              lineHeight: 1.4,
              borderTop: "1px solid var(--sidebar-border)",
              paddingTop: "10px",
            }}
          >
            <div>SIH26124 • BEL • Guide: C. Sireesha</div>
            <div>Telangana Public Transit Fleet</div>
          </div>
        </div>
      </aside>

      {/* Main View Area */}
      <main className="main-content">
        <header className="top-navbar">
          <div>
            <div className="page-title">{pageTitles[activeTab] || "UrbanSense AI Platform"}</div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "2px" }}>
              Mobile Urban Sensing Platform • Telangana Public Transit Fleet (Problem ID: SIH26124)
            </div>
          </div>

          <div className="top-actions">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "0.78rem",
                fontWeight: 600,
                padding: "5px 12px",
                borderRadius: "var(--radius-sm)",
                background: "#ecfdf5",
                color: "#059669",
                border: "1px solid #a7f3d0",
              }}
            >
              <span
                style={{
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  background: "#059669",
                }}
              />
              <span>LIVE CONTINUOUS SENSING 1400</span>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "0.78rem",
                fontWeight: 600,
                padding: "5px 12px",
                borderRadius: "var(--radius-sm)",
                background: "#eff6ff",
                color: "var(--accent-blue)",
                border: "1px solid #bfdbfe",
              }}
            >
              <span
                style={{
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  background: "var(--accent-blue)",
                }}
              />
              <span>7 BUSES SENSING</span>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "0.78rem",
                fontWeight: 600,
                padding: "5px 12px",
                borderRadius: "var(--radius-sm)",
                background: "#f8fafc",
                color: "var(--text-secondary)",
                border: "1px solid var(--border-color)",
                fontFamily: "monospace",
              }}
            >
              <Clock size={13} color="var(--text-muted)" />
              <span>{currentTime || "12:00:00 IST"}</span>
            </div>

            <button className="btn-outline" onClick={fetchData} title="Refresh All Data">
              <RefreshCw size={13} className={loading ? "spin-animation" : ""} /> Refresh
            </button>
          </div>
        </header>

        {error && (
          <div
            style={{
              margin: "16px 32px 0",
              padding: "12px 18px",
              background: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: "var(--radius-md)",
              color: "#dc2626",
              fontSize: "0.85rem",
            }}
          >
            {error}
          </div>
        )}

        {/* 19 Navigation Hub Renderings */}
        {activeTab === "dashboard" && (
          <DashboardTab
            summary={summary}
            health={health}
            onNavigateTab={setActiveTab}
            onSelectEvent={setSelectedDrawerEvent}
          />
        )}
        {activeTab === "camera-center" && (
          <CameraCenterTab
            buses={buses}
            events={events}
            videos={videos}
            onInspectEvent={setSelectedDrawerEvent}
            onNavigateTab={setActiveTab}
            onProcessVideo={handleProcess}
            processingState={processingState}
            health={health}
          />
        )}
        {activeTab === "fleet" && (
          <FleetTab
            buses={buses}
            onSimulateTick={handleSimulateTick}
          />
        )}
        {activeTab === "map" && (
          <MapTab
            buses={buses}
            events={events}
            onSimulateTick={handleSimulateTick}
            onSelectEvent={setSelectedDrawerEvent}
          />
        )}
        {activeTab === "routes" && (
          <RouteIntelligenceTab
            routes={routes}
            events={events}
            onSelectRoute={(c) => console.log("Selected corridor chunk:", c)}
          />
        )}
        {activeTab === "videos" && (
          <VideoTab
            videos={videos}
            buses={buses}
            onUpload={handleUpload}
            onProcess={handleProcess}
            processingState={processingState}
            health={health}
          />
        )}
        {activeTab === "road_infrastructure" && (
          <RoadInfrastructureTab
            summary={summary}
            events={events}
            health={health}
            onSelectEvent={setSelectedDrawerEvent}
          />
        )}
        {activeTab === "traffic" && (
          <TrafficTab
            summary={summary}
            events={events}
            buses={buses}
            onSelectEvent={setSelectedDrawerEvent}
          />
        )}
        {activeTab === "pedestrians" && (
          <PedestrianSafetyTab
            summary={summary}
            events={events}
            buses={buses}
            onSelectEvent={setSelectedDrawerEvent}
          />
        )}
        {activeTab === "events" && (
          <EventsTab
            events={events}
            buses={buses}
            onSelectEvent={setSelectedDrawerEvent}
            onUpdateStatus={handleUpdateEventStatus}
          />
        )}
        {activeTab === "verification" && (
          <VerificationTab
            buses={buses}
            events={events}
            onRefreshEvents={fetchData}
          />
        )}
        {activeTab === "incidents" && (
          <IncidentTab
            events={events}
            buses={buses}
            onUpdateEventStatus={handleUpdateEventStatus}
            onSelectEvent={setSelectedDrawerEvent}
          />
        )}
        {activeTab === "dispatch" && (
          <DispatchTab
            onInspectEvent={setSelectedDrawerEvent}
          />
        )}
        {activeTab === "traffic-analytics" && (
          <TrafficAnalyticsTab
            events={events}
            buses={buses}
            routes={routes}
          />
        )}
        {activeTab === "analytics" && (
          <AnalyticsTab
            summary={summary}
          />
        )}
        {activeTab === "admin" && (
          <AdminTab />
        )}
        {activeTab === "audit" && (
          <AuditTab />
        )}
        {activeTab === "settings" && (
          <SettingsTab
            health={health}
            summary={summary}
            onRefreshAll={fetchData}
          />
        )}
        {activeTab === "diagnostics" && (
          <DiagnosticsTab
            health={health}
          />
        )}

        {/* Slide-Over Event Detail Drawer */}
        {selectedDrawerEvent && (
          <EventDetailDrawer
            event={selectedDrawerEvent}
            buses={buses}
            onClose={() => setSelectedDrawerEvent(null)}
            onUpdateStatus={handleUpdateEventStatus}
          />
        )}
      </main>
    </div>
  );
}
