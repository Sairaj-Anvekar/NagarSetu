# 01 — Project Vision & Problem Statement

> **Reading time:** 5 minutes
> **Prerequisite:** None — this is where you start.
> **After reading:** You'll understand what this project is, why it exists, and what problem it solves.

---

## The Problem

In Indian cities, civic issues like **overflowing garbage, potholes, waterlogged streets, broken streetlights, contaminated water, stray animals, and illegal encroachments** affect millions of people daily.

The current systems for reporting these problems are fundamentally broken:

### For Citizens
- You have to **physically visit a ward office** and stand in queues to file a complaint.
- Most people simply give up — the friction is too high.
- The complaints that *are* filed get **lost in paperwork**.
- There is **no tracking** — you have no idea if anyone is even looking at your complaint.
- There is **no transparency** — you never hear back.

### For Municipal Workers
- Workers receive task assignments with **vague descriptions** and **no location data**.
- They waste time trying to find the exact problem location.
- There's **no priority system** — a critical sewage overflow sits equally next to a minor paint chip.
- Tasks get lost or forgotten across shifts.

### For Government Administrators
- Administrators have **zero visibility** into what's happening across the city.
- They can't see which areas have the most complaints, which categories are surging, or which workers are overloaded.
- All decisions are based on **guesswork**, not data.
- There's **no accountability** — no SLA deadlines, no performance tracking.

### The Result
Citizens lose trust. Problems fester. Municipal bodies look incompetent — even when individual workers are trying their best.

---

## Our Solution

A **Smart Civic Grievance Platform** that makes it:
- **Effortless** for a citizen to report a problem
- **Intelligent** for the government to resolve it

The platform connects **three types of users** through one unified system:

| User | How They Use It | What They Get |
|------|----------------|---------------|
| 🧑‍🤝‍🧑 **Citizen** | Telegram Bot (messaging) | Report a problem in 30 seconds — photo + location + description. Track status anytime. |
| 👷 **Field Worker** | Mobile Web App (PWA) | A prioritized daily task queue with photos, descriptions, exact GPS navigation, and easy resolution submission. |
| 🏛️ **Administrator** | Web Dashboard (PWA) | Real-time analytics, category breakdowns, geographic hotspot maps, worker performance, and manual triage. |

---

## What Makes It "Smart"

This isn't just a digital complaint form. The platform has a **built-in AI layer** that automates the tedious parts:

1. **Image Recognition** — Citizen sends a photo of garbage → the system automatically knows it's garbage. No human classification needed.
2. **Text Understanding** — Citizen types "streetlights not working on MG Road" → the system classifies it as a streetlight issue.
3. **Automatic Department Routing** — Based on the classification, the complaint goes to the right department (e.g., garbage → Solid Waste Management).
4. **Smart Worker Assignment** — The system finds the nearest worker in the complaint's zone and adds it to their daily task queue.
5. **Priority Scoring** — A weighted scoring algorithm ensures critical and overdue complaints are handled first.
6. **Confidence Safety Net** — When the AI isn't confident (below 70%), the complaint goes to a human admin for manual classification.

---

## The Eight Complaint Categories

The platform handles **8 types** of civic issues, split into two groups based on how the AI classifies them:

### 📸 Image-Based Categories (5 categories — classified from photos)

| Category | Example | Responsible Department | Resolution Target |
|----------|---------|----------------------|-------------------|
| Solid Waste & Garbage | Garbage dump on street | Solid Waste Management | 24–48 hours |
| Potholes & Road Damage | Large pothole on road | Roads & Public Works | 48–72 hours |
| Waterlogging & Drainage | Flooded road after rain | Stormwater & Drainage | 24 hours |
| Stray Animals & Pest Control | Stray dogs near school | Public Health & Veterinary | 48 hours |
| Illegal Encroachment | Hawkers blocking footpath | Town Planning & Encroachment | 5–7 days |

### 📝 Text-Based Categories (5 categories — classified from descriptions)

| Category | Example Description | Responsible Department | Resolution Target |
|----------|-------------------|----------------------|-------------------|
| Streetlight & Power Outage | "Streetlights not working on MG Road" | Municipal Electrical Wing | 24–48 hours |
| Water Supply & Contamination | "No water supply since morning" | Water Supply Board | 24 hours |
| Illegal Encroachment | "Hawkers blocking the footpath" | Town Planning & Encroachment | 5–7 days |
| Stray Animals & Pest Control | "Aggressive stray dogs near school" | Public Health & Veterinary | 48 hours |
| Administrative Delay & Conduct | "Bribe demanded at ward office" | Vigilance & Grievance Cell | 7 days |

> **Note:** Illegal Encroachment and Stray Animals appear in both lists — they can be identified from either a photo or a text description.

### Fallback — When the AI Isn't Sure
If the AI's confidence is **below 70%**, the complaint is tagged as **"Unclassified"** and sent to a **manual triage queue** for an admin to review and assign the correct category.

Each category has a **defined SLA (Service Level Agreement)** — a resolution deadline. If a complaint isn't resolved within its SLA, it's automatically flagged as **overdue**.

---

## What Makes This Different from Traditional Systems

| Traditional System | Our Platform |
|-------------------|-------------|
| Visit a government office | Report from Telegram in 30 seconds |
| Paper forms, manual classification | AI auto-classifies from photo or text |
| No tracking, no transparency | Real-time status tracking via chat |
| Manual worker dispatch | Automatic assignment to nearest worker |
| No proof of resolution | Resolution photo sent to citizen |
| No data, no analytics | Live dashboard with trends & hotspots |
| Complaints lost in the system | SLA deadlines with automatic escalation |
| One-size-fits-all | 8 categories routed to the right department |

---

## Project Context

| Aspect | Detail |
|--------|--------|
| **Type** | College semester project |
| **Team size** | 3 members |
| **Timeline** | ~10 weeks (60–70 days) |
| **Budget** | Zero — everything runs on free tiers |
| **Primary learning goal** | Cloud/DevOps through building a real project |
| **Approach** | Treated as a real industry project, not a toy prototype |

---

## Key Takeaways from This Document

1. The project solves a **real civic problem** — broken complaint systems in Indian cities.
2. There are **3 user types**: Citizens (Telegram), Workers (Mobile PWA), Admins (Web Dashboard).
3. The platform is **"smart"** because of AI-powered auto-classification, routing, and priority scoring.
4. There are **8 complaint categories**, each with an SLA deadline and a responsible department.
5. The project is a **college project for 3 team members**, built on free-tier tools over 10 weeks.

---

> **Next:** [02-Users-And-Journeys.md](02-Users-And-Journeys.md) — Understand exactly how each user type interacts with the system.
