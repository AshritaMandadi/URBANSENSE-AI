import React, { useState, useEffect } from "react";
import { apiFetch } from "../api/client";
import {
  Users,
  Shield,
  Key,
  UserPlus,
  Trash2,
  RefreshCw,
  CheckCircle2,
  Lock,
} from "lucide-react";

export default function AdminTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("VIEWER");
  const [department, setDepartment] = useState("Road Maintenance (PWD)");
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await apiFetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error("Error fetching operator accounts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!username.trim()) return;

    setCreating(true);
    setMessage(null);
    try {
      const res = await apiFetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          role: role,
          department: department.trim(),
        }),
      });

      if (res.ok) {
        setUsername("");
        setPassword("");
        setMessage({ type: "success", text: "Operator account provisioned successfully." });
        await fetchUsers();
      } else {
        const err = await res.json();
        setMessage({ type: "error", text: err.detail || "Failed to create user account." });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Network error provisioning operator account." });
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm("Are you sure you want to remove this operator account?")) return;
    try {
      const res = await apiFetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      if (res.ok) {
        await fetchUsers();
      }
    } catch (err) {
      console.error("Error deleting user:", err);
    }
  };

  const adminsCount = users.filter((u) => u.role === "ADMIN").length;
  const authoritiesCount = users.filter((u) => u.role === "AUTHORITY").length;
  const viewersCount = users.filter((u) => u.role === "VIEWER").length;

  return (
    <div className="page-body">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "2px 8px", borderRadius: "4px", background: "#eff6ff", color: "var(--accent-blue)", border: "1px solid #bfdbfe", textTransform: "uppercase" }}>
              Administration & Governance
            </span>
            <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "2px 8px", borderRadius: "4px", background: "#f3e8ff", color: "#7c3aed", border: "1px solid #ddd6fe", textTransform: "uppercase" }}>
              RBAC Provisioning
            </span>
          </div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
            Admin Console
          </h2>
          <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "2px" }}>
            Municipal operator permissions, access roles, and account provisioning
          </div>
        </div>

        <button className="btn-outline" onClick={fetchUsers}>
          <RefreshCw size={14} className={loading ? "spin-animation" : ""} /> Refresh Accounts
        </button>
      </div>

      {/* Main Two-Column Layout - Reference Page 12 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: "20px", marginBottom: "20px" }}>
        {/* Create User Card */}
        <div className="card-panel">
          <div className="panel-header" style={{ marginBottom: "14px" }}>
            <div className="panel-title" style={{ fontSize: "0.95rem" }}>
              CREATE OPERATOR ACCOUNT
            </div>
            <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 6px", borderRadius: "4px", background: "#eff6ff", color: "var(--accent-blue)" }}>
              • NEW
            </span>
          </div>

          <form onSubmit={handleCreateUser} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>
                Username
              </label>
              <input
                type="text"
                required
                placeholder="e.g. ward_supervisor_hyderabad"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", fontSize: "0.85rem" }}
              />
            </div>

            <div>
              <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>
                Temporary Password (min 8 chars)
              </label>
              <input
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", fontSize: "0.85rem" }}
              />
            </div>

            <div>
              <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>
                Assigned Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", fontSize: "0.85rem" }}
              >
                <option value="VIEWER">VIEWER (Read-only monitoring)</option>
                <option value="AUTHORITY">AUTHORITY (Verify & dispatch repairs)</option>
                <option value="ADMIN">ADMINISTRATOR (Full system control)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>
                Department / Agency
              </label>
              <input
                type="text"
                placeholder="e.g. Road Maintenance (PWD)"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", fontSize: "0.85rem" }}
              />
            </div>

            {message && (
              <div style={{ padding: "8px 12px", borderRadius: "4px", fontSize: "0.78rem", background: message.type === "success" ? "#ecfdf5" : "#fee2e2", color: message.type === "success" ? "#059669" : "#dc2626" }}>
                {message.text}
              </div>
            )}

            <button type="submit" className="btn-primary" disabled={creating} style={{ marginTop: "4px", justifyContent: "center" }}>
              {creating ? <RefreshCw size={14} className="spin-animation" /> : <UserPlus size={14} />} Provision Operator User
            </button>
          </form>
        </div>

        {/* Registered Operator Accounts */}
        <div className="card-panel">
          <div className="panel-header" style={{ marginBottom: "14px" }}>
            <div className="panel-title" style={{ fontSize: "0.95rem" }}>
              REGISTERED OPERATOR ACCOUNTS
            </div>
            <span style={{ fontSize: "0.72rem", padding: "2px 8px", borderRadius: "9999px", background: "#eff6ff", color: "var(--accent-blue)", fontWeight: 600 }}>
              {users.length} TOTAL
            </span>
          </div>

          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Created</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.length > 0 ? (
                  users.map((u) => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                        {u.username}
                      </td>
                      <td>
                        <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 6px", borderRadius: "4px", background: u.role === "ADMIN" ? "#eff6ff" : u.role === "AUTHORITY" ? "#f3e8ff" : "#f1f5f9", color: u.role === "ADMIN" ? "var(--accent-blue)" : u.role === "AUTHORITY" ? "#7c3aed" : "var(--text-secondary)" }}>
                          {u.role}
                        </span>
                      </td>
                      <td style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                        {u.department}
                      </td>
                      <td style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td>
                        <button
                          className="btn-outline"
                          style={{ padding: "3px 8px", fontSize: "0.72rem", color: "#dc2626" }}
                          onClick={() => handleDeleteUser(u.id)}
                          title="Revoke access"
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" style={{ textAlign: "center", padding: "24px", color: "var(--text-muted)" }}>
                      No registered users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 3 Stat Cards Across Bottom - Reference Page 12 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
        <div className="stat-card">
          <div className="stat-title">ADMINISTRATORS</div>
          <div className="stat-value" style={{ color: "var(--accent-red)" }}>{adminsCount}</div>
          <div className="stat-meta">Full platform & model access</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">AUTHORITIES</div>
          <div className="stat-value" style={{ color: "var(--accent-blue)" }}>{authoritiesCount}</div>
          <div className="stat-meta">PWD & dispatch verification roles</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">VIEWERS</div>
          <div className="stat-value" style={{ color: "#059669" }}>{viewersCount}</div>
          <div className="stat-meta">Read-only transit monitoring</div>
        </div>
      </div>
    </div>
  );
}

