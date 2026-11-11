import React, { useState } from "react";
import { motion } from "motion/react";
import { Activity, Filter, Search, MapPin, Bus, AlertCircle, Eye, Check } from "lucide-react";

export default function EventsTab({ events, buses, onSelectEvent, onUpdateStatus }) {
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [damageClassFilter, setDamageClassFilter] = useState("ALL");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [busFilter, setBusFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredEvents = (events || []).filter((evt) => {
    if (typeFilter !== "ALL" && evt.event_type !== typeFilter) return false;
    if (damageClassFilter !== "ALL") {
      const cls = (evt.detection_class || "").toLowerCase();
      if (damageClassFilter === "POTHOLE" && cls !== "pothole") return false;
      if (damageClassFilter === "LONGITUDINAL_CRACK" && cls !== "longitudinal_crack") return false;
      if (damageClassFilter === "TRANSVERSE_CRACK" && cls !== "transverse_crack") return false;
      if (damageClassFilter === "ALLIGATOR_CRACK" && cls !== "alligator_crack") return false;
    }
    if (severityFilter !== "ALL" && evt.severity !== severityFilter) return false;
    if (busFilter !== "ALL" && evt.bus_id !== busFilter) return false;
    if (statusFilter !== "ALL" && evt.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchId = evt.id.toLowerCase().includes(q);
      const matchClass = evt.detection_class.toLowerCase().includes(q);
      if (!matchId && !matchClass) return false;
    }
    return true;
  });

  return (
    <motion.div
      className="page-body"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
    >
      {/* Filters Bar */}
      <div className="card-panel" style={{ padding: "18px 24px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center" }}>
            {/* Search Input */}
            <div style={{ position: "relative", minWidth: "220px" }}>
              <Search size={16} color="var(--text-muted)" style={{ position: "absolute", left: "10px", top: "10px" }} />
              <input
                type="text"
                placeholder="Search event ID or class..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px 8px 32px",
                  fontSize: "0.85rem",
                }}
              />
            </div>

            {/* Event Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="ALL">All Event Types</option>
              <option value="POTHOLE">Pothole</option>
              <option value="ROAD_CRACK">Road Crack</option>
              <option value="ROAD_DAMAGE">Road Damage</option>
              <option value="VEHICLE_DETECTION">Vehicle Detection</option>
              <option value="PEDESTRIAN_DETECTION">Pedestrian Detection</option>
              <option value="TRAFFIC_OBSERVATION">Traffic Observation</option>
            </select>

            {/* Road Damage Class Filter */}
            <select
              value={damageClassFilter}
              onChange={(e) => setDamageClassFilter(e.target.value)}
            >
              <option value="ALL">All Damage Classes</option>
              <option value="POTHOLE">Pothole (D40)</option>
              <option value="LONGITUDINAL_CRACK">Longitudinal Crack (D00)</option>
              <option value="TRANSVERSE_CRACK">Transverse Crack (D10)</option>
              <option value="ALLIGATOR_CRACK">Alligator Crack (D20)</option>
            </select>

            {/* Severity Filter */}
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
              <option value="INFO">Info</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Review Statuses</option>
              <option value="NEW">New</option>
              <option value="ACKNOWLEDGED">Acknowledged</option>
              <option value="VERIFIED">Verified</option>
              <option value="RESOLVED">Resolved</option>
            </select>

            {/* Bus Filter */}
            <select
              value={busFilter}
              onChange={(e) => setBusFilter(e.target.value)}
            >
              <option value="ALL">All Transit Buses</option>
              {buses && buses.map((b) => (
                <option key={b.id} value={b.id}>{b.id}</option>
              ))}
            </select>
          </div>

          <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
            Showing <b>{filteredEvents.length}</b> of {events ? events.length : 0} events
          </div>
        </div>
      </div>

      {/* Events Table */}
      <div className="card-panel">
        <div className="panel-header">
          <div className="panel-title">
            <Activity size={20} color="var(--accent-blue)" />
            Urban Sensing Event Stream
          </div>
        </div>

        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Event ID</th>
                <th>Event Type & Class</th>
                <th>Severity</th>
                <th>Confidence</th>
                <th>Bus ID</th>
                <th>Spatial Coordinates</th>
                <th>Timestamp</th>
                <th>Review Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.length > 0 ? (
                filteredEvents.map((evt) => (
                  <tr
                    key={evt.id}
                    style={{ cursor: "pointer" }}
                    onClick={() => onSelectEvent && onSelectEvent(evt)}
                  >
                    <td style={{ fontFamily: "monospace", fontSize: "0.82rem", color: "var(--accent-blue)", fontWeight: 600 }}>
                      {evt.id}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{evt.event_type.replace("_", " ")}</div>
                      <div style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>
                        {evt.detection_class}
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
                    <td>
                      <div>{evt.bus_id || "Recorded Run"}</div>
                      {evt.is_simulated && (
                        <span style={{ fontSize: "0.7rem", color: "#b45309", fontWeight: 600 }}>
                          [Simulated GPS]
                        </span>
                      )}
                    </td>
                    <td style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <MapPin size={12} color="var(--accent-blue)" />
                        {evt.latitude.toFixed(4)}, {evt.longitude.toFixed(4)}
                      </div>
                    </td>
                    <td style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          background: evt.status === "RESOLVED" ? "#ecfdf5" : evt.status === "VERIFIED" ? "#eff6ff" : "#f8fafc",
                          color: evt.status === "RESOLVED" ? "#047857" : evt.status === "VERIFIED" ? "#1d4ed8" : "#475569",
                          border: `1px solid ${evt.status === "RESOLVED" ? "#a7f3d0" : evt.status === "VERIFIED" ? "#bfdbfe" : "#cbd5e1"}`,
                        }}
                      >
                        {evt.status}
                      </span>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button
                          className="btn-outline"
                          style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                          onClick={() => onSelectEvent && onSelectEvent(evt)}
                        >
                          <Eye size={12} /> View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" style={{ textAlign: "center", padding: "28px", color: "var(--text-muted)" }}>
                    No events match the selected filters.
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
