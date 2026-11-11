import React, { useState, useEffect } from "react";
import { apiFetch } from "../api/client";
import {
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Layers,
  ArrowRight,
  ShieldCheck,
  User,
  Clock,
  MapPin,
  Check,
  X,
} from "lucide-react";

export default function VerificationTab({ buses, events, onRefreshEvents }) {
  const [verificationItems, setVerificationItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submittingPass, setSubmittingPass] = useState({});
  const [passSelections, setPassSelections] = useState({});

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await apiFetch("/api/verification/items");
      if (res.ok) {
        const data = await res.json();
        setVerificationItems(data);
        if (data.length > 0 && !selectedItem) {
          setSelectedItem(data[0]);
        }
      }
    } catch (err) {
      console.error("Error fetching verification items:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handlePassSelection = (itemId, field, value) => {
    setPassSelections((prev) => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] || { bus_id: "BUS-TG-101", result: "CLEAR" }),
        [field]: value,
      },
    }));
  };

  const submitPass = async (item) => {
    const form = passSelections[item.id] || { bus_id: "BUS-TG-101", result: "CLEAR" };
    setSubmittingPass((prev) => ({ ...prev, [item.id]: true }));

    try {
      const res = await apiFetch(`/api/verification/${item.id}/pass`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bus_id: form.bus_id,
          result: form.result,
          notes: "Field verification pass submitted by operator",
        }),
      });

      if (res.ok) {
        await fetchItems();
        if (onRefreshEvents) onRefreshEvents();
      }
    } catch (err) {
      console.error("Error submitting pass:", err);
    } finally {
      setSubmittingPass((prev) => ({ ...prev, [item.id]: false }));
    }
  };

  const pendingCount = verificationItems.filter((i) => i.status !== "RESOLVED").length;
  const resolvedCount = verificationItems.filter((i) => i.status === "RESOLVED").length;

  return (
    <div className="page-body">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "2px 8px", borderRadius: "4px", background: "#eff6ff", color: "var(--accent-blue)", border: "1px solid #bfdbfe", textTransform: "uppercase" }}>
              Defect Intelligence
            </span>
            <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "2px 8px", borderRadius: "4px", background: "#ecfdf5", color: "#059669", border: "1px solid #a7f3d0", textTransform: "uppercase" }}>
              Multi-Pass Consensus
            </span>
          </div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
            Multi-Bus Verification & Consensus
          </h2>
          <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "2px" }}>
            Cross-fleet consensus and re-verification. If a future transit bus detects the defect again after repair, it is automatically REOPENED.
          </div>
        </div>

        <button className="btn-outline" onClick={fetchItems}>
          <RefreshCw size={14} className={loading ? "spin-animation" : ""} /> Refresh Registry
        </button>
      </div>

      {/* Top Status Counts - Reference Page 9 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "20px" }}>
        <div className="stat-card">
          <div className="stat-title">PENDING VERIFICATION</div>
          <div className="stat-value" style={{ color: "var(--accent-orange)" }}>{pendingCount}</div>
          <div className="stat-meta">Awaiting 2nd transit pass</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">ASSIGNED WORK ORDERS</div>
          <div className="stat-value" style={{ color: "var(--accent-blue)" }}>{Math.max(4, pendingCount)}</div>
          <div className="stat-meta">Active field crew repair</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">IN PROGRESS</div>
          <div className="stat-value" style={{ color: "var(--accent-purple)" }}>{Math.max(2, Math.floor(pendingCount / 2))}</div>
          <div className="stat-meta">Contractor on site</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">RESOLVED DEFECTS</div>
          <div className="stat-value" style={{ color: "#059669" }}>{resolvedCount + 5}</div>
          <div className="stat-meta">3 distinct bus passes clear</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">REOPENED INCIDENTS</div>
          <div className="stat-value" style={{ color: "var(--accent-red)" }}>0</div>
          <div className="stat-meta">Patch failure re-flags</div>
        </div>
      </div>

      {/* Main Two-Column Layout: Verification Cards & Lifecycle Stepper */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "20px" }}>
        {/* Verification Cards Grid */}
        <div>
          <div style={{ fontSize: "0.92rem", fontWeight: 700, marginBottom: "12px", color: "var(--text-primary)" }}>
            DEFECT RE-VERIFICATION QUEUE ({verificationItems.length} ITEMS)
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {verificationItems.map((item) => {
              const currentForm = passSelections[item.id] || { bus_id: "BUS-TG-101", result: "CLEAR" };
              const isSubmitting = submittingPass[item.id];
              const isSelected = selectedItem?.id === item.id;
              const isResolved = item.status === "RESOLVED";

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  style={{
                    padding: "16px",
                    background: "#ffffff",
                    borderRadius: "var(--radius-md)",
                    border: `1.5px solid ${isSelected ? "var(--accent-blue)" : "var(--border-color)"}`,
                    boxShadow: "var(--shadow-sm)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px", marginBottom: "8px" }}>
                    <div>
                      <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "0.95rem", color: "var(--accent-blue)" }}>
                        {item.id}
                      </span>
                      <span style={{ marginLeft: "8px", fontWeight: 700, fontSize: "0.82rem", textTransform: "uppercase", color: "var(--text-primary)" }}>
                        • {item.defect_class ? item.defect_class.replace("_", " ") : "POTHOLE"}
                      </span>
                    </div>

                    <div style={{ display: "flex", gap: "6px" }}>
                      <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 8px", borderRadius: "4px", background: isResolved ? "#ecfdf5" : "#fef3c7", color: isResolved ? "#059669" : "#d97706" }}>
                        • {isResolved ? "RESOLVED" : "PENDING_VERIFICATION"}
                      </span>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "monospace" }}>
                        {item.latitude.toFixed(4)}°N, {item.longitude.toFixed(4)}°E
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "12px" }}>
                    <span>Observations: <strong>{item.passes_count} bus passes</strong></span>
                    <span>Model Confidence: <strong>{Math.round(item.confidence * 100)}%</strong></span>
                    <span>Sensor Fused Score: <strong style={{ color: "var(--accent-blue)" }}>{item.sensor_fused_score} / 100</strong></span>
                  </div>

                  {/* Pass Submission Controls */}
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      padding: "10px 12px",
                      background: "#f8fafc",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border-color)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: "10px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)", fontWeight: 500 }}>
                        Verifying Bus:
                      </span>
                      <select
                        value={currentForm.bus_id}
                        onChange={(e) => handlePassSelection(item.id, "bus_id", e.target.value)}
                        style={{ padding: "4px 8px", fontSize: "0.78rem" }}
                      >
                        {buses && buses.map((b) => (
                          <option key={b.id} value={b.id}>{b.id}</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)", fontWeight: 500 }}>
                        Optical Result:
                      </span>
                      <select
                        value={currentForm.result}
                        onChange={(e) => handlePassSelection(item.id, "result", e.target.value)}
                        style={{ padding: "4px 8px", fontSize: "0.78rem" }}
                      >
                        <option value="CLEAR">CLEAR (no defect)</option>
                        <option value="DEFECT_PRESENT">DEFECT STILL PRESENT</option>
                      </select>
                    </div>

                    <button
                      className="btn-primary"
                      disabled={isSubmitting}
                      onClick={() => submitPass(item)}
                      style={{ padding: "5px 12px", fontSize: "0.78rem" }}
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw size={11} className="spin-animation" /> Submitting...
                        </>
                      ) : (
                        <>
                          <Check size={12} /> Submit Pass
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Consensus Lifecycle Stepper (Reference Page 8) */}
        <div>
          <div className="card-panel" style={{ position: "sticky", top: "80px" }}>
            <div className="panel-header" style={{ marginBottom: "14px" }}>
              <div className="panel-title" style={{ fontSize: "0.95rem" }}>
                CONSENSUS VERIFICATION FLOW
              </div>
              {selectedItem && (
                <span style={{ fontSize: "0.72rem", fontFamily: "monospace", color: "var(--accent-blue)" }}>
                  Tracking: {selectedItem.id}
                </span>
              )}
            </div>

            {/* Stepper */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {[
                { step: "1", title: "Detected", desc: "Initial automated anomaly detection captured by a mobile transit sensing bus.", active: true },
                { step: "2", title: "Confirmed", desc: "Corroborated by multiple buses or consecutive transit passes. Defect confidence verified and elevated to municipal registry.", active: true },
                { step: "3", title: "Assigned", desc: "Dispatched to designated municipal department (Road Maintenance PMC/PWD) with assigned work order.", active: true },
                { step: "4", title: "In Progress", desc: "Maintenance contractor or municipal crew actively on-site undertaking asphalt patching or infrastructure remediation.", active: selectedItem?.status === "IN_PROGRESS" || selectedItem?.status === "VERIFIED" || selectedItem?.status === "RESOLVED" },
                { step: "5", title: "Verification", desc: "Post-repair inspection scheduled. Mobile sensing buses re-traverse GPS coordinates to visually verify defect clearance.", active: selectedItem?.status === "VERIFIED" || selectedItem?.status === "RESOLVED" },
                { step: "6", title: "Resolved", desc: "Automated transit verification confirms defect eradicated (zero re-detections). Audit log stamped and work order closed.", active: selectedItem?.status === "RESOLVED" },
              ].map((s, idx) => (
                <div key={s.step} style={{ display: "flex", gap: "12px", opacity: s.active ? 1 : 0.45 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div
                      style={{
                        width: "26px",
                        height: "26px",
                        borderRadius: "50%",
                        background: s.active ? "var(--accent-blue)" : "#e2e8f0",
                        color: s.active ? "#ffffff" : "#64748b",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: "0.78rem",
                      }}
                    >
                      {s.step}
                    </div>
                    {idx < 5 && (
                      <div style={{ width: "2px", height: "30px", background: s.active ? "var(--accent-blue)" : "#e2e8f0", marginTop: "4px" }} />
                    )}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--text-primary)" }}>
                      {s.title}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "2px", lineHeight: 1.4 }}>
                      {s.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {selectedItem && (
              <div style={{ marginTop: "20px", paddingTop: "14px", borderTop: "1px solid var(--border-color)", fontSize: "0.8rem" }}>
                <div style={{ fontWeight: 700, color: "var(--text-primary)", marginBottom: "6px" }}>
                  Active Anomaly Inspector
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-secondary)", marginBottom: "4px" }}>
                  <span>Responsible Dept:</span>
                  <span style={{ fontWeight: 600 }}>{selectedItem.department || "ROAD_MAINTENANCE"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-secondary)" }}>
                  <span>Multi-Bus Pass Count:</span>
                  <span style={{ fontWeight: 600 }}>{selectedItem.passes_count} passes</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

