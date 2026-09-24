# 12 — Development Roadmap

> **Reading time:** 8 minutes
> **Prerequisite:** [11-Data-Flow-End-To-End.md](11-Data-Flow-End-To-End.md)
> **After reading:** You'll understand the exact order in which to build every part of the project, why that order matters, and what each phase delivers.

---

## Roadmap Philosophy

Three rules govern the build order:

1. **Dependencies first** — Don't build the frontend until the API exists for it to call. Don't build the bot until the classification service exists.
2. **Vertical slices** — Each phase delivers something testable. Not "all models first, then all routes" — but "complaint model + route + service = a working endpoint."
3. **Infrastructure early** — Docker, CI/CD, and database setup happen first. Everything else depends on them.

---

## Phase Overview

| Phase | Weeks | Focus | What You Can Demo After |
|-------|-------|-------|------------------------|
| **1. Foundation** | 1–2 | Project setup + Core backend + Auth | "API is running, health check works, admin can log in, database has tables" |
| **2. Core API** | 3–4 | Complaint lifecycle + Worker APIs | "Complaints can be created, assigned, resolved via API" |
| **3. Intelligence** | 3–4 | AI/ML pipeline | "Image/text classification works, fraud detection runs" |
| **4. Interfaces** | 5–6 | Telegram bot + Frontend | "Citizen can report via bot, admin sees dashboard, worker sees tasks" |
| **5. Integration** | 7 | Full flow + Polish | "Complete end-to-end: citizen reports → AI classifies → worker resolves → citizen notified" |
| **6. DevOps & Cloud** | 8 | Deployment | "Running on AWS, accessible via HTTPS, CI/CD works" |
| **7. Hardening** | 9–10 | Testing + Logging + Security audit | "Tested, logged, documented, presentation-ready" |

---

## Phase 1 — Foundation (Weeks 1–2)

**Goal:** Get the project running. Database tables exist. API responds. Auth works.

### What to Build (In Order)

```
Week 1:
  □ Git repo setup (branching, .gitignore, README)
  □ Docker Compose with PostgreSQL + PostGIS, Redis, MinIO
  □ FastAPI skeleton (main.py, config.py, database.py)
  □ Health check endpoints (/health, /ready)
  □ SQLAlchemy models: citizen, complaint, worker, admin, complaint_log, triage_queue
  □ Alembic initial migration
  □ CI pipeline: GitHub Actions (lint + test on every PR)

Week 2:
  □ Pydantic schemas: auth (login request/response), complaint, worker, admin
  □ Auth service: JWT creation, bcrypt hashing, token validation
  □ Auth routes: POST /auth/admin/login, POST /auth/worker/login
  □ Auth dependencies: get_current_user, require_role
  □ CORS middleware
  □ Rate limiting middleware (slowapi)
  □ Seed script: create initial admin account
```

### Dependencies Between Tasks

```
Docker Compose ──► PostgreSQL running ──► SQLAlchemy models ──► Alembic migration
                                                                      │
                                              Pydantic schemas ◄──────┘
                                                    │
                                              Auth service ──► Auth routes
```

### What You Can Test After Phase 1
- `docker compose up -d` starts all services ✅
- `GET /health` returns `{"status": "healthy"}` ✅
- `POST /auth/admin/login` with valid credentials returns JWT ✅
- `GET /admin/dashboard/stats` without token returns 401 ✅
- CI pipeline runs lint + test on GitHub PR ✅

---

## Phase 2 — Core API (Weeks 3–4)

**Goal:** Complaint lifecycle works end-to-end via API. Workers can see and resolve tasks.

### What to Build (In Order)

```
Week 3:
  □ Complaint service: create, read, update status, track by code
  □ Complaint routes: POST /complaints, GET /complaints/{id}, GET /complaints/track/{code}
  □ File upload: utils/storage.py (MinIO upload, signed URLs)
  □ Tracking code generator: utils/tracking_code.py
  □ Routing service: map category → department
  □ SLA service: calculate deadline based on category

Week 4:
  □ Worker task routes: GET /workers/me/tasks, PATCH resolve, PATCH defer
  □ Task allocation service: scoring algorithm (4-factor weighted formula)
  □ Celery setup: worker + beat configuration
  □ Celery task: allocate_daily_tasks (Celery Beat, daily at 06:00)
  □ Celery task: check_sla (Celery Beat, hourly)
  □ Complaint log: auto-log every status change
  □ Admin routes: GET /dashboard/stats, GET /workers
```

### What You Can Test After Phase 2
- Create a complaint via POST → get tracking code ✅
- Retrieve complaint by tracking code ✅
- Assign complaint to worker → worker sees it in tasks ✅
- Worker resolves complaint → status changes to "resolved" ✅
- SLA check flags overdue complaints ✅
- Daily task allocation selects top 20 tasks per worker ✅

---

## Phase 3 — Intelligence (Weeks 3–4, parallel with Phase 2)

**Goal:** AI models work. Classification and fraud detection are functional.

> **Note:** This phase runs **in parallel** with Phase 2. Tushar (ML) works on model training while Sairaj (Backend) builds the API.

### What to Build (In Order)

```
ML Training (Google Colab — Tushar):
  □ Collect image dataset (200-500 images per category)
  □ Train MobileNetV2 image classifier (Colab notebook)
  □ Export model to .h5 file
  □ Collect text dataset (300-500 samples per category)
  □ Train DistilBERT text classifier (Colab notebook)
  □ Export model directory

Backend Integration (Sairaj):
  □ ml/image_classifier.py: load model, preprocess, predict
  □ ml/text_classifier.py: load model, tokenize, predict
  □ services/classification_service.py: orchestrate classification + confidence routing
  □ services/fraud_detection_service.py: NSFW check, EXIF, ELA, hash
  □ utils/image_protection.py: EXIF extraction, ELA analysis, perceptual hash
  □ Celery task: classify_complaint (async classification)
  □ Admin triage routes: GET /admin/triage, PATCH /admin/triage/{id}
  □ Triage queue logic: route low-confidence to admin
```

### What You Can Test After Phase 3
- Upload an image → MobileNetV2 returns category + confidence ✅
- Submit text → DistilBERT returns category + confidence ✅
- Confidence ≥ 70% → auto-classified ✅
- Confidence < 70% → appears in triage queue ✅
- NSFW image → rejected ✅
- Admin can review and reclassify triaged complaints ✅

---

## Phase 4 — Interfaces (Weeks 5–6)

**Goal:** Real user interfaces. Citizens report via Telegram. Admins see a dashboard. Workers see a task queue.

### What to Build (In Order)

```
Telegram Bot (Week 5 — Sairaj):
  □ Telegram webhook endpoint: POST /webhook/telegram
  □ Session service: Redis session management (create, read, update, TTL)
  □ Bot conversation flow: /report → image → classify → location → description → confirm
  □ Complaint tracking via bot: citizen sends tracking code → bot replies with status
  □ Notification service: send Telegram messages on status changes
  □ Celery task: send_notification (async Telegram messages)
  □ Webhook secret verification

Frontend (Weeks 5–6 — Sufiyan):
  □ Vue 3 + Vite + Bootstrap 5 project setup
  □ Router setup with auth guards (role-based)
  □ Pinia stores: authStore, complaintStore, workerStore
  □ API services: Axios base config, auth interceptors
  □ LoginView: role selector + login form
  □ AdminDashboard: StatsCards, CategoryChart, TrendChart
  □ AdminTriage: TriageQueue, TriageCard
  □ AdminWorkers: worker list, create worker form
  □ WorkerTaskQueue: TaskList, TaskCard (urgency badges)
  □ WorkerTaskDetail: complaint details, ResolveForm, DeferForm
  □ HotspotMap: Leaflet map with complaint markers
  □ CanvasViewer: secure image viewer (canvas, watermark)
  □ PWA setup: manifest.json, service worker
```

### What You Can Test After Phase 4
- Citizen reports complaint on Telegram → gets tracking code ✅
- Citizen checks status via Telegram → gets real-time update ✅
- Admin logs into dashboard → sees stats, charts, maps ✅
- Admin reviews triage queue → reclassifies complaint ✅
- Worker logs in → sees prioritized task queue ✅
- Worker resolves task → status updates ✅

---

## Phase 5 — Integration (Week 7)

**Goal:** Everything works together. End-to-end flow is complete.

### What to Build

```
  □ End-to-end flow: citizen reports → AI classifies → worker assigned → resolved → citizen notified
  □ Resolution notifications: Telegram message + proof photo to citizen
  □ Worker navigation: "Get Directions" button (opens phone maps app)
  □ Route optimization suggestion for workers
  □ Geographic hotspot endpoint: /admin/hotspots (PostGIS cluster analysis)
  □ Data export: GET /admin/export (CSV/Excel download)
  □ Edge case handling: timeouts, session expiry, error messages
  □ Image protection: canvas rendering, anti-screenshot, watermark
  □ Bug fixes from Phase 4 testing
```

### What You Can Test After Phase 5
- Complete flow from Telegram report to resolution notification ✅
- Hotspot map shows complaint density clusters ✅
- Admin exports data to CSV ✅
- Worker gets route optimization suggestion ✅
- All error cases handled gracefully ✅

---

## Phase 6 — DevOps & Cloud (Week 8)

**Goal:** The system is deployed and accessible on the internet.

### What to Build

```
  □ Optimize Dockerfiles (multi-stage builds, smaller images)
  □ Create docker-compose.prod.yml (production overrides)
  □ Nginx configuration (reverse proxy, SSL, static files)
  □ Set up AWS EC2 instance (free tier)
  □ Infrastructure script: setup-ec2.sh (install Docker, configure firewall)
  □ Deploy script: deploy.sh (pull, build, restart)
  □ Configure AWS S3 bucket (replace MinIO)
  □ Configure AWS SSM Parameter Store (replace .env)
  □ Set up Let's Encrypt SSL (Certbot)
  □ Configure domain (point to EC2 IP)
  □ Set Telegram webhook URL to production domain
  □ CD pipeline: auto-deploy on merge to main
  □ Smoke tests: verify health endpoint after deployment
```

### What You Can Test After Phase 6
- System is accessible at `https://yourdomain.com` ✅
- Telegram bot works with production webhook ✅
- Photos upload to S3 (not MinIO) ✅
- Merging to main auto-deploys to production ✅
- SSL certificate is valid ✅

---

## Phase 7 — Hardening (Weeks 9–10)

**Goal:** Production-quality. Tested, secure, documented, demo-ready.

### What to Build

```
Week 9 — Testing & Security:
  □ Unit tests for services (auth, complaint, classification, allocation)
  □ Integration tests for API endpoints
  □ Security audit: verify token expiry, CORS, rate limits
  □ Rate limit tuning (adjust based on real usage patterns)
  □ Error handling review (all routes return proper error responses)
  □ Structured JSON logging (python-json-logger)
  □ Log level configuration for production

Week 10 — Documentation & Demo:
  □ API documentation review (Swagger/OpenAPI auto-generated)
  □ Architecture documentation update
  □ README update with deployment instructions
  □ Demo preparation: script a walkthrough
  □ Performance testing: load test the API
  □ Final bug fixes
  □ Team retrospective
```

---

## Team Work Distribution by Phase

| Phase | Sairaj (Backend+DevOps) | Sufiyan (Frontend) | Tushar (ML) |
|-------|------------------------|-------------------|-------------|
| **1. Foundation** | Docker, FastAPI, models, auth, CI | — | — |
| **2. Core API** | Complaint API, worker API, Celery | — | — |
| **3. Intelligence** | ML integration, fraud detection | — | Train models on Colab |
| **4. Interfaces** | Telegram bot, notifications | Vue dashboard + worker portal | Model fine-tuning |
| **5. Integration** | End-to-end flow, edge cases | Polish UI, maps, export | — |
| **6. DevOps** | AWS, Nginx, SSL, CD pipeline | — | — |
| **7. Hardening** | Tests, logging, security audit | UI bug fixes | — |

### Critical Coordination Points

| When | Who | What to Align On |
|------|-----|-----------------|
| **Week 1** | Sairaj + Sufiyan | Define API contracts (request/response shapes) BEFORE frontend starts |
| **Week 3** | Sairaj + Tushar | Agree on model file format, loading interface, inference API |
| **Week 5** | Sairaj + Sufiyan | API endpoints ready for frontend integration |
| **Week 7** | All 3 | End-to-end testing, bug bash |

---

## What Already Exists (Current State)

Before starting Phase 1, here's what's already done:

| Item | Status | Notes |
|------|--------|-------|
| Git repo + `.gitignore` | ✅ Done | Repository exists on GitHub |
| `docker-compose.yml` | ✅ Done | All 6 services configured |
| `Dockerfile` (backend) | ✅ Done | Basic Python image |
| `Dockerfile` (frontend) | ✅ Done | Basic Node image |
| `requirements.txt` | ✅ Done | All dependencies listed |
| `.env.example` | ✅ Done | All environment variables documented |
| `Makefile` | ✅ Done | Common commands |
| FastAPI `main.py` | ✅ Done | App created, health checks, CORS |
| `config.py` | ✅ Done | All settings from `.env` |
| `database.py` | ✅ Done | Async engine + session |
| Folder structure | ✅ Done | All directories created |
| Models | 🔴 Stub only | Files exist with comments, no actual code |
| Schemas | 🔴 Empty | Directories exist, files don't |
| Services | 🔴 Stub only | Files exist with comments, no actual code |
| API routes | 🔴 Empty | Directory exists, no route files |
| Celery tasks | 🔴 Empty | Directory exists, no task files |
| Frontend | 🔴 Empty | Directory structure only, no components |
| ML models | 🔴 Not trained | Dataset directory exists |
| CI/CD | 🔴 Not configured | Workflow directory exists |

> **Translation:** The scaffolding is solid. Phase 1 starts by **filling in the stub files** with actual implementations, beginning with models and auth.

---

## Key Takeaways from This Document

1. **7 phases** over ~10 weeks, each building on the previous.
2. **Foundation first** — Docker, database, auth before anything else.
3. **Phase 2 and 3 run in parallel** — backend API and ML training happen simultaneously.
4. **Frontend starts in Phase 4** — only after API endpoints exist for it to call.
5. **Deployment is Phase 6** — local development for 7 weeks, then deploy.
6. **Testing and hardening are last** — but security basics (auth, CORS, rate limiting) are built from Day 1.
7. **Current state:** Strong scaffolding, no working code. Phase 1 begins by implementing the stub files.
8. **Critical sync:** API contracts must be agreed on in Week 1 before frontend development begins.

---

> **🎯 You've completed the Revamp Documentation.** Return to [00-START-HERE.md](00-START-HERE.md) to review the full reading list or begin Phase 1 implementation.
