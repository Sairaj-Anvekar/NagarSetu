# NagarSetu - Smart Civic Grievance System

Citizens report civic issues via a Telegram bot, AI (MobileNetV2 for images, DistilBERT for text) classifies them, PostGIS routes by zone, complaints are auto-assigned to field workers using a mobile PWA, and admins monitor via a web dashboard.

## Team

| Member  | Role           |
|---------|----------------|
| Sairaj  | Backend/DevOps |
| Sufiyan | Frontend/PWA   |
| Tushar  | ML             |

## Tech Stack

| Layer              | Technology                                                 |
|--------------------|------------------------------------------------------------|
| Backend            | FastAPI, SQLAlchemy 2.0, Alembic                           |
| Database           | PostgreSQL 16 + PostGIS                                    |
| Cache / State      | Redis 7                                                    |
| Object Storage     | MinIO/S3                                                   |
| Frontend           | Vue 3 + Vite + Bootstrap 5 + Pinia                         |
| AI/ML              | MobileNetV2, DistilBERT, TensorFlow/Keras, Transformers    |
| Infrastructure     | Docker, Nginx, AWS EC2, GitHub Actions                     |

## Repository Layout

```
smart-grievance-system/
├── .github/         # CI/CD workflows and repository automation
├── backend/         # FastAPI application, database models, and API endpoints
├── docs/            # Project documentation and specifications
├── frontend/        # Vue 3 web dashboard and worker PWA
├── infra/           # Docker Compose, Nginx, and deployment configurations
├── ml/              # ML model inference pipelines and artifacts
├── ml-training/     # ML model training notebooks, scripts, and datasets
└── Project-Docs/    # Architectural guidelines, sprint plans, and project roadmaps
```

## Local Setup

Docker Compose setup will be finalized in the next milestone (feature/docker-compose).

## Branching Rules

- `main` = production
- `dev` = integration
- `feature/<short-description>` branches are created from `dev` and merged via PR into `dev`
- Never commit directly to `main` or `dev`
- One task = one branch

For detailed branching conventions and guidelines, see [Project-Docs/Branching-Strategy.md](Project-Docs/Branching-Strategy.md).

## License

This project is developed as part of a semester-3 academic project.
