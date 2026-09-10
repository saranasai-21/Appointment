import React from 'react';
import { CalendarIcon, ClockIcon, UserIcon, EditIcon, CheckIcon, XIcon, RefreshIcon } from './Icons';

export default function AppointmentListView({ appointments, onEdit, onStatusChange }) {
  if (!appointments || appointments.length === 0) {
    return (
      <div className="list-view-container" style={{ padding: '48px 24px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-dim)', fontSize: '15px' }}>
          No appointments found matching the selected filters.
        </p>
      </div>
    );
  }

  return (
    <div className="list-view-container">
      <table className="appointments-table">
        <thead>
          <tr>
            <th>Appointment Details</th>
            <th>Category</th>
            <th>Date & Time</th>
            <th>Attendee</th>
            <th>Status</th>
            <th style={{ textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {appointments.map((appt) => {
            const { id, title, description, category, date, start_time, end_time, attendee, status } = appt;
            const isCancelled = status === 'cancelled';
            const isScheduled = status === 'scheduled';
            const isCompleted = status === 'completed';

            return (
              <tr
                key={id}
                id={`table-row-${id}`}
                className={isCancelled ? 'table-row-cancelled' : ''}
              >
                <td style={{ maxWidth: '300px' }}>
                  <div className="table-title">{title}</div>
                  {description && <div className="table-desc">{description}</div>}
                </td>
                <td>
                  <span className="card-category-tag">{category || 'General'}</span>
                </td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                      <CalendarIcon size={12} /> {date}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#c7d2fe' }}>
                      <ClockIcon size={12} /> {start_time} - {end_time}
                    </span>
                  </div>
                </td>
                <td>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                    <UserIcon size={12} /> {attendee}
                  </span>
                </td>
                <td>
                  <span className={`card-status-badge badge-${status}`}>
                    {isScheduled && <span className="status-dot dot-scheduled" />}
                    {isCompleted && <CheckIcon size={11} />}
                    {isCancelled && <XIcon size={11} />}
                    {status}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                    <button
                      id={`list-btn-edit-${id}`}
                      onClick={() => onEdit(appt)}
                      className="btn btn-secondary btn-sm"
                      title="Edit appointment"
                    >
                      <EditIcon size={12} />
                    </button>

                    {isScheduled && (
                      <>
                        <button
                          id={`list-btn-complete-${id}`}
                          onClick={() => onStatusChange(id, 'completed')}
                          className="btn btn-success btn-sm"
                          title="Mark as completed"
                        >
                          <CheckIcon size={12} />
                        </button>
                        <button
                          id={`list-btn-cancel-${id}`}
                          onClick={() => onStatusChange(id, 'cancelled')}
                          className="btn btn-danger btn-sm"
                          title="Cancel appointment"
                        >
                          <XIcon size={12} />
                        </button>
                      </>
                    )}

                    {isCancelled && (
                      <button
                        id={`list-btn-reactivate-${id}`}
                        onClick={() => onStatusChange(id, 'scheduled')}
                        className="btn btn-secondary btn-sm"
                        title="Reactivate appointment"
                      >
                        <RefreshIcon size={12} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
