# 📋 Smart Civic Grievance Platform — Complete Project Documentation

> **Version:** 2.0 — Consolidated  
> **Last Updated:** October 4, 2026  
> **Team:** Sairaj (Backend + DevOps + Cloud) · Sufiyan (Frontend) · Tushar (ML/AI)  
> **Status:** Planning & Architecture Complete · Implementation Starting

---

## Table of Contents

1. [Project Objectives](#1--project-objectives)
2. [Problem Statement & Vision](#2--problem-statement--vision)
3. [Users & Their Journeys](#3--users--their-journeys)
4. [System Architecture](#4--system-architecture)
5. [Tech Stack & Justification](#5--tech-stack--justification)
6. [Database Design](#6--database-design)
7. [Authentication & Security](#7--authentication--security)
8. [AI/ML Pipeline](#8--aiml-pipeline)
9. [Backend Deep Dive](#9--backend-deep-dive)
10. [Frontend Deep Dive](#10--frontend-deep-dive)
11. [Background Tasks & Scheduling](#11--background-tasks--scheduling)
12. [Infrastructure & DevOps](#12--infrastructure--devops)
13. [End-to-End Data Flow](#13--end-to-end-data-flow)
14. [Development Roadmap](#14--development-roadmap)
15. [Current Project Status](#15--current-project-status)
16. [AI Use Guidelines](#16--ai-use-guidelines)

---

# 1 — Project Objectives

## 🎯 Primary Objectives

| # | Objective | Success Criteria |
|---|-----------|-----------------|
| **O1** | **Digitize & automate civic grievance resolution** | Citizens can file, track, and receive resolution updates for complaints entirely through digital channels — zero physical visits required. |
| **O2** | **Reduce complaint resolution time by 60%+** | AI-powered auto-classification, automated worker assignment, and SLA tracking bring average resolution time under 24 hours for critical categories. |
| **O3** | **Achieve 70%+ AI classification accuracy** | MobileNetV2 (images) and DistilBERT (text) classifiers reach ≥70% accuracy across civic complaint categories, with a human fallback triage system for low-confidence predictions. |
| **O4** | **Provide full transparency & accountability** | Every complaint has a tracking code, real-time status updates, an auditable log trail, and proof-of-resolution photos sent directly to the citizen. |
| **O5** | **Enable data-driven municipal governance** | Admin dashboard provides real-time analytics — category breakdowns, geographic hotspot maps, worker performance metrics, and 7-day trends. |

## 🔧 Technical Objectives

| # | Objective | Success Criteria |
|---|-----------|-----------------|
| **T1** | **Build a production-grade, containerized microservice system** | All services (backend, database, cache, storage, task queue) run via Docker Compose with one command — identical across dev and production. |
| **T2** | **Implement a complete CI/CD pipeline** | Every pull request triggers automated lint, test, and build checks via GitHub Actions. Merging to `main` auto-deploys to production. |
| **T3** | **Deploy to cloud on free-tier infrastructure** | The full system runs on AWS EC2 (free tier) with S3 for storage, Nginx for reverse proxy/SSL, and SSM for secret management — $0 operating cost. |
| **T4** | **Apply industry-standard security practices** | JWT-based auth with role-based access control, bcrypt password hashing, Nginx rate limiting, CORS, webhook verification, NSFW content filtering, and signed URLs for image access. |
| **T5** | **Implement geospatial intelligence** | PostGIS-powered spatial queries for "nearest worker" assignment, zone-based task routing, and complaint density hotspot maps. |
| **T6** | **Build a real-time task allocation engine** | A weighted scoring algorithm (priority 40%, elapsed time 35%, queue position 15%, carry-forward 10%) dynamically assigns 15–20 tasks per worker daily. |

## 📚 Learning Objectives

| # | Domain | What We Learn |
|---|--------|---------------|
| **L1** | **DevOps** | Docker, Docker Compose, multi-container orchestration, health checks, hot reload, volume management |
| **L2** | **Cloud** | AWS EC2, S3, SSM Parameter Store, security groups, Nginx, Let's Encrypt SSL, free-tier constraints |
| **L3** | **CI/CD** | GitHub Actions workflows, automated testing, linting, build verification, continuous deployment |
| **L4** | **Software Engineering** | Clean architecture (3-layer), ORM patterns, async programming, background tasks, API design, state management |
| **L5** | **ML Integration** | Model training (Colab), model serving (FastAPI), confidence-based routing, NSFW filtering |
| **L6** | **Full-Stack Development** | FastAPI backend, Vue 3 frontend, Telegram Bot API, responsive design |

---

# 2 — Problem Statement & Vision

## The Problem

In Indian cities, civic issues like **overflowing garbage, potholes, waterlogged streets, broken streetlights, contaminated water, stray animals, and illegal encroachments** affect millions of people daily.

The current systems for reporting these problems are fundamentally broken:

### For Citizens
- You have to **physically visit a ward office** and stand in queues to file a complaint.
- Most people simply give up — the friction is too high.
- The complaints that *are* filed get **lost in paperwork**.
- There is **no tracking** — you have no idea if anyone is even looking at your complaint.
- There is **no transparency** — you never hear back.

### For Municipal Workers
- Workers receive task assignments with **vague descriptions** and **no location data**.
- They waste time trying to find the exact problem location.
- There's **no priority system** — a critical sewage overflow sits equally next to a minor paint chip.
- Tasks get lost or forgotten across shifts.

### For Government Administrators
- Administrators have **zero visibility** into what's happening across the city.
- They can't see which areas have the most complaints, which categories are surging, or which workers are overloaded.
- All decisions are based on **guesswork**, not data.
- There's **no accountability** — no SLA deadlines, no performance tracking.

### The Result
Citizens lose trust. Problems fester. Municipal bodies look incompetent — even when individual workers are trying their best.

---

## Our Solution

A **Smart Civic Grievance Platform** that makes it:
- **Effortless** for a citizen to report a problem
- **Intelligent** for the government to resolve it

The platform connects **three types of users** through one unified system:

| User | How They Use It | What They Get |
|------|----------------|---------------|
| 🧑‍🤝‍🧑 **Citizen** | Telegram Bot (messaging) | Report a problem in 30 seconds — photo + location + description. Track status anytime. |
| 👷 **Field Worker** | Mobile Web App (PWA) | A prioritized daily task queue with photos, descriptions, exact GPS navigation, and easy resolution submission. |
| 🏛️ **Administrator** | Web Dashboard (PWA) | Real-time analytics, category breakdowns, geographic hotspot maps, worker performance, and manual triage. |

---

## What Makes It "Smart"

1. **Image Recognition** — Citizen sends a photo of garbage → the system automatically knows it's garbage.
2. **Text Understanding** — Citizen types "streetlights not working on MG Road" → the system classifies it as a streetlight issue.
3. **Automatic Department Routing** — Based on the classification, the complaint goes to the right department.
4. **Smart Worker Assignment** — The system finds the nearest worker in the complaint's zone and adds it to their daily task queue.
5. **Priority Scoring** — A weighted scoring algorithm ensures critical and overdue complaints are handled first.
6. **Confidence Safety Net** — When the AI isn't confident (below 70%), the complaint goes to a human admin for manual classification.

---

## The Complaint Categories

### 📸 Image-Based Categories (3 categories — classified from photos via MobileNetV2)

| Category | Example | Responsible Department | Resolution Target |
|----------|---------|----------------------|-------------------|
| Solid Waste & Garbage | Garbage dump on street | Solid Waste Management | 24–48 hours |
| Potholes & Road Damage | Large pothole on road | Roads & Public Works | 48–72 hours |
| Waterlogging & Drainage | Flooded road after rain | Stormwater & Drainage | 24 hours |

### 📝 Text-Based Categories (5 categories — classified from descriptions via DistilBERT)

| Category | Example Description | Responsible Department | Resolution Target |
|----------|-------------------|----------------------|-------------------|
| Streetlight & Power Outage | "Streetlights not working on MG Road" | Municipal Electrical Wing | 24–48 hours |
| Water Supply & Contamination | "No water supply since morning" | Water Supply Board | 24 hours |
| Illegal Encroachment | "Hawkers blocking the footpath" | Town Planning & Encroachment | 5–7 days |
| Stray Animals & Pest Control | "Aggressive stray dogs near school" | Public Health & Veterinary | 48 hours |
| Administrative Delay & Conduct | "Bribe demanded at ward office" | Vigilance & Grievance Cell | 7 days |

### Fallback — When the AI Isn't Sure
If the AI's confidence is **below 70%**, the complaint is tagged as **"Unclassified"** and sent to a **manual triage queue** for an admin to review and assign the correct category.

---

## What Makes This Different from Traditional Systems

| Traditional System | Our Platform |
|-------------------|-------------|
| Visit a government office | Report from Telegram in 30 seconds |
| Paper forms, manual classification | AI auto-classifies from photo or text |
| No tracking, no transparency | Real-time status tracking via chat |
| Manual worker dispatch | Automatic assignment to nearest worker |
| No proof of resolution | Resolution photo sent to citizen |
| No data, no analytics | Live dashboard with trends & hotspots |
| Complaints lost in the system | SLA deadlines with automatic escalation |
| One-size-fits-all | 8 categories (3 image + 5 text) routed to the right department |

---

## Project Context

| Aspect | Detail |
|--------|--------|
| **Type** | College semester project (Sem 3) |
| **Team size** | 3 members |
| **Timeline** | ~10 weeks (60–70 days) |
| **Budget** | Zero — everything runs on free tiers |
| **Primary learning goal** | Cloud/DevOps through building a real project |
| **Approach** | Treated as a real industry project, not a toy prototype |

---

# 3 — Users & Their Journeys

## 🧑‍🤝‍🧑 Citizen Journey — "Report a problem in 30 seconds"

### The Interface: Telegram Bot
Citizens don't install any app. They use **Telegram** — a messaging app already on their phone.

### Step-by-Step Journey

```
Step 1:  Citizen opens Telegram bot → sends /report
Step 2:  Bot asks: "📸 Please send a photo of the issue"
Step 3:  Citizen sends a photo
Step 4:  Bot says: "📷 Analyzing your image…" (AI classifies in background)
Step 5:  Bot responds: "Classified as: 🗑️ Solid Waste & Garbage"
Step 6:  Bot asks: "📍 Please share your location" (one-tap GPS)
Step 7:  Bot asks: "📝 Please describe the issue briefly"
Step 8:  Bot shows summary → Citizen confirms ✅
Step 9:  Bot responds: "✅ Registered! Tracking code: GRV-2026-A7X3"
```

### After Submission
- Check status anytime with tracking code
- Auto-notified when resolved: **"Resolved by Field Worker X under [Department]"** + proof photo

### Text-Only Complaints
Not all complaints are visual. If a citizen types a description without sending a photo (e.g., "No water supply since morning"), the AI uses **text classification** instead of image classification.

### Key Design Decisions
| Decision | Reasoning |
|----------|-----------|
| **Telegram, not a custom app** | No installation friction. Telegram is widely used. |
| **AI classification during conversation** | Immediate feedback on how the system understood the issue. |
| **GPS location, not typed address** | One tap, precise coordinates. No vague addresses. |
| **Tracking code** | Simple, memorable code for status checks. |

---

## 👷 Field Worker Journey — "Know exactly where to go and what to fix"

### The Interface: Mobile Web App
Workers access a mobile-optimized web app from their phone browser. No app store needed.

### Step-by-Step Journey

```
Step 1:  Worker logs in (Phone number + 4-digit PIN)
Step 2:  Sees daily task queue (15–20 tasks, color-coded urgency)
         🔴 URGENT  |  🟡 DUE SOON  |  🟢 NORMAL
Step 3:  Taps "Get Directions" → phone navigation opens
Step 4:  Arrives at site, fixes the issue
Step 5:  Taps "Resolve" → takes proof photo + adds note
Step 6:  Complaint marked resolved → citizen auto-notified
```

### Task Queue Scoring Algorithm

| Factor | Weight | What It Means |
|--------|--------|---------------|
| **Priority** | 40% | Critical complaints score highest |
| **Elapsed Time** | 35% | Complaints near SLA deadline rise to top |
| **Queue Position** | 15% | Earlier submissions get slight FIFO edge |
| **Carry-Forward** | 10% | Yesterday's incomplete tasks get bonus |

### Carry-Forward Rules
- Worker marks task as "Cannot Complete" with a reason
- Next day, task re-enters scoring pool with 10% carry-forward bonus
- If carried forward 3+ times → automatic escalation to admin

### Key Design Decisions
| Decision | Reasoning |
|----------|-----------|
| **Mobile PWA, not native app** | No app store, instant updates. |
| **4-digit PIN login** | Quick field login. Security via rate limiting. |
| **24-hour JWT token** | One login per day. |
| **15–20 tasks/day cap** | Prevents worker overload. |
| **Color-coded urgency** | Instant visual prioritization. |

---

## 🏛️ Administrator Journey — "See the full picture, act on data"

### The Interface: Web Dashboard PWA (Desktop-first)
Admins use a desktop-optimized web dashboard — charts, maps, tables, and management tools.

### Admin Capabilities

| Feature | What It Does |
|---------|-------------|
| **Live Metrics** | Total complaints, resolved today, pending, overdue, avg resolution time |
| **Category Breakdown** | Visual charts — distribution across 8 complaint categories |
| **Trend Analysis** | 7-day trend — are complaints increasing or decreasing? |
| **Hotspot Map** | Geographic map showing where complaints cluster (Leaflet + OpenStreetMap) |
| **Triage Queue** | Complaints where AI confidence < 70% — admin manually assigns category |
| **Worker Performance** | Tasks assigned vs. completed per worker |
| **Worker Management** | Create worker accounts, assign zones, reset PINs, deactivate workers |

### Key Design Decisions
| Decision | Reasoning |
|----------|-----------|
| **Desktop-first layout** | Admins work on office computers. Dashboard needs wide charts and tables. |
| **Username + password login** | Admins have elevated privileges — stronger credentials. |
| **JWT token strategy** | ⏳ Pending decision — either single 24-hour token or 15-min access + refresh. |
| **Manual triage** | AI isn't perfect. Human review ensures no complaint is misrouted. |

---

## How the Three Users Connect

```
  CITIZEN                    SYSTEM                      WORKER
  📱 Reports via Telegram
         │
         ▼
                        🧠 AI classifies (image/text)
                        🏢 Routes to correct department
                        📍 Finds nearest worker in zone
                        📊 Scores & adds to worker's daily queue
                                                    │
                                                    ▼
                                              👷 Sees it in task list
                                              🗺️ Navigates to location
                                              ✅ Resolves + uploads proof
                                                    │
                        📊 Dashboard updates    ◄───┘
         │
         ▼
  🔔 Citizen gets notification:
  "Resolved!" + proof photo

                              ADMIN
                        🏛️ Monitors everything on dashboard
                        ├─ Reviews triage queue
                        ├─ Tracks worker performance
                        ├─ Views hotspot maps
                        ├─ Manages worker accounts & zones
                        └─ Views hotspot maps
```

---

# 4 — System Architecture

## The Big Picture — 5 Layers

```
Layer 1: USER INTERFACES (Telegram Bot · Admin Dashboard · Worker PWA)
         │
Layer 2: BACKEND API SERVER (FastAPI — processes all requests)
         │
Layer 3: BUSINESS LOGIC & AI (classification, routing, scoring)
         │
Layer 4: BACKGROUND TASKS (FastAPI BackgroundTasks + APScheduler)
         │
Layer 5: DATA & STORAGE (PostgreSQL · Redis · MinIO/S3)
```

---

## Layer 1 — User Interfaces

Three interfaces, all talking to the **same backend API**:

```
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│  CITIZEN          │   │  ADMIN            │   │  FIELD WORKER    │
│  Telegram Bot     │   │  Web Dashboard    │   │  Mobile PWA      │
│  (Telegram API)   │   │  (Desktop-first)  │   │  (Mobile-first)  │
│                   │   │  Vue 3 +          │   │  Vue 3 +         │
│                   │   │  Bootstrap 5      │   │  Bootstrap 5     │
└────────┬──────────┘   └────────┬──────────┘   └────────┬─────────┘
         │ Webhook               │ HTTPS                 │ HTTPS
         └───────────────────────┼───────────────────────┘
                                 ▼
                     ┌────────────────────┐
                     │  BACKEND API       │
                     │  (FastAPI)         │
                     └────────────────────┘
```

> **Important:** Admin Dashboard and Worker Mobile PWA are the **same Vue 3 application** — one codebase. Role-based routing shows different views.

---

## Layer 2 — Backend API Server

```
┌─────────────────────────────────────────────────────────────┐
│                    FASTAPI BACKEND SERVER                     │
│                                                               │
│  API ROUTES:                                                  │
│    /api/v1/auth/*       → Login endpoints                     │
│    /api/v1/complaints/* → Complaint CRUD                      │
│    /api/v1/workers/*    → Worker task operations              │
│    /api/v1/admin/*      → Dashboard, triage, management       │
│    /api/v1/webhook/*    → Telegram webhook receiver           │
│    /health, /ready      → Health checks                       │
│                                                               │
│  SERVICES (Business Logic):                                   │
│    auth_service · complaint_service · classification_svc      │
│    routing_service · task_allocation_svc · notification_svc   │
│    session_service · sla_service · nsfw_check_svc             │
│                                                               │
│  MIDDLEWARE:                                                  │
│    CORS · Auth Guard (JWT)                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Layer 3 — AI/ML Module

Lives **inside the backend** (not a separate service). Loaded into memory at startup.

```
┌──────────────────────────────────────────────────┐
│                   AI/ML MODULE                    │
│                                                   │
│  Image Classifier (MobileNetV2)                  │
│    Input: Photo → Output: Category + confidence   │
│    3 categories: Garbage, Pothole, Waterlogging   │
│                                                   │
│  Text Classifier (DistilBERT)                    │
│    Input: Text → Output: Category + confidence    │
│    5 categories: Streetlight, Water Supply,       │
│                  Encroachment, Stray Animals,     │
│                  Admin Delay                      │
│                                                   │
│  NSFW Filter (opennsfw2)                         │
│    Blocks unsafe/inappropriate image uploads      │
└──────────────────────────────────────────────────┘
```

---

## Layer 4 — Background Tasks (FastAPI BackgroundTasks + APScheduler)

```
┌───────────────────────────────────────────────────┐
│           BACKGROUND TASK SYSTEM                   │
│                                                    │
│  FastAPI BackgroundTasks (fire-and-forget):         │
│    classify_complaint   (triggered on submission)  │
│    send_notification    (triggered on status Δ)    │
│                                                    │
│  APScheduler (recurring jobs, in-process):          │
│    check_sla            (scheduled: every hour)    │
│    allocate_daily_tasks  (scheduled: daily 6 AM)   │
└───────────────────────────────────────────────────┘
```

> **Why not Celery?** BackgroundTasks + APScheduler run inside the FastAPI process — no extra containers needed. Simpler architecture, less RAM on EC2.

---

## Layer 5 — Data & Storage

| Store | Purpose | Stores | Port |
|-------|---------|--------|------|
| **PostgreSQL + PostGIS** | Primary database | Citizens, Complaints, Workers, Admins, Logs, Triage queue, Geographic data | 5432 |
| **Redis** | Bot sessions | Telegram bot conversation state | 6379 |
| **MinIO → S3** | File storage | Complaint photos, Resolution photos | 9000/9001 |

---

## Development vs. Production

| Component | Local Development | Production |
|-----------|-----------------|------------|
| All services | Docker Compose on your machine | Docker Compose on AWS EC2 |
| File storage | MinIO (Docker container) | AWS S3 |
| Secrets | `.env` file | AWS SSM Parameter Store |
| HTTPS | Not needed (localhost) | Nginx + Let's Encrypt SSL |
| Frontend | Vite dev server (hot reload) | Built static files served by Nginx |

> **Key principle:** The code doesn't know if it's running locally or in production. Only environment variables change.

---

# 5 — Tech Stack & Justification

## At a Glance

| Layer | Technologies |
|-------|-------------|
| **Backend** | Python 3.11+, FastAPI, SQLAlchemy 2.0, Alembic, APScheduler, Redis |
| **Frontend** | Vue 3 (Composition API), Bootstrap 5, Vite, Pinia, Chart.js, Leaflet |
| **AI/ML** | MobileNetV2, DistilBERT, TensorFlow/Keras, Google Colab |
| **Database** | PostgreSQL 16 + PostGIS |
| **Infrastructure** | Docker, Docker Compose, GitHub Actions, Nginx |
| **Cloud** | AWS EC2 (Free Tier), S3, SSM |

---

## Backend Technologies

| Technology | Why Chosen | Why Not Alternatives |
|-----------|-----------|---------------------|
| **Python 3.11+** | Single language for backend + AI/ML. Gentlest learning curve. | Node.js requires JS/TS — language switching with ML stack. |
| **FastAPI** | Modern, async, auto-generates API docs (Swagger), type-safe with Pydantic. | Django too heavy for API-only. Flask too minimal — no validation/docs. |
| **SQLAlchemy 2.0** | Industry-standard ORM. Modern async support. Prevents SQL injection. | — |
| **Alembic** | Versioned database migrations. Essential for team development. | — |
| **Celery + Redis** | Background task queue. Redis serves 3 roles (broker, sessions, cache). | RabbitMQ more complex. Redis already needed for other jobs. |
| **passlib + python-jose** | bcrypt hashing + JWT tokens. Industry standard. | — |
| **slowapi** | Rate limiting. Critical for 4-digit PIN brute-force protection. | — |

## Frontend Technologies

| Technology | Why Chosen | Why Not Alternatives |
|-----------|-----------|---------------------|
| **Vue 3 (Composition API)** | Intuitive templates, reactive primitives. One codebase for admin + worker. | React requires more boilerplate. Vue's SFCs more beginner-friendly. |
| **Bootstrap 5** | Ready-made responsive components. Cards, tables, badges, modals. | Tailwind requires learning utility-first paradigm. |
| **Vite** | Lightning-fast dev server. Official Vue 3 tooling. | — |
| **Pinia** | Official Vue 3 state manager. Lightweight, modular. | Replaces Vuex (Vue 2's manager). |
| **Chart.js + vue-chartjs** | Bar, line, pie charts for admin dashboard. | — |
| **Leaflet** | Free, open-source maps. No API key needed (OpenStreetMap). | — |
| **Axios** | Clean HTTP client. Built-in interceptors for JWT attachment and refresh. | — |

## AI/ML Technologies

| Technology | Why Chosen |
|-----------|-----------|
| **MobileNetV2** | ~3.4M parameters. Runs on CPU. Perfect for 3 visually distinct categories. |
| **DistilBERT** | 66M parameters. 60% faster than full BERT. Accurate enough for 5-class text. |
| **TensorFlow / Keras** | Simpler API for fine-tuning. Native on Google Colab. Loading MobileNetV2 is 3 lines. |
| **Google Colab** | Free GPU for training. No local hardware needed. |

## Database Technologies

| Technology | Why Chosen |
|-----------|-----------|
| **PostgreSQL 16** | Industry gold standard. Relational + JSONB + full-text search + PostGIS. |
| **PostGIS** | Spatial queries: nearest worker (`ST_Distance`), zone routing (`ST_Within`), hotspots (`ST_DWithin`). |
| **Redis 7** | In-memory K/V store. Used for Telegram bot session state management. |
| **MinIO → S3** | S3-compatible API. Same `boto3` code for local and production. One env var to switch. |

## Infrastructure Technologies

| Technology | Why Chosen |
|-----------|-----------|
| **Docker + Docker Compose** | Isolated containers. One-command startup. Eliminates "it works on my machine". |
| **GitHub Actions** | CI/CD — auto lint, test, build on every PR. Free for public repos. |
| **Nginx** | Reverse proxy, SSL termination, static file serving in production. |
| **Let's Encrypt + Certbot** | Free HTTPS certificates. Auto-renewal. Required for Telegram webhooks. |
| **AWS EC2 + S3 + SSM** | 12-month free tier. ~40% industry market share. Most job-relevant cloud. |

---

## Technology Dependencies Map

```
Python 3.11+
├── FastAPI (web framework)
│   ├── SQLAlchemy 2.0 (ORM) → PostgreSQL + PostGIS
│   ├── Pydantic (validation) → schemas for API + config
│   ├── python-jose (JWT) → authentication
│   ├── passlib (bcrypt) → password/PIN hashing
│   ├── boto3 → MinIO / S3 file storage
│   └── python-telegram-bot → Telegram Bot API
├── APScheduler → scheduled tasks (SLA check, daily allocation)
├── TensorFlow/Keras → AI models (MobileNetV2, DistilBERT)
└── Alembic → database migrations

Vue 3
├── Vite (build tool)
├── Bootstrap 5 (styling + components)
├── Pinia (state management)
├── Vue Router 4 (routing + auth guards)
├── Chart.js + vue-chartjs (charts)
├── Leaflet (maps)
└── Axios (HTTP client → talks to FastAPI)

Docker + Docker Compose → orchestrates all services
GitHub Actions → CI/CD pipeline
Nginx → reverse proxy (production)
```

---

# 6 — Database Design

## Overview — 6 Tables

| Table | What It Stores | Expected Records |
|-------|---------------|-----------------|
| `citizen` | Citizens who interact with the Telegram bot | Hundreds–thousands |
| `complaint` | Every complaint filed by any citizen | Grows daily (core table) |
| `worker` | Municipal field workers | Small (tens) |
| `admin` | Administrator accounts | Very small (1–5) |
| `complaint_log` | History of every action on a complaint | Many rows per complaint |
| `triage_queue` | Complaints where AI wasn't confident enough | Subset of complaints |

---

## Table-by-Table Breakdown

### 1. `citizen`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | Primary Key | Unique identifier |
| `telegram_chat_id` | String | Unique, Not Null | Telegram's chat ID — primary identity |
| `telegram_username` | String | Nullable | Optional Telegram username |
| `phone_number` | String | Nullable | Optional phone number |
| `created_at` | Timestamp | Not Null, Default: now | First interaction time |

> Citizens are auto-created on first bot interaction. No manual registration.

### 2. `complaint` — The Core Table

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Unique identifier |
| `tracking_code` | String | Unique, Not Null | Human-readable code (e.g., `GRV-2026-A7X3`) |
| `citizen_id` | UUID | FK → citizen.id | Who filed this complaint |
| `category` | String | Nullable | Classified category (null if not yet classified) |
| `department` | String | Nullable | Responsible department (set after classification) |
| `description` | String | Nullable | Citizen's text description |
| `image_url` | String | Nullable | URL to complaint photo in MinIO/S3 |
| `resolution_image_url` | String | Nullable | URL to resolution proof photo |
| `latitude` | Float | Nullable | GPS latitude |
| `longitude` | Float | Nullable | GPS longitude |
| `location` | Geometry(Point) | Nullable | PostGIS geometry for spatial queries |
| `status` | String | Not Null, Default: "submitted" | Current status (see lifecycle below) |
| `ai_confidence` | Float | Nullable | AI confidence score (0.0 to 1.0) |
| `ai_classification_source` | String | Nullable | "image", "text", or "manual" |
| `priority` | String | Default: "medium" | "critical", "high", "medium", "low" |
| `nsfw_flagged` | Boolean | Default: false | Whether NSFW check flagged this image |
| `sla_deadline` | Timestamp | Nullable | Resolution deadline |
| `created_at` | Timestamp | Not Null, Default: now | Filing time |
| `resolved_at` | Timestamp | Nullable | Resolution time |
| `assigned_worker_id` | UUID | FK → worker.id, Nullable | Assigned worker |
| `carry_forward_reason` | String | Nullable | Why worker couldn't complete |
| `carry_forward_count` | Integer | Default: 0 | Number of carry-forwards |

#### Complaint Status Lifecycle

```
submitted → classified → assigned → in_progress → resolved
                │                        │
                ▼                        ▼
           triage_pending            deferred
           (AI confidence            (worker can't
            too low)                  complete today)
```

| Status | Meaning |
|--------|---------|
| `submitted` | Filed. Processing hasn't started. |
| `classified` | AI has classified into a category. |
| `triage_pending` | AI confidence too low. Awaiting admin review. |
| `assigned` | Worker assigned to handle this complaint. |
| `in_progress` | Worker has acknowledged and is working on it. |
| `deferred` | Worker couldn't complete today (with reason). Re-scored tomorrow. |
| `resolved` | Worker submitted resolution proof. Complaint closed. |

### 3. `worker`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Unique identifier |
| `name` | String | Not Null | Worker's full name |
| `phone` | String | Unique, Not Null | Phone number (login username) |
| `department` | String | Not Null | Department (e.g., "Solid Waste Management") |
| `pin_hash` | String | Not Null | bcrypt hash of 4-digit PIN |
| `assigned_zone` | Geometry(Polygon) | Nullable | Geographic responsibility area |
| `is_active` | Boolean | Default: true | Admin can deactivate |

### 4. `admin`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Unique identifier |
| `name` | String | Not Null | Admin's full name |
| `username` | String | Unique, Not Null | Login username |
| `password_hash` | String | Not Null | bcrypt hash of password |
| `role` | String | Default: "admin" | Extensible to "supervisor" etc. |

### 5. `complaint_log` — Audit Trail

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Unique identifier |
| `complaint_id` | UUID | FK → complaint.id | Which complaint |
| `action` | String | Not Null | What happened (e.g., "submitted", "resolved") |
| `performed_by` | String | Not Null | Who did it (e.g., "system", "worker:ramesh") |
| `details` | String | Nullable | Additional context |
| `created_at` | Timestamp | Not Null, Default: now | When it occurred |

### 6. `triage_queue`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Unique identifier |
| `complaint_id` | UUID | FK → complaint.id | Which complaint needs review |
| `ai_confidence` | Float | Not Null | AI confidence score (below 70%) |
| `suggested_category` | String | Nullable | AI's best guess |
| `admin_assigned_category` | String | Nullable | Admin's actual assignment |
| `reviewed_by` | UUID | FK → admin.id, Nullable | Reviewing admin |
| `reviewed_at` | Timestamp | Nullable | Review time |
| `status` | String | Default: "pending" | "pending" or "reviewed" |

---

## Table Relationships

```
citizen ──── 1:Many ──── complaint
                              │
                              ├── 1:Many ──── complaint_log
                              ├── 1:One  ──── triage_queue (if AI confidence < 70%)
                              │
worker ──── 1:Many ───────────┘ (assigned_worker_id)

admin ──── 1:Many ──── triage_queue (reviewed_by)
```

---

## PostGIS — Geographic Data

| Table | Column | Geometry Type | What It Represents |
|-------|--------|--------------|-------------------|
| `complaint` | `location` | Point | GPS coordinates of complaint |
| `worker` | `assigned_zone` | Polygon | Worker's geographic responsibility area |

### Spatial Queries Enabled

| Query | SQL Function | Use Case |
|-------|-------------|---------|
| Nearest worker to complaint | `ST_Distance()` | Worker assignment |
| Complaint inside worker's zone? | `ST_Within()` | Zone-based routing |
| All complaints within 2km | `ST_DWithin()` | Hotspot detection |

---

# 7 — Authentication & Security

## Three Auth Methods

| User | Method | Token | Session |
|------|--------|-------|---------|
| 🧑‍🤝‍🧑 **Citizen** | Telegram sends `chat_id` with every message | None needed | Telegram IS the auth layer |
| 👷 **Worker** | Phone + 4-digit PIN → JWT | 24-hour access token | One login per day |
| 🏛️ **Admin** | Username + password → JWT | ⏳ Token strategy pending | ⏳ Pending decision |

---

## JWT Token Comparison

| Property | Admin | Worker |
|----------|-------|--------|
| **Algorithm** | HS256 | HS256 |
| **Login credential** | Username + Password | Phone + 4-Digit PIN |
| **Access token expiry** | ⏳ Pending (24-hour or 15-min + refresh) | 24 hours |
| **Refresh token** | ⏳ Pending | No (not needed) |
| **Token payload** | `{sub, role: "admin", exp}` | `{sub, role: "worker", zone, exp}` |

---

## Role-Based Access Control (RBAC)

| Endpoint | Citizen (Telegram) | Worker | Admin |
|----------|-------------------|--------|-------|
| Create complaint | ✅ via bot | ❌ | ❌ |
| Track complaint by code | ✅ via bot | ✅ own tasks | ✅ all |
| View my tasks | ❌ | ✅ | ❌ |
| Resolve a complaint | ❌ | ✅ own tasks | ❌ |
| View dashboard stats | ❌ | ❌ | ✅ |
| View/classify triage queue | ❌ | ❌ | ✅ |
| Create/manage worker accounts | ❌ | ❌ | ✅ |

RBAC enforced via FastAPI dependency injection (`get_current_user`, `require_role`).

---

## Brute-Force Protection (Nginx Rate Limiting)

| Endpoint | Rate Limit | Why |
|----------|-----------|-----|
| `POST /auth/admin/login` | 3 attempts/minute per IP | Full passwords — 3/min is reasonable |
| `POST /auth/worker/login` | 5 attempts/hour per phone | PINs have only 10K combinations |
| `POST /complaints` (Telegram) | 5 complaints/day per chat_id | Prevents spam/abuse |

> **Implementation:** All rate limiting handled by Nginx `limit_req` directives — no Python library needed. Configured in `nginx.conf`.

---

## Image Safety — NSFW Check

```
Image Uploaded
      │
      ▼
NSFW Check (opennsfw2)
      │
      ├── UNSAFE → Block upload, notify citizen: "Image rejected"
      │
      ▼
AI Classification (MobileNetV2)
      │
      ├── ≥70% confidence → Auto-classify
      ├── 50-69% → Triage queue
      └── <50% → Auto-reject ("Please try a clearer photo")
```

> **Signed URLs:** Images stored in MinIO/S3 are accessed via time-limited (15-min) signed URLs. No permanent public links.

---

## Telegram Security

| Practice | Purpose |
|----------|---------|
| Webhook secret token | Verify requests actually came from Telegram |
| Chat ID validation | Store known citizen chat_ids |
| No sensitive data in messages | Tracking codes are short, anonymized |
| Rate limiting per citizen | Max 5 complaints per 24 hours per chat_id |

## Telegram Session Security (Redis)

| Setting | Value |
|---------|-------|
| Session key | `telegram:{chat_id}:session` |
| Session TTL | 30 minutes (auto-deleted) |
| Idle prompt | After 15 min → "Do you want to continue?" |
| Session data | Current step, collected fields, classification result |

---

# 8 — AI/ML Pipeline

## Two Independent Classifiers

### Image Classifier — MobileNetV2

| Property | Value |
|----------|-------|
| **Parameters** | ~3.4 million (lightweight) |
| **Runs on** | CPU — no GPU needed in production |
| **Inference time** | ~100–300ms per image |
| **Fine-tuned for** | 3 visual civic categories (Garbage, Pothole, Waterlogging) |
| **When it runs** | During Telegram conversation (inline) — citizen gets immediate feedback |

### Text Classifier — DistilBERT

| Property | Value |
|----------|-------|
| **Parameters** | ~66 million |
| **Speed** | 60% faster than full BERT |
| **Inference time** | ~50–200ms per text |
| **Fine-tuned for** | 5 text civic categories |
| **When it runs** | After complaint submission (post-submission) — fast enough for silent processing |

---

## Confidence-Based Routing

```
AI classifies complaint
      │
      ├── ≥ 70%  → AUTO-CLASSIFY → Route to department → Assign worker
      ├── 50–69% → TRIAGE QUEUE → Admin reviews and can override
      └── < 50%  → AUTO-REJECT (images only) → "Please try a clearer photo"
```

Configurable via `.env`:
- `CLASSIFICATION_CONFIDENCE_THRESHOLD=0.70`
- `AUTO_REJECT_CONFIDENCE_THRESHOLD=0.50`

---

## Training Pipeline

| Model | Dataset | Platform | Time | Output |
|-------|---------|----------|------|--------|
| MobileNetV2 | 200–500 images per category | Google Colab (free GPU) | ~15–30 min | `.h5` file |
| DistilBERT | 300–500 text samples per category | Google Colab (free GPU) | ~10–20 min | Model directory |

---

## Classification Flow — Complete Picture

```
Citizen sends complaint
      │
      ├── Has image? ──────────────────────┐
      │                                    │
      │   YES                              │   NO (text only)
      │                                    │
      ▼                                    ▼
During Telegram conversation:        After submission:
      │                                    │
NSFW Check (opennsfw2)               DistilBERT classifies text
      │                                    │
MobileNetV2 classifies               ├── Confidence ≥ 70% → Auto-classify
      │                              ├── Confidence 50–69% → Triage queue
Bot tells citizen: "Classified as: X" └── Confidence < 50% → Triage queue
      │                                   (text is never auto-rejected)
Citizen provides location + description + confirms
      │
Confidence ≥ 70%? → Auto-route
Confidence < 70%? → Triage queue
```

---

## Where AI/ML Code Lives

```
backend/app/ml/
├── image_classifier.py      ← MobileNetV2 inference
├── text_classifier.py       ← DistilBERT inference
├── nsfw_checker.py          ← opennsfw2 NSFW filter
└── models/                  ← Saved model weights (.h5 files)

ml-training/
├── image_classifier_training.ipynb   ← Colab notebook for image model
├── text_classifier_training.ipynb    ← Colab notebook for text model
├── datasets/                         ← Training data
└── README.md
```

---

# 9 — Backend Deep Dive

## 3-Layer Architecture

```
┌──────────────────────────────────────────┐
│  LAYER 1: API ROUTES                     │
│  Receive HTTP, validate, call services   │
│  NEVER contain business logic            │
├──────────────────────────────────────────┤
│  LAYER 2: SERVICES                       │
│  ALL business logic lives here           │
│  NEVER import FastAPI objects            │
├──────────────────────────────────────────┤
│  LAYER 3: MODELS + SCHEMAS               │
│  Models = DB tables (SQLAlchemy)         │
│  Schemas = request/response (Pydantic)   │
└──────────────────────────────────────────┘
```

**Why this pattern:**
- **Testability** — Services testable without HTTP
- **Reusability** — Same service callable from API routes, Celery tasks, or scripts
- **Clarity** — Bug? You know exactly which layer to look at

---

## Complete Folder Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                      ← FastAPI app entry point
│   ├── config.py                    ← Settings from environment
│   ├── database.py                  ← DB connection + session factory
│   │
│   ├── models/                      ← SQLAlchemy ORM models
│   │   ├── citizen.py · complaint.py · worker.py · admin.py · triage.py
│   │
│   ├── schemas/                     ← Pydantic request/response schemas
│   │   ├── auth.py · complaint.py · worker.py · admin.py
│   │
│   ├── api/                         ← Route handlers
│   │   ├── deps.py                  ← Auth dependencies
│   │   └── v1/
│   │       ├── auth.py · complaints.py · workers.py · admin.py
│   │       ├── telegram.py · health.py
│   │
│   ├── services/                    ← Business logic layer
│   │   ├── auth_service.py · complaint_service.py
│   │   ├── classification_service.py · nsfw_check_service.py
│   │   ├── routing_service.py · task_allocation_service.py
│   │   ├── notification_service.py · session_service.py · sla_service.py
│   │
│   ├── ml/                          ← AI/ML module
│   │   ├── image_classifier.py · text_classifier.py · nsfw_checker.py
│   │   └── models/                  ← Saved model weights
│   │
│   ├── tasks/                       ← BackgroundTasks + APScheduler jobs
│   │   ├── classify_complaint.py · send_notification.py
│   │   ├── check_sla.py · allocate_daily_tasks.py
│   │   └── scheduler.py             ← APScheduler initialization
│   │
│   └── utils/
│       ├── geo.py · storage.py · tracking_code.py
│
├── alembic/                         ← Database migrations
├── tests/                           ← Test suite (unit + integration)
├── Dockerfile · requirements.txt · pyproject.toml
```

---

## API Endpoints

### Auth Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/auth/admin/login` | POST | Admin login → JWT tokens |
| `/api/v1/auth/admin/refresh` | POST | Refresh expired admin access token |
| `/api/v1/auth/worker/login` | POST | Worker login → JWT token |

### Complaint Endpoints
| Endpoint | Method | Who | Description |
|----------|--------|-----|-------------|
| `/api/v1/complaints` | POST | Bot (internal) | Create new complaint |
| `/api/v1/complaints/{id}` | GET | Worker/Admin | Get complaint details |
| `/api/v1/complaints/track/{code}` | GET | Bot (citizen) | Track by tracking code |
| `/api/v1/complaints/{id}/status` | PATCH | Worker | Update status |
| `/api/v1/complaints/{id}/resolve` | PATCH | Worker | Resolve with proof photo |

### Worker Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/workers/me/tasks` | GET | Get my daily task queue |
| `/api/v1/workers/me/tasks/route` | GET | Get optimized route |
| `/api/v1/workers/me/tasks/{id}` | PATCH | Update task status |
| `/api/v1/workers/me/tasks/{id}/defer` | PATCH | Defer task (with reason) |

### Admin Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/admin/dashboard/stats` | GET | Dashboard metrics |
| `/api/v1/admin/dashboard/trends` | GET | 7-day trend data |
| `/api/v1/admin/triage` | GET | Unclassified complaints queue |
| `/api/v1/admin/triage/{id}` | PATCH | Classify a triaged complaint |
| `/api/v1/admin/workers` | GET/POST | Worker list + create new worker |
| `/api/v1/admin/hotspots` | GET | Geographic hotspot data |
| `/api/v1/admin/export` | GET | Export data to CSV/Excel |

### Other Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/webhook/telegram` | POST | Receives Telegram messages |
| `/health` | GET | Basic alive check |
| `/ready` | GET | Readiness check (DB + Redis) |

---

## Services (9 Total)

| Service | Responsibility |
|---------|---------------|
| **auth_service** | JWT creation, bcrypt hashing, credential verification, token refresh |
| **complaint_service** | Complaint lifecycle — create, update status, track, log changes |
| **classification_service** | Orchestrate AI classification, handle confidence thresholds, route to triage |
| **nsfw_check_service** | Verifies images using opennsfw2 to block inappropriate content |
| **routing_service** | Map category → department, find nearest worker (PostGIS), assign complaint |
| **task_allocation_service** | Daily scoring algorithm — 4-factor weighted formula, select top 15–20 per worker |
| **notification_service** | Send Telegram messages — status updates, resolution notifications with proof photo |
| **session_service** | Redis session management for Telegram bot — CRUD, TTL, idle prompts |
| **sla_service** | Calculate SLA deadlines by category, check violations, flag overdue complaints |

---

## Utils (3 Total)

| Utility | What It Does |
|---------|-------------|
| **geo.py** | PostGIS helpers — distances, point-in-polygon, coordinate formatting |
| **storage.py** | Upload/download to MinIO/S3, generate signed URLs, validate file types/sizes |
| **tracking_code.py** | Generate unique tracking codes (e.g., `GRV-2026-A7X3`) |

---

# 10 — Frontend Deep Dive

## One Codebase, Two Experiences

```
┌────────────────────────────────────────────────────┐
│              SINGLE VUE 3 APPLICATION               │
│                                                     │
│   Login Screen                                      │
│        ├── role = "admin"  → Admin Dashboard Views  │
│        │                     (Desktop-first layout) │
│        │                     Charts, maps, tables   │
│        └── role = "worker" → Worker Portal Views    │
│                               (Mobile-first layout) │
│                               Task cards, camera    │
└────────────────────────────────────────────────────┘
```

---

## Folder Structure

```
frontend/src/
├── components/
│   ├── dashboard/    (StatsCards · CategoryChart · TrendChart · HotspotMap · WorkerTable)
│   ├── worker/       (TaskCard · TaskList · ResolveForm · DeferForm)
│   ├── triage/       (TriageCard · TriageQueue)
│   └── shared/       (Navbar · LoginForm · CanvasViewer · LoadingSpinner · StatusBadge)
├── views/            (LoginView · AdminDashboard · AdminTriage · AdminWorkers
│                      WorkerTaskQueue · WorkerTaskDetail · NotFound)
├── router/           (index.js — routes + auth guards)
├── stores/           (authStore · complaintStore · workerStore)
├── composables/      (useAuth · useGeolocation · useCamera)
├── services/         (api.js · authApi · complaintApi · workerApi · adminApi)
├── utils/            (dateFormat · constants)
├── App.vue · main.js
```

---

## Views — Full Pages

| View | Role | What It Shows |
|------|------|---------------|
| `LoginView.vue` | Both | Role selector (Admin/Worker) + login form |
| `AdminDashboard.vue` | Admin | StatsCards + CategoryChart + TrendChart + HotspotMap + WorkerTable |
| `AdminTriage.vue` | Admin | TriageQueue — complaints needing manual classification |
| `AdminWorkers.vue` | Admin | Worker list, create worker, manage zones |
| `WorkerTaskQueue.vue` | Worker | TaskList — today's assigned tasks, sorted by priority |
| `WorkerTaskDetail.vue` | Worker | Single task details + ResolveForm or DeferForm |

---

## Router — Auth Guards

```javascript
// Admin-only routes
{ path: "/admin/dashboard", meta: { requiresAuth: true, role: "admin" } }
{ path: "/admin/triage",    meta: { requiresAuth: true, role: "admin" } }
{ path: "/admin/workers",   meta: { requiresAuth: true, role: "admin" } }

// Worker-only routes
{ path: "/worker/tasks",      meta: { requiresAuth: true, role: "worker" } }
{ path: "/worker/tasks/:id",  meta: { requiresAuth: true, role: "worker" } }

// Navigation guard checks JWT + role before every route change
```

---

## Pinia Stores

| Store | State | Purpose |
|-------|-------|---------|
| **authStore** | token, refreshToken, user, isAuthenticated, userRole | Auth session |
| **complaintStore** | dashboardStats, triageQueue, trendData | Complaint data |
| **workerStore** | tasks, activeTask | Worker task data |

---

## PWA Capabilities

| Capability | Admin PWA | Worker Mobile PWA |
|-----------|-----------|-------------------|
| Installable (home screen) | ✅ | ✅ |
| Offline fallback | Basic | Critical (workers may lose signal) |
| Push notifications | ✅ | ✅ |
| Camera access | ❌ | ✅ (resolution photos) |
| GPS/Geolocation | ❌ | ✅ (navigation) |
| Responsive layout | Desktop-first | Mobile-first |

---

# 11 — Background Tasks & Scheduling

## The 4 Celery Tasks

### Task 1: `classify_complaint` (Event-triggered)
- **When:** Citizen submits complaint
- **Does:** Downloads image → NSFW Check → MobileNetV2 → Updates DB → Notifies citizen via Telegram
- **Timeout:** Normal <8s. Warning at 8-10s. Fallback to triage at 20s.

### Task 2: `send_notification` (Event-triggered)
- **When:** Complaint status changes
- **Does:** Looks up citizen's chat_id → Composes message → Sends via Telegram Bot API
- **Handles:** Citizen blocked bot, network issues → log and skip

### Task 3: `check_sla` (Scheduled: every hour)
- **Does:** Queries all unresolved complaints past SLA → Flags as overdue → Creates log entries → Escalates if carry_forward_count ≥ 3

### Task 4: `allocate_daily_tasks` (Scheduled: daily at 06:00)
- **Does:** For each active worker → Gathers unresolved complaints in zone → Scores using 4-factor formula → Sorts → Assigns top 20

---

## Scoring Formula

```
Score = (Priority Weight    × 0.40)
      + (Elapsed Time Score × 0.35)
      + (Queue Position     × 0.15)
      + (Carry-Forward      × 0.10)
```

| Factor | How Calculated | Range |
|--------|---------------|-------|
| Priority | CRITICAL=1.0, HIGH=0.75, MEDIUM=0.5, LOW=0.25 | 0.0–1.0 |
| Elapsed Time | hours_since_submission / category_sla_hours | 0.0–1.0+ |
| Queue Position | 1 - (position / total_in_zone) | 0.0–1.0 |
| Carry-Forward | Yes = 1.0, No = 0.0 | 0.0 or 1.0 |

### Scoring Example

| Complaint | Priority | Elapsed | Queue Pos | Carry-Fwd | **Total** |
|-----------|----------|---------|-----------|-----------|-----------|
| Pothole near school | HIGH (0.75) | 0.90 | 0.80 | Yes (1.0) | **0.835** |
| Garbage at market | MEDIUM (0.50) | 0.60 | 0.95 | No (0.0) | **0.553** |
| New streetlight issue | LOW (0.25) | 0.10 | 0.20 | No (0.0) | **0.165** |

---

## SLA Deadlines by Category

| Category | SLA |
|----------|-----|
| Solid Waste & Garbage | 24–48 hours |
| Potholes & Road Damage | 48–72 hours |
| Waterlogging & Drainage | 24 hours |
| Stray Animals & Pest Control | 48 hours |
| Illegal Encroachment | 5–7 days |
| Streetlight & Power Outage | 24–48 hours |
| Water Supply & Contamination | 24 hours |
| Administrative Delay | 7 days |

---

## Configurable via `.env`

```env
WORKER_DAILY_TASK_LIMIT=20
SHIFT_START_HOUR=6
PRIORITY_WEIGHT=0.40
ELAPSED_TIME_WEIGHT=0.35
QUEUE_POSITION_WEIGHT=0.15
CARRY_FORWARD_WEIGHT=0.10
```

---

# 12 — Infrastructure & DevOps

## Docker Compose — 5 Containers

```
docker compose up -d

  ┌──────────┐  ┌────────────┐
  │ FastAPI  │  │    Vue     │
  │ Backend  │  │ Dev Server │
  │  :8000   │  │   :5173    │
  └──────────┘  └────────────┘

  ┌──────────┐  ┌──────────┐  ┌──────────┐
  │PostgreSQL│  │  Redis   │  │  MinIO   │
  │ + PostGIS│  │          │  │ (S3-like)│
  │  :5432   │  │  :6379   │  │:9000/9001│
  └──────────┘  └──────────┘  └──────────┘
```

### Key Features
- **Health checks** — PostgreSQL and Redis checked. Backend waits until both healthy.
- **Hot reload** — Backend code volume-mounted. Changes reflect instantly.
- **Persistent volumes** — DB, Redis, MinIO data survive container restarts.

### Essential Commands

| Command | What It Does |
|---------|-------------|
| `docker compose up -d` | Start all services |
| `docker compose down` | Stop all services |
| `docker compose logs -f` | Follow all logs |
| `docker compose down -v` | Stop + delete all data |
| `docker compose build --no-cache` | Rebuild from scratch |

---

## CI/CD Pipeline (GitHub Actions)

```
Push Code → GitHub → CI runs automatically:
  ├── Lint (ruff check)
  ├── Format check (ruff format --check)
  ├── Test (pytest)
  └── Build (Docker image + frontend npm build)

All pass → PR can be merged
Any fail → PR blocked ❌
```

| Pipeline | Trigger | What It Does |
|----------|---------|-------------|
| `ci.yml` | Every Pull Request | Lint + test + build |
| `cd-staging.yml` | Merge to `develop` | Build + deploy to staging |
| `cd-production.yml` | Merge to `main` | Build + deploy to production |

---

## Branching Strategy — GitHub Flow

```
main      ─────●──────────────●──── (production-ready)
               ↑              ↑
develop   ──●──┴──●──────●───┴──── (integration)
              ↑     ↑      ↑
features  ────┘     ┘      ┘
              feat/  feat/  fix/
```

| Branch | Purpose | Protection |
|--------|---------|-----------|
| `main` | Production-ready code | Requires 1 approving review |
| `develop` | Integration branch | Requires 1 approving review |
| `feat/*`, `fix/*`, `chore/*` | Feature/fix branches | None |

---

## Production Architecture (AWS EC2)

```
┌──────────── AWS EC2 t2.micro (Free Tier) ────────────┐
│                                                        │
│  ┌─────────┐  ┌──────────┐                           │
│  │  Nginx  │──│ FastAPI  │                           │
│  │ :80/443 │  │  :8000   │                           │
│  └─────────┘  └──────────┘                           │
│       │                                                │
│       │ Serves Vue static files                       │
│       │ Proxies /api/* to FastAPI                     │
│       │ Handles SSL (HTTPS)                           │
│                                                        │
│  ┌──────────┐  ┌──────────┐    AWS S3 (replaces      │
│  │PostgreSQL│  │  Redis   │    MinIO) — 5GB free     │
│  │  :5432   │  │  :6379   │                           │
│  └──────────┘  └──────────┘                           │
│                                                        │
│  AWS SSM Parameter Store (secrets — replaces .env)    │
└────────────────────────────────────────────────────────┘
```

### EC2 t2.micro Constraints

| Resource | Limit | Mitigation |
|----------|-------|-----------|
| RAM | 1 GB | MinIO replaced by S3. 1GB swap file. |
| CPU | 1 vCPU | Sufficient for this scale. |
| Storage | 30 GB (EBS) | More than enough. |
| Free tier | 750 hrs/month × 12 months | Covers 24/7. |

> **Alternative:** Oracle Cloud Free Tier offers an **always-free** ARM instance with 24GB RAM + 4 CPUs.

---

## Infrastructure Files

```
infra/
├── docker-compose.yml           ← Full local development stack
├── docker-compose.prod.yml      ← Production overrides
├── nginx/
│   └── nginx.conf               ← Reverse proxy + SSL
└── scripts/
    ├── setup-ec2.sh             ← Server provisioning
    └── deploy.sh                ← Deployment script
```

---

## Monitoring & Logging

### Health Check Endpoints
| Endpoint | Checks |
|----------|--------|
| `GET /health` | Backend is alive |
| `GET /ready` | Backend + DB + Redis connected |

### Structured JSON Logging
```json
{
  "timestamp": "2026-09-11T10:15:30Z",
  "level": "INFO",
  "message": "Complaint classified",
  "complaint_id": "abc-123",
  "category": "Garbage",
  "confidence": 0.92,
  "classification_time_ms": 342
}
```

---

# 13 — End-to-End Data Flow

## The Complete Journey of a Complaint

### Phase 1: Citizen Reports
```
Priya → /report on Telegram → Webhook → FastAPI → Redis session created
      → "📸 Send a photo" → Photo received → Uploaded to MinIO/S3
      → BackgroundTask: classify_complaint dispatched
      → "📷 Analyzing your image…"
```

### Phase 2: AI Classification (Background)
```
FastAPI BackgroundTask → Gate 1: NSFW ✅ 
             → Gate 2: MobileNetV2 → "Garbage, 92%"
             → Auto-classify → Map to "Solid Waste Management"
             → Calculate SLA: +48 hours
             → Telegram: "Classified as: 🗑️ Solid Waste & Garbage"
```

### Phase 3: Location & Description
```
Bot asks location → Priya taps GPS → Bot asks description
→ Priya types description → Bot shows summary → Priya confirms ✅
```

### Phase 4: Complaint Created
```
Generate tracking code: "GRV-2026-A7X3"
→ INSERT into complaint table (all fields)
→ CREATE complaint_log entries (submitted + classified)
→ DELETE Redis session
→ "✅ Registered! Tracking code: GRV-2026-A7X3"
```

### Phase 5: Worker Assignment (Next Morning 6 AM)
```
APScheduler → allocate_daily_tasks → For Worker Ramesh in Zone A:
→ Query 28 unresolved complaints (PostGIS: ST_Within)
→ Score all 28 with 4-factor formula
→ Priya's complaint scores 0.415 → Rank #14 of 20
→ Assigned to Ramesh → status = "assigned"
```

### Phase 6: Worker Resolves
```
Ramesh logs in (phone + PIN) → Sees 20 tasks sorted by score
→ Navigates to Priya's garbage complaint → Cleans the area
→ Takes resolution photo + note: "Area cleaned" → Submits
→ PATCH /complaints/{id}/resolve → Upload resolution photo
→ status = "resolved" → BackgroundTask: send_notification dispatched
```

### Phase 7: Citizen Notified
```
FastAPI BackgroundTask → Look up Priya's chat_id → Send Telegram message:
"✅ Your complaint GRV-2026-A7X3 has been resolved!
Note: Area cleaned
Resolved by Field Worker Ramesh under Solid Waste Management
[Resolution Photo]"
```

### Phase 8: Dashboard Updates
```
Admin opens dashboard → Fresh DB queries
→ Total: 848 (+1) · Resolved today: 24 (+1) · Pending: 61 (-1)
→ Hotspot map · Category chart · Ramesh: 15/20 resolved
```

---

## Components Touched by One Complaint

| Component | Role |
|-----------|------|
| Telegram | Citizen interface (input + notifications) |
| FastAPI | Central API hub (API routes + background tasks) |
| Redis | Bot session state management |
| PostgreSQL | Persistent data (complaint, logs, users) |
| MinIO/S3 | Photo storage (complaint + resolution) |

---

# 14 — Development Roadmap

## Phase Overview

| Phase | Weeks | Focus | Deliverable |
|-------|-------|-------|------------|
| **1. Foundation** | 1–2 | Project setup + Core backend + Auth | API running, admin login, DB tables |
| **2. Core API** | 3–4 | Complaint lifecycle + Worker APIs | Complaints created, assigned, resolved via API |
| **3. Intelligence** | 3–4 | AI/ML pipeline (parallel with Phase 2) | Image/text classification, NSFW filter |
| **4. Interfaces** | 5–6 | Telegram bot + Frontend | Citizen reports via bot, admin dashboard, worker tasks |
| **5. Integration** | 7 | Full flow + Polish | End-to-end: citizen → AI → worker → citizen notified |
| **6. DevOps & Cloud** | 8 | Deployment | Running on AWS, HTTPS, CI/CD |
| **7. Hardening** | 9–10 | Testing + Logging + Security audit | Tested, logged, documented, demo-ready |

---

## Phase 1 — Foundation (Weeks 1–2)

**Goal:** Get the project running. Database tables exist. API responds. Auth works.

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
  □ Pydantic schemas: auth, complaint, worker, admin
  □ Auth service: JWT creation, bcrypt hashing, token validation
  □ Auth routes: POST /auth/admin/login, POST /auth/worker/login
  □ Auth dependencies: get_current_user, require_role
  □ CORS middleware
  □ Nginx rate limiting configuration
  □ Seed script: create initial admin account
```

---

## Phase 2 — Core API (Weeks 3–4)

```
Week 3:
  □ Complaint service: create, read, update status, track by code
  □ Complaint routes: POST /complaints, GET /complaints/{id}, GET /complaints/track/{code}
  □ File upload: utils/storage.py (MinIO upload, signed URLs)
  □ Tracking code generator
  □ Routing service: map category → department
  □ SLA service: calculate deadline based on category

Week 4:
  □ Worker task routes: GET /workers/me/tasks, PATCH resolve, PATCH defer
  □ Task allocation service: scoring algorithm
  □ APScheduler setup: worker + schedule configuration
  □ Scheduled tasks: allocate_daily_tasks, check_sla
  □ Complaint log: auto-log every status change
  □ Admin routes: GET /dashboard/stats, GET /workers
```

---

## Phase 3 — Intelligence (Weeks 3–4, parallel with Phase 2)

```
ML Training (Google Colab — Tushar):
  □ Collect image dataset (200-500 per category)
  □ Train MobileNetV2 → export .h5
  □ Collect text dataset (300-500 per category)
  □ Train DistilBERT → export model directory

Backend Integration (Sairaj):
  □ ml/image_classifier.py: load, preprocess, predict
  □ ml/text_classifier.py: load, tokenize, predict
  □ classification_service.py: orchestrate + confidence routing
  □ nsfw_check_service.py: opennsfw2 integration
  □ FastAPI BackgroundTasks: classify_complaint
  □ Admin triage routes
```

---

## Phase 4 — Interfaces (Weeks 5–6)

```
Telegram Bot (Sairaj):
  □ Webhook endpoint
  □ Session service (Redis)
  □ Bot conversation flow
  □ Complaint tracking via bot
  □ Notification service
  □ Webhook secret verification

Frontend (Sufiyan):
  □ Vue 3 + Vite + Bootstrap 5 setup
  □ Router + auth guards
  □ Pinia stores
  □ LoginView, AdminDashboard, AdminTriage, AdminWorkers
  □ WorkerTaskQueue, WorkerTaskDetail
  □ HotspotMap (Leaflet), CanvasViewer
  □ PWA setup
```

---

## Phase 5 — Integration (Week 7)
```
  □ End-to-end flow: citizen → AI → worker → citizen notified
  □ Resolution notifications with proof photo
  □ Worker navigation ("Get Directions")
  □ Geographic hotspot endpoint (PostGIS)
  □ Edge case handling
```

---

## Phase 6 — DevOps & Cloud (Week 8)
```
  □ Optimize Dockerfiles (multi-stage builds)
  □ docker-compose.prod.yml
  □ Nginx configuration
  □ AWS EC2 setup + S3 + SSM
  □ Let's Encrypt SSL
  □ CD pipeline: auto-deploy on merge to main
```

---

## Phase 7 — Hardening (Weeks 9–10)
```
  □ Unit tests for services
  □ Integration tests for API endpoints
  □ Security audit
  □ Structured JSON logging
  □ API documentation review
  □ Demo preparation
  □ Performance testing
```

---

## Team Work Distribution

| Phase | Sairaj (Backend+DevOps) | Sufiyan (Frontend) | Tushar (ML) |
|-------|------------------------|-------------------|-------------|
| **1. Foundation** | Docker, FastAPI, models, auth, CI | — | — |
| **2. Core API** | Complaint API, worker API, APScheduler | — | — |
| **3. Intelligence** | ML integration, NSFW filtering | — | Train models on Colab |
| **4. Interfaces** | Telegram bot, notifications | Vue dashboard + worker portal | Model fine-tuning |
| **5. Integration** | End-to-end flow, edge cases | Polish UI, maps, export | — |
| **6. DevOps** | AWS, Nginx, SSL, CD pipeline | — | — |
| **7. Hardening** | Tests, logging, security audit | UI bug fixes | — |

### Critical Coordination Points

| When | Who | What to Align On |
|------|-----|-----------------|
| Week 1 | Sairaj + Sufiyan | API contracts (request/response shapes) BEFORE frontend starts |
| Week 3 | Sairaj + Tushar | Model file format, loading interface, inference API |
| Week 5 | Sairaj + Sufiyan | API endpoints ready for frontend integration |
| Week 7 | All 3 | End-to-end testing, bug bash |

---

# 15 — Current Project Status

| Aspect | Status |
|--------|--------|
| **Project idea & requirements** | ✅ Fully defined |
| **Architecture & tech decisions** | ✅ Fully planned |
| **Documentation** | ✅ Comprehensive (this document) |
| **Git repo + .gitignore** | ✅ Done |
| **Docker Compose** | 🟡 Configured but not verified |
| **Dockerfiles** | 🟡 Exist but basic |
| **FastAPI skeleton** | ✅ main.py, config.py, database.py |
| **Folder structure** | ✅ All directories created |
| **SQLAlchemy models** | 🔴 Stub files only — no code |
| **Pydantic schemas** | 🔴 Empty — directories exist |
| **Services** | 🔴 Stub files only — no code |
| **API routes** | 🔴 Empty — v1 directory exists |
| **Background tasks** | 🔴 Empty |
| **Frontend** | 🔴 Empty folder structure |
| **AI/ML models** | 🔴 Not trained yet |
| **CI/CD** | 🔴 Workflow directory exists, not configured |

> **Translation:** Excellent planning. Zero working code. Implementation starts from a strong foundation.

---

# 16 — AI Use Guidelines

## The 5 Rules for Using AI Coding Assistants

| # | Rule | Summary |
|---|------|---------|
| 1 | **Understand Before You Code** | Read and understand every line of AI-generated code before using it. |
| 2 | **AI as Learning Tool** | Ask AI to explain concepts first, not just generate code. |
| 3 | **You Must Explain Your Code** | If AI generated it, you must be able to explain it in a review or demo. |
| 4 | **AI-Assisted, Not AI-Driven** | The project is built BY the team. AI helps, it doesn't replace thinking. |
| 5 | **Progressive Implementation** | Build step by step. Don't generate everything at once. |

### The "Explain It" Test
Before committing any AI-generated code:
1. Can I explain what this code does to a teammate?
2. Can I explain WHY it's written this way?
3. Can I modify this code if requirements change?
4. Can I debug this code if it breaks?

If **any** answer is "no" → go back and learn it first.

### AI is a Feature, Not the Focus
> ML/AI is a supporting component, NOT a primary learning domain.
> Learning priorities: **DevOps → Cloud → Software Engineering.**
> The AI models just need to work. The real learning happens in everything *around* the models.

---

> **📋 End of Complete Project Documentation**
> **This is a living document. Update as decisions change and implementation progresses.**
