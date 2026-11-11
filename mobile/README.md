# UrbanSense AI — Mobile Companion Application (Expo / React Native)

**Problem ID**: SIH26124 • Bharat Electronics Limited (BEL)  
**Academic Requirement**: V/VI Semester Theme Based Project  
**Target Platform**: iOS / Android via Expo Go, Web Preview, and Native Emulators

---

## 1. Overview

The **UrbanSense Mobile Companion Application** provides field transit inspectors, fleet managers, and municipal road engineers with real-time situational awareness on iOS and Android devices. It connects directly to the UrbanSense AI FastAPI backend running on your Mac.

### Mobile Feature Matrix (All 12 Screens Supported):
1. **Login & Role Access**: One-tap demo role selection (Field Transit Inspector, Municipal Road Engineer, Central Fleet Manager).
2. **Command Centre Dashboard**: Live KPI cards (Buses Monitored, Potholes D40, Cracks D00/D10/D20, Vehicles Counted).
3. **Road Damage Alerts**: Real-time distress stream with severity tags and status filters.
4. **Event Details Inspector**: Modal inspector with pixel bounding boxes, confidence score, and review workflow actions.
5. **GIS Spatial Radar**: Telangana regional map coverage and transit corridor routes.
6. **Fleet & Buses Explorer**: 7 Telangana transit buses (`BUS-TG-101` to `BUS-TG-107`) with live speeds and license plates.
7. **Route Information**: 6 Telangana inter-city and metropolitan corridors (`ROUTE-TG-01` to `ROUTE-TG-06`).
8. **Video Upload & Camera Channel**: Dashcam ingestion triggers and channel assignments.
9. **Multi-Camera Channel Scanner**: Logical status for 5 camera channels (Front, Rear, Left, Right, Cabin).
10. **Incident Evidence Review**: Flagged critical potholes and road hazard verification queue.
11. **Notifications Stream**: Live event notification feed with timestamps.
12. **Settings & LAN Diagnostics**: Configurable `API_BASE_URL` with network diagnostics.

---

## 2. Installation & Quick Startup

### Prerequisites
- Node.js (v18+)
- Expo CLI: `npm install -g expo-cli` (or run with `npx expo`)
- Physical device: Install the **Expo Go** app from Apple App Store or Google Play Store.

### Step 1: Install Dependencies
From the `mobile/` directory:
```bash
cd mobile
npm install
```

### Step 2: Start the Expo Development Server
```bash
npx expo start
```

### Step 3: Run on Your Device
- **Physical iPhone / Android**: Scan the QR code displayed in the terminal using the Camera app (iOS) or Expo Go app (Android).
- **Web Preview**: Press **`w`** in the terminal to open the web preview in your browser.
- **iOS Simulator**: Press **`i`** (requires Xcode on macOS).
- **Android Emulator**: Press **`a`** (requires Android Studio).

---

## 3. Connecting to your Mac's FastAPI Backend

### Connecting from a Physical Phone
When running Expo Go on a physical phone, **do not use `http://localhost:8000`** because `localhost` on your phone points to the phone itself, not your Mac!

1. Find your Mac's local Wi-Fi IP address in Terminal:
   ```bash
   ipconfig getifaddr en0
   # Example output: 192.168.1.15
   ```
2. Open the **Settings** tab in UrbanSense Mobile.
3. Enter your Mac's IP address: `http://192.168.1.15:8000` (substitute your real IP).
4. Tap **Save & Reconnect**.
5. The mobile app will sync live with your Mac's FastAPI server, fetching real RDD2022 detections, bus coordinates, and metrics.

### Offline & Demo Fallback
If the phone is not on the same Wi-Fi network as the Mac, the mobile app automatically falls back to cached Telangana fleet records and verified RDD2022 road hazard data, ensuring a reliable college demonstration without unexpected network failures.

