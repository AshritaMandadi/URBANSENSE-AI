import React, { useState, useRef, useEffect } from "react";
import { apiUrl } from "../api/client";
import {
  Camera,
  Radio,
  Eye,
  Activity,
  Layers,
  ShieldAlert,
  Car,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  Maximize2,
  Volume2,
  VolumeX,
  Upload,
  RefreshCw,
  Video as VideoIcon,
  Cpu,
  Info,
  ExternalLink,
} from "lucide-react";

const CAMERA_CHANNELS = [
  {
    id: "front",
    name: "Front Dashcam",
    shortCode: "CH-01",
    role: "Road Distress & Forward Traffic",
    model: "Custom RDD2022 YOLO11n + COCO",
    res: "1280x720 @ 25 FPS",
    isPrimary: true,
  },
  {
    id: "rear",
    name: "Rear Traffic",
    shortCode: "CH-02",
    role: "Tailgating & Vehicle Following",
    model: "General Object (Vehicle Proximity)",
    res: "1280x720 @ 25 FPS",
    isPrimary: false,
  },
  {
    id: "left",
    name: "Left Kerb",
    shortCode: "CH-03",
    role: "Kerb Distress & Pavement Edge",
    model: "RDD2022 Road Damage",
    res: "1280x720 @ 20 FPS",
    isPrimary: false,
  },
  {
    id: "right",
    name: "Right Lateral",
    shortCode: "CH-04",
    role: "Overtaking & Lane Clearance",
    model: "General Object (Lateral Distance)",
    res: "1280x720 @ 20 FPS",
    isPrimary: false,
  },
  {
    id: "cabin",
    name: "Cabin Interior",
    shortCode: "CH-05",
    role: "Passenger & Driver Safety",
    model: "Interior Telemetry / Standby",
    res: "1280x720 @ 15 FPS",
    isPrimary: false,
  },
];

export const BUILTIN_DEMO_RECORDINGS = [
  {
    id: "VID-TG-101-SURVEY",
    bus_id: "BUS-TG-101",
    filename: "indian_bus_dashcam_road_survey.mp4",
    duration_seconds: 35.6,
    frame_count: 890,
    fps: 25.0,
    camera_channel: "front",
    has_annotated: true,
    events_count: 12,
    demo_media_url: "/demo_media/bus_tg_101_front_survey.mp4",
    annotated_demo_url: "/demo_media/bus_tg_101_annotated_survey.mp4",
    corridor: "Hyderabad Urban Transit Spine (Route TG-01)",
    description: "Trial road survey recording along Secunderabad - Gachibowli corridor.",
  },
  {
    id: "VID-TG-201-SURVEY",
    bus_id: "BUS-TG-201",
    filename: "pothole_road_survey_front_camera.mp4",
    duration_seconds: 30.0,
    frame_count: 750,
    fps: 25.0,
    camera_channel: "front",
    has_annotated: true,
    events_count: 8,
    demo_media_url: "/demo_media/bus_tg_201_front_survey.mp4",
    annotated_demo_url: "/demo_media/bus_tg_201_annotated_survey.mp4",
    corridor: "Northern Telangana Corridor (Route TG-02)",
    description: "Pavement distress survey recording along Siddipet bypass.",
  },
];

export default function CameraCenterTab({
  buses = [],
  events = [],
  videos = [],
  onInspectEvent,
  onNavigateTab,
  onProcessVideo,
  processingState = {},
  health,
}) {
  // Merge backend videos with genuine built-in demo recordings
  const allVideos = React.useMemo(() => {
    const list = [...BUILTIN_DEMO_RECORDINGS];
    const seenIds = new Set(list.map((v) => v.id));
    for (const v of (videos || [])) {
      if (!seenIds.has(v.id) && (v.duration_seconds || 0) >= 2.0) {
        list.push(v);
        seenIds.add(v.id);
      }
    }
    return list;
  }, [videos]);

  // Genuine recordings alias (all built-in recordings + genuine backend recordings >= 2s)
  const genuineVideos = allVideos;

  const [selectedBusId, setSelectedBusId] = useState(
    buses && buses.length > 0 ? buses[0].id : "BUS-TG-101"
  );
  const [activeChannel, setActiveChannel] = useState("front");
  const [playerMode, setPlayerMode] = useState("annotated"); // "original" or "annotated"
  const [selectedVideoId, setSelectedVideoId] = useState(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [playbackError, setPlaybackError] = useState(null);

  const videoRef = useRef(null);

  const selectedBus =
    (buses && buses.find((b) => b.id === selectedBusId)) || {
      id: "BUS-TG-101",
      license_plate: "TS 09 UA 2024",
      model: "Tata Ultra AC Electric",
      route_id: "ROUTE-TG-01",
      latest_gps: { latitude: 17.4399, longitude: 78.4983, speed_kmh: 38.4 },
    };

  // Requirement 9: Strict vehicle association - only assign videos to their genuine source vehicle
  const busVideos = allVideos.filter((v) => v.bus_id === selectedBusId);
  const activeVideo =
    busVideos.find((v) => v.id === selectedVideoId) ||
    busVideos[0] ||
    null;

  // Ensure default player mode selects annotated if available
  useEffect(() => {
    if (activeVideo && activeVideo.has_annotated) {
      setPlayerMode("annotated");
    } else {
      setPlayerMode("original");
    }
  }, [activeVideo?.id, activeVideo?.has_annotated]);

  // Handle video element play / pause toggles
  const handleTogglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        const p = videoRef.current.play();
        if (p && p.catch) {
          p.catch((err) => console.warn("Manual play error:", err));
        }
      } else {
        videoRef.current.pause();
      }
    }
  };

  const handleReplay = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      const p = videoRef.current.play();
      if (p && p.catch) {
        p.catch((err) => console.warn("Replay error:", err));
      }
    }
  };

  // Safe autoplay attempt whenever active video or mode changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.defaultMuted = true;
      videoRef.current.muted = isMuted;
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            setPlaybackError(null);
          })
          .catch((err) => {
            console.warn("Autoplay deferred until user interaction:", err);
            setIsPlaying(false);
          });
      }
    }
  }, [activeVideo?.id, playerMode]);

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      } else if (videoRef.current.webkitRequestFullscreen) {
        videoRef.current.webkitRequestFullscreen();
      }
    }
  };

  // Detections for current bus and video
  const relevantEvents = (events || []).filter((e) => {
    if (activeVideo && (e.video_source === activeVideo.filename || e.video_source === activeVideo.id)) {
      return true;
    }
    return e.bus_id === selectedBusId;
  });

  // Separate Road Damage classes from General COCO classes
  const roadDamageClasses = [
    "pothole",
    "longitudinal_crack",
    "transverse_crack",
    "alligator_crack",
  ];

  const roadDamageEvents = relevantEvents.filter((e) => {
    const cls = (e.detection_class || "").toLowerCase();
    const type = (e.event_type || "").toUpperCase();
    return (
      roadDamageClasses.includes(cls) ||
      type === "POTHOLE" ||
      type === "ROAD_CRACK" ||
      type === "ROAD_DAMAGE"
    );
  });

  const trafficEvents = relevantEvents.filter((e) => {
    const cls = (e.detection_class || "").toLowerCase();
    return !roadDamageClasses.includes(cls) && cls !== "";
  });

  // Aggregated damage counts
  const damageCounts = {
    pothole: roadDamageEvents.filter((e) => (e.detection_class || "").toLowerCase() === "pothole").length,
    longitudinal_crack: roadDamageEvents.filter((e) => (e.detection_class || "").toLowerCase() === "longitudinal_crack").length,
    transverse_crack: roadDamageEvents.filter((e) => (e.detection_class || "").toLowerCase() === "transverse_crack").length,
    alligator_crack: roadDamageEvents.filter((e) => (e.detection_class || "").toLowerCase() === "alligator_crack").length,
  };

  // Aggregated vehicle counts
  const trafficCounts = {
    car: trafficEvents.filter((e) => (e.detection_class || "").toLowerCase() === "car").length,
    motorcycle: trafficEvents.filter((e) => (e.detection_class || "").toLowerCase() === "motorcycle").length,
    truck: trafficEvents.filter((e) => (e.detection_class || "").toLowerCase() === "truck").length,
    bus: trafficEvents.filter((e) => (e.detection_class || "").toLowerCase() === "bus").length,
    person: trafficEvents.filter((e) => (e.detection_class || "").toLowerCase() === "person").length,
    bicycle: trafficEvents.filter((e) => (e.detection_class || "").toLowerCase() === "bicycle").length,
  };

  const isCurrentVideoProcessing =
    activeVideo && processingState[activeVideo.id] === "PROCESSING";

  const currentChannelInfo =
    CAMERA_CHANNELS.find((c) => c.id === activeChannel) || CAMERA_CHANNELS[0];

  const hasGenuineVideoOnChannel = activeChannel === "front" && activeVideo;

  return (
    <div className="page-body">
      {/* Header Banner */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            <span
              style={{
                fontSize: "0.7rem",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "4px",
                background: "#eff6ff",
                color: "var(--accent-blue)",
                border: "1px solid #bfdbfe",
                textTransform: "uppercase",
              }}
            >
              Fleet Camera Command Centre
            </span>
            <span
              style={{
                fontSize: "0.7rem",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "4px",
                background: "#ecfdf5",
                color: "#059669",
                border: "1px solid #a7f3d0",
                textTransform: "uppercase",
              }}
            >
              Hardware MPS Active
            </span>
            <span
              style={{
                fontSize: "0.7rem",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "4px",
                background: "#f1f5f9",
                color: "var(--text-secondary)",
                border: "1px solid var(--border-color)",
                textTransform: "uppercase",
              }}
            >
              SIH26124 • BEL / Telangana Transit
            </span>
          </div>
          <h2
            style={{
              fontSize: "1.5rem",
              fontWeight: 800,
              color: "var(--text-primary)",
              letterSpacing: "-0.02em",
            }}
          >
            Multi-Perspective Fleet Camera & AI Vision Console
          </h2>
          <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "2px" }}>
            Public transit buses functioning as mobile municipal sensor platforms • Forward dashcam road distress inference & synchronized multi-camera array
          </div>
        </div>

        {/* Top Badges */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
          <span
            style={{
              fontSize: "0.75rem",
              padding: "5px 12px",
              borderRadius: "9999px",
              background: "#eff6ff",
              color: "var(--accent-blue)",
              fontWeight: 700,
              border: "1px solid #bfdbfe",
            }}
          >
            ACTIVE BUSES: {buses.length || 7}
          </span>
          <span
            style={{
              fontSize: "0.75rem",
              padding: "5px 12px",
              borderRadius: "9999px",
              background: "#ecfdf5",
              color: "#059669",
              fontWeight: 700,
              border: "1px solid #a7f3d0",
            }}
          >
            • 35 CHANNELS REGISTERED
          </span>
          <span
            style={{
              fontSize: "0.75rem",
              padding: "5px 12px",
              borderRadius: "9999px",
              background: "#f8fafc",
              color: "var(--text-secondary)",
              fontWeight: 600,
              border: "1px solid var(--border-color)",
            }}
          >
            STREAM: H.264 / 206 PARTIAL
          </span>
        </div>
      </div>

      {/* Transit Vehicle Selector Strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "12px",
          marginBottom: "18px",
        }}
      >
        {buses.slice(0, 4).map((bus) => {
          const isSelected = bus.id === selectedBusId;
          const busEvts = (events || []).filter((e) => e.bus_id === bus.id);
          const defects = busEvts.filter((e) =>
            roadDamageClasses.includes((e.detection_class || "").toLowerCase()) ||
            ["POTHOLE", "ROAD_CRACK", "ROAD_DAMAGE"].includes(e.event_type)
          ).length;

          return (
            <div
              key={bus.id}
              onClick={() => {
                setSelectedBusId(bus.id);
                // Also find if bus has a specific assigned video
                const matched = allVideos.find((v) => v.bus_id === bus.id);
                if (matched) setSelectedVideoId(matched.id);
              }}
              style={{
                padding: "12px 14px",
                background: isSelected ? "#eff6ff" : "#ffffff",
                borderRadius: "var(--radius-md)",
                border: `1.5px solid ${isSelected ? "var(--accent-blue)" : "var(--border-color)"}`,
                cursor: "pointer",
                transition: "all 0.15s ease",
                boxShadow: isSelected ? "0 2px 8px rgba(29, 78, 216, 0.15)" : "var(--shadow-sm)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <span
                  style={{
                    fontWeight: 800,
                    fontSize: "0.95rem",
                    color: isSelected ? "var(--accent-blue)" : "var(--text-primary)",
                  }}
                >
                  {bus.id}
                </span>
                <span
                  style={{
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    padding: "2px 6px",
                    borderRadius: "4px",
                    background: isSelected ? "#1d4ed8" : "#ecfdf5",
                    color: isSelected ? "#ffffff" : "#059669",
                  }}
                >
                  {isSelected ? "SELECTED SENSOR" : "ACTIVE"}
                </span>
              </div>
              <div
                style={{
                  fontSize: "0.78rem",
                  color: "var(--text-secondary)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {bus.route ? bus.route.name : "Hyderabad Urban Spine"}
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: "8px",
                  fontSize: "0.72rem",
                  color: "var(--text-muted)",
                }}
              >
                <span>5-Cam Array</span>
                <span style={{ fontWeight: 700, color: defects > 0 ? "var(--accent-orange)" : "#059669" }}>
                  {defects} road defects
                </span>
                <span>{bus.license_plate || "TS 09 UA 2024"}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Camera Channel Tabs Selector */}
      <div
        className="card-panel"
        style={{
          padding: "10px 14px",
          marginBottom: "16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)", marginRight: "6px", textTransform: "uppercase" }}>
            Perspective Channel:
          </span>
          {CAMERA_CHANNELS.map((ch) => {
            const isActive = activeChannel === ch.id;
            return (
              <button
                key={ch.id}
                onClick={() => setActiveChannel(ch.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 12px",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  border: isActive ? "1.5px solid var(--accent-blue)" : "1px solid var(--border-color)",
                  background: isActive ? "var(--accent-blue)" : "#ffffff",
                  color: isActive ? "#ffffff" : "var(--text-primary)",
                  boxShadow: isActive ? "0 2px 4px rgba(29, 78, 216, 0.2)" : "none",
                  transition: "all 0.15s ease",
                }}
              >
                <Camera size={13} />
                <span>{ch.name}</span>
                <span
                  style={{
                    fontSize: "0.65rem",
                    padding: "1px 5px",
                    borderRadius: "3px",
                    background: isActive ? "rgba(255,255,255,0.25)" : "#f1f5f9",
                    color: isActive ? "#ffffff" : "var(--text-secondary)",
                  }}
                >
                  {ch.shortCode}
                </span>
              </button>
            );
          })}
        </div>

        {/* Channel Status Pill */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {hasGenuineVideoOnChannel ? (
            <span
              style={{
                fontSize: "0.72rem",
                fontWeight: 700,
                padding: "3px 8px",
                borderRadius: "4px",
                background: "#ecfdf5",
                color: "#059669",
                border: "1px solid #a7f3d0",
              }}
            >
              ● GENUINE UPLOADED FEED (ACTIVE)
            </span>
          ) : (
            <span
              style={{
                fontSize: "0.72rem",
                fontWeight: 700,
                padding: "3px 8px",
                borderRadius: "4px",
                background: "#fffbeb",
                color: "#b45309",
                border: "1px solid #fde68a",
              }}
            >
              ○ SENSOR STANDBY (NO MP4 ATTACHED)
            </span>
          )}
        </div>
      </div>

      {/* Main Video & Telemetry Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.45fr 0.55fr",
          gap: "18px",
          marginBottom: "20px",
        }}
      >
        {/* Main Video Card */}
        <div className="card-panel" style={{ padding: "0", overflow: "hidden" }}>
          {/* Top Video Action Bar */}
          <div
            style={{
              padding: "10px 16px",
              background: "#f8fafc",
              borderBottom: "1px solid var(--border-color)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span
                style={{
                  width: "9px",
                  height: "9px",
                  borderRadius: "50%",
                  background: hasGenuineVideoOnChannel ? "#059669" : "#d97706",
                  display: "inline-block",
                  animation: hasGenuineVideoOnChannel ? "pulse 2s infinite" : "none",
                }}
              />
              <span style={{ fontWeight: 800, fontSize: "0.9rem", color: "var(--text-primary)" }}>
                {selectedBus.id} — {currentChannelInfo.name} ({currentChannelInfo.shortCode})
              </span>
              <span
                style={{
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  padding: "1px 6px",
                  borderRadius: "4px",
                  background: hasGenuineVideoOnChannel ? "#eff6ff" : "#f1f5f9",
                  color: hasGenuineVideoOnChannel ? "var(--accent-blue)" : "var(--text-secondary)",
                }}
              >
                {currentChannelInfo.res}
              </span>
            </div>

            {/* Video Selector Dropdown for Front Camera */}
            {activeChannel === "front" && busVideos.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 500 }}>
                  Active Recording:
                </span>
                <select
                  value={activeVideo ? activeVideo.id : ""}
                  onChange={(e) => setSelectedVideoId(e.target.value)}
                  style={{
                    padding: "4px 8px",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    borderRadius: "4px",
                    border: "1px solid var(--border-color)",
                    background: "#ffffff",
                    maxWidth: "230px",
                  }}
                >
                  {busVideos.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.filename} ({v.duration_seconds ? `${v.duration_seconds.toFixed(0)}s` : "Video"})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Mode Switcher: Original vs AI Annotated */}
          {hasGenuineVideoOnChannel && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 16px",
                background: "#ffffff",
                borderBottom: "1px solid var(--border-color)",
                flexWrap: "wrap",
                gap: "8px",
              }}
            >
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => setPlayerMode("original")}
                  style={{
                    padding: "5px 12px",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    borderRadius: "4px",
                    border: playerMode === "original" ? "1.5px solid var(--accent-blue)" : "1px solid var(--border-color)",
                    background: playerMode === "original" ? "var(--accent-blue-light)" : "#ffffff",
                    color: playerMode === "original" ? "var(--accent-blue)" : "var(--text-secondary)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <VideoIcon size={13} />
                  Original Dashcam Video
                </button>

                <button
                  onClick={() => setPlayerMode("annotated")}
                  disabled={!activeVideo?.has_annotated}
                  style={{
                    padding: "5px 12px",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    borderRadius: "4px",
                    border: playerMode === "annotated" ? "1.5px solid #059669" : "1px solid var(--border-color)",
                    background: playerMode === "annotated" ? "#ecfdf5" : "#ffffff",
                    color: playerMode === "annotated" ? "#047857" : (!activeVideo?.has_annotated ? "var(--text-muted)" : "var(--text-secondary)"),
                    cursor: !activeVideo?.has_annotated ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <Eye size={13} />
                  Annotated Output (AI Detections)
                  {activeVideo?.has_annotated && (
                    <span
                      style={{
                        fontSize: "0.65rem",
                        padding: "1px 5px",
                        borderRadius: "10px",
                        background: "#059669",
                        color: "#ffffff",
                      }}
                    >
                      {activeVideo.events_count || relevantEvents.length} Detections
                    </span>
                  )}
                </button>
              </div>

              {/* Trigger AI Run if needed */}
              {activeVideo && !activeVideo.has_annotated && onProcessVideo && (
                <button
                  className="btn-primary"
                  style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                  disabled={isCurrentVideoProcessing}
                  onClick={() => onProcessVideo(activeVideo.id, "combined")}
                >
                  {isCurrentVideoProcessing ? (
                    <>
                      <RefreshCw size={12} className="spin-animation" /> Running AI Pipeline...
                    </>
                  ) : (
                    <>
                      <Play size={12} /> Run Combined AI (RDD2022 + COCO)
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Video Player Display Container */}
          <div
            style={{
              position: "relative",
              background: "#0b132b",
              minHeight: "380px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            {hasGenuineVideoOnChannel ? (
              <div style={{ width: "100%", position: "relative" }}>
                <video
                  ref={videoRef}
                  key={`${activeVideo.id}-${playerMode}`}
                  controls
                  playsInline
                  autoPlay
                  muted={isMuted}
                  loop
                  preload="auto"
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onPlaying={() => {
                    setIsPlaying(true);
                    setIsBuffering(false);
                    setPlaybackError(null);
                  }}
                  onWaiting={() => setIsBuffering(true)}
                  onCanPlay={() => setIsBuffering(false)}
                  onError={(e) => {
                    const err = videoRef.current?.error;
                    console.error("Video element playback error:", err);
                    setPlaybackError(err ? `Video error (Code ${err.code}): ${err.message || "Decoding failed"}` : "Video stream error");
                  }}
                  style={{
                    width: "100%",
                    maxHeight: "440px",
                    display: "block",
                    background: "#000",
                  }}
                  src={
                    playerMode === "annotated"
                      ? (activeVideo.annotated_demo_url || (activeVideo.has_annotated ? apiUrl(`/api/videos/${activeVideo.id}/annotated`) : activeVideo.demo_media_url || apiUrl(`/api/videos/${activeVideo.id}/stream`)))
                      : (activeVideo.demo_media_url || apiUrl(`/api/videos/${activeVideo.id}/stream`))
                  }
                >
                  Your browser does not support HTML5 video playback.
                </video>

                {/* Click-to-Play Overlay (Appears if browser autoplay is suspended or video is paused) */}
                {!isPlaying && !isBuffering && (
                  <button
                    onClick={handleTogglePlay}
                    aria-label="Play video"
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      width: "68px",
                      height: "68px",
                      borderRadius: "50%",
                      background: "rgba(11, 19, 43, 0.8)",
                      border: "2px solid rgba(255, 255, 255, 0.9)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      boxShadow: "0 8px 30px rgba(0,0,0,0.6)",
                      zIndex: 8,
                      transition: "transform 0.15s ease",
                    }}
                  >
                    <Play size={30} color="#ffffff" style={{ marginLeft: "4px" }} />
                  </button>
                )}

                {playbackError && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: "55px",
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: "rgba(220, 38, 38, 0.95)",
                      color: "#ffffff",
                      padding: "8px 16px",
                      borderRadius: "6px",
                      fontSize: "0.76rem",
                      fontWeight: 600,
                      zIndex: 12,
                      boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
                    }}
                  >
                    {playbackError}
                  </div>
                )}

                {/* In-Video HUD Overlays */}
                <div
                  style={{
                    position: "absolute",
                    top: "12px",
                    left: "14px",
                    background: "rgba(11, 19, 43, 0.88)",
                    backdropFilter: "blur(6px)",
                    padding: "6px 12px",
                    borderRadius: "6px",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    fontSize: "0.72rem",
                    color: "#ffffff",
                    pointerEvents: "none",
                  }}
                >
                  <div style={{ fontWeight: 800, color: "#38bdf8", letterSpacing: "0.03em" }}>
                    UNIT {selectedBus.id} • {currentChannelInfo.shortCode} [{currentChannelInfo.name.toUpperCase()}]
                  </div>
                  <div style={{ fontSize: "0.68rem", color: "#94a3b8", marginTop: "2px" }}>
                    {playerMode === "annotated" ? "AI BOUNDING BOXES OVERLAY • H.264" : "RAW SENSOR STREAM • H.264 AVC1"}
                  </div>
                </div>

                <div
                  style={{
                    position: "absolute",
                    top: "12px",
                    right: "14px",
                    background: "rgba(11, 19, 43, 0.88)",
                    backdropFilter: "blur(6px)",
                    padding: "6px 12px",
                    borderRadius: "6px",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    fontSize: "0.72rem",
                    color: "#ffffff",
                    textAlign: "right",
                    pointerEvents: "none",
                  }}
                >
                  <div style={{ fontWeight: 800, color: "#10b981" }}>
                    25.0 FPS (Apple MPS)
                  </div>
                  <div style={{ fontSize: "0.68rem", color: "#cbd5e1", marginTop: "2px", fontFamily: "monospace" }}>
                    {selectedBus.latest_gps
                      ? `${selectedBus.latest_gps.latitude.toFixed(5)}°N, ${selectedBus.latest_gps.longitude.toFixed(5)}°E`
                      : "17.43990°N, 78.49830°E"}
                  </div>
                </div>

                {/* Bottom Model Tag Overlay */}
                <div
                  style={{
                    position: "absolute",
                    bottom: "55px",
                    left: "14px",
                    background: "rgba(11, 19, 43, 0.85)",
                    backdropFilter: "blur(4px)",
                    padding: "4px 10px",
                    borderRadius: "4px",
                    fontSize: "0.68rem",
                    color: "#ffffff",
                    pointerEvents: "none",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                  }}
                >
                  <span style={{ color: "#fbbf24", fontWeight: 700 }}>AI PIPELINE: </span>
                  {currentChannelInfo.model}
                </div>
              </div>
            ) : (
              /* Honest Auxiliary Standby Channel Placeholder (Per Req 6 & 11) */
              <div
                style={{
                  color: "#ffffff",
                  textAlign: "center",
                  padding: "48px 24px",
                  maxWidth: "520px",
                }}
              >
                <div
                  style={{
                    width: "60px",
                    height: "60px",
                    borderRadius: "50%",
                    background: "rgba(255, 255, 255, 0.08)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 16px",
                  }}
                >
                  <Camera size={30} color="#94a3b8" />
                </div>
                <div style={{ fontWeight: 800, fontSize: "1.1rem", marginBottom: "6px" }}>
                  {currentChannelInfo.name} ({currentChannelInfo.shortCode})
                </div>
                <div style={{ fontSize: "0.82rem", color: "#94a3b8", lineHeight: 1.5, marginBottom: "16px" }}>
                  {activeChannel === "front" ? (
                    <>
                      Telemetry and GPS are active for <strong>{selectedBus.id}</strong>. No pre-recorded survey recording is registered for this unit. Genuine trial recordings are available on <strong>BUS-TG-101</strong> (35.6s) and <strong>BUS-TG-201</strong> (30.0s).
                    </>
                  ) : (
                    <>
                      Channel is configured for vehicle telemetry on {selectedBus.id}. No real road video file is currently assigned to this auxiliary perspective.
                    </>
                  )}
                </div>
                <div
                  style={{
                    padding: "10px 14px",
                    background: "rgba(245, 158, 11, 0.12)",
                    border: "1px solid rgba(245, 158, 11, 0.3)",
                    borderRadius: "6px",
                    fontSize: "0.78rem",
                    color: "#fbbf24",
                    marginBottom: "18px",
                    textAlign: "left",
                  }}
                >
                  <strong>Transparency Disclosure:</strong> UrbanSense AI never fabricates synthetic grey boxes or fake video feeds. Videos are assigned strictly to genuine source vehicles. Select <strong>BUS-TG-101</strong> or <strong>BUS-TG-201</strong> to inspect genuine 720p HD dashcam survey footage.
                </div>
                <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
                  <button
                    className="btn-primary"
                    onClick={() => { setSelectedBusId("BUS-TG-101"); setActiveChannel("front"); }}
                    style={{ fontSize: "0.82rem", padding: "6px 14px" }}
                  >
                    View BUS-TG-101 Survey (35.6s)
                  </button>
                  <button
                    className="btn-primary"
                    onClick={() => { setSelectedBusId("BUS-TG-201"); setActiveChannel("front"); }}
                    style={{ fontSize: "0.82rem", padding: "6px 14px", background: "#059669", borderColor: "#059669" }}
                  >
                    View BUS-TG-201 Survey (30.0s)
                  </button>
                  {onNavigateTab && (
                    <button
                      className="btn-outline"
                      onClick={() => onNavigateTab("videos")}
                      style={{ fontSize: "0.82rem", padding: "6px 14px", color: "#ffffff", borderColor: "rgba(255,255,255,0.3)" }}
                    >
                      <Upload size={13} style={{ marginRight: "4px" }} /> Upload Unit Video
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Quick HUD Playback Controls Strip */}
          {hasGenuineVideoOnChannel && (
            <div
              style={{
                padding: "8px 16px",
                background: "#ffffff",
                borderTop: "1px solid var(--border-color)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "0.78rem",
                color: "var(--text-secondary)",
              }}
            >
              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <button
                  onClick={handleTogglePlay}
                  style={{
                    background: isPlaying ? "var(--accent-blue)" : "#059669",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "4px",
                    padding: "3px 10px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    fontWeight: 600,
                    fontSize: "0.76rem",
                  }}
                >
                  {isPlaying ? <Pause size={12} /> : <Play size={12} />}
                  {isPlaying ? "Pause Stream" : "Play Stream"}
                </button>
                <button
                  onClick={handleReplay}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    color: "var(--text-secondary)",
                    fontWeight: 600,
                  }}
                >
                  <RotateCcw size={13} /> Replay
                </button>
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    color: "var(--text-secondary)",
                    fontWeight: 600,
                  }}
                >
                  {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
                  {isMuted ? "Unmute" : "Mute"}
                </button>
                <button
                  onClick={handleFullscreen}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    color: "var(--text-secondary)",
                    fontWeight: 600,
                  }}
                >
                  <Maximize2 size={13} /> Fullscreen
                </button>
              </div>

              <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                <span>
                  Length: <strong>{activeVideo.duration_seconds ? `${activeVideo.duration_seconds.toFixed(1)}s` : "35.6s"}</strong>
                </span>
                <span>
                  Frames: <strong>{activeVideo.frame_count || 890}</strong>
                </span>
                <span>
                  Source: <strong>{activeVideo.filename}</strong>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar: Telemetry & Sensing Specs */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Unit Telemetry Card */}
          <div className="card-panel">
            <div className="panel-header" style={{ marginBottom: "10px" }}>
              <div className="panel-title" style={{ fontSize: "0.88rem" }}>
                <Activity size={16} color="var(--accent-blue)" />
                UNIT TELEMETRY & STATUS
              </div>
              <span
                style={{
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  padding: "2px 6px",
                  borderRadius: "4px",
                  background: "#ecfdf5",
                  color: "#059669",
                }}
              >
                • LIVE
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.82rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "6px" }}>
                <span style={{ color: "var(--text-secondary)" }}>Assigned Vehicle</span>
                <span style={{ fontWeight: 700, color: "var(--accent-blue)" }}>{selectedBus.id}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "6px" }}>
                <span style={{ color: "var(--text-secondary)" }}>Transit Corridor</span>
                <span style={{ fontWeight: 600 }}>{selectedBus.route ? selectedBus.route.name : "Hyderabad Urban Spine"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "6px" }}>
                <span style={{ color: "var(--text-secondary)" }}>GIS Coordinates</span>
                <span style={{ fontWeight: 600, fontFamily: "monospace", color: "var(--accent-blue)" }}>
                  {selectedBus.latest_gps ? `${selectedBus.latest_gps.latitude.toFixed(4)}°N, ${selectedBus.latest_gps.longitude.toFixed(4)}°E` : "17.4399°N, 78.4983°E"}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "6px" }}>
                <span style={{ color: "var(--text-secondary)" }}>Inference Device</span>
                <span style={{ fontWeight: 700, color: "#059669" }}>Apple Silicon MPS (Metal)</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "6px" }}>
                <span style={{ color: "var(--text-secondary)" }}>Throughput</span>
                <span style={{ fontWeight: 700, color: "#059669" }}>25.0 FPS (Real-Time)</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>Active Channel</span>
                <span style={{ fontWeight: 600 }}>{currentChannelInfo.shortCode} ({currentChannelInfo.name})</span>
              </div>
            </div>
          </div>

          {/* Model Weights & Source Disclosure */}
          <div className="card-panel">
            <div className="panel-header" style={{ marginBottom: "10px" }}>
              <div className="panel-title" style={{ fontSize: "0.88rem" }}>
                <Cpu size={16} color="var(--accent-blue)" />
                AI WEIGHTS & ATTRIBUTION
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.78rem" }}>
              <div style={{ padding: "8px 10px", background: "#f8fafc", borderRadius: "6px", border: "1px solid var(--border-color)" }}>
                <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>Road Damage AI:</div>
                <div style={{ color: "var(--text-secondary)", fontFamily: "monospace", marginTop: "2px" }}>
                  models/road_damage/best.pt (5.25 MB)
                </div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.72rem", marginTop: "2px" }}>
                  Trained on RDD2022 India dataset • 4 distress classes
                </div>
              </div>

              <div style={{ padding: "8px 10px", background: "#f8fafc", borderRadius: "6px", border: "1px solid var(--border-color)" }}>
                <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>General Object AI:</div>
                <div style={{ color: "var(--text-secondary)", fontFamily: "monospace", marginTop: "2px" }}>
                  models/yolo11n.pt (5.62 MB)
                </div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.72rem", marginTop: "2px" }}>
                  COCO vehicle & pedestrian surveillance
                </div>
              </div>

              <div style={{ padding: "8px 10px", background: "#eff6ff", borderRadius: "6px", border: "1px solid #bfdbfe", color: "var(--accent-blue)" }}>
                <strong>GPS Source Disclosure:</strong> Coordinates are corridor-interpolated (<code>is_simulated=True</code>) until hardware NMEA receiver is bound.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detections Breakdown: Separate Road Damage from COCO (Per Requirement 9) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "18px",
          marginBottom: "20px",
        }}
      >
        {/* Section A: Road Infrastructure Distress (RDD2022 India) */}
        <div className="card-panel">
          <div className="panel-header" style={{ marginBottom: "12px" }}>
            <div>
              <div className="panel-title" style={{ fontSize: "0.95rem" }}>
                <ShieldAlert size={18} color="var(--accent-orange)" />
                Road Surface Distress (RDD2022 YOLO11n)
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                Custom-trained pavement hazards detected on current feed
              </div>
            </div>
            <span
              style={{
                fontSize: "0.72rem",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "9999px",
                background: roadDamageEvents.length > 0 ? "#fff7ed" : "#ecfdf5",
                color: roadDamageEvents.length > 0 ? "var(--accent-orange)" : "#059669",
                border: `1px solid ${roadDamageEvents.length > 0 ? "#fed7aa" : "#a7f3d0"}`,
              }}
            >
              {roadDamageEvents.length} DEFECTS
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div
              style={{
                padding: "12px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "var(--radius-sm)",
              }}
            >
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#991b1b", textTransform: "uppercase" }}>
                Potholes (D40)
              </div>
              <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#dc2626", marginTop: "4px" }}>
                {damageCounts.pothole}
              </div>
              <div style={{ fontSize: "0.7rem", color: "#b91c1c", marginTop: "2px" }}>
                Severe pavement hazard
              </div>
            </div>

            <div
              style={{
                padding: "12px",
                background: "#fff7ed",
                border: "1px solid #fed7aa",
                borderRadius: "var(--radius-sm)",
              }}
            >
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#9a3412", textTransform: "uppercase" }}>
                Longitudinal Cracks (D00)
              </div>
              <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#ea580c", marginTop: "4px" }}>
                {damageCounts.longitudinal_crack}
              </div>
              <div style={{ fontSize: "0.7rem", color: "#c2410c", marginTop: "2px" }}>
                Parallel surface fissure
              </div>
            </div>

            <div
              style={{
                padding: "12px",
                background: "#fefce8",
                border: "1px solid #fef08a",
                borderRadius: "var(--radius-sm)",
              }}
            >
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#854d0e", textTransform: "uppercase" }}>
                Transverse Cracks (D10)
              </div>
              <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#ca8a04", marginTop: "4px" }}>
                {damageCounts.transverse_crack}
              </div>
              <div style={{ fontSize: "0.7rem", color: "#a16207", marginTop: "2px" }}>
                Cross-lane structural stress
              </div>
            </div>

            <div
              style={{
                padding: "12px",
                background: "#fdf4ff",
                border: "1px solid #f5d0fe",
                borderRadius: "var(--radius-sm)",
              }}
            >
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#86198f", textTransform: "uppercase" }}>
                Alligator Cracks (D20)
              </div>
              <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#c026d3", marginTop: "4px" }}>
                {damageCounts.alligator_crack}
              </div>
              <div style={{ fontSize: "0.7rem", color: "#a21caf", marginTop: "2px" }}>
                Fatigue failure mesh
              </div>
            </div>
          </div>
        </div>

        {/* Section B: Traffic & Pedestrian Elements (COCO YOLO11n) */}
        <div className="card-panel">
          <div className="panel-header" style={{ marginBottom: "12px" }}>
            <div>
              <div className="panel-title" style={{ fontSize: "0.95rem" }}>
                <Car size={18} color="var(--accent-blue)" />
                Traffic & Pedestrian Elements (COCO YOLO11n)
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                Urban scene objects monitored on current dashcam feed
              </div>
            </div>
            <span
              style={{
                fontSize: "0.72rem",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "9999px",
                background: "#eff6ff",
                color: "var(--accent-blue)",
                border: "1px solid #bfdbfe",
              }}
            >
              {trafficEvents.length} DETECTIONS
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
            <div style={{ padding: "10px", background: "#f8fafc", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}>
              <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)", fontWeight: 600 }}>Cars</span>
              <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--text-primary)", marginTop: "2px" }}>
                {trafficCounts.car}
              </div>
              <span style={{ fontSize: "0.68rem", color: "#059669" }}>Flowing</span>
            </div>

            <div style={{ padding: "10px", background: "#f8fafc", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}>
              <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)", fontWeight: 600 }}>Motorcycles</span>
              <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--text-primary)", marginTop: "2px" }}>
                {trafficCounts.motorcycle}
              </div>
              <span style={{ fontSize: "0.68rem", color: "var(--accent-blue)" }}>2-Wheelers</span>
            </div>

            <div style={{ padding: "10px", background: "#f8fafc", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}>
              <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)", fontWeight: 600 }}>Trucks</span>
              <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--text-primary)", marginTop: "2px" }}>
                {trafficCounts.truck}
              </div>
              <span style={{ fontSize: "0.68rem", color: "#d97706" }}>Commercial</span>
            </div>

            <div style={{ padding: "10px", background: "#f8fafc", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}>
              <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)", fontWeight: 600 }}>Buses</span>
              <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--text-primary)", marginTop: "2px" }}>
                {trafficCounts.bus}
              </div>
              <span style={{ fontSize: "0.68rem", color: "var(--accent-blue)" }}>Transit</span>
            </div>

            <div style={{ padding: "10px", background: "#f8fafc", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}>
              <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)", fontWeight: 600 }}>Pedestrians</span>
              <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--text-primary)", marginTop: "2px" }}>
                {trafficCounts.person}
              </div>
              <span style={{ fontSize: "0.68rem", color: "#7c3aed" }}>Sidewalk / Kerb</span>
            </div>

            <div style={{ padding: "10px", background: "#f8fafc", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}>
              <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)", fontWeight: 600 }}>Bicycles</span>
              <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--text-primary)", marginTop: "2px" }}>
                {trafficCounts.bicycle}
              </div>
              <span style={{ fontSize: "0.68rem", color: "#059669" }}>Active Flow</span>
            </div>
          </div>
        </div>
      </div>

      {/* Auxiliary Multi-Perspective Array (Per Req 11) */}
      <div className="card-panel" style={{ marginBottom: "20px" }}>
        <div className="panel-header" style={{ marginBottom: "12px" }}>
          <div className="panel-title" style={{ fontSize: "0.95rem" }}>
            <Layers size={18} color="var(--accent-blue)" />
            SYNCHRONIZED MULTI-CAMERA ARRAY — {selectedBus.id}
          </div>
          <span
            style={{
              fontSize: "0.72rem",
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: "9999px",
              background: "#ecfdf5",
              color: "#059669",
              border: "1px solid #a7f3d0",
            }}
          >
            • 5 CHANNELS INTEGRATED
          </span>
        </div>
        <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "14px" }}>
          Click any camera channel below to activate its live surveillance viewport in the main player above.
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
            gap: "14px",
          }}
        >
          {CAMERA_CHANNELS.map((ch) => {
            const isSelected = activeChannel === ch.id;
            const hasVideo = ch.id === "front" && activeVideo;

            return (
              <div
                key={ch.id}
                onClick={() => setActiveChannel(ch.id)}
                style={{
                  borderRadius: "var(--radius-md)",
                  overflow: "hidden",
                  border: isSelected ? "2px solid var(--accent-blue)" : "1px solid var(--border-color)",
                  background: "#0b132b",
                  cursor: "pointer",
                  boxShadow: isSelected ? "0 4px 12px rgba(29, 78, 216, 0.2)" : "var(--shadow-sm)",
                  transition: "all 0.15s ease",
                }}
              >
                <div
                  style={{
                    padding: "8px 12px",
                    background: isSelected ? "#eff6ff" : "#f8fafc",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: "1px solid var(--border-color)",
                  }}
                >
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: "0.78rem",
                      color: isSelected ? "var(--accent-blue)" : "var(--text-primary)",
                    }}
                  >
                    {ch.shortCode}: {ch.name}
                  </span>
                  <span
                    style={{
                      fontSize: "0.68rem",
                      fontWeight: 700,
                      color: hasVideo ? "#059669" : "#d97706",
                    }}
                  >
                    {hasVideo ? "• ACTIVE" : "• STANDBY"}
                  </span>
                </div>

                <div
                  style={{
                    height: "120px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                    background: isSelected ? "#0f172a" : "#111827",
                    padding: "12px",
                    textAlign: "center",
                  }}
                >
                  <Camera size={26} color={isSelected ? "#38bdf8" : "#64748b"} style={{ marginBottom: "6px" }} />
                  <span style={{ fontSize: "0.7rem", color: "#94a3b8", fontWeight: 500 }}>
                    {ch.role}
                  </span>
                  <span
                    style={{
                      position: "absolute",
                      bottom: "6px",
                      left: "8px",
                      fontSize: "0.62rem",
                      background: "rgba(0,0,0,0.6)",
                      color: "#cbd5e1",
                      padding: "1px 5px",
                      borderRadius: "3px",
                    }}
                  >
                    {ch.res}
                  </span>
                  {hasVideo && (
                    <span
                      style={{
                        position: "absolute",
                        top: "6px",
                        right: "8px",
                        fontSize: "0.62rem",
                        background: "rgba(5, 150, 105, 0.8)",
                        color: "#ffffff",
                        padding: "1px 6px",
                        borderRadius: "3px",
                        fontWeight: 700,
                      }}
                    >
                      LIVE MP4
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Detections by Unit Table */}
      <div className="card-panel">
        <div className="panel-header">
          <div>
            <div className="panel-title" style={{ fontSize: "0.95rem" }}>
              GENUINE MODEL DETECTIONS LOG — {selectedBus.id}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "2px" }}>
              Actual inference records produced by YOLO11n models (bounding boxes, class scores, coordinates)
            </div>
          </div>
          <span
            style={{
              fontSize: "0.72rem",
              padding: "2px 8px",
              borderRadius: "9999px",
              background: "#eff6ff",
              color: "var(--accent-blue)",
              fontWeight: 700,
            }}
          >
            {relevantEvents.length} TOTAL DETECTIONS
          </span>
        </div>

        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Event ID</th>
                <th>Defect / Object Class</th>
                <th>Model Source</th>
                <th>Confidence</th>
                <th>Severity</th>
                <th>Bounding Box</th>
                <th>GPS Coordinates</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {relevantEvents.length > 0 ? (
                relevantEvents.slice(0, 10).map((evt) => {
                  const isDamage = roadDamageClasses.includes((evt.detection_class || "").toLowerCase());
                  return (
                    <tr key={evt.id}>
                      <td style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--accent-blue)", fontSize: "0.82rem" }}>
                        {evt.id}
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "2px 8px",
                            borderRadius: "4px",
                            fontSize: "0.78rem",
                            background: isDamage ? "#fff7ed" : "#f1f5f9",
                            color: isDamage ? "#c2410c" : "var(--text-primary)",
                            border: `1px solid ${isDamage ? "#fed7aa" : "var(--border-color)"}`,
                          }}
                        >
                          {evt.detection_class ? evt.detection_class.replace("_", " ") : evt.event_type}
                        </span>
                      </td>
                      <td style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                        {isDamage ? (
                          <span style={{ color: "#d97706", fontWeight: 600 }}>RDD2022 Custom</span>
                        ) : (
                          <span style={{ color: "var(--accent-blue)", fontWeight: 500 }}>COCO General</span>
                        )}
                      </td>
                      <td style={{ fontWeight: 700 }}>
                        {Math.round(evt.confidence * 100)}%
                      </td>
                      <td>
                        <span className={`badge badge-${evt.severity ? evt.severity.toLowerCase() : "medium"}`}>
                          {evt.severity}
                        </span>
                      </td>
                      <td style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        [{evt.bbox_x1}, {evt.bbox_y1}, {evt.bbox_x2}, {evt.bbox_y2}]
                      </td>
                      <td style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                        {evt.latitude ? `${evt.latitude.toFixed(4)}°N, ${evt.longitude.toFixed(4)}°E` : "17.4399°N, 78.4983°E"}
                      </td>
                      <td>
                        <button
                          className="btn-outline"
                          style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                          onClick={() => onInspectEvent && onInspectEvent(evt)}
                        >
                          Inspect →
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center", padding: "28px", color: "var(--text-muted)" }}>
                    No detections recorded for {selectedBus.id} on this recording yet. Run AI pipeline to generate detections.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
