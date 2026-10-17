**SMART CIVIC GRIEVANCE SYSTEM**

**UPDATED MASTER PROJECT PLAN**

Requirements • Architecture • AI/ML • Database • Backend • Frontend • Security • DevOps • Data Flow • Governance

| **Document**                   | **Finalized project specification**  |
|--------------------------------|--------------------------------------|
| Project type                   | College semester project             |
| Team                           | 3 members — Sairaj, Sufiyan, Tushar  |
| Citizen interface              | Telegram Bot                         |
| Worker interface               | Mobile PWA / responsive web          |
| Administrator interface        | Web Dashboard                        |
| Core AI                        | MobileNetV2 + DistilBERT             |
| Geospatial layer               | PostgreSQL 16 + PostGIS              |
| Storage                        | MinIO locally → AWS S3 in production |
| Deployment                     | Docker + AWS EC2 + Nginx + HTTPS     |
| Overall implementation horizon | 4 weeks                              |
| Document status                | Updated master baseline              |

| **Purpose** This is the master project plan, not the week-by-week execution schedule. It defines what the system is, how it works, what is in scope, how the components interact, and the finalized engineering decisions that govern implementation. |
|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|

| **Source basis** Prepared from the uploaded project documentation and the finalized project decisions established during planning. Older source-document elements that conflict with the finalized design—especially complaint statuses, assignment timing, and the roadmap duration—are replaced by the current baseline. |
|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|

*Version 2.0 • Master Planning Baseline*

# Document Contents

- 1\. Project Overview and Vision

- 2\. Objectives and Success Criteria

- 3\. Scope and Non-Goals

- 4\. Users, Roles and Journeys

- 5\. Complaint Categories and Department Routing

- 6\. Final Complaint Lifecycle and Status Model

- 7\. System Architecture

- 8\. Technology Stack and Rationale

- 9\. AI/ML Pipeline

- 10\. Backend Architecture and Services

- 11\. Telegram Bot and Session Architecture

- 12\. Database Design and Data Integrity

- 13\. PostGIS and Geographic Intelligence

- 14\. Automatic Worker Assignment Engine

- 15\. Priority, SLA and Queue Management

- 16\. Worker PWA

- 17\. Administrator Dashboard

- 18\. Security and Authentication

- 19\. Background Tasks and Scheduling

- 20\. Object Storage and Media Handling

- 21\. End-to-End Data Flow

- 22\. API Surface and Contracts

- 23\. Infrastructure and DevOps

- 24\. Testing and Quality Strategy

- 25\. Observability, Logging and Auditability

- 26\. Development Governance and Team Responsibilities

- 27\. Final 4-Week Delivery Roadmap

- 28\. Integration Gates

- 29\. Final Demo Scenario

- 30\. Definition of Done and Acceptance Criteria

- 31\. Risks, Constraints and Mitigations

- 32\. Final Decision Register

- Appendix A — Technology Matrix

- Appendix B — Core Entity Reference

- Appendix C — AI Use Guidelines

# 1. Project Overview and Vision

The Smart Civic Grievance System is a digital civic complaint platform designed to reduce the friction of reporting municipal problems, automate classification and operational routing, provide field workers with actionable tasks, and give administrators a consolidated operational view.

## 1.1 Problem statement

- Citizens often face high friction when reporting civic problems and may need to visit government offices or use cumbersome systems.

- Existing complaints can lack precise location, structured classification, transparent tracking and proof of resolution.

- Field workers may receive vague tasks without adequate location, priority or evidence.

- Administrators need visibility into complaint volume, categories, geographic concentration, SLA performance and operational workload.

- The result is delayed resolution, poor transparency and weak accountability.

## 1.2 Solution vision

| **Capability**              | **System behavior**                                                                                     |
|-----------------------------|---------------------------------------------------------------------------------------------------------|
| Easy reporting              | Citizen reports through Telegram without installing a dedicated citizen app.                            |
| AI understanding            | Image and text complaints are classified automatically using dedicated models.                          |
| Citizen confirmation        | The predicted category is presented to the citizen before final submission.                             |
| Precise location            | GPS coordinates are captured and stored as a PostGIS point.                                             |
| Automatic routing           | Confirmed category maps to a responsible department.                                                    |
| Geographic assignment       | Complaint zone is determined using static PostGIS polygons.                                             |
| Automatic worker allocation | Eligible workers are filtered by department and zone and selected by workload/distance tie-break rules. |
| Operational priority        | Overdue complaints take absolute precedence; queue order is dynamic.                                    |
| Field resolution            | Worker receives task, navigates to location, submits evidence and completes it.                         |
| Transparency                | Citizen receives tracking and completion updates, including resolution evidence.                        |
| Governance                  | Admin dashboard provides metrics, trends, hotspots, worker management and audit visibility.             |

## 1.3 Three interfaces

| **User**      | **Interface** | **Primary purpose**                                                                                           |
|---------------|---------------|---------------------------------------------------------------------------------------------------------------|
| Citizen       | Telegram Bot  | Report, confirm, provide location, track and receive updates.                                                 |
| Field Worker  | Mobile PWA    | View assigned work, navigate, start work, defer when necessary and submit resolution evidence.                |
| Administrator | Web Dashboard | Manage workers, monitor complaints, triage low-confidence cases, inspect analytics and hotspots, export data. |

# 2. Objectives and Success Criteria

## 2.1 Primary objectives

| **ID** | **Objective**                       | **Success criterion**                                                                              |
|--------|-------------------------------------|----------------------------------------------------------------------------------------------------|
| O1     | Digitize civic grievance resolution | Citizen can file, track and receive resolution updates digitally.                                  |
| O2     | Reduce operational friction         | AI classification, automatic assignment and SLA-driven prioritization reduce manual routing work.  |
| O3     | Provide useful AI classification    | MobileNetV2 and DistilBERT are evaluated on held-out data and integrated with confidence handling. |
| O4     | Provide transparency                | Every complaint has a grievance code, user-facing status and auditable log trail.                  |
| O5     | Enable geographic intelligence      | PostGIS supports zone routing, distance calculations and hotspot analysis.                         |
| O6     | Provide operational visibility      | Admin dashboard shows complaint counts, categories, trends, overdue work and hotspots.             |

## 2.2 Technical objectives

- Containerized development and production deployment.

- Versioned database migrations using Alembic.

- JWT-based authentication and RBAC for admin and worker interfaces.

- Secure file storage through MinIO locally and S3 in production.

- FastAPI service layer with reusable business logic.

- Vue 3 frontend with responsive worker PWA behavior.

- CI/CD through GitHub Actions.

- HTTPS through Nginx and Let's Encrypt in production.

- Structured logging, health checks and API documentation.

- Testable vertical slices rather than disconnected feature groups.

## 2.3 AI latency target

| **Workload**           | **Target**                                                          |
|------------------------|---------------------------------------------------------------------|
| Text classification    | Approximately 1–2 seconds                                           |
| Image classification   | Approximately 1–5 seconds                                           |
| Overall AI interaction | Ideally under 5 seconds                                             |
| Acceptable upper bound | 10–15 seconds depending on image processing and deployment hardware |

| **Important** AI classification is part of the complaint intake flow and should feel near-real-time to the citizen. The system should not treat classification as a delayed batch operation from the user's perspective. |
|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|

# 3. Scope and Non-Goals

## 3.1 In scope

- Telegram-based citizen complaint intake.

- Image, text, and image + optional text complaint inputs.

- MobileNetV2 image classification for three image-oriented categories.

- DistilBERT text classification for five text-oriented categories.

- Confidence-based manual triage path for low-confidence AI predictions.

- Citizen confirmation before final submission.

- Mandatory GPS location before final complaint creation.

- Unique grievance/tracking code.

- PostgreSQL + PostGIS persistence.

- Four static geographic zones: Zone A, Zone B, Zone C and Zone D.

- Automatic worker assignment based on department, zone, active status, workload and deterministic tie-breakers.

- Worker PWA with task queue, detail, directions, start/in-progress and resolution evidence.

- Exactly three user-facing complaint statuses: Submitted, In-Progress and Completed.

- SLA/deadline tracking and dynamic priority ordering.

- Admin dashboard, worker management, complaint search/detail, analytics, hotspots and export.

- Dockerized deployment, AWS production environment, HTTPS and CI/CD.

## 3.2 Explicitly out of scope

- Native Android or iOS citizen/worker applications.

- Offline worker mode.

- Complex route optimization.

- Dynamic GIS zone editor.

- OAuth/OIDC authentication in the baseline.

- Sophisticated fraud/anti-screenshot detection pipeline.

- Complex worker performance analytics.

- AI chatbot or voice reporting.

- Automatic reassignment whenever queue priority changes.

- Complex notification infrastructure.

- Celery/RabbitMQ unless actual scale later requires it.

- Unnecessary microservice decomposition.

| **Scope protection** The core project value is the vertical flow: Telegram → AI → confirmation → location → complaint → PostGIS zone → automatic worker assignment → PWA → resolution → citizen notification → admin visibility. |
|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|

# 4. Users, Roles and Journeys

## 4.1 Citizen

| **Aspect**     | **Definition**                                                                                    |
|----------------|---------------------------------------------------------------------------------------------------|
| Identity       | Telegram identity/session; citizen record is created automatically on first bot interaction.      |
| Input          | Photo, text, or photo + optional text.                                                            |
| Location       | One-tap GPS location; mandatory before final submission.                                          |
| AI interaction | Receives predicted category and confirms it.                                                      |
| Tracking       | Uses grievance code/status flow.                                                                  |
| Notifications  | Receives submission and completion updates.                                                       |
| Privacy        | Citizen information is not exposed to field workers unless specifically required by future scope. |

## 4.2 Citizen journey

1.  Start the Telegram reporting flow.

2.  Send image or text.

3.  System classifies the complaint and returns the predicted category.

4.  Citizen confirms the category.

5.  Citizen shares location.

6.  Citizen provides optional/required description according to the active bot flow.

7.  Bot shows a complete complaint summary.

8.  Citizen confirms final submission.

9.  Backend generates grievance code and stores the complaint.

10. Citizen can track the complaint and later receives completion notification with resolution evidence.

## 4.3 Field worker

| **Aspect**       | **Definition**                                                                             |
|------------------|--------------------------------------------------------------------------------------------|
| Authentication   | Phone number + 4-digit PIN.                                                                |
| Assignment       | Automatically assigned by backend; admin configures department and fixed zone.             |
| Interface        | Online-only mobile PWA / responsive web.                                                   |
| Task data        | Complaint code, category, description, image, location, priority, SLA/deadline and status. |
| Navigation       | Simple Get Directions action opening Google Maps.                                          |
| Work lifecycle   | Submitted → In-Progress → Completed.                                                       |
| Resolution       | Photo + note required for completion.                                                      |
| Privacy boundary | No citizen personal information in normal worker task payload.                             |

## 4.4 Administrator

| **Capability**       | **Description**                                                                |
|----------------------|--------------------------------------------------------------------------------|
| Live metrics         | Submitted, in-progress, completed, overdue and other operational counts.       |
| Complaint management | Search, inspect details and monitor status.                                    |
| Triage               | Review low-confidence AI cases and set the correct category.                   |
| Worker management    | Create, activate/deactivate, assign department and fixed zone.                 |
| Analytics            | Category breakdown, trends and practical filters.                              |
| Hotspots             | Spatial density/aggregation map through PostGIS + Leaflet.                     |
| Export               | CSV/Excel export.                                                              |
| Audit                | Complaint logs and operational events.                                         |
| Zones                | Four static zones are seeded/configured; complex zone editing is out of scope. |

# 5. Complaint Categories and Department Routing

| **Category**                   | **Input modality** | **Example**                   | **Responsible department**   | **Source SLA range** |
|--------------------------------|--------------------|-------------------------------|------------------------------|----------------------|
| Solid Waste & Garbage          | Image              | Garbage dump on street        | Solid Waste Management       | 24–48 hours          |
| Potholes & Road Damage         | Image              | Large pothole on road         | Roads & Public Works         | 48–72 hours          |
| Waterlogging & Drainage        | Image              | Flooded road after rain       | Stormwater & Drainage        | 24 hours             |
| Streetlight & Power Outage     | Text               | Streetlights not working      | Municipal Electrical Wing    | 24–48 hours          |
| Water Supply & Contamination   | Text               | No water supply since morning | Water Supply Board           | 24 hours             |
| Illegal Encroachment           | Text               | Hawkers blocking footpath     | Town Planning & Encroachment | 5–7 days             |
| Stray Animals & Pest Control   | Text               | Aggressive stray dogs         | Public Health & Veterinary   | 48 hours             |
| Administrative Delay & Conduct | Text               | Bribe demanded at ward office | Vigilance & Grievance Cell   | 7 days               |

| **SLA configuration** The source documentation provides target ranges rather than a single final production value for every category. Exact SLA hours should therefore be configuration values finalized before production. |
|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|

## 5.1 Classification mapping

- Image input routes to MobileNetV2.

- Text input routes to DistilBERT.

- Category mapping determines the responsible department.

- Low-confidence classification enters manual triage according to the confidence policy.

- Classification is confirmed by the citizen before the complaint becomes Submitted.

# 6. Final Complaint Lifecycle and Status Model

## 6.1 User-facing status model

| **Status**  | **Meaning**                                                                                                    | **Who/what causes it**                                           |
|-------------|----------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------|
| Submitted   | Complaint has been fully submitted and stored; it may be awaiting or already have automatic worker assignment. | Backend after citizen confirmation and required data validation. |
| In-Progress | Assigned worker has started work.                                                                              | Worker starts the task.                                          |
| Completed   | Worker has submitted valid resolution evidence and the backend has recorded completion.                        | Worker completion API after validation.                          |

| **Strict rule** Do not add Assigned, Resolved, Closed, Pending or similar statuses to the user-facing complaint lifecycle. Assignment is an internal operational event, not a fourth complaint status. |
|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|

## 6.2 Internal event/log vocabulary

| **Internal event** | **Purpose**                                 |
|--------------------|---------------------------------------------|
| CREATED            | Complaint record creation event.            |
| CLASSIFIED         | AI or manual classification event.          |
| CONFIRMED          | Citizen confirmed predicted category.       |
| ASSIGNED           | Automatic assignment event.                 |
| STARTED            | Worker began work.                          |
| DEFERRED           | Worker could not complete; reason recorded. |
| COMPLETED          | Resolution was accepted.                    |

## 6.3 Deferral and carry-forward

- Worker can report Cannot Complete with a reason.

- Deferral is recorded in complaint_log and carry-forward fields rather than becoming a new user-facing status.

- Task may re-enter the operational queue after deferral.

- Repeated deferrals can trigger administrative escalation.

- Priority changes alone do not automatically reassign an already assigned complaint.

# 7. System Architecture

## 7.1 High-level architecture

The baseline uses a layered monolithic backend rather than a distributed microservice architecture. FastAPI is the central application hub, with the AI models loaded inside the backend process, Redis for Telegram session state, PostgreSQL/PostGIS for persistent data and MinIO/S3 for media.

| **Layer**             | **Components**                                                                            | **Responsibility**                                        |
|-----------------------|-------------------------------------------------------------------------------------------|-----------------------------------------------------------|
| Interface             | Telegram Bot; Vue Admin Dashboard; Worker PWA                                             | User interaction and presentation.                        |
| API                   | FastAPI routes + Pydantic schemas + auth dependencies                                     | HTTP/webhook boundary, validation and authorization.      |
| Business logic        | Auth, complaint, classification, routing, assignment, notification, session, SLA services | Reusable application rules.                               |
| AI/ML                 | MobileNetV2, DistilBERT, NSFW filter                                                      | Classification and image safety gate.                     |
| Background/scheduling | FastAPI BackgroundTasks + APScheduler                                                     | Notifications, recurring SLA checks and operational jobs. |
| Data                  | PostgreSQL + PostGIS, Redis, MinIO/S3                                                     | Persistence, session state and media.                     |
| Infrastructure        | Docker, Nginx, AWS EC2, S3, SSM, HTTPS                                                    | Runtime, networking, deployment and secrets.              |

## 7.2 Architectural principles

- Routes handle HTTP concerns; business logic stays in services.

- Services are reusable from routes, background jobs and scripts.

- Pydantic schemas define and validate request/response boundaries.

- Database integrity rules complement application validation.

- Configuration changes between local and production; application logic should not.

- Build vertical slices so every major feature becomes testable.

## 7.3 Complaint architecture flow

Citizen → Telegram webhook → Redis session → AI classification → citizen confirmation → GPS location → final summary → FastAPI complaint service → PostgreSQL/PostGIS → automatic zone determination → automatic worker assignment → Worker PWA → resolution evidence → Completed → Telegram notification → Admin dashboard.

# 8. Technology Stack and Rationale

| **Layer**          | **Technology**                 | **Role / rationale**                                        |
|--------------------|--------------------------------|-------------------------------------------------------------|
| Runtime            | Python 3.11+                   | Shared backend/ML language.                                 |
| Backend            | FastAPI                        | Typed API framework with OpenAPI/Swagger and async support. |
| Validation         | Pydantic 2.x                   | Request/response and configuration validation.              |
| ORM                | SQLAlchemy 2.0                 | Database access and model layer.                            |
| Migrations         | Alembic                        | Versioned schema changes.                                   |
| Auth               | JWT + bcrypt                   | Token-based authentication and secure credential hashing.   |
| Rate limiting      | SlowAPI                        | API abuse protection.                                       |
| Citizen interface  | python-telegram-bot            | Telegram integration.                                       |
| Frontend           | Vue 3 + JavaScript + Vite      | Responsive web UI and PWA foundation.                       |
| UI                 | Bootstrap 5                    | Responsive components and consistent styling.               |
| State              | Pinia                          | Frontend state management.                                  |
| Charts             | Chart.js / vue-chartjs         | Admin analytics.                                            |
| Maps               | Leaflet + OpenStreetMap        | Hotspot visualization.                                      |
| Image AI           | MobileNetV2 + TensorFlow/Keras | Image category classification.                              |
| Text AI            | DistilBERT + Transformers      | Text category classification.                               |
| Database           | PostgreSQL 16 + PostGIS        | Relational + spatial data.                                  |
| Session state      | Redis 7                        | Telegram incomplete conversation state.                     |
| Local storage      | MinIO                          | S3-compatible local object storage.                         |
| Production storage | AWS S3                         | Durable object storage.                                     |
| Infrastructure     | Docker + Docker Compose        | Reproducible environments.                                  |
| Reverse proxy      | Nginx                          | Routing, SSL termination and static file serving.           |
| Cloud              | AWS EC2 + SSM                  | Compute and secret storage.                                 |
| CI/CD              | GitHub Actions                 | Lint/test/build/deploy automation.                          |
| Testing            | Pytest + Vitest                | Backend and frontend testing.                               |
| Quality            | Ruff + ESLint + Prettier       | Static quality and formatting.                              |
| Navigation         | Google Maps                    | Simple directions only.                                     |

# 9. AI/ML Pipeline

## 9.1 Model responsibilities

| **Model**   | **Input**       | **Output**            | **Categories**                                                               |
|-------------|-----------------|-----------------------|------------------------------------------------------------------------------|
| MobileNetV2 | Complaint image | Category + confidence | Solid Waste; Potholes; Waterlogging                                          |
| DistilBERT  | Complaint text  | Category + confidence | Streetlight; Water Supply; Encroachment; Stray Animals; Administrative Delay |
| NSFW filter | Uploaded image  | Safety decision       | Blocks inappropriate image uploads before normal classification.             |

## 9.2 Training pipeline

11. Collect representative image and text datasets.

12. Clean and label data according to the eight-category taxonomy.

13. Split into training, validation and test sets.

14. Train MobileNetV2 for image classes.

15. Train/fine-tune DistilBERT for text classes.

16. Evaluate using accuracy plus precision/recall and confusion matrix.

17. Package the selected model artifacts.

18. Integrate model loading and preprocessing into the backend inference module.

19. Measure inference latency on target deployment hardware.

## 9.3 Confidence routing

| **Confidence** | **Baseline behavior**                                                                                       |
|----------------|-------------------------------------------------------------------------------------------------------------|
| ≥ 70%          | Prediction can proceed to citizen confirmation as the suggested category.                                   |
| \< 70%         | Case enters manual triage according to the low-confidence policy; admin can review and assign the category. |

| **Finalized interaction** Even when the model is confident, the citizen confirms the predicted category before final complaint submission. Confidence routing is therefore a safety mechanism, not a replacement for citizen confirmation. |
|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|

## 9.4 AI integration constraints

- Models are loaded inside the backend rather than deployed as separate services.

- Model interface should return category, confidence, classifier source and model/version metadata.

- Image preprocessing must be deterministic between training and inference.

- Text tokenization must match the training configuration.

- Low-confidence cases must remain auditable.

# 10. Backend Architecture and Services

## 10.1 Three-layer backend

| **Layer**      | **Examples**                                                                                                                                                              | **Rule**                                                  |
|----------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------|
| Routes         | /api/v1/auth/\*, /api/v1/complaints/\*, /api/v1/workers/\*, /api/v1/admin/\*, /api/v1/webhook/\*                                                                          | Validate input, authorize, call service, return response. |
| Services       | auth_service, complaint_service, classification_service, routing_service, task_allocation_service, notification_service, session_service, sla_service, nsfw_check_service | Contain business rules.                                   |
| Models/Schemas | SQLAlchemy models + Pydantic schemas                                                                                                                                      | Represent persistence and validated data contracts.       |

## 10.2 Core services

| **Service**             | **Responsibility**                                                            |
|-------------------------|-------------------------------------------------------------------------------|
| auth_service            | Credential verification, password/PIN hashing, JWT creation/validation.       |
| complaint_service       | Complaint creation, status transitions, assignment checks and completion.     |
| classification_service  | Select image/text classifier, return category/confidence.                     |
| routing_service         | Map category to responsible department and determine zone.                    |
| task_allocation_service | Select eligible worker and create atomic assignment.                          |
| notification_service    | Send Telegram status/completion messages.                                     |
| session_service         | Create/read/update/delete Redis Telegram sessions with TTL.                   |
| sla_service             | Calculate deadlines, detect overdue complaints and support priority ordering. |
| nsfw_check_service      | Reject unsafe/inappropriate image uploads.                                    |
| storage utility         | Upload media and generate controlled access references/signed URLs.           |

## 10.3 Route security

- JWT is validated through FastAPI dependencies.

- RBAC is enforced at the route boundary.

- Worker routes verify the worker is acting on an assigned complaint.

- Admin routes require admin role.

- Citizen operations are associated with Telegram identity/session.

- Rate limiting and request validation occur before business logic.

# 11. Telegram Bot and Session Architecture

## 11.1 Conversation state

| **State**             | **Meaning**                                            |
|-----------------------|--------------------------------------------------------|
| START                 | User enters reporting flow.                            |
| AWAITING_IMAGE/TEXT   | Bot waits for complaint input.                         |
| CLASSIFYING           | AI is processing the submitted content.                |
| AWAITING_CONFIRMATION | Bot presents predicted category.                       |
| AWAITING_LOCATION     | Bot requests GPS coordinates.                          |
| AWAITING_DESCRIPTION  | Bot collects description where applicable.             |
| SUMMARY               | Bot shows complete complaint summary.                  |
| CONFIRMED             | Citizen confirmed final data.                          |
| SUBMITTED             | Backend persists complaint and returns grievance code. |

## 11.2 Redis session rules

- Redis stores incomplete conversation state only.

- Sessions have TTL/expiration behavior.

- Completed sessions are deleted after successful persistence.

- Redis is not the system of record for complaints.

- Complaint records belong in PostgreSQL.

## 11.3 Tracking

Tracking codes are unique, human-readable identifiers such as GRV-2026-A7X3. They allow citizens to refer to a complaint without exposing database UUIDs.

# 12. Database Design and Data Integrity

| **Schema evolution** The original source documentation describes six core tables. The updated architecture expands the operational model to explicitly represent departments, static zones, assignments and resolutions because these are required by the finalized automatic-dispatch workflow. |
|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|

## 12.1 Core entities

| **Entity**           | **Purpose**                                                  |
|----------------------|--------------------------------------------------------------|
| citizen              | Telegram users who submit complaints.                        |
| complaint            | Central complaint record.                                    |
| worker               | Field workers, department/zone assignment and active status. |
| admin                | Administrator accounts.                                      |
| department           | Responsible municipal departments.                           |
| zone                 | Four static geographic polygons.                             |
| complaint_assignment | Operational assignment history and active assignment state.  |
| complaint_log        | Audit history of complaint actions/events.                   |
| triage_queue         | Low-confidence AI cases requiring human review.              |
| resolution           | Resolution evidence, note and completion metadata.           |

## 12.2 Complaint fields

| **Field**                  | **Purpose**                              |
|----------------------------|------------------------------------------|
| id                         | UUID primary key.                        |
| tracking_code              | Unique grievance code.                   |
| citizen_id                 | Citizen foreign key.                     |
| category                   | Confirmed classification.                |
| department_id / department | Responsible department.                  |
| description                | Citizen description.                     |
| image_url / object_key     | Complaint image reference.               |
| location                   | PostGIS Point.                           |
| latitude / longitude       | Readable GPS coordinates where retained. |
| status                     | Submitted / In-Progress / Completed.     |
| ai_confidence              | 0–1 confidence value.                    |
| ai_classification_source   | image / text / manual.                   |
| priority                   | critical / high / medium / low.          |
| sla_deadline               | Resolution deadline.                     |
| carry_forward_count        | Number of operational deferrals.         |
| created_at                 | Submission timestamp.                    |
| resolved_at                | Completion timestamp.                    |

## 12.3 Integrity constraints

- Unique grievance/tracking code.

- Unique Telegram identity.

- Unique worker phone.

- Foreign keys enforced.

- Status constrained to the three user-facing values.

- Confidence constrained to 0–1.

- Location required before final submission.

- Resolution timestamp required when Completed.

- Inactive workers cannot receive new assignments.

- At most one active assignment per complaint.

- Assignment creation must be transactional.

## 12.4 PostGIS fields

| **Table** | **Geometry**                   | **Meaning**                    |
|-----------|--------------------------------|--------------------------------|
| complaint | Point                          | Citizen complaint coordinates. |
| zone      | Polygon                        | Static operational zone.       |
| worker    | Zone reference / assigned zone | Worker's fixed service zone.   |

# 13. PostGIS and Geographic Intelligence

## 13.1 Static zone model

- The project contains exactly four static zones: Zone A, Zone B, Zone C and Zone D.

- Each worker is designated by the administrator to one fixed zone.

- Each complaint is mapped to a zone from its GPS coordinate.

- Zone membership is determined by spatial containment.

## 13.2 Spatial operations

| **Operation**    | **PostGIS function**    | **Purpose**                                                   |
|------------------|-------------------------|---------------------------------------------------------------|
| Zone containment | ST_Within / ST_Contains | Determine which zone contains a complaint.                    |
| Distance         | ST_Distance             | Tie-break worker selection and geographic analysis.           |
| Radius/hotspot   | ST_DWithin              | Find complaints within a radius for density/hotspot analysis. |

## 13.3 Hotspot analysis

The dashboard can use spatial aggregation, density/grid grouping or radius-based counts. The project does not require research-grade clustering.

# 14. Automatic Worker Assignment Engine

| **Core project feature** Worker assignment is automatic. Ordinary complaints do not require admin approval for assignment. Manual admin action is reserved for configuration, low-confidence AI triage and operational exceptions. |
|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|

## 14.1 Eligibility pipeline

20. Complaint category determines responsible department.

21. Complaint location determines Zone A/B/C/D.

22. Filter workers to the same department.

23. Filter workers to the same zone.

24. Exclude inactive workers.

25. Compute active workload.

26. Select the lowest-workload worker.

27. If tied, choose shortest distance to the complaint.

28. If still tied, choose oldest last-assignment timestamp.

29. Create assignment atomically.

30. Enforce one active assignment per complaint.

## 14.2 No eligible worker

If no eligible worker exists, the complaint remains in the relevant department/zone operational queue and the administrator is alerted. The complaint must not disappear, fail submission or be silently assigned outside its configured zone/department.

## 14.3 Assignment conflict prevention

- Assignment creation occurs inside a database transaction.

- A database/application rule prevents multiple active assignments for one complaint.

- Inactive workers are excluded at selection time.

- Worker deactivation is an operational event that can trigger reassignment of affected active tasks.

- Priority changes do not automatically trigger reassignment.

# 15. Priority, SLA and Queue Management

## 15.1 Priority levels

| **Priority** | **Meaning**                                 |
|--------------|---------------------------------------------|
| Critical     | Highest operational urgency.                |
| High         | Urgent complaint requiring early attention. |
| Medium       | Normal operational work.                    |
| Low          | Lower urgency.                              |

## 15.2 Final queue ordering

31. Overdue complaints always come first.

32. Within overdue complaints, severity/priority is considered.

33. Then time remaining/age is considered.

34. Carry-forward count and deterministic tie-break logic can be used.

35. Queue order is recalculated dynamically as time changes.

36. Queue reordering does not automatically reassign an already assigned complaint.

## 15.3 SLA behavior

- Each category has a configured SLA/deadline.

- An hourly job checks active complaints for SLA violations.

- Overdue state is derived from the current time versus deadline.

- Repeated deferrals can escalate to admin attention.

- Exact category SLA hours must be finalized as configuration before production.

# 16. Worker PWA

## 16.1 Required screens

| **Screen**  | **Purpose**                                                    |
|-------------|----------------------------------------------------------------|
| Login       | Phone + PIN authentication.                                    |
| Task Queue  | Assigned complaints ordered by operational priority.           |
| Task Detail | Complete field-work information without citizen personal data. |
| Directions  | Open Google Maps with complaint location.                      |
| Start Work  | Transition complaint to In-Progress.                           |
| Resolution  | Capture photo and note.                                        |
| Defer       | Cannot Complete + reason; creates internal event.              |
| History     | Previously handled tasks and statuses.                         |

## 16.2 Worker task information

- Grievance code

- Category

- Description

- Complaint image

- Location

- Priority

- SLA/deadline

- Current complaint status

## 16.3 Completion contract

PATCH /complaints/{id}/complete (conceptual contract) accepts resolution evidence and note. Backend verifies authentication, assignment ownership, uploads the evidence, creates the resolution record, changes status to Completed, logs the event and triggers citizen notification.

# 17. Administrator Dashboard

| **Module**         | **Required capability**                                            |
|--------------------|--------------------------------------------------------------------|
| Live metrics       | Submitted, In-Progress, Completed, overdue and operational totals. |
| Category breakdown | Distribution across eight categories.                              |
| Trends             | Time-based complaint trend view.                                   |
| Hotspot map        | PostGIS spatial aggregation visualized through Leaflet.            |
| Complaint search   | Search and inspect complaint details.                              |
| Worker management  | Create, activate/deactivate, assign department and fixed zone.     |
| Triage queue       | Review low-confidence classification cases.                        |
| Export             | CSV/Excel export.                                                  |
| Audit visibility   | Complaint/event history where appropriate.                         |

| **Removed from baseline** Complex worker performance analytics and PIN-reset workflows are not required in the finalized scope. |
|---------------------------------------------------------------------------------------------------------------------------------|

# 18. Security and Authentication

## 18.1 Identity model

| **Actor** | **Authentication**         |
|-----------|----------------------------|
| Admin     | Username + password.       |
| Worker    | Phone + 4-digit PIN.       |
| Citizen   | Telegram identity/session. |

## 18.2 Security controls

- JWT access tokens.

- Role-based access control.

- bcrypt hashing for admin credentials and worker PINs.

- FastAPI security dependencies for route protection.

- SlowAPI rate limiting.

- Explicit CORS configuration.

- HTTPS in production.

- Telegram webhook verification.

- Server-side request validation.

- File type and size validation.

- Secrets in environment variables locally and AWS SSM in production.

- SQLAlchemy parameterized database access.

- Controlled/signed media access where needed.

- Audit logging for complaint actions.

## 18.3 Privacy boundary

Workers receive operational complaint data, not citizen personal information. Admins have broader access according to RBAC. Telegram identity data is retained for citizen communication.

# 19. Background Tasks and Scheduling

| **Job**                                  | **Trigger**                                                | **Purpose**                                         |
|------------------------------------------|------------------------------------------------------------|-----------------------------------------------------|
| Classification                           | During complaint intake                                    | Run model inference and return category/confidence. |
| Notification                             | Status/resolution event                                    | Send Telegram update to citizen.                    |
| SLA check                                | Recurring hourly schedule                                  | Detect complaints that passed deadline.             |
| Operational assignment/queue maintenance | Lifecycle-driven; scheduled maintenance may support queues | Maintain assignment/queue consistency.              |

| **Important update** The original source documents describe daily 6 AM allocation as the main worker assignment mechanism. The finalized design replaces that as the core assignment mechanism with automatic lifecycle-driven assignment when the complaint becomes ready for dispatch. A scheduled job may still be used for queue maintenance or operational reconciliation. |
|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|

Celery/RabbitMQ is not part of the baseline. FastAPI BackgroundTasks and APScheduler are retained for lightweight background and recurring work.

# 20. Object Storage and Media Handling

| **Environment**   | **Storage**      | **Purpose**                                                            |
|-------------------|------------------|------------------------------------------------------------------------|
| Local development | MinIO            | Complaint and resolution images.                                       |
| Production        | AWS S3           | Complaint and resolution images.                                       |
| Database          | Object reference | Store object key/reference, not large binary files in relational rows. |

- Validate file type and size before storage.

- Keep storage abstraction compatible with both MinIO and S3.

- Do not expose permanent public object URLs when signed access is appropriate.

- Resolution evidence must remain linked to the completed complaint.

# 21. End-to-End Data Flow

## 21.1 Complete flow

| **Step** | **Flow**                                                              |
|----------|-----------------------------------------------------------------------|
| 1        | Citizen starts report in Telegram.                                    |
| 2        | Redis session is created for incomplete conversation state.           |
| 3        | Citizen sends image/text.                                             |
| 4        | Image safety check runs when an image is supplied.                    |
| 5        | MobileNetV2 or DistilBERT produces category + confidence.             |
| 6        | Bot presents the prediction; citizen confirms it.                     |
| 7        | Bot requests GPS location.                                            |
| 8        | Bot collects description as applicable.                               |
| 9        | Bot presents complete summary.                                        |
| 10       | Citizen confirms final submission.                                    |
| 11       | Backend creates complaint, grievance code, priority and SLA/deadline. |
| 12       | Complaint is stored in PostgreSQL/PostGIS; Redis session is deleted.  |
| 13       | Category maps to department; location maps to static zone.            |
| 14       | Automatic assignment selects eligible worker.                         |
| 15       | Worker sees task in PWA.                                              |
| 16       | Worker opens Google Maps directions and starts work.                  |
| 17       | Complaint becomes In-Progress.                                        |
| 18       | Worker submits resolution photo + note.                               |
| 19       | Backend stores resolution and changes complaint to Completed.         |
| 20       | Telegram notification with resolution evidence is sent to citizen.    |
| 21       | Admin dashboard reflects updated operational data.                    |

## 21.2 Components touched

| **Component**        | **Role**                                                        |
|----------------------|-----------------------------------------------------------------|
| Telegram             | Citizen input, confirmation, tracking and notification.         |
| FastAPI              | Central API/webhook and business-logic hub.                     |
| Redis                | Incomplete Telegram session state.                              |
| AI module            | Classification and image safety.                                |
| PostgreSQL/PostGIS   | Persistent complaint, identity, assignment and geographic data. |
| MinIO/S3             | Complaint and resolution media.                                 |
| Vue PWA              | Worker operations and admin dashboard.                          |
| Google Maps          | Simple navigation.                                              |
| Background/scheduler | Notifications, SLA checking and operational jobs.               |

# 22. API Surface and Contracts

| **Area**         | **Representative endpoint / operation** | **Access**         |
|------------------|-----------------------------------------|--------------------|
| Health           | GET /health; GET /ready                 | Public/operational |
| Admin auth       | POST /auth/admin/login                  | Admin credentials  |
| Worker auth      | POST /auth/worker/login                 | Worker credentials |
| Complaints       | POST /complaints; GET /complaints/{id}  | Role-dependent     |
| Tracking         | GET /complaints/track/{code}            | Citizen-oriented   |
| Worker tasks     | GET /workers/me/tasks                   | Worker             |
| Start work       | PATCH /complaints/{id}/start            | Assigned worker    |
| Complete         | PATCH /complaints/{id}/complete         | Assigned worker    |
| Defer            | PATCH /complaints/{id}/defer            | Assigned worker    |
| Admin stats      | GET /dashboard/stats                    | Admin              |
| Workers          | GET/POST/PATCH /workers/\*              | Admin              |
| Triage           | GET/PATCH /triage/\*                    | Admin              |
| Hotspots         | GET /analytics/hotspots                 | Admin              |
| Exports          | GET /exports/\*                         | Admin              |
| Telegram webhook | POST /webhook/telegram                  | Telegram provider  |

| **Contract rule** Exact endpoint names may evolve during implementation, but request/response schemas, authentication rules and ownership boundaries must be agreed before frontend integration. |
|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|

# 23. Infrastructure and DevOps

## 23.1 Local architecture

| **Component**        | **Local role**               |
|----------------------|------------------------------|
| FastAPI              | Backend API and application. |
| PostgreSQL + PostGIS | Primary database.            |
| Redis                | Session state.               |
| MinIO                | Object storage.              |
| Vue/Vite             | Frontend development server. |
| Docker Compose       | Local orchestration.         |

## 23.2 Production architecture

| **Component**           | **Production role**                                           |
|-------------------------|---------------------------------------------------------------|
| AWS EC2                 | Application host.                                             |
| Nginx                   | Reverse proxy, HTTPS termination and frontend static serving. |
| FastAPI                 | Backend application.                                          |
| PostgreSQL + PostGIS    | Primary database.                                             |
| Redis                   | Session state.                                                |
| AWS S3                  | Object storage.                                               |
| AWS SSM Parameter Store | Secrets.                                                      |
| Let's Encrypt + Certbot | TLS certificates.                                             |
| GitHub Actions          | CI/CD.                                                        |

## 23.3 Health checks

| **Endpoint** | **Purpose**                                      |
|--------------|--------------------------------------------------|
| /health      | Backend process is alive.                        |
| /ready       | Backend plus database and Redis are operational. |

## 23.4 CI/CD baseline

37. Pull request triggers lint and tests.

38. Build verification occurs before merge.

39. Merge to main can trigger production deployment.

40. Deployment performs smoke checks.

41. Release should be reproducible from a clean commit.

## 23.5 EC2 constraints

The source infrastructure plan targets a low-resource free-tier environment. Container memory must be controlled, MinIO is replaced by S3 in production, and a swap file may be used if required by the selected instance constraints.

# 24. Testing and Quality Strategy

| **Level**       | **Focus**                                                                               |
|-----------------|-----------------------------------------------------------------------------------------|
| Unit            | Pure business rules: SLA, priority, assignment selection, validation, tracking code.    |
| API/integration | Auth, complaints, worker actions, admin APIs, storage and Redis.                        |
| AI evaluation   | Held-out model test set, confusion matrix, precision/recall, latency.                   |
| Frontend        | Auth guards, stores, forms, queue/detail and critical interactions.                     |
| Geospatial      | Zone containment, distance tie-breaks, hotspot query.                                   |
| Security        | RBAC, inactive worker exclusion, rate limiting, CORS, file validation, secret handling. |
| E2E             | Telegram → AI → location → complaint → assignment → worker → resolution → notification. |
| Deployment      | Migrations, container startup, HTTPS, production smoke test and rollback path.          |

## 24.1 Definition of Done

Feature implementation → unit test → API/integration test → frontend integration → error handling → logging → security check → E2E scenario → accepted.

## 24.2 Critical test cases

- Image complaint classified correctly.

- Text complaint classified correctly.

- Low-confidence classification enters triage.

- Citizen cannot finalize without location.

- Tracking code is unique.

- Complaint enters Submitted only after final confirmation.

- Wrong-department worker is never eligible.

- Wrong-zone worker is never eligible.

- Inactive worker is never eligible.

- Two workers cannot simultaneously hold the same active complaint.

- No-worker-available path preserves the complaint.

- Worker cannot complete a complaint assigned to someone else.

- Completed complaint has resolution evidence.

- Citizen receives completion notification.

- Overdue complaint outranks non-overdue work.

# 25. Observability, Logging and Auditability

## 25.1 Structured logs

Backend logs should be machine-readable JSON where practical, including timestamp, level, message, complaint ID, category, confidence and latency for relevant operations.

## 25.2 Audit trail

- Complaint creation.

- AI classification.

- Citizen confirmation.

- Assignment.

- Worker start.

- Deferral.

- Completion.

- Admin triage decisions.

- Operational reassignment events.

## 25.3 Operational signals

| **Signal**                 | **Why it matters**                          |
|----------------------------|---------------------------------------------|
| AI latency                 | Detect slow inference.                      |
| AI confidence distribution | Detect model degradation or unusual inputs. |
| Overdue count              | Operational SLA health.                     |
| Unassigned count           | Worker capacity/coverage problem.           |
| Assignment conflicts       | Integrity problem.                          |
| Completion rate            | Operational throughput.                     |
| API error rate             | Application health.                         |
| /ready status              | Dependency health.                          |

# 26. Development Governance and Team Responsibilities

| **Member** | **Primary responsibility**            | **Secondary responsibility**                      |
|------------|---------------------------------------|---------------------------------------------------|
| Sairaj     | Backend, database, DevOps             | Integration, security, deployment, API contracts. |
| Sufiyan    | Frontend, admin dashboard, worker PWA | UI/UX, API integration, maps.                     |
| Tushar     | ML training and evaluation            | Inference packaging and backend ML integration.   |

## 26.1 Coordination points

| **When**               | **Participants** | **Required alignment**                                        |
|------------------------|------------------|---------------------------------------------------------------|
| Early foundation       | Sairaj + Sufiyan | API contracts before feature-heavy frontend work.             |
| ML integration         | Sairaj + Tushar  | Model artifact format, preprocessing and inference interface. |
| Assignment integration | Sairaj + Sufiyan | Worker queue payload and assignment API.                      |
| E2E phase              | All 3            | Full flow, bug bash and release blockers.                     |

## 26.2 Repository principles

- Use feature branches and reviewed merges.

- Keep migrations version-controlled.

- Do not commit secrets.

- Keep model artifacts/version metadata reproducible.

- Document breaking API changes.

- Prefer small vertical slices over giant feature branches.

# 27. Final 4-Week Delivery Roadmap

| **This is the master timeline** This section states the overall delivery horizon. The separate Detailed 4-Week Compressed Engineering Execution Plan contains the day/week-level task map. |
|---------------------------------------------------------------------------------------------------------------------------------------------------------------------|

| **Week** | **Primary focus**                    | **Major outcome**                                                 |
|----------|--------------------------------------|-------------------------------------------------------------------|
| 1        | Foundation, Architecture & Authentication | Working local stack + secure authenticated backend |
| 2        | Complaint Intake, AI Classification & Finalization | AI-enabled complaint intake + real citizen submission |
| 3        | PostGIS Zones, Automatic Assignment & Worker Resolution | Automatic dispatch + field resolution workflow |
| 4        | Admin Dashboard, Analytics, Integration & Deployment | Operational dashboard + production-ready demo |

## 27.1 Parallel work philosophy

Backend, frontend and ML work proceed in parallel whenever contracts permit. Integration gates prevent unfinished interfaces from being mistaken for completed features.

# 28. Integration Gates

| **Gate**            | **Required result**                                                                                                                       |
|---------------------|-------------------------------------------------------------------------------------------------------------------------------------------|
| Gate 1 — End Week 1 | Frontend can call authenticated FastAPI APIs; database migrations and worker configuration work.                                          |
| Gate 2 — End Week 2 | Citizen can submit a real complaint through Telegram with AI classification, confirmation, location, grievance code and Submitted status. |
| Gate 3 — End Week 3 | Complaint is automatically assigned to the correct worker, worker starts work, resolves with evidence and complaint becomes Completed.    |
| Gate 4 — End Week 4 | Production deployment works over HTTPS and the complete citizen → AI → assignment → worker → admin flow is demonstrable.                  |

# 29. Final Demo Scenario

42. Citizen sends a garbage photo to Telegram.

43. MobileNetV2 classifies it as Solid Waste & Garbage.

44. Citizen confirms the predicted category.

45. Citizen shares GPS location and description.

46. Bot displays the final complaint summary.

47. Citizen confirms submission.

48. Backend creates grievance code and Submitted complaint.

49. PostGIS determines the complaint's zone.

50. Backend filters eligible workers by department + zone + active status.

51. Lowest active workload worker is selected; distance and last-assignment timestamp resolve ties.

52. Worker receives the complaint in the PWA.

53. Worker opens Get Directions.

54. Worker starts the task; status becomes In-Progress.

55. Worker uploads resolution photo and note.

56. Backend validates the assignment and marks the complaint Completed.

57. Citizen receives the completion notification with proof photo.

58. Admin sees the updated complaint and operational analytics/hotspot information.

# 30. Definition of Done and Acceptance Criteria

## 30.1 System-level acceptance

- Citizen can file image/text complaint without a custom citizen app.

- AI classification is near-real-time and returns a category/confidence.

- Citizen confirms classification before final submission.

- Location is mandatory and stored as spatial data.

- Grievance code is generated and unique.

- Complaint persists in PostgreSQL.

- Zone is determined automatically.

- Worker assignment is automatic and respects department + zone.

- Only one active assignment exists per complaint.

- Worker sees no unnecessary citizen personal information.

- Worker can start and complete a complaint with evidence.

- User-facing statuses are exactly Submitted, In-Progress and Completed.

- Overdue complaints are prioritized first.

- Admin can manage workers and monitor complaints.

- Hotspot map uses PostGIS spatial data.

- Production deployment uses HTTPS and protected secrets.

## 30.2 Automatic assignment acceptance

- Correct department.

- Correct zone.

- Inactive workers excluded.

- Wrong-zone workers excluded.

- Wrong-department workers excluded.

- Workload calculated.

- Distance tie-break works.

- Last-assignment tie-break works.

- Atomic assignment creation.

- No duplicate active assignment.

- No eligible worker path handled.

- Worker queue reflects assignment.

# 31. Risks, Constraints and Mitigations

| **Risk / constraint**     | **Mitigation**                                                                                         |
|---------------------------|--------------------------------------------------------------------------------------------------------|
| AI accuracy below target  | Evaluate on held-out data, inspect confusion matrix, tune preprocessing/model and retain human triage. |
| AI latency                | Optimize model loading/inference and keep models in memory.                                            |
| Worker capacity shortage  | Keep unassigned complaint in department/zone queue and alert admin.                                    |
| Assignment conflict       | Atomic transaction and active-assignment integrity rule.                                               |
| Schema drift              | Alembic migrations and shared API contracts.                                                           |
| Frontend/backend mismatch | Freeze API shapes early and integrate continuously.                                                    |
| Low-resource deployment   | Use lightweight architecture; production S3 instead of MinIO; control container memory.                |
| Scope creep               | Protect Tier 1 core flow and reject nonessential features late in the schedule.                        |
| Late deployment failure   | Prepare production configuration before final week and smoke-test.                                     |
| Incorrect status model    | Treat three user-facing statuses as a hard product constraint.                                         |

# 32. Final Decision Register

| **Decision**         | **Final baseline**                                                               | **Reason**                                                                  |
|----------------------|----------------------------------------------------------------------------------|-----------------------------------------------------------------------------|
| Citizen interface    | Telegram Bot                                                                     | Low installation friction.                                                  |
| Worker interface     | Online Mobile PWA                                                                | Fast deployment, responsive and no app-store dependency.                    |
| Admin interface      | Web dashboard                                                                    | Desktop-oriented operational visibility.                                    |
| AI image model       | MobileNetV2                                                                      | Lightweight image classification appropriate for project scale.             |
| AI text model        | DistilBERT                                                                       | Compact transformer suitable for text classification.                       |
| AI timing            | Near-real-time; ideally \<5 sec, 10–15 sec upper bound                           | Citizen needs immediate classification feedback.                            |
| Citizen confirmation | Required                                                                         | Prevents silent AI misinterpretation.                                       |
| Location             | Mandatory GPS                                                                    | Enables precise assignment and hotspot analysis.                            |
| Zones                | Exactly 4 static zones                                                           | Simple, deterministic operational routing.                                  |
| Worker assignment    | Automatic                                                                        | Core system capability; manual approval would defeat the routing objective. |
| Assignment selection | Department → zone → active → lowest workload → distance → oldest last assignment | Balances eligibility, workload and proximity.                               |
| Complaint statuses   | Submitted → In-Progress → Completed                                              | Simple user-facing lifecycle.                                               |
| Priority             | Overdue first, then severity/priority and time/age                               | Protects SLA-critical work.                                                 |
| Reassignment         | Operational events only                                                          | Avoids instability from queue reordering.                                   |
| Redis                | Telegram session state                                                           | Keep incomplete bot conversations out of DB.                                |
| Background jobs      | FastAPI BackgroundTasks + APScheduler                                            | Lower complexity than Celery/RabbitMQ at project scale.                     |
| Local storage        | MinIO                                                                            | S3-compatible development environment.                                      |
| Production storage   | AWS S3                                                                           | Durable cloud object storage.                                               |
| Auth                 | Admin username/password; worker phone/PIN; citizen Telegram                      | Matches role needs.                                                         |
| OAuth/OIDC           | Out of baseline                                                                  | Unnecessary complexity for semester project.                                |
| Offline PWA          | Out of baseline                                                                  | Avoids synchronization complexity.                                          |
| Route optimization   | Out of baseline                                                                  | Simple Google Maps directions are sufficient.                               |
| Dynamic zone editor  | Out of baseline                                                                  | Static seeded zones meet project requirement.                               |
| Roadmap              | 4 weeks                                                                          | Finalized project delivery horizon.                                         |

# Appendix A — Technology Matrix

| **Technology**   | **Layer**      | **Use**                                     |
|------------------|----------------|---------------------------------------------|
| FastAPI          | Backend        | API and webhook hub.                        |
| SQLAlchemy       | Data           | ORM.                                        |
| Alembic          | Data           | Migrations.                                 |
| PostgreSQL       | Data           | Persistent relational store.                |
| PostGIS          | Data/Geo       | Spatial operations.                         |
| Redis            | Session        | Telegram state.                             |
| MinIO            | Storage        | Local object storage.                       |
| S3               | Storage        | Production object storage.                  |
| MobileNetV2      | AI             | Image classification.                       |
| DistilBERT       | AI             | Text classification.                        |
| TensorFlow/Keras | AI             | Image model runtime/training.               |
| Transformers     | AI             | Text model runtime/training.                |
| Vue 3            | Frontend       | Admin + worker UI.                          |
| Pinia            | Frontend       | State management.                           |
| Leaflet          | Frontend       | Hotspot maps.                               |
| Docker           | Infrastructure | Containerization.                           |
| Nginx            | Infrastructure | Reverse proxy/static files/SSL termination. |
| AWS EC2          | Cloud          | Application host.                           |
| AWS SSM          | Cloud          | Secret storage.                             |
| GitHub Actions   | DevOps         | CI/CD.                                      |
| Pytest/Vitest    | Testing        | Automated tests.                            |

# Appendix B — Core Entity Reference

| **Entity**    | **Key relationships**                                                              |
|---------------|------------------------------------------------------------------------------------|
| Citizen       | 1 → many complaints.                                                               |
| Complaint     | Belongs to citizen; maps to department/zone; has logs, assignments and resolution. |
| Worker        | Belongs to department; fixed zone; receives assignments.                           |
| Department    | Responsible for one or more complaint categories.                                  |
| Zone          | Static polygon used for complaint routing.                                         |
| Assignment    | Links complaint to worker and records assignment lifecycle.                        |
| Complaint log | Append-only operational history.                                                   |
| Triage queue  | Links low-confidence complaint to admin review.                                    |
| Resolution    | Stores completion evidence and notes.                                              |

# Appendix C — AI Use Guidelines

59. Understand AI-generated code before integrating it.

60. Use AI as a learning and productivity tool, not as a substitute for engineering judgment.

61. Every team member should be able to explain code used in the final project.

62. Prefer progressive implementation over generating the entire system at once.

63. Review generated code for security, correctness, data privacy and project-specific constraints.

64. Do not accept an AI-generated architecture change merely because it sounds more sophisticated.

# Appendix D — Current Planning Status

| **Area**                            | **Status**                                                    |
|-------------------------------------|---------------------------------------------------------------|
| Project vision and requirements     | Defined                                                       |
| Architecture and technology choices | Defined                                                       |
| Complaint lifecycle                 | Finalized                                                     |
| Worker assignment model             | Finalized                                                     |
| AI timing target                    | Finalized                                                     |
| Database direction                  | Defined; operational entities expanded for finalized workflow |
| Frontend direction                  | Defined                                                       |
| Security baseline                   | Defined                                                       |
| Deployment architecture             | Defined                                                       |
| 4-week delivery roadmap             | Finalized                                                     |
| Production implementation           | To be built and validated                                     |

| **Implementation reality** The project documentation establishes a strong planning baseline. The remaining work is implementation, integration and validation; architecture decisions should now change only when a concrete engineering constraint requires it. |
|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
