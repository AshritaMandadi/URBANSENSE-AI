# UrbanSense AI

## Project Title
AI-Powered Mobile Urban Intelligence Platform Using Public Transport Fleet

## SIH Problem Statement
**SIH26124**

## Organization
**Bharat Electronics Limited (BEL)**

---

## 1. Project Overview
UrbanSense AI transforms public transport vehicles into intelligent mobile urban sensing units. By mounting computer vision systems on municipal bus fleets, urban transit corridors are continuously scanned for road infrastructure issues (potholes, cracks, surface defects) and traffic context. Location-tagged sensing events are generated and mapped onto an interactive GIS smart-city dashboard.

---

## 2. Technology Stack
- **AI & Computer Vision**: YOLO11n, PyTorch (Apple Silicon MPS accelerated), OpenCV
- **Backend**: FastAPI, SQLAlchemy, SQLite (production ready for PostgreSQL / PostGIS)
- **Frontend**: React 18, Vite, Leaflet, OpenStreetMap, Lucide React
- **Data & Ingestion**: Streaming frame-by-frame video processing optimized for 8 GB RAM

---

## 3. Architecture & Repository Structure

```
UrbanSense-AI/
├── ai_engine/                         # AI & Computer Vision Subsystem
│   ├── detection/
│   │   ├── detector.py                # BaseDetector & GeneralObjectDetector (YOLO11n)
│   │   ├── road_damage_detector.py    # RoadDamageDetector (RDD2022 4-class architecture)
│   │   └── test_yolo.py               # Hardware & MPS verification script
│   ├── models/
│   │   └── yolo11n.pt                 # Pretrained YOLO11n weights
│   └── video_processing/
│       ├── video_processor.py         # Memory-efficient streaming OpenCV processor
│       └── run_video_detection.py     # CLI execution entry point
├── backend/                           # FastAPI Application Subsystem
│   ├── api/
│   │   ├── routes.py                  # Fleet, events, video & analytics endpoints
│   │   └── schemas.py                 # Pydantic request & response schemas
│   ├── app/
│   │   └── main.py                    # FastAPI application, CORS & static mounting
│   ├── database/
│   │   ├── models.py                  # SQLAlchemy ORM models (Buses, Routes, Events, Videos)
│   │   ├── session.py                 # SQLite database engine & session dependency
│   │   └── seed.py                    # Initial transit fleet & labeled demo event seeder
│   └── services/
│       ├── event_service.py           # Structured event categorization & severity mapping
│       ├── gps_service.py             # Route waypoint telemetry & GPS simulation
│       └── video_service.py           # Video upload & AI pipeline orchestration
├── frontend/                          # React + Leaflet GIS Dashboard
│   ├── src/
│   │   ├── components/
│   │   │   ├── DashboardTab.jsx       # Executive KPI cards & recent event stream
│   │   │   ├── MapTab.jsx             # Interactive Leaflet GIS map with transit markers
│   │   │   ├── VideoTab.jsx           # Video upload, processing & playback
│   │   │   ├── EventsTab.jsx          # Searchable & filterable urban event table
│   │   │   └── AnalyticsTab.jsx       # Pavement defect & fleet distribution analytics
│   │   ├── App.jsx                    # Root dashboard application shell
│   │   ├── index.css                  # Smart-city dark/light UI theme
│   │   └── main.jsx                   # Vite React entry point
│   ├── index.html                     # Leaflet & typography setup
│   └── vite.config.js                 # Proxy config for FastAPI backend
├── data/
│   ├── urbansense.db                  # Local SQLite database
│   ├── videos/                        # Uploaded and annotated output videos
│   └── sample/                        # Test media fixtures
├── tests/
│   ├── test_backend.py                # API, database, GPS & event unit tests
│   ├── test_video_processing.py       # OpenCV streaming & YOLO inference tests
│   └── test_video_integration.py      # End-to-end upload & processing tests
├── requirements.txt                   # Backend dependencies
└── README.md
```

---

## 4. API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Runtime device status (Apple MPS/CPU) and API health |
| `GET` | `/api/buses` | Monitored public transit fleet with latest spatial coordinates |
| `GET` | `/api/gps/latest` | Real-time spatial coordinates for all buses |
| `POST`| `/api/gps/simulate/{bus_id}` | Trigger simulated telemetry progress tick for a transit bus |
| `GET` | `/api/events` | Filterable urban sensing events (`event_type`, `severity`, `bus_id`) |
| `GET` | `/api/events/{event_id}` | Detailed inspection for a specific urban event |
| `GET` | `/api/analytics/summary` | Aggregated executive KPIs, damage counts, and fleet metrics |
| `POST`| `/api/videos/upload` | Ingest road video (`.mp4`, `.mov`, `.avi`, `.mkv`) and probe metadata |
| `GET` | `/api/videos` | List all uploaded road recordings |
| `POST`| `/api/videos/{video_id}/process` | Trigger YOLO streaming detection pipeline |
| `GET` | `/api/videos/{video_id}/annotated` | Stream or download annotated output video with bounding boxes |
| `GET` | `/docs` | Interactive Swagger API documentation |

---

## 5. Startup & Execution Instructions

### A. Backend Execution
Activate the virtual environment and launch FastAPI with Uvicorn:
```bash
# From repository root
PYTHONPATH=. .venv/bin/uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```
- **Backend API**: `http://localhost:8000`
- **Interactive Swagger Docs**: `http://localhost:8000/docs`
- **Integrated Full Dashboard**: `http://localhost:8000/` (serves the pre-compiled React dashboard directly)

### B. Frontend Execution (Development Mode)
To run the React frontend with Vite hot-reloading:
```bash
cd frontend
npm run dev
```
- **Vite Development Server**: `http://localhost:5173` (proxies `/api` and `/health` to port `8000`)

### C. Running Automated Tests
```bash
# Run all unit and integration test suites
PYTHONPATH=. .venv/bin/python -m unittest discover tests -v
```

---

## 6. Road Damage Detection Model (RDD2022 Integration)
UrbanSense AI includes specialized detection for 4 distinct road hazard classes trained on the RDD2022 India dataset:
- `0`: `longitudinal_crack` (D00)
- `1`: `transverse_crack` (D10)
- `2`: `alligator_crack` (D20)
- `3`: `pothole` (D40)

### Deploying Custom Weights
When cloud GPU training (Google Colab / Kaggle) completes:
1. Download `best.pt`.
2. Place the weights at:
   ```bash
   cp /path/to/downloaded/best.pt models/road_damage/best.pt
   ```
   *(Or set `ROAD_DAMAGE_MODEL_PATH=/path/to/best.pt` in `.env`)*
3. Check readiness:
   ```bash
   curl http://localhost:8000/health
   # or
   curl http://localhost:8000/api/models/road-damage/status
   ```
   The model status transitions from `NOT_READY` to `READY`.

---

## 7. Hardware & Memory Optimization (Apple Silicon 8 GB RAM)
- **Streaming Frame Processing**: Video frames are decoded, inferred, annotated, and encoded strictly one frame at a time. The entire video is never accumulated in RAM.
- **Inference Mode**: Inference executes inside `torch.inference_mode()` with gradients disabled to minimize memory overhead.
- **MPS Device Fallback**: Automatically targets Apple Silicon `mps` acceleration when available, with automatic fallback to `cpu`.
- **Configurable Frame Stride**: The processing endpoint supports `--stride N` (default `2`) to balance processing throughput and thermals.
