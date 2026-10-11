> **IDE NOTE (read first):** We are on **Sprint 5** only. Work only on the SGMS issue keys listed in this file, one issue per request, in order (T1, then T2, then T3). Do not start, scaffold, stub or suggest anything from later sprints, even if you know what comes next. If I ask for something outside this list, reply "Outside Sprint 5" and ask me to confirm first. No extras or refactors beyond the issue. When every issue and the gate are done, say "Sprint 5 complete, stop here". Keep replies short and don't reprint unchanged files.


# Sprint 5: PostGIS zoning + atomic auto-assignment, worker queue

- **Points:** 63 (SA 39 / SU 11 / TU 13)
- **Needs first:** complaint creation (SGMS-68), seeded zones (SGMS-36), workers with zone (SGMS-35)
- **Gate (SGMS-100):** A Submitted complaint with a valid location gets its zone automatically and is assigned to exactly one eligible worker (department, zone, active, workload, tie-breaks).
- **Skip for now:** resolution flow, admin analytics, deployment
- **Drop first if behind (T3):** none

**Legend:** T1 core, T2 important, T3 droppable. `+` = added from master plan.

## Sairaj (SA) - backend / devops

| Key | Pts | Tier | Task |
|---|---:|:---:|---|
| SGMS-85 | 3 | T1 | Store complaint location as PostGIS Point with spatial index |
| SGMS-86 | 3 | T1 | Zone lookup by spatial containment (ST_Within / ST_Contains) |
| SGMS-87 | 3 | T1 | Eligible worker filter: same department, same zone, active only |
| SGMS-88 | 3 | T1 | Active workload calculation query |
| SGMS-89 | 5 | T1 | Worker selection: lowest workload, then ST_Distance, then oldest last-assignment |
| SGMS-90 | 8 | T1 | Atomic assignment transaction + one-active-assignment-per-complaint constraint *(DB transaction + partial unique index)* |
| SGMS-91 | 5 | T1 | No-eligible-worker path: keep complaint queued and alert admin *(never lose, fail or mis-assign the complaint)* |
| SGMS-92 | 3 | T1 | Worker task queue endpoint (GET /workers/me/tasks) |
| SGMS-93 | 3 | T2 | `+` Reassign active tasks on worker deactivation |

## Sufiyan (SU) - frontend

| Key | Pts | Tier | Task |
|---|---:|:---:|---|
| SGMS-95 | 5 | T1 | Worker task queue from assigned complaints |
| SGMS-96 | 3 | T1 | Task fields: code, category, description, image, location, priority, SLA, status (no PII) |
| SGMS-97 | 3 | T1 | Priority/overdue indicators and Get Directions (Google Maps link) |

## Tushar (TU) - ML, tests, docs

| Key | Pts | Tier | Task |
|---|---:|:---:|---|
| SGMS-94 | 5 | T2 | Assignment test suite: all zones, departments, inactive, tie-breaks, duplicates |
| SGMS-98 | 5 | T1 | Integrate finalized model package with backend |
| SGMS-99 | 3 | T1 | Confirm deterministic category-to-department mapping; document low-confidence behavior |

## Gate (whole team)

| Key | Pts | Tier | Task |
|---|---:|:---:|---|
| SGMS-100 | 3 | T1 | Week 5 Integration Gate verification |
