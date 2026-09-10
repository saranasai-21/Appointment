import React from 'react';

export default function AppointmentCard({ appointment, onEdit, onStatusChange }) {
  const { id, title, description, attendee, category, date, start_time, end_time, status } = appointment;

  return (
    <div className={`card ${status === 'cancelled' ? 'card-cancelled' : ''}`}>
      <div className="card-top">
        <span className="card-category">{category || 'General'}</span>
        <span className={`badge badge-${status}`}>{status}</span>
      </div>

      <h3 className="card-title">{title}</h3>
      {description && <p className="card-desc">{description}</p>}

      <div className="card-meta">
        <span>📅 {date}</span>
        <span>🕐 {start_time} – {end_time}</span>
        <span>👤 {attendee}</span>
      </div>

      <div className="card-actions">
        <button className="btn btn-sm" onClick={() => onEdit(appointment)}>✏️ Edit</button>

        {status === 'scheduled' && (
          <>
            <button className="btn btn-sm btn-success" onClick={() => onStatusChange(id, 'completed')}>
              ✓ Complete
            </button>
            <button className="btn btn-sm btn-danger" onClick={() => onStatusChange(id, 'cancelled')}>
              ✕ Cancel
            </button>
          </>
        )}

        {status === 'cancelled' && (
          <button className="btn btn-sm" onClick={() => onStatusChange(id, 'scheduled')}>
            ↺ Reactivate
          </button>
        )}

        {status === 'completed' && (
          <button className="btn btn-sm" onClick={() => onStatusChange(id, 'scheduled')}>
            Reopen
          </button>
        )}
      </div>
    </div>
  );
}
