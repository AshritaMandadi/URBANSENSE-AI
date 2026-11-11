import React, { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import L from "leaflet";
import { Bus, AlertTriangle, Layers, Navigation, RefreshCw, ExternalLink } from "lucide-react";

export default function MapTab({ buses, events, onSimulateTick, onSelectEvent }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [filterType, setFilterType] = useState("ALL");

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Initialize Leaflet Map centered on Telangana (Hyderabad & regional transit corridors)
      const map = L.map(mapContainerRef.current).setView([17.3850, 78.4867], 9);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
      }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    const markersLayer = markersLayerRef.current;
    markersLayer.clearLayers();

    // 1. Plot Transit Buses
    if (buses && buses.length > 0) {
      buses.forEach((bus) => {
        const lat = bus.latest_gps?.latitude || 17.3850;
        const lon = bus.latest_gps?.longitude || 78.4867;

        // Custom HTML marker for Bus
        const busIcon = L.divIcon({
          className: "custom-bus-marker",
          html: `
            <div style="
              background-color: #1d4ed8;
              color: white;
              border: 2px solid white;
              border-radius: 50%;
              width: 32px;
              height: 32px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: bold;
              box-shadow: 0 2px 8px rgba(29, 78, 216, 0.4);
            ">
              🚌
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const marker = L.marker([lat, lon], { icon: busIcon }).addTo(markersLayer);
        marker.on("click", () => {
          setSelectedItem({
            type: "BUS",
            data: bus,
            lat,
            lon,
          });
        });

        marker.bindTooltip(`<b>${bus.id}</b> (${bus.route_id || "Fleet Route"})<br/><span style="color:#f59e0b;">[Simulated GPS]</span>`);
      });
    }

    // 2. Plot Detected Urban Events
    if (events && events.length > 0) {
      const filteredEvents = filterType === "ALL" 
        ? events 
        : events.filter(e => e.event_type === filterType);

      filteredEvents.forEach((evt) => {
        let color = "#38bdf8"; // Default blue
        let iconSymbol = "⚠️";

        if (evt.event_type === "POTHOLE") {
          color = "#ef4444"; // Red for potholes
          iconSymbol = "🕳️";
        } else if (evt.event_type === "ROAD_CRACK") {
          color = "#f59e0b"; // Orange for cracks
          iconSymbol = "⚡";
        } else if (evt.event_type === "ROAD_DAMAGE") {
          color = "#eab308";
          iconSymbol = "🚧";
        } else if (evt.event_type === "VEHICLE_DETECTION") {
          color = "#10b981";
          iconSymbol = "🚗";
        }

        const circle = L.circleMarker([evt.latitude, evt.longitude], {
          radius: evt.severity === "CRITICAL" ? 10 : 8,
          fillColor: color,
          color: "#fff",
          weight: 2,
          opacity: 1,
          fillOpacity: 0.85,
        }).addTo(markersLayer);

        circle.on("click", () => {
          setSelectedItem({
            type: "EVENT",
            data: evt,
            lat: evt.latitude,
            lon: evt.longitude,
          });
        });

        circle.bindTooltip(`
          <b>${evt.event_type.replace("_", " ")}</b> (${evt.detection_class})<br/>
          Severity: <b style="color:${color}">${evt.severity}</b> | Conf: ${(evt.confidence * 100).toFixed(0)}%
        `);
      });
    }
  }, [buses, events, filterType]);

  return (
    <div className="page-body">
      {/* Map Control Bar */}
      <div className="card-panel" style={{ padding: "14px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--text-secondary)" }}>
              Filter Layer:
            </span>
            <div style={{ display: "flex", gap: "6px" }}>
              {["ALL", "POTHOLE", "ROAD_CRACK", "ROAD_DAMAGE", "VEHICLE_DETECTION"].map((f) => (
                <button
                  key={f}
                  className={`btn-outline ${filterType === f ? "btn-primary" : ""}`}
                  style={{ fontSize: "0.8rem", padding: "6px 12px" }}
                  onClick={() => setFilterType(f)}
                >
                  {f.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div className="sim-indicator">
              <span>●</span> Clearly Labeled Simulated GPS Traces (Telangana Network)
            </div>
            <button className="btn-primary" onClick={() => onSimulateTick("BUS-TG-101")}>
              <RefreshCw size={14} /> Simulate Bus Movement Tick
            </button>
          </div>
        </div>
      </div>

      {/* Map & Detail Split View */}
      <div style={{ display: "grid", gridTemplateColumns: selectedItem ? "1fr 340px" : "1fr", gap: "20px" }}>
        {/* Leaflet Map Box */}
        <div className="map-container" ref={mapContainerRef}></div>

        {/* Selected Marker Detail Card */}
        {selectedItem && (
          <div className="card-panel" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div className="panel-header" style={{ marginBottom: "8px" }}>
              <div className="panel-title" style={{ fontSize: "1rem" }}>
                {selectedItem.type === "BUS" ? "Transit Bus Telemetry" : "Detected Urban Event"}
              </div>
              <button
                className="btn-outline"
                style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                onClick={() => setSelectedItem(null)}
              >
                Close
              </button>
            </div>

            {selectedItem.type === "BUS" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "0.85rem" }}>
                <div style={{ padding: "12px", background: "var(--accent-blue-light)", borderRadius: "var(--radius-md)", border: "1px solid #bfdbfe" }}>
                  <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--accent-blue)" }}>
                    {selectedItem.data.id}
                  </div>
                  <div style={{ color: "var(--text-secondary)" }}>
                    {selectedItem.data.model}
                  </div>
                </div>

                <div>
                  <span style={{ color: "var(--text-secondary)" }}>Assigned Route:</span>
                  <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{selectedItem.data.route_id || "Unassigned"}</div>
                </div>

                <div>
                  <span style={{ color: "var(--text-secondary)" }}>License Plate:</span>
                  <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{selectedItem.data.license_plate}</div>
                </div>

                <div>
                  <span style={{ color: "var(--text-secondary)" }}>Current Speed:</span>
                  <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{selectedItem.data.latest_gps?.speed_kmh || 0} km/h</div>
                </div>

                <div>
                  <span style={{ color: "var(--text-secondary)" }}>Coordinates:</span>
                  <div style={{ fontFamily: "monospace", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                    {selectedItem.lat.toFixed(5)}, {selectedItem.lon.toFixed(5)}
                  </div>
                </div>

                <div className="sim-indicator" style={{ justifyContent: "center" }}>
                  Verified Simulated Telemetry
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "0.85rem" }}>
                <div style={{ padding: "12px", background: "#fef2f2", borderRadius: "var(--radius-md)", border: "1px solid #fecaca" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 700, fontSize: "1.05rem", color: "var(--text-primary)" }}>
                      {selectedItem.data.event_type.replace("_", " ")}
                    </span>
                    <span className={`badge badge-${selectedItem.data.severity.toLowerCase()}`}>
                      {selectedItem.data.severity}
                    </span>
                  </div>
                  <div style={{ color: "var(--text-secondary)", fontSize: "0.8rem", marginTop: "4px" }}>
                    Class: {selectedItem.data.detection_class}
                  </div>
                </div>

                <div>
                  <span style={{ color: "var(--text-secondary)" }}>Event ID:</span>
                  <div style={{ fontFamily: "monospace", color: "var(--accent-blue)" }}>
                    {selectedItem.data.id}
                  </div>
                </div>

                <div>
                  <span style={{ color: "var(--text-secondary)" }}>Detection Confidence:</span>
                  <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>
                    {(selectedItem.data.confidence * 100).toFixed(1)}%
                  </div>
                </div>

                <div>
                  <span style={{ color: "var(--text-secondary)" }}>Reporting Transit Vehicle:</span>
                  <div style={{ fontWeight: 600 }}>{selectedItem.data.bus_id || "Recorded Route Camera"}</div>
                </div>

                <div>
                  <span style={{ color: "var(--text-secondary)" }}>Location Coordinates:</span>
                  <div style={{ fontFamily: "monospace", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    {selectedItem.lat.toFixed(5)}, {selectedItem.lon.toFixed(5)}
                  </div>
                </div>

                <div>
                  <span style={{ color: "var(--text-secondary)" }}>Video Source:</span>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    {selectedItem.data.video_source || "Direct Stream"}
                  </div>
                </div>

                {selectedItem.data.is_simulated && (
                  <div className="sim-indicator" style={{ justifyContent: "center", marginTop: "4px" }}>
                    Simulated GPS Coordinates
                  </div>
                )}

                <button
                  className="btn-primary"
                  style={{ marginTop: "8px", justifyContent: "center", fontSize: "0.82rem" }}
                  onClick={() => onSelectEvent && onSelectEvent(selectedItem.data)}
                >
                  <ExternalLink size={13} /> Open Full Event Inspector
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

