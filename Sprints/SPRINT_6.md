> **IDE NOTE (read first):** We are on **Sprint 6** only. Work only on the SGMS issue keys listed in this file, one issue per request, in order (T1, then T2, then T3). Do not start, scaffold, stub or suggest anything from later sprints, even if you know what comes next. If I ask for something outside this list, reply "Outside Sprint 6" and ask me to confirm first. No extras or refactors beyond the issue. When every issue and the gate are done, say "Sprint 6 complete, stop here". Keep replies short and don't reprint unchanged files.


# Sprint 6: Worker PWA: start/complete/defer, evidence, notification, model freeze

- **Points:** 56 (SA 26 / SU 17 / TU 13)
- **Needs first:** atomic assignment (SGMS-90) and worker queue endpoint (SGMS-92)
- **Gate (SGMS-117):** (Master Gate 3) Worker takes a real assigned complaint Submitted -> In-Progress -> Completed with resolution evidence stored and citizen notification sent.
- **Skip for now:** admin analytics/export/hotspots, production deploy
- **Drop first if behind (T3):** none

**Legend:** T1 core, T2 important, T3 droppable. `+` = added from master plan.

## Sairaj (SA) - backend / devops

| Key | Pts | Tier | Task |
|---|---:|:---:|---|
| SGMS-101 | 3 | T1 | Start-work API (PATCH /complaints/{id}/start) with assignment-ownership check |
| SGMS-102 | 8 | T1 | Complete API: evidence upload, resolution record, Completed status in one transaction *(only assigned worker; validate photo; set resolved_at)* |
| SGMS-103 | 3 | T1 | Defer / cannot-complete API with reason and carry_forward_count *(log event, not a status; repeat deferrals escalate to admin)* |
| SGMS-104 | 2 | T1 | Complaint log entries for STARTED, DEFERRED, COMPLETED |
| SGMS-105 | 5 | T2 | Notification service: Telegram completion message with resolution photo |
| SGMS-106 | 2 | T1 | Worker task history endpoint |

## Sufiyan (SU) - frontend

| Key | Pts | Tier | Task |
|---|---:|:---:|---|
| SGMS-108 | 3 | T1 | Worker PWA login and installable PWA setup (online-only) |
| SGMS-109 | 3 | T1 | Task detail with Start Work action |
| SGMS-110 | 5 | T1 | Resolution photo capture/upload, note and Complete action with validation |
| SGMS-111 | 3 | T1 | Defer / cannot-complete flow with reason |
| SGMS-112 | 3 | T2 | Worker task history screen |

## Tushar (TU) - ML, tests, docs

| Key | Pts | Tier | Task |
|---|---:|:---:|---|
| SGMS-107 | 3 | T2 | Integration test: Submitted -> In-Progress -> Completed |
| SGMS-113 | 3 | T1 | Run final model evaluation |
| SGMS-114 | 3 | T2 | Metrics and confusion matrices for project documentation |
| SGMS-115 | 2 | T1 | Freeze model versions for production/demo |
| SGMS-116 | 2 | T2 | Document inference resource requirements and startup behavior |

## Gate (whole team)

| Key | Pts | Tier | Task |
|---|---:|:---:|---|
| SGMS-117 | 3 | T1 | Week 6 Integration Gate verification |
