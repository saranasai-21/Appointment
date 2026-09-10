import os
import sqlite3
from datetime import date, timedelta

# Use /tmp on Vercel since the filesystem is read-only
if os.environ.get("VERCEL"):
    DB_FILE = "/tmp/appointments.db"
else:
    DB_FILE = "appointments.db"


def get_db():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Create the table and add sample data if the database is empty."""
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS appointments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT DEFAULT '',
            attendee TEXT NOT NULL,
            category TEXT DEFAULT 'General',
            date TEXT NOT NULL,
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL,
            status TEXT DEFAULT 'scheduled',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()

    # only seed if empty
    count = conn.execute("SELECT COUNT(*) FROM appointments").fetchone()[0]
    if count == 0:
        _seed_samples(conn)
    conn.close()


def _seed_samples(conn):
    """Insert a few sample appointments so the board isn't empty on first load."""
    today = date.today()
    tmrw = today + timedelta(days=1)
    yesterday = today - timedelta(days=1)

    samples = [
        ("Sprint Planning", "Go over sprint goals and assign tickets.", "Engineering Team", "Sprint Planning", str(today), "09:30", "10:30", "scheduled"),
        ("Client Demo", "Show the analytics dashboard to the client.", "Sarah (Acme Corp)", "Client Meeting", str(today), "11:00", "12:00", "scheduled"),
        ("Code Review Session", "Review PRs for the scheduling module.", "Marcus", "Code Review", str(today), "14:00", "15:00", "scheduled"),
        ("DB Optimization", "Look at slow query logs.", "Database Team", "Tech Review", str(today), "16:00", "17:00", "cancelled"),
        ("1-on-1 with Lead", "Discuss project progress and goals.", "Elena (Lead)", "1-on-1", str(tmrw), "10:00", "10:45", "scheduled"),
        ("Design Review", "Figma mockup walkthrough for the new board.", "Design Team", "Design Review", str(tmrw), "13:30", "14:30", "scheduled"),
        ("Retrospective", "What went well, what didn't.", "All Hands", "Team Sync", str(yesterday), "15:00", "16:00", "completed"),
        ("Security Audit Sync", "Quarterly dependency check.", "Security Team", "Security", str(yesterday), "11:00", "12:00", "completed"),
    ]

    conn.executemany("""
        INSERT INTO appointments (title, description, attendee, category, date, start_time, end_time, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, samples)
    conn.commit()


def reset_db():
    """Drop everything and recreate with fresh sample data."""
    conn = get_db()
    conn.execute("DROP TABLE IF EXISTS appointments")
    conn.commit()
    conn.close()
    init_db()
