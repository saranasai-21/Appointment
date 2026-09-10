import os
import sqlite3
from datetime import datetime, date, timedelta
from typing import Dict, Any, List

# Support writable /tmp directory when deployed on Vercel serverless functions
if os.environ.get("VERCEL"):
    DB_FILE = os.environ.get("DB_FILE", "/tmp/appointments.db")
else:
    DB_FILE = os.environ.get("DB_FILE", "appointments.db")

def get_db_connection():
    """Create and return a SQLite database connection with row dictionary access."""
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_db():
    """Initialize the appointments table and seed initial sample data if empty."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS appointments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title VARCHAR(150) NOT NULL,
        description TEXT,
        attendee VARCHAR(100) NOT NULL,
        category VARCHAR(50) DEFAULT 'Team Sync',
        date VARCHAR(10) NOT NULL,
        start_time VARCHAR(5) NOT NULL,
        end_time VARCHAR(5) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    cursor.execute("CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);")
    conn.commit()

    # Check if table has data
    cursor.execute("SELECT COUNT(*) as count FROM appointments;")
    count = cursor.fetchone()["count"]

    if count == 0:
        seed_sample_data(conn)

    conn.close()

def seed_sample_data(conn=None):
    """Seed sample team appointments relative to today's date."""
    should_close = False
    if conn is None:
        conn = get_db_connection()
        should_close = True

    today = date.today()
    d_today = today.strftime("%Y-%m-%d")
    d_tomorrow = (today + timedelta(days=1)).strftime("%Y-%m-%d")
    d_yesterday = (today - timedelta(days=1)).strftime("%Y-%m-%d")
    d_plus2 = (today + timedelta(days=2)).strftime("%Y-%m-%d")

    sample_appointments = [
        (
            "Sprint Planning & Backlog Grooming",
            "Review sprint goals, estimate user stories, and assign backlog tickets for upcoming release cycle.",
            "Engineering Team (Alex, Priya, David)",
            "Sprint Planning",
            d_today,
            "09:30",
            "10:30",
            "completed"
        ),
        (
            "Client Roadmap Demo & Q3 Feedback",
            "Demonstrate the new analytics dashboard and gather stakeholder feedback for Q3 milestones.",
            "Sarah Jenkins (Acme Corp)",
            "Client Meeting",
            d_today,
            "11:00",
            "12:00",
            "scheduled"
        ),
        (
            "Frontend Architecture & Component Refactor",
            "Discuss migration to responsive design tokens and reusable modal dialog components.",
            "Marcus Vance (Senior FE)",
            "Tech Architecture",
            d_today,
            "14:00",
            "15:00",
            "scheduled"
        ),
        (
            "PostgreSQL Index Optimization Check-in",
            "Analyze slow query logs, review composite indices, and discuss connection pooling settings.",
            "Database Team",
            "Performance Review",
            d_today,
            "16:00",
            "17:00",
            "cancelled"
        ),
        (
            "Weekly 1-on-1 Mentorship & Goal Review",
            "Discuss intern project milestones, code review etiquette, and system architecture learning.",
            "Elena Rostova (Engineering Lead)",
            "1-on-1",
            d_tomorrow,
            "10:00",
            "10:45",
            "scheduled"
        ),
        (
            "Cross-Functional UX/UI Design Critique",
            "Walkthrough high-fidelity Figma mockups for the new team scheduling board layout.",
            "Design Studio Team",
            "Design Review",
            d_tomorrow,
            "13:30",
            "14:30",
            "scheduled"
        ),
        (
            "Security & Vulnerability Audit Sync",
            "Quarterly dependency audit, token rotation guidelines, and OWASP compliance checklist.",
            "CyberSec Working Group",
            "Security",
            d_plus2,
            "11:00",
            "12:00",
            "scheduled"
        ),
        (
            "Sprint Retrospective: What went well",
            "Team retrospective covering past deployment retro, blockers resolved, and action items.",
            "All Hands / Team",
            "Team Sync",
            d_yesterday,
            "15:00",
            "16:00",
            "completed"
        )
    ]

    cursor = conn.cursor()
    cursor.executemany("""
    INSERT INTO appointments (title, description, attendee, category, date, start_time, end_time, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    """, sample_appointments)
    conn.commit()

    if should_close:
        conn.close()

def reset_database():
    """Helper to wipe and re-seed database with pristine sample data."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DROP TABLE IF EXISTS appointments;")
    conn.commit()
    conn.close()
    init_db()
