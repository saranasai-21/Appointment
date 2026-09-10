import React from 'react';
import { CalendarIcon, ClockIcon, UserIcon, EditIcon, CheckIcon, XIcon, RefreshIcon } from './Icons';

export default function AppointmentCard({ appointment, onEdit, onStatusChange }) {
  const { id, title, description, attendee, category, date, start_time, end_time, status } = appointment;

  const isCancelled = status === 'cancelled';
  const isCompleted = status === 'completed';
  const isScheduled = status === 'scheduled';

  return (
    <div
      id={`appointment-card-${id}`}
      className={`appointment-card ${isCancelled ? 'card-cancelled' : ''}`}
    >
      <div className="card-header">
        <span className="card-category-tag">{category || 'General'}</span>
        <span className={`card-status-badge badge-${status}`}>
          {isScheduled && <span className="status-dot dot-scheduled" />}
          {isCompleted && <CheckIcon size={12} />}
          {isCancelled && <XIcon size={12} />}
          {status}
        </span>
      </div>

      <h3 className="card-title" title={title}>{title}</h3>

      {description && (
        <p className="card-description" title={description}>
          {description}
        </p>
      )}

      <div className="card-meta-list">
        <div className="card-meta-item">
          <CalendarIcon size={14} />
          <span>{date}</span>
        </div>
        <div className="card-meta-item">
          <ClockIcon size={14} />
          <span className="card-time-slot">{start_time} - {end_time}</span>
        </div>
        <div className="card-meta-item">
          <UserIcon size={14} />
          <span>{attendee}</span>
        </div>
      </div>

      <div className="card-actions-footer">
        <button
          id={`btn-edit-${id}`}
          onClick={() => onEdit(appointment)}
          className="btn btn-secondary btn-sm"
          title="Edit appointment details"
        >
          <EditIcon size={13} />
          <span>Edit</span>
        </button>

        {isScheduled && (
          <>
            <button
              id={`btn-complete-${id}`}
              onClick={() => onStatusChange(id, 'completed')}
              className="btn btn-success btn-sm"
              title="Mark appointment as completed"
            >
              <CheckIcon size={13} />
              <span>Complete</span>
            </button>
            <button
              id={`btn-cancel-${id}`}
              onClick={() => onStatusChange(id, 'cancelled')}
              className="btn btn-danger btn-sm"
              title="Cancel appointment (slot will be freed)"
            >
              <XIcon size={13} />
              <span>Cancel</span>
            </button>
          </>
        )}

        {isCancelled && (
          <button
            id={`btn-reactivate-${id}`}
            onClick={() => onStatusChange(id, 'scheduled')}
            className="btn btn-secondary btn-sm"
            title="Reactivate appointment (checks slot availability)"
          >
            <RefreshIcon size={13} />
            <span>Reactivate</span>
          </button>
        )}

        {isCompleted && (
          <button
            id={`btn-reopen-${id}`}
            onClick={() => onStatusChange(id, 'scheduled')}
            className="btn btn-outline btn-sm"
            title="Reopen appointment"
          >
            <span>Reopen</span>
          </button>
        )}
      </div>
    </div>
  );
}
