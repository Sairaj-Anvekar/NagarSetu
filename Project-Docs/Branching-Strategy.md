# Git Branching Strategy — NagarSetu

> **Core Rule:** Never commit directly to `main` or `dev`. Always branch from `dev`, finish your task, and merge back into `dev` via Pull Request.

---

### The Branch Model

```
main  ────────────────────────────────────────────────────────► (Production: always works)
         │                                               ▲
         └── dev  ───────────────────────────────────────┼────► (Integration & testing)
                │                  │             │       │
                │                  │             └── feature/SGMS-16-models
                │                  └── feature/SGMS-20-vue-init
                └── feature/SGMS-14-docker-compose
```

---

### The Three Branches

| Branch | Purpose | Rules |
|---|---|---|
| **`main`** | Production copy (golden build) | Nobody commits directly. Code only arrives from `dev` at sprint gates. |
| **`dev`** | Team integration & testing | Nobody commits directly. All feature branches merge here via PR. |
| **`feature/SGMS-XX-*`** | Isolated work for one task | Created from `dev`. Deleted immediately after merging into `dev`. |

---

### Branch Naming Convention

Format: `feature/SGMS-<issue-number>-<short-description>`

- Sairaj: `feature/SGMS-14-docker-compose`
- Sufiyan: `feature/SGMS-20-vue-init`
- Tushar: `feature/SGMS-25-dataset-prep`

---

### Daily Team Workflow (Step-by-Step)

```bash
# 1. Update your local dev branch
git checkout dev
git pull origin dev

# 2. Create your feature branch from dev
git checkout -b feature/SGMS-14-docker-compose

# 3. Work on your task, stage and commit
git add .
git commit -m "SGMS-14: Add Docker Compose with PostgreSQL, Redis, MinIO"

# 4. Push your branch to GitHub
git push -u origin feature/SGMS-14-docker-compose

# 5. Open a Pull Request on GitHub:
#    Base: dev  <---  Compare: feature/SGMS-14-docker-compose
#    Ask a teammate (Sufiyan or Tushar) to review and approve.

# 6. Merge the PR into dev and delete the remote branch on GitHub.

# 7. Clean up locally
git checkout dev
git pull origin dev
git branch -d feature/SGMS-14-docker-compose
```

---

### Why Not Skip `dev`?

| Scenario | With `dev` | Without `dev` (`main` only) |
|---|---|---|
| Broken code or integration bug | Caught in `dev`, fixed before `main` | `main` breaks, professor/mentor sees broken app |
| Mid-sprint demo | Demo runs reliably from clean `main` | `main` is half-broken mid-sprint |
| Sprint Gate testing | Test full app in `dev`, merge to `main` when gate passes | `main` is your testing ground (risky) |

---

### CI/CD Pipeline Triggers (GitHub Actions)

- **PR to `dev`** → Runs linting (Ruff/ESLint) & unit tests.
- **Merge to `dev`** → Runs integration checks & verifies containers.
- **Sprint Gate (`dev` → `main`)** → Full test suite passes.
- **Merge to `main`** → Deploys to production environment (AWS in Sprint 8).

---

### The 4 Golden Rules
1. **Never push directly to `main` or `dev`.**
2. **Always branch from `dev` (`git pull origin dev` first).**
3. **One issue = One branch.**
4. **Target `dev` when opening a Pull Request.**
