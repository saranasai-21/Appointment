import React from 'react';
import { XIcon, InfoIcon, CheckIcon, AlertIcon } from './Icons';

export default function ExplanationModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-dialog" style={{ maxWidth: '680px' }} role="dialog" aria-modal="true">
        <div className="modal-header">
          <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <InfoIcon size={22} />
            <span>Application Architecture & Assumptions</span>
          </h2>
          <button
            id="btn-close-about-modal"
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <XIcon size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ gap: '22px' }}>
          {/* Section 1: How the Application Works */}
          <div className="doc-section">
            <h3>1. How the Application Works</h3>
            <p>
              This Appointment Board is built with an <strong>80% Python (FastAPI + SQL)</strong> backend
              and a <strong>20% React</strong> frontend to manage a team schedule reliably:
            </p>
            <ul>
              <li>
                <strong>Kanban & List Views:</strong> Appointments are organized into 3 columns by status:
                <em> Scheduled</em>, <em>Completed</em>, and <em>Cancelled</em>, or displayed as a sortable table.
              </li>
              <li>
                <strong>Filtering:</strong> Filter by date (today, tomorrow, custom calendar date) and status, with instant keyword search across titles, descriptions, and attendees.
              </li>
              <li>
                <strong>Full Lifecycle Actions:</strong> Quickly mark appointments as <em>Completed</em>, <em>Cancelled</em>, or edit timing and attendees in real-time.
              </li>
            </ul>
          </div>

          {/* Section 2: Overlap Prevention Algorithm */}
          <div className="doc-section">
            <h3>2. Time-Slot Conflict Detection</h3>
            <p>
              The application strictly guarantees that no two active appointments occupy the same time slot on the same date.
              Two intervals <code>[S1, E1)</code> and <code>[S2, E2)</code> overlap if and only if:
            </p>
            <div className="code-snippet">
              {`-- Parameterized SQL Conflict Query executed on POST/PUT:
SELECT id, title, start_time, end_time, status
FROM appointments
WHERE date = :target_date
  AND status != 'cancelled'
  AND (:exclude_id IS NULL OR id != :exclude_id)
  AND (start_time < :new_end_time AND end_time > :new_start_time);`}
            </div>
            <p style={{ marginTop: '6px' }}>
              <strong>Back-to-back appointments:</strong> An appointment ending at 11:00 and another starting at 11:00 do <em>not</em> overlap and are allowed.
            </p>
          </div>

          {/* Section 3: Assumptions Made */}
          <div className="doc-section">
            <h3>3. Key Assumptions Made</h3>
            <ul>
              <li>
                <strong>Cancelled Slots are Reusable:</strong> When an appointment is cancelled, it remains visible on the board (with distinctive strike-through and badge) for team auditability, but its time slot is immediately liberated so teammates can rebook that slot.
              </li>
              <li>
                <strong>Self-Exclusion on Edit:</strong> When updating an existing appointment's details (e.g. changing title or description), the conflict detection excludes the current appointment ID to prevent false-positive self-collisions.
              </li>
              <li>
                <strong>Single-Day Boundaries:</strong> Team meetings are assumed to begin and end within the same 24-hour day (e.g., 09:00 to 17:00).
              </li>
              <li>
                <strong>SQL Portability:</strong> The data layer uses standard SQL queries with parameterized binds. It runs on SQLite out-of-the-box with zero setup, and is fully compatible with PostgreSQL or MySQL by setting the connection string.
              </li>
            </ul>
          </div>
        </div>

        <div className="modal-footer">
          <button
            id="btn-understand-about"
            type="button"
            className="btn btn-primary"
            onClick={onClose}
          >
            Got it, thanks!
          </button>
        </div>
      </div>
    </div>
  );
}
