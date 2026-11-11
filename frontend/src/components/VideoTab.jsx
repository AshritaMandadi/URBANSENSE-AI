import React, { useState, useMemo } from "react";
import { apiUrl } from "../api/client";
import { BUILTIN_DEMO_RECORDINGS } from "./CameraCenterTab";
import {
  Upload,
  Play,
  Film,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  FileText,
  Eye,
  Check,
  Radio,
  Layers,
} from "lucide-react";

export default function VideoTab({ videos, buses, onUpload, onProcess, processingState, health }) {
  const allVideos = useMemo(() => {
    const list = [...BUILTIN_DEMO_RECORDINGS];
    const seenIds = new Set(list.map((v) => v.id));
    for (const v of (videos || [])) {
      if (!seenIds.has(v.id)) {
        list.push(v);
        seenIds.add(v.id);
      }
    }
    return list;
  }, [videos]);

  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedBus, setSelectedBus] = useState("BUS-TG-101");
  const [uploading, setUploading] = useState(false);
  const [activeVideoId, setActiveVideoId] = useState(allVideos && allVideos.length > 0 ? allVideos[0].id : null);
  const [playerMode, setPlayerMode] = useState("original"); // "original" or "annotated"
  const [detectorTypes, setDetectorTypes] = useState({});

  const isRoadDamageReady = health?.road_damage_model?.status === "READY";

  // Find currently active video object
  const activeVideo = allVideos ? allVideos.find((v) => v.id === activeVideoId) : null;

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploading(true);
    try {
      await onUpload(selectedFile, selectedBus);
      setSelectedFile(null);
      // Auto-select latest video if available
      if (videos && videos.length > 0) {
        setActiveVideoId(videos[0].id);
        setPlayerMode("original");
      }
    } finally {
      setUploading(false);
    }
  };

  const selectVideo = (vid) => {
    setActiveVideoId(vid.id);
    if (vid.has_annotated) {
      setPlayerMode("annotated");
    } else {
      setPlayerMode("original");
    }
  };

  return (
    <div className="page-body">
      {/* Upload Box */}
      <div className="card-panel">
        <div className="panel-header">
          <div className="panel-title">
            <Upload size={20} color="var(--accent-blue)" />
            Ingest Recorded Public Transit Video
          </div>
        </div>

        <form onSubmit={handleUploadSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div className="dropzone" onClick={() => document.getElementById("video-file-input").click()}>
            <input
              id="video-file-input"
              type="file"
              accept=".mp4,.mov,.avi,.mkv"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
            <Film size={36} color="var(--accent-blue)" style={{ marginBottom: "12px" }} />
            {selectedFile ? (
              <div>
                <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{selectedFile.name}</div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to upload
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                  Click or drag road recording video file here
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                  Supported formats: MP4, MOV, AVI, MKV (Streaming frame processing ensures low RAM)
                </div>
              </div>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "0.88rem", color: "var(--text-secondary)", fontWeight: 500 }}>
                Assign Bus Fleet ID:
              </span>
              <select
                value={selectedBus}
                onChange={(e) => setSelectedBus(e.target.value)}
                style={{
                  padding: "6px 12px",
                  fontSize: "0.88rem",
                  fontWeight: 500,
                }}
              >
                {buses && buses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.id} ({b.license_plate})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={!selectedFile || uploading}
              style={{ opacity: !selectedFile || uploading ? 0.6 : 1 }}
            >
              {uploading ? (
                <>
                  <RefreshCw size={14} className="spin-animation" /> Uploading & Probing...
                </>
              ) : (
                <>
                  <Upload size={14} /> Upload Road Video
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Road Damage Model Readiness Banner */}
      <div
        style={{
          padding: "14px 18px",
          borderRadius: "var(--radius-md)",
          background: isRoadDamageReady ? "#ecfdf5" : "#fffbeb",
          border: `1px solid ${isRoadDamageReady ? "#a7f3d0" : "#fde68a"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
          fontSize: "0.85rem",
          color: isRoadDamageReady ? "#047857" : "#b45309",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {isRoadDamageReady ? <CheckCircle2 size={18} color="#059669" /> : <AlertCircle size={18} color="#d97706" />}
          <div>
            <strong>Road Damage Detection AI: {isRoadDamageReady ? "READY" : "NOT READY (Awaiting Model Weights)"}</strong>
            <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "2px" }}>
              {isRoadDamageReady
                ? "Custom YOLO11n weights active (models/road_damage/best.pt). 4 distress classes: potholes (D40), alligator (D20), longitudinal (D00), transverse (D10)."
                : "Weights missing. Copy 'best.pt' to models/road_damage/best.pt. General Scene Detection (COCO) is active."}
            </div>
          </div>
        </div>
        <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
          Target: <code>models/road_damage/best.pt</code>
        </div>
      </div>

      {/* Videos List and Player Section */}
      <div style={{ display: "grid", gridTemplateColumns: activeVideo ? "1.1fr 0.9fr" : "1fr", gap: "24px" }}>
        {/* Videos Table */}
        <div className="card-panel">
          <div className="panel-header">
            <div className="panel-title">
              <Film size={20} color="var(--accent-blue)" />
              Uploaded Video Archives ({videos ? videos.length : 0})
            </div>
          </div>

          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Video ID</th>
                  <th>Filename</th>
                  <th>Duration / FPS</th>
                  <th>Assigned Bus</th>
                  <th>Job Status</th>
                  <th>AI Model</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {videos && videos.length > 0 ? (
                  videos.map((vid) => {
                    const isProcessing = processingState[vid.id] === "PROCESSING";
                    const selectedType = detectorTypes[vid.id] || "road_damage";
                    const isModelUnavailable = selectedType === "road_damage" && !isRoadDamageReady;
                    const isSelected = activeVideoId === vid.id;

                    return (
                      <tr
                        key={vid.id}
                        style={{
                          backgroundColor: isSelected ? "var(--accent-blue-light)" : "transparent",
                          cursor: "pointer",
                        }}
                        onClick={() => selectVideo(vid)}
                      >
                        <td style={{ fontFamily: "monospace", fontSize: "0.82rem", color: "var(--accent-blue)", fontWeight: 600 }}>
                          {vid.id}
                        </td>
                        <td style={{ fontWeight: 600, maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={vid.filename}>
                          {vid.filename}
                        </td>
                        <td style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                          {vid.duration_seconds ? `${vid.duration_seconds.toFixed(1)}s` : "N/A"} • {vid.fps || 25} FPS
                        </td>
                        <td style={{ fontWeight: 500 }}>{vid.bus_id || "Unassigned"}</td>
                        <td>
                          {vid.latest_job_status === "COMPLETED" ? (
                            <span className="badge badge-low">
                              COMPLETED ({vid.events_count || 0})
                            </span>
                          ) : vid.latest_job_status === "PROCESSING" || isProcessing ? (
                            <span className="badge badge-medium">
                              <RefreshCw size={10} className="spin-animation" style={{ marginRight: "4px" }} />
                              PROCESSING
                            </span>
                          ) : vid.latest_job_status === "FAILED" ? (
                            <span className="badge badge-critical">FAILED</span>
                          ) : (
                            <span className="badge badge-info">UNPROCESSED</span>
                          )}
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <select
                            value={selectedType}
                            onChange={(e) => setDetectorTypes({ ...detectorTypes, [vid.id]: e.target.value })}
                            style={{
                              padding: "4px 8px",
                              fontSize: "0.78rem",
                            }}
                          >
                            <option value="combined">Combined AI (RDD2022 + COCO Traffic)</option>
                            <option value="road_damage">Road Damage (4 Classes)</option>
                            <option value="general">General Scene (COCO)</option>
                          </select>
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button
                              className="btn-primary"
                              style={{
                                padding: "5px 10px",
                                fontSize: "0.78rem",
                                opacity: isModelUnavailable ? 0.5 : 1,
                                cursor: isModelUnavailable ? "not-allowed" : "pointer",
                              }}
                              disabled={isProcessing || isModelUnavailable}
                              onClick={() => onProcess(vid.id, selectedType)}
                              title={
                                isModelUnavailable
                                  ? "Road damage weights missing. Switch to General Scene or place best.pt."
                                  : "Run YOLO detection"
                              }
                            >
                              {isProcessing ? (
                                <>
                                  <RefreshCw size={11} className="spin-animation" /> Running...
                                </>
                              ) : (
                                <>
                                  <Play size={11} /> {vid.latest_job_status === "COMPLETED" ? "Re-run" : "Run AI"}
                                </>
                              )}
                            </button>

                            <button
                              className="btn-outline"
                              style={{ padding: "5px 10px", fontSize: "0.78rem" }}
                              onClick={() => selectVideo(vid)}
                            >
                              <Eye size={12} /> View
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="7" style={{ textAlign: "center", padding: "28px", color: "var(--text-muted)" }}>
                      No road videos uploaded yet. Use the upload box above to ingest a road recording.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Dual-View Video Player & Inspector */}
        {activeVideo ? (
          <div className="card-panel" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div className="panel-header" style={{ marginBottom: "8px" }}>
              <div>
                <div className="panel-title" style={{ fontSize: "1.05rem" }}>
                  Video Inspection: <span style={{ color: "var(--accent-blue)", fontFamily: "monospace" }}>{activeVideo.id}</span>
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                  {activeVideo.filename} • {activeVideo.bus_id || "Fleet Bus"}
                </div>
              </div>
              <button
                className="btn-outline"
                style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                onClick={() => setActiveVideoId(null)}
              >
                Close
              </button>
            </div>

            {/* Dual Player Toggle Tabs */}
            <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid var(--border-color)", paddingBottom: "10px" }}>
              <button
                className={`btn-outline ${playerMode === "original" ? "btn-primary" : ""}`}
                style={{ fontSize: "0.82rem", padding: "6px 14px" }}
                onClick={() => setPlayerMode("original")}
              >
                <Film size={14} /> Original Video
              </button>
              <button
                className={`btn-outline ${playerMode === "annotated" ? "btn-primary" : ""}`}
                style={{
                  fontSize: "0.82rem",
                  padding: "6px 14px",
                  opacity: activeVideo.has_annotated ? 1 : 0.7,
                }}
                onClick={() => setPlayerMode("annotated")}
              >
                <Play size={14} /> Annotated Output (AI)
                {activeVideo.has_annotated && (
                  <span style={{ marginLeft: "4px", fontSize: "0.72rem", background: "#059669", color: "#fff", padding: "1px 5px", borderRadius: "10px" }}>
                    Ready
                  </span>
                )}
              </button>
            </div>

            {/* Video Player Display */}
            {playerMode === "original" ? (
              <div>
                <div style={{ background: "#000", borderRadius: "var(--radius-md)", overflow: "hidden", minHeight: "260px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <video
                    key={`original-${activeVideo.id}`}
                    controls
                    playsInline
                    preload="auto"
                    style={{ width: "100%", maxHeight: "360px", display: "block" }}
                    src={activeVideo.demo_media_url || apiUrl(`/api/videos/${activeVideo.id}/stream`)}
                  >
                    Your browser does not support HTML5 video playback.
                  </video>
                </div>
                <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: "10px", display: "flex", justifyContent: "space-between" }}>
                  <span>Source: <code>{activeVideo.demo_media_url || apiUrl(`/api/videos/${activeVideo.id}/stream`)}</code></span>
                  <span>{activeVideo.demo_media_url ? "Vercel Edge CDN Streaming" : "HTTP 206 Byte-Range Streaming"}</span>
                </div>
              </div>
            ) : (
              <div>
                {activeVideo.has_annotated ? (
                  <div>
                    <div style={{ background: "#000", borderRadius: "var(--radius-md)", overflow: "hidden", minHeight: "260px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <video
                        key={`annotated-${activeVideo.id}`}
                        controls
                        playsInline
                        preload="auto"
                        style={{ width: "100%", maxHeight: "360px", display: "block" }}
                        src={activeVideo.annotated_demo_url || (activeVideo.has_annotated ? apiUrl(`/api/videos/${activeVideo.id}/annotated`) : activeVideo.demo_media_url || apiUrl(`/api/videos/${activeVideo.id}/stream`))}
                      >
                        Your browser does not support HTML5 video playback.
                      </video>
                    </div>

                    <div style={{ marginTop: "12px", padding: "12px 14px", background: activeVideo.events_count > 0 ? "#eff6ff" : "#ecfdf5", borderRadius: "var(--radius-sm)", border: `1px solid ${activeVideo.events_count > 0 ? "#bfdbfe" : "#a7f3d0"}` }}>
                      <div style={{ fontWeight: 700, fontSize: "0.88rem", color: activeVideo.events_count > 0 ? "var(--accent-blue)" : "#047857" }}>
                        {activeVideo.events_count > 0
                          ? `⚠️ AI Detection: ${activeVideo.events_count} Road Surface Distress Events Detected`
                          : "✅ AI Detection: Clean Road Surface (0 Hazards Detected)"}
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                        Bounding boxes and class labels rendered with H.264 video codec. Events are synced to the GIS telemetry map.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      padding: "36px 20px",
                      textAlign: "center",
                      background: "#f8fafc",
                      borderRadius: "var(--radius-md)",
                      border: "1px dashed var(--border-color)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    <AlertCircle size={36} color="var(--accent-orange)" />
                    <div>
                      <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                        AI Annotation Pending
                      </div>
                      <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: "4px", maxWidth: "320px" }}>
                        This video has not yet been processed with YOLO road damage detection.
                      </div>
                    </div>
                    <button
                      className="btn-primary"
                      disabled={processingState[activeVideo.id] === "PROCESSING"}
                      onClick={() => onProcess(activeVideo.id, detectorTypes[activeVideo.id] || "road_damage")}
                    >
                      <Play size={14} /> Run Road Damage Detection Now
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Video Metadata Card */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "0.82rem", borderTop: "1px solid var(--border-color)", paddingTop: "12px" }}>
              <div>
                <span style={{ color: "var(--text-secondary)" }}>File Size:</span>
                <div style={{ fontWeight: 600 }}>{(activeVideo.file_size_bytes / (1024 * 1024)).toFixed(2)} MB</div>
              </div>
              <div>
                <span style={{ color: "var(--text-secondary)" }}>Duration & FPS:</span>
                <div style={{ fontWeight: 600 }}>
                  {activeVideo.duration_seconds ? `${activeVideo.duration_seconds.toFixed(1)}s` : "N/A"} ({activeVideo.fps || 25} FPS)
                </div>
              </div>
              <div>
                <span style={{ color: "var(--text-secondary)" }}>Total Frames:</span>
                <div style={{ fontWeight: 600 }}>{activeVideo.frame_count || "N/A"} frames</div>
              </div>
              <div>
                <span style={{ color: "var(--text-secondary)" }}>Assigned Bus:</span>
                <div style={{ fontWeight: 600 }}>{activeVideo.bus_id || "Unassigned"}</div>
              </div>
            </div>
          </div>
        ) : (
          <div
            className="card-panel"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "300px",
              color: "var(--text-muted)",
              textAlign: "center",
            }}
          >
            <Film size={40} style={{ marginBottom: "12px", opacity: 0.5 }} />
            <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>No Video Selected</div>
            <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: "4px" }}>
              Select a video from the archive table on the left to preview or inspect AI detections.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
