# 11 — Data Flow — End to End

> **Reading time:** 10 minutes
> **Prerequisite:** [10-Infrastructure-DevOps.md](10-Infrastructure-DevOps.md)
> **After reading:** You'll understand the complete journey of a complaint — from the moment a citizen reports it to the moment it's resolved and the citizen is notified.

---

## Why This Document Exists

Previous documents explained each component individually. This document ties them all together by tracing **one complaint** through the entire system, showing which component handles each step.

---

## The Complete Journey of a Complaint

We'll follow a specific example:

> **Citizen Priya** sees a large garbage dump near a bus stop. She opens the Telegram bot to report it.

---

### Phase 1: Citizen Reports the Complaint

```
WHAT HAPPENS                          WHERE IT HAPPENS
──────────────                        ────────────────

Priya opens the Telegram bot          Telegram App (her phone)
and sends /report
         │
         ▼
Telegram forwards the message         Telegram Servers → 
to our webhook endpoint               POST /api/v1/webhook/telegram
         │
         ▼
FastAPI receives the webhook          Backend: api/v1/telegram.py
  → Verifies webhook secret token     Backend: middleware
  → Extracts chat_id from message     
  → Checks if citizen exists          Backend: services/complaint_service.py
    (if not, creates citizen record)   Database: citizen table
  → Creates a new Redis session       Backend: services/session_service.py
    state = AWAITING_IMAGE             Redis: telegram:{chat_id}:session
         │
         ▼
Bot replies: "📸 Please send          Backend → Telegram Bot API
a photo of the issue"
         │
         ▼
Priya takes a photo and sends it      Telegram App (her phone)
         │
         ▼
Telegram forwards the photo           POST /api/v1/webhook/telegram
         │
         ▼
FastAPI receives the photo            Backend: api/v1/telegram.py
  → Downloads photo from Telegram     Backend: via Telegram Bot API
  → Uploads to MinIO/S3               Backend: utils/storage.py
    (gets image_url back)              MinIO/S3: grievance-uploads bucket
  → Updates session: image_url set    Redis: session updated
  → Dispatches Celery task:           Redis: Celery message queue
    classify_complaint(image_url)
  → Stores task_id in session         Redis: session updated
  → Session state = AWAITING_         
    CLASSIFICATION                    
         │
         ▼
Bot replies: "📷 Analyzing            Backend → Telegram Bot API
your image…"
```

---

### Phase 2: AI Classification (Background)

```
WHAT HAPPENS                          WHERE IT HAPPENS
──────────────                        ────────────────

Celery Worker picks up the            Celery Worker process
classify_complaint task
         │
         ▼
Gate 1: NSFW Check                    Backend: services/fraud_detection_service.py
  → opennsfw2 analyzes image          (using opennsfw2 library)
  → Result: SAFE ✅
         │
         ▼
Gate 2: Metadata & Integrity          Backend: utils/image_protection.py
  → EXIF check: metadata present ✅   
  → ELA analysis: no manipulation ✅  
  → Hash check: not a duplicate ✅    
  → fraud_risk = "clear"
         │
         ▼
Gate 3: MobileNetV2 Classification    Backend: ml/image_classifier.py
  → Load and preprocess image         
  → model.predict(image)              
  → Result: {                         
      category: "Solid Waste &        
        Garbage",                     
      confidence: 0.92                
    }                                 
         │
         ▼
Confidence ≥ 70%? → YES (92%)        Backend: services/classification_service.py
  → Auto-classify                     
  → Map category → department:        Backend: services/routing_service.py
    "Solid Waste Management"          
  → Calculate SLA deadline:           Backend: services/sla_service.py
    48 hours from now                 
         │
         ▼
Celery Worker sends result            Celery Worker → Telegram Bot API
to Priya via Telegram:                
"Your image has been classified       
as: 🗑️ Solid Waste & Garbage"        
         │
         ▼
Update session state =                Redis: session updated
AWAITING_LOCATION
```

---

### Phase 3: Citizen Provides Location & Description

```
WHAT HAPPENS                          WHERE IT HAPPENS
──────────────                        ────────────────

Bot asks: "📍 Please share            Backend → Telegram Bot API
your location"
         │
         ▼
Priya taps the location button        Telegram App
in Telegram → shares GPS
  → latitude: 19.0760
  → longitude: 72.8777
         │
         ▼
FastAPI receives location             Backend: api/v1/telegram.py
  → Stores in session                 Redis: session updated
  → Session state = AWAITING_         
    DESCRIPTION                       
         │
         ▼
Bot asks: "📝 Please describe         Backend → Telegram Bot API
the issue briefly"
         │
         ▼
Priya types: "Large garbage           Telegram App
dump near Andheri bus stop,
smelling very bad"
         │
         ▼
FastAPI receives description          Backend: api/v1/telegram.py
  → Stores in session                 Redis: session updated
  → Session state = AWAITING_         
    CONFIRMATION                      
         │
         ▼
Bot shows summary and asks            Backend → Telegram Bot API
for confirmation:
"📋 Category: Solid Waste & Garbage
 📍 Location: 19.0760° N, 72.8777° E
 📝 Large garbage dump near bus stop
 Reply ✅ to confirm or ❌ to cancel"
         │
         ▼
Priya replies ✅                       Telegram App
```

---

### Phase 4: Complaint is Formally Created

```
WHAT HAPPENS                          WHERE IT HAPPENS
──────────────                        ────────────────

FastAPI receives confirmation         Backend: api/v1/telegram.py
         │
         ▼
Create complaint record:              Backend: services/complaint_service.py
  → Generate tracking code:           Backend: utils/tracking_code.py
    "GRV-2026-A7X3"                  
  → Insert into database:             Database: complaint table
    {                                 
      tracking_code: "GRV-2026-A7X3",
      citizen_id: priya's UUID,       
      category: "Solid Waste...",     
      department: "Solid Waste Mgmt", 
      description: "Large garbage..", 
      image_url: "s3://...",          
      latitude: 19.0760,             
      longitude: 72.8777,            
      location: PostGIS POINT(...),   
      status: "classified",          
      ai_confidence: 0.92,           
      ai_classification_source: "image",
      priority: "medium",            
      sla_deadline: +48 hours,       
    }                                 
  → Create complaint_log entry:       Database: complaint_log table
    action="submitted",               
    performed_by="system"             
  → Create another log entry:         
    action="classified",              
    details="AI: Garbage, 92%"        
         │
         ▼
Delete Redis session                  Redis: session deleted
(conversation complete)
         │
         ▼
Bot replies to Priya:                 Backend → Telegram Bot API
"✅ Your complaint has been
registered!
Tracking code: GRV-2026-A7X3
Category: Solid Waste & Garbage
You'll receive updates as your
complaint progresses."
```

---

### Phase 5: Worker Assignment (Next Morning)

```
WHAT HAPPENS                          WHERE IT HAPPENS
──────────────                        ────────────────

06:00 AM — Celery Beat triggers       Celery Beat → Celery Worker
allocate_daily_tasks
         │
         ▼
For Worker Ramesh (Zone A):           Backend: services/task_allocation_service.py
  → Query all unresolved complaints   Database: PostGIS query
    in Ramesh's zone                   ST_Within(complaint.location,
  → Found 28 complaints                         ramesh.assigned_zone)
    (including Priya's garbage)
         │
         ▼
Score each complaint:                 Backend: services/task_allocation_service.py
  Priya's garbage complaint:
    Priority(MEDIUM=0.5) × 0.40 = 0.20
    Elapsed(12hrs/48hrs) × 0.35  = 0.0875
    Queue Position(0.85) × 0.15  = 0.1275
    Carry-forward(No=0)  × 0.10  = 0.00
    ─────────────────────────────
    Total Score = 0.415
         │
         ▼
Sort all 28 by score descending      
Take top 20                           
Priya's complaint is #14              
         │
         ▼
Assign to Ramesh:                     Database: complaint table
  → assigned_worker_id = ramesh.id     UPDATE complaint
  → status = "assigned"                SET assigned_worker_id, status
  → Create complaint_log entry:       Database: complaint_log table
    action="assigned",                
    performed_by="system",            
    details="Assigned to Ramesh"      
```

---

### Phase 6: Worker Resolves the Complaint

```
WHAT HAPPENS                          WHERE IT HAPPENS
──────────────                        ────────────────

Ramesh opens Mobile PWA               Worker's phone browser
  → Logs in: phone + PIN              
  → POST /auth/worker/login           Backend: api/v1/auth.py
  → Receives JWT (24h)                Backend: services/auth_service.py
         │
         ▼
Ramesh sees task queue                 
  → GET /workers/me/tasks             Backend: api/v1/workers.py
  → Backend checks JWT: role=worker,  Backend: api/deps.py
    zone=zone-A ✅                    
  → Returns 20 tasks sorted by        Database: query worker's tasks
    priority score                    
         │
         ▼
Ramesh taps Priya's complaint         Frontend: WorkerTaskDetail.vue
  → Sees photo, description,         
    location, urgency badge           
  → Taps "Get Directions"             → Opens phone navigation app
         │
         ▼
Ramesh arrives at the garbage dump    Real world!
  → Cleans the area
         │
         ▼
Ramesh taps "Resolve"                 Frontend: ResolveForm.vue
  → Takes resolution photo             useCamera.js composable
  → Types note: "Area cleaned"        
  → Submits                           
         │
         ▼
PATCH /api/v1/complaints/{id}/resolve Backend: api/v1/complaints.py
  → Validates JWT ✅                   Backend: api/deps.py
  → Validates complaint belongs        Backend: services/complaint_service.py
    to this worker ✅                 
  → Upload resolution photo            Backend: utils/storage.py → MinIO/S3
  → Update complaint:                  Database: complaint table
    status="resolved"                 
    resolved_at=now                   
    resolution_image_url="s3://..."   
  → Create complaint_log:              Database: complaint_log table
    action="resolved",                
    performed_by="worker:ramesh",     
    details="Area cleaned"            
  → Dispatch Celery task:              Redis → Celery queue
    send_notification(                
      citizen_id=priya.id,            
      type="resolved",               
      photo_url=resolution_url        
    )                                 
         │
         ▼
Return 200 OK to Ramesh               Frontend updates task list
```

---

### Phase 7: Citizen Gets Notified

```
WHAT HAPPENS                          WHERE IT HAPPENS
──────────────                        ────────────────

Celery Worker picks up                Celery Worker process
send_notification task
         │
         ▼
  → Look up Priya's chat_id           Database: citizen table
  → Compose message                   Backend: services/notification_service.py
  → Send via Telegram Bot API:        
    "✅ Your complaint GRV-2026-A7X3  Telegram Bot API
    has been resolved!                
    Note: Area cleaned                
    [Resolution Photo]"              
         │
         ▼
Priya receives notification           Priya's phone (Telegram)
  → Sees the resolution photo         
  → Sees the worker's note            
  → Knows the problem was fixed ✅   
```

---

### Phase 8: Dashboard Updates

```
WHAT HAPPENS                          WHERE IT HAPPENS
──────────────                        ────────────────

Admin opens dashboard                 Admin's desktop browser
  → GET /admin/dashboard/stats        Backend: api/v1/admin.py
         │
         ▼
Backend queries latest stats:         Database: aggregate queries
  → Total complaints: 848 (+1)        
  → Resolved today: 24 (+1)           
  → Pending: 61 (-1)                  
  → Avg resolution time: 14.2 hrs     
         │
         ▼
Dashboard displays:                   Frontend: AdminDashboard.vue
  → Updated metrics                   → StatsCards.vue
  → Updated category chart            → CategoryChart.vue
  → Complaint location on map         → HotspotMap.vue (Leaflet)
  → Ramesh's stats: 15/20 resolved    → WorkerTable.vue
```

---

## Summary: The Complete Data Flow

```
Priya                Telegram        FastAPI          Redis           Celery          PostgreSQL      MinIO/S3
─────                ────────        ───────          ─────           ──────          ──────────      ────────
  │                                                                                    
  ├─ /report ──────►│                                                                  
  │                 ├──── webhook ──►│                                                  
  │                 │                ├─ create session ─►│                               
  │◄── "Send photo" ◄──────────────┤                    │                               
  │                                                                                    
  ├─ [Photo] ──────►│                                                                  
  │                 ├──── webhook ──►│                                                  
  │                 │                ├─ upload photo ───────────────────────────────►│  
  │                 │                ├─ dispatch task ──►│──── classify ──►│            
  │                 │                │                    │                 │            
  │                 │                │                    │   MobileNetV2   │            
  │                 │                │                    │   → "Garbage"   │            
  │◄── "Classified: ◄──────────────────────────────────────────────────┤             
  │     Garbage"                                                                       
  │                                                                                    
  ├─ [Location] ──►│──── webhook ──►│                                                  
  ├─ [Description]─►│──── webhook ──►│                                                  
  ├─ [Confirm ✅] ──►│──── webhook ──►│                                                  
  │                 │                ├─ CREATE complaint ───────────────►│              
  │                 │                ├─ delete session ─►│               │              
  │◄── "Registered! ◄──────────────┤                                   │              
  │     GRV-A7X3"                                                                      
  │                                                                                    
  │                               (Next morning, 06:00)                                
  │                                  │                    │──── allocate ─►│            
  │                                  │                    │     tasks       │            
  │                                  │                    │                 │──► UPDATE 
  │                                  │                    │                 │   assigned
  │                                                                                    
  │                               (Ramesh resolves)                                    
  │                                  │                                     │            
  │                                  ├─ upload resolution ─────────────────────────►│  
  │                                  ├─ UPDATE resolved ──────────────────►│         │  
  │                                  ├─ dispatch notify ──►│                          
  │                                  │                     │──── send ────►│            
  │◄── "Resolved! ◄──────────────────────────────────────────────────┤             
  │     + photo"                                                                       
  │                                                                                    
  ✅ DONE                                                                              
```

---

## Key Takeaways from This Document

1. A complaint touches **all 6 components**: Telegram, FastAPI, Redis, Celery, PostgreSQL, MinIO/S3.
2. The **Telegram webhook** is the entry point for all citizen interactions.
3. **Redis** holds conversation state during the complaint flow and acts as the Celery message broker.
4. **AI classification happens asynchronously** via Celery — FastAPI doesn't block waiting for it.
5. **Worker assignment happens on a schedule** (daily at shift start) — not immediately after submission.
6. **Resolution triggers a chain**: update DB → dispatch notification → Celery sends Telegram message to citizen.
7. The **admin dashboard reflects changes in real-time** via fresh database queries.
8. The entire flow is **audited** in the `complaint_log` table — every action is recorded.

---

> **Next:** [12-Development-Roadmap.md](12-Development-Roadmap.md) — The order in which to build everything, phase by phase.
