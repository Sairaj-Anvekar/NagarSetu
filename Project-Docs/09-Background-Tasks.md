# 09 — Background Tasks & Scheduling

> **Reading time:** 8 minutes
> **Prerequisite:** [08-Frontend-Deep-Dive.md](08-Frontend-Deep-Dive.md)
> **After reading:** You'll understand how Celery handles async work, the 4 background tasks, the daily task allocation algorithm, and how Celery Beat schedules recurring jobs.

---

## Why Background Tasks?

Some operations are too **slow**, too **expensive**, or too **time-sensitive** to run inside a normal HTTP request:

| Operation | Problem If Synchronous | Solution |
|-----------|----------------------|---------|
| AI image classification | Takes 3–10 seconds. Can't make the citizen or Telegram wait that long. | Celery task — runs async, sends result via Telegram callback. |
| Sending Telegram notifications | External API call, may be slow or fail. Shouldn't block the API response. | Celery task — fire and forget. |
| SLA deadline checking | Needs to scan all active complaints every hour. No user triggers this. | Celery Beat — scheduled to run automatically. |
| Daily task allocation | Needs to score and assign tasks for all workers at shift start. No user triggers this. | Celery Beat — runs once daily at configurable time. |

---

## How Celery Works — Simple Explanation

```
┌──────────┐         ┌──────────┐         ┌──────────────┐
│ FastAPI   │         │  Redis   │         │ Celery Worker │
│ Backend   │         │ (Broker) │         │ (Separate     │
│           │         │          │         │  Process)     │
└─────┬─────┘         └─────┬────┘         └──────┬───────┘
      │                     │                      │
      │  "Classify this     │                      │
      │   image please"     │                      │
      ├────────────────────►│                      │
      │                     │  Picks up message    │
      │                     ├─────────────────────►│
      │                     │                      │
      │                     │                      │ Runs MobileNetV2
      │                     │                      │ Gets: "Garbage, 92%"
      │                     │                      │
      │                     │                      │ Sends result to
      │                     │                      │ citizen via Telegram
      │                     │                      │ Bot API
      │                     │                      │
      │                     │  Result stored       │
      │                     │◄─────────────────────┤
      │                     │                      │
```

**Three components:**
1. **FastAPI** says "I need this done" → pushes a task message to Redis.
2. **Redis** holds the message in a queue.
3. **Celery Worker** (a separate process) picks up the message, does the work, stores the result.

**Celery Beat** is a fourth component — a scheduler that pushes tasks at specific times (like cron).

---

## The Four Background Tasks

### Task 1: `classify_complaint.py` — AI Classification

**Triggered when:** A citizen submits a complaint (image or text).

```
Citizen sends image via Telegram
        │
        ▼
Telegram webhook hits FastAPI
        │
        ▼
FastAPI dispatches Celery task:
  classify_complaint.delay(complaint_id, image_url)
        │
        ▼ (async — FastAPI returns 200 immediately)

Celery Worker picks up the task:
  1. Download image from MinIO/S3
  2. Run Gate 1: NSFW check
     └── If unsafe → reject, notify citizen, STOP
  3. Run Gate 2: EXIF + ELA + Hash (fraud detection)
     └── Flag results in complaint.fraud_flags
  4. Run Gate 3: MobileNetV2 classification
     └── Get: {category: "Garbage", confidence: 0.92}
  5. Update complaint in database:
     └── category, ai_confidence, ai_classification_source, department, sla_deadline
  6. Check confidence:
     ├── ≥ 70% → Auto-route (set status = "classified")
     └── < 70% → Create triage_queue entry (set status = "triage_pending")
  7. Send classification result to citizen via Telegram Bot API:
     └── "Your image has been classified as: 🗑️ Solid Waste & Garbage"
  8. Advance bot session state to AWAITING_LOCATION
```

**Timeout handling:**
- Normal case (< 8 sec): Result sent immediately.
- Takes > 8–10 sec: Bot sends "⏳ Still analyzing, please wait…"
- Takes > 20 sec: Bot says "We couldn't classify automatically. An admin will review it." → Triage queue.

---

### Task 2: `send_notification.py` — Telegram Notifications

**Triggered when:** A complaint's status changes (classified, assigned, resolved).

```
Complaint status changes
        │
        ▼
Service dispatches Celery task:
  send_notification.delay(citizen_chat_id, message_type, data)
        │
        ▼ (async)

Celery Worker:
  1. Look up citizen's telegram_chat_id
  2. Compose message based on type:
     ├── "classified" → "Your complaint has been classified as: {category}"
     ├── "assigned"   → "A worker has been assigned to your complaint"
     └── "resolved"   → "✅ Your complaint has been resolved!" + resolution photo
  3. Send via Telegram Bot API (python-telegram-bot)
  4. Handle errors (citizen blocked bot, network issues) → log and skip
```

---

### Task 3: `check_sla.py` — SLA Violation Check (Scheduled)

**Triggered by:** Celery Beat — runs **every hour**.

```
Every hour (Celery Beat triggers):
        │
        ▼
Celery Worker:
  1. Query all complaints where:
     - status is NOT "resolved"
     - sla_deadline < current time
  2. For each overdue complaint:
     - Set status flag to "overdue" (or add overdue flag)
     - Create complaint_log entry: "SLA violated"
     - If carry_forward_count ≥ 3:
       └── Create escalation alert for admin
  3. Log summary: "SLA check complete. 5 complaints newly overdue."
```

**SLA deadlines by category:**

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

### Task 4: `allocate_daily_tasks.py` — Daily Task Allocation (Scheduled)

**Triggered by:** Celery Beat — runs **once daily** at shift start (default: 6:00 AM).

This is the most complex task. It runs the **weighted scoring algorithm** for each active worker.

```
Daily at 06:00 (Celery Beat triggers):
        │
        ▼
For each active worker:
  1. Gather all unresolved complaints in the worker's zone
     (includes new complaints + carried-forward from yesterday)

  2. Score each complaint:
     ┌─────────────────────────────────────────────────────────┐
     │  Score = (Priority Weight    × 0.40)                   │
     │        + (Elapsed Time Score × 0.35)                   │
     │        + (Queue Position     × 0.15)                   │
     │        + (Carry-Forward      × 0.10)                   │
     └─────────────────────────────────────────────────────────┘

  3. Sort by score (descending)

  4. Take top N (default: 20, from WORKER_DAILY_TASK_LIMIT)

  5. Assign to worker's daily queue:
     - Set assigned_worker_id = this worker's ID
     - Set status = "assigned"
     - Create complaint_log entry for each: "Assigned to worker {name}"
```

#### Scoring Factor Details

| Factor | Weight | How It's Calculated | Range |
|--------|--------|-------------------|-------|
| **Priority** | 40% | CRITICAL=1.0, HIGH=0.75, MEDIUM=0.5, LOW=0.25 | 0.0–1.0 |
| **Elapsed Time** | 35% | `hours_since_submission / category_sla_hours` — complaints near their deadline score higher | 0.0–1.0+ |
| **Queue Position** | 15% | `1 - (position / total_in_zone)` — earlier submissions get slight FIFO advantage | 0.0–1.0 |
| **Carry-Forward** | 10% | Was this task carried forward from yesterday? If yes = 1.0, if no = 0.0 | 0.0 or 1.0 |

#### Example Scoring

Worker Ramesh's zone has 35 pending complaints. The algorithm scores all 35:

| Complaint | Priority | Elapsed | Queue Pos | Carry-Fwd | **Total Score** |
|-----------|----------|---------|-----------|-----------|----------------|
| Pothole near school | HIGH (0.75) | 0.90 | 0.80 | Yes (1.0) | 0.75×0.4 + 0.9×0.35 + 0.8×0.15 + 1.0×0.10 = **0.835** |
| Garbage at market | MEDIUM (0.50) | 0.60 | 0.95 | No (0.0) | 0.50×0.4 + 0.6×0.35 + 0.95×0.15 + 0.0×0.10 = **0.553** |
| New streetlight issue | LOW (0.25) | 0.10 | 0.20 | No (0.0) | 0.25×0.4 + 0.1×0.35 + 0.2×0.15 + 0.0×0.10 = **0.165** |

Top 20 by score are assigned. The pothole near school gets done first.

#### Carry-Forward Rules

1. Worker marks task as "Cannot Complete Today" with a reason (weather, access blocked, parts needed).
2. The task's `carry_forward_count` increments by 1.
3. Next day, it **re-enters the scoring pool** with a 10% carry-forward bonus.
4. If `carry_forward_count ≥ 3` → **automatic escalation alert** for admin.
5. A carried-forward LOW priority task doesn't jump ahead of a fresh CRITICAL one — but it does beat an equal fresh task.

---

## Celery Configuration

### In `docker-compose.yml`

```yaml
# Celery Worker — picks up and processes tasks
celery-worker:
  command: celery -A app.tasks worker --loglevel=info

# Celery Beat — schedules recurring tasks
celery-beat:
  command: celery -A app.tasks beat --loglevel=info
```

### Schedule Configuration

| Task | Schedule | Configurable? |
|------|----------|---------------|
| `check_sla` | Every 1 hour | Yes (in Celery Beat config) |
| `allocate_daily_tasks` | Daily at 06:00 | Yes (via `SHIFT_START_HOUR` in `.env`) |

### Configurable Weights (`.env`)

```env
WORKER_DAILY_TASK_LIMIT=20
SHIFT_START_HOUR=6
PRIORITY_WEIGHT=0.40
ELAPSED_TIME_WEIGHT=0.35
QUEUE_POSITION_WEIGHT=0.15
CARRY_FORWARD_WEIGHT=0.10
```

> **Tip:** The scoring formula is intentionally simple. Four weighted factors, all normalized to 0–1. Easy to explain to stakeholders, easy to debug, easy to tune by adjusting weights.

---

## Key Takeaways from This Document

1. **4 Celery tasks:** classify_complaint, send_notification, check_sla, allocate_daily_tasks.
2. **2 are triggered** by events (classification on submission, notification on status change).
3. **2 are scheduled** by Celery Beat (SLA check every hour, task allocation daily at shift start).
4. **Daily task allocation** uses a 4-factor weighted scoring algorithm (priority 40%, elapsed time 35%, queue position 15%, carry-forward 10%).
5. **Carry-forward** gives yesterday's incomplete tasks a 10% scoring bonus — but doesn't override higher-priority new tasks.
6. **Classification timeouts** are handled gracefully: 8s warning, 20s fallback to triage.
7. All weights and schedules are **configurable via `.env`** — no code changes needed to tune.

---

> **Next:** [10-Infrastructure-DevOps.md](10-Infrastructure-DevOps.md) — Understand Docker, Docker Compose, CI/CD, and deployment.
