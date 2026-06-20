# Thought Process Sheet — Queue Cure Token System

**Hackathon:** Queue Cure '26 — Wooble  
**Builder:** Dilip Gowda S  
**Problem:** 76% of India's 1.5M clinics still operate on paper token slips with zero patient visibility.

---

## 1. Problem Decomposition

The core problem has three distinct pain points:

| Pain Point | Impact | Our Solution |
|---|---|---|
| Patients wait 2–3 hours with no visibility | Anxiety, missed turns, frustration | Patient Lobby + TV Display with live token tracking & countdown |
| Doctors have no real-time dashboard | Missed priority patients, no flow data | Clinician Console with triage-sorted queue, emergency bypass |
| Receptionists manage everything from memory | Errors, slow check-in | Fast registration form with AI triage scoring + mistake-proof guards |

---

## 2. Architecture Decisions

### Why Socket.io over REST polling?

REST polling every N seconds introduces stale data, unnecessary server load, and poor UX. Socket.io gives us **sub-100ms** push delivery the instant "Call Next" is clicked — both the Receptionist and Patient screens update simultaneously without any refresh.

### Why a Room-based Socket.io strategy?

Using `io.to('clinic:<id>').emit(...)` means broadcasts are scoped to only clients in that clinic's room. This cleanly supports **multi-clinic deployments** — adding clinic-2 requires zero code change; clients just join a different room.

### Why a JSON flat-file database?

For a hackathon prototype, a JSON file-based database (via `DatabaseService`) avoids the setup friction of PostgreSQL/MongoDB while still giving us full CRUD, persistence across restarts, and atomic file writes. In production, swapping to PostgreSQL is a clean interface change.

### Why AI triage at registration?

Clinical triage is traditionally done manually by nurses after the patient arrives. By running AI triage at registration (symptom text → priority score 1–5), we:
- Automatically sort high-priority patients to the front
- Give doctors pre-read clinical notes before the patient walks in
- Reduce cognitive load on receptionists

---

## 3. Concurrency Handling

### Scenario: Two receptionists call "Call Next" at the same time

**Risk:** Two patients get `in_consultation` simultaneously.

**Solution:** The server's `callNextToken()` function:
1. Fetches the queue inside a single synchronous in-memory operation (not async DB read-then-write with a gap)
2. Immediately sets the entry status to `in_consultation` and persists
3. The client-side UI also disables the "Call Next" button the instant any `in_consultation` entry exists in the queue update

This gives us **optimistic locking** — even if two requests arrive within milliseconds, only one will find a `waiting` entry to promote.

### Scenario: Patient added while doctor is mid-call

**Solution:** Queue reordering runs on every `patient:add`. The new patient is inserted at the correct priority position without affecting the `in_consultation` entry. The reorder only touches `waiting` entries.

### Scenario: Client disconnects and reconnects mid-session

**Solution:** On every `join:clinic`, the server pushes a **full state snapshot** (`queue:update` + `waittime:update`). The client never needs to track local state across disconnects — it always gets truth from the server.

---

## 4. Edge Cases Handled

| Edge Case | Handling |
|---|---|
| Empty queue → "Call Next" clicked | Button disabled when `waitingEntries.length === 0` |
| Doctor calls next while already in consultation | "Summon Next Patient" UI only renders when no `in_consultation` entry exists |
| Patient enters wrong token in TV tracker | Shows "Token not found or already served" gracefully |
| AI service down / no API key | Full fallback to rule-based triage (score 4, routine wait) — app remains fully functional |
| Socket disconnection | Auto-reconnect with `reconnectionDelayMax: 10000`, full snapshot on rejoin |
| Priority patient added mid-queue | Queue reorder runs after every add, bubbles priority entries to correct position |
| Clinic avg time set to 0 or extreme values | Range slider clamps between 5–30 minutes on the UI |

---

## 5. Wait Time Calculation

Wait time is **never hardcoded**. The formula:

```
estimatedWait(patient) = position_in_waiting_queue × clinic.avg_consultation_time
```

Where:
- `position_in_waiting_queue` = count of waiting patients ahead (priority-sorted)
- `clinic.avg_consultation_time` = live value, updated by receptionist via slider

This recalculates and broadcasts on **every state change**: new patient added, token called, consultation completed, avg time updated.

---

## 6. What I'd Build Next (Production Roadmap)

1. **SMS/WhatsApp notifications** — notify patient when 2 tokens ahead via Twilio
2. **PostgreSQL backend** — replace JSON file DB for concurrent write safety
3. **Multi-doctor support** — assign patients to specific doctors/rooms
4. **Daily analytics dashboard** — peak hours, avg wait trends, doctor efficiency
5. **Patient self-registration QR code** — scan → register from own phone
6. **Prescription PDF export** — generate formatted PDF from doctor notes
