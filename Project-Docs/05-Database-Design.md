# 05 — Database Design

> **Reading time:** 10 minutes
> **Prerequisite:** [04-Tech-Stack.md](04-Tech-Stack.md)
> **After reading:** You'll understand every table, field, and relationship in the database.

---

## Overview

The database has **6 tables**. Here's what each one stores:

| Table | What It Stores | Number of Records (Expected) |
|-------|---------------|------------------------------|
| `citizen` | Citizens who interact with the Telegram bot | Grows with usage (hundreds–thousands) |
| `complaint` | Every complaint filed by any citizen | Grows daily (the core table) |
| `worker` | Municipal field workers | Small (tens — managed by admin) |
| `admin` | Administrator accounts | Very small (1–5) |
| `complaint_log` | History of every action taken on a complaint | Many rows per complaint |
| `triage_queue` | Complaints where AI wasn't confident enough | Subset of complaints |

---

## Table-by-Table Breakdown

### 1. `citizen` — Who filed the complaint?

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | Primary Key | Unique identifier for each citizen |
| `telegram_chat_id` | String | Unique, Not Null | The chat ID Telegram assigns to each user — this is how we identify them |
| `telegram_username` | String | Nullable | The citizen's Telegram username (optional — not all users have one) |
| `phone_number` | String | Nullable | Phone number (optional — can be collected if citizen shares it) |
| `created_at` | Timestamp | Not Null, Default: now | When this citizen first interacted with the bot |

**How citizens are created:**
- A citizen is **not** manually created. When someone messages the bot for the first time, the system checks if their `telegram_chat_id` exists. If not, a new citizen record is created automatically.

---

### 2. `complaint` — The core table

This is the most important table. Every complaint filed in the system lives here.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | Primary Key | Unique identifier |
| `tracking_code` | String | Unique, Not Null | Human-readable code (e.g., `GRV-2026-A7X3`) given to the citizen |
| `citizen_id` | UUID | Foreign Key → citizen.id | Who filed this complaint |
| `category` | String | Nullable | The classified category (e.g., "Solid Waste & Garbage"). Null if not yet classified. |
| `department` | String | Nullable | The department responsible (e.g., "Solid Waste Management"). Set after classification. |
| `description` | String | Nullable | The citizen's text description of the issue |
| `image_url` | String | Nullable | URL to the complaint photo in MinIO/S3 |
| `resolution_image_url` | String | Nullable | URL to the resolution photo uploaded by the worker |
| `latitude` | Float | Nullable | GPS latitude of the complaint location |
| `longitude` | Float | Nullable | GPS longitude of the complaint location |
| `location` | Geometry(Point) | Nullable | PostGIS geometry column — enables spatial queries (nearest worker, within zone) |
| `status` | String | Not Null, Default: "submitted" | Current status of the complaint (see Status Lifecycle below) |
| `ai_confidence` | Float | Nullable | How confident the AI was about the classification (0.0 to 1.0) |
| `ai_classification_source` | String | Nullable | Which classifier was used: "image", "text", or "manual" |
| `priority` | String | Default: "medium" | Priority level: "critical", "high", "medium", "low" |
| `fraud_risk` | String | Nullable | Fraud assessment: "clear", "suspicious", "rejected" |
| `fraud_flags` | JSON | Nullable | Detailed fraud detection results (EXIF, ELA, hash checks) |
| `sla_deadline` | Timestamp | Nullable | When this complaint must be resolved by |
| `created_at` | Timestamp | Not Null, Default: now | When the complaint was filed |
| `resolved_at` | Timestamp | Nullable | When the complaint was resolved (null if not yet resolved) |
| `assigned_worker_id` | UUID | Foreign Key → worker.id, Nullable | Which worker is assigned to this complaint |
| `carry_forward_reason` | String | Nullable | Why the worker couldn't complete this task (e.g., "access blocked") |
| `carry_forward_count` | Integer | Default: 0 | How many times this task has been carried forward |

#### Complaint Status Lifecycle

A complaint moves through these statuses in order:

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
| `submitted` | Citizen has filed the complaint. Processing hasn't started. |
| `classified` | AI has classified the complaint into a category. |
| `triage_pending` | AI confidence was too low. Waiting for admin to manually classify. |
| `assigned` | A worker has been assigned to handle this complaint. |
| `in_progress` | Worker has acknowledged the task and is working on it. |
| `deferred` | Worker couldn't complete it today (with reason). Will be re-scored tomorrow. |
| `resolved` | Worker has submitted resolution proof. Complaint is closed. |

---

### 3. `worker` — Field workers who resolve complaints

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | Primary Key | Unique identifier |
| `name` | String | Not Null | Worker's full name |
| `phone` | String | Unique, Not Null | Worker's phone number (used as login username) |
| `department` | String | Not Null | Which department the worker belongs to (e.g., "Solid Waste Management") |
| `pin_hash` | String | Not Null | bcrypt hash of the worker's 4-digit PIN (never stored in plaintext) |
| `assigned_zone` | Geometry(Polygon) | Nullable | The geographic area this worker is responsible for (PostGIS polygon) |
| `is_active` | Boolean | Default: true | Whether this worker account is active. Admin can deactivate. |

**How workers are created:**
- Only admins can create worker accounts.
- When creating a worker, the admin enters name, phone, department, and zone.
- The system generates a random 4-digit PIN, hashes it with bcrypt, and shows the PIN once to the admin for distribution.

---

### 4. `admin` — Administrator accounts

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | Primary Key | Unique identifier |
| `name` | String | Not Null | Admin's full name |
| `username` | String | Unique, Not Null | Login username |
| `password_hash` | String | Not Null | bcrypt hash of the admin's password |
| `role` | String | Default: "admin" | Role (currently only "admin", but extensible to "supervisor" etc.) |

**How admins are created:**
- For this project, the first admin is created via a database seed script.
- Future admins can be created by existing admins (or via seed script).

---

### 5. `complaint_log` — Audit trail

Every action on a complaint is logged here. This creates a complete audit trail.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | Primary Key | Unique identifier |
| `complaint_id` | UUID | Foreign Key → complaint.id | Which complaint this log entry belongs to |
| `action` | String | Not Null | What happened (e.g., "submitted", "classified", "assigned", "resolved") |
| `performed_by` | String | Not Null | Who performed the action (e.g., "system", "admin:raj", "worker:ramesh") |
| `details` | String | Nullable | Additional context (e.g., "Category changed from Garbage to Pothole") |
| `created_at` | Timestamp | Not Null, Default: now | When this action occurred |

**Example log for a complaint:**

| Time | Action | Performed By | Details |
|------|--------|-------------|---------|
| 09:00 | submitted | system | "Complaint created via Telegram" |
| 09:00 | classified | system | "AI classified as Garbage (confidence: 92%)" |
| 09:01 | assigned | system | "Assigned to worker Ramesh (zone: Zone-A)" |
| 11:30 | in_progress | worker:ramesh | "Worker acknowledged task" |
| 12:15 | resolved | worker:ramesh | "Resolved with proof photo. Note: Area cleaned." |

---

### 6. `triage_queue` — Low-confidence complaints needing human review

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | Primary Key | Unique identifier |
| `complaint_id` | UUID | Foreign Key → complaint.id | Which complaint needs review |
| `ai_confidence` | Float | Not Null | The AI's confidence score (below 70%) |
| `suggested_category` | String | Nullable | What the AI *thinks* the category might be |
| `admin_assigned_category` | String | Nullable | The category the admin actually assigned |
| `reviewed_by` | UUID | Foreign Key → admin.id, Nullable | Which admin reviewed this |
| `reviewed_at` | Timestamp | Nullable | When the review happened |
| `status` | String | Default: "pending" | "pending" or "reviewed" |

---

## Table Relationships

```
citizen ────────────── 1:Many ──────────── complaint
                                              │
                                              ├── 1:Many ──── complaint_log
                                              │
                                              ├── 1:One ───── triage_queue
                                              │               (only if AI confidence < 70%)
                                              │
worker ─────────────── 1:Many ──────────────┘
                                    (assigned_worker_id)

admin ──────────────── 1:Many ──── triage_queue
                                   (reviewed_by)
```

**In plain English:**
- One **citizen** can file **many complaints**.
- One **worker** can be assigned **many complaints**.
- One **complaint** has **many log entries** (audit trail).
- One **complaint** may have **one triage queue entry** (if AI confidence is low).
- One **admin** can review **many triage queue entries**.

---

## PostGIS — Geographic Data

Two columns use PostGIS geometry types:

| Table | Column | Geometry Type | What It Represents |
|-------|--------|--------------|-------------------|
| `complaint` | `location` | Point | The GPS coordinates of the complaint |
| `worker` | `assigned_zone` | Polygon | The geographic area the worker is responsible for |

### What PostGIS Enables

| Query | SQL Function | Example |
|-------|-------------|---------|
| "Find the nearest worker to this complaint" | `ST_Distance()` | Worker assignment |
| "Is this complaint inside this worker's zone?" | `ST_Within()` | Zone-based task routing |
| "Show all complaints within 2km of this point" | `ST_DWithin()` | Hotspot detection |

---

## Database Migrations (Alembic)

The database schema evolves over time. Alembic tracks these changes as **migration scripts**:

```
alembic/
├── env.py              ← Alembic configuration
├── versions/
│   ├── 001_initial.py  ← Creates all tables
│   ├── 002_add_xyz.py  ← Future schema changes
│   └── ...
```

**Key commands:**
- `alembic upgrade head` — Apply all migrations (bring database up to date)
- `alembic revision --autogenerate -m "description"` — Generate a new migration from model changes
- `alembic downgrade -1` — Undo the last migration

---

## Key Takeaways from This Document

1. There are **6 tables**: `citizen`, `complaint`, `worker`, `admin`, `complaint_log`, `triage_queue`.
2. `complaint` is the **central table** — it links to citizens, workers, logs, and triage.
3. Complaints have a **status lifecycle**: submitted → classified → assigned → in_progress → resolved.
4. **PostGIS** enables geographic queries using `location` (Point) and `assigned_zone` (Polygon) columns.
5. The `complaint_log` table creates a **full audit trail** of every action on every complaint.
6. The `triage_queue` table handles complaints where **AI confidence < 70%**.
7. **Alembic** manages database schema changes through versioned migration scripts.
8. Passwords and PINs are **never stored in plaintext** — always bcrypt hashed.

---

> **Next:** [06-API-Design.md](06-API-Design.md) — Understand every API endpoint, what it does, and who can access it.
