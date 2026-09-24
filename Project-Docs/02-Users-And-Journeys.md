# 02 — Users & Their Journeys

> **Reading time:** 8 minutes
> **Prerequisite:** [01-Project-Vision.md](01-Project-Vision.md)
> **After reading:** You'll understand exactly how each of the 3 user types interacts with the system, step by step.

---

## The Three User Types

The platform serves **3 distinct user types**, each with a different interface, different goals, and a different experience:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   🧑‍🤝‍🧑 CITIZEN     │    │   👷 FIELD WORKER │    │   🏛️ ADMINISTRATOR│
│                 │    │                 │    │                 │
│ Interface:      │    │ Interface:      │    │ Interface:      │
│ Telegram Bot    │    │ Mobile PWA      │    │ Web Dashboard   │
│                 │    │                 │    │                 │
│ Goal:           │    │ Goal:           │    │ Goal:           │
│ Report & Track  │    │ View & Resolve  │    │ Monitor & Manage│
│ complaints      │    │ tasks           │    │ everything      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## 🧑‍🤝‍🧑 Citizen Journey — "Report a problem in 30 seconds"

### The Interface: Telegram Bot
Citizens don't install any app. They use **Telegram** — a messaging app already on their phone. They interact entirely through chat.

### Step-by-Step Journey

```
Step 1: Citizen opens the Telegram bot and sends /report

Step 2: Bot asks: "📸 Please send a photo of the issue"

Step 3: Citizen takes a photo and sends it

Step 4: Bot says: "📷 Analyzing your image…"
        (AI classifies the image in the background)

Step 5: Bot responds: "Your image has been classified as: 🗑️ Solid Waste & Garbage"

Step 6: Bot asks: "📍 Please share your location"
        (Citizen taps the location button in Telegram)

Step 7: Bot asks: "📝 Please describe the issue briefly"
        Citizen types: "Large garbage dump near bus stop, smelling very bad"

Step 8: Bot shows a summary:
        ┌─────────────────────────────────────┐
        │  📋 Complaint Summary               │
        │                                     │
        │  Category: Solid Waste & Garbage    │
        │  Location: 19.0760° N, 72.8777° E  │
        │  Description: Large garbage dump    │
        │  near bus stop, smelling very bad   │
        │                                     │
        │  Reply ✅ to confirm or ❌ to cancel │
        └─────────────────────────────────────┘

Step 9: Citizen confirms → complaint is formally lodged

Step 10: Bot responds:
         "✅ Your complaint has been registered!
          Tracking code: GRV-2026-A7X3
          Category: Solid Waste & Garbage
          You'll receive updates as your complaint progresses."
```

### After Submission
- Citizen can **check status anytime** by messaging the bot with their tracking code.
- When a worker resolves the complaint, the citizen **automatically gets notified** with:
  - A message saying "Your complaint has been resolved!"
  - The **resolution photo** taken by the worker
  - A note from the worker

### Text-Only Complaints
Not all complaints are visual. If a citizen types a description *without* sending a photo (e.g., "No water supply since morning"), the AI uses **text classification** instead of image classification.

### Key Design Decisions
| Decision | Reasoning |
|----------|-----------|
| **Telegram, not a custom app** | No installation friction. Telegram is already widely used. |
| **AI classification during conversation** | Citizen gets immediate feedback on how the system understood their issue. |
| **GPS location, not typed address** | One tap, precise coordinates. No room for vague "near the temple" addresses. |
| **Tracking code** | Simple, memorable code the citizen can use to check status anytime. |

---

## 👷 Field Worker Journey — "Know exactly where to go and what to fix"

### The Interface: Mobile PWA (Progressive Web App)
Workers access a **mobile-optimized web application** from their phone browser. No app store installation — just a URL. It can be added to the home screen for quick access.

### Step-by-Step Journey

```
Step 1: Worker opens the mobile PWA and logs in
        Phone number: 9876543210
        4-digit PIN:  ● ● ● ●

Step 2: Worker sees their daily task queue
        ┌───────────────────────────────────────┐
        │  📋 Today's Tasks (12 of 20)          │
        │                                       │
        │  ┌─────────────────────────────────┐  │
        │  │ 🔴 URGENT                       │  │
        │  │ Potholes & Road Damage          │  │
        │  │ "Large pothole near school gate" │  │
        │  │ 📍 2.3 km away                  │  │
        │  │ ⏰ Due in 4 hours               │  │
        │  │ [Get Directions] [View Details]  │  │
        │  └─────────────────────────────────┘  │
        │                                       │
        │  ┌─────────────────────────────────┐  │
        │  │ 🟡 DUE SOON                    │  │
        │  │ 🔁 Carried Forward (Day 2)      │  │
        │  │ Solid Waste & Garbage           │  │
        │  │ "Garbage dump at corner"        │  │
        │  │ 📍 0.8 km away                  │  │
        │  │ ⏰ Due in 12 hours              │  │
        │  │ [Get Directions] [View Details]  │  │
        │  └─────────────────────────────────┘  │
        │                                       │
        │  ┌─────────────────────────────────┐  │
        │  │ 🟢 NORMAL                      │  │
        │  │ Waterlogging & Drainage         │  │
        │  │ "Water pooling on main road"    │  │
        │  │ 📍 3.1 km away                  │  │
        │  │ ⏰ Due in 20 hours              │  │
        │  │ [Get Directions] [View Details]  │  │
        │  └─────────────────────────────────┘  │
        └───────────────────────────────────────┘

Step 3: Worker taps "Get Directions" → phone opens navigation to the location

Step 4: Worker arrives at the site, sees the problem, fixes it

Step 5: Worker taps "Resolve" and:
        - Takes a "resolved" photo as proof
        - Adds a short note: "Pothole filled with asphalt"
        - Submits

Step 6: Complaint is marked as resolved
        → Citizen receives automatic notification with proof photo
        → Dashboard stats update in real-time
```

### Task Queue — How It's Sorted
Workers don't see random tasks. Each morning, a **scoring algorithm** selects the **top 15–20 tasks** for each worker:

| Factor | Weight | What It Means |
|--------|--------|---------------|
| **Priority** | 40% | Critical complaints score highest |
| **Elapsed Time** | 35% | Complaints approaching their SLA deadline rise to the top |
| **Queue Position** | 15% | Earlier submissions get a slight edge (FIFO fairness) |
| **Carry-Forward** | 10% | Yesterday's incomplete tasks get a bonus so they're not forgotten |

### Carry-Forward (Incomplete Tasks)
If a worker can't complete a task that day (weather, access blocked, parts needed):
1. They mark it as "Cannot Complete" with a **reason**.
2. Next day, the task **re-enters the scoring pool** with a 10% carry-forward bonus.
3. It competes fairly against new tasks — a carried-forward LOW priority task won't jump ahead of a new CRITICAL one.

### Key Design Decisions
| Decision | Reasoning |
|----------|-----------|
| **Mobile PWA, not native app** | No app store approval, no iOS/Android split, instant updates. |
| **4-digit PIN login** | Workers are in the field. Quick login is essential. Security is maintained through rate limiting. |
| **24-hour JWT token** | One login per day — no re-authentication disrupting their shift. |
| **15–20 tasks/day cap** | Prevents worker overload. Manageable daily workload. |
| **Color-coded urgency** | Instant visual prioritization — red/yellow/green. |

---

## 🏛️ Administrator Journey — "See the full picture, act on data"

### The Interface: Web Dashboard PWA (Desktop-first)
Admins use a **desktop-optimized web dashboard** — rich with charts, maps, tables, and management tools.

### What Admins See

```
┌──────────────────────────────────────────────────────────────┐
│  📊 ADMIN DASHBOARD                                          │
│                                                              │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────┐ │
│  │ Total: 847 │  │ Today: 23  │  │ Pending: 62│  │Overdue:│ │
│  │ Complaints │  │ Resolved   │  │ Active     │  │  8     │ │
│  └────────────┘  └────────────┘  └────────────┘  └────────┘ │
│                                                              │
│  ┌───────────────────────┐  ┌───────────────────────────┐   │
│  │ Category Breakdown    │  │ 7-Day Trend               │   │
│  │ [Pie/Bar Chart]       │  │ [Line Chart]              │   │
│  │ Garbage: 34%          │  │ Complaints are ↑ 12%      │   │
│  │ Potholes: 22%         │  │ Resolutions are ↑ 8%      │   │
│  │ Water: 15%            │  │                           │   │
│  │ Other: 29%            │  │                           │   │
│  └───────────────────────┘  └───────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 🗺️ Hotspot Map                                      │    │
│  │ [Leaflet Map showing complaint density across city] │    │
│  │ Red clusters = high-complaint areas                 │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ ⚠️ Triage Queue (3 complaints need review)           │    │
│  │                                                     │    │
│  │ #GRV-A7X3 | Confidence: 48% | Suggested: Garbage   │    │
│  │           | [Assign Category ▼] [Review]            │    │
│  │                                                     │    │
│  │ #GRV-B2K9 | Confidence: 52% | Suggested: Pothole   │    │
│  │           | [Assign Category ▼] [Review]            │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 👷 Worker Performance                                │    │
│  │ Ramesh: 18/20 resolved today ████████████████░░ 90% │    │
│  │ Sunil:  12/15 resolved today ████████████░░░░░ 80%  │    │
│  │ Meera:   5/20 resolved today █████░░░░░░░░░░░ 25%  │    │
│  └─────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

### Admin Capabilities

| Feature | What It Does |
|---------|-------------|
| **Live Metrics** | Total complaints, resolved today, pending, overdue, avg resolution time |
| **Category Breakdown** | Visual charts showing distribution across the 8 complaint categories |
| **Trend Analysis** | 7-day trend — are complaints increasing or decreasing? |
| **Hotspot Map** | Geographic map showing where complaints cluster (Leaflet + OpenStreetMap) |
| **Triage Queue** | Complaints where AI confidence < 70% — admin manually assigns the category |
| **Worker Performance** | Tasks assigned vs. completed per worker |
| **Worker Management** | Create worker accounts, assign zones, reset PINs, deactivate workers |
| **Data Export** | Download complaint data as CSV/Excel for reporting |

### Key Design Decisions
| Decision | Reasoning |
|----------|-----------|
| **Desktop-first layout** | Admins work on office computers, not phones. Dashboard needs wide charts and tables. |
| **Username + password login** | Admins have elevated privileges — stronger credentials than workers. |
| **15-minute access token** | Higher privilege = shorter session for security. Auto-refreshes silently. |
| **Manual triage** | AI isn't perfect. Human review ensures no complaint is misrouted. |

---

## How the Three Users Connect

```
  CITIZEN                    SYSTEM                      WORKER
  ─────────                  ──────                      ──────
  
  📱 Reports complaint
  via Telegram Bot
         │
         ▼
                        🧠 AI classifies the
                        complaint (image/text)
                             │
                        🏢 Routes to correct
                        department
                             │
                        📍 Finds nearest worker
                        in complaint's zone
                             │
                        📊 Scores & adds to
                        worker's daily queue
                                                    │
                                                    ▼
                                              👷 Worker sees it in
                                              their task list
                                                    │
                                              🗺️ Navigates to the
                                              location
                                                    │
                                              ✅ Resolves & uploads
                                              proof photo
                                                    │
                        📊 Dashboard updates    ◄───┘
                        in real-time
         │
         ▼
  🔔 Citizen gets
  notification:
  "Resolved!" + photo
  

                              ADMIN
                              ─────
                        
                        🏛️ Monitors everything on dashboard
                        │
                        ├─ Reviews triage queue (low-confidence complaints)
                        ├─ Tracks worker performance
                        ├─ Views hotspot maps
                        ├─ Manages worker accounts & zones
                        └─ Exports data for reporting
```

---

## Key Takeaways from This Document

1. **Citizens** interact only through **Telegram** — 30-second complaint filing, status tracking, resolution notifications.
2. **Workers** use a **mobile PWA** — prioritized daily task queue (15–20 tasks), GPS navigation, resolution photo submission.
3. **Admins** use a **web dashboard** — real-time analytics, triage queue, worker management, data export.
4. Tasks are assigned by a **weighted scoring algorithm** (priority 40%, elapsed time 35%, queue position 15%, carry-forward 10%).
5. The **triage queue** catches complaints where AI confidence is below 70% — admin manually classifies them.
6. When a complaint is resolved, the **citizen is automatically notified** with proof.

---

> **Next:** [03-System-Architecture.md](03-System-Architecture.md) — Understand the big picture of all the system components and how they connect.
