# AI Use Guidelines — Smart Grievance System

> **Purpose:** This document defines how the team uses AI coding assistants during development and how AI/ML operates within the project itself.
>
> **Applies to:** All 3 team members (Sairaj, Sufiyan, Tushar)
>
> **Core philosophy:** This project is **AI-assisted, not AI-driven**. The project is built BY the team WITH AI assistance. AI doesn't replace understanding, learning, or ownership.

---

## Part 1 — Rules for Using AI Coding Assistants During Development

These rules apply whenever any team member uses **Gemini, Copilot, ChatGPT, or any other AI coding assistant** while working on this project.

---

### Rule 1: Understand Before You Code

> **Don't blindly accept or copy-paste AI-generated code.**
> Read it. Understand it. Only then use it.

**What this means in practice:**
- When AI generates a function, read every line before putting it in your codebase.
- If you don't understand what a line does → **ask the AI to explain that specific line**.
- If the AI uses a library, pattern, or concept you haven't seen → **learn what it is first**.
- Never add code you can't explain to a teammate.

**Why this matters:**
- Blind copy-paste creates code nobody can debug.
- During a demo or viva, you'll be asked to explain your code. "AI wrote it" is not an answer.
- Bugs in AI-generated code are YOUR bugs. You can only fix them if you understand the code.

**Example — Do this:**
```
You: "Write a function to hash a password using bcrypt"
AI:  [generates function]
You: *reads every line*
You: "Why did you use 12 rounds? What does gensalt do?"
AI:  [explains]
You: *now understands, adds to codebase*
```

**Not this:**
```
You: "Write the entire auth service"
AI:  [generates 200 lines]
You: *pastes into auth_service.py without reading*
```

---

### Rule 2: Use AI as a Learning Tool, Not a Shortcut

> **Ask AI to explain concepts, not just generate code.**
> Learn from the output, don't just consume it.

**What this means in practice:**
- Before asking "write the code for X," ask "**explain how X works**."
- After AI generates code, ask "**explain why you did it this way and not another way**."
- Use AI to understand error messages, design patterns, and unfamiliar libraries.
- Treat AI as a **tutor**, not a contractor.

**What to ask AI:**
| Instead of | Ask this first |
|-----------|---------------|
| "Write the JWT auth middleware" | "Explain how JWT authentication works step by step" |
| "Write the Alembic migration" | "What is a database migration and why do we need one?" |
| "Write the Docker Compose file" | "Explain what each section of a Docker Compose file does" |
| "Fix this error" | "Explain what this error means and what usually causes it" |

**Why this matters:**
- The primary goal of this project is **learning** — Cloud, DevOps, Software Engineering.
- If AI does all the thinking, you learn nothing.
- Understanding the *why* makes you capable of building similar systems without AI in the future.

---

### Rule 3: Every Team Member Must Be Able to Explain Their Own Code

> **If AI generated it, you still must understand it well enough to explain it in a code review, demo, or viva.**

**What this means in practice:**
- If Sairaj uses AI to write the Celery task allocation, he must be able to explain the scoring algorithm to Sufiyan and Tushar.
- If Sufiyan uses AI to build the Vue router guards, he must be able to explain role-based routing.
- If Tushar uses AI to fine-tune MobileNetV2, he must be able to explain transfer learning.

**The "explain it" test:**
Before committing any AI-generated code, ask yourself:
1. Can I explain what this code does to a teammate?
2. Can I explain WHY it's written this way?
3. Can I modify this code if requirements change?
4. Can I debug this code if it breaks?

If the answer to any of these is **no** → go back and learn it first.

**In code reviews (Pull Requests):**
- Reviewers should ask the author to explain non-obvious code.
- "AI wrote it and it works" is not an acceptable PR justification.
- PR descriptions must explain **what** the code does and **why** it was written this way.

---

### Rule 4: AI-Assisted, Not AI-Driven

> **The project is built BY the team WITH AI assistance. AI doesn't replace learning, thinking, or decision-making.**

**What AI should do:**
- ✅ Help you understand a concept
- ✅ Generate boilerplate code that you understand
- ✅ Explain error messages and suggest fixes
- ✅ Help you write tests for code you wrote
- ✅ Suggest improvements to code you already understand
- ✅ Speed up implementation of patterns you've learned

**What AI should NOT do:**
- ❌ Make architectural decisions for you
- ❌ Generate entire modules that you don't read
- ❌ Replace your understanding of the system
- ❌ Be the only team member who knows how something works
- ❌ Write code that no human on the team can debug

**The ownership rule:**
- Every line of code in the project has a **human owner**.
- The owner is the person who wrote it (with or without AI assistance).
- The owner is responsible for understanding, debugging, and maintaining it.

---

### Rule 5: Progressive Implementation — Step by Step

> **Don't ask AI to generate the entire project at once. Build step by step, understand each step before moving on.**

**What this means in practice:**
- Don't ask: "Generate the complete backend with all models, routes, services, and tests."
- Do ask: "Help me create the Citizen SQLAlchemy model with the columns defined in our database design."
- After implementing one piece, **test it**, **understand it**, and only then move to the next.

**The right progression:**

```
Step 1: "Help me create the Citizen model"
        → Understand it → Test it → Commit

Step 2: "Now help me create the Complaint model"
        → Understand it → Test it → Commit

Step 3: "Help me write the complaint service"
        → Understand it → Test it → Commit

Step 4: "Help me write the complaint API route"
        → Understand it → Test it → Commit
```

**The wrong progression:**
```
"Generate the entire backend"
→ 2000 lines of code you don't understand
→ Something breaks → nobody knows why
→ Project falls apart
```

**This is exactly why these Revamp-Docs exist** — the original project planning was dumped all at once, making it impossible to follow. The same principle applies to code: build progressively, understand progressively.

---

## Part 2 — How AI/ML Operates Within the Project

This section documents how AI/ML is used as a **feature of the product** (not as a development tool).

---

### AI is a Feature, Not the Focus

> **ML/AI is a supporting component, NOT a primary learning domain.**
> Your learning priorities are: **DevOps → Cloud → Software Engineering.**
> The AI models just need to work — they're a feature of the product, not the focus of your learning.
> The training notebooks on Colab will be fairly templated.
> Your real learning happens in everything *around* the models: containerizing them, serving them via API, deploying them, CI/CD for model updates.

---

## Summary — The 5 AI Use Rules

| # | Rule | One-Liner |
|---|------|-----------|
| 1 | **Understand Before You Code** | Don't blindly accept AI-generated code. Read and understand every line. |
| 2 | **AI as Learning Tool** | Ask AI to explain concepts, not just generate code. Learn from the output. |
| 3 | **You Must Explain Your Code** | If AI generated it, you must still be able to explain it in a review or demo. |
| 4 | **AI-Assisted, Not AI-Driven** | The project is built BY the team. AI helps, it doesn't replace thinking. |
| 5 | **Progressive Implementation** | Build step by step. Don't generate everything at once. |

---

> **Return to:** [00-START-HERE.md](00-START-HERE.md)
