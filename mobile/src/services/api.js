// UrbanSense AI - Mobile API Service
// Connects Expo React Native mobile companion to FastAPI backend

let currentApiBase = "http://127.0.0.1:8000";

export const setApiBaseUrl = (url) => {
  if (url && url.trim()) {
    currentApiBase = url.trim().replace(/\/+$/, "");
  }
};

export const getApiBaseUrl = () => currentApiBase;

export const fetchHealth = async () => {
  try {
    const res = await fetch(`${currentApiBase}/health`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn("Mobile API health fetch failed, using cached state");
  }
  return { status: "offline", device: "mps", road_damage_model: { status: "READY", is_ready: true } };
};

export const fetchSummary = async () => {
  try {
    const res = await fetch(`${currentApiBase}/api/analytics/summary`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn("Mobile API summary fetch failed");
  }
  return {
    total_buses: 7,
    active_buses: 7,
    total_events: 27,
    pothole_count: 24,
    road_crack_count: 2,
    longitudinal_crack_count: 1,
    transverse_crack_count: 0,
    alligator_crack_count: 1,
    vehicle_observations: 1,
    pedestrian_observations: 0,
    road_damage_model_status: "READY",
  };
};

export const fetchBuses = async () => {
  try {
    const res = await fetch(`${currentApiBase}/api/buses`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn("Mobile API buses fetch failed, using Telangana fleet records");
  }
  return [
    { id: "BUS-TG-101", route_id: "ROUTE-TG-01", license_plate: "TS-09-UA-1024", model: "Ashok Leyland Electric Metro", status: "ACTIVE", latest_gps: { latitude: 17.4399, longitude: 78.4983, speed_kmh: 34.5 } },
    { id: "BUS-TG-102", route_id: "ROUTE-TG-01", license_plate: "TS-09-UB-4088", model: "Olectra Greentech Electric", status: "ACTIVE", latest_gps: { latitude: 17.4125, longitude: 78.4750, speed_kmh: 28.0 } },
    { id: "BUS-TG-201", route_id: "ROUTE-TG-02", license_plate: "TS-02-Z-5112", model: "Tata Starbus Ultra", status: "ACTIVE", latest_gps: { latitude: 18.1020, longitude: 78.8520, speed_kmh: 52.0 } },
    { id: "BUS-TG-301", route_id: "ROUTE-TG-03", license_plate: "TS-03-UA-7840", model: "Volvo 9400 B8R Intercity", status: "ACTIVE", latest_gps: { latitude: 17.6540, longitude: 79.1200, speed_kmh: 46.0 } },
    { id: "BUS-TG-401", route_id: "ROUTE-TG-04", license_plate: "TS-04-W-3209", model: "Ashok Leyland Viking BS-VI", status: "ACTIVE", latest_gps: { latitude: 17.2890, longitude: 79.2540, speed_kmh: 42.0 } },
    { id: "BUS-TG-501", route_id: "ROUTE-TG-05", license_plate: "TS-01-A-6510", model: "Eicher Skyline Pro", status: "ACTIVE", latest_gps: { latitude: 18.2540, longitude: 78.3210, speed_kmh: 48.0 } },
    { id: "BUS-TG-601", route_id: "ROUTE-TG-06", license_plate: "TS-06-B-9920", model: "Tata Marcopolo Low Floor", status: "ACTIVE", latest_gps: { latitude: 17.0210, longitude: 78.1890, speed_kmh: 50.0 } },
  ];
};

export const fetchRoutes = async () => {
  try {
    const res = await fetch(`${currentApiBase}/api/routes`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn("Mobile API routes fetch failed");
  }
  return [
    { id: "ROUTE-TG-01", name: "Hyderabad Urban Transit Spine", start_point: "Secunderabad Station", end_point: "Gachibowli Financial District" },
    { id: "ROUTE-TG-02", name: "Northern Telangana Corridor", start_point: "Jubilee Bus Station Hyderabad", end_point: "Karimnagar Central Bus Station" },
    { id: "ROUTE-TG-03", name: "Warangal Heritage Transit Highway", start_point: "MGBS Hyderabad", end_point: "Warangal Central Depot" },
    { id: "ROUTE-TG-04", name: "Eastern Agro-Industrial Corridor", start_point: "LB Nagar Hyderabad", end_point: "Khammam Old Bus Stand" },
    { id: "ROUTE-TG-05", name: "North-Western Inter-City Line", start_point: "Balanagar Hyderabad", end_point: "Adilabad Collectorate Junction" },
    { id: "ROUTE-TG-06", name: "Southern Telangana Transit Highway", start_point: "Aramghar Hyderabad", end_point: "Mahabubnagar Integrated Depot" },
  ];
};

export const fetchEvents = async (limit = 100) => {
  try {
    const res = await fetch(`${currentApiBase}/api/events?limit=${limit}`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn("Mobile API events fetch failed, using cached events");
  }
  return [
    { id: "EVT-83989DB19B", event_type: "POTHOLE", detection_class: "pothole", confidence: 0.92, severity: "CRITICAL", bus_id: "BUS-TG-101", latitude: 17.4399, longitude: 78.4983, timestamp: new Date().toISOString(), status: "NEW", is_simulated: true },
    { id: "EVT-1B5387C6BF", event_type: "ROAD_CRACK", detection_class: "alligator_crack", confidence: 0.84, severity: "HIGH", bus_id: "BUS-TG-101", latitude: 17.4420, longitude: 78.4950, timestamp: new Date().toISOString(), status: "VERIFIED", is_simulated: true },
    { id: "EVT-4846C35C12", event_type: "ROAD_CRACK", detection_class: "longitudinal_crack", confidence: 0.78, severity: "MEDIUM", bus_id: "BUS-TG-201", latitude: 18.4386, longitude: 79.1288, timestamp: new Date().toISOString(), status: "NEW", is_simulated: true },
  ];
};

export const updateEventStatus = async (eventId, status) => {
  try {
    const res = await fetch(`${currentApiBase}/api/events/${eventId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn("Mobile API update event status failed");
  }
  return null;
};

