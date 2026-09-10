import os
from pathlib import Path
from typing import Optional, List
from fastapi import FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from backend.database import init_db, reset_database
from backend.models import (
    AppointmentCreate,
    AppointmentUpdate,
    AppointmentStatusUpdate,
    AppointmentResponse,
    ConflictCheckResult
)
from backend.repository import AppointmentRepository

# Initialize database tables and seed data
init_db()

app = FastAPI(
    title="Appointment Board API",
    description="Full-stack appointment management board API with time-slot conflict detection and SQL storage.",
    version="1.0.0"
)

# CORS configuration for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "Appointment Board API"}

@app.get("/api/appointments", response_model=List[AppointmentResponse])
def get_appointments(
    date: Optional[str] = Query(None, description="Filter by date (YYYY-MM-DD)"),
    status: Optional[str] = Query(None, description="Filter by status (scheduled, completed, cancelled)"),
    search: Optional[str] = Query(None, description="Keyword search in title, description, or attendee")
):
    """Retrieve all appointments matching optional filters."""
    return AppointmentRepository.get_all(date_filter=date, status_filter=status, search_query=search)

@app.get("/api/appointments/check-availability", response_model=ConflictCheckResult)
def check_time_slot_availability(
    date: str = Query(..., description="Target appointment date (YYYY-MM-DD)"),
    start_time: str = Query(..., description="Start time (HH:MM)"),
    end_time: str = Query(..., description="End time (HH:MM)"),
    exclude_id: Optional[int] = Query(None, description="ID of appointment to exclude (for edits)")
):
    """Proactively verify if a time slot is available without saving."""
    if end_time <= start_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"End time ({end_time}) must be strictly after start time ({start_time})."
        )
    return AppointmentRepository.check_conflict(
        date=date,
        start_time=start_time,
        end_time=end_time,
        exclude_id=exclude_id
    )

@app.get("/api/appointments/{appointment_id}", response_model=AppointmentResponse)
def get_appointment_by_id(appointment_id: int):
    """Retrieve a single appointment by its unique identifier."""
    appointment = AppointmentRepository.get_by_id(appointment_id)
    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Appointment with ID {appointment_id} not found."
        )
    return appointment

@app.post("/api/appointments", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
def create_appointment(payload: AppointmentCreate):
    """
    Create a new appointment.
    Performs slot conflict check against active appointments on the given date.
    """
    # Overlap conflict check
    conflict = AppointmentRepository.check_conflict(
        date=payload.date,
        start_time=payload.start_time,
        end_time=payload.end_time
    )

    if conflict.has_conflict:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=conflict.message
        )

    new_appointment = AppointmentRepository.create(payload)
    return new_appointment

@app.put("/api/appointments/{appointment_id}", response_model=AppointmentResponse)
def update_appointment(appointment_id: int, payload: AppointmentUpdate):
    """
    Update an existing appointment.
    Validates that the new time slot does not collide with other active appointments.
    """
    existing = AppointmentRepository.get_by_id(appointment_id)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Appointment with ID {appointment_id} not found."
        )

    # Check for conflict, excluding the appointment being edited
    conflict = AppointmentRepository.check_conflict(
        date=payload.date,
        start_time=payload.start_time,
        end_time=payload.end_time,
        exclude_id=appointment_id
    )

    if conflict.has_conflict:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=conflict.message
        )

    updated = AppointmentRepository.update(appointment_id, payload)
    return updated

@app.patch("/api/appointments/{appointment_id}/status", response_model=AppointmentResponse)
def update_appointment_status(appointment_id: int, payload: AppointmentStatusUpdate):
    """
    Update status of an appointment (e.g. mark as completed or cancelled).
    Note: Cancelling frees the time slot for future bookings.
    """
    existing = AppointmentRepository.get_by_id(appointment_id)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Appointment with ID {appointment_id} not found."
        )

    # If transitioning from cancelled back to scheduled, re-verify slot availability
    if existing["status"] == "cancelled" and payload.status == "scheduled":
        conflict = AppointmentRepository.check_conflict(
            date=existing["date"],
            start_time=existing["start_time"],
            end_time=existing["end_time"],
            exclude_id=appointment_id
        )
        if conflict.has_conflict:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Cannot uncancel: {conflict.message}"
            )

    updated = AppointmentRepository.update_status(appointment_id, payload.status)
    return updated

@app.delete("/api/appointments/{appointment_id}")
def delete_appointment(appointment_id: int):
    """Delete an appointment permanently."""
    success = AppointmentRepository.delete(appointment_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Appointment with ID {appointment_id} not found."
        )
    return {"message": f"Appointment {appointment_id} successfully deleted."}

@app.post("/api/appointments/reset-seed")
def reset_sample_appointments():
    """Reset database to initial pristine sample appointments."""
    reset_database()
    return {"message": "Database reset to initial sample appointments."}

# Serve built frontend if dist directory exists
FRONTEND_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = FRONTEND_DIST / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(FRONTEND_DIST / "index.html")
