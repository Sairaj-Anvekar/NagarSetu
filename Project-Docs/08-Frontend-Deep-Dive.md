# 08 — Frontend Deep Dive

> **Reading time:** 10 minutes
> **Prerequisite:** [07-Backend-Deep-Dive.md](07-Backend-Deep-Dive.md)
> **After reading:** You'll understand the frontend folder structure, components, views, routing, state management, and how the admin and worker experiences coexist in one codebase.

---

## One Codebase, Two Experiences

The Admin Dashboard and Worker Mobile PWA are **the same Vue 3 application**. After login, the app checks the user's role and shows completely different views:

```
┌─────────────────────────────────────────────────────────┐
│                  SINGLE VUE 3 APPLICATION                │
│                                                         │
│   Login Screen                                          │
│        │                                                │
│        ├── role = "admin"  ──► Admin Dashboard Views    │
│        │                       (Desktop-first layout)   │
│        │                       Charts, maps, tables     │
│        │                                                │
│        └── role = "worker" ──► Worker Portal Views      │
│                                (Mobile-first layout)    │
│                                Task cards, camera, GPS  │
└─────────────────────────────────────────────────────────┘
```

**Why one codebase?**
- Single build, single deploy — no maintaining two separate projects.
- Shared authentication logic, shared API client, shared utility functions.
- Bootstrap 5's responsive grid handles the desktop/mobile layout differences.

---

## Complete Folder Structure

```
frontend/
├── src/
│   ├── assets/                    ← Static assets & custom CSS
│   │   ├── styles/
│   │   │   └── main.css           ← Global styles, Bootstrap overrides
│   │   └── images/                ← Logo, icons, static images
│   │
│   ├── components/                ← Reusable Vue components
│   │   ├── dashboard/             ← Admin dashboard components
│   │   │   ├── StatsCards.vue     ← Top metrics (total, resolved, pending, overdue)
│   │   │   ├── CategoryChart.vue  ← Pie/bar chart of categories (Chart.js)
│   │   │   ├── TrendChart.vue     ← 7-day trend line chart
│   │   │   ├── HotspotMap.vue     ← Leaflet map with complaint density
│   │   │   └── WorkerTable.vue    ← Worker performance table
│   │   │
│   │   ├── worker/                ← Worker portal components
│   │   │   ├── TaskCard.vue       ← Single task card (category, urgency, distance)
│   │   │   ├── TaskList.vue       ← Scrollable list of daily tasks
│   │   │   ├── ResolveForm.vue    ← Camera + note form for resolution
│   │   │   └── DeferForm.vue      ← Defer task form (reason required)
│   │   │
│   │   ├── triage/                ← Triage queue components
│   │   │   ├── TriageCard.vue     ← Single triage item (image, suggested category)
│   │   │   └── TriageQueue.vue    ← List of items needing admin review
│   │   │
│   │   └── shared/                ← Components used by both admin and worker
│   │       ├── Navbar.vue         ← Navigation bar (adapts based on role)
│   │       ├── LoginForm.vue      ← Login form (adapts for admin vs worker)
│   │       ├── CanvasViewer.vue   ← Protected image viewer (canvas, no <img>)
│   │       ├── LoadingSpinner.vue ← Loading indicator
│   │       └── StatusBadge.vue    ← Color-coded status badges (green/yellow/red)
│   │
│   ├── views/                     ← Top-level route pages
│   │   ├── LoginView.vue          ← Login page (role selector + form)
│   │   ├── AdminDashboard.vue     ← Main admin dashboard page
│   │   ├── AdminTriage.vue        ← Triage queue management page
│   │   ├── AdminWorkers.vue       ← Worker management page
│   │   ├── WorkerTaskQueue.vue    ← Worker's daily task list page
│   │   ├── WorkerTaskDetail.vue   ← Single task detail + resolve page
│   │   └── NotFound.vue           ← 404 page
│   │
│   ├── router/                    ← Vue Router configuration
│   │   └── index.js               ← Route definitions + auth guards
│   │
│   ├── stores/                    ← Pinia state stores
│   │   ├── authStore.js           ← Auth state (token, user, role, login/logout)
│   │   ├── complaintStore.js      ← Complaint data (tasks, stats, triage queue)
│   │   └── workerStore.js         ← Worker-specific state (active tasks, route)
│   │
│   ├── composables/               ← Vue 3 composables (reusable logic)
│   │   ├── useAuth.js             ← Auth helper (isAdmin, isWorker, token refresh)
│   │   ├── useGeolocation.js      ← GPS location access
│   │   └── useCamera.js           ← Camera access for resolution photos
│   │
│   ├── services/                  ← Axios API client layer
│   │   ├── api.js                 ← Base Axios instance (base URL, interceptors)
│   │   ├── authApi.js             ← Login, refresh, logout API calls
│   │   ├── complaintApi.js        ← Complaint CRUD API calls
│   │   ├── workerApi.js           ← Worker task API calls
│   │   └── adminApi.js            ← Dashboard, triage, management API calls
│   │
│   ├── utils/                     ← Frontend utility functions
│   │   ├── dateFormat.js          ← Date/time formatting helpers
│   │   └── constants.js           ← Category names, status labels, color mappings
│   │
│   ├── App.vue                    ← Root Vue component
│   └── main.js                    ← App entry point (Vue + Pinia + Router + Bootstrap)
│
├── public/
│   ├── favicon.ico
│   └── manifest.json              ← PWA manifest (app name, icons, theme color)
│
├── Dockerfile                     ← Container image for production build
├── package.json                   ← npm dependencies + scripts
├── vite.config.js                 ← Vite build configuration
└── index.html                     ← HTML entry point
```

---

## Layer-by-Layer Explanation

### Views — Full Pages

Views are the **top-level pages** that the router navigates to. Each view composes multiple components.

| View | Role | What It Shows |
|------|------|---------------|
| `LoginView.vue` | Both | Role selector (Admin/Worker) + login form |
| `AdminDashboard.vue` | Admin | StatsCards + CategoryChart + TrendChart + HotspotMap + WorkerTable |
| `AdminTriage.vue` | Admin | TriageQueue — complaints needing manual classification |
| `AdminWorkers.vue` | Admin | Worker list, create worker, manage zones |
| `WorkerTaskQueue.vue` | Worker | TaskList — today's assigned tasks, sorted by priority |
| `WorkerTaskDetail.vue` | Worker | Single task details + ResolveForm or DeferForm |

### Components — Reusable Pieces

Components are **reusable building blocks** used inside views.

**Dashboard components** (admin-only):
| Component | What It Does |
|-----------|-------------|
| `StatsCards.vue` | Displays 4 metric cards: total, resolved today, pending, overdue |
| `CategoryChart.vue` | Pie or bar chart showing complaint distribution by category |
| `TrendChart.vue` | Line chart showing 7-day complaint/resolution trends |
| `HotspotMap.vue` | Leaflet map with markers/clusters showing complaint density |
| `WorkerTable.vue` | Table with worker names, assigned tasks, completed tasks, performance % |

**Worker components** (worker-only):
| Component | What It Does |
|-----------|-------------|
| `TaskCard.vue` | Single task card showing category, urgency badge (🔴🟡🟢), distance, SLA deadline, carry-forward indicator |
| `TaskList.vue` | Scrollable list of TaskCard components, sorted by priority score |
| `ResolveForm.vue` | Camera access + text note + submit button for resolution proof |
| `DeferForm.vue` | Dropdown for deferral reason + submit button |

**Shared components** (used by both):
| Component | What It Does |
|-----------|-------------|
| `Navbar.vue` | Navigation bar that shows different links based on role |
| `LoginForm.vue` | Login form that adapts fields based on selected role (username/password vs phone/PIN) |
| `CanvasViewer.vue` | Secure image viewer using HTML5 Canvas — no `<img>` tag, anti-screenshot measures, watermark |
| `StatusBadge.vue` | Color-coded badge showing complaint status |
| `LoadingSpinner.vue` | Loading indicator for async operations |

---

### Router — Navigation & Auth Guards

The router defines **which view to show for each URL** and protects routes based on role.

```javascript
// router/index.js (simplified)

const routes = [
  // Public
  { path: "/login", component: LoginView },

  // Admin-only routes
  {
    path: "/admin/dashboard",
    component: AdminDashboard,
    meta: { requiresAuth: true, role: "admin" }
  },
  {
    path: "/admin/triage",
    component: AdminTriage,
    meta: { requiresAuth: true, role: "admin" }
  },
  {
    path: "/admin/workers",
    component: AdminWorkers,
    meta: { requiresAuth: true, role: "admin" }
  },

  // Worker-only routes
  {
    path: "/worker/tasks",
    component: WorkerTaskQueue,
    meta: { requiresAuth: true, role: "worker" }
  },
  {
    path: "/worker/tasks/:id",
    component: WorkerTaskDetail,
    meta: { requiresAuth: true, role: "worker" }
  },
];

// Navigation guard — runs before every route change
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return next("/login");  // Not logged in → redirect to login
  }

  if (to.meta.role && authStore.userRole !== to.meta.role) {
    return next("/login");  // Wrong role → redirect to login
  }

  next();  // All good → proceed
});
```

**After login:**
- Admin → redirected to `/admin/dashboard`
- Worker → redirected to `/worker/tasks`

---

### Stores (Pinia) — Global State

Stores hold data that **multiple components** need to access.

#### `authStore.js` — Authentication State
| State | Type | Purpose |
|-------|------|---------|
| `token` | String | The current JWT access token |
| `refreshToken` | String | Admin refresh token (null for workers) |
| `user` | Object | Current user data (id, name, role) |
| `isAuthenticated` | Boolean | Whether the user is logged in |
| `userRole` | String | "admin" or "worker" |

**Actions:** `login()`, `logout()`, `refreshAccessToken()`

#### `complaintStore.js` — Complaint Data
| State | Type | Purpose |
|-------|------|---------|
| `dashboardStats` | Object | Admin dashboard metrics |
| `triageQueue` | Array | Complaints needing admin review |
| `trendData` | Object | 7-day trend chart data |

#### `workerStore.js` — Worker Task Data
| State | Type | Purpose |
|-------|------|---------|
| `tasks` | Array | Today's assigned tasks |
| `activeTask` | Object | Currently selected task |

---

### Services (API Client) — Talking to the Backend

The `services/` folder contains **Axios wrappers** — functions that call the backend API.

#### `api.js` — Base Configuration
Creates an Axios instance with:
- **Base URL:** `http://localhost:8000/api/v1` (from config)
- **Request interceptor:** Automatically attaches `Authorization: Bearer <token>` header to every request
- **Response interceptor:** Catches 401 errors → tries to refresh the token → retries the request

#### API Modules
| Module | Calls |
|--------|-------|
| `authApi.js` | `POST /auth/admin/login`, `POST /auth/worker/login`, `POST /auth/admin/refresh` |
| `complaintApi.js` | `GET /complaints/{id}`, `PATCH /complaints/{id}/resolve`, `GET /complaints/track/{code}` |
| `workerApi.js` | `GET /workers/me/tasks`, `PATCH /workers/me/tasks/{id}`, `PATCH /workers/me/tasks/{id}/defer` |
| `adminApi.js` | `GET /admin/dashboard/stats`, `GET /admin/triage`, `PATCH /admin/triage/{id}`, `GET /admin/hotspots`, `GET /admin/export` |

---

### Composables — Reusable Logic

Vue 3 composables are **reusable functions** that encapsulate reactive logic.

| Composable | What It Does |
|-----------|-------------|
| `useAuth.js` | Helper computed properties: `isAdmin`, `isWorker`, `isAuthenticated`. Token refresh logic. |
| `useGeolocation.js` | Wraps browser `navigator.geolocation` API. Returns reactive `latitude`, `longitude`, `error`. Used by worker portal. |
| `useCamera.js` | Wraps browser `navigator.mediaDevices` API. Opens camera for resolution photos. Returns captured image. Used by ResolveForm. |

---

## PWA (Progressive Web App) Features

The app is a PWA — it can be "installed" on a device's home screen and works offline.

| Capability | Admin PWA | Worker Mobile PWA |
|-----------|-----------|-------------------|
| **Installable** ("Add to Home Screen") | ✅ | ✅ |
| **Offline fallback** | Basic (show cached pages) | Critical — workers may lose signal |
| **Push notifications** | ✅ | ✅ |
| **Camera access** | ❌ | ✅ (resolution photos) |
| **GPS/Geolocation** | ❌ | ✅ (navigation to complaint) |
| **Responsive layout** | Desktop-first (wide tables, charts) | Mobile-first (cards, large buttons) |

**PWA is configured via:**
- `manifest.json` — App name, icons, theme color, start URL
- Vite PWA Plugin (Workbox) — Service worker for caching and offline support

---

## How Components Compose Into Views

**Admin Dashboard example:**

```
AdminDashboard.vue
├── Navbar.vue (shared)
├── StatsCards.vue
│   └── Displays: Total | Resolved | Pending | Overdue
├── <div class="row">
│   ├── CategoryChart.vue (col-md-6)
│   └── TrendChart.vue (col-md-6)
├── HotspotMap.vue
└── WorkerTable.vue
```

**Worker Task Queue example:**

```
WorkerTaskQueue.vue
├── Navbar.vue (shared, mobile layout)
├── <header> "Today's Tasks (12 of 20)"
└── TaskList.vue
    ├── TaskCard.vue (🔴 URGENT — Pothole)
    ├── TaskCard.vue (🟡 DUE SOON — Garbage, 🔁 Carried Forward)
    ├── TaskCard.vue (🟢 NORMAL — Waterlogging)
    └── ... more TaskCards
```

---

## Key Takeaways from This Document

1. **One Vue 3 codebase** serves both admin dashboard and worker portal via role-based routing.
2. **Views** are full pages. **Components** are reusable building blocks composed inside views.
3. **Router auth guards** enforce role-based access — admins can't access worker views and vice versa.
4. **Pinia stores** hold global state: auth session, dashboard data, worker tasks.
5. **API services** (Axios) handle all backend communication with auto-attached JWT tokens.
6. **Composables** encapsulate reusable logic: auth helpers, geolocation, camera access.
7. **Bootstrap 5** handles responsive layout — admin views use wide grids, worker views use mobile cards.
8. **PWA features** include home screen installation, offline caching, push notifications, camera, and GPS.

---

> **Next:** [09-Background-Tasks.md](09-Background-Tasks.md) — Understand Celery tasks, daily task allocation, and scheduled jobs.
