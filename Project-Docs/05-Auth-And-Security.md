# 05 — Authentication & Security

> **Reading time:** 12 minutes
> **Prerequisite:** [04-Tech-Stack.md](04-Tech-Stack.md)
> **After reading:** You'll understand how every user type authenticates, how JWT works, role-based access control, and all security measures in the system.

---

## Security Philosophy

Three principles drive all security decisions:

1. **Built-in from Day 1** — Security is baked into the foundation (models, middleware, auth layers), never bolted on later.
2. **Risk-Appropriate** — Field workers and citizens get frictionless interfaces; the admin panel gets strict controls.
3. **No Silent Drops** — Malicious or malformed inputs are either rejected with clear feedback or routed to triage with transparency.

---

## Authentication Strategy — Three Users, Three Methods

Each user type authenticates differently, because each has different trust boundaries:

```
┌─────────────────────────────────────────────────────────────────┐
│                    WHO AUTHENTICATES HOW                         │
│                                                                 │
│  🧑‍🤝‍🧑 CITIZEN              👷 WORKER              🏛️ ADMIN       │
│  ─────────────           ──────────            ─────────       │
│  No login needed         Phone + 4-digit PIN   Username +      │
│                                                Password        │
│  Telegram sends          → JWT (24-hour)       → JWT (15-min   │
│  chat_id with every                              access +      │
│  message                                         24-hour       │
│                                                  refresh)      │
│  Identity = Telegram     Logs in once per day   Re-auths every │
│  chat_id                                        15 min (auto)  │
└─────────────────────────────────────────────────────────────────┘
```

### Citizen — Telegram Identity (Zero Friction)
- Telegram sends a verified `chat_id` and `username` with every webhook message.
- The system maps identity on first contact — no registration, no passwords, no login screen.
- **Telegram IS the authentication layer** for citizens.

### Worker — Phone + 4-Digit PIN → JWT
- Worker opens the Mobile PWA and enters their **phone number** and **4-digit PIN**.
- Backend verifies the PIN hash (bcrypt) and issues a **24-hour JWT token**.
- Worker works all day. Logs in again tomorrow morning.
- **No refresh token** — 24 hours is enough for one shift.

### Admin — Username + Password → JWT
- Admin opens the Web Dashboard and enters **username** and **password**.
- Backend verifies the password hash (bcrypt) and issues:
  - A **15-minute access token** (short-lived for security)
  - A **24-hour refresh token** (auto-refreshes the access token silently)
- **Shorter session** because admins have elevated privileges.

---

## JWT (JSON Web Token) — How It Works

### What's Inside a JWT

A JWT is a string that contains encoded information about the user. The server can verify it without checking a database.

**Admin JWT payload:**
```json
{
  "sub": "admin-uuid-123",
  "role": "admin",
  "exp": 1726045200
}
```

**Worker JWT payload:**
```json
{
  "sub": "worker-uuid-456",
  "role": "worker",
  "zone": "zone-A",
  "exp": 1726131600
}
```

> **Key difference:** Worker tokens include the `zone` field — the server uses this to ensure workers can only see tasks in their assigned zone.

### JWT Token Comparison

| Property | Admin | Worker |
|----------|-------|--------|
| **Algorithm** | HS256 | HS256 |
| **Login credential** | Username + Password | Phone + 4-Digit PIN |
| **Access token expiry** | 15 minutes | 24 hours |
| **Refresh token** | Yes (24-hour) | No (not needed) |
| **Token payload** | `{sub, role: "admin", exp}` | `{sub, role: "worker", zone, exp}` |
| **Signing secret** | `JWT_SECRET` from `.env` | Same |

### Complete Auth Flow — Admin

```
Browser (PWA)              FastAPI Backend              PostgreSQL
─────────────              ──────────────              ──────────

POST /auth/admin/login
{username, password}
        │
        ├────────────────►  Find admin by username
        │                        │
        │                   ├────────────────────────►  Return admin record
        │                   │◄───────────────────────  (with password_hash)
        │                   │
        │                   Verify password
        │                   (bcrypt compare)
        │                        │
        │                   Generate JWT access token
        │                   (15-min expiry)
        │                   + refresh token (24-hour)
        │                        │
        │◄───────────────── 200 OK {access_token, refresh_token}
        │
        │  All subsequent API calls include:
        │  Authorization: Bearer <access_token>
        │
        ├────────────────►  Decode JWT → check role → check expiry
        │◄───────────────── 200 OK {data}
        │
        │  When access_token expires (after 15 min):
        │
        │  POST /auth/admin/refresh
        │  {refresh_token}
        ├────────────────►  Verify refresh token → issue new access token
        │◄───────────────── 200 OK {new_access_token}
```

### Complete Auth Flow — Worker

```
Mobile PWA                 FastAPI Backend              PostgreSQL
──────────                 ──────────────              ──────────

POST /auth/worker/login
{phone: "9876543210", pin: "1234"}
        │
        ├────────────────►  Find worker by phone number
        │                        │
        │                   ├────────────────────────►  Return worker record
        │                   │◄───────────────────────  (with pin_hash)
        │                   │
        │                   Verify PIN
        │                   (bcrypt compare)
        │                        │
        │                   Generate JWT access token
        │                   (24-hour expiry, includes zone)
        │                        │
        │◄───────────────── 200 OK {access_token}
        │
        │  Works all day with this token...
        │  Authorization: Bearer <access_token>
        │
        ├────────────────►  Decode JWT → check role + zone → check expiry
        │◄───────────────── 200 OK {data}
        │
        │  Next morning: token expired → log in again
```

---

## Role-Based Access Control (RBAC)

After authentication, the system checks **what the user is allowed to do** based on their role.

### Permission Matrix

| Endpoint | Citizen (Telegram) | Worker | Admin |
|----------|-------------------|--------|-------|
| Create complaint | ✅ via bot | ❌ | ❌ |
| Track complaint by code | ✅ via bot | ✅ own tasks | ✅ all |
| View my tasks | ❌ | ✅ | ❌ |
| Resolve a complaint | ❌ | ✅ own tasks | ❌ |
| View dashboard stats | ❌ | ❌ | ✅ |
| View triage queue | ❌ | ❌ | ✅ |
| Classify triaged complaint | ❌ | ❌ | ✅ |
| Create worker account | ❌ | ❌ | ✅ |
| Assign worker to zone | ❌ | ❌ | ✅ |
| Export data | ❌ | ❌ | ✅ |

### How RBAC Is Enforced (FastAPI Dependencies)

```python
# deps.py — Auth dependencies

async def get_current_user(token: str = Depends(oauth2_scheme)):
    """Decode JWT token and return the user."""
    payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    user_id = payload["sub"]
    role = payload["role"]
    user = await get_user_by_id(user_id, role)
    return user

def require_role(role: str):
    """Dependency that enforces a specific role."""
    async def checker(user=Depends(get_current_user)):
        if user.role != role:
            raise HTTPException(403, "Insufficient permissions")
        return user
    return checker

# Usage — admin-only route:
@router.get("/admin/dashboard/stats")
async def get_dashboard(admin=Depends(require_role("admin"))):
    ...

# Usage — worker-only route:
@router.get("/workers/me/tasks")
async def get_my_tasks(worker=Depends(require_role("worker"))):
    ...
```

**In plain English:** Every protected API endpoint declares which role it requires. FastAPI automatically checks the JWT token, extracts the role, and blocks unauthorized access before the route handler even runs.

---

## Credential Security

### Password & PIN Hashing

| | Admin Password | Worker PIN |
|-|----------------|------------|
| **What** | 8+ character password | Exactly 4 digits (0000–9999) |
| **Hashing** | bcrypt via `passlib` | bcrypt via `passlib` |
| **Salt** | Auto-generated (built into bcrypt) | Auto-generated |
| **Storage** | `password_hash` in `admin` table | `pin_hash` in `worker` table |
| **In API responses** | Never included | Never included |
| **Assignment** | Set by admin during account creation | System generates, admin distributes |
| **Reset** | N/A (single admin assumed) | Admin-initiated only |

> **Key point:** Even a 4-digit PIN is **never stored as plaintext**. It's bcrypt-hashed just like a full password.

### Worker PIN Security Trade-Off

A 4-digit PIN has only **10,000 possible combinations**. This is acceptable because:

1. Workers are **low-privilege** — they can only see their own zone's tasks.
2. **Rate limiting** (5 attempts/hour per phone) makes brute-force impractical.
3. The phone number acts as a "username" — an attacker needs **both** phone + PIN.
4. Admin can **instantly deactivate** any worker if compromise is suspected.

> This would **NOT** be acceptable for admin accounts — hence admins use full passwords.

---

## Brute-Force Protection (Rate Limiting)

| Endpoint | Rate Limit | Why |
|----------|-----------|-----|
| `POST /auth/admin/login` | 3 attempts/minute per IP | Admins have full passwords — 3/min is reasonable |
| `POST /auth/worker/login` | 5 attempts/hour per phone | PINs have only 10K combinations — aggressive limiting critical |
| `POST /complaints` (via Telegram) | 5 complaints/day per chat_id | Prevents spam/abuse |

After exceeding the limit:
- Admin: IP is blocked for 1 minute
- Worker: Phone number is locked for 1 hour
- Citizen: No more complaints until next day

---

## Domain-Specific Security

### 1. Citizen Image Protection

Citizens upload photos of real civic issues. These photos may show identifiable locations, people, or sensitive situations. They must be protected.

| Layer | Protection | How |
|-------|-----------|-----|
| **Backend** | Signed URLs (time-limited) | Images are stored in private MinIO/S3 buckets. The backend generates a signed URL that expires in 15 minutes. No permanent public links. |
| **Frontend** | Canvas rendering | Images are drawn on an HTML5 `<canvas>` element — not an `<img>` tag. This disables right-click "Save Image As" and drag-to-desktop. |
| **Frontend** | Anti-screenshot key interception | JavaScript intercepts `PrintScreen`, `Meta+Shift+S`, `Ctrl+P` — clears the canvas and scrubs the clipboard. |
| **Frontend** | Tab-switch blanking | When the user alt-tabs or activates a screen-snipping tool, the image is blurred using `window.onblur` and `visibilitychange`. |
| **Frontend** | Dynamic forensic watermark | A semi-transparent diagonal watermark renders across the image: `User: <Name> | ID: <ID> | <IP> | <Timestamp>`. Any physical photo of the screen traces back to the leaker. |
| **Frontend** | Print/PDF block | CSS `@media print` hides the canvas. |
| **Mobile** | OS-level screenshot block | For Android wrapper (TWA/Capacitor), `FLAG_SECURE` blocks OS-level screenshots. |
| **Backend** | No bulk image export | CSV/Excel export includes complaint data (text, status, dates) but **never** image URLs or image data. |

### 2. AI-Generated Fake Image Detection (3-Gate Pipeline)

Before any image enters the system, it passes through 3 fraud detection gates:

```
Image Uploaded
      │
      ▼
┌─────────────┐     ┌─────────────────────┐     ┌──────────────────┐
│  Gate 1:    │────►│  Gate 2:            │────►│  Gate 3:         │
│  Unsafe     │     │  Metadata &         │     │  AI Classification│
│  Content    │     │  Integrity Check    │     │  Confidence      │
│  (NSFW)     │     │  (EXIF + ELA +Hash) │     │  Check           │
└─────────────┘     └─────────────────────┘     └──────────────────┘
      │                    │                          │
  Block if              Flag if                   Triage if
  unsafe               suspicious                confidence < 50%
```

**Gate 1 — NSFW Content Check:**
- Uses `opennsfw2` library to detect inappropriate content.
- If detected → complaint is **immediately rejected** with a polite message.

**Gate 2 — Metadata & Integrity:**
- **EXIF check:** Does the image have camera metadata? AI-generated images usually lack EXIF data.
- **ELA (Error Level Analysis):** Detects image manipulation (Photoshop, splicing).
- **Perceptual hash:** Checks for duplicate submissions (same image submitted multiple times).
- If suspicious → complaint is **flagged** and routed to admin triage with fraud flags.

**Gate 3 — AI Classification Confidence:**
- If MobileNetV2's confidence is **below 50%** → complaint is **auto-rejected** (image is likely irrelevant).
- If between **50%–70%** → sent to **triage queue** for admin review.
- If **above 70%** → auto-classified and routed normally.

### 3. Telegram Bot Security

| Practice | Purpose |
|----------|---------|
| **Webhook secret token** | Verify every incoming webhook request actually came from Telegram, not an attacker. Telegram supports a `secret_token` header. |
| **Chat ID validation** | Store known citizen `chat_id`s — ignore messages from unknown sources if needed. |
| **No sensitive data in bot messages** | Tracking codes are short, anonymized. No personal data in bot responses. |
| **Rate limiting per citizen** | Max 5 complaints per 24 hours per `chat_id` — prevents spam/abuse. |

### 4. Telegram Session Security

Citizen conversation state is stored in **Redis**:

| Setting | Value |
|---------|-------|
| **Session key** | `telegram:{chat_id}:session` |
| **Session TTL** | 30 minutes (auto-deleted after inactivity) |
| **Idle prompt** | After 15 minutes of inactivity → "Do you want to continue?" |
| **Session data** | Current step, collected fields, classification result, Celery task ID |

If the session expires → citizen can start a fresh complaint anytime with `/report`.

---

## API Security — Baseline Protections

These apply to **all endpoints**, always:

| Threat | Protection | Implementation |
|--------|-----------|----------------|
| **Cross-Origin attacks** | CORS whitelist | FastAPI `CORSMiddleware` — only allow requests from your frontend domain |
| **Brute-force login** | Rate limiting | `slowapi` library with per-IP and per-phone limits |
| **SQL Injection** | Parameterized queries | SQLAlchemy ORM — never writes raw SQL strings |
| **Invalid input** | Input validation | Pydantic schemas — every request body is type-checked and validated |
| **Oversized uploads** | File size limits | FastAPI `UploadFile` with max size check (5MB for images) |
| **Webhook spoofing** | Secret token verification | Telegram sends a secret token header — match against configured token |
| **Exposed secrets** | `.env` + `.gitignore` | Secrets never committed to Git. In production, read from AWS SSM. |
| **Insecure transport** | HTTPS everywhere | Nginx + Let's Encrypt in production. Telegram webhooks require HTTPS. |

---

## Security Implementation Timeline

Security isn't a phase — it's woven into every development phase:

| Phase | What Gets Built |
|-------|----------------|
| **Phase 1 (Foundation)** | Password/PIN hashing (bcrypt), JWT auth, RBAC, CORS, rate limiting middleware |
| **Phase 2 (Intelligence)** | Image fraud checks (EXIF, ELA, hash) built into classification pipeline |
| **Phase 3 (Interfaces)** | Telegram webhook verification, session security, image protection (canvas, watermark, anti-screenshot) |
| **Phase 4 (Integration)** | End-to-end security testing, token expiry validation |
| **Phase 5 (Deployment)** | HTTPS (Nginx + Let's Encrypt), CORS tightening, SSM secret management |
| **Phase 6 (Hardening)** | Security audit, rate limit tuning, penetration testing |

---

## Key Takeaways from This Document

1. **Three auth methods:** Citizens use Telegram identity, workers use phone + PIN → JWT, admins use username + password → JWT.
2. **Admin tokens are short-lived** (15 min access + 24h refresh) because admins have elevated privileges.
3. **Worker tokens are long-lived** (24h) because workers need one-login-per-day convenience.
4. **RBAC** is enforced via FastAPI dependency injection — each route declares its required role.
5. **Passwords and PINs are bcrypt-hashed** — never stored in plaintext.
6. **Rate limiting** protects login endpoints — 3/min for admin, 5/hour for worker.
7. **Image protection** uses canvas rendering, anti-screenshot, watermarking, and signed URLs.
8. **Fake image detection** uses a 3-gate pipeline: NSFW → EXIF/ELA/Hash → confidence threshold.
9. **Security is built from Day 1**, not added at the end.

---

> **Next:** [06-AI-ML-Pipeline.md](06-AI-ML-Pipeline.md) — Understand how image and text classification work.
