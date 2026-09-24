# 03 — System Architecture Overview

> **Reading time:** 10 minutes
> **Prerequisite:** [02-Users-And-Journeys.md](02-Users-And-Journeys.md)
> **After reading:** You'll understand every major component of the system, what it does, and how they all connect.

---

## The Big Picture

The system has **5 layers**. Data flows from top to bottom:

```
Layer 1: USER INTERFACES (how users access the system)
         │
Layer 2: BACKEND API SERVER (processes all requests)
         │
Layer 3: BUSINESS LOGIC & AI (classification, routing, scoring)
         │
Layer 4: BACKGROUND TASKS (async work — notifications, SLA checks)
         │
Layer 5: DATA & STORAGE (database, cache, file storage)
```

Let's look at each layer.

---

## Layer 1 — User Interfaces

Three separate interfaces, all talking to the **same backend API**:

```
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│  CITIZEN          │   │  ADMIN            │   │  FIELD WORKER    │
│  Telegram Bot     │   │  Web Dashboard    │   │  Mobile PWA      │
│                  │   │  (Desktop-first)  │   │  (Mobile-first)  │
│  Tech: Telegram   │   │  Tech: Vue 3 +    │   │  Tech: Vue 3 +   │
│  Bot API          │   │  Bootstrap 5      │   │  Bootstrap 5     │
└────────┬─────────┘   └────────┬─────────┘   └────────┬─────────┘
         │                      │                      │
         │ Webhook              │ HTTPS                │ HTTPS
         │                      │                      │
         └──────────────────────┼──────────────────────┘
                                │
                                ▼
                    ┌────────────────────┐
                    │  BACKEND API       │
                    │  (FastAPI)         │
                    └────────────────────┘
```

**Important:** The Admin Dashboard and Worker Mobile PWA are the **same Vue 3 application** — one codebase. After login, the app checks the user's role and shows different views:
- Role = `admin` → Dashboard, charts, triage, worker management
- Role = `worker` → Task queue, resolve screen, navigation

---

## Layer 2 — Backend API Server

The backend is built with **Python + FastAPI**. It's the central hub — every request from every interface goes through it.

```
┌─────────────────────────────────────────────────────────────────┐
│                    FASTAPI BACKEND SERVER                        │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                     API ROUTES (Layer)                    │  │
│  │                                                          │  │
│  │  /api/v1/auth/*          → Login endpoints               │  │
│  │  /api/v1/complaints/*    → Complaint CRUD                │  │
│  │  /api/v1/workers/*       → Worker task operations        │  │
│  │  /api/v1/admin/*         → Dashboard, triage, management │  │
│  │  /api/v1/webhook/*       → Telegram webhook receiver     │  │
│  │  /api/v1/ml/*            → AI classification (internal)  │  │
│  │  /health, /ready         → Health checks                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                  │
│                              ▼                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                   SERVICES (Business Logic)              │  │
│  │                                                          │  │
│  │  auth_service         → JWT, password hashing            │  │
│  │  complaint_service    → Complaint lifecycle management   │  │
│  │  classification_svc   → AI classification orchestration  │  │
│  │  routing_service      → Department & worker assignment   │  │
│  │  task_allocation_svc  → Daily task scoring algorithm     │  │
│  │  notification_service → Telegram notifications           │  │
│  │  session_service      → Redis session for Telegram bot   │  │
│  │  sla_service          → SLA deadline tracking            │  │
│  │  fraud_detection_svc  → Fake image/complaint detection   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                  │
│                              ▼                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    MIDDLEWARE                             │  │
│  │                                                          │  │
│  │  CORS         → Controls which origins can call the API  │  │
│  │  Rate Limiter → Prevents brute-force attacks             │  │
│  │  Auth Guard   → Validates JWT tokens on protected routes │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

The backend follows a **clean 3-layer pattern**:
1. **API Routes** — Receive HTTP requests, validate input, call services, return responses.
2. **Services** — Contain all business logic. Never talk to HTTP directly.
3. **Models/Schemas** — Define database tables (SQLAlchemy) and request/response shapes (Pydantic).

---

## Layer 3 — AI/ML Module

The AI module lives **inside the backend** (not a separate service). It's loaded into memory when the backend starts.

```
┌──────────────────────────────────────────────────┐
│                   AI/ML MODULE                    │
│                                                   │
│  ┌──────────────────┐  ┌──────────────────────┐  │
│  │ Image Classifier │  │   Text Classifier    │  │
│  │ (MobileNetV2)    │  │   (DistilBERT)       │  │
│  │                  │  │                      │  │
│  │ Input: Photo     │  │ Input: Text          │  │
│  │ Output: Category │  │ Output: Category     │  │
│  │ + confidence %   │  │ + confidence %       │  │
│  │                  │  │                      │  │
│  │ 5 categories:    │  │ 5 categories:        │  │
│  │ - Garbage        │  │ - Streetlight        │  │
│  │ - Pothole        │  │ - Water Supply       │  │
│  │ - Waterlogging   │  │ - Encroachment       │  │
│  │ - Stray Animals  │  │ - Stray Animals      │  │
│  │ - Encroachment   │  │ - Admin Delay        │  │
│  └──────────────────┘  └──────────────────────┘  │
│                                                   │
│  ┌──────────────────────────────────────────────┐│
│  │ LLM Adapter (Optional / Future)              ││
│  │ Abstract interface → swap between providers: ││
│  │ Groq API / Gemini / Local Ollama             ││
│  └──────────────────────────────────────────────┘│
└──────────────────────────────────────────────────┘
```

**How classification works:**
- **Image received** → MobileNetV2 runs inference → returns category + confidence score
- **Text received** → DistilBERT runs inference → returns category + confidence score
- **Confidence ≥ 70%** → Auto-classify and route
- **Confidence < 70%** → Send to triage queue for admin review

**Where models are trained:** Google Colab (free GPU) using Jupyter notebooks.
**Where models are served:** Loaded into FastAPI at startup. Inference is a function call.

---

## Layer 4 — Background Tasks

Some work is too slow or too important for real-time HTTP requests. This work happens **asynchronously** via **Celery** (a Python task queue) with **Redis** as its message broker.

```
┌────────────────────────────────────────────────────────┐
│                  CELERY TASK QUEUE                       │
│                                                         │
│  ┌─────────────────────────────────┐                   │
│  │ classify_complaint              │  Triggered when:  │
│  │ Run AI classification on an     │  Citizen submits  │
│  │ image or text                   │  a complaint      │
│  └─────────────────────────────────┘                   │
│                                                         │
│  ┌─────────────────────────────────┐                   │
│  │ send_notification               │  Triggered when:  │
│  │ Send Telegram message to        │  A complaint is   │
│  │ citizen (status update,         │  resolved or      │
│  │ resolution notification)        │  status changes   │
│  └─────────────────────────────────┘                   │
│                                                         │
│  ┌─────────────────────────────────┐                   │
│  │ check_sla                       │  Scheduled:       │
│  │ Check all complaints for SLA    │  Runs every hour  │
│  │ violations, flag overdue ones   │  via Celery Beat  │
│  └─────────────────────────────────┘                   │
│                                                         │
│  ┌─────────────────────────────────┐                   │
│  │ allocate_daily_tasks            │  Scheduled:       │
│  │ Score all pending complaints,   │  Runs once daily  │
│  │ assign top 15-20 to each worker │  at shift start   │
│  └─────────────────────────────────┘                   │
└────────────────────────────────────────────────────────┘
```

**How Celery works in simple terms:**
1. The backend says "I need this task done" → pushes a message to Redis
2. A **Celery Worker** (separate process) picks up the message → does the work
3. The result is stored in Redis → the backend can check it later if needed

**Celery Beat** is a scheduler — it runs specific tasks at specific times (like a cron job).

---

## Layer 5 — Data & Storage

Three data stores, each for a different purpose:

```
┌──────────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  POSTGRESQL + POSTGIS │  │     REDIS         │  │   MINIO / S3     │
│                      │  │                  │  │                  │
│  Purpose:            │  │  Purpose:        │  │  Purpose:        │
│  Primary database    │  │  Cache + Queue   │  │  File storage    │
│                      │  │                  │  │                  │
│  Stores:             │  │  Stores:         │  │  Stores:         │
│  - Citizens          │  │  - Celery tasks  │  │  - Complaint     │
│  - Complaints        │  │  - Bot sessions  │  │    photos        │
│  - Workers           │  │  - Dashboard     │  │  - Resolution    │
│  - Admins            │  │    stats cache   │  │    photos        │
│  - Triage queue      │  │                  │  │                  │
│  - Complaint logs    │  │                  │  │                  │
│  - Geographic data   │  │                  │  │                  │
│  (PostGIS)           │  │                  │  │                  │
│                      │  │                  │  │                  │
│  Port: 5432          │  │  Port: 6379      │  │  Port: 9000/9001 │
└──────────────────────┘  └──────────────────┘  └──────────────────┘
```

### PostgreSQL + PostGIS
- **PostgreSQL** is the main relational database — stores all structured data.
- **PostGIS** is a geographic extension — enables location-based queries like "find the nearest worker to this complaint" or "show all complaints within 5km of this point".

### Redis
- **Celery message broker** — carries task messages between the backend and Celery workers.
- **Telegram bot sessions** — stores conversation state (which step the citizen is on, what data they've provided so far).
- **Dashboard stats cache** — caches expensive dashboard queries so they don't hit the database every time.

### MinIO (Local) → S3 (Production)
- Stores **photos** uploaded by citizens (complaint photos) and workers (resolution photos).
- **MinIO** runs locally in Docker — it's an S3-compatible storage server.
- In production, MinIO is replaced by **AWS S3** — same API, zero code changes.

---

## How All Components Connect

```
┌─────────────────────── USER INTERFACES ───────────────────────┐
│                                                                 │
│  Telegram Bot ──┐                                               │
│                 ├──► FastAPI Backend ──┬──► PostgreSQL + PostGIS │
│  Web Dashboard ─┤        │            │                         │
│  Mobile PWA ────┘   ┌────┴────┐       ├──► Redis                │
│                     │         │       │   (Cache + Celery)      │
│                     ▼         ▼       │                         │
│                  AI/ML     Celery     ├──► MinIO/S3              │
│                 Module     Worker     │   (Photos)               │
│               (Image +   (Background │                         │
│                Text       Tasks)     │                         │
│              Classifiers)            │                         │
└──────────────────────────────────────────────────────────────┘
```

### Data Flow Summary

| From | To | What |
|------|-----|------|
| Telegram → Backend | Webhook POST requests with citizen messages |
| Frontend → Backend | HTTPS API calls (GET, POST, PATCH) with JWT tokens |
| Backend → PostgreSQL | Read/write complaint, user, worker data |
| Backend → Redis | Push Celery tasks, store bot sessions, cache stats |
| Backend → MinIO/S3 | Upload/retrieve complaint and resolution photos |
| Backend → Celery Worker | Async tasks (classify, notify, SLA check) |
| Celery Worker → PostgreSQL | Update complaint status/category after classification |
| Celery Worker → Telegram API | Send messages to citizens (notifications) |
| Celery Beat → Celery Worker | Scheduled tasks (daily allocation, hourly SLA check) |

---

## Development vs. Production

| Component | Local Development | Production |
|-----------|-----------------|------------|
| All services | Docker Compose on your machine | Docker Compose on AWS EC2 |
| File storage | MinIO (Docker container) | AWS S3 |
| Secrets | `.env` file | AWS SSM Parameter Store |
| HTTPS | Not needed (localhost) | Nginx + Let's Encrypt SSL |
| Domain | `localhost:8000` (API), `localhost:5173` (frontend) | Your domain (e.g., `grievance.example.com`) |
| Frontend | Vite dev server (hot reload) | Built static files served by Nginx |

> **Key principle:** The code doesn't know if it's running locally or in production. Only environment variables change.

---

## Key Takeaways from This Document

1. The system has **5 layers**: Interfaces → API → Business Logic/AI → Background Tasks → Data Storage.
2. **FastAPI** is the central hub — all 3 interfaces (Telegram, Dashboard, Mobile PWA) talk to it.
3. The admin dashboard and worker portal are **one Vue 3 codebase** with role-based routing.
4. **AI classification** happens inside the backend — models are loaded at startup.
5. **Celery + Redis** handle async work: classification, notifications, SLA checks, daily task allocation.
6. **3 data stores**: PostgreSQL (structured data), Redis (cache + queue), MinIO/S3 (photos).
7. **PostGIS** enables geographic queries (nearest worker, hotspot maps).
8. **Local = Docker Compose**, **Production = Same Docker Compose on AWS EC2** + S3 + SSL.

---

> **Next:** [04-Tech-Stack.md](04-Tech-Stack.md) — Understand every technology used and why it was chosen.
