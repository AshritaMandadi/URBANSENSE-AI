import React, { useState, useEffect } from "react";
import { apiFetch } from "../api/client";
import {
  Wrench,
  ShieldCheck,
  Clock,
  MapPin,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Building2,
  ExternalLink,
} from "lucide-react";

export default function DispatchTab({ onInspectEvent }) {
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await apiFetch("/api/dispatch/work-orders");
      if (res.ok) {
        const data = await res.json();
        setWorkOrders(data);
      }
    } catch (err) {
      console.error("Error fetching work orders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const updateStatus = async (woId, nextStatus) => {
    setUpdatingId(woId);
    try {
      const res = await apiFetch(`/api/dispatch/work-orders/${woId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        await fetchOrders();
      }
    } catch (err) {
      console.error("Error updating work order:", err);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredOrders = workOrders.filter((wo) => {
    const matchesFilter =
      statusFilter === "ALL" ||
      (statusFilter === "OPEN" && wo.status !== "RESOLVED") ||
      wo.status === statusFilter;
    const matchesSearch =
      wo.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wo.defect_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wo.assigned_to.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (wo.location && wo.location.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const pendingCount = workOrders.filter((w) => w.status === "PENDING" || w.status === "ASSIGNED").length;
  const highPriorityCount = workOrders.filter((w) => w.severity === "HIGH" || w.severity === "CRITICAL").length;
  const inProgressCount = workOrders.filter((w) => w.status === "IN_PROGRESS").length;
  const resolvedCount = workOrders.filter((w) => w.status === "RESOLVED").length;

  return (
    <div className="page-body">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "2px 8px", borderRadius: "4px", background: "#eff6ff", color: "var(--accent-blue)", border: "1px solid #bfdbfe", textTransform: "uppercase" }}>
              Municipal Operations
            </span>
            <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "2px 8px", borderRadius: "4px", background: "#ecfdf5", color: "#059669", border: "1px solid #a7f3d0", textTransform: "uppercase" }}>
              Authorities Portal
            </span>
          </div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
            Municipal Authority Dispatch
          </h2>
          <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "2px" }}>
            Inter-agency defect work orders, contractor assignments, and municipal department routing
          </div>
        </div>

        <button className="btn-outline" onClick={fetchOrders}>
          <RefreshCw size={14} className={loading ? "spin-animation" : ""} /> Refresh Records
        </button>
      </div>

      {/* 4 Stat Cards - Reference Page 10 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px", marginBottom: "20px" }}>
        <div className="stat-card">
          <div className="stat-title">PENDING / DETECTED</div>
          <div className="stat-value">{pendingCount}</div>
          <div className="stat-meta">Awaiting departmental triage</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">HIGH PRIORITY</div>
          <div className="stat-value" style={{ color: "var(--accent-red)" }}>{highPriorityCount}</div>
          <div className="stat-meta">Critical & high severity</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">IN PROGRESS / ASSIGNED</div>
          <div className="stat-value" style={{ color: "var(--accent-purple)" }}>{inProgressCount}</div>
          <div className="stat-meta">Active field crew orders</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">REMEDIATED / RESOLVED</div>
          <div className="stat-value" style={{ color: "#059669" }}>{resolvedCount}</div>
          <div className="stat-meta">Transit-verified clearance</div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="card-panel" style={{ marginBottom: "16px", padding: "12px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {["ALL", "OPEN", "ASSIGNED", "IN_PROGRESS", "RESOLVED"].map((st) => (
              <button
                key={st}
                className={`btn-outline ${statusFilter === st ? "btn-primary" : ""}`}
                style={{ padding: "5px 12px", fontSize: "0.78rem" }}
                onClick={() => setStatusFilter(st)}
              >
                {st.replace("_", " ")}
              </button>
            ))}
          </div>

          <div style={{ position: "relative", width: "240px" }}>
            <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Search work order, dept..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ padding: "6px 10px 6px 30px", fontSize: "0.8rem", width: "100%" }}
            />
          </div>
        </div>
      </div>

      {/* Work Orders Table */}
      <div className="card-panel">
        <div className="panel-header">
          <div className="panel-title" style={{ fontSize: "0.95rem" }}>
            AUTHORITIES DISPATCH REGISTRY ({filteredOrders.length})
          </div>
          <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
            Telangana Public Works & Municipal Roads Department
          </span>
        </div>

        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Work Order</th>
                <th>Defect Type</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Assigned Department / Crew</th>
                <th>Transit Passes</th>
                <th>Confidence</th>
                <th>Reported</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length > 0 ? (
                filteredOrders.map((wo) => {
                  const isUpdating = updatingId === wo.id;
                  const isResolved = wo.status === "RESOLVED";

                  return (
                    <tr key={wo.id}>
                      <td style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--accent-blue)" }}>
                        {wo.id}
                      </td>
                      <td style={{ fontWeight: 600, textTransform: "uppercase" }}>
                        {wo.defect_type.replace("_", " ")}
                        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 400 }}>
                          {wo.location || "Corridor Segment"}
                        </div>
                      </td>
                      <td>
                        <span className={`badge badge-${wo.severity.toLowerCase()}`}>
                          • {wo.severity}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "2px 8px", borderRadius: "4px", background: isResolved ? "#ecfdf5" : wo.status === "IN_PROGRESS" ? "#f3e8ff" : "#eff6ff", color: isResolved ? "#059669" : wo.status === "IN_PROGRESS" ? "#7c3aed" : "var(--accent-blue)" }}>
                          • {wo.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{wo.assigned_to}</div>
                        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{wo.department}</div>
                      </td>
                      <td style={{ fontWeight: 600 }}>{wo.transit_passes}</td>
                      <td style={{ fontWeight: 600 }}>{Math.round(wo.confidence * 100)}%</td>
                      <td style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                        {new Date(wo.created_at).toLocaleDateString()}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "6px" }}>
                          {wo.status !== "RESOLVED" ? (
                            <button
                              className="btn-primary"
                              disabled={isUpdating}
                              style={{ padding: "4px 8px", fontSize: "0.72rem" }}
                              onClick={() => updateStatus(wo.id, wo.status === "ASSIGNED" ? "IN_PROGRESS" : "RESOLVED")}
                            >
                              {wo.status === "ASSIGNED" ? "Start Repair" : "Mark Resolved"}
                            </button>
                          ) : (
                            <span style={{ fontSize: "0.75rem", color: "#059669", fontWeight: 600 }}>
                              ✓ Closed
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="9" style={{ textAlign: "center", padding: "28px", color: "var(--text-muted)" }}>
                    No work orders found matching the filter criteria.
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

