# TeamSync — Appointment Board

> **Full Stack Developer Intern — Practical Task**
>
> A simple appointment board for a small team. The board makes it easy to **view**, **add**, **update**, **complete**, and **cancel** appointments with real-time time-slot conflict prevention.

**Live Demo:** [https://appointment-board-alpha.vercel.app](https://appointment-board-alpha.vercel.app)

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [How the Application Works](#how-the-application-works)
- [Time-Slot Conflict Detection](#time-slot-conflict-detection)
- [Assumptions Made](#assumptions-made)
- [API Endpoints](#api-endpoints)
- [Local Development Setup](#local-development-setup)
- [Running Tests](#running-tests)
- [Deployment (Vercel)](#deployment-vercel)

---

## Features

All features specified in the practical task are fully implemented:

| # | Requirement | Status |
|---|-------------|--------|
| 1 | Show a list or board of appointments | ✅ Kanban board + List/Table view |
| 2 | Allow a user to add a new appointment | ✅ Modal form with validation |
| 3 | Allow a user to edit an appointment | ✅ Edit modal pre-filled with existing data |
| 4 | Allow a user to cancel an appointment | ✅ Cancel button on each card (frees time slot) |
| 5 | Allow filtering by date and status | ✅ Date picker + Status dropdown + Keyword search |
| 6 | Allow an appointment to be marked as completed | ✅ "Complete" button on scheduled appointments |
| 7 | Prevent two appointments from same time slot | ✅ SQL-level overlap detection with 409 Conflict |
| 8 | Sample appointments seeded on first load | ✅ 8 sample appointments relative to today's date |
| 9 | Clear success and error messages | ✅ Toast notifications for all actions |
| 10 | Short explanation of how the app works | ✅ "About & Assumptions" modal in the UI |

### Expected Flow (All Working)

1. User opens the board → sees existing sample appointments
2. User can filter appointments by date or status
3. User clicks **Add Appointment** → modal opens
4. User enters title, description, date, start time, and end time
5. App validates required fields, checks end time > start time, and checks for conflicts
6. If valid, the appointment is added to the board
7. User can later **edit**, **complete**, or **cancel** the appointment
8. Cancelled appointments remain visible and are clearly marked as cancelled

---

## Tech Stack

| Layer | Technology | Role | Code % |
|-------|-----------|------|--------|
| **Backend** | Python 3.12 + FastAPI | REST API, validation, conflict detection, data access | **~80%** |
| **Database** | SQLite (SQL) | Persistent storage with indexed queries | Part of backend |
| **Data Models** | Pydantic v2 | Request/response validation and serialization | Part of backend |
| **Frontend** | React 19 + Vite | UI rendering (thin client, no business logic) | **~20%** |
| **Deployment** | Vercel | Serverless Python functions + Static site hosting | — |

### Why 80% Python?

All core logic lives in Python:

- **`backend/database.py`** — SQLite schema creation, indexing, sample data seeding
- **`backend/models.py`** — Pydantic models with field validators (date, time, whitespace, range)
- **`backend/repository.py`** — Full SQL repository with parameterized queries for CRUD, filtering, search, and conflict detection
- **`backend/main.py`** — FastAPI routes with HTTP error handling (400, 404, 409, 422)
- **`backend/test_appointments.py`** — Comprehensive unit tests covering all edge cases

The React frontend is a **thin presentation layer** — it makes API calls and renders the results. It contains **zero business logic, zero filtering logic, and zero validation logic** beyond basic UX feedback.

---

## Project Structure

```
TeamSync-Appointment-Board/
│
├── backend/                    # Python backend (~80% of code)
│   ├── __init__.py             # Package initializer
│   ├── main.py                 # FastAPI app with all REST API routes
│   ├── models.py               # Pydantic data models with validators
│   ├── repository.py           # SQL repository (CRUD, filters, conflict detection)
│   ├── database.py             # SQLite connection, schema, seeding
│   └── test_appointments.py    # Unit tests (7 test cases, overlap edge cases)
│
├── api/
│   └── index.py                # Vercel serverless function entry point
│
├── src/                        # React frontend (~20% of code)
│   ├── main.jsx                # React entry point
│   ├── App.jsx                 # Main application component
│   ├── App.css                 # Component-specific styles
│   ├── index.css               # Global design system (themes, animations)
│   ├── components/
│   │   ├── AppointmentCard.jsx     # Individual appointment card
│   │   ├── AppointmentListView.jsx # Table/list view of appointments
│   │   ├── AppointmentModal.jsx    # Add/Edit appointment form modal
│   │   ├── ExplanationModal.jsx    # About & Assumptions modal
│   │   ├── FilterBar.jsx           # Search, date, status filters
│   │   └── Icons.jsx               # SVG icon components
│   └── assets/
│       └── hero.png                # App icon/logo
│
├── public/
│   ├── favicon.svg             # Browser tab icon
│   └── icons.svg               # Sprite sheet
│
├── index.html                  # Vite HTML entry point
├── package.json                # Node.js dependencies (React, Vite)
├── vite.config.js              # Vite dev server config with API proxy
├── requirements.txt            # Python dependencies (FastAPI, Pydantic, Uvicorn)
├── vercel.json                 # Vercel deployment configuration
├── .gitignore                  # Git ignore rules
├── .vercelignore               # Vercel deploy ignore rules
└── README.md                   # This file
```

---

## How the Application Works

### Backend (Python — FastAPI)

The Python backend handles **all** business logic:

1. **Database Initialization** — On startup, creates the `appointments` table with indexes on `date` and `status` columns, then seeds 8 sample appointments relative to today's date.

2. **REST API** — Provides endpoints for full CRUD operations with proper HTTP status codes (201 Created, 200 OK, 400 Bad Request, 404 Not Found, 409 Conflict, 422 Validation Error).

3. **Pydantic Validation** — Every incoming request is validated for:
   - Required fields (title, attendee, date, start_time, end_time)
   - Correct date format (YYYY-MM-DD) and valid calendar dates
   - Correct time format (HH:MM, 24-hour) with valid hour/minute ranges
   - End time must be strictly after start time
   - Whitespace-only strings are rejected

4. **SQL Filtering** — Filtering by date, status, and keyword search is done server-side using parameterized SQL queries (not in the frontend).

5. **Conflict Detection** — Before creating or updating an appointment, the backend runs a SQL query to check for overlapping time slots (see below).

### Frontend (React — Thin Client)

The React frontend is intentionally minimal:

- Renders a **Kanban board** (3 columns: Scheduled, Completed, Cancelled) or a **List/Table view**
- Provides a modal form for adding/editing appointments
- Displays **toast notifications** for success/error feedback
- Supports **light/dark theme** toggle
- All data fetching, filtering, and validation happens via API calls to the Python backend

---

## Time-Slot Conflict Detection

The conflict detection algorithm runs entirely in Python using SQL. Two time intervals `[S1, E1)` and `[S2, E2)` overlap if and only if `S1 < E2 AND E1 > S2`.

```sql
-- Executed on every POST (create) and PUT (update) request:
SELECT id, title, start_time, end_time, status
FROM appointments
WHERE date = :target_date
  AND status != 'cancelled'
  AND (:exclude_id IS NULL OR id != :exclude_id)
  AND (start_time < :new_end_time AND end_time > :new_start_time)
LIMIT 1;
```

**Key behaviors:**
- **Cancelled appointments do NOT block time slots** — cancelling frees the slot
- **Back-to-back appointments are allowed** — e.g., 10:00–11:00 and 11:00–12:00 do not conflict
- **Self-exclusion on edit** — editing an appointment's title won't trigger a false self-collision
- **Reactivation checks** — when un-cancelling an appointment, the slot is re-verified

---

## Assumptions Made

1. **Cancelled Slots are Reusable:** When cancelled, the appointment remains visible on the board (with distinctive styling) for team auditability, but its time slot is immediately freed for rebooking.

2. **Self-Exclusion on Edit:** When updating an appointment, the conflict query excludes the current appointment's ID to prevent false-positive self-collisions.

3. **Single-Day Boundaries:** Appointments are assumed to start and end within the same calendar day (e.g., 09:00–17:00). Overnight appointments are not supported.

4. **Shared Team Calendar:** All appointments share a single calendar. If two different people book the same time slot, it is treated as a conflict (the board represents a shared resource like a meeting room).

5. **SQLite for Simplicity:** The data layer uses SQLite for zero-setup local development. The SQL queries are standard and fully compatible with PostgreSQL or MySQL.

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/appointments` | List all appointments (with optional `?date=`, `?status=`, `?search=` filters) |
| `GET` | `/api/appointments/{id}` | Get single appointment by ID |
| `GET` | `/api/appointments/check-availability` | Check if a time slot is available |
| `POST` | `/api/appointments` | Create new appointment (with conflict check) |
| `PUT` | `/api/appointments/{id}` | Update appointment (with conflict check) |
| `PATCH` | `/api/appointments/{id}/status` | Update status (scheduled / completed / cancelled) |
| `DELETE` | `/api/appointments/{id}` | Delete appointment permanently |
| `POST` | `/api/appointments/reset-seed` | Reset database to sample data |

---

## Local Development Setup

### Prerequisites

- **Python 3.10+** (for the backend)
- **Node.js 18+** (for the frontend)

### 1. Clone the repository

```bash
git clone https://github.com/saranasai-21/Appointment.git
cd Appointment
```

### 2. Install Python dependencies

```bash
pip install -r requirements.txt
```

### 3. Install Node.js dependencies

```bash
npm install
```

### 4. Start the backend server

```bash
uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

### 5. Start the frontend dev server (in a separate terminal)

```bash
npm run dev
```

### 6. Open in browser

Navigate to **http://localhost:5173** — the Vite dev server proxies `/api/*` requests to the Python backend at port 8000.

---

## Running Tests

The backend includes comprehensive unit tests covering:

- Health check endpoint
- Seeded sample data verification
- Creating valid appointments
- Rejecting invalid time ranges (end ≤ start)
- **Overlap detection** — 6 edge cases:
  - Exact overlap → 409
  - Front overlap → 409
  - Back overlap → 409
  - Contained overlap → 409
  - Back-to-back before → 201 (allowed)
  - Back-to-back after → 201 (allowed)
- Self-exclusion on edit (no false collision)
- Status transitions (scheduled → completed → cancelled)
- Slot liberation on cancellation (rebooking freed slot)

```bash
python -m pytest backend/test_appointments.py -v
```

Or with unittest:

```bash
python -m unittest backend.test_appointments -v
```

---

## Deployment (Vercel)

The application is deployed on **Vercel** as a monolith:

- **Frontend:** Built with Vite (`npm run build`) and served as static files
- **Backend:** Deployed as a Python serverless function via `api/index.py`
- **Routing:** `vercel.json` routes `/api/*` to the Python function, everything else to the React SPA

The live deployment is available at: **[https://appointment-board-alpha.vercel.app](https://appointment-board-alpha.vercel.app)**

---

## Author

**Sarana Sai Bagadi** — Full Stack Developer Intern

- GitHub: [saranasai-21](https://github.com/saranasai-21)
