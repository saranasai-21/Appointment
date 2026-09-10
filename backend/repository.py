import sqlite3
from typing import List, Optional, Dict, Any
from datetime import datetime
from backend.database import get_db_connection
from backend.models import AppointmentCreate, AppointmentUpdate, ConflictCheckResult

class AppointmentRepository:
    """
    SQL Repository handling all database queries and transactions
    for appointment scheduling, conflict detection, and status management.
    """

    @staticmethod
    def check_conflict(
        date: str,
        start_time: str,
        end_time: str,
        exclude_id: Optional[int] = None
    ) -> ConflictCheckResult:
        """
        Detects if a proposed time slot collides with any existing active appointment.
        Rule: Two intervals [S1, E1) and [S2, E2) overlap iff S1 < E2 and E1 > S2.
        Note: Cancelled appointments do NOT block time slots.
        """
        conn = get_db_connection()
        cursor = conn.cursor()

        query = """
        SELECT id, title, attendee, date, start_time, end_time, status
        FROM appointments
        WHERE date = ?
          AND status != 'cancelled'
          AND (? IS NULL OR id != ?)
          AND (start_time < ? AND end_time > ?)
        LIMIT 1;
        """

        cursor.execute(query, (date, exclude_id, exclude_id, end_time, start_time))
        row = cursor.fetchone()
        conn.close()

        if row:
            conflict = dict(row)
            msg = (
                f"Time slot conflict: Collides with '{conflict['title']}' "
                f"({conflict['start_time']} - {conflict['end_time']}) "
                f"booked by/for {conflict['attendee']} on {conflict['date']}."
            )
            return ConflictCheckResult(
                has_conflict=True,
                conflict_appointment=conflict,
                message=msg
            )

        return ConflictCheckResult(has_conflict=False)

    @staticmethod
    def get_all(
        date_filter: Optional[str] = None,
        status_filter: Optional[str] = None,
        search_query: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Fetch all appointments with optional filters and sorting."""
        conn = get_db_connection()
        cursor = conn.cursor()

        conditions = []
        params = []

        if date_filter and date_filter.strip():
            conditions.append("date = ?")
            params.append(date_filter.strip())

        if status_filter and status_filter.strip() and status_filter.lower() != "all":
            conditions.append("status = ?")
            params.append(status_filter.strip().lower())

        if search_query and search_query.strip():
            search_param = f"%{search_query.strip().lower()}%"
            conditions.append(
                "(LOWER(title) LIKE ? OR LOWER(description) LIKE ? OR LOWER(attendee) LIKE ? OR LOWER(category) LIKE ?)"
            )
            params.extend([search_param, search_param, search_param, search_param])

        where_clause = ""
        if conditions:
            where_clause = "WHERE " + " AND ".join(conditions)

        query = f"""
        SELECT id, title, description, attendee, category, date, start_time, end_time, status, created_at, updated_at
        FROM appointments
        {where_clause}
        ORDER BY date ASC, start_time ASC;
        """

        cursor.execute(query, tuple(params))
        rows = [dict(r) for r in cursor.fetchall()]
        conn.close()
        return rows

    @staticmethod
    def get_by_id(appointment_id: int) -> Optional[Dict[str, Any]]:
        """Fetch single appointment by ID."""
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
        SELECT id, title, description, attendee, category, date, start_time, end_time, status, created_at, updated_at
        FROM appointments
        WHERE id = ?;
        """, (appointment_id,))
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None

    @staticmethod
    def create(data: AppointmentCreate) -> Dict[str, Any]:
        """Insert a newly validated appointment."""
        conn = get_db_connection()
        cursor = conn.cursor()

        query = """
        INSERT INTO appointments (title, description, attendee, category, date, start_time, end_time, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
        """
        cursor.execute(query, (
            data.title,
            data.description or "",
            data.attendee,
            data.category or "Team Sync",
            data.date,
            data.start_time,
            data.end_time
        ))
        conn.commit()
        new_id = cursor.lastrowid
        conn.close()

        return AppointmentRepository.get_by_id(new_id)

    @staticmethod
    def update(appointment_id: int, data: AppointmentUpdate) -> Optional[Dict[str, Any]]:
        """Update appointment attributes and refresh updated_at timestamp."""
        existing = AppointmentRepository.get_by_id(appointment_id)
        if not existing:
            return None

        status = data.status if data.status is not None else existing["status"]

        conn = get_db_connection()
        cursor = conn.cursor()
        query = """
        UPDATE appointments
        SET title = ?,
            description = ?,
            attendee = ?,
            category = ?,
            date = ?,
            start_time = ?,
            end_time = ?,
            status = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?;
        """
        cursor.execute(query, (
            data.title,
            data.description or "",
            data.attendee,
            data.category or existing["category"],
            data.date,
            data.start_time,
            data.end_time,
            status,
            appointment_id
        ))
        conn.commit()
        conn.close()

        return AppointmentRepository.get_by_id(appointment_id)

    @staticmethod
    def update_status(appointment_id: int, new_status: str) -> Optional[Dict[str, Any]]:
        """Update appointment status (scheduled, completed, cancelled)."""
        existing = AppointmentRepository.get_by_id(appointment_id)
        if not existing:
            return None

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
        UPDATE appointments
        SET status = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?;
        """, (new_status, appointment_id))
        conn.commit()
        conn.close()

        return AppointmentRepository.get_by_id(appointment_id)

    @staticmethod
    def delete(appointment_id: int) -> bool:
        """Delete an appointment by ID."""
        existing = AppointmentRepository.get_by_id(appointment_id)
        if not existing:
            return False

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM appointments WHERE id = ?;", (appointment_id,))
        conn.commit()
        conn.close()
        return True
