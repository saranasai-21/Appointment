# TeamSync — Appointment Board

A full-stack Appointment Board for small teams built for the **Full Stack Developer Intern Practical Task**.

Designed following the **Python 80%** (FastAPI, SQL repository, validation, conflict detection algorithms) and **React 20%** (Kanban board & list view, responsive design, modals, toast system) specification.

---

## 🌟 Features Implemented

- **Appointment Board & List Views**:
  - **Kanban Board**: 3 status columns (**Scheduled**, **Completed**, **Cancelled**) with live count badges and visual indicators.
  - **Table / List View**: Clean tabular display with quick action triggers.
- **Add New Appointment**:
  - Full modal dialog with Title, Description, Attendee / Client Name, Category, Date, Start Time, and End Time.
  - Real-time client-side validation ($E > S$) and backend validation.
- **Edit Appointment**:
  - Pre-fills current details and prevents self-collision while forbidding collisions with other bookings.
- **Cancel Appointment**:
  - Cancelled appointments **remain visible** on the board and are clearly styled with strike-through title and cancelled badge for team auditability.
  - **Time-Slot Liberation**: Cancelling an appointment frees the time slot, allowing team members to re-book that exact interval.
- **Mark as Completed**:
  - One-click status transition from `scheduled` to `completed`.
- **Filtering & Search**:
  - Filter by status (`All`, `Scheduled`, `Completed`, `Cancelled`).
  - Filter by date (`All Dates`, `Today`, or custom calendar date).
  - Keyword search across Title, Description, Attendee, and Category.
- **Overlap Prevention (Collision Detection)**:
  - Strictly prevents two active appointments from using the same or overlapping time slots on the same date.
  - Returns `409 Conflict` with exact conflicting appointment details.
- **White Premium Theme (Default) & Dark Mode**:
  - **Clean, Normal Button UI**: Standard solid corporate UI (`#2563eb` primary blue with crisp border, no distracting gradients).
  - **Full-Width Edge-to-Edge Navbar**: Clean, full-screen top navigation bar.
  - **Theme Switcher**: Instant one-click toggle in the header between White Premium and Dark themes, with user preference saved in `localStorage`.
- **Pre-Seeded Sample Data**:
  - Automatically pre-seeds realistic team appointments across dates and statuses upon launch.
  - "Reset Samples" button in the toolbar allows resetting to pristine test data at any time.
- **Clear Feedback & Toast Notifications**:
  - Toast notification banners for success, info, and errors.
  - Inline error alert box in modals detailing collision conflicts.
- **"About & Assumptions" Guide**:
  - Accessible directly in the UI via the **About & Assumptions** button.

---

## 🚀 How to Host on Vercel

This repository is pre-configured with `vercel.json`, `api/index.py`, and `requirements.txt` for one-click deployment on Vercel.

### Method 1: Deploy via GitHub & Vercel Dashboard (Recommended)

1. **Push your code to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: TeamSync Appointment Board"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
   git push -u origin main
   ```

2. **Import into Vercel**:
   - Go to [vercel.com/new](https://vercel.com/new) and log in.
   - Select your GitHub repository.
   - Vercel will automatically detect `vercel.json`.
   - Click **Deploy**.

3. **Deployment Done**:
   - Vercel automatically deploys the Python FastAPI backend as a serverless function (`/api/*`) and builds the React frontend static assets (`/*`).
   - Your application is live at `https://your-project.vercel.app`!

---

### Method 2: Deploy via Vercel CLI

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm install -g vercel
   ```

2. **Deploy directly from the project directory**:
   ```bash
   cd d:\sarana
   vercel
   ```
   Follow the CLI prompts (accept defaults).

3. **Deploy to Production**:
   ```bash
   vercel --prod
   ```

> [!NOTE]
> **Vercel Database Persistence Note**:
> By default, the application runs on SQLite in `/tmp/appointments.db` on Vercel serverless instances and pre-seeds sample appointments. For long-term persistence across distributed serverless cold-starts, you can set the `DATABASE_URL` environment variable in Vercel Project Settings to a free PostgreSQL database (such as [Neon.tech](https://neon.tech), [Supabase](https://supabase.com), or Railway).

---

## 💻 Running Locally

### Option 1: Quick Launch (Single Command)
Run from the project root:
```bash
python run_app.py
```
*(Or double-click `start.bat` on Windows)*

This boots the FastAPI server on `http://127.0.0.1:8000` (which serves both the REST API and the React production build) and automatically opens your default browser!

---

### Option 2: Development Mode (Hot Reloading)

1. **Start the Backend API**:
   ```bash
   python -m uvicorn backend.main:app --reload --port 8000
   ```
2. **Start the React Frontend**:
   ```bash
   cd frontend
   npm run dev
   ```
   Open `http://localhost:5173`. Vite automatically proxies API requests to `http://localhost:8000`.

---

## 🧪 Automated Testing

### 1. Backend Unit Tests
Runs the Python test suite verifying CRUD operations, boundary overlap conditions, and status lifecycles:
```bash
python -m unittest backend/test_appointments.py
```

### 2. Live End-to-End Integration Tests
Runs end-to-end HTTP tests against the running server:
```bash
python test_e2e_live.py
```

---

## 🛡️ Overlap Prevention Algorithm & SQL Logic

Two time intervals $[S_1, E_1)$ and $[S_2, E_2)$ on the same date overlap if and only if:
$$\text{Start}_1 < \text{End}_2 \quad \text{AND} \quad \text{End}_1 > \text{Start}_2$$

### SQL Collision Query (in `backend/repository.py`):
```sql
SELECT id, title, attendee, date, start_time, end_time, status
FROM appointments
WHERE date = :target_date
  AND status != 'cancelled'
  AND (:exclude_id IS NULL OR id != :exclude_id)
  AND (start_time < :new_end_time AND end_time > :new_start_time)
LIMIT 1;
```

### Boundary Behaviors Handled:
1. **Back-to-Back Allowed**: An appointment ending at `11:00` and a new one starting at `11:00` do **not** overlap ($11:00 < 11:00$ is `False`).
2. **Partial Overlap Blocked**: `10:30 - 11:30` colliding with `11:00 - 12:00` is blocked with `409 Conflict`.
3. **Contained Interval Blocked**: A 30-minute meeting inside an existing 1-hour slot is blocked.
4. **Self-Exclusion on Edit**: When updating an appointment's title or description, its own ID is excluded from the check so it does not falsely collide with itself.
5. **Cancelled Slot Liberation**: Cancelled appointments have `status = 'cancelled'` and are excluded from the active slot lock, liberating that slot for new bookings.

---

## 📐 Project Structure

```
d:\sarana
├── api/
│   └── index.py                # Vercel serverless function entrypoint
├── backend/
│   ├── database.py             # SQL engine, schema initialization & sample data seeder
│   ├── models.py               # Pydantic schemas, field validations & time range validators
│   ├── repository.py           # Parameterized SQL queries for CRUD, filtering & collision checks
│   ├── main.py                 # FastAPI application, CORS, REST routes & static SPA serving
│   └── test_appointments.py    # Unit tests for CRUD, conflict detection, and status lifecycle
├── frontend/
│   ├── src/
│   │   ├── components/         # AppointmentCard, AppointmentModal, FilterBar, Icons, etc.
│   │   ├── App.jsx             # Main React dashboard & theme state coordinator
│   │   └── index.css           # White Premium CSS design system (full-width navbar, normal button UI)
│   ├── vite.config.js          # Vite configuration with /api proxy to FastAPI
│   └── package.json            # React & Vite dependencies
├── requirements.txt            # Python dependencies for Vercel & local setup
├── vercel.json                 # Vercel serverless & static build configuration
├── .vercelignore               # Files excluded from Vercel deployment
├── run_app.py                  # Single-command Python launcher (runs server + opens browser)
├── start.bat                   # 1-click Windows launcher
├── test_e2e_live.py            # Live integration test against running server
└── README.md                   # Documentation & Vercel deployment guide
```

---

## 📝 Assumptions Made

1. **Cancelled Appointments Free Up Slots**: When an appointment is cancelled, it remains visible on the board for auditing and tracking, but its reserved time slot is released so teammates can schedule new meetings in that slot.
2. **Single-Day Appointments**: Team meetings start and end within the same calendar day (between `00:00` and `23:59`).
3. **Self-Exclusion on Edits**: Editing an existing meeting's details ignores that meeting's own ID during conflict validation.
4. **Zero-Configuration SQL Engine**: Defaulted to SQLite with standard SQL syntax for zero-setup execution out of the box, with full schema compatibility for PostgreSQL or MySQL.
