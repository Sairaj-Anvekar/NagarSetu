> **IDE NOTE (read first):** We are on **Sprint 2** only. Work only on the SGMS issue keys listed in this file, one issue per request, in order (T1, then T2, then T3). Do not start, scaffold, stub or suggest anything from later sprints, even if you know what comes next. If I ask for something outside this list, reply "Outside Sprint 2" and ask me to confirm first. No extras or refactors beyond the issue. When every issue and the gate are done, say "Sprint 2 complete, stop here". Keep replies short and don't reprint unchanged files.


# Sprint 2: Auth, RBAC, worker management, zone/dept seed, model packaging

- **Points:** 58 (SA 27 / SU 18 / TU 13)
- **Needs first:** S1: models + migration (SGMS-16, 17), API conventions (SGMS-23)
- **Gate (SGMS-46):** (Master Gate 1) Admin and worker auth works end-to-end; RBAC blocks unauthorized routes; workers have a department and one of Zone A/B/C/D; baseline models load for inference.
- **Skip for now:** Telegram webhook, complaint creation, assignment
- **Drop first if behind (T3):** none

**Legend:** T1 core, T2 important, T3 droppable. `+` = added from master plan.

## Sairaj (SA) - backend / devops

| Key | Pts | Tier | Task |
|---|---:|:---:|---|
| SGMS-30 | 3 | T1 | Admin authentication (username + password, bcrypt, JWT) |
| SGMS-31 | 3 | T1 | Worker authentication (phone + 4-digit PIN, bcrypt, JWT) |
| SGMS-32 | 5 | T1 | Auth dependencies and RBAC for admin and worker endpoints |
| SGMS-33 | 3 | T2 | CORS configuration and SlowAPI rate limiting |
| SGMS-34 | 5 | T1 | Worker CRUD APIs with department assignment |
| SGMS-35 | 3 | T1 | Worker activate/deactivate and fixed zone assignment |
| SGMS-36 | 2 | T1 | Seed script for four static zones and departments (seed_static_zones.py) |

## Sufiyan (SU) - frontend

| Key | Pts | Tier | Task |
|---|---:|:---:|---|
| SGMS-38 | 3 | T1 | Admin and worker login screens |
| SGMS-39 | 5 | T1 | Pinia auth store, Axios token interceptor and route guards |
| SGMS-40 | 5 | T1 | Admin worker-management screen (initial) |
| SGMS-41 | 3 | T1 | Worker shell with placeholder task queue |
| SGMS-42 | 2 | T1 | Consistent 401/403/error-state handling |

## Tushar (TU) - ML, tests, docs

| Key | Pts | Tier | Task |
|---|---:|:---:|---|
| SGMS-37 | 3 | T2 | Authorization and server-side validation tests |
| SGMS-43 | 5 | T1 | Continue baseline training; measure accuracy, precision/recall, confusion matrix |
| SGMS-44 | 3 | T1 | Package model artifacts behind a stable loading interface |
| SGMS-45 | 2 | T1 | Define and document the confidence threshold after evaluation (baseline 70%) |

## Gate (whole team)

| Key | Pts | Tier | Task |
|---|---:|:---:|---|
| SGMS-46 | 3 | T1 | Week 2 Integration Gate verification |
