# 06 — AI/ML Pipeline

> **Reading time:** 10 minutes
> **Prerequisite:** [05-Auth-And-Security.md](05-Auth-And-Security.md)
> **After reading:** You'll understand how image and text classification work, the confidence-based routing, fraud detection gates, and the LLM adapter pattern.

---

## Role of AI/ML in This Project

AI/ML is a **supporting component** — it automates the classification of citizen complaints. It's not the primary learning domain for this project.

> **Your learning priorities are:** DevOps → Cloud → Software Engineering.
> The AI models just need to *work*. Training is done via templated notebooks on Colab.
> The real learning happens in everything *around* the models: containerizing them, serving them via API, deploying them, CI/CD for model updates.

---

## What the AI Does — Two Classifiers

The system has **two independent classifiers**, each handling a different input type:

```
┌─────────────────────────────────────────────────────────────────┐
│                       AI/ML MODULE                              │
│                                                                 │
│   ┌─────────────────────┐       ┌──────────────────────────┐   │
│   │  IMAGE CLASSIFIER   │       │   TEXT CLASSIFIER         │   │
│   │  (MobileNetV2)      │       │   (DistilBERT)            │   │
│   │                     │       │                          │   │
│   │  Input: Photo       │       │  Input: Text description │   │
│   │  Output: Category   │       │  Output: Category        │   │
│   │        + confidence │       │        + confidence      │   │
│   │                     │       │                          │   │
│   │  5 categories:      │       │  5 categories:           │   │
│   │  • Garbage          │       │  • Streetlight/Power     │   │
│   │  • Pothole/Road     │       │  • Water Supply          │   │
│   │  • Waterlogging     │       │  • Encroachment          │   │
	│   │  •              │       │  • Stray Animals         │   │
│   │  •                  │       │  • Admin Delay/Conduct   │   │
│   └─────────────────────┘       └──────────────────────────┘   │
│                                                                 │
│   Trained on: Google Colab (free GPU)                           │
│   Served from: Loaded into FastAPI at startup                   │
│   Framework: TensorFlow / Keras                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Image Classifier — MobileNetV2

### What It Is
MobileNetV2 is a **pre-trained deep learning model** designed for image classification. It was originally trained on ImageNet (millions of images, 1000 categories). We **fine-tune** it — meaning we take the pre-trained model and retrain the final layers to recognize our 5 specific categories.

### Why MobileNetV2
| Property | Value |
|----------|-------|
| **Parameters** | ~3.4 million (lightweight) |
| **Runs on** | CPU — no GPU needed in production |
| **Inference time** | ~100–300ms per image |
| **Pre-trained on** | ImageNet (1000 categories) |
| **Fine-tuned for** | 5 visual civic categories |

### The 5 Image Categories

| Category | Visual Signature | Example |
|----------|-----------------|---------|
| Solid Waste & Garbage | Trash bags, debris, dumps | Garbage pile on street |
| Potholes & Road Damage | Cracked/broken road surface | Large pothole on road |
| Waterlogging & Drainage | Standing water on roads | Flooded street after rain |
| Stray Animals & Pest Control | Dogs, cows, pests visible | Pack of stray dogs |
| Illegal Encroachment | Unauthorized structures/stalls | Hawkers blocking footpath |

### How Training Works (Google Colab)

```
Step 1: Collect dataset
        → ~200-500 images per category (web scraping, manual collection)
        → Store in ml-training/datasets/

Step 2: Open training notebook in Google Colab
        → ml-training/image_classifier_training.ipynb

Step 3: Load MobileNetV2 pre-trained model (3 lines of code)
        → Freeze early layers (general image features)
        → Replace final layer with 5-class output

Step 4: Train on collected dataset
        → ~10-30 epochs, free GPU on Colab
        → ~15-30 minutes

Step 5: Export trained model
        → Save as .h5 file
        → Download to backend/app/ml/models/
```

### How Inference Works (In Production)

```
Citizen sends photo via Telegram
        │
        ▼
FastAPI receives image
        │
        ▼
Dispatches Celery task: classify_image
        │
        ▼
Celery Worker:
  1. Load image, resize to 224x224 pixels
  2. Normalize pixel values (0-1 range)
  3. Run MobileNetV2.predict(image)
  4. Get: {category: "Garbage", confidence: 0.92}
  5. Return result
        │
        ▼
Result sent back to citizen via Telegram Bot API
```

---

## Text Classifier — DistilBERT

### What It Is
DistilBERT is a **lighter, faster version of BERT** — a language understanding model. It understands the *meaning* of text, not just keywords. We fine-tune it to classify citizen descriptions into 5 text categories.

### Why DistilBERT
| Property | Value |
|----------|-------|
| **Parameters** | ~66 million |
| **Speed** | 60% faster than full BERT |
| **Pre-trained on** | English text corpus |
| **Fine-tuned for** | 5 text civic categories |
| **Inference time** | ~50–200ms per text |

### The 5 Text Categories

| Category | Example Input |
|----------|--------------|
| Streetlight & Power Outage | "Streetlights not working on MG Road since 3 days" |
| Water Supply & Contamination | "No water supply since morning, the water is yellow" |
| Illegal Encroachment | "Hawkers blocking the entire footpath near station" |
| Stray Animals & Pest Control | "Aggressive stray dogs roaming near school entrance" |
| Administrative Delay & Conduct | "Bribe demanded at ward office for simple certificate" |

### How Training Works (Google Colab)

```
Step 1: Collect dataset
        → ~300-500 text samples per category
        → Synthetically generate + manually curate

Step 2: Open training notebook in Google Colab
        → ml-training/text_classifier_training.ipynb

Step 3: Load DistilBERT from Hugging Face
        → Add classification head (5-class output)

Step 4: Train on collected dataset
        → ~3-5 epochs, Colab GPU
        → ~10-20 minutes

Step 5: Export trained model
        → Save model directory
        → Download to backend/app/ml/models/
```

### How Text Classification Differs from Image Classification

| Aspect | Image Classification | Text Classification |
|--------|---------------------|-------------------|
| **When it runs** | During Telegram conversation (inline) | After complaint submission (post-submission) |
| **Why the difference** | Citizen gets immediate feedback on what the system "sees" | Text classification is fast and deterministic — inline feedback is unnecessary |
| **User experience** | Bot says "Analyzing your image…" → shows result | Citizen submits complaint → classification happens silently → category shown in confirmation |

---

## Confidence-Based Routing

The AI doesn't always get it right. The system uses **confidence thresholds** to decide what to do:

```
AI classifies complaint
        │
        ▼
What is the confidence score?
        │
        ├── ≥ 70%  ───────► AUTO-CLASSIFY
        │                    Route to correct department
        │                    Assign to nearest worker
        │                    Normal flow continues
        │
        ├── 50% – 69% ────► TRIAGE QUEUE
        │                    Complaint is classified BUT flagged
        │                    Admin reviews and can override
        │                    Classification shown as "low confidence"
        │
        └── < 50% ────────► AUTO-REJECT (image only)
                             Image is likely irrelevant
                             Citizen gets: "We couldn't classify
                             your image. Please try again with
                             a clearer photo."
```

### Configuration (via `.env`)

| Setting | Default | Purpose |
|---------|---------|---------|
| `CLASSIFICATION_CONFIDENCE_THRESHOLD` | 0.70 | Above this → auto-classify |
| `AUTO_REJECT_CONFIDENCE_THRESHOLD` | 0.50 | Below this → reject/retry |

---

## Fraud Detection Pipeline (3-Gate System)

Before any image enters the classification pipeline, it passes through fraud detection gates:

### Gate 1 — Unsafe Content (NSFW) Check

```
Image uploaded
      │
      ▼
opennsfw2 library analyzes image
      │
      ├── Safe ──────► Proceed to Gate 2
      │
      └── Unsafe ────► BLOCK immediately
                       Citizen gets polite rejection message
                       Complaint is NOT created
```

### Gate 2 — Metadata & Integrity Check

Three sub-checks run in parallel:

```
Image passes Gate 1
      │
      ├── EXIF Check ──────── Does the image have camera metadata?
      │                        AI-generated images usually lack EXIF data.
      │                        Missing EXIF = suspicious flag
      │
      ├── ELA Analysis ────── Error Level Analysis detects image manipulation
      │   (Error Level         (Photoshop edits, splicing, region modifications)
      │    Analysis)           High ELA variance = suspicious flag
      │
      └── Perceptual Hash ─── Has this exact image been submitted before?
                               Uses imagehash library for fuzzy matching
                               Duplicate = suspicious flag
      │
      ▼
Result: { fraud_risk: "clear" | "suspicious" | "rejected",
          fraud_flags: { exif: true/false, ela: true/false, duplicate: true/false } }
      │
      ├── Clear ──────────► Proceed to Gate 3
      ├── Suspicious ─────► Proceed but flag for admin review (stored in complaint.fraud_flags)
      └── Rejected ───────► Block with explanation
```

### Gate 3 — AI Classification Confidence

The MobileNetV2 classifier runs and its confidence score determines routing (see Confidence-Based Routing above).

---

## Classification Flow — Complete Picture

```
Citizen sends complaint
        │
        ├── Has image? ──────────────────────────┐
        │                                        │
        │   YES                                  │   NO (text only)
        │                                        │
        ▼                                        ▼
  During Telegram conversation:            After submission:
        │                                        │
  Gate 1: NSFW check                       DistilBERT classifies text
        │                                        │
  Gate 2: EXIF + ELA + Hash                ├── Confidence ≥ 70%
        │                                  │   → Auto-classify + route
  Gate 3: MobileNetV2 classifies           │
        │                                  ├── Confidence 50–69%
  Bot tells citizen:                       │   → Triage queue
  "Classified as: X"                       │
        │                                  └── Confidence < 50%
  Citizen provides location                    → Triage queue
  + description + confirms                     (text is never auto-rejected
        │                                       unlike images)
  Complaint submitted
        │
  Confidence ≥ 70%? → Auto-route
  Confidence < 70%? → Triage queue
```

---

## LLM Adapter Pattern (Optional / Future)

The system is designed to optionally use a Large Language Model for enhanced features like:
- **Smart summaries** — Auto-generate concise one-line descriptions from rambling citizen text
- **Urgency scoring** — Detect safety-critical issues ("exposed electric wire near school")
- **Multilingual support** — Understand complaints in Hindi, Marathi, Tamil

### How It's Designed — Adapter Pattern

```python
# Abstract interface — the rest of the app only talks to this
class LLMProvider(ABC):
    @abstractmethod
    async def summarize(self, text: str) -> str: ...

    @abstractmethod
    async def assess_urgency(self, text: str) -> UrgencyScore: ...

# Concrete implementations — swap freely
class GroqProvider(LLMProvider):        # Free cloud API (Groq)
class GeminiProvider(LLMProvider):      # Google Gemini free tier
class LocalOllamaProvider(LLMProvider): # Local model via Ollama
class MockProvider(LLMProvider):        # For testing — returns canned responses
```

**Key benefit:** Change one environment variable → switch LLM providers. The rest of the code doesn't know or care which LLM is behind the interface.

> **Note:** The LLM adapter is **optional**. The core classification pipeline (MobileNetV2 + DistilBERT) works perfectly without any LLM.

---

## Where AI/ML Code Lives

```
backend/app/ml/
├── image_classifier.py      ← MobileNetV2 inference logic
├── text_classifier.py       ← DistilBERT inference logic
├── llm_adapter.py           ← Abstract LLM interface
├── providers/
│   ├── base.py              ← Abstract base class (LLMProvider)
│   ├── groq_provider.py     ← Groq free API implementation
│   ├── gemini_provider.py   ← Google Gemini implementation
│   └── local_provider.py    ← Ollama / local model implementation
└── models/                  ← Saved model weights (.h5 files, model dirs)

ml-training/
├── image_classifier_training.ipynb   ← Colab notebook for image model
├── text_classifier_training.ipynb    ← Colab notebook for text model
├── datasets/                         ← Training data
└── README.md
```

---

## Key Takeaways from This Document

1. **Two classifiers:** MobileNetV2 for images (5 categories), DistilBERT for text (5 categories).
2. **Image classification happens inline** (during Telegram chat) — citizen gets immediate feedback.
3. **Text classification happens post-submission** — it's fast enough to not need inline feedback.
4. **Confidence ≥ 70%** → auto-classify. **50–69%** → triage queue. **< 50%** → reject/retry (images only).
5. **3-gate fraud pipeline:** NSFW check → EXIF/ELA/Hash → classification confidence.
6. Models are **trained on Google Colab** (free GPU) and **served from FastAPI** (loaded at startup).
7. The **LLM adapter** is optional — designed with an abstract interface for easy provider swapping.
8. AI is a **supporting feature**, not the learning focus. The real value is in the infrastructure around it.

---

> **Next:** [07-Backend-Deep-Dive.md](07-Backend-Deep-Dive.md) — Understand the backend folder structure, every module, and its responsibility.
