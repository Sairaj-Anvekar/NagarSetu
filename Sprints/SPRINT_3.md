> **IDE NOTE (read first):** We are on **Sprint 3** only. Work only on the SGMS issue keys listed in this file, one issue per request, in order (T1, then T2, then T3). Do not start, scaffold, stub or suggest anything from later sprints, even if you know what comes next. If I ask for something outside this list, reply "Outside Sprint 3" and ask me to confirm first. No extras or refactors beyond the issue. When every issue and the gate are done, say "Sprint 3 complete, stop here". Keep replies short and don't reprint unchanged files.


# Sprint 3: Telegram intake, Redis state machine, storage, AI inference, NSFW check

- **Points:** 77 (SA 42 / SU 13 / TU 22)
- **Needs first:** S2 auth, API conventions (SGMS-23), inference contract (SGMS-28), packaged models (SGMS-44)
- **Gate (SGMS-66):** AI returns a category for both image and text inputs; Telegram conversation state survives between messages; stable inference contract exists.
- **Skip for now:** SLA/priority, PostGIS assignment, worker resolution, charts
- **Drop first if behind (T3):** none

**Legend:** T1 core, T2 important, T3 droppable. `+` = added from master plan.

## Sairaj (SA) - backend / devops

| Key | Pts | Tier | Task |
|---|---:|:---:|---|
| SGMS-47 | 5 | T1 | Complaint service and initial complaint API contracts |
| SGMS-48 | 3 | T1 | Unique grievance/tracking code generator (e.g. GRV-2026-A7X3) |
| SGMS-49 | 3 | T1 | Complaint log (audit) service |
| SGMS-50 | 5 | T1 | Telegram webhook endpoint with webhook verification |
| SGMS-51 | 3 | T1 | Redis session service with TTL (incomplete conversations only) |
| SGMS-52 | 8 | T1 | Conversation state machine: START -> AWAITING_IMAGE/TEXT -> CLASSIFYING -> AWAITING_CONFIRMATION -> AWAITING_LOCATION -> AWAITING_DESCRIPTION -> SUMMARY -> CONFIRMED -> SUBMITTED |
| SGMS-53 | 5 | T1 | Object storage adapter (MinIO local / S3 production) |
| SGMS-54 | 2 | T1 | Media type and file-size validation |
| SGMS-55 | 5 | T1 | Wire inference into bot flow; citizen can confirm or reject predicted category |

## Sufiyan (SU) - frontend

| Key | Pts | Tier | Task |
|---|---:|:---:|---|
| SGMS-56 | 3 | T2 | Admin complaint preview |
| SGMS-57 | 3 | T1 | Worker complaint detail skeleton (complaint data only, no citizen PII) |
| SGMS-58 | 5 | T1 | Reusable components: complaint card, category badge, priority badge, location |
| SGMS-59 | 2 | T1 | Loading/error states for AI classification and complaint retrieval |

## Tushar (TU) - ML, tests, docs

| Key | Pts | Tier | Task |
|---|---:|:---:|---|
| SGMS-60 | 5 | T1 | Expose MobileNetV2 image inference |
| SGMS-61 | 5 | T1 | Expose DistilBERT text inference |
| SGMS-62 | 3 | T1 | Stable response schema (category + confidence + model version) and preprocessing docs |
| SGMS-63 | 3 | T1 | Benchmark latency: text ~1-2s, image ~1-5s, overall <5s (10-15s upper bound) |
| SGMS-64 | 3 | T1 | Test inference with representative examples and failure cases |
| SGMS-65 | 3 | T2 | `+` NSFW image safety filter (nsfw_check_service) |

## Gate (whole team)

| Key | Pts | Tier | Task |
|---|---:|:---:|---|
| SGMS-66 | 3 | T1 | Week 3 Integration Gate verification |
