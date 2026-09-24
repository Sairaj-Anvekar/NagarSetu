# 10 — Infrastructure & DevOps

> **Reading time:** 10 minutes
> **Prerequisite:** [09-Background-Tasks.md](09-Background-Tasks.md)
> **After reading:** You'll understand the Docker setup, Docker Compose configuration, CI/CD pipeline, branching strategy, deployment architecture, and local-to-production transition.

---

## Infrastructure Overview

```
LOCAL DEVELOPMENT (Weeks 1–7)          PRODUCTION (Week 8+)
─────────────────────────              ──────────────────────
Docker Compose on your                 Docker Compose on
machine                                AWS EC2 t2.micro

MinIO for file storage                 AWS S3 for file storage
.env for secrets                       AWS SSM for secrets
localhost access                       Nginx + SSL (HTTPS)
Vite dev server                        Static files via Nginx
```

> **Key principle:** Your code doesn't know if it's running locally or on AWS. Only environment variables change.

---

## Docker — Containerization

### What Docker Does
Docker packages each service into an isolated **container** — a lightweight, portable environment with everything the service needs to run (code, runtime, libraries).

### The Dockerfiles

**Backend Dockerfile** (`backend/Dockerfile`):
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Default command (overridden in docker-compose)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Frontend Dockerfile** (`frontend/Dockerfile`):
```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

CMD ["npm", "run", "dev", "--", "--host"]
```

---

## Docker Compose — Orchestrating All Services

One command starts the entire system: `docker compose up -d`

### What Gets Started

```
docker compose up -d

Starts 6 containers:
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐ │
│  │ FastAPI  │  │  Celery  │  │  Celery  │  │    Vue     │ │
│  │ Backend  │  │  Worker  │  │  Beat    │  │ Dev Server │ │
│  │  :8000   │  │ (tasks)  │  │ (cron)   │  │   :5173    │ │
│  └──────────┘  └──────────┘  └──────────┘  └────────────┘ │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │
│  │PostgreSQL│  │  Redis   │  │  MinIO   │                 │
│  │ + PostGIS│  │          │  │ (S3-like)│                 │
│  │  :5432   │  │  :6379   │  │:9000/9001│                 │
│  └──────────┘  └──────────┘  └──────────┘                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Service Details from `docker-compose.yml`

| Service | Image/Build | Ports | Purpose | Health Check |
|---------|------------|-------|---------|-------------|
| **backend** | Built from `backend/Dockerfile` | 8000 | FastAPI API server | Depends on postgres + redis being healthy |
| **celery-worker** | Same image as backend | None | Processes background tasks | Depends on backend |
| **celery-beat** | Same image as backend | None | Schedules recurring tasks | Depends on backend |
| **postgres** | `postgis/postgis:16-3.4` | 5432 | PostgreSQL + PostGIS database | `pg_isready` check |
| **redis** | `redis:7-alpine` | 6379 | Cache + Celery broker | `redis-cli ping` check |
| **minio** | `minio/minio:latest` | 9000, 9001 | S3-compatible file storage | — |

### Key Docker Compose Features

- **Health checks** — PostgreSQL and Redis have health checks. Backend won't start until both are healthy.
- **Hot reload** — Backend code is volume-mounted (`../backend/app:/app/app`), so code changes reflect instantly without rebuilding.
- **Shared env** — All services read from the same `.env` file.
- **Persistent volumes** — Database data, Redis data, and MinIO data survive container restarts.

### Essential Commands

| Command | What It Does |
|---------|-------------|
| `docker compose up -d` | Start all services in background |
| `docker compose down` | Stop all services |
| `docker compose logs -f` | Follow logs from all services |
| `docker compose logs backend -f` | Follow logs from backend only |
| `docker compose restart backend` | Restart just the backend |
| `docker compose down -v` | Stop + **delete all data** (volumes) |
| `docker compose build --no-cache` | Rebuild all images from scratch |

---

## CI/CD — Continuous Integration / Continuous Deployment

### What CI/CD Does

```
You write code → Push to GitHub → CI automatically runs:
  ├── Lint (code quality check)
  ├── Test (run pytest)
  └── Build (verify Docker images build)

If all pass → PR can be merged
If any fail → PR is blocked
```

### GitHub Actions Pipeline

The CI/CD pipeline lives in `.github/workflows/`:

```
.github/
└── workflows/
    ├── ci.yml              ← Runs on every Pull Request
    ├── cd-staging.yml      ← Runs on merge to develop branch
    └── cd-production.yml   ← Runs on merge to main branch
```

#### CI Pipeline (`ci.yml`) — Runs on Every PR

```yaml
# Triggered on: Pull Request to develop or main

Steps:
  1. Checkout code
  2. Set up Python 3.11
  3. Install dependencies (pip install -r requirements.txt)
  4. Lint: ruff check . (code style)
  5. Format check: ruff format --check .
  6. Run tests: pytest tests/ -v
  7. Build Docker image: docker build -t sgs-backend .
  8. (Frontend) npm ci → npm run build
```

**If any step fails → the PR gets a red ❌ and cannot be merged.**

#### CD Pipeline — Staging (`cd-staging.yml`)

```
Triggered on: Merge to develop branch

Steps:
  1. Build Docker images
  2. Push to container registry (or build on server)
  3. SSH into staging EC2 instance
  4. Pull latest code
  5. docker compose down && docker compose up -d
  6. Run smoke tests (health endpoint check)
```

#### CD Pipeline — Production (`cd-production.yml`)

```
Triggered on: Merge to main branch

Steps:
  1. Build production Docker images
  2. SSH into production EC2 instance
  3. Pull latest code
  4. docker compose -f docker-compose.prod.yml down
  5. docker compose -f docker-compose.prod.yml up -d
  6. Verify health endpoint
```

---

## Branching Strategy — GitHub Flow

```
main          ─────●──────────────●──────────────●─── (production-ready)
                   ↑              ↑              ↑
develop       ──●──┴──●──────●───┴──●────●──────┴─── (integration)
                ↑     ↑      ↑      ↑    ↑
features      ──┘     ┘      ┘      ┘    ┘
              feat/   feat/  fix/   feat/  feat/
              bot     api    auth   dash   deploy
```

### Branch Rules

| Branch | Purpose | Who Pushes | Protection |
|--------|---------|-----------|-----------|
| `main` | Production-ready code | No one directly — merge from develop only | Requires 1 approving review |
| `develop` | Integration branch | No one directly — merge from feature branches | Requires 1 approving review |
| `feat/*` | New features | One team member per branch | None |
| `fix/*` | Bug fixes | One team member per branch | None |
| `chore/*` | Maintenance tasks | One team member per branch | None |

### Workflow

1. Create a feature branch from `develop`: `git checkout -b feat/complaint-api`
2. Write code, commit frequently
3. Push and open a Pull Request to `develop`
4. CI runs automatically (lint, test, build)
5. Teammate reviews the PR
6. Merge to `develop` → CD deploys to staging
7. Test on staging → merge `develop` to `main` → CD deploys to production

### Team Collaboration

```
Sairaj                      Sufiyan                     Tushar
(Backend + DevOps + Cloud)  (Frontend)                  (ML / AI)
    │                           │                           │
    ├─ feat/complaint-api       ├─ feat/admin-dashboard     ├─ feat/image-classifier
    ├─ chore/docker-setup       │                           │
    ├─ chore/ci-pipeline        │                           │
    │                           │                           │
    └─► Open PR ──────────────► Review ◄───────────────── Review
                                │
                        Merge to develop
```

---

## Production Deployment Architecture

### AWS EC2 Setup

```
┌──────────────────── AWS EC2 t2.micro (Free Tier) ────────────────────┐
│                                                                       │
│   docker compose -f docker-compose.prod.yml up                        │
│   ┌─────────────────────────────────────────────────────────────┐    │
│   │                                                             │    │
│   │  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │    │
│   │  │  Nginx  │──│ FastAPI  │  │  Celery  │  │  Telegram  │  │    │
│   │  │ :80/443 │  │  :8000   │  │  Worker  │  │  Bot       │  │    │
│   │  └─────────┘  └──────────┘  └──────────┘  └────────────┘  │    │
│   │       │                                                     │    │
│   │       │ Serves Vue static files (HTML/JS/CSS)               │    │
│   │       │ Proxies /api/* requests to FastAPI                  │    │
│   │       │ Handles SSL termination (HTTPS)                     │    │
│   │                                                             │    │
│   │  ┌──────────┐  ┌──────────┐                                │    │
│   │  │PostgreSQL│  │  Redis   │    ── AWS S3 (replaces MinIO)  │    │
│   │  │  :5432   │  │  :6379   │       5GB free tier            │    │
│   │  └──────────┘  └──────────┘                                │    │
│   └─────────────────────────────────────────────────────────────┘    │
│                                                                       │
│   AWS SSM Parameter Store (secrets — replaces .env)                   │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

### Nginx Role in Production

| Function | How |
|----------|-----|
| **Reverse proxy** | Routes `/api/*` requests to FastAPI on port 8000 |
| **Static file server** | Serves Vue production build (HTML, JS, CSS) for the frontend |
| **SSL termination** | Handles HTTPS via Let's Encrypt certificates |
| **Request routing** | All traffic enters through Nginx on ports 80 (HTTP → redirect) and 443 (HTTPS) |

### Local → Production Transition

| What Changes | Local | Production |
|-------------|-------|------------|
| File storage | MinIO (Docker) | AWS S3 — same API (boto3), change 1 env var |
| Secrets | `.env` file | AWS SSM Parameter Store — same key names |
| Docker Compose | `docker-compose.yml` | `docker-compose.prod.yml` (production overrides) |
| Frontend | Vite dev server (hot reload) | Pre-built static files served by Nginx |
| HTTPS | Not needed (localhost) | Nginx + Let's Encrypt (Certbot auto-renewal) |
| Domain | `localhost` | Your registered domain |

> **The code never changes.** Only environment configuration differs.

### EC2 t2.micro Constraints

| Resource | Limit | Mitigation |
|----------|-------|------------|
| **RAM** | 1 GB | MinIO replaced by S3 (saves ~100MB). Container memory limits set carefully. 1GB swap file added. |
| **CPU** | 1 vCPU | Sufficient for this scale |
| **Storage** | 30 GB (EBS free tier) | More than enough |
| **Free tier** | 750 hours/month for 12 months | Covers 24/7 running |

> **Alternative:** Oracle Cloud Free Tier offers an **always-free** ARM instance with **24GB RAM + 4 CPUs** — far more headroom.

---

## Infrastructure Files

```
infra/
├── docker-compose.yml           ← Full local development stack
├── docker-compose.prod.yml      ← Production overrides (no MinIO, no hot reload)
├── nginx/
│   └── nginx.conf               ← Nginx configuration (reverse proxy + SSL)
└── scripts/
    ├── setup-ec2.sh             ← Server provisioning (install Docker, etc.)
    └── deploy.sh                ← Deployment script (pull, build, restart)
```

---

## Monitoring & Logging

### Health Check Endpoints

| Endpoint | What It Checks |
|----------|---------------|
| `GET /health` | Backend is alive and responding |
| `GET /ready` | Backend + database + Redis are all connected and operational |

These endpoints are used by:
- Docker Compose health checks (container orchestration)
- CI/CD smoke tests (verify deployment worked)
- Uptime monitoring (external checks)

### Structured JSON Logging

All backend logs are formatted as **JSON** — machine-readable, searchable, filterable:

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

Configured via `.env`:
- `LOG_LEVEL=INFO` (options: DEBUG, INFO, WARNING, ERROR)
- `LOG_FORMAT=json`

---

## Key Takeaways from This Document

1. **Docker Compose** starts 6 containers with one command: backend, celery worker, celery beat, PostgreSQL, Redis, MinIO.
2. **Health checks** ensure dependent services are ready before the backend starts.
3. **CI/CD** (GitHub Actions) runs lint + test + build on every PR automatically.
4. **GitHub Flow** branching: feature branches → PR → develop → staging → main → production.
5. **Production** runs on AWS EC2 t2.micro with Nginx (reverse proxy + SSL) and S3 (replaces MinIO).
6. **Local → Production** transition changes **only environment variables** — no code changes.
7. **Nginx** serves the Vue frontend static files and proxies API requests to FastAPI.
8. **Structured JSON logging** makes logs machine-readable and searchable.

---

> **Next:** [11-Data-Flow-End-To-End.md](11-Data-Flow-End-To-End.md) — Follow a complaint's complete journey from citizen to resolution.
