# Planner

A minimal daily planner focused on revision blocks, with conflict handling, automatic break filling, and local-only persistence.

Built with ❤️

## ✨ Features

- Add tasks with **title + optional description**, start time, duration, and color.
- **12-hour display** (AM/PM) while inputs use native `<input type="time">`.
- **Conflict detection** with an override flow (replace overlapping events).
- **Auto-fill breaks**: inserts “Break” blocks into gaps for the current day.
- **Per-day schedules** with a clean time grid. The last row respects your set **End** time.
- **Local-first storage** using **Dexie (IndexedDB)** — no auth, no server.
- **Import/Export JSON** for backup/restore.
- **One-day share links** to publish a single day to a read-only URL with an expiry of one day

## 🧱 Tech Stack

- Next.js
- Tailwind CSS
- shadcn/ui
- lucide-react
- Dexie (IndexedDB)
- Upstash Redis

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
