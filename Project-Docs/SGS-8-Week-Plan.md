**SMART CIVIC GRIEVANCE SYSTEM**

**Detailed 8-Week Engineering Execution Plan**

Parallel Workstreams • Integration Gates • Deliverables • Testing • Deployment

| **Project**        | **Smart Civic Grievance System**                                                     |
|--------------------|--------------------------------------------------------------------------------------|
| Primary Interfaces | Citizen — Telegram Bot \| Field Worker — Mobile PWA \| Administrator — Web Dashboard |
| Core Intelligence  | MobileNetV2 image classification + DistilBERT text classification                    |
| Geographic Routing | PostgreSQL + PostGIS with four static zones (A/B/C/D)                                |
| Backend            | Python 3.11+ • FastAPI • SQLAlchemy • Alembic • Redis                                |
| Frontend           | Vue 3 • TypeScript • Vite • Bootstrap 5 • Pinia • Leaflet                            |
| Deployment         | Docker • Nginx • AWS EC2 • S3 • SSM • HTTPS • GitHub Actions                         |
| Team               | Sairaj — Backend/DevOps \| Sufiyan — Frontend/PWA \| Tushar — ML                     |
| Timeline           | 8 weeks                                                                              |

| **Document purpose** This document converts the finalized project architecture and decisions into an execution-ready 8-week build map. Work is intentionally parallelized, but each week ends with an integration gate so the project does not become three disconnected workstreams. |
|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|

*Implementation baseline • Version 1.0*

# 1. Executive Summary

The Smart Civic Grievance System is a three-interface civic complaint platform for Indian cities. Citizens report civic issues through Telegram, the AI layer classifies the complaint from an image or text, the citizen confirms the classification and provides location, and the backend creates a complaint with a grievance code. PostGIS determines the complaint zone, and the backend automatically assigns the complaint to an eligible field worker within the same department and zone. Workers operate through a responsive PWA and administrators monitor the system through a web dashboard.

## 1.1 Finalized complaint lifecycle

| **Stage**                | **System behavior**                                                         | **User-facing status** |
|--------------------------|-----------------------------------------------------------------------------|------------------------|
| 1\. Intake               | Citizen sends image, text, or image + optional text.                        | Not yet submitted      |
| 2\. AI classification    | MobileNetV2 or DistilBERT predicts category and confidence.                 | Not yet submitted      |
| 3\. Confirmation         | Citizen confirms the predicted category.                                    | Not yet submitted      |
| 4\. Location             | Citizen shares GPS location; location is mandatory before final submission. | Not yet submitted      |
| 5\. Finalization         | Backend creates complete complaint, SLA/deadline and grievance code.        | Submitted              |
| 6\. Automatic assignment | PostGIS zone + department + worker eligibility determine assignment.        | Submitted              |
| 7\. Work begins          | Worker starts the task.                                                     | In-Progress            |
| 8\. Resolution           | Worker submits resolution evidence and note.                                | Completed              |

| **Important scope decision** Only three user-facing complaint statuses are used: Submitted, In-Progress, and Completed. Internal logs/events may contain CREATED, CLASSIFIED, CONFIRMED, ASSIGNED, STARTED, DEFERRED and COMPLETED, but these are not exposed as additional complaint statuses. |
|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|

# 2. Master 8-Week Plan

| **Week** | **Backend / DevOps**                  | **Frontend / PWA**             | **AI / ML**               | **Integration Gate**              |
|----------|---------------------------------------|--------------------------------|---------------------------|-----------------------------------|
| 1        | Foundation, DB, Docker, CI            | Vue foundation, UI structure   | Dataset + training setup  | Local environment works           |
| 2        | Auth, RBAC, worker/department APIs    | Login, layouts, auth store     | Baseline models           | Authenticated API works           |
| 3        | Complaint service + Telegram flow     | Citizen/admin/worker skeletons | Inference service         | AI returns category               |
| 4        | Finalization, SLA, priority, queue    | Complaint/status UI            | Inference optimization    | Citizen can submit real complaint |
| 5        | PostGIS zones + automatic assignment  | Worker queue                   | Backend model integration | Complaint reaches correct worker  |
| 6        | Resolution, storage, notifications    | Worker PWA completion flow     | Final model evaluation    | Worker can complete complaint     |
| 7        | Analytics, audit, hotspots, hardening | Admin dashboard + maps         | ML evaluation/docs        | Full E2E system works             |
| 8        | AWS, HTTPS, CI/CD, security           | Production polish              | Final packaging           | Production/demo-ready deployment  |

## 2.1 Team ownership

| **Member** | **Primary ownership**       | **Secondary responsibility**                                  |
|------------|-----------------------------|---------------------------------------------------------------|
| Sairaj     | Backend + Database + DevOps | Integration, security, deployment, API contracts              |
| Sufiyan    | Frontend + Worker PWA       | UI/UX, API integration, dashboard and maps                    |
| Tushar     | AI/ML                       | Model evaluation, inference packaging, backend ML integration |

## 2.2 Parallelization principle

The team should not wait for one person to finish the entire system before starting another workstream. Instead, each week establishes the contracts and dependencies needed by the other members. Frontend can build against agreed API response shapes; ML can package an inference interface before final model accuracy is complete; backend can expose mocked interfaces while the final model or UI is still being developed.

# Week 1 — Foundation & Architecture

| **Weekly objective** Create a reproducible development environment and establish the database, service boundaries, repository structure, frontend shell and ML dataset/training pipeline. |
|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|

## Backend / Database / DevOps — Sairaj

- Create/verify repository structure, branching rules, .gitignore and README.

- Create Docker Compose for FastAPI, PostgreSQL 16 + PostGIS, Redis 7, MinIO and Vue development services.

- Build FastAPI skeleton: configuration, database connection, application startup, /health and /ready endpoints.

- Create SQLAlchemy models for citizen, admin, worker, department, zone, complaint, complaint_assignment, complaint_log, triage_queue and resolution.

- Create Alembic initial migration and verify migrations on a clean database.

- Create initial seed strategy for departments and four static zones: Zone A, Zone B, Zone C and Zone D.

- Set up GitHub Actions for linting and tests; add Ruff and Pytest baseline configuration.

## Frontend / PWA — Sufiyan

- Initialize Vue 3 + TypeScript + Vite + Bootstrap 5.

- Configure Vue Router, Pinia and Axios.

- Create shared layout/navigation primitives and route placeholders for /login, /admin and /worker.

- Define a basic design system for cards, tables, status badges, priority indicators and loading/error states.

- Agree on API response conventions with backend before building feature-heavy screens.

## AI / ML — Tushar

- Collect and clean the project dataset.

- Finalize the eight-category taxonomy and map each category to its responsible department.

- Prepare train/validation/test split.

- Create baseline MobileNetV2 pipeline for the three image-oriented categories.

- Create baseline DistilBERT pipeline for the text-oriented categories.

- Define the inference contract: input, predicted category, confidence and model metadata.

## Integration activities

- Run docker compose from a clean checkout.

- Verify frontend can reach FastAPI.

- Verify FastAPI can reach PostgreSQL/PostGIS and Redis.

- Verify MinIO is reachable for local object storage.

- Commit initial API contract and model inference contract.

- Run the first CI pipeline.

## Week-end integration gate

| **Gate**    | **Definition of done**                                                                                                                                                                     |
|-------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Week 1 gate | docker compose up succeeds; database migrations run cleanly; /health and /ready work; Vue loads; Redis and MinIO are reachable; ML training notebooks/scripts are reproducible; CI passes. |

## Suggested implementation artifacts

- backend/app/main.py

- backend/app/core/config.py

- backend/app/db/

- backend/app/models/

- backend/app/schemas/

- backend/app/services/

- backend/app/api/v1/

- frontend/src/router/

- frontend/src/stores/

- ml/notebooks/ and ml/src/

- docker-compose.yml

- .github/workflows/ci.yml

## Risks / watch-outs

- Do not spend the whole week polishing the UI.

- Do not create microservices before there is a real need.

- Do not postpone migrations; schema drift becomes expensive once parallel development starts.

# Week 2 — Core Backend & Authentication

| **Weekly objective** Make the backend usable by real users: secure login, role-based access, worker management and static geographic configuration. |
|-----------------------------------------------------------------------------------------------------------------------------------------------------|

## Backend / Database / DevOps — Sairaj

- Implement admin authentication with username + password.

- Implement worker authentication with phone + 4-digit PIN.

- Use bcrypt for password/PIN hashing and JWT access tokens.

- Implement authentication dependencies and RBAC for admin and worker endpoints.

- Add CORS configuration and SlowAPI rate limiting.

- Create worker CRUD APIs and department assignment.

- Allow admin to activate/deactivate workers.

- Store each worker's fixed department and fixed zone.

- Seed the four static zones and required departments.

- Add server-side validation and authorization tests.

## Frontend / PWA — Sufiyan

- Build admin and worker login screens.

- Create Pinia auth store and Axios interceptor for access tokens.

- Add route guards for protected pages.

- Build initial admin worker-management screen.

- Build initial worker shell with placeholder task queue.

- Handle 401/403/error states consistently.

## AI / ML — Tushar

- Continue baseline model training.

- Measure accuracy, precision/recall and confusion matrix.

- Package model artifacts so the backend can load them through a stable interface.

- Define minimum confidence behavior and document the chosen threshold after evaluation.

## Integration activities

- Admin logs in successfully.

- Admin creates a worker and assigns department + fixed zone.

- Worker can log in and access protected routes.

- Frontend and backend agree on auth response structure.

- Model artifact loading is tested independently of Telegram.

## Week-end integration gate

| **Gate**    | **Definition of done**                                                                                                                                                             |
|-------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Week 2 gate | Admin and worker authentication works end-to-end; RBAC blocks unauthorized routes; workers have a department and one of Zone A/B/C/D; baseline models can be loaded for inference. |

## Suggested implementation artifacts

- auth service + JWT utilities

- worker/department API routes

- frontend auth store and guards

- seed_static_zones.py

- ML model loading/inference module

## Risks / watch-outs

- Never store raw worker PINs.

- Do not allow inactive workers to receive future assignments.

- Do not hard-code secrets into the repository.

# Week 3 — Complaint Intake & AI Classification

| **Weekly objective** Build the complaint intake service and Telegram conversation flow while the ML models become callable through a near-real-time inference interface. |
|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------|

## Backend / Database / DevOps — Sairaj

- Create complaint service and initial complaint API contracts.

- Generate unique grievance/tracking codes.

- Implement complaint log creation.

- Implement Telegram webhook endpoint and session service.

- Use Redis only for incomplete Telegram conversation state.

- Implement the conversation state machine: START → AWAITING_IMAGE/TEXT → CLASSIFYING → AWAITING_CONFIRMATION → AWAITING_LOCATION → AWAITING_DESCRIPTION → SUMMARY → CONFIRMED → SUBMITTED.

- Store uploaded media in MinIO locally, with an abstraction that can use S3 in production.

- Add validation for supported media types and file size.

## Frontend / PWA — Sufiyan

- Create admin complaint preview.

- Create worker complaint detail skeleton using complaint data only.

- Build reusable complaint card, category badge, priority badge and location components.

- Build loading/error states for AI classification and complaint retrieval.

## AI / ML — Tushar

- Expose MobileNetV2 image inference.

- Expose DistilBERT text inference.

- Return predicted category + confidence in a stable response.

- Target text inference around 1–2 seconds and image inference around 1–5 seconds; overall AI response should ideally be under 5 seconds, with 10–15 seconds treated as an acceptable upper bound depending on deployment hardware.

- Test inference using representative examples and failure cases.

- Document model version and preprocessing requirements.

## Integration activities

- Telegram → FastAPI → Redis session is verified.

- Image/text reaches the inference layer.

- Telegram receives the predicted category and confidence.

- Citizen can confirm or reject the category.

- Backend retains incomplete sessions in Redis rather than creating incomplete permanent complaints.

## Week-end integration gate

| **Gate**    | **Definition of done**                                                                                                                                        |
|-------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Week 3 gate | AI returns a category for both image and text inputs, Telegram conversation state survives between messages, and the backend has a stable inference contract. |

## Suggested implementation artifacts

- complaint service

- telegram webhook/session service

- Redis session schema

- ML inference endpoint/module

- complaint log service

- object storage adapter

## Risks / watch-outs

- Do not mark a complaint Submitted before the citizen completes the required confirmation and location steps.

- Keep AI classification synchronous from the user's perspective even if internal implementation uses a lightweight background mechanism.

- Do not expose citizen personal information in worker-facing payloads.

# Week 4 — Complaint Finalization & SLA

| **Weekly objective** Complete the citizen reporting flow: confirmation, mandatory location, optional description, final summary, grievance code, persistence, SLA/deadline and dynamic queue ordering. |
|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|

## Backend / Database / DevOps — Sairaj

- Finalize the Telegram reporting flow.

- Require location before final submission.

- Accept image, text, or image + optional text as defined by the project flow.

- Generate the final complaint record only after required information is complete.

- Persist complaint and logs in a transaction.

- Delete the completed Redis session after successful persistence.

- Calculate category-based SLA/deadline.

- Set priority using the project's configured severity rules.

- Implement dynamic queue ordering with overdue complaints taking absolute precedence.

- Among overdue complaints, use severity/priority followed by age/time remaining and carry-forward/tie-break logic.

- Ensure queue reordering does not automatically reassign an already assigned complaint.

- Keep only Submitted, In-Progress and Completed as user-facing statuses.

## Frontend / PWA — Sufiyan

- Build citizen-facing submission/confirmation states.

- Build complaint detail/status view showing the three statuses.

- Show grievance code clearly after submission.

- Show loading state while AI classification is occurring.

- Build admin complaint list with priority, deadline and overdue indicators.

- Build worker queue shell that can later consume the automatic assignment API.

## AI / ML — Tushar

- Optimize inference where necessary.

- Evaluate false classifications and low-confidence cases.

- Document final category mappings and expected confidence behavior.

- Package the best-performing model versions for integration.

## Integration activities

- Run a real Telegram submission using a test citizen.

- Verify AI classification, confirmation, GPS location and summary.

- Verify complaint is persisted with tracking code, category, location, priority and deadline.

- Verify user-facing status is Submitted.

- Verify overdue ordering rules using seeded test data.

## Week-end integration gate

| **Gate**    | **Definition of done**                                                                                                                                                                       |
|-------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Week 4 gate | An actual complaint can be submitted through Telegram from start to finish and appears in PostgreSQL with a grievance code, location, category, priority, SLA/deadline and Submitted status. |

## Suggested implementation artifacts

- final Telegram conversation handler

- complaint creation transaction

- SLA/priority service

- queue ordering query/service

- citizen status UI

- admin complaint list

## Risks / watch-outs

- Concrete SLA hours must be finalized/configured before production; source documentation contains category ranges rather than a universal final value.

- Do not introduce Assigned, Resolved or Closed as new user-facing statuses.

- Do not make the 6 AM daily allocation job the core assignment mechanism; assignment is lifecycle-driven.

# Week 5 — PostGIS Zones & Automatic Worker Assignment

| **Weekly objective** Implement the core geographic dispatch logic. A complaint is automatically assigned to an eligible worker in the responsible department and the complaint's static zone. |
|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|

## Backend / Database / DevOps — Sairaj

- Store complaint location as a PostGIS Point.

- Store each zone as a static Polygon.

- Determine complaint zone using PostGIS spatial containment such as ST_Within()/ST_Contains().

- Filter eligible workers by responsible department.

- Filter eligible workers by complaint zone.

- Exclude inactive workers.

- Calculate current active workload for eligible workers.

- Select the lowest-workload eligible worker.

- Use shortest distance to the complaint as the primary tie-breaker when workload is equal.

- Use oldest last-assignment timestamp as a final tie-breaker.

- Create the assignment atomically in a database transaction.

- Enforce a database/application rule preventing more than one active assignment per complaint.

- If no eligible worker exists, keep the complaint in the zone/department queue and alert the admin; do not require manual approval for ordinary assignments.

## Frontend / PWA — Sufiyan

- Build worker task queue from assigned complaints.

- Display complaint code, category, description, image, location, priority, SLA/deadline and current status.

- Do not display citizen personal information.

- Add priority and overdue sorting indicators.

- Add a simple 'Get Directions' action that opens Google Maps; do not build route optimization.

## AI / ML — Tushar

- Integrate the finalized model package with the backend.

- Confirm category → department mapping is deterministic.

- Verify low-confidence behavior is documented and does not break assignment.

## Integration activities

- Create test complaints in all four zones.

- Create workers across departments and zones.

- Verify wrong-zone workers are excluded.

- Verify wrong-department workers are excluded.

- Verify inactive workers are excluded.

- Verify workload and tie-break rules.

- Verify one complaint is assigned to exactly one eligible worker.

## Week-end integration gate

| **Gate**    | **Definition of done**                                                                                                                                                                                                  |
|-------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Week 5 gate | Creating a Submitted complaint with a valid location automatically determines the zone and assigns the complaint to exactly one eligible worker based on department, zone, active status, workload and tie-break rules. |

## Suggested implementation artifacts

- PostGIS zone queries

- assignment service

- assignment transaction

- worker workload query

- worker queue endpoint

- database constraint/indexes for active assignment

## Risks / watch-outs

- Automatic assignment is a core project feature; do not replace it with admin-confirmed assignment.

- Do not reassign merely because queue priority changes.

- Reassignment is reserved for operational events such as worker deactivation, explicit deferral/requeue or invalid assignment.

# Week 6 — Worker PWA & Resolution

| **Weekly objective** Complete the field-worker workflow from task receipt to evidence-backed completion. |
|----------------------------------------------------------------------------------------------------------|

## Backend / Database / DevOps — Sairaj

- Create resolution API.

- Validate that only the assigned worker can start/complete the task.

- Allow worker to change complaint to In-Progress when work begins.

- Accept resolution photo + resolution note.

- Upload resolution evidence to object storage.

- Create resolution record and completion timestamp.

- Update complaint to Completed in the same logical transaction.

- Create complaint log entries for start, deferral and completion.

- Support deferral/cannot-complete with a reason and carry-forward count without adding a new user-facing complaint status.

- Send citizen completion notification through Telegram.

## Frontend / PWA — Sufiyan

- Build Worker PWA login.

- Build task queue and task detail.

- Show complete complaint information required for field work, excluding citizen personal data.

- Add Get Directions action.

- Add Start Work / In-Progress action.

- Add resolution photo capture/upload.

- Add resolution note.

- Add Complete action with validation.

- Add defer/cannot-complete flow with reason.

- Build worker task history.

## AI / ML — Tushar

- Run final model evaluation.

- Prepare model metrics and confusion matrices for project documentation.

- Freeze model versions for production/demo.

- Document inference resource requirements and startup behavior.

## Integration activities

- Citizen complaint appears in correct worker queue.

- Worker opens task and navigates to location.

- Worker starts task; citizen-facing status becomes In-Progress.

- Worker submits evidence; backend validates assignment and stores evidence.

- Complaint becomes Completed.

- Citizen receives completion notification.

- Admin can see the completed complaint.

## Week-end integration gate

| **Gate**    | **Definition of done**                                                                                                                             |
|-------------|----------------------------------------------------------------------------------------------------------------------------------------------------|
| Week 6 gate | Worker can take a real assigned complaint from Submitted → In-Progress → Completed, with resolution evidence stored and citizen notification sent. |

## Suggested implementation artifacts

- worker task queue/detail components

- resolution service/API

- object storage integration

- notification service

- worker history endpoint

## Risks / watch-outs

- Completion must not be possible without the correct assignment.

- Resolution photo validation should enforce file type/size limits.

- Do not expose citizen phone, Telegram identity or other personal data in worker screens.

# Week 7 — Admin Dashboard, Analytics & Integration

| **Weekly objective** Turn the core system into an observable operational platform with dashboard metrics, hotspot analysis, search, exports, audit logs and full end-to-end testing. |
|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|

## Backend / Database / DevOps — Sairaj

- Implement admin metrics endpoints.

- Add complaint search/detail endpoints.

- Add CSV/Excel export.

- Implement audit/complaint log viewing where appropriate.

- Implement hotspot query using PostGIS ST_DWithin() and spatial aggregation.

- Support practical filters such as date, category, department and zone.

- Add security hardening and API validation review.

- Review database indexes and slow queries.

- Test assignment and SLA edge cases.

## Frontend / PWA — Sufiyan

- Build admin dashboard.

- Add totals for submitted, in-progress, completed and overdue complaints.

- Add category breakdown chart.

- Add time trend chart.

- Add hotspot map using Leaflet + OpenStreetMap.

- Add filters.

- Add worker management.

- Add complaint search/detail.

- Add export action.

- Polish responsive layouts.

## AI / ML — Tushar

- Complete model evaluation report.

- Document accuracy, precision/recall, confusion matrix and known failure cases.

- Document model version and inference latency.

- Confirm production model packaging.

## Integration activities

- Run complete citizen → AI → assignment → worker → completion flow.

- Test multiple zones and departments.

- Test overdue ordering.

- Test inactive worker and no-eligible-worker cases.

- Test duplicate assignment prevention.

- Run bug bash with all three team members.

## Week-end integration gate

| **Gate**    | **Definition of done**                                                                                                                                                                                                                              |
|-------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Week 7 gate | Full end-to-end system works locally: Telegram intake → AI classification → confirmation → location → Submitted → PostGIS zone → automatic worker assignment → PWA → In-Progress → resolution → Completed → citizen notification → admin dashboard. |

## Suggested implementation artifacts

- admin metrics endpoints

- hotspot query/service

- dashboard pages

- Leaflet hotspot map

- export endpoint

- audit/log views

- E2E test scenarios

## Risks / watch-outs

- Do not overbuild analytics. The dashboard needs operational visibility, not a research-grade BI system.

- Hotspot analysis can use density/grid/spatial aggregation; complex clustering is not required.

- Fix integration defects before visual polish.

# Week 8 — Deployment, Security & Final Validation

| **Weekly objective** Deploy the system to AWS, secure it, establish CI/CD and validate the complete project against the final demo scenario. |
|----------------------------------------------------------------------------------------------------------------------------------------------|

## Backend / Database / DevOps — Sairaj

- Create production Docker configuration.

- Deploy to AWS EC2.

- Use Nginx as reverse proxy.

- Configure HTTPS with Let's Encrypt/Certbot.

- Use AWS S3 for production object storage.

- Use AWS SSM Parameter Store for secrets.

- Configure production environment variables.

- Set up GitHub Actions: lint → tests → build → deploy.

- Perform security review: JWT, RBAC, bcrypt, rate limits, CORS, file validation, Telegram webhook security, HTTPS and secret management.

- Review logs, backups and database operational procedures.

## Frontend / PWA — Sufiyan

- Build production frontend.

- Verify PWA installability and responsive behavior.

- Test Telegram, worker and admin interfaces against production APIs.

- Fix mobile layout issues.

- Run final browser/device smoke tests.

## AI / ML — Tushar

- Package frozen model artifacts with the deployment.

- Verify startup loading and inference latency in production-like hardware.

- Run final smoke tests for image and text classification.

## Integration activities

- Deploy from a clean commit.

- Run production smoke tests.

- Execute final demo scenario.

- Record defects and fix only release-blocking issues.

- Freeze a demo build and tag the release.

- Prepare final technical documentation and presentation material.

## Week-end integration gate

| **Gate**    | **Definition of done**                                                                                                                                                                       |
|-------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Week 8 gate | Production deployment is reachable over HTTPS and the complete demo scenario works from citizen complaint submission through AI, PostGIS assignment, worker resolution and admin visibility. |

## Suggested implementation artifacts

- docker-compose.prod.yml

- Nginx configuration

- GitHub Actions deployment workflow

- AWS SSM parameter configuration

- S3 object storage configuration

- production smoke-test checklist

- release tag

## Risks / watch-outs

- Do not introduce new major features in the final week.

- Keep a rollback path for the previous working deployment.

- Validate secrets and production configuration separately from code.

# 11. Detailed Parallel Work Map

| **Week** | **Sairaj — Backend/DevOps**         | **Sufiyan — Frontend/PWA**         | **Tushar — ML**            | **Shared checkpoint**     |
|----------|-------------------------------------|------------------------------------|----------------------------|---------------------------|
| 1        | Docker, DB, FastAPI, migrations, CI | Vue shell, routing, stores         | Dataset, splits, baselines | Contracts + local stack   |
| 2        | Auth, RBAC, workers, zones          | Login, layouts, worker/admin shell | Training + metrics         | Authenticated API         |
| 3        | Complaint service, Telegram, Redis  | Complaint components               | Inference service          | AI classification         |
| 4        | Finalization, SLA, queue            | Citizen/admin status UI            | Optimization/evaluation    | Real complaint submission |
| 5        | PostGIS + automatic assignment      | Worker queue                       | Backend model integration  | Correct worker assignment |
| 6        | Resolution + notification           | Complete PWA                       | Model freeze               | Real resolution           |
| 7        | Analytics + security                | Dashboard + maps                   | Evaluation/docs            | Full E2E                  |
| 8        | AWS + CI/CD + hardening             | Production polish                  | Deployment package         | Release validation        |

## 11.1 Critical coordination points

| **When** | **People**       | **Alignment required**                                                           |
|----------|------------------|----------------------------------------------------------------------------------|
| Week 1   | Sairaj + Sufiyan | API request/response shapes and error format before feature-heavy frontend work. |
| Week 1–2 | Sairaj + Tushar  | Category taxonomy, department mapping and model input/output contract.           |
| Week 3   | Sairaj + Tushar  | Model artifact format, loading interface and inference latency.                  |
| Week 4   | All 3            | Real Telegram submission and AI confirmation flow.                               |
| Week 5   | Sairaj + Sufiyan | Worker assignment endpoint and queue payload.                                    |
| Week 6   | All 3            | Complete resolution flow and notification behavior.                              |
| Week 7   | All 3            | End-to-end testing and bug bash.                                                 |
| Week 8   | All 3            | Production smoke test and final demo freeze.                                     |

# 12. Core Technical Contracts

## 12.1 Complaint submission contract

| **Field**                 | **Requirement**                                                                         |
|---------------------------|-----------------------------------------------------------------------------------------|
| Input                     | Image, text, or image + optional text                                                   |
| AI result                 | Category + confidence                                                                   |
| Confirmation              | Citizen confirmation required before final submission                                   |
| Location                  | Mandatory GPS location                                                                  |
| Description               | Optional/required according to the final Telegram flow; must be persisted when supplied |
| Status after finalization | Submitted                                                                               |
| Tracking                  | Unique grievance/tracking code                                                          |
| Priority                  | Configured severity/priority                                                            |
| SLA                       | Category-based deadline                                                                 |
| Storage                   | PostgreSQL/PostGIS + object storage for media                                           |

## 12.2 Automatic assignment contract

1.  Identify the responsible department from the confirmed complaint category.

2.  Determine the complaint's static geographic zone using PostGIS.

3.  Filter workers to the same department and same zone.

4.  Exclude inactive workers.

5.  Calculate active assignment workload.

6.  Select the worker with the lowest active workload.

7.  Tie-break by shortest distance to the complaint.

8.  If still tied, use oldest last-assignment timestamp.

9.  Create exactly one active assignment atomically.

10. If no eligible worker exists, keep the complaint in the zone/department queue and alert the administrator.

## 12.3 Worker-facing data boundary

Worker task payload should contain the information needed to resolve the complaint, but not citizen personal information.

| **Show to worker**        | **Do not show to worker**                             |
|---------------------------|-------------------------------------------------------|
| Grievance code            | Citizen phone number                                  |
| Category                  | Telegram identity/chat ID                             |
| Description               | Citizen account details                               |
| Complaint image           | Unnecessary personal metadata                         |
| Location                  | Private citizen information not needed for field work |
| Priority and SLA/deadline |                                                       |
| Current complaint status  |                                                       |

# 13. Database & API Implementation Checklist

| **Area**     | **Required implementation**                              | **Validation**                                       |
|--------------|----------------------------------------------------------|------------------------------------------------------|
| Identity     | Citizen, worker and admin entities                       | Unique Telegram identity / worker phone; role checks |
| Organization | Department + fixed worker assignment                     | Worker has one department and one zone               |
| Geography    | Zone polygons + complaint points                         | Spatial containment query returns expected zone      |
| Complaint    | Category, status, description, location, media reference | Required fields enforced                             |
| AI           | Confidence and classification metadata                   | Confidence range 0–1                                 |
| Assignment   | Assignment table + active assignment rule                | No duplicate active assignment                       |
| Lifecycle    | Complaint logs                                           | Every major state-changing operation logged          |
| Resolution   | Resolution record + evidence                             | Completed requires valid resolution evidence         |
| SLA          | Deadline/priority fields                                 | Overdue detection is deterministic                   |
| Storage      | Object references for complaint/resolution photos        | File validation + retrievable object                 |

# 14. Testing Strategy & Definition of Done

A feature is not considered complete when code merely exists. It is complete when it survives the relevant unit, API, integration, error-handling, security and end-to-end checks.

| **Level**         | **Examples**                                                                                       |
|-------------------|----------------------------------------------------------------------------------------------------|
| Unit tests        | Priority/SLA calculation, assignment selection, zone lookup, validation, authentication utilities. |
| API tests         | Login, worker CRUD, complaint creation, assignment, start, complete, export, analytics.            |
| Integration tests | FastAPI ↔ PostgreSQL, Redis sessions, object storage, ML inference adapter.                        |
| Frontend tests    | Auth guards, stores, critical forms, queue/detail behavior.                                        |
| E2E tests         | Telegram submission → AI → location → assignment → worker → completion → notification.             |
| Security checks   | RBAC, inactive worker exclusion, rate limits, CORS, file validation, secret handling.              |
| Operational tests | Container startup, migrations, production configuration, HTTPS, deployment rollback.               |

## 14.1 Automatic assignment definition of done

- Complaint is created with a valid location.

- Correct responsible department is determined.

- Correct static zone is determined.

- Workers from other departments are excluded.

- Workers from other zones are excluded.

- Inactive workers are excluded.

- Active workload is calculated.

- Lowest workload worker is selected.

- Tie-break rules are applied deterministically.

- Only one active assignment exists.

- Assignment is visible in the correct worker queue.

- No eligible worker path is handled safely.

## 14.2 Worker completion definition of done

- Worker is authenticated and is the assigned worker.

- Complaint changes to In-Progress when work starts.

- Resolution note can be submitted.

- Resolution photo is validated and stored.

- Resolution record is created.

- Complaint changes to Completed.

- Completion is logged.

- Citizen receives the completion notification.

- Admin dashboard reflects the updated complaint.

# 15. Scope Control

| **Required for the 8-week target** Protect the core vertical slice. New features should not be accepted if they threaten the Week 6 end-to-end milestone. |
|-----------------------------------------------------------------------------------------------------------------------------------------------------------|

## 15.1 Explicitly out of scope

- Native Android/iOS applications.

- Offline worker mode.

- Complex route optimization.

- Dynamic GIS zone editor.

- OAuth/OIDC authentication.

- Sophisticated fraud or anti-screenshot detection.

- Complex worker performance analytics.

- AI chatbot or voice reporting.

- Automatic reassignment whenever queue priority changes.

- Complex notification infrastructure.

- Celery/RabbitMQ unless actual scale requirements justify it.

- Unnecessary microservice decomposition.

## 15.2 Priority if the team falls behind

| **Priority tier**  | **Keep / build**                                                                                                                                                |
|--------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Tier 1 — Required  | Backend, DB, auth, Telegram, AI classification, location, complaint creation, static zones, automatic assignment, worker PWA, three statuses, resolution photo. |
| Tier 2 — Important | SLA, dynamic queue priority, admin dashboard, notifications, PostGIS hotspots, exports, audit logs.                                                             |
| Tier 3 — Polish    | Advanced charts, extra filters, visual refinement, performance polish, documentation/demo polish.                                                               |

# 16. Final Demonstration Scenario

| **Step** | **Expected behavior**                                                                                                    |
|----------|--------------------------------------------------------------------------------------------------------------------------|
| 1        | Citizen starts a complaint in Telegram and sends a garbage photo.                                                        |
| 2        | AI classifies it as Solid Waste & Garbage within the near-real-time target and returns confidence.                       |
| 3        | Citizen confirms the category.                                                                                           |
| 4        | Citizen shares GPS location and optional description.                                                                    |
| 5        | Bot displays the final summary; citizen confirms.                                                                        |
| 6        | Backend creates the complaint, generates a grievance code and stores it with Submitted status.                           |
| 7        | PostGIS determines the complaint's static zone.                                                                          |
| 8        | Automatic assignment filters workers by department + zone + active status, then selects by workload and tie-break rules. |
| 9        | Worker sees the task in the PWA without citizen personal information.                                                    |
| 10       | Worker selects Get Directions and navigates to the complaint.                                                            |
| 11       | Worker starts work; complaint becomes In-Progress.                                                                       |
| 12       | Worker uploads resolution photo + note.                                                                                  |
| 13       | Backend records the resolution and changes the complaint to Completed.                                                   |
| 14       | Citizen receives completion notification.                                                                                |
| 15       | Administrator sees the updated complaint and related dashboard/hotspot data.                                             |

## 16.1 Final success criteria

- Citizen can submit a civic complaint through Telegram using image or text.

- AI classifies the complaint near-real-time and the citizen confirms the result.

- Location is captured before final submission.

- A unique grievance code is generated.

- Complaint is stored persistently with category, location, priority and SLA/deadline.

- Static geographic zones determine the complaint's zone.

- Complaint is automatically assigned to an eligible worker in the same department and zone.

- Worker receives the task in the PWA.

- Worker can navigate, start work, submit evidence and complete the complaint.

- Citizen-facing status follows Submitted → In-Progress → Completed.

- Administrator can monitor complaints, workers, trends and hotspots.

- System is deployed over HTTPS with the required security controls.

# 17. Key Engineering Risks & Controls

| **Risk**                              | **Control**                                                                                                             |
|---------------------------------------|-------------------------------------------------------------------------------------------------------------------------|
| AI inference is too slow              | Optimize model loading/inference; target \<5 sec overall and treat 10–15 sec as upper bound for deployment constraints. |
| Model accuracy is weak                | Use held-out test set, confusion matrix, confidence analysis and clear category mapping.                                |
| Assignment conflict                   | Atomic transaction + one-active-assignment rule + deterministic selection.                                              |
| No worker available                   | Leave complaint in zone/department queue and alert admin; do not fail complaint creation.                               |
| Schema drift                          | Alembic migrations + shared API contract.                                                                               |
| Frontend/backend integration mismatch | Freeze request/response shapes before feature-heavy frontend work.                                                      |
| Production secret leakage             | Environment variables locally; AWS SSM in production; never commit secrets.                                             |
| Scope creep                           | Use Tier 1/2/3 priority and protect the Week 6 vertical slice.                                                          |
| Late deployment problems              | Start deployment preparation in Week 7 and deploy in Week 8 with smoke tests.                                           |

# 18. Week-by-Week Deliverables Summary

| **Week** | **Primary deliverable**         | **Proof**                                                       |
|----------|---------------------------------|-----------------------------------------------------------------|
| 1        | Working local engineering stack | Docker Compose + migrations + CI + frontend shell + ML baseline |
| 2        | Secure authenticated backend    | Admin/worker login + worker management + fixed zones            |
| 3        | AI-enabled complaint intake     | Telegram + Redis session + category prediction                  |
| 4        | Real citizen submission         | Location + summary + grievance code + Submitted complaint       |
| 5        | Automatic dispatch              | PostGIS zone + eligible worker selection + atomic assignment    |
| 6        | Field resolution workflow       | Worker PWA + In-Progress + resolution evidence + Completed      |
| 7        | Operational dashboard           | Metrics + trends + hotspots + search + exports + E2E            |
| 8        | Production-ready demo           | AWS + HTTPS + CI/CD + security + final smoke test               |

# Appendix A — Reference Technology Stack

| **Layer**                 | **Technology**                                                 |
|---------------------------|----------------------------------------------------------------|
| Language                  | Python 3.11+                                                   |
| Backend                   | FastAPI, SQLAlchemy 2.0, Pydantic 2.x, Alembic                 |
| Authentication            | JWT, bcrypt, RBAC                                              |
| Rate limiting             | SlowAPI                                                        |
| Citizen interface         | python-telegram-bot                                            |
| Frontend                  | Vue 3, TypeScript, Vite, Bootstrap 5, Pinia, Vue Router, Axios |
| Charts                    | Chart.js / vue-chartjs                                         |
| Maps                      | Leaflet + OpenStreetMap                                        |
| Image ML                  | MobileNetV2 + TensorFlow/Keras                                 |
| Text ML                   | DistilBERT + Hugging Face Transformers                         |
| Database                  | PostgreSQL 16 + PostGIS                                        |
| Session state             | Redis 7                                                        |
| Local object storage      | MinIO                                                          |
| Production object storage | AWS S3                                                         |
| Infrastructure            | Docker, Docker Compose, Nginx                                  |
| Cloud                     | AWS EC2 + SSM Parameter Store                                  |
| TLS                       | Let's Encrypt + Certbot                                        |
| CI/CD                     | GitHub Actions                                                 |
| Testing                   | Pytest + Vitest                                                |
| Code quality              | Ruff + ESLint + Prettier                                       |
| API documentation         | OpenAPI / Swagger                                              |
| Navigation                | Google Maps directions                                         |

# Appendix B — Implementation Notes

- Redis is retained for Telegram session state; it is not a general task broker.

- Lightweight FastAPI BackgroundTasks and APScheduler can be used where appropriate; do not introduce Celery without a concrete need.

- The worker PWA is online-only for the planned baseline.

- Static zones are seeded/configured; a complex GIS editing interface is outside the 8-week scope.

- Queue priority is dynamic, but ordinary priority changes do not trigger automatic reassignment.

- Exact SLA hours should be treated as configuration and finalized before production.

- The project should be built as a vertical slice: each major feature must be testable before moving to the next integration gate.

**END OF EXECUTION PLAN**
