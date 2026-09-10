import React, { useState, useEffect } from 'react';

const CATEGORIES = ['General', 'Team Sync', 'Client Meeting', 'Code Review', '1-on-1', 'Sprint Planning', 'Design Review'];

export default function AppointmentModal({ isOpen, onClose, onSave, editingAppointment }) {
  const [form, setForm] = useState({
    title: '', description: '', attendee: '', category: 'General',
    date: '', start_time: '10:00', end_time: '11:00',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingAppointment) {
      setForm({
        title: editingAppointment.title || '',
        description: editingAppointment.description || '',
        attendee: editingAppointment.attendee || '',
        category: editingAppointment.category || 'General',
        date: editingAppointment.date || '',
        start_time: editingAppointment.start_time || '10:00',
        end_time: editingAppointment.end_time || '11:00',
      });
    } else {
      setForm({
        title: '', description: '', attendee: '', category: 'General',
        date: new Date().toISOString().split('T')[0],
        start_time: '10:00', end_time: '11:00',
      });
    }
    setError('');
  }, [editingAppointment, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError(''); // clear error when user types
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // basic checks
    if (!form.title.trim()) return setError('Title is required');
    if (!form.attendee.trim()) return setError('Attendee is required');
    if (!form.date) return setError('Date is required');
    if (form.end_time <= form.start_time) return setError('End time must be after start time');

    setSaving(true);
    try {
      await onSave(form, editingAppointment?.id);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>{editingAppointment ? 'Edit Appointment' : 'New Appointment'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {error && <div className="error-box">⚠️ {error}</div>}

        <form onSubmit={handleSubmit}>
          <label>
            Title *
            <input name="title" value={form.title} onChange={handleChange} required maxLength={150} placeholder="e.g. Sprint Planning" />
          </label>

          <div className="form-row">
            <label>
              Attendee *
              <input name="attendee" value={form.attendee} onChange={handleChange} required maxLength={100} placeholder="e.g. Engineering Team" />
            </label>
            <label>
              Category
              <select name="category" value={form.category} onChange={handleChange}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </label>
          </div>

          <label>
            Date *
            <input type="date" name="date" value={form.date} onChange={handleChange} required />
          </label>

          <div className="form-row">
            <label>
              Start Time *
              <input type="time" name="start_time" value={form.start_time} onChange={handleChange} required />
            </label>
            <label>
              End Time *
              <input type="time" name="end_time" value={form.end_time} onChange={handleChange} required />
            </label>
          </div>

          <label>
            Description
            <textarea name="description" value={form.description} onChange={handleChange} rows={3} placeholder="Optional notes or agenda..." />
          </label>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : editingAppointment ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
