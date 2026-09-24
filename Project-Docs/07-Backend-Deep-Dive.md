# 07 — Backend Deep Dive

> **Reading time:** 12 minutes
> **Prerequisite:** [06-AI-ML-Pipeline.md](06-AI-ML-Pipeline.md)
> **After reading:** You'll understand the backend's folder structure, every module's responsibility, and how the layers interact.

---

## Backend Architecture Pattern

The backend follows a clean **3-layer architecture**:

```
┌──────────────────────────────────────────────┐
│  LAYER 1: API ROUTES                         │
│  Receive HTTP requests, validate input,      │
│  call services, return responses.            │
│  Never contain business logic.               │
├──────────────────────────────────────────────┤
│  LAYER 2: SERVICES                           │
│  All business logic lives here.              │
│  Never talk to HTTP directly.                │
│  Never import FastAPI objects.               │
├──────────────────────────────────────────────┤
│  LAYER 3: MODELS + SCHEMAS                   │
│  Models = database tables (SQLAlchemy)       │
│  Schemas = request/response shapes (Pydantic)│
│  Pure data definitions, no logic.            │
└──────────────────────────────────────────────┘
```

**Why this pattern matters:**
- **Testability** — Services can be tested without HTTP (no need to spin up a web server).
- **Reusability** — The same service can be called from an API route, a Celery task, or a management script.
- **Clarity** — When you need to fix a bug, you know exactly which layer to look at.

---

## Complete Folder Structure

```
backend/
├── app/
│   ├── __init__.py                  ← Makes 'app' a Python package
│   ├── main.py                      ← FastAPI app entry point
│   ├── config.py                    ← Settings loaded from environment
│   ├── database.py                  ← Database connection + session factory
│   │
│   ├── models/                      ← SQLAlchemy ORM models (database tables)
│   │   ├── __init__.py
│   │   ├── citizen.py               ← Citizen table
│   │   ├── complaint.py             ← Complaint table (the core table)
│   │   ├── worker.py                ← Worker table
│   │   ├── admin.py                 ← Admin table
│   │   └── triage.py                ← Triage queue table
│   │
│   ├── schemas/                     ← Pydantic request/response schemas
│   │   ├── __init__.py
│   │   ├── auth.py                  ← Login request/response shapes
│   │   ├── complaint.py             ← Complaint create/read/update shapes
│   │   ├── worker.py                ← Worker data shapes
│   │   └── admin.py                 ← Admin/dashboard data shapes
│   │
│   ├── api/                         ← Route handlers (HTTP endpoints)
│   │   ├── __init__.py
│   │   ├── deps.py                  ← Auth dependencies (get_current_user, require_role)
│   │   └── v1/                      ← API version 1
│   │       ├── __init__.py
│   │       ├── auth.py              ← Login/register/refresh endpoints
│   │       ├── complaints.py        ← Complaint CRUD endpoints
│   │       ├── workers.py           ← Worker task endpoints
│   │       ├── admin.py             ← Dashboard/triage/management endpoints
│   │       ├── telegram.py          ← Telegram webhook receiver
│   │       └── health.py            ← Health check endpoints
│   │
│   ├── services/                    ← Business logic layer
│   │   ├── __init__.py
│   │   ├── auth_service.py          ← JWT creation, password hashing, verification
│   │   ├── complaint_service.py     ← Complaint lifecycle management
│   │   ├── classification_service.py← AI classification orchestration
│   │   ├── fraud_detection_service.py← EXIF, ELA, hash, fraud scoring
│   │   ├── routing_service.py       ← Department & worker assignment
│   │   ├── notification_service.py  ← Telegram notification sending
│   │   ├── session_service.py       ← Redis session management for bot
│   │   ├── sla_service.py           ← SLA deadline tracking
│   │   └── task_allocation_service.py← Daily task scoring & allocation
│   │
│   ├── ml/                          ← AI/ML module
│   │   ├── image_classifier.py      ← MobileNetV2 inference
│   │   ├── text_classifier.py       ← DistilBERT inference
│   │   ├── llm_adapter.py           ← Abstract LLM interface
│   │   ├── providers/               ← LLM provider implementations
│   │   │   ├── base.py
│   │   │   ├── groq_provider.py
│   │   │   ├── gemini_provider.py
│   │   │   └── local_provider.py
│   │   └── models/                  ← Saved model weights
│   │
│   ├── tasks/                       ← Celery background tasks
│   │   ├── __init__.py
│   │   ├── classify_complaint.py    ← Async AI classification
│   │   ├── send_notification.py     ← Async Telegram messages
│   │   ├── check_sla.py             ← Periodic SLA violation check
│   │   └── allocate_daily_tasks.py  ← Daily task allocation at shift start
│   │
│   └── utils/                       ← Helper utilities
│       ├── __init__.py
│       ├── geo.py                   ← Geographic calculations (PostGIS helpers)
│       ├── storage.py               ← S3/MinIO file upload (signed URLs)
│       ├── image_protection.py      ← EXIF extraction, ELA, image hashing
│       └── tracking_code.py         ← Generate citizen-facing tracking codes
│
├── alembic/                         ← Database migration scripts
│   ├── env.py                       ← Alembic configuration
│   └── versions/                    ← Migration files (001_initial.py, etc.)
│
├── tests/                           ← Test suite
│   ├── unit/                        ← Unit tests (services, utils)
│   ├── integration/                 ← Integration tests (API endpoints)
│   └── conftest.py                  ← Shared test fixtures
│
├── Dockerfile                       ← Container image definition
├── requirements.txt                 ← Python dependencies
└── pyproject.toml                   ← Python project metadata
```

---

## File-by-File Breakdown

### Entry Points

#### `main.py` — FastAPI App Entry Point
The starting point of the entire backend. It:
- Creates the FastAPI application instance
- Configures CORS middleware
- Registers all API routers (routes for auth, complaints, workers, admin, telegram, health)
- Defines health check endpoints (`/health`, `/ready`)

```python
# What main.py does (simplified):
app = FastAPI(title="Smart Grievance System")
app.add_middleware(CORSMiddleware, ...)
app.include_router(auth.router, prefix="/api/v1/auth")
app.include_router(complaints.router, prefix="/api/v1/complaints")
# ... more routers
```

#### `config.py` — Application Settings
Loads all configuration from environment variables (`.env` file). Uses Pydantic's `BaseSettings` class which automatically reads from environment variables.

Settings include: database URL, Redis URL, JWT secrets, rate limits, ML confidence thresholds, CORS origins, Telegram bot token, task allocation weights, and more.

#### `database.py` — Database Connection
Creates the async database engine and session factory. Every database operation uses a session from this file.

---

### Models (Layer 3 — Database Tables)

Each file in `models/` defines a **SQLAlchemy model** — a Python class that maps to a database table.

| File | Table | Key Columns |
|------|-------|-------------|
| `citizen.py` | `citizen` | id, telegram_chat_id, telegram_username, phone_number, created_at |
| `complaint.py` | `complaint` | id, tracking_code, citizen_id, category, status, location (PostGIS), image_url, ai_confidence, priority, sla_deadline, assigned_worker_id, fraud_risk, fraud_flags |
| `worker.py` | `worker` | id, name, phone, department, pin_hash, assigned_zone (PostGIS), is_active |
| `admin.py` | `admin` | id, name, username, password_hash, role |
| `triage.py` | `triage_queue` | id, complaint_id, ai_confidence, suggested_category, admin_assigned_category, reviewed_by, status |

---

### Schemas (Layer 3 — Request/Response Shapes)

Each file in `schemas/` defines **Pydantic models** — Python classes that define what data looks like going in (requests) and coming out (responses) of the API.

| File | Purpose | Example Schemas |
|------|---------|-----------------|
| `auth.py` | Login and token shapes | `AdminLoginRequest(username, password)`, `WorkerLoginRequest(phone, pin)`, `TokenResponse(access_token, token_type)` |
| `complaint.py` | Complaint data shapes | `ComplaintCreate(description, latitude, longitude, ...)`, `ComplaintResponse(id, tracking_code, status, category, ...)` |
| `worker.py` | Worker data shapes | `WorkerCreate(name, phone, department)`, `WorkerTaskResponse(complaint_id, category, priority, ...)` |
| `admin.py` | Dashboard data shapes | `DashboardStats(total, resolved, pending, overdue)`, `TriageItem(complaint_id, ai_confidence, suggested_category)` |

**Key rule:** Schemas NEVER include sensitive fields in responses. `password_hash` and `pin_hash` are excluded from all response schemas.

---

### API Routes (Layer 1 — HTTP Endpoints)

Each file in `api/v1/` defines a **FastAPI router** with related endpoints.

#### `api/deps.py` — Shared Auth Dependencies
Contains `get_current_user()` and `require_role()` — reusable dependencies that authenticate and authorize every request.

#### `api/v1/auth.py` — Authentication Endpoints
| Endpoint | Method | What It Does |
|----------|--------|-------------|
| `/api/v1/auth/admin/login` | POST | Admin login → returns JWT tokens |
| `/api/v1/auth/admin/refresh` | POST | Refresh expired admin access token |
| `/api/v1/auth/worker/login` | POST | Worker login → returns JWT token |

#### `api/v1/complaints.py` — Complaint Endpoints
| Endpoint | Method | Who | What It Does |
|----------|--------|-----|-------------|
| `/api/v1/complaints` | POST | Bot (internal) | Create new complaint |
| `/api/v1/complaints/{id}` | GET | Worker/Admin | Get complaint details |
| `/api/v1/complaints/track/{code}` | GET | Bot (citizen) | Track by tracking code |
| `/api/v1/complaints/{id}/status` | PATCH | Worker | Update status |
| `/api/v1/complaints/{id}/resolve` | PATCH | Worker | Resolve with proof photo |

#### `api/v1/workers.py` — Worker Endpoints
| Endpoint | Method | Who | What It Does |
|----------|--------|-----|-------------|
| `/api/v1/workers/me/tasks` | GET | Worker | Get my daily task queue |
| `/api/v1/workers/me/tasks/route` | GET | Worker | Get optimized route for today |
| `/api/v1/workers/me/tasks/{id}` | PATCH | Worker | Update task status |
| `/api/v1/workers/me/tasks/{id}/defer` | PATCH | Worker | Defer task to next day (with reason) |

#### `api/v1/admin.py` — Admin Dashboard Endpoints
| Endpoint | Method | Who | What It Does |
|----------|--------|-----|-------------|
| `/api/v1/admin/dashboard/stats` | GET | Admin | Dashboard metrics |
| `/api/v1/admin/dashboard/trends` | GET | Admin | 7-day trend data |
| `/api/v1/admin/triage` | GET | Admin | Unclassified complaints queue |
| `/api/v1/admin/triage/{id}` | PATCH | Admin | Classify a triaged complaint |
| `/api/v1/admin/workers` | GET | Admin | Worker list + performance |
| `/api/v1/admin/workers` | POST | Admin | Create a new worker account |
| `/api/v1/admin/hotspots` | GET | Admin | Geographic hotspot data |
| `/api/v1/admin/export` | GET | Admin | Export data to CSV/Excel |

#### `api/v1/telegram.py` — Telegram Webhook
| Endpoint | Method | Who | What It Does |
|----------|--------|-----|-------------|
| `/api/v1/webhook/telegram` | POST | Telegram servers | Receives all incoming Telegram messages |

#### `api/v1/health.py` — Health Checks
| Endpoint | Method | What It Does |
|----------|--------|-------------|
| `/health` | GET | Basic alive check |
| `/ready` | GET | Readiness check (DB + Redis connectivity) |

---

### Services (Layer 2 — Business Logic)

This is where **all the logic lives**. Routes call services, services call models/schemas.

| Service | Responsibility |
|---------|---------------|
| **auth_service.py** | Create JWT tokens (access + refresh), hash passwords/PINs (bcrypt), verify credentials, refresh tokens |
| **complaint_service.py** | Create complaint, update status, track by code, get complaint details, log status changes to complaint_log |
| **classification_service.py** | Orchestrate AI classification — call image or text classifier, handle confidence thresholds, route to triage if needed |
| **fraud_detection_service.py** | Run 3-gate fraud pipeline: NSFW check → EXIF/ELA/hash analysis → score fraud risk |
| **routing_service.py** | Map category → department, find nearest worker in zone (PostGIS query), assign complaint to worker |
| **task_allocation_service.py** | Daily task scoring algorithm — score all pending complaints per worker using 4-factor weighted formula, select top 15–20, handle carry-forward |
| **notification_service.py** | Send Telegram messages to citizens — status updates, resolution notifications (with proof photo) |
| **session_service.py** | Manage Redis sessions for Telegram bot — create/read/update/delete session state, handle TTL, idle prompts |
| **sla_service.py** | Calculate SLA deadlines based on category, check for violations, flag overdue complaints |

---

### Utils (Helpers)

| Utility | What It Does |
|---------|-------------|
| **geo.py** | PostGIS helper functions — calculate distances, check if point is within polygon, format coordinates |
| **storage.py** | Upload/download files to MinIO/S3, generate signed URLs (time-limited), validate file types/sizes |
| **image_protection.py** | Extract EXIF metadata, run ELA (Error Level Analysis), compute perceptual image hash |
| **tracking_code.py** | Generate unique, human-readable tracking codes (e.g., `GRV-2026-A7X3`) |

---

### Tasks (Celery Background Jobs)

| Task | Trigger | What It Does |
|------|---------|-------------|
| **classify_complaint.py** | When a complaint is submitted | Run AI classification (image or text), update complaint with results, send result to citizen via bot |
| **send_notification.py** | When a complaint status changes | Send Telegram message to citizen with status update or resolution proof |
| **check_sla.py** | Celery Beat (every hour) | Scan all active complaints, flag those past their SLA deadline as overdue |
| **allocate_daily_tasks.py** | Celery Beat (daily at shift start) | Run scoring algorithm for each worker, assign top 15–20 tasks to their daily queue |

---

## How a Request Flows Through the Backend

**Example: Worker resolving a complaint**

```
1. Worker taps "Resolve" in Mobile PWA
   → Frontend sends: PATCH /api/v1/complaints/{id}/resolve
     with: { resolution_photo: <file>, note: "Pothole filled" }
     headers: Authorization: Bearer <jwt_token>

2. FastAPI receives the request
   → CORS middleware checks origin ✅
   → Rate limiter checks limits ✅

3. api/v1/complaints.py → resolve_complaint() route handler
   → Calls deps.py → require_role("worker") → validates JWT ✅
   → Extracts worker from token (role, zone)
   → Validates request body with Pydantic schema ✅

4. Route calls complaint_service.resolve()
   → Verifies complaint exists and is assigned to this worker
   → Calls storage.upload_file() to save resolution photo to MinIO/S3
   → Updates complaint: status="resolved", resolved_at=now, resolution_image_url=url
   → Creates complaint_log entry: action="resolved", performed_by="worker:ramesh"
   → Dispatches Celery task: send_notification(citizen_id, "resolved", photo_url)

5. Celery Worker picks up send_notification task
   → Loads citizen record → gets telegram_chat_id
   → Sends Telegram message: "Your complaint has been resolved!" + photo

6. Route returns 200 OK { complaint: updated_data }
```

---

## Key Takeaways from This Document

1. **3-layer architecture:** Routes (HTTP) → Services (logic) → Models/Schemas (data).
2. **Routes never contain business logic** — they only validate input, call services, and return responses.
3. **Services are reusable** — called from routes, Celery tasks, or scripts.
4. **9 services** handle all business logic: auth, complaints, classification, fraud, routing, task allocation, notifications, sessions, SLA.
5. **4 Celery tasks** handle async work: classify, notify, check SLA, allocate daily tasks.
6. **4 utilities** handle cross-cutting concerns: geo, storage, image protection, tracking codes.
7. **Pydantic schemas** validate every request/response and never expose sensitive fields.
8. **Auth dependencies** (`get_current_user`, `require_role`) protect every endpoint via FastAPI's dependency injection.

---

> **Next:** [08-Frontend-Deep-Dive.md](08-Frontend-Deep-Dive.md) — Understand the frontend folder structure, components, and views.
