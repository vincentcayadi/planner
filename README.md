# Planner

A minimal daily planner focused on revision blocks, with conflict handling, automatic break filling, and local-only persistence (IndexedDB via Dexie). Built with Next.js/React, Tailwind, and shadcn/ui.

## ✨ Features

- Add tasks with **title + optional description**, start time, duration, and color.
- **12-hour display** (AM/PM) while inputs use native `<input type="time">`.
- **Conflict detection** with an override flow (replace overlapping events).
- **Auto-fill breaks**: inserts “Break” blocks into gaps for the current day.
- **Per-day schedules** with a clean time grid. The last row respects your set **End** time.
- **Local-first storage** using **Dexie (IndexedDB)** — no auth, no server.
- **Import/Export JSON** for backup/restore.


## 🧱 Tech Stack

- Next.js
- Tailwind CSS
- shadcn/ui
- lucide-react
- Dexie (IndexedDB)


## 🕹 Usage

- **Start/End/Interval**: set your day bounds and grid interval from the left sidebar.
- **Add Task / Paper**:
  - Enter **title** (required), **description** (optional), pick **start time**, **duration**, and a **color**.
  - If the start time is **before day start**, you’ll get an error toast and it won’t add.
  - If the new task **overlaps**, you’ll be prompted to **override** (replace conflicts) or cancel.
- **Current Items**:
  - Edit via the **pencil** icon (same conflict logic as add).
  - Delete via the **trash** icon (with toast).
  - **Fill Breaks** creates “Break” blocks in any free gaps for the day.
  - **Clear All** wipes the day after confirmation.
- **Import/Export JSON**:
  - Use **Open JSON** to load data.
  - Use **Save JSON** to backup the entire planner state (settings + schedules).

## 💾 Persistence (Dexie/IndexedDB)

Data is stored locally only:

- Table `days`: `{ dateKey: string, items: Task[] }`
- Table `meta`: `{ key: "startTime" | "endTime" | "interval", value: string | number }`

This means:
- Works offline.
- Clearing browser storage (site data) will remove it.
- No server/database, no authentication required.

### JSON Format (example)

```json
{
  "version": 1,
  "currentDate": "2025-09-20",
  "startTime": "08:00",
  "endTime": "23:30",
  "interval": 30,
  "schedules": {
    "2025-09-20": [
      {
        "id": 1695200000000,
        "name": "Chemistry Paper 1",
        "description": "MCQ practice set",
        "startTime": "09:00",
        "endTime": "10:00",
        "duration": 60,
        "color": "blue"
      }
    ]
  }
}
```

## ⚖️ Conflict Rules

- A new/edited event **conflicts** if its time range overlaps any existing event the user hasn’t decided to replace.
- On conflict, you’ll see a dialog listing conflicting items:
  - **Override**: replace conflicts with your new/edited event.
  - **Cancel**: keep existing items as-is.