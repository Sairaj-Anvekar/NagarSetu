# 🔧 Scope Reduction — Smart Grievance System

> **Instructions:** Review each item below. Mark your decision:
> - ✅ = Agree, cut/simplify this
> - ❌ = Disagree, keep as-is
> - ✏️ = Modify (add your notes)
>
> Once done, save this file and I'll update the project documentation accordingly.

---

## 🔴 CUT COMPLETELY (Remove from project)

| # | Feature | Why It's Overkill | Your Decision |
|---|---------|-------------------|---------------|
| C1 | **Fraud Detection 3-Gate Pipeline** (NSFW check, EXIF analysis, ELA, perceptual hash) | Enterprise-grade image forensics. Just use AI confidence threshold as the only gate. | ✅ / ❌ / ✏️ |
| C2 | **Image Protection** (canvas rendering, anti-screenshot JS, forensic watermark, tab-switch blanking, print block) | 6 layers of image DRM. Way beyond scope. Just use normal `<img>` tags with signed URLs. | ✅ / ❌ / ✏️ |
| C3 | **LLM Adapter Pattern** (Groq/Gemini/Ollama abstract provider interface) | Already marked "optional/future". Don't build the abstraction at all. | ✅ / ❌ / ✏️ |
| C4 | **Data Export** (CSV/Excel download endpoint) | Nice-to-have, not core. Can be added last if time permits. | ✅ / ❌ / ✏️ |
| C5 | **Route Optimization** for workers (`/workers/me/tasks/route`) | A simple "Get Directions" link to Google Maps is enough. No need to calculate optimized routes. | ✅ / ❌ / ✏️ |
| C6 | **PWA Offline Support** (service worker, Workbox caching, offline fallback) | Just make it a responsive web app. Skip the manifest, service worker, and offline mode. | ✅ / ❌ / ✏️ |
| C7 | **Carry-Forward Scoring Bonus** (10% weighted bonus for yesterday's incomplete tasks) | Simplify: just re-assign incomplete tasks the next day with no bonus math. | ✅ / ❌ / ✏️ |

---

## 🟡 SIMPLIFY (Keep the concept, reduce complexity)

| # | Feature | Current (Complex) | Proposed (Simple) | Your Decision |
|---|---------|-------------------|-------------------|---------------|
| S1 | **Complaint Categories** | 5 image-based + 5 text-based (8 unique with overlap) | **Drop to 4–5 total categories.** Example: Garbage, Pothole, Waterlogging, Streetlight, Water Supply. | ✅ / ❌ / ✏️ |
| S2 | **Task Allocation Algorithm** | 4-factor weighted scoring formula (priority 40%, elapsed 35%, queue 15%, carry-forward 10%) | **Simple priority + FIFO.** Sort by priority level, then by submission date. No formula needed. | ✅ / ❌ / ✏️ |
| S3 | **Admin JWT Auth** | 15-minute access token + 24-hour refresh token (two-token system with silent refresh) | **Single 24-hour token** — same as workers. One token type for everyone. | ✅ / ❌ / ✏️ |
| S4 | **Celery Beat Scheduled Tasks** | Hourly SLA check (automatic) + Daily task allocation (automatic at 6 AM) | **SLA check on-demand** (when dashboard loads). Task allocation via **manual admin button** ("Assign Today's Tasks"). | ✅ / ❌ / ✏️ |
| S5 | **Text Classifier (DistilBERT)** | Full transformer model fine-tuned on text data | **Keyword-based classification** — simple rules engine (if text contains "water"/"supply" → Water Supply category). No ML model needed for text. | ✅ / ❌ / ✏️ |
| S6 | **PostGIS Spatial Queries** | `ST_Distance`, `ST_Within`, `ST_DWithin` for worker assignment and hotspot maps | **Simple Haversine formula** in Python for distance calculation. Use regular PostgreSQL — skip PostGIS extension entirely. | ✅ / ❌ / ✏️ |
| S7 | **Worker Zones** (PostGIS Polygon) | Geographic polygon-based zone assignment for workers | **Department-based assignment.** Worker belongs to "Solid Waste" department → gets garbage complaints. No zones, no polygons. | ✅ / ❌ / ✏️ |
| S8 | **Hotspot Map** (Leaflet cluster analysis) | Full geographic heatmap with complaint density clusters | **Simple map with markers.** Show complaint locations as pins on a Leaflet map. No clustering or density analysis. | ✅ / ❌ / ✏️ |

---

## 🟢 KEEP AS-IS (Core to the project)

These are non-negotiable — they ARE the project:

| # | Feature | Why It's Core |
|---|---------|--------------|
| K1 | **Telegram Bot** for citizens | This is the primary interface — the "30-second complaint filing" USP. |
| K2 | **AI Image Classification** (MobileNetV2) | This is what makes it "smart". The core AI feature. |
| K3 | **FastAPI Backend** with JWT auth | The backbone of the entire system. |
| K4 | **Admin Dashboard** (stats + charts + triage queue) | Admins need to see data and handle low-confidence complaints. |
| K5 | **Worker Task Queue** (mobile web app) | Workers need to see and resolve tasks. |
| K6 | **Docker Compose** setup | Core DevOps learning objective. |
| K7 | **PostgreSQL** database | Core data storage. |
| K8 | **Redis** (for Celery broker + bot sessions) | Needed for background tasks and bot conversation state. |
| K9 | **Basic CI** (GitHub Actions — lint + test) | Core CI/CD learning objective. |
| K10 | **Complaint Lifecycle** (submit → classify → assign → resolve → notify) | The entire flow that connects all 3 users. |
| K11 | **Celery Worker** (for async classification + notifications) | Classification and Telegram notifications must be async. |
| K12 | **SLA Deadlines** (per category) | Accountability is a key project objective. |

---

## 📝 YOUR NOTES

> Add any additional things you want to cut, keep, or modify below:

```
(Write your notes here)


```

---

## ⏱️ Estimated Time Savings

If all 🔴 CUT and 🟡 SIMPLIFY items are accepted:

| Area | Weeks Saved |
|------|-------------|
| Fraud detection + image protection | ~2–3 weeks |
| DistilBERT → keyword matching | ~1 week |
| PostGIS → simple distance | ~1 week |
| Task allocation simplification | ~0.5 weeks |
| JWT simplification | ~0.5 weeks |
| PWA + route optimization | ~0.5 weeks |
| **Total estimated savings** | **~5–6 weeks** |

This brings the project from ~10 weeks of work down to ~4–5 weeks, leaving buffer for bugs, learning, and demo prep.
