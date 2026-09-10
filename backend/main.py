from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, List
from pathlib import Path

from backend.database import init_db, get_db, reset_db

# initialize database on startup
init_db()

app = FastAPI(title="Appointment Board API")

# allow frontend to talk to backend during development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Pydantic models for request validation ---

class AppointmentIn(BaseModel):
    title: str
    description: Optional[str] = ""
    attendee: str
    category: Optional[str] = "General"
    date: str          # YYYY-MM-DD
    start_time: str    # HH:MM
    end_time: str      # HH:MM
    status: Optional[str] = "scheduled"

class StatusUpdate(BaseModel):
    status: str        # scheduled, completed, or cancelled


# --- Helper: check if a time slot is already taken ---

def has_conflict(date, start, end, exclude_id=None):
    """
    Check if any active (non-cancelled) appointment overlaps with
    the given time range. Returns True if there's a conflict.
    """
    conn = get_db()
    query = """
        SELECT id FROM appointments
        WHERE date = ? AND status != 'cancelled'
        AND start_time < ? AND end_time > ?
    """
    params = [date, end, start]

    if exclude_id:
        query += " AND id != ?"
        params.append(exclude_id)

    row = conn.execute(query, params).fetchone()
    conn.close()
    return row is not None


# --- API Routes ---

@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/appointments")
def list_appointments(
    date: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None
):
    """Get all appointments, optionally filtered by date/status/keyword."""
    conn = get_db()
    conditions = []
    params = []

    if date:
        conditions.append("date = ?")
        params.append(date)
    if status and status != "all":
        conditions.append("status = ?")
        params.append(status)
    if search:
        conditions.append("(LOWER(title) LIKE ? OR LOWER(attendee) LIKE ?)")
        params.extend([f"%{search.lower()}%", f"%{search.lower()}%"])

    where = ""
    if conditions:
        where = "WHERE " + " AND ".join(conditions)

    rows = conn.execute(
        f"SELECT * FROM appointments {where} ORDER BY date, start_time",
        params
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.get("/api/appointments/{appt_id}")
def get_appointment(appt_id: int):
    conn = get_db()
    row = conn.execute("SELECT * FROM appointments WHERE id = ?", (appt_id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(404, "Appointment not found")
    return dict(row)


@app.post("/api/appointments", status_code=201)
def create_appointment(data: AppointmentIn):
    # validate time range
    if data.end_time <= data.start_time:
        raise HTTPException(400, "End time must be after start time")

    # check for overlapping appointments
    if has_conflict(data.date, data.start_time, data.end_time):
        raise HTTPException(409, "Time slot conflict with an existing appointment")

    conn = get_db()
    cursor = conn.execute("""
        INSERT INTO appointments (title, description, attendee, category, date, start_time, end_time, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled')
    """, (data.title, data.description, data.attendee, data.category, data.date, data.start_time, data.end_time))
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()
    return get_appointment(new_id)


@app.put("/api/appointments/{appt_id}")
def update_appointment(appt_id: int, data: AppointmentIn):
    # make sure it exists
    existing = get_appointment(appt_id)

    if data.end_time <= data.start_time:
        raise HTTPException(400, "End time must be after start time")

    # exclude self when checking for conflicts
    if has_conflict(data.date, data.start_time, data.end_time, exclude_id=appt_id):
        raise HTTPException(409, "Time slot conflict with an existing appointment")

    conn = get_db()
    status = data.status if data.status else existing["status"]
    conn.execute("""
        UPDATE appointments
        SET title=?, description=?, attendee=?, category=?, date=?,
            start_time=?, end_time=?, status=?, updated_at=CURRENT_TIMESTAMP
        WHERE id=?
    """, (data.title, data.description, data.attendee, data.category, data.date,
          data.start_time, data.end_time, status, appt_id))
    conn.commit()
    conn.close()
    return get_appointment(appt_id)


@app.patch("/api/appointments/{appt_id}/status")
def change_status(appt_id: int, body: StatusUpdate):
    existing = get_appointment(appt_id)

    # if reactivating a cancelled appointment, check the slot is still free
    if existing["status"] == "cancelled" and body.status == "scheduled":
        if has_conflict(existing["date"], existing["start_time"], existing["end_time"], exclude_id=appt_id):
            raise HTTPException(409, "Can't reactivate - time slot is now taken")

    conn = get_db()
    conn.execute(
        "UPDATE appointments SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?",
        (body.status, appt_id)
    )
    conn.commit()
    conn.close()
    return get_appointment(appt_id)


@app.post("/api/appointments/reset-seed")
def reset_samples():
    reset_db()
    return {"message": "Database reset with sample appointments"}


# --- Serve the built React frontend ---

DIST = Path(__file__).resolve().parent.parent / "dist"
if DIST.exists():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")

    @app.get("/{path:path}")
    def serve_frontend(path: str):
        file = DIST / path
        if file.is_file():
            return FileResponse(file)
        return FileResponse(DIST / "index.html")
