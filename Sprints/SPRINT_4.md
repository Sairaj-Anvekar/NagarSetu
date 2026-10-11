> **IDE NOTE (read first):** We are on **Sprint 4** only. Work only on the SGMS issue keys listed in this file, one issue per request, in order (T1, then T2, then T3). Do not start, scaffold, stub or suggest anything from later sprints, even if you know what comes next. If I ask for something outside this list, reply "Outside Sprint 4" and ask me to confirm first. No extras or refactors beyond the issue. When every issue and the gate are done, say "Sprint 4 complete, stop here". Keep replies short and don't reprint unchanged files.


# Sprint 4: Complaint finalization, SLA, priority, queue ordering, triage routing

- **Points:** 59 (SA 31 / SU 14 / TU 14)
- **Needs first:** S3 intake flow, Redis session, object storage
- **Gate (SGMS-84):** (Master Gate 2) A real complaint can be submitted via Telegram start to finish and appears in PostgreSQL with grievance code, location, category, priority, SLA deadline and Submitted status.
- **Skip for now:** auto-assignment, worker actions, notifications, analytics
- **Drop first if behind (T3):** none

**Legend:** T1 core, T2 important, T3 droppable. `+` = added from master plan.

## Sairaj (SA) - backend / devops

| Key | Pts | Tier | Task |
|---|---:|:---:|---|
| SGMS-67 | 5 | T1 | Finalize Telegram flow: mandatory location; image, text or image + optional text |
| SGMS-68 | 5 | T1 | Complaint creation transaction: persist complaint + logs, then delete Redis session *(only after citizen confirms AND shares location)* |
| SGMS-69 | 3 | T2 | SLA service: category-based deadline calculation |
| SGMS-70 | 1 | T2 | Decide and configure final SLA hours per category *(docs give ranges (e.g. 24-48h); finalize as config)* |
| SGMS-71 | 3 | T2 | Priority rules (critical/high/medium/low) from configured severity |
| SGMS-72 | 5 | T2 | Dynamic queue ordering: overdue first, then priority, age/time remaining, carry-forward *(reordering never reassigns)* |
| SGMS-73 | 3 | T2 | `+` Hourly SLA/overdue check job (APScheduler) |
| SGMS-74 | 3 | T1 | `+` Route low-confidence (<70%) predictions into triage_queue |

## Sufiyan (SU) - frontend

| Key | Pts | Tier | Task |
|---|---:|:---:|---|
| SGMS-76 | 3 | T1 | Citizen-facing submission/confirmation states |
| SGMS-77 | 3 | T2 | Complaint detail/status view (3 statuses) with prominent grievance code |
| SGMS-78 | 5 | T2 | Admin complaint list with priority, deadline and overdue indicators |
| SGMS-79 | 3 | T1 | Worker queue shell ready to consume the assignment API |

## Tushar (TU) - ML, tests, docs

| Key | Pts | Tier | Task |
|---|---:|:---:|---|
| SGMS-75 | 3 | T2 | Seed test data for overdue ordering and run real Telegram test submission |
| SGMS-80 | 3 | T1 | Optimize inference where necessary |
| SGMS-81 | 3 | T1 | Error analysis of false classifications and low-confidence cases |
| SGMS-82 | 2 | T1 | Document final category mappings and expected confidence behavior |
| SGMS-83 | 3 | T1 | Package best-performing model versions for integration |

## Gate (whole team)

| Key | Pts | Tier | Task |
|---|---:|:---:|---|
| SGMS-84 | 3 | T1 | Week 4 Integration Gate verification |
