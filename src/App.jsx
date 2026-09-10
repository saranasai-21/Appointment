import React, { useState, useEffect } from 'react';
import AppointmentCard from './components/AppointmentCard';
import AppointmentModal from './components/AppointmentModal';
import './index.css';

const API = '';  // same origin

export default function App() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [toast, setToast] = useState(null);

  // filters
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchAppointments = async () => {
    try {
      const params = new URLSearchParams();
      if (dateFilter) params.append('date', dateFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (search) params.append('search', search);

      const res = await fetch(`${API}/api/appointments?${params}`);
      if (!res.ok) throw new Error('Failed to load');
      setAppointments(await res.json());
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAppointments(); }, [dateFilter, statusFilter, search]);

  const handleSave = async (formData, id) => {
    const url = id ? `${API}/api/appointments/${id}` : `${API}/api/appointments`;
    const res = await fetch(url, {
      method: id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Something went wrong');
    }
    showToast(id ? 'Appointment updated!' : 'Appointment created!');
    fetchAppointments();
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      const res = await fetch(`${API}/api/appointments/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to update');
      }
      const label = newStatus === 'completed' ? 'completed' : newStatus === 'cancelled' ? 'cancelled' : 'reactivated';
      showToast(`Appointment ${label}!`);
      fetchAppointments();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleReset = async () => {
    await fetch(`${API}/api/appointments/reset-seed`, { method: 'POST' });
    setDateFilter('');
    setStatusFilter('all');
    setSearch('');
    showToast('Board reset to sample data', 'info');
    fetchAppointments();
  };

  // split by status for kanban columns
  const scheduled = appointments.filter(a => a.status === 'scheduled');
  const completed = appointments.filter(a => a.status === 'completed');
  const cancelled = appointments.filter(a => a.status === 'cancelled');

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div>
          <h1>Appointment Board</h1>
          <p className="subtitle">Team scheduling with conflict prevention</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setModalOpen(true); }}>
          + Add Appointment
        </button>
      </header>

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-card">
          <span className="stat-num">{appointments.length}</span>
          <span className="stat-label">Total</span>
        </div>
        <div className="stat-card stat-scheduled">
          <span className="stat-num">{scheduled.length}</span>
          <span className="stat-label">Scheduled</span>
        </div>
        <div className="stat-card stat-completed">
          <span className="stat-num">{completed.length}</span>
          <span className="stat-label">Completed</span>
        </div>
        <div className="stat-card stat-cancelled">
          <span className="stat-num">{cancelled.length}</span>
          <span className="stat-label">Cancelled</span>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <input
          type="text"
          placeholder="Search appointments..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="search-input"
        />
        <input
          type="date"
          value={dateFilter}
          onChange={e => setDateFilter(e.target.value)}
        />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">All Statuses</option>
          <option value="scheduled">Scheduled</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        {(dateFilter || statusFilter !== 'all' || search) && (
          <button className="btn btn-secondary" onClick={() => { setDateFilter(''); setStatusFilter('all'); setSearch(''); }}>
            Clear Filters
          </button>
        )}
        <button className="btn btn-secondary" onClick={handleReset} title="Reset to sample data">
          ↺ Reset
        </button>
      </div>

      {/* Kanban Board */}
      {loading ? (
        <p style={{ textAlign: 'center', padding: '40px', color: '#888' }}>Loading...</p>
      ) : (
        <div className="kanban-board">
          {[
            { title: 'Scheduled', items: scheduled, status: 'scheduled' },
            { title: 'Completed', items: completed, status: 'completed' },
            { title: 'Cancelled', items: cancelled, status: 'cancelled' },
          ].map(col => (
            <div key={col.status} className="kanban-column">
              <div className="column-header">
                <span className={`dot dot-${col.status}`}></span>
                <h2>{col.title}</h2>
                <span className="column-count">{col.items.length}</span>
              </div>
              <div className="column-cards">
                {col.items.length > 0 ? col.items.map(appt => (
                  <AppointmentCard
                    key={appt.id}
                    appointment={appt}
                    onEdit={(a) => { setEditing(a); setModalOpen(true); }}
                    onStatusChange={handleStatusChange}
                  />
                )) : (
                  <p className="empty-msg">No {col.title.toLowerCase()} appointments</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <AppointmentModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        editingAppointment={editing}
      />

      {/* Toast */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
