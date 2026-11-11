import React, { useState, useEffect } from "react";
import { apiFetch } from "../api/client";
import {
  ShieldCheck,
  Clock,
  Filter,
  RefreshCw,
  Search,
  FileText,
  User,
  Activity,
} from "lucide-react";

export default function AuditTab() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("ALL");

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await apiFetch("/api/audit/logs?limit=100");
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error("Error fetching audit logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const matchesEntity = entityFilter === "ALL" || log.entity === entityFilter;
    const matchesAction =
      !actionFilter.trim() ||
      log.action.toLowerCase().includes(actionFilter.toLowerCase()) ||
      log.actor.toLowerCase().includes(actionFilter.toLowerCase()) ||
      (log.entity_id && log.entity_id.toLowerCase().includes(actionFilter.toLowerCase()));
    return matchesEntity && matchesAction;
  });

  return (
    <div className="page-body">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "2px 8px", borderRadius: "4px", background: "#f3e8ff", color: "#7c3aed", border: "1px solid #ddd6fe", textTransform: "uppercase" }}>
              Administration & Governance
            </span>
            <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "2px 8px", borderRadius: "4px", background: "#eff6ff", color: "var(--accent-blue)", border: "1px solid #bfdbfe", textTransform: "uppercase" }}>
              Immutable Audit Trail
            </span>
          </div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
            Audit Logs
          </h2>
          <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "2px" }}>
            Immutable trail of every state transition, authority decision, and defect life cycle event
          </div>
        </div>

        <button className="btn-outline" onClick={fetchLogs}>
          <RefreshCw size={14} className={loading ? "spin-animation" : ""} /> Refresh Trail
        </button>
      </div>

      {/* Filter Controls Card - Reference Page 13 */}
      <div className="card-panel" style={{ marginBottom: "16px", padding: "14px 18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <div>
              <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>
                ACTION FILTER
              </span>
              <input
                type="text"
                placeholder="e.g. STATUS_UPDATED, WORK_ORDER"
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                style={{ padding: "6px 12px", fontSize: "0.82rem", minWidth: "220px" }}
              />
            </div>

            <div>
              <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>
                ENTITY TYPE
              </span>
              <select
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value)}
                style={{ padding: "6px 12px", fontSize: "0.82rem" }}
              >
                <option value="ALL">All Entities</option>
                <option value="ISSUE">ISSUE (Road Defects)</option>
                <option value="WORK_ORDER">WORK_ORDER (Municipal)</option>
                <option value="OPERATOR_USER">OPERATOR_USER (Accounts)</option>
                <option value="AI_MODEL">AI_MODEL (Inference)</option>
                <option value="FLEET">FLEET (Transit)</option>
              </select>
            </div>
          </div>

          <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
            <strong>{logs.length}</strong> entries recorded • showing <strong>{filteredLogs.length}</strong>
          </div>
        </div>
      </div>

      {/* Immutable Audit Trail Table */}
      <div className="card-panel">
        <div className="panel-header">
          <div className="panel-title" style={{ fontSize: "0.95rem" }}>
            IMMUTABLE AUDIT TRAIL
          </div>
          <span style={{ fontSize: "0.72rem", padding: "2px 8px", borderRadius: "9999px", background: "#f3e8ff", color: "#7c3aed", fontWeight: 700 }}>
            • VERIFIED RELATIONAL LOG
          </span>
        </div>

        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Time (UTC / Local)</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Entity ID</th>
                <th>Payload / State Transition</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => {
                  return (
                    <tr key={log.id}>
                      <td style={{ fontSize: "0.78rem", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td style={{ fontWeight: 600, color: log.actor === "system" ? "#64748b" : "var(--accent-blue)" }}>
                        {log.actor}
                      </td>
                      <td>
                        <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 6px", borderRadius: "4px", background: log.action.includes("CREATED") ? "#ecfdf5" : log.action.includes("UPDATED") ? "#eff6ff" : log.action.includes("PASS") ? "#fef3c7" : "#f1f5f9", color: log.action.includes("CREATED") ? "#059669" : log.action.includes("UPDATED") ? "var(--accent-blue)" : log.action.includes("PASS") ? "#d97706" : "var(--text-secondary)" }}>
                          • {log.action}
                        </span>
                      </td>
                      <td style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-primary)" }}>
                        {log.entity}
                      </td>
                      <td style={{ fontFamily: "monospace", fontSize: "0.82rem", color: "var(--accent-blue)", fontWeight: 600 }}>
                        {log.entity_id || "N/A"}
                      </td>
                      <td style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "#475569", maxWidth: "340px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={log.details}>
                        {log.details || "{}"}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: "28px", color: "var(--text-muted)" }}>
                    No audit records match the current filter.
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

