# 04 — Tech Stack & Why

> **Reading time:** 8 minutes
> **Prerequisite:** [03-System-Architecture.md](03-System-Architecture.md)
> **After reading:** You'll know every technology in the project and exactly why it was chosen over alternatives.

---

## Tech Stack at a Glance

| Layer | Technologies |
|-------|-------------|
| **Backend** | Python 3.11+, FastAPI, SQLAlchemy 2.0, Alembic, Celery, Redis |
| **Frontend** | Vue 3 (Composition API), Bootstrap 5, Vite, Pinia, Chart.js, Leaflet |
| **AI/ML** | MobileNetV2, DistilBERT, TensorFlow/Keras, Google Colab |
| **Database** | PostgreSQL 16 + PostGIS |
| **Infrastructure** | Docker, Docker Compose, GitHub Actions, Nginx |
| **Cloud** | AWS EC2 (Free Tier), S3, SSM |

---

## Backend Technologies

### Python 3.11+
| | |
|-|-|
| **What it is** | The programming language for the entire backend. |
| **Why Python** | Gentlest learning curve for beginners. Only language where backend + AI/ML work in the same ecosystem — no language switching. |
| **Why not Node.js** | Node.js requires JavaScript/TypeScript, which adds context switching with the Python ML stack. Python is the industry standard for ML-integrated backends. |

### FastAPI
| | |
|-|-|
| **What it is** | The web framework that handles all HTTP requests and serves the API. |
| **Why FastAPI** | Modern, async, auto-generates interactive API documentation (Swagger UI at `/docs`), type-safe with Pydantic, extremely beginner-readable. |
| **Why not Django** | Django is a full "batteries-included" framework — too heavy for an API-only backend. It forces you into Django's ORM, admin panel, and templating. |
| **Why not Flask** | Flask is too minimal — you'd have to manually set up validation, async support, API docs, and type hints. FastAPI gives you all of this for free. |

### SQLAlchemy 2.0 + Alembic
| | |
|-|-|
| **What it is** | SQLAlchemy is the ORM (Object-Relational Mapper) — it lets you interact with the database using Python classes instead of raw SQL. Alembic manages database migrations (versioned schema changes). |
| **Why SQLAlchemy** | Industry-standard Python ORM. Version 2.0 has modern async support. Prevents SQL injection by default (parameterized queries). |
| **Why Alembic** | When you change your database schema (e.g., add a column), Alembic creates migration scripts that can be applied to any database. Essential for team development. |

### Celery + Redis (Task Queue)
| | |
|-|-|
| **What it is** | Celery is a background task queue. Redis is its message broker (carries messages) and result backend (stores results). |
| **Why a task queue** | Some work is too slow for a real-time API response: AI image classification (3–10 seconds), sending Telegram notifications, checking SLA deadlines. These run in the background. |
| **Why Redis (not RabbitMQ)** | Redis is simpler, already needed for session storage and caching. One tool, three jobs. RabbitMQ is more powerful but adds unnecessary complexity. |

### passlib + python-jose (Authentication)
| | |
|-|-|
| **What it is** | `passlib` handles password/PIN hashing (bcrypt). `python-jose` handles JWT token creation and validation. |
| **Why bcrypt** | Industry standard for password hashing. Slow by design — makes brute-force attacks impractical. |
| **Why JWT** | Stateless authentication. The server doesn't need to store sessions in a database. The token itself contains the user's identity and role. |

### slowapi (Rate Limiting)
| | |
|-|-|
| **What it is** | Limits how many requests a user can make in a time window (e.g., 3 login attempts per minute). |
| **Why needed** | Prevents brute-force attacks on login endpoints. Especially critical for worker PINs (only 10,000 possible combinations). |

---

## Frontend Technologies

### Vue 3 (Composition API)
| | |
|-|-|
| **What it is** | A JavaScript framework for building user interfaces. The Composition API (`<script setup>`) is Vue 3's modern approach to writing components. |
| **Why Vue 3** | Intuitive template syntax, reactive state primitives (`ref`, `reactive`), single-file components (`.vue`). One codebase serves both the admin dashboard and worker portal. |
| **Why not React** | React requires more boilerplate (JSX, hooks patterns, state management setup). Vue's single-file components are more beginner-friendly. |

### Bootstrap 5
| | |
|-|-|
| **What it is** | A CSS framework with prebuilt UI components (cards, badges, modals, alerts) and a responsive 12-column grid. |
| **Why Bootstrap** | Rapid development — responsive layout without writing custom CSS from scratch. Cards, tables, badges, modals are all ready to use. |
| **Why not Tailwind CSS** | Tailwind requires learning a utility-first paradigm. Bootstrap provides ready-made components that look good immediately. |

### Vite
| | |
|-|-|
| **What it is** | A build tool and dev server for the frontend. Created by the same person who created Vue. |
| **Why Vite** | Lightning-fast dev server (sub-millisecond hot module replacement), official Vue 3 tooling, optimized production builds via Rollup. |

### Pinia
| | |
|-|-|
| **What it is** | A state management library — stores global data (like the logged-in user, active tasks) that multiple components need to access. |
| **Why Pinia** | Official Vue 3 state manager. Lightweight, modular, fully typed. Replaces Vuex (Vue 2's state manager). |
| **What it stores** | Auth session (JWT token, user role), worker's active tasks, real-time dashboard data. |

### Chart.js + vue-chartjs
| | |
|-|-|
| **What it is** | A charting library for creating bar charts, line charts, pie charts, etc. `vue-chartjs` wraps it for Vue components. |
| **Used for** | Admin dashboard — category breakdown charts, 7-day trend lines, resolution rate charts. |

### Leaflet
| | |
|-|-|
| **What it is** | An open-source JavaScript library for interactive maps. Uses OpenStreetMap tiles (free, no API key needed). |
| **Used for** | Admin hotspot maps (complaint density), worker navigation (complaint locations), complaint location display. |

### Axios
| | |
|-|-|
| **What it is** | An HTTP client for making API calls from the frontend to the backend. |
| **Why Axios** | Clean API for requests, built-in interceptors for attaching JWT tokens to every request and handling token refresh. |

---

## AI/ML Technologies

### MobileNetV2 (Image Classification)
| | |
|-|-|
| **What it is** | A pre-trained deep learning model for image classification. Originally trained on ImageNet (millions of images). We **fine-tune** it for our 5 visual categories. |
| **Why MobileNetV2** | Lightweight (~3.4M parameters), runs on CPU (no GPU needed in production), perfect for 5 visually distinct categories. |
| **Why not EfficientNet-B0** | EfficientNet is slightly more accurate but heavier (~5.3M params). For 5 distinct categories, MobileNetV2's accuracy is sufficient. Swapping is a one-line change if needed. |

### DistilBERT (Text Classification)
| | |
|-|-|
| **What it is** | A lightweight version of BERT — a language understanding model. We fine-tune it to classify citizen text descriptions into our 5 text categories. |
| **Why DistilBERT** | 66M parameters, 60% faster than full BERT, accurate enough for 5-class text classification. |
| **Example** | Input: "Streetlights not working on MG Road since 3 days" → Output: Streetlight & Power Outage (confidence: 87%) |

### TensorFlow / Keras
| | |
|-|-|
| **What it is** | The ML framework used to build and train the models. Keras is TensorFlow's high-level API. |
| **Why TF/Keras** | Simpler API than PyTorch for fine-tuning tasks. Native on Google Colab. Loading MobileNetV2 is literally 3 lines of code. |
| **Why not PyTorch** | PyTorch is equally valid but has a steeper learning curve. Since ML isn't the primary learning focus, simpler wins. |

### Google Colab
| | |
|-|-|
| **What it is** | A free cloud environment with GPU access for running Jupyter notebooks. |
| **Used for** | Training the image classifier (MobileNetV2) and text classifier (DistilBERT). Free GPU eliminates the need for local hardware. |

---

## Database Technologies

### PostgreSQL 16
| | |
|-|-|
| **What it is** | A relational database — the industry gold standard for structured data. |
| **Why PostgreSQL** | Handles relational data, JSON, full-text search, and with PostGIS — geographic queries. Industry-demanded skill. |
| **Why not MongoDB** | PostgreSQL does everything MongoDB does (via JSONB columns) **plus** relational integrity, geographic queries, and is more valued in backend/DevOps roles. |

### PostGIS
| | |
|-|-|
| **What it is** | A PostgreSQL extension that adds geographic/geometric data types and spatial queries. |
| **Why needed** | Enables queries like "find all workers within 5km of this complaint" (`ST_Distance`), "show all complaints in this zone" (`ST_Within`). Essential for worker assignment and hotspot maps. |

### Redis 7
| | |
|-|-|
| **What it is** | An in-memory key-value store. Extremely fast. |
| **3 jobs** | (1) Celery message broker, (2) Telegram bot session storage, (3) Dashboard stats cache. |

### MinIO → AWS S3
| | |
|-|-|
| **What it is** | Object storage for files (photos). MinIO runs locally in Docker. In production, it's replaced by AWS S3. |
| **Why MinIO** | S3-compatible API — your code uses the same `boto3` library for both MinIO and S3. Change one environment variable to switch. |
| **What it stores** | Complaint photos (uploaded by citizens), resolution photos (uploaded by workers). |

---

## Infrastructure Technologies

### Docker + Docker Compose
| | |
|-|-|
| **What it is** | Docker packages each service (backend, database, Redis, MinIO) into isolated containers. Docker Compose orchestrates them all with one command: `docker compose up`. |
| **Why Docker** | Eliminates "it works on my machine" problems. Every team member runs the same environment. Essential DevOps skill. |

### GitHub Actions
| | |
|-|-|
| **What it is** | CI/CD (Continuous Integration / Continuous Deployment) — automatically runs tests, lints code, and builds Docker images on every pull request. |
| **Why GitHub Actions** | Free for public repos. Tightly integrated with GitHub (where the code lives). Industry-standard CI/CD tool. |

### Nginx
| | |
|-|-|
| **What it is** | A reverse proxy and web server. In production, it sits in front of FastAPI and handles: incoming traffic routing, SSL termination, and serving the Vue frontend's static files. |
| **Why Nginx** | Industry standard. Lightweight, fast, reliable. |

### Let's Encrypt + Certbot
| | |
|-|-|
| **What it is** | Free SSL/TLS certificates for HTTPS. Certbot auto-renews them. |
| **Why needed** | Telegram webhooks require HTTPS. Any production web application needs HTTPS for security. |

### AWS EC2 + S3 + SSM
| | |
|-|-|
| **What it is** | EC2 is a virtual server (compute). S3 is file storage. SSM (Systems Manager Parameter Store) is encrypted secret storage. |
| **Why AWS** | 12-month free tier. ~40% industry market share — most job-relevant cloud. |
| **Free tier limits** | EC2 t2.micro: 1 vCPU, 1GB RAM, 750 hrs/month. S3: 5GB. SSM: free for standard parameters. |

---

## Technology Dependencies Map

This shows which technologies depend on each other:

```
Python 3.11+
├── FastAPI (web framework)
│   ├── SQLAlchemy 2.0 (ORM) → PostgreSQL + PostGIS
│   ├── Pydantic (validation) → schemas for API + config
│   ├── python-jose (JWT) → authentication
│   ├── passlib (bcrypt) → password/PIN hashing
│   ├── slowapi → rate limiting
│   ├── boto3 → MinIO / S3 file storage
│   └── python-telegram-bot → Telegram Bot API
├── Celery → Redis (broker) → background tasks
├── TensorFlow/Keras → AI models (MobileNetV2, DistilBERT)
└── Alembic → database migrations

Vue 3
├── Vite (build tool)
├── Bootstrap 5 (styling + components)
├── Pinia (state management)
├── Vue Router 4 (routing + auth guards)
├── Chart.js + vue-chartjs (charts)
├── Leaflet (maps)
└── Axios (HTTP client → talks to FastAPI)

Docker + Docker Compose → orchestrates all services
GitHub Actions → CI/CD pipeline
Nginx → reverse proxy (production)
```

---

## Key Takeaways from This Document

1. **Python** is the single language for backend + AI/ML — no language switching.
2. **FastAPI** was chosen over Django (too heavy) and Flask (too minimal) for its modern auto-docs and async support.
3. **Vue 3 + Bootstrap 5** is the frontend stack — one codebase for admin dashboard + worker portal.
4. **PostgreSQL + PostGIS** handles both relational data and geographic queries.
5. **Redis** does 3 jobs: Celery broker, bot sessions, dashboard cache.
6. **MinIO** mirrors S3 locally — swap to real S3 with one env variable change.
7. **MobileNetV2** (images) and **DistilBERT** (text) are the AI classifiers — trained on free Google Colab.
8. Everything runs on **free tiers** — Docker locally, AWS free tier in production.

---

> **Next:** [05-Database-Design.md](05-Database-Design.md) — Understand the data model — all tables, fields, and relationships.
