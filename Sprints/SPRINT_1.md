> **IDE NOTE (read first):** We are on **Sprint 1** only. Work only on the SGMS issue keys listed in this file, one issue per request, in order (T1, then T2, then T3). Do not start, scaffold, stub or suggest anything from later sprints, even if you know what comes next. If I ask for something outside this list, reply "Outside Sprint 1" and ask me to confirm first. No extras or refactors beyond the issue. When every issue and the gate are done, say "Sprint 1 complete, stop here". Keep replies short and don't reprint unchanged files.


# Sprint 1: Foundation: Docker, models+migrations, Vue shell, ML baselines, API + inference contracts

- **Points:** 61 (SA 31 / SU 11 / TU 19)
- **Needs first:** nothing
- **Gate (SGMS-29):** docker compose up succeeds; migrations run cleanly; /health and /ready work; Vue loads; Redis and MinIO reachable; ML training scripts reproducible; CI passes.
- **Skip for now:** auth, Telegram, AI serving, assignment, dashboards
- **Drop first if behind (T3):** none

**Legend:** T1 core, T2 important, T3 droppable. `+` = added from master plan.

## Sairaj (SA) - backend / devops

| Key | Pts | Tier | Task |
|---|---:|:---:|---|
| SGMS-13 | 2 | T1 | Set up repo structure, branching rules, .gitignore and README |
| SGMS-14 | 5 | T1 | Docker Compose stack: FastAPI, PostgreSQL 16 + PostGIS, Redis 7, MinIO, Vue dev |
| SGMS-15 | 3 | T1 | FastAPI skeleton: config, DB connection, startup, /health and /ready |
| SGMS-16 | 8 | T1 | SQLAlchemy models for all 10 core entities |
| SGMS-17 | 3 | T1 | Alembic initial migration verified on a clean database |
| SGMS-18 | 3 | T1 | Seed strategy for departments and four static zones (A/B/C/D) *(also decide who owns real Zone A-D polygon coordinates)* |
| SGMS-19 | 3 | T1 | GitHub Actions CI with Ruff + Pytest baseline |
| SGMS-23 | 2 | T1 | Agree API response/error conventions and commit initial API contract |

## Sufiyan (SU) - frontend

| Key | Pts | Tier | Task |
|---|---:|:---:|---|
| SGMS-20 | 3 | T1 | Initialize Vue 3 + JavaScript + Vite + Bootstrap 5 with Router, Pinia and Axios |
| SGMS-21 | 3 | T1 | Shared layout/navigation and route placeholders (/login, /admin, /worker) |
| SGMS-22 | 5 | T2 | Basic design system: cards, tables, status/priority badges, loading/error states |

## Tushar (TU) - ML, tests, docs

| Key | Pts | Tier | Task |
|---|---:|:---:|---|
| SGMS-24 | 5 | T1 | Collect and clean dataset; prepare train/validation/test split |
| SGMS-25 | 2 | T1 | Finalize 8-category taxonomy and category-to-department mapping |
| SGMS-26 | 5 | T1 | Baseline MobileNetV2 pipeline (Solid Waste, Potholes, Waterlogging) |
| SGMS-27 | 5 | T1 | Baseline DistilBERT pipeline (Streetlight, Water Supply, Encroachment, Stray Animals, Admin Delay) |
| SGMS-28 | 2 | T1 | Define inference contract: input, predicted category, confidence, model metadata |

## Gate (whole team)

| Key | Pts | Tier | Task |
|---|---:|:---:|---|
| SGMS-29 | 2 | T1 | Week 1 Integration Gate verification |
