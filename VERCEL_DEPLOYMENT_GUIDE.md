# UrbanSense AI — Public Deployment Guide (Vercel + Cloud Backend)

> **Project Title:** UrbanSense AI — AI-Powered Mobile Urban Intelligence Platform Using Public Transport Fleet  
> **Problem Statement ID:** SIH26124  
> **Target:** Live public demonstration URL for college guide and evaluators  

---

## 1. Architecture & Deployment Strategy

UrbanSense AI is structured as a decoupled full-stack architecture:

```
┌───────────────────────────────────────────────┐
│              PUBLIC USERS & EVALUATORS         │
│          https://urbansense-ai.vercel.app     │
└───────────────────────┬───────────────────────┘
                        │ HTTPS (API requests & video streams)
                        ▼
┌───────────────────────────────────────────────┐
│             VERCEL EDGE NETWORK               │
│  - React 18 + Vite SPA                        │
│  - Instant global CDN distribution            │
│  - Configured with SPA route rewrites         │
│  - Environment: VITE_API_BASE_URL             │
└───────────────────────┬───────────────────────┘
                        │ REST APIs / HTTP 206 Partial Content
                        ▼
┌───────────────────────────────────────────────┐
│          FASTAPI CLOUD BACKEND SERVICE        │
│       (Render.com / Railway.app / Fly.io)     │
│  - FastAPI REST Endpoints & WebSockets        │
│  - PyTorch YOLO11n AI Computer Vision Engine  │
│  - OpenCV Video Processing Pipeline           │
│  - SQLite Database (`urbansense.db`)          │
│  - Persistent Disk for videos & models        │
└───────────────────────────────────────────────┘
```

---

## 2. Step 1: Push Codebase to GitHub

UrbanSense AI includes a configured root `.gitignore` that protects private files, `.env` variables, database files, and large video files from being uploaded to GitHub.

Open your terminal in `/Users/ashrita/Projects/UrbanSense-AI`:

```bash
cd /Users/ashrita/Projects/UrbanSense-AI

# 1. Initialize git repository (if not already initialized)
git init

# 2. Add all files (respects .gitignore)
git add .

# 3. Create initial commit
git commit -m "feat: prepare UrbanSense AI for Vercel and cloud backend deployment"

# 4. Link your remote GitHub repository
# Replace <YOUR_GITHUB_USERNAME> and <REPO_NAME> with your details:
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/UrbanSense-AI.git
git branch -M main

# 5. Push to GitHub
git push -u origin main
```

---

## 3. Step 2: Deploy FastAPI Backend (Choose Option A or B)

Because the backend executes YOLO11n AI models and OpenCV video analysis, it requires a Python cloud runtime with at least **1 GB – 2 GB RAM**.

### Option A: Render.com (Recommended — Includes Blueprint)

1. Go to **[dashboard.render.com](https://dashboard.render.com/)** and sign in with GitHub.
2. Click **New +** → **Web Service**.
3. Select your **UrbanSense-AI** repository.
4. Configure the settings:
   - **Name:** `urbansense-backend`
   - **Region:** Singapore / Frankfurt / Oregon (nearest to you)
   - **Branch:** `main`
   - **Root Directory:** *(leave blank for repository root)*
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install -r requirements-prod.txt`
   - **Start Command:** `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type:** `Starter` ($7/mo) or `Standard` (2 GB RAM recommended for PyTorch inference).
5. Add **Environment Variables** in the Render dashboard:
   | Key | Value | Description |
   | :--- | :--- | :--- |
   | `PYTHON_VERSION` | `3.11.9` | Python runtime |
   | `YOLO_CONFIG_DIR` | `/tmp` | Writable cache for YOLO weights |
   | `ROAD_DAMAGE_MODEL_PATH` | `models/road_damage/best.pt` | RDD2022 trained model |
   | `CORS_ORIGINS` | `http://localhost:5173` | Local development access |
   | `CORS_ORIGIN_REGEX` | `^https://.*\.vercel\.app$` | **Allows all Vercel domains** |
6. *(Recommended)* Under **Disks**, add a persistent disk:
   - **Name:** `urbansense-data`
   - **Mount Path:** `/app/data`
   - **Size:** `5 GB`
7. Click **Create Web Service**.
8. Once built, copy your backend URL: e.g. **`https://urbansense-backend.onrender.com`**.
9. Test the backend in your browser by visiting:  
   `https://urbansense-backend.onrender.com/health`  
   You should see: `{"status":"HEALTHY","road_damage_model":{"status":"READY",...}}`.

---

### Option B: Railway.app

1. Go to **[railway.app](https://railway.app/)** and sign in with GitHub.
2. Click **New Project** → **Deploy from GitHub repo** → select `UrbanSense-AI`.
3. Railway automatically detects the included [`Dockerfile`](file:///Users/ashrita/Projects/UrbanSense-AI/Dockerfile).
4. In **Variables**, add:
   - `CORS_ORIGIN_REGEX`: `^https://.*\.vercel\.app$`
   - `YOLO_CONFIG_DIR`: `/tmp`
5. In **Settings** → **Networking** → Click **Generate Domain** (e.g. `urbansense-production.up.railway.app`).
6. Copy your generated URL.

---

## 4. Step 3: Deploy Frontend to Vercel

1. Go to **[vercel.com](https://vercel.com/)** and sign in with GitHub.
2. Click **Add New...** → **Project**.
3. Select your **UrbanSense-AI** repository and click **Import**.
4. In the **Configure Project** screen:
   - **Project Name:** `urbansense-ai` (or your preferred name)
   - **Framework Preset:** Select **`Vite`**
   - **Root Directory:** Click **Edit** and select **`frontend`** (Important!)
   - **Build and Output Settings:**
     - Build Command: `npm run build` (default)
     - Output Directory: `dist` (default)
     - Install Command: `npm install` (default)
5. Expand **Environment Variables**:
   - **Key:** `VITE_API_BASE_URL`
   - **Value:** Your deployed backend URL from Step 2 (e.g. `https://urbansense-backend.onrender.com` without a trailing slash).
6. Click **Deploy**.
7. Vercel will build the React application in ~30 seconds and provide your live URL:  
   **`https://urbansense-ai.vercel.app`**

---

## 5. Step 4: Verification & Testing Checklist

Once deployed, run through this verification checklist on your live Vercel URL:

- [ ] **Initial Page Load:** Open `https://your-app.vercel.app`. Verify the top header displays *UrbanSense AI*, *SIH26124*, and *BEL*.
- [ ] **Backend Health Connectivity:** Check the green status badge in the top right: `ROAD DAMAGE AI: READY` and `SYSTEM: ONLINE`.
- [ ] **Fleet Camera Command Centre:**
  - Navigate to **Fleet Cameras** tab in the sidebar.
  - Verify `BUS-TG-101` camera feed displays genuine 720p HD Indian bus dashcam footage.
  - Test playback: click **Play**, **Pause**, drag the **Seek Bar**, click **Replay**, and toggle **Fullscreen**.
  - Switch between **Original Dashcam Video** and **Annotated Output (AI Detections)**.
  - Verify detection counts: Road Surface Distress (potholes) and Traffic Elements (motorcycles, cars, pedestrians).
  - Click auxiliary channels (Rear, Left Kerb, Right Lateral, Cabin) and verify honest `SIMULATED SENSOR STANDBY` cards.
- [ ] **Interactive GIS Map:**
  - Navigate to **Spatial Map** tab.
  - Verify OpenStreetMap tiles load with transit bus pins (`BUS-TG-101` to `BUS-TG-107`).
  - Click a bus pin or hazard pin to inspect telemetry details.
  - Click **Simulate Bus Movement Tick** to verify real-time GPS updates.
- [ ] **Work Order Dispatch:**
  - Navigate to **Work Orders** tab.
  - Click **Inspect** or change order status from `PENDING` to `IN_PROGRESS`.
- [ ] **Direct Page Refresh / SPA Fallback:**
  - While on any tab, refresh the browser (`F5` or `Cmd+R`).
  - Verify the page reloads cleanly without a 404 error (handled by [`frontend/vercel.json`](file:///Users/ashrita/Projects/UrbanSense-AI/frontend/vercel.json)).

---

## 6. Local Development Continuity

Your local workflow remains completely unchanged and functional:

```bash
# Terminal 1: Backend
cd /Users/ashrita/Projects/UrbanSense-AI
.venv/bin/python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload

# Terminal 2: Frontend
cd /Users/ashrita/Projects/UrbanSense-AI/frontend
npm run dev
```

When `VITE_API_BASE_URL` is unset, the frontend automatically falls back to proxying `/api` and `/health` requests to `http://localhost:8000`.

---

## 7. Troubleshooting & Common Pitfalls

| Issue | Cause | Fix |
| :--- | :--- | :--- |
| **CORS Blocked in Browser** | Backend does not recognize the Vercel domain | Ensure `CORS_ORIGIN_REGEX=^https://.*\.vercel\.app$` is set in your backend environment variables, or add your exact Vercel domain to `CORS_ORIGINS`. |
| **Backend 503 / Sleeping (Cold Start)** | Render free tier spins down after 15 min | Wait 30 seconds for the container to wake up, or upgrade to Render Starter plan ($7/mo) to keep it warm 24/7. |
| **Video Playback Fails on Safari** | Byte-range requests not supported | The backend already implements HTTP 206 Partial Content range requests in [`backend/api/routes.py`](file:///Users/ashrita/Projects/UrbanSense-AI/backend/api/routes.py). Ensure the video URL points to the backend using HTTPS. |
| **Model Status NOT_READY** | `best.pt` file not found on backend | Verify `models/road_damage/best.pt` exists or set `ROAD_DAMAGE_MODEL_PATH` in backend environment variables. |

