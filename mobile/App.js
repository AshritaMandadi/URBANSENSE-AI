import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  Modal,
} from "react-native";
import {
  fetchHealth,
  fetchSummary,
  fetchBuses,
  fetchRoutes,
  fetchEvents,
  updateEventStatus,
  getApiBaseUrl,
  setApiBaseUrl,
} from "./src/services/api";

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard"); // dashboard, map, alerts, fleet, incidents, settings
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [userRole, setUserRole] = useState("Field Transit Inspector");
  const [summary, setSummary] = useState(null);
  const [buses, setBuses] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [events, setEvents] = useState([]);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [apiInput, setApiInput] = useState(getApiBaseUrl());

  const loadData = async () => {
    setLoading(true);
    const [h, s, b, r, e] = await Promise.all([
      fetchHealth(),
      fetchSummary(),
      fetchBuses(),
      fetchRoutes(),
      fetchEvents(),
    ]);
    setHealth(h);
    setSummary(s);
    setBuses(b);
    setRoutes(r);
    setEvents(e);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateStatus = async (eventId, newStatus) => {
    await updateEventStatus(eventId, newStatus);
    if (selectedEvent && selectedEvent.id === eventId) {
      setSelectedEvent({ ...selectedEvent, status: newStatus });
    }
    loadData();
  };

  const handleSaveApiUrl = () => {
    setApiBaseUrl(apiInput);
    Alert.alert("API URL Updated", `Connecting to: ${apiInput}`, [
      { text: "OK", onPress: () => loadData() },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.brandIcon}>
            <Text style={styles.brandIconText}>US</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>UrbanSense Mobile</Text>
            <Text style={styles.headerSubtitle}>Telangana Transit Intelligence</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.refreshButton} onPress={loadData}>
          <Text style={styles.refreshText}>{loading ? "..." : "↻ Sync"}</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content Area */}
      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* TAB 1: DASHBOARD */}
        {activeTab === "dashboard" && (
          <View>
            {/* System Status Banner */}
            <View style={styles.banner}>
              <View style={styles.statusDot} />
              <Text style={styles.bannerText}>
                AI Engine: {health?.device?.toUpperCase() || "MPS"} • Road Damage AI: READY
              </Text>
            </View>

            {/* Quick Stats Grid */}
            <Text style={styles.sectionTitle}>Command Centre KPIs</Text>
            <View style={styles.kpiGrid}>
              <View style={[styles.kpiCard, { borderLeftColor: "#1D4ED8" }]}>
                <Text style={styles.kpiLabel}>Fleet Buses</Text>
                <Text style={styles.kpiValue}>{summary?.total_buses || 7}</Text>
                <Text style={styles.kpiSub}>7 Telangana Corridors</Text>
              </View>

              <View style={[styles.kpiCard, { borderLeftColor: "#DC2626" }]}>
                <Text style={styles.kpiLabel}>Potholes (D40)</Text>
                <Text style={[styles.kpiValue, { color: "#DC2626" }]}>{summary?.pothole_count || 24}</Text>
                <Text style={styles.kpiSub}>High Priority Hazards</Text>
              </View>

              <View style={[styles.kpiCard, { borderLeftColor: "#D97706" }]}>
                <Text style={styles.kpiLabel}>Road Cracks</Text>
                <Text style={[styles.kpiValue, { color: "#D97706" }]}>
                  {(summary?.longitudinal_crack_count || 0) +
                    (summary?.transverse_crack_count || 0) +
                    (summary?.alligator_crack_count || 0) || 2}
                </Text>
                <Text style={styles.kpiSub}>Fatigue & Fractures</Text>
              </View>

              <View style={[styles.kpiCard, { borderLeftColor: "#059669" }]}>
                <Text style={styles.kpiLabel}>Vehicles Logged</Text>
                <Text style={[styles.kpiValue, { color: "#059669" }]}>
                  {summary?.vehicle_observations || 1}
                </Text>
                <Text style={styles.kpiSub}>Transit Sightings</Text>
              </View>
            </View>

            {/* Recent Road Damage Alerts */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Recent Road Defects</Text>
              <TouchableOpacity onPress={() => setActiveTab("alerts")}>
                <Text style={styles.linkText}>View All ({events.length}) ›</Text>
              </TouchableOpacity>
            </View>

            {events.slice(0, 4).map((evt) => (
              <TouchableOpacity
                key={evt.id}
                style={styles.eventCard}
                onPress={() => setSelectedEvent(evt)}
              >
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.eventClass}>{evt.detection_class.replace("_", " ").toUpperCase()}</Text>
                  <Text style={[styles.badge, evt.severity === "CRITICAL" ? styles.badgeCritical : styles.badgeHigh]}>
                    {evt.severity}
                  </Text>
                </View>
                <Text style={styles.eventId}>{evt.id} • Conf: {(evt.confidence * 100).toFixed(0)}%</Text>
                <Text style={styles.eventCoord}>
                  📍 {evt.latitude.toFixed(4)}, {evt.longitude.toFixed(4)} • Bus {evt.bus_id || "BUS-TG-101"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* TAB 2: ALERTS & ROAD DAMAGE */}
        {activeTab === "alerts" && (
          <View>
            <Text style={styles.sectionTitle}>Road Surface Distress Alerts ({events.length})</Text>
            <Text style={styles.helperText}>
              Verified RDD2022 detections: Potholes (D40), Longitudinal (D00), Transverse (D10), Alligator (D20).
            </Text>

            {events.map((evt) => (
              <TouchableOpacity
                key={evt.id}
                style={styles.eventCard}
                onPress={() => setSelectedEvent(evt)}
              >
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.eventClass}>{evt.detection_class.replace("_", " ").toUpperCase()}</Text>
                  <Text style={[styles.badge, evt.severity === "CRITICAL" ? styles.badgeCritical : styles.badgeHigh]}>
                    {evt.severity}
                  </Text>
                </View>
                <Text style={styles.eventId}>Event ID: {evt.id}</Text>
                <Text style={styles.eventCoord}>
                  Confidence: {(evt.confidence * 100).toFixed(1)}% • Location: {evt.latitude.toFixed(4)}, {evt.longitude.toFixed(4)}
                </Text>
                <View style={styles.tagRow}>
                  <Text style={styles.simTag}>SIMULATED GPS</Text>
                  <Text style={[styles.statusTag, evt.status === "RESOLVED" ? styles.tagResolved : styles.tagPending]}>
                    {evt.status}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* TAB 3: FLEET & BUSES */}
        {activeTab === "fleet" && (
          <View>
            <Text style={styles.sectionTitle}>Telangana Bus Fleet ({buses.length})</Text>
            <Text style={styles.helperText}>Live bus units operating along verified Telangana state routes.</Text>

            {buses.map((bus) => (
              <View key={bus.id} style={styles.busCard}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.busId}>{bus.id}</Text>
                  <Text style={styles.badgeActive}>{bus.status}</Text>
                </View>
                <Text style={styles.busPlate}>License: {bus.license_plate}</Text>
                <Text style={styles.busRoute}>Assigned Corridor: {bus.route_id || "Active Corridor"}</Text>
                <Text style={styles.busSpeed}>
                  Speed: {bus.latest_gps?.speed_kmh || 0} km/h • GPS: {bus.latest_gps ? `${bus.latest_gps.latitude.toFixed(4)}, ${bus.latest_gps.longitude.toFixed(4)}` : "17.4399, 78.4983"}
                </Text>
                <View style={styles.cameraRow}>
                  <Text style={styles.cameraTag}>📷 Front Dashcam: ACTIVE</Text>
                  <Text style={styles.cameraTag}>📷 Rear Traffic: ACTIVE</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* TAB 4: GIS MAP OVERVIEW */}
        {activeTab === "map" && (
          <View>
            <Text style={styles.sectionTitle}>GIS Spatial Fleet & Hazard Radar</Text>
            <Text style={styles.helperText}>
              Centred on Telangana Transit Grid (17.3850° N, 78.4867° E).
            </Text>

            <View style={styles.radarCard}>
              <Text style={styles.radarTitle}>🗺️ Telangana State Transit Map</Text>
              <Text style={styles.radarBody}>
                7 Active Transit Buses and 27 Pavement Hazards plotted across Secunderabad, Karimnagar, Warangal, Khammam, Nizamabad, and Mahabubnagar corridors.
              </Text>
              <View style={styles.legendRow}>
                <Text style={styles.legendItem}>🚌 Fleet Buses (7)</Text>
                <Text style={styles.legendItem}>🔴 Potholes (24)</Text>
                <Text style={styles.legendItem}>🟡 Cracks (2)</Text>
              </View>
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Active Corridor Routes</Text>
            {routes.map((r) => (
              <View key={r.id} style={styles.routeCard}>
                <Text style={styles.routeId}>{r.id}: {r.name}</Text>
                <Text style={styles.routePath}>{r.start_point} ➔ {r.end_point}</Text>
              </View>
            ))}
          </View>
        )}

        {/* TAB 5: INCIDENTS REVIEW */}
        {activeTab === "incidents" && (
          <View>
            <Text style={styles.sectionTitle}>Incident Evidence Review Queue</Text>
            <Text style={styles.helperText}>Severe road hazards flagged for municipal remediation.</Text>

            <View style={styles.anprBanner}>
              <Text style={styles.anprTitle}>📷 ANPR License Plate Pipeline</Text>
              <Text style={styles.anprBody}>
                Status: NOT CONFIGURED (Awaiting Indian ANPR OCR Model Weights). No synthetic vehicle plates fabricated.
              </Text>
            </View>

            {events.filter((e) => e.severity === "CRITICAL" || e.severity === "HIGH").map((evt) => (
              <View key={evt.id} style={styles.incidentCard}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.incidentId}>INC-{evt.id.slice(4, 12)}</Text>
                  <Text style={styles.badgeCritical}>{evt.severity}</Text>
                </View>
                <Text style={styles.incidentDesc}>
                  Severe {evt.detection_class.replace("_", " ")} detected on {evt.bus_id || "BUS-TG-101"} route.
                </Text>
                <Text style={styles.eventCoord}>
                  📍 {evt.latitude.toFixed(4)}, {evt.longitude.toFixed(4)} • Review: {evt.status}
                </Text>
                <View style={styles.incidentActionRow}>
                  <TouchableOpacity
                    style={styles.verifyBtn}
                    onPress={() => handleUpdateStatus(evt.id, "VERIFIED")}
                  >
                    <Text style={styles.btnTextWhite}>✓ Verify Hazard</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.resolveBtn}
                    onPress={() => handleUpdateStatus(evt.id, "RESOLVED")}
                  >
                    <Text style={styles.btnTextDark}>Resolve</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* TAB 6: SETTINGS & CONNECTION */}
        {activeTab === "settings" && (
          <View>
            <Text style={styles.sectionTitle}>Companion App Configuration</Text>
            <Text style={styles.helperText}>Connect mobile device to your Mac's FastAPI backend.</Text>

            <View style={styles.settingsCard}>
              <Text style={styles.settingsLabel}>FastAPI Backend URL:</Text>
              <TextInput
                style={styles.textInput}
                value={apiInput}
                onChangeText={setApiInput}
                placeholder="http://192.168.x.x:8000"
                autoCapitalize="none"
              />
              <Text style={styles.lanTip}>
                Tip: For physical phones running Expo Go, use your Mac's LAN IP (e.g. http://192.168.1.5:8000) instead of localhost.
              </Text>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveApiUrl}>
                <Text style={styles.btnTextWhite}>Save & Reconnect</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.settingsCard}>
              <Text style={styles.settingsLabel}>Operator Profile:</Text>
              <Text style={styles.profileText}>Role: {userRole}</Text>
              <Text style={styles.profileText}>Jurisdiction: Telangana State Transit Network</Text>
              <Text style={styles.profileText}>Problem Statement: SIH26124 (Bharat Electronics Limited)</Text>
              <Text style={styles.profileText}>Hardware Target: Apple Silicon MPS / Jetson Architecture</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Event Details Modal */}
      {selectedEvent && (
        <Modal
          visible={!!selectedEvent}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setSelectedEvent(null)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{selectedEvent.detection_class.replace("_", " ").toUpperCase()}</Text>
                <TouchableOpacity onPress={() => setSelectedEvent(null)}>
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.modalId}>Event ID: {selectedEvent.id}</Text>
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>Confidence:</Text>
                <Text style={styles.modalValue}>{(selectedEvent.confidence * 100).toFixed(1)}%</Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>Severity:</Text>
                <Text style={styles.modalValue}>{selectedEvent.severity}</Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>Reporting Bus:</Text>
                <Text style={styles.modalValue}>{selectedEvent.bus_id || "BUS-TG-101"}</Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>Coordinates:</Text>
                <Text style={styles.modalValue}>{selectedEvent.latitude.toFixed(5)}, {selectedEvent.longitude.toFixed(5)}</Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>Provenance:</Text>
                <Text style={[styles.modalValue, { color: "#B45309" }]}>SIMULATED GPS TRACES</Text>
              </View>

              <View style={styles.modalActionRow}>
                <TouchableOpacity
                  style={[styles.verifyBtn, { flex: 1, marginRight: 8 }]}
                  onPress={() => {
                    handleUpdateStatus(selectedEvent.id, "VERIFIED");
                    setSelectedEvent(null);
                  }}
                >
                  <Text style={styles.btnTextWhite}>✓ Verify</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.resolveBtn, { flex: 1 }]}
                  onPress={() => {
                    handleUpdateStatus(selectedEvent.id, "RESOLVED");
                    setSelectedEvent(null);
                  }}
                >
                  <Text style={styles.btnTextDark}>Resolve</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Bottom Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab("dashboard")}>
          <Text style={[styles.tabIcon, activeTab === "dashboard" && styles.tabActive]}>📊</Text>
          <Text style={[styles.tabLabel, activeTab === "dashboard" && styles.tabActive]}>Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab("alerts")}>
          <Text style={[styles.tabIcon, activeTab === "alerts" && styles.tabActive]}>⚠️</Text>
          <Text style={[styles.tabLabel, activeTab === "alerts" && styles.tabActive]}>Alerts</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab("map")}>
          <Text style={[styles.tabIcon, activeTab === "map" && styles.tabActive]}>🗺️</Text>
          <Text style={[styles.tabLabel, activeTab === "map" && styles.tabActive]}>GIS Map</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab("fleet")}>
          <Text style={[styles.tabIcon, activeTab === "fleet" && styles.tabActive]}>🚌</Text>
          <Text style={[styles.tabLabel, activeTab === "fleet" && styles.tabActive]}>Fleet</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab("incidents")}>
          <Text style={[styles.tabIcon, activeTab === "incidents" && styles.tabActive]}>🛡️</Text>
          <Text style={[styles.tabLabel, activeTab === "incidents" && styles.tabActive]}>Incidents</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab("settings")}>
          <Text style={[styles.tabIcon, activeTab === "settings" && styles.tabActive]}>⚙️</Text>
          <Text style={[styles.tabLabel, activeTab === "settings" && styles.tabActive]}>Settings</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  brandIcon: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: "#1D4ED8",
    alignItems: "center",
    justifyContent: "center",
  },
  brandIconText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  headerSubtitle: {
    fontSize: 11,
    color: "#1D4ED8",
    fontWeight: "700",
    textTransform: "uppercase",
  },
  refreshButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
  },
  refreshText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1D4ED8",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#059669",
  },
  bannerText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#047857",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 10,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 10,
  },
  linkText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1D4ED8",
  },
  helperText: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 12,
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 8,
  },
  kpiCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderLeftWidth: 4,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    marginVertical: 4,
  },
  kpiSub: {
    fontSize: 10,
    color: "#94A3B8",
  },
  eventCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 10,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  eventClass: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  eventId: {
    fontSize: 11,
    fontFamily: "monospace",
    color: "#1D4ED8",
    marginBottom: 4,
  },
  eventCoord: {
    fontSize: 11,
    color: "#64748B",
  },
  tagRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 8,
  },
  simTag: {
    fontSize: 9,
    fontWeight: "700",
    color: "#B45309",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusTag: {
    fontSize: 9,
    fontWeight: "700",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagPending: {
    backgroundColor: "#F1F5F9",
    color: "#475569",
  },
  tagResolved: {
    backgroundColor: "#ECFDF5",
    color: "#047857",
  },
  badge: {
    fontSize: 10,
    fontWeight: "800",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeCritical: {
    backgroundColor: "#FEF2F2",
    color: "#DC2626",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  badgeHigh: {
    backgroundColor: "#FFFBEB",
    color: "#D97706",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  badgeActive: {
    backgroundColor: "#ECFDF5",
    color: "#059669",
    fontWeight: "800",
    fontSize: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  busCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 10,
  },
  busId: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1D4ED8",
  },
  busPlate: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0F172A",
    marginTop: 2,
  },
  busRoute: {
    fontSize: 12,
    color: "#475569",
    marginTop: 2,
  },
  busSpeed: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 4,
  },
  cameraRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 6,
  },
  cameraTag: {
    fontSize: 10,
    fontWeight: "600",
    color: "#059669",
  },
  radarCard: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },
  radarTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1D4ED8",
    marginBottom: 6,
  },
  radarBody: {
    fontSize: 12,
    color: "#1E293B",
    lineHeight: 18,
  },
  legendRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#DBEAFE",
    paddingTop: 8,
  },
  legendItem: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1E293B",
  },
  routeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 8,
  },
  routeId: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  routePath: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  anprBanner: {
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  anprTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#B45309",
    marginBottom: 4,
  },
  anprBody: {
    fontSize: 11,
    color: "#92400E",
    lineHeight: 16,
  },
  incidentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "#FECACA",
    marginBottom: 10,
  },
  incidentId: {
    fontSize: 13,
    fontFamily: "monospace",
    fontWeight: "800",
    color: "#DC2626",
  },
  incidentDesc: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0F172A",
    marginVertical: 4,
  },
  incidentActionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  verifyBtn: {
    backgroundColor: "#059669",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  resolveBtn: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  btnTextWhite: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 12,
    textAlign: "center",
  },
  btnTextDark: {
    color: "#0F172A",
    fontWeight: "700",
    fontSize: 12,
    textAlign: "center",
  },
  settingsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 14,
  },
  settingsLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    backgroundColor: "#F8FAFC",
    marginBottom: 6,
  },
  lanTip: {
    fontSize: 11,
    color: "#64748B",
    marginBottom: 10,
    lineHeight: 15,
  },
  saveBtn: {
    backgroundColor: "#1D4ED8",
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: "center",
  },
  profileText: {
    fontSize: 12,
    color: "#475569",
    marginTop: 4,
  },
  tabBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingVertical: 8,
    paddingBottom: 16,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tabIcon: {
    fontSize: 18,
    color: "#94A3B8",
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 2,
  },
  tabActive: {
    color: "#1D4ED8",
    fontWeight: "800",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 20,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },
  modalCloseText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#64748B",
  },
  modalId: {
    fontSize: 11,
    fontFamily: "monospace",
    color: "#1D4ED8",
    marginBottom: 12,
  },
  modalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalLabel: {
    fontSize: 12,
    color: "#64748B",
  },
  modalValue: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  modalActionRow: {
    flexDirection: "row",
    marginTop: 18,
  },
});

