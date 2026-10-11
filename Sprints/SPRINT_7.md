> **IDE NOTE (read first):** We are on **Sprint 7** only. Work only on the SGMS issue keys listed in this file, one issue per request, in order (T1, then T2, then T3). Do not start, scaffold, stub or suggest anything from later sprints, even if you know what comes next. If I ask for something outside this list, reply "Outside Sprint 7" and ask me to confirm first. No extras or refactors beyond the issue. When every issue and the gate are done, say "Sprint 7 complete, stop here". Keep replies short and don't reprint unchanged files.


# Sprint 7: Admin dashboard, hotspots, export, triage, hardening, full E2E, bug bash

- **Points:** 97 (SA 41 / SU 34 / TU 22)
- **Needs first:** all S1-S6 gates passed
- **Gate (SGMS-144):** Full E2E works locally: Telegram -> AI -> confirmation -> location -> Submitted -> PostGIS zone -> auto-assignment -> PWA -> In-Progress -> Completed -> citizen notification -> admin dashboard.
- **Skip for now:** production infra. After mid-week: bug fixes only, no new features
- **Drop first if behind (T3):** SGMS-124, SGMS-127, SGMS-133, SGMS-135, SGMS-139

**Legend:** T1 core, T2 important, T3 droppable. `+` = added from master plan.

## Sairaj (SA) - backend / devops

| Key | Pts | Tier | Task |
|---|---:|:---:|---|
| SGMS-118 | 5 | T2 | Admin metrics endpoints (GET /dashboard/stats) |
| SGMS-120 | 3 | T2 | Complaint search and detail endpoints |
| SGMS-122 | 3 | T2 | Audit / complaint-log viewing endpoint |
| SGMS-123 | 5 | T2 | Hotspot query using ST_DWithin and spatial aggregation |
| SGMS-124 | 3 | T3 | Filters: date, category, department, zone |
| SGMS-125 | 3 | T2 | `+` Triage API (GET/PATCH /triage/*) for low-confidence cases |
| SGMS-126 | 5 | T2 | Security hardening and API validation review |
| SGMS-127 | 3 | T3 | Database index and slow-query review |
| SGMS-130 | 5 | T2 | Full E2E run: citizen -> AI -> assignment -> worker -> completion -> admin |
| SGMS-143 | 3 | T2 | Team bug bash (all 3 members) |

## Sufiyan (SU) - frontend

| Key | Pts | Tier | Task |
|---|---:|:---:|---|
| SGMS-131 | 5 | T2 | Dashboard page: submitted, in-progress, completed, overdue totals |
| SGMS-132 | 3 | T2 | Category breakdown chart |
| SGMS-133 | 3 | T3 | Time trend chart |
| SGMS-134 | 5 | T2 | Hotspot map (Leaflet + OpenStreetMap) |
| SGMS-135 | 3 | T3 | Dashboard filters UI |
| SGMS-136 | 5 | T2 | Complaint search and detail screen |
| SGMS-137 | 2 | T2 | Export action |
| SGMS-138 | 5 | T2 | `+` Admin triage queue screen |
| SGMS-139 | 3 | T3 | Responsive layout polish and worker management completion |

## Tushar (TU) - ML, tests, docs

| Key | Pts | Tier | Task |
|---|---:|:---:|---|
| SGMS-121 | 5 | T2 | CSV/Excel export endpoint |
| SGMS-128 | 3 | T2 | `+` Structured JSON logging and operational signals (latency, confidence, overdue, unassigned) |
| SGMS-129 | 3 | T2 | Assignment and SLA edge-case tests |
| SGMS-140 | 5 | T1 | Complete model evaluation report (accuracy, precision/recall, confusion matrix, failure cases) |
| SGMS-141 | 3 | T1 | Document model version, inference latency and confirm production packaging |
| SGMS-142 | 3 | T2 | Support E2E: AI scenario testing across categories and low-confidence path |

## Gate (whole team)

| Key | Pts | Tier | Task |
|---|---:|:---:|---|
| SGMS-144 | 3 | T1 | Week 7 Integration Gate verification |
