import React, { useState, useEffect } from "react";
import { apiFetch } from "../api/client";
import {
  Layers,
  MapPin,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Search,
  Navigation,
  ArrowRight,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

export default function RouteIntelligenceTab({ routes, events, onSelectRoute }) {
  const [chunks, setChunks] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCorridor, setSelectedCorridor] = useState("ALL");
  const [selectedChunk, setSelectedChunk] = useState(null);

  useEffect(() => {
    apiFetch("/api/routes/chunks")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setChunks(data))
      .catch((err) => console.error("Error fetching route chunks:", err));
  }, []);

  const filteredChunks = chunks.filter((c) => {
    const matchesCorridor = selectedCorridor === "ALL" || c.corridor_id === selectedCorridor;
    const matchesSearch =
      c.chunk_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.corridor_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCorridor && matchesSearch;
  });

  const totalNetworkKm = routes ? routes.length * 110 : 640;
  const avgPci = chunks.length > 0
    ? (chunks.reduce((acc, c) => acc + c.pci_health_score, 0) / chunks.length).toFixed(1)
    : "78.4";
  const criticalChunksCount = chunks.filter((c) => c.status === "Critical").length;

  return (
    <div className="page-body">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "2px 8px", borderRadius: "4px", background: "#eff6ff", color: "var(--accent-blue)", border: "1px solid #bfdbfe", textTransform: "uppercase" }}>
              GIS Spatial Intelligence
            </span>
            <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "2px 8px", borderRadius: "4px", background: "#ecfdf5", color: "#059669", border: "1px solid #a7f3d0", textTransform: "uppercase" }}>
              500m Road Chunking
            </span>
          </div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
            Route Intelligence & Highway Chainage
          </h2>
          <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "2px" }}>
            Converting continuous transit corridors into ~500m location-aware persistent monitoring chunks • Pavement Condition Index (PCI)
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <select
            value={selectedCorridor}
            onChange={(e) => setSelectedCorridor(e.target.value)}
            style={{ padding: "6px 12px", fontSize: "0.84rem", fontWeight: 500 }}
          >
            <option value="ALL">All Corridors (6 active)</option>
            {routes && routes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.id} — {r.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px", marginBottom: "20px" }}>
        <div className="stat-card">
          <div className="stat-title">MONITORED TRANSIT NETWORK</div>
          <div className="stat-value">{totalNetworkKm} km</div>
          <div className="stat-meta">6 major Telangana corridors</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">AVERAGE PCI HEALTH</div>
          <div className="stat-value" style={{ color: "#059669" }}>{avgPci}%</div>
          <div className="stat-meta">Pavement Condition Index</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">ACTIVE 500M CHUNKS</div>
          <div className="stat-value">{chunks.length > 0 ? chunks.length : 24}</div>
          <div className="stat-meta">Persistent spatial segments</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">CRITICAL REPAIR SEGMENTS</div>
          <div className="stat-value" style={{ color: "var(--accent-red)" }}>{criticalChunksCount}</div>
          <div className="stat-meta">Immediate municipal patching</div>
        </div>
      </div>

      {/* Linear Highway Chainage Strip - Reference Page 6 & 7 */}
      <div className="card-panel" style={{ marginBottom: "20px" }}>
        <div className="panel-header" style={{ marginBottom: "10px" }}>
          <div className="panel-title" style={{ fontSize: "0.92rem" }}>
            LINEAR HIGHWAY CHAINAGE STRIP — All Corridors ({chunks.length} Chunks)
          </div>
          <div style={{ display: "flex", gap: "12px", fontSize: "0.75rem", alignItems: "center" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#059669" }}></span> Good (≥75)
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#d97706" }}></span> Fair (50–74)
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#dc2626" }}></span> Critical (&lt;50)
            </span>
          </div>
        </div>
        <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: "12px" }}>
          Click any 500m segment below to inspect road defects, Pavement Condition Index, and transit pass history.
        </div>

        {/* Chainage Segments Ribbon */}
        <div style={{ display: "flex", gap: "4px", overflowX: "auto", paddingBottom: "10px" }}>
          {chunks.map((chk) => {
            const isCritical = chk.status === "Critical";
            const isFair = chk.status === "Fair";
            const bg = isCritical ? "#dc2626" : isFair ? "#d97706" : "#059669";
            const isSelected = selectedChunk?.chunk_id === chk.chunk_id;
            return (
              <div
                key={chk.chunk_id}
                onClick={() => setSelectedChunk(chk)}
                title={`${chk.chunk_id} (${chk.chainage_start_km}km - ${chk.chainage_end_km}km) • PCI: ${chk.pci_health_score}%`}
                style={{
                  minWidth: "62px",
                  padding: "6px 4px",
                  borderRadius: "4px",
                  background: bg,
                  color: "#ffffff",
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  textAlign: "center",
                  cursor: "pointer",
                  border: isSelected ? "2px solid #000" : "none",
                  transform: isSelected ? "scale(1.05)" : "none",
                  transition: "all 0.15s ease",
                  flexShrink: 0,
                }}
              >
                <div>{chk.chainage_start_km}k</div>
                <div style={{ fontSize: "0.6rem", opacity: 0.9 }}>{chk.defect_count}d</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Hotspot Chunks & Selected Chunk Inspector */}
      <div style={{ display: "grid", gridTemplateColumns: selectedChunk ? "1.2fr 0.8fr" : "1fr", gap: "20px" }}>
        {/* Hotspot Chunks List */}
        <div className="card-panel">
          <div className="panel-header" style={{ marginBottom: "14px" }}>
            <div className="panel-title" style={{ fontSize: "0.95rem" }}>
              500M CHUNKS DEFECT HOTSPOTS ({filteredChunks.length})
            </div>
            <div style={{ position: "relative", width: "220px" }}>
              <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input
                type="text"
                placeholder="Search chunk ID, corridor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ padding: "6px 10px 6px 30px", fontSize: "0.8rem", width: "100%" }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "12px" }}>
            {filteredChunks.map((c) => {
              const isCrit = c.status === "Critical";
              const isFair = c.status === "Fair";
              return (
                <div
                  key={c.chunk_id}
                  onClick={() => setSelectedChunk(c)}
                  style={{
                    padding: "12px",
                    borderRadius: "var(--radius-md)",
                    border: `1.5px solid ${selectedChunk?.chunk_id === c.chunk_id ? "var(--accent-blue)" : "var(--border-color)"}`,
                    background: selectedChunk?.chunk_id === c.chunk_id ? "#eff6ff" : "#ffffff",
                    cursor: "pointer",
                    boxShadow: "var(--shadow-sm)",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <div style={{ fontWeight: 800, fontSize: "0.88rem", color: "var(--text-primary)" }}>
                      📍 {c.chunk_id}
                    </div>
                    <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 6px", borderRadius: "4px", background: isCrit ? "#fee2e2" : isFair ? "#fef3c7" : "#ecfdf5", color: isCrit ? "#dc2626" : isFair ? "#d97706" : "#059669" }}>
                      PCI {c.pci_health_score}%
                    </span>
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: "8px" }}>
                    {c.corridor_name} ({c.chainage_start_km}km – {c.chainage_end_km}km)
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "var(--text-muted)" }}>
                    <span>Potholes: <strong style={{ color: "var(--accent-red)" }}>{c.pothole_count}</strong></span>
                    <span>Cracks: <strong style={{ color: "var(--accent-orange)" }}>{c.crack_count}</strong></span>
                    <span style={{ color: "var(--accent-blue)", fontWeight: 600 }}>Inspect →</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Chunk Inspector */}
        {selectedChunk && (
          <div className="card-panel">
            <div className="panel-header" style={{ marginBottom: "12px" }}>
              <div className="panel-title" style={{ fontSize: "0.95rem" }}>
                CHUNK INSPECTOR: <span style={{ fontFamily: "monospace", color: "var(--accent-blue)" }}>{selectedChunk.chunk_id}</span>
              </div>
              <button
                className="btn-outline"
                style={{ padding: "2px 8px", fontSize: "0.72rem" }}
                onClick={() => setSelectedChunk(null)}
              >
                Close
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "0.84rem" }}>
              <div style={{ padding: "10px", background: "#f8fafc", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}>
                <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>{selectedChunk.corridor_name}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                  Segment Chainage: {selectedChunk.chainage_start_km} km to {selectedChunk.chainage_end_km} km (500m length)
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "6px" }}>
                <span style={{ color: "var(--text-secondary)" }}>Pavement Condition Index (PCI)</span>
                <span style={{ fontWeight: 800, color: selectedChunk.status === "Critical" ? "#dc2626" : "#059669" }}>
                  {selectedChunk.pci_health_score}% ({selectedChunk.status})
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "6px" }}>
                <span style={{ color: "var(--text-secondary)" }}>Total Logged Defects</span>
                <span style={{ fontWeight: 700 }}>{selectedChunk.defect_count} issues</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "6px" }}>
                <span style={{ color: "var(--text-secondary)" }}>Centroid Coordinates</span>
                <span style={{ fontWeight: 600, fontFamily: "monospace", color: "var(--accent-blue)" }}>
                  {selectedChunk.coordinates[0].toFixed(4)}°N, {selectedChunk.coordinates[1].toFixed(4)}°E
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "6px" }}>
                <span style={{ color: "var(--text-secondary)" }}>Municipal Action Required</span>
                <span style={{ fontWeight: 700, color: selectedChunk.status === "Critical" ? "#dc2626" : "#059669" }}>
                  {selectedChunk.status === "Critical" ? "Emergency Patching Order" : "Routine Preventive Sweep"}
                </span>
              </div>

              <div style={{ marginTop: "10px" }}>
                <button
                  className="btn-primary"
                  style={{ width: "100%", justifyContent: "center" }}
                  onClick={() => alert(`Municipal work order dispatched for chunk ${selectedChunk.chunk_id}`)}
                >
                  Dispatch Maintenance Squad to Chunk
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

