import React, { useState, useEffect } from 'react';
import { XIcon, AlertIcon } from './Icons';

const CATEGORIES = [
  'Team Sync',
  'Client Meeting',
  'Code Review',
  '1-on-1',
  'Sprint Planning',
  'Design Review',
  'Tech Architecture',
  'General'
];

export default function AppointmentModal({ isOpen, onClose, onSave, editingAppointment }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    attendee: '',
    category: 'Team Sync',
    date: new Date().toISOString().split('T')[0],
    start_time: '10:00',
    end_time: '11:00',
  });

  const [clientError, setClientError] = useState('');
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingAppointment) {
      setFormData({
        title: editingAppointment.title || '',
        description: editingAppointment.description || '',
        attendee: editingAppointment.attendee || '',
        category: editingAppointment.category || 'Team Sync',
        date: editingAppointment.date || new Date().toISOString().split('T')[0],
        start_time: editingAppointment.start_time || '10:00',
        end_time: editingAppointment.end_time || '11:00',
      });
    } else {
      // Default new appointment state
      setFormData({
        title: '',
        description: '',
        attendee: '',
        category: 'Team Sync',
        date: new Date().toISOString().split('T')[0],
        start_time: '10:00',
        end_time: '11:00',
      });
    }
    setClientError('');
    setServerError('');
  }, [editingAppointment, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updated = { ...formData, [name]: value };
    setFormData(updated);

    // Dynamic instant validation
    if (updated.start_time && updated.end_time) {
      if (updated.end_time <= updated.start_time) {
        setClientError(`End time (${updated.end_time}) must be strictly after start time (${updated.start_time}).`);
      } else {
        setClientError('');
      }
    }
    // Clear previous server error once user adjusts
    setServerError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setClientError('');
    setServerError('');

    // Pre-flight checks
    if (!formData.title.trim()) {
      setClientError('Title is required.');
      return;
    }
    if (!formData.attendee.trim()) {
      setClientError('Attendee name is required.');
      return;
    }
    if (!formData.date) {
      setClientError('Date is required.');
      return;
    }
    if (!formData.start_time || !formData.end_time) {
      setClientError('Start time and end time are required.');
      return;
    }
    if (formData.end_time <= formData.start_time) {
      setClientError(`End time (${formData.end_time}) must be strictly after start time (${formData.start_time}).`);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(formData, editingAppointment ? editingAppointment.id : null);
      onClose();
    } catch (err) {
      // Handle 409 conflict or validation error from backend
      setServerError(err.message || 'Failed to save appointment. Please check your inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-dialog" role="dialog" aria-modal="true">
        <div className="modal-header">
          <h2 className="modal-title">
            {editingAppointment ? 'Edit Appointment' : 'Add New Appointment'}
          </h2>
          <button
            id="btn-close-modal"
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <XIcon size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {(clientError || serverError) && (
              <div id="modal-conflict-alert" className="conflict-alert-box">
                <AlertIcon size={18} />
                <div>
                  <strong>{serverError ? 'Scheduling Conflict / Server Error:' : 'Validation Warning:'}</strong>
                  <p>{serverError || clientError}</p>
                </div>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="input-title" className="form-label">
                Appointment Title *
              </label>
              <input
                id="input-title"
                name="title"
                type="text"
                className="form-input"
                placeholder="e.g. Q3 Roadmap Review with Product Team"
                value={formData.title}
                onChange={handleChange}
                required
                maxLength={150}
              />
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label htmlFor="input-attendee" className="form-label">
                  Attendee / Client Name *
                </label>
                <input
                  id="input-attendee"
                  name="attendee"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Elena Rostova or Acme Corp"
                  value={formData.attendee}
                  onChange={handleChange}
                  required
                  maxLength={100}
                />
              </div>

              <div className="form-group">
                <label htmlFor="input-category" className="form-label">
                  Category
                </label>
                <select
                  id="input-category"
                  name="category"
                  className="form-select"
                  value={formData.category}
                  onChange={handleChange}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="input-date" className="form-label">
                Date *
              </label>
              <input
                id="input-date"
                name="date"
                type="date"
                className="form-input"
                value={formData.date}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label htmlFor="input-start-time" className="form-label">
                  Start Time *
                </label>
                <input
                  id="input-start-time"
                  name="start_time"
                  type="time"
                  className="form-input"
                  value={formData.start_time}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="input-end-time" className="form-label">
                  End Time *
                </label>
                <input
                  id="input-end-time"
                  name="end_time"
                  type="time"
                  className="form-input"
                  value={formData.end_time}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="input-description" className="form-label">
                Description / Agenda
              </label>
              <textarea
                id="input-description"
                name="description"
                className="form-textarea"
                placeholder="Key meeting objectives, discussion items, links..."
                value={formData.description}
                onChange={handleChange}
                rows={3}
                maxLength={1000}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button
              id="btn-cancel-modal"
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              id="btn-save-appointment"
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting || Boolean(clientError)}
            >
              {isSubmitting ? 'Saving...' : editingAppointment ? 'Update Appointment' : 'Create Appointment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
