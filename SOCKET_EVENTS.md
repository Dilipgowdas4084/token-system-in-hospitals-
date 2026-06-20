# Socket Event Diagram — Queue Cure Token System

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        EXPRESS + SOCKET.IO SERVER                    │
│                         (server.ts : port 3000)                      │
└────────────────────────────┬───────────────────────┬────────────────┘
                             │                       │
              ┌──────────────▼──────────┐   ┌────────▼───────────────┐
              │   Receptionist Console  │   │  Patient Lobby / TV     │
              │   (Clinician Console)   │   │  (Waiting Room / TV)    │
              └──────────────┬──────────┘   └────────┬───────────────┘
                             │                       │
                    Socket.io Bidirectional Channels (clinic:<id> room)
```

---

## Events: Client → Server (Emit)

| Event | Payload | Description |
|---|---|---|
| `join:clinic` | `clinicId: string` | Client joins a Socket.io room for a specific clinic. Server immediately pushes snapshot of current queue + wait time. |
| `patient:add` | `{ name, age?, gender?, phone?, clinicId, symptoms? }` | Receptionist registers a new patient. Server runs AI triage, creates patient + queue entry, reorders queue, broadcasts update to all in room. |
| `token:call` | `{ clinicId }` | Doctor calls the next priority patient. Server marks top waiting entry as `called` → `in_consultation`, broadcasts `queue:update` + `token:called`. |
| `patient:complete` | `{ queueId, duration, notes? }` | Doctor finishes consultation. Server marks entry as `completed`, recalculates wait times, broadcasts update. |
| `emergency:override` | `{ patientId, clinicId, reason }` | Marks a waiting patient as emergency priority, reorders queue to bubble them to top, broadcasts. |
| `doctor:update` | `{ clinicId, avgTime }` | Receptionist updates the average consultation time. Affects all future wait time calculations. |

---

## Events: Server → Client (Broadcast)

| Event | Payload | Triggered By | Description |
|---|---|---|---|
| `queue:update` | `{ entries: QueueEntry[], health: QueueHealth, total: number }` | Any state change | Full queue snapshot pushed to all clients in the clinic room. |
| `waittime:update` | `{ waitTime: number, queueLength: number, prediction: AIPrediction }` | Any state change | Updated wait time + AI prediction pushed to all clients. |
| `token:called` | `{ token, patientName, patientId, queueId }` | `token:call` event | Notifies all screens which patient is now being called (triggers voice TTS on Patient Lobby). |

---

## Room Strategy

- Each clinic gets its own Socket.io room: `clinic:<clinicId>` (e.g. `clinic:clinic-1`)
- All clients in the room receive broadcasts simultaneously — no polling needed
- On `join:clinic`, server immediately sends current state snapshot so new joiners are instantly up to date

---

## Sequence Diagram — "Call Next Patient" Flow

```
Receptionist          Server              Patient Lobby    Patient TV
     │                   │                     │               │
     │── token:call ──▶  │                     │               │
     │                   │ update DB           │               │
     │                   │ mark in_consult     │               │
     │                   │──── queue:update ──▶│               │
     │                   │──── queue:update ────────────────── ▶│
     │                   │──── token:called ──▶│               │
     │                   │──── token:called ───────────────── ▶ │
     │                   │──── waittime:update ▶│              │
     │◀── callback ──────│                     │               │
     │   { success: true }│                    │               │
     │                   │           🔊 TTS fires on Patient   │
     │                   │           Lobby (Browser API)       │
     │                   │                     │               │
```

---

## Data Flow — Patient Registration

```
RegistrationForm
  └── socket.emit('patient:add', { name, symptoms, clinicId })
        └── Server: AIService.assessTriage(symptoms)
              └── Returns: { score, notes, isPriority }
        └── Server: db.createPatient({ ...data, triage })
        └── Server: queueService.addPatient()
        └── Server: queueService.reorderQueue()  ← sorts by priority
        └── Server: io.to('clinic:X').emit('queue:update', fullSnapshot)
        └── Server: io.to('clinic:X').emit('waittime:update', waitData)
        └── callback({ success: true, data: { patient, queueEntry } })
```
