> **IDE NOTE (read first):** Development is sprint by sprint. Work only on the sprint named in STATE below and only on the issue key I name. Do not start, scaffold, stub or suggest work from later sprints, even if you know what comes next. If asked, say it is outside the current sprint and ask me to confirm. One issue per request, keep replies short, don't reprint unchanged files.

# SGMS: Read This First

Citizens report civic issues on Telegram, AI classifies them, PostGIS zones and auto-assigns a worker, the worker resolves it in a PWA, and the admin monitors everything.

- **Jira:** project SGMS, board 69, 8 weekly sprints
- **Team:** SA Sairaj (backend, devops) / SU Sufiyan (frontend) / TU Tushar (ML, tests, docs)
- **Stack:** FastAPI, SQLAlchemy, Alembic, PostgreSQL + PostGIS, Redis, MinIO/S3 / Vue 3 + JavaScript + Vite + Bootstrap, Pinia / Telegram bot / MobileNetV2 + DistilBERT / Docker, GitHub Actions, AWS EC2 + Nginx

## STATE

`current_sprint = 1` *(edit every Monday)*

## How to Work

1. Read **only** `SPRINT_<current_sprint>.md`. Ignore the other sprint files.
2. Take the next issue for your owner code: T1, then T2, then T3. Respect the "Skip for now" list.
3. Branch `feature/SGMS-<n>-slug` from `dev`, commit `SGMS-<n>: message`, open a PR into `dev`. Never commit directly to `main` or `dev`. Ship tests with code. CI green. Max 2 issues in progress.
4. Done means works, tested, errors handled, logged. Move the Jira issue: To Do, In Progress, In Review, Done.
5. If something you depend on isn't done, code to its agreed contract and stub it. Don't invent new contracts.
6. If a task conflicts with the rules below, stop and ask.

## Pace

| Checkpoint | Target |
|---|---|
| Wednesday | 40% of your points done |
| Thursday | 75% of your points done |
| Friday | All T1 + T2 + the gate done |

- **Behind:** drop T3 first, then the lowest T2. Never T1 or the gate. Tell the team the same day. Tushar usually has spare capacity.
- **Ahead:** pull at most 20% of the sprint from the next one (same owner, dependencies met). Otherwise do tests, review, docs. Never skip the gate.
- **Gate fails:** fix it first next sprint.
- **Closed suspiciously fast?** Re-check tests, errors, logging.

## Rules Never to Break

- Only 3 complaint statuses: Submitted, In-Progress, Completed. Deferral is a log event.
- Save a complaint only after the citizen confirms category **and** shares location. Drafts live in Redis (TTL).
- **AI:** image (MobileNetV2: Solid Waste, Potholes, Waterlogging), text (DistilBERT: Streetlight, Water Supply, Encroachment, Stray Animals, Admin Delay). Confidence under 70% goes to the triage queue. NSFW check first.
- **Assignment:** zone from PostGIS (4 static zones), then same department + zone + active worker, then lowest workload, then nearest, then oldest last assignment. Atomic, one active assignment per complaint. No worker: keep queued and alert admin. Reassign only when a worker is deactivated.
- **Queue order:** overdue, then priority, then age. SLA hours per category are config.
- **Auth:** admin username + password, worker phone + 4-digit PIN, bcrypt, JWT, server-side RBAC. Worker screens never show citizen personal data.
- Completion needs photo + note, then the citizen is notified on Telegram.
- No hard-coded secrets, rate limiting, validate uploads, verify the Telegram webhook.
- **10 tables:** citizen, admin, worker, department, zone, complaint, complaint_assignment, complaint_log, triage_queue, resolution.
