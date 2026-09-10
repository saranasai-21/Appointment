# Appointment Board

A simple appointment board for a small team. Built with **Python (FastAPI)** for the backend and **React** for the frontend.

**Live Demo:** [https://appointment-board-alpha.vercel.app](https://appointment-board-alpha.vercel.app)

## What it does

- View all appointments on a kanban-style board (Scheduled / Completed / Cancelled)
- Add new appointments with title, attendee, date, and time
- Edit existing appointments
- Mark appointments as completed or cancelled
- Filter by date, status, or search keyword
- **Prevents double-booking** — you can't schedule two appointments in the same time slot
- Cancelled appointments free up their time slot for rebooking
- Sample appointments are loaded on first run

## Tech Stack

- **Backend:** Python 3 with FastAPI + SQLite
- **Frontend:** React 19 with Vite
- **Deployment:** Vercel (serverless Python + static React build)

## How to run locally

```bash
# 1. Install Python dependencies
pip install -r requirements.txt

# 2. Install frontend dependencies
npm install

# 3. Start the backend
uvicorn backend.main:app --reload --port 8000

# 4. Start the frontend (in another terminal)
npm run dev

# 5. Open http://localhost:5173
```

The Vite dev server proxies `/api` requests to the FastAPI backend on port 8000.

## How conflict detection works

Before creating or editing an appointment, the backend checks if any existing (non-cancelled) appointment overlaps with the requested time slot on the same date. If there's a conflict, it returns a 409 error.

Back-to-back appointments are allowed (e.g. one ending at 11:00 and another starting at 11:00).

## Project structure

```
├── backend/
│   ├── database.py      # SQLite setup and sample data
│   └── main.py          # FastAPI routes and business logic
├── api/
│   └── index.py         # Vercel serverless entry point
├── src/
│   ├── App.jsx           # Main React component
│   ├── index.css         # Styles
│   └── components/
│       ├── AppointmentCard.jsx   # Individual card component
│       └── AppointmentModal.jsx  # Add/edit form modal
├── vercel.json           # Vercel deployment config
├── requirements.txt      # Python dependencies
└── package.json          # Node dependencies
```
