# NagarSetu — Smart Civic Grievance System

A digital civic complaint platform that enables citizens to report municipal issues through Telegram, classifies complaints using AI, automatically assigns them to field workers based on department and geographic zone, and provides administrators with operational visibility through a web dashboard.

## Team

| Member  | Role                      |
|---------|---------------------------|
| Sairaj  | Backend, Database, DevOps |
| Sufiyan | Frontend, Worker PWA      |
| Tushar  | AI/ML                     |

## Tech Stack

| Layer              | Technology                              |
|--------------------|-----------------------------------------|
| Backend            | Python 3.11+, FastAPI, SQLAlchemy, Alembic |
| Database           | PostgreSQL 16 + PostGIS                 |
| Session State      | Redis 7                                 |
| Frontend           | Vue 3, TypeScript, Vite, Bootstrap 5    |
| AI/ML              | MobileNetV2, DistilBERT                 |
| Object Storage     | MinIO (local) / AWS S3 (production)     |
| Infrastructure     | Docker, Nginx, AWS EC2, GitHub Actions  |

## Project Structure

```
smart-grievance-system/
├── backend/         # FastAPI application
├── frontend/        # Vue 3 web application
├── infra/           # Docker Compose, Nginx, deployment scripts
├── ml-training/     # ML training notebooks and datasets
├── Project-Docs/    # Architecture and planning documents
└── Sprints/         # Sprint-by-sprint execution plans
```

## Getting Started

> Setup instructions will be added once the Docker development stack is configured.

## Branching Strategy

| Branch    | Purpose                                              |
|-----------|------------------------------------------------------|
| `main`    | Stable, deployable code only                         |
| `dev`     | Integration branch — features merge here first       |
| `feature/SGMS-XX-*` | Individual issue branches, created off `dev` |

**Workflow:** `feature branch` → PR to `dev` → when stable, `dev` → PR to `main`

## License

This project is developed as part of a semester-3 academic project.