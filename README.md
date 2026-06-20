# 🏥 Queue Cure — Token System for Hospitals

> An intelligent, real-time medical queuing system that eliminates paper token slips and waiting-room guesswork.  
> Built for **Queue Cure '26** hackathon on [Wooble](https://wooble.org).

---

## The Problem

76% of India's 1.5 million clinics still run on paper token slips and shouting. Patients wait 2–3 hours with zero visibility. Doctors have no dashboard. Receptionists manage everything from memory.

**This fixes that.**

---

## Screens

### 🖥️ Screen 1 — Receptionist / Clinician Console
- Add patient with AI-powered triage scoring from symptoms
- Call next token (priority-sorted queue)
- Emergency bypass — override queue order for critical patients
- Set average consultation time (affects all wait calculations live)
- See real-time analytics: patients in line, completed, queue health

### 📺 Screen 2 — Patient Waiting Room (TV Display)
- Giant token display — shows current token being served
- Live queue list with estimated wait times per position
- Token tracker — enter your token number to see your position + countdown timer
- Auto-updates via WebSocket — zero refresh needed

### 🧾 Screen 3 — Patient Lobby
- Self-registration form with symptom input
- Live queue timeline with privacy masking (HIPAA toggle)
- AI wait time prediction + wellness recommendations

---

## Hackathon Criteria — How We Score

| Criteria | Weight | Implementation |
|---|---|---|
| Live queue updates across both screens | 40% | Socket.io rooms — all screens sync sub-100ms on every state change |
| Wait time from real data (not hardcoded) | 25% | `waiting_count × clinic.avg_consultation_time`, recalculated on every event |
| Receptionist screen fast & mistake-proof | 20% | Auto-triage, disabled "Call Next" while consulting, emergency bypass |
| Concurrency & edge cases in thought process | 15% | See [THOUGHT_PROCESS.md](./THOUGHT_PROCESS.md) |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Vite |
| Backend | Express.js + Socket.io |
| Database | JSON flat-file (DatabaseService) |
| AI Triage | REST AI API (falls back to rule-based if unavailable) |
| Styling | TailwindCSS v4 |
| Runtime | Node.js v25 |

---

## Submission Documents

- 📡 [Socket Event Diagram](./SOCKET_EVENTS.md)
- 🧠 [Thought Process Sheet](./THOUGHT_PROCESS.md)

---

## Run Locally

**Prerequisites:** Node.js ≥ 18

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Add your API key to .env (optional — app works without it via fallback)

# 3. Start the dev server
npm run dev
```

App runs at **http://localhost:3000**

---

## Architecture

```
Browser (React + Socket.io client)
  ├── Patient Lobby       → register, track queue, see wait time
  ├── Clinician Console   → call tokens, complete consultations, manage settings
  └── Patient TV Display  → big-screen token display for waiting room

Express Server (port 3000)
  ├── REST API            → /api/clinics, /api/patients, /api/analytics
  ├── Socket.io           → real-time bidirectional events
  ├── DatabaseService     → JSON persistence layer
  └── AIService           → triage + wait prediction (with fallback)
```
