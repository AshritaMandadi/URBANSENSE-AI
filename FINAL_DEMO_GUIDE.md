# UrbanSense AI — Comprehensive Demonstration & Technical Guide

**Project Title**: AI-Powered Mobile Urban Intelligence Platform Using Public Transport Fleet  
**Problem Statement ID**: SIH26124  
**Organisation**: Bharat Electronics Limited (BEL)  
**Project Guide**: C. Sireesha  
**Academic Requirement**: Theme Based Project (V / VI Semester)  
**Target Development Hardware**: Apple Silicon MacBook Air (8 GB Unified Memory, macOS)  
**Design Theme**: Dark Navy Sidebar (`#0B132B`) + White & Light Slate Canvas (`#F8FAFC`) with Royal Blue Accents (`#1D4ED8`)  
**Design Reference**: 13-Page System Architecture & UI Reference Specification (`Doc1.docx`)  
**Transit Network**: Telangana State Road Transport Corridors (Hyderabad, Secunderabad, Siddipet, Karimnagar, Warangal, Nalgonda, Suryapet, Khammam, Nizamabad, Adilabad, Mahabubnagar)

---

## 1. Executive Summary & Project Abstract

UrbanSense AI is an edge-AI onboard processing and centralized smart-city intelligence platform that transforms public transit buses into mobile urban sensing units. By utilizing video streams from multiple bus-mounted cameras, the platform continuously analyzes road surface infrastructure distress, monitors traffic flow and vehicle density, tracks pedestrian school-zone safety, and reviews potential safety incidents. Operating within tight thermal and memory envelopes on an 8 GB Apple Silicon MacBook Air, the system leverages Metal Performance Shaders (MPS), streaming OpenCV decoding, spatial IoU deduplication, RFC 7233 HTTP 206 byte-range streaming, and faststart MP4 container optimization. Telemetry is modeled across six verified Telangana transit corridors, preserving strict academic integrity through transparent data provenance (`is_simulated = True`).

---

## 2. Complete 19 Navigation Hubs Across 6 Operational Modules

Matching the 13-page reference specification (`Doc1.docx`), UrbanSense AI organizes all platform capabilities into 19 dedicated navigation hubs across 6 logical groups in the Dark Navy sidebar:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        URBANSENSE AI PLATFORM                          │
├────────────────────┬───────────────────────────────────────────────────┤
│ 1. OVERVIEW        │ 1. Command Centre                                 │
├────────────────────┼───────────────────────────────────────────────────┤
│ 2. FLEET           │ 2. Fleet Camera Command Centre (Multi-Perspective)│
│    OPERATIONS      │ 3. Fleet Management (7 Telangana Buses)           │
│                    │ 4. GIS Map (Real-time Spatial Tracking)           │
│                    │ 5. Route Intelligence (500m Linear Highway Chunks)│
├────────────────────┼───────────────────────────────────────────────────┤
│ 3. AI              │ 6. Video Monitoring (Dual-View AI Playback)       │
│    INTELLIGENCE    │ 7. Road Infrastructure Defects (4 RDD Classes)    │
│                    │ 8. Traffic Intelligence (Flow & Congestion)       │
│                    │ 9. Pedestrian Safety (Vulnerable Zone Analytics)  │
├────────────────────┼───────────────────────────────────────────────────┤
│ 4. MUNICIPAL       │ 10. Defect Registry (Comprehensive Event Ledger)   │
│    OPERATIONS      │ 11. Verification Centre (Cross-Corridor Consensus)│
│                    │ 12. Incident Management (Critical Hazard Triage)  │
│                    │ 13. Municipal Authority Dispatch (Work Orders)    │
├────────────────────┼───────────────────────────────────────────────────┤
│ 5. INSIGHTS        │ 14. Traffic Analytics (24h Corridors Profile)     │
│                    │ 15. City Analytics (Pavement Quality Index - PCI)  │
├────────────────────┼───────────────────────────────────────────────────┤
│ 6. ADMINISTRATION  │ 16. Admin Console (Role-Based Access Control)     │
│                    │ 17. Audit Logs (Immutable Action Trail)           │
│                    │ 18. System Settings (Runtime Lifecycle Config)    │
│                    │ 19. System Diagnostics (MPS GPU, Engine Runtimes) │
└────────────────────┴───────────────────────────────────────────────────┘
```

### Module Descriptions:
1. **Command Centre** (`/`): Executive macro-dashboard featuring KPI telemetry, active transit fleet radar, and real-time distress stream with severity triage.
2. **Fleet Camera Command Centre** (`camera-center`): Live 5-perspective camera feeds (Front Dashcam, Cabin Safety, Left Kerb, Right Lateral, Rear Traffic) with telemetry HUD, vehicle density counting, and unit diagnostics.
3. **Fleet Management** (`fleet`): Multi-vehicle registry detailing bus models, camera channels, operational speed, and simulated GPS telemetry.
4. **GIS Map** (`map`): Interactive Leaflet map with spatial layers for transit buses, road distress clusters, and corridor trajectories.
5. **Route Intelligence** (`routes`): 500-meter linear highway chainage chunks, Pavement Condition Index (PCI) health scoring, and defect hotspot analysis.
6. **Video Monitoring** (`videos`): Video ingestion studio, RFC 7233 progressive streaming player, and dual-view comparison (Original vs AI Annotated).
7. **Road Infrastructure Defects** (`road_infrastructure`): Deep dive into the 4 trained RDD2022 classes (D00, D10, D20, D40) with planned modular expansion slots.
8. **Traffic Intelligence** (`traffic`): Vehicle detection, congestion classification, and transit corridor flow analytics.
9. **Pedestrian Safety** (`pedestrians`): Footpath occupancy, school zone proximity detection, and vulnerable pedestrian tracking.
10. **Defect Registry** (`events`): Comprehensive searchable event ledger with CSV export and status updates.
11. **Verification Centre** (`verification`): Multi-bus consensus verification engine tracking spatial agreement across independent vehicle passes.
12. **Incident Management** (`incidents`): High-severity hazard triage queue with evidence review and status transition lifecycle.
13. **Municipal Authority Dispatch** (`dispatch`): Municipal work order management assigning verified defects to PWD Central, GHMC, and NHAI contractors.
14. **Traffic Analytics** (`traffic-analytics`): 24-hour congestion profiles, hourly sensing frequency, corridor comparisons, and detection confidence trends.
15. **City Analytics** (`analytics`): Municipal Priority Index (MPI) calculations and smart-city export reports.
16. **Admin Console** (`admin`): Municipal operator provisioning, password management, and role-based access control (`ADMIN`, `OPERATOR`, `ANALYST`, `VIEWER`).
17. **Audit Logs** (`audit`): Immutable tamper-evident audit trail capturing every operator status update and dispatch modification.
18. **System Settings** (`settings`): Runtime execution controls, capabilities checklist (REAL vs SIMULATED), and demo state seed triggers.
19. **System Diagnostics** (`diagnostics`): Hardware diagnostics, Apple Silicon Metal Performance Shaders (MPS) utilization, SQLite connection state, and YOLO11n weights verification.

---

## 3. Video Streaming Architecture & Browser Playback Engine (P0 Resolution)

### The Challenge
Standard OpenCV video processing scripts often write MP4 files that fail to play in modern web browsers (especially Apple Safari / WebKit):
1. **Atoms Ordering (`moov` at file end)**: OpenCV's `VideoWriter` writes the index table (`moov` atom) at the very end of the file after the raw video data (`mdat`). Web browsers require the `moov` atom at the beginning of the file to initialize video codecs and allow seeking before the entire video has downloaded.
2. **HTTP 206 Byte Ranges & RFC 7233 Strict Compliance**: Safari AVFoundation issues `Range: bytes=0-1` and `Range: bytes=0-` headers to probe media files. Returning `200 OK` with a `Content-Range` header violates RFC 7233/9110 and causes WebKit to immediately cancel media playback.
3. **Safari Initial `HEAD` Request Probe**: Safari sends an initial `HEAD` request to probe video content length and MIME type before sending `GET`. If the server returns `405 Method Not Allowed`, playback halts immediately.

### The UrbanSense AI Solution
1. **Native RFC 7233 Streaming**: Replaced custom streaming loops with Starlette's battle-tested `FileResponse(path, media_type="video/mp4")`, which handles HTTP 206 range requests, headers (`Accept-Ranges: bytes`, `Content-Range`), and full 200 responses strictly adhering to RFC specifications.
2. **Dual Method Handlers (`GET` and `HEAD`)**: Configured endpoints in `backend/api/routes.py` with `@router.api_route("/api/videos/{video_id}/stream", methods=["GET", "HEAD"])` and `/annotated`.
3. **Pure-Python MP4 Faststart Engine**: Implemented `optimize_mp4_for_web_streaming()` inside `ai_engine/video_processing/video_processor.py`. This engine parses the MP4 box hierarchy, relocates the `moov` atom ahead of `mdat`, and recalculates chunk offsets in `stco` and `co64` sample tables without external ffmpeg dependencies.
4. **H.264 FourCC Codec**: Output videos are written using `cv2.VideoWriter_fourcc(*'avc1')` ensuring full H.264 Level 4.1 hardware decoding compatibility.

---

## 4. Deep Learning Pipeline & RDD2022 Model Details

### YOLO11n Architecture Overview
The platform uses the state-of-the-art YOLO11 nano (`yolo11n.pt`) architecture, engineered for low-latency edge deployment:
- **Input Resolution**: $640 \times 640$ pixels, normalized and auto-padded.
- **Backbone**: Modified CSPDarknet with enhanced C3k2 blocks and SPPF (Spatial Pyramid Pooling - Fast).
- **Neck**: Path Aggregation Network (PANet) fusing multi-scale feature maps.
- **Head**: Decoupled anchor-free detection head separating classification and bounding box regression branches.
- **Loss Functions**: Complete IoU (CIoU) loss for spatial localization, Distribution Focal Loss (DFL) for box regression, and Binary Cross-Entropy (BCE) for multi-class classification.
- **Model Footprint**: 5.25 MB weights file (`models/road_damage/best.pt`), $2.6 \times 10^6$ parameters, $6.5\,\text{GFLOPs}$.
- **Trained Classes**:
  - `0: longitudinal_crack` (D00)
  - `1: transverse_crack` (D10)
  - `2: alligator_crack` (D20)
  - `3: pothole` (D40)
- **Validation Metrics**: $\approx 30.8\%$ mAP50 on the challenging RDD2022 India validation dataset split.

---

## 5. Spatio-Temporal Deduplication Algorithm

When a transit bus travels past a 1-meter pothole at $30\,\text{km/h}$ ($8.33\,\text{m/s}$), a 30 FPS camera captures the same defect across $15$ to $25$ consecutive video frames. Without deduplication, a single defect would trigger dozens of independent database records.

### Mathematical Formulation
Let detection at frame $t$ be $D_t = (c_t, s_t, B_t)$ where $c_t$ is class, $s_t$ is confidence, and $B_t = [x_1, y_1, x_2, y_2]$ is the bounding box.
For any existing active detection cluster $C_k$ logged at timestamp $\tau_k$ with bounding box $B_k$:
1. **Temporal Proximity Check**:
   $$\Delta t = |t - \tau_k| \le 1.5\,\text{seconds}$$
2. **Spatial Overlap Check**:
   $$\text{IoU}(B_t, B_k) = \frac{\text{Area}(B_t \cap B_k)}{\text{Area}(B_t \cup B_k)} \ge 0.20$$
3. **Cluster Merging**:
   If both conditions match and $c_t = c_k$, detection $D_t$ is treated as the same physical defect:
   $$s_k \leftarrow \max(s_k, s_t), \quad B_k \leftarrow B_t, \quad \tau_k \leftarrow t$$
   No new database record is inserted; the maximum observed confidence score is preserved.

---

## 6. End-to-End Verification & Test Suite

The platform includes a comprehensive automated test suite covering all backend APIs, database models, AI inference, and video streaming:

```bash
# Run all backend unit tests
.venv/bin/python -m unittest discover tests
```
**Test Results**:
- **42 Tests Executed**
- **42 Tests Passed (0 Failures, 0 Errors)**
- Execution Time: $\approx 6.0\,\text{seconds}$

### Frontend Production Build
```bash
cd frontend && npm run build
```
**Build Results**:
- Production build completes in **1.44 seconds**.
- All 19 navigation hubs, components, and CSS styles bundled cleanly.

---

## 7. Local Startup Commands

To start the complete platform locally:

```bash
# 1. Activate Virtual Environment & Start Backend (Port 8000)
source .venv/bin/activate
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload

# 2. In a separate terminal, Start Frontend (Port 5173)
cd frontend
npm run dev
```

- **Web Dashboard**: [http://localhost:5173/](http://localhost:5173/) or [http://localhost:8000/](http://localhost:8000/)
- **Swagger Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **System Health Diagnostics**: [http://localhost:8000/health](http://localhost:8000/health)
- **Road Damage AI Status**: [http://localhost:8000/api/models/road-damage/status](http://localhost:8000/api/models/road-damage/status)

---

## 8. Five-Minute Live Demonstration Walkthrough Script

| Timestamp | Screen / Navigation Tab | Spoken Narration Script | Key Technical Points Emphasized |
|:---|:---|:---|:---|
| **0:00 - 0:45** | **System Diagnostics & Health**<br>`http://localhost:8000/health` or Diagnostics Tab | "Good morning, respected evaluators and guide C. Sireesha ma'am. We present UrbanSense AI, developed for Problem ID SIH26124 by Bharat Electronics Limited. Before opening the operations console, we verify our system diagnostics. Our custom-trained YOLO11n weights are loaded from `models/road_damage/best.pt` with status READY, running natively on Apple Silicon Metal Performance Shaders (MPS)." | Hardware acceleration, custom weights verification, model readiness without crash fallback. |
| **0:45 - 1:30** | **Command Centre Dashboard**<br>Click 'Command Centre' tab | "This is our Command Centre, following our reference Dark Navy and Crisp Canvas specification. UrbanSense AI turns public transit buses into mobile edge-sensing nodes. Notice our KPI cards tracking monitored transit fleet, detected road issues, 500m linear corridors, emergency incidents, and multi-bus spatial consensus." | Bandwidth optimization ($99.98\%$ reduction), edge vs cloud calculation, urban fleet reuse. |
| **1:30 - 2:15** | **Fleet Camera Command Centre**<br>Click 'Camera Command' tab | "In the Fleet Camera Command Centre, we observe the multi-perspective sensing architecture: Front Dashcam, Cabin Safety, Left Kerb, Right Lateral, and Rear Traffic. Real-time telemetry overlays show GPS coordinates, speed, and unit health. Detections feed directly into our spatial defect registry." | Multi-camera sensor layout, edge streaming telemetry, live channel switching. |
| **2:15 - 3:00** | **Video Monitoring Dual-View**<br>Click 'Video Monitoring' tab | "Under Video Monitoring, we demonstrate our progressive streaming engine. Here is the raw bus camera footage streaming over RFC 7233 byte-ranges. Switching to the 'Annotated Output' tab, you see our YOLO11n model detecting potholes and cracks with bounding boxes and confidence scores, transcoded in browser-native H.264 `avc1` codec. Notice our 1.5-second Spatio-Temporal IoU deduplication prevents duplicate entries for the same pothole." | HTTP 206 range streaming, H.264 `avc1` FourCC, faststart atom re-ordering, IoU deduplication. |
| **3:00 - 3:45** | **Route Intelligence & GIS Map**<br>Click 'Route Intelligence' & 'GIS Map' tabs | "Navigating to Route Intelligence, the platform divides monitored highways into 500m linear chainage chunks, computing a Pavement Condition Index (PCI) for each segment. In our GIS Map, seven transit buses traverse verified Telangana State corridors—from Hyderabad to Siddipet, Warangal, and Nizamabad. Clicking any defect marker allows inspection and verification." | 500m linear chunks, PCI scoring, Leaflet mapping, Telangana transit corridors. |
| **3:45 - 4:30** | **Verification Centre & Municipal Dispatch**<br>Click 'Verification Centre' & 'Authority Dispatch' tabs | "In the Verification Centre, we solve a fundamental challenge in mobile sensing: spatial consensus. When multiple buses pass the same pothole, independent detection passes vote to verify the hazard. Once consensus is reached, the system automatically routes the defect to Municipal Authority Dispatch, generating work orders for PWD Central or GHMC road crews." | Multi-bus consensus voting, automated dispatch, municipal work order lifecycle. |
| **4:30 - 5:00** | **Admin, Audit Trail & Mobile Companion**<br>Click 'Audit Logs' tab & show `mobile/` | "Finally, the platform maintains an immutable audit trail of every operator action, compliant with municipal governance standards. For field supervisors, our companion Expo React Native mobile application provides real-time alerts on the move. UrbanSense AI is fully operational, verified across 42 unit tests, and ready for deployment." | Governance audit logs, Expo React Native mobile app, 42 passing tests, conclusion. |
