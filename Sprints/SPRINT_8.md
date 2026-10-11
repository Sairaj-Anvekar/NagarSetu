> **IDE NOTE (read first):** We are on **Sprint 8** only. Work only on the SGMS issue keys listed in this file, one issue per request, in order (T1, then T2, then T3). Do not start, scaffold, stub or suggest anything from later sprints, even if you know what comes next. If I ask for something outside this list, reply "Outside Sprint 8" and ask me to confirm first. No extras or refactors beyond the issue. When every issue and the gate are done, say "Sprint 8 complete, stop here". Keep replies short and don't reprint unchanged files.


# Sprint 8: Production deploy, CI/CD, security review, demo, release tag

- **Points:** 73 (SA 45 / SU 14 / TU 14)
- **Needs first:** S7 gate passed, models frozen (SGMS-115)
- **Gate (SGMS-164):** (Master Gate 4) Production reachable over HTTPS and the complete demo scenario works from citizen complaint to admin visibility.
- **Skip for now:** ANY new feature. Release blockers only
- **Drop first if behind (T3):** SGMS-153, SGMS-157

**Legend:** T1 core, T2 important, T3 droppable. `+` = added from master plan.

## Sairaj (SA) - backend / devops

| Key | Pts | Tier | Task |
|---|---:|:---:|---|
| SGMS-145 | 5 | T2 | Production Docker configuration (docker-compose.prod.yml) |
| SGMS-146 | 5 | T2 | Deploy to AWS EC2 with container memory limits / swap |
| SGMS-147 | 5 | T2 | Nginx reverse proxy and HTTPS (Let's Encrypt / Certbot) |
| SGMS-148 | 5 | T2 | Production S3 storage and AWS SSM Parameter Store secrets |
| SGMS-149 | 5 | T2 | GitHub Actions pipeline: lint -> tests -> build -> deploy |
| SGMS-150 | 5 | T1 | Security review: JWT, RBAC, bcrypt, rate limits, CORS, file validation, webhook security, secrets |
| SGMS-151 | 3 | T2 | Logs, backups, DB operational procedures and rollback path |
| SGMS-161 | 5 | T2 | Execute final demo scenario end-to-end (all 3 members) |
| SGMS-162 | 3 | T2 | Fix release-blocking defects only (no new features) |
| SGMS-163 | 1 | T2 | Freeze demo build and tag release |

## Sufiyan (SU) - frontend

| Key | Pts | Tier | Task |
|---|---:|:---:|---|
| SGMS-154 | 3 | T2 | Build production frontend |
| SGMS-155 | 5 | T1 | PWA installability check and mobile layout fixes |
| SGMS-156 | 3 | T2 | Test Telegram/worker/admin interfaces against production APIs; device smoke tests |
| SGMS-157 | 3 | T3 | Presentation material and demo script |

## Tushar (TU) - ML, tests, docs

| Key | Pts | Tier | Task |
|---|---:|:---:|---|
| SGMS-152 | 3 | T2 | Clean-commit deploy and production smoke-test checklist |
| SGMS-153 | 3 | T3 | Final technical documentation |
| SGMS-158 | 3 | T2 | Package frozen model artifacts with the deployment |
| SGMS-159 | 3 | T1 | Verify startup loading and inference latency on production-like hardware |
| SGMS-160 | 2 | T1 | Final smoke tests: image and text classification |

## Gate (whole team)

| Key | Pts | Tier | Task |
|---|---:|:---:|---|
| SGMS-164 | 3 | T1 | Week 8 Integration Gate verification |
