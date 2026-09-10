import React, { useState, useEffect, useCallback } from 'react';
import AppointmentCard from './components/AppointmentCard';
import AppointmentListView from './components/AppointmentListView';
import AppointmentModal from './components/AppointmentModal';
import ExplanationModal from './components/ExplanationModal';
import FilterBar from './components/FilterBar';
import {
  CalendarIcon,
  ClockIcon,
  CheckIcon,
  XIcon,
  PlusIcon,
  InfoIcon,
  AlertIcon,
  SunIcon,
  MoonIcon
} from './components/Icons';

export default function App() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);

  // Theme state: defaults to 'light' (White Premium Theme)
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('teamsync-theme') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('teamsync-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  // Filters & View mode
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [viewMode, setViewMode] = useState('board'); // 'board' or 'list'

  // Toast notification helper
  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const rawApiBase = import.meta.env.VITE_API_URL || '';
  const API_BASE = rawApiBase.replace(/\/+$/, '');

  // Fetch appointments from API
  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFilter) params.append('date', dateFilter);
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
      if (searchQuery) params.append('search', searchQuery);

      const res = await fetch(`${API_BASE}/api/appointments?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Failed to load appointments (status ${res.status})`);
      }
      const data = await res.json();
      setAppointments(data);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [dateFilter, statusFilter, searchQuery, showToast, API_BASE]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Handle Save (Add or Update)
  const handleSaveAppointment = async (formData, editingId) => {
    const url = editingId ? `${API_BASE}/api/appointments/${editingId}` : `${API_BASE}/api/appointments`;
    const method = editingId ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `Request failed with status ${res.status}`);
    }

    const saved = await res.json();
    showToast(
      editingId
        ? `Appointment "${saved.title}" successfully updated!`
        : `Appointment "${saved.title}" scheduled for ${saved.date} (${saved.start_time} - ${saved.end_time})!`,
      'success'
    );
    await fetchAppointments();
  };

  // Handle Status Update (Complete / Cancel / Reactivate)
  const handleStatusChange = async (appointmentId, newStatus) => {
    try {
      const res = await fetch(`${API_BASE}/api/appointments/${appointmentId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Failed to update status`);
      }

      const updated = await res.json();
      const statusLabel =
        newStatus === 'completed'
          ? 'marked as completed'
          : newStatus === 'cancelled'
          ? 'cancelled (time slot liberated)'
          : 'scheduled';

      showToast(`Appointment "${updated.title}" ${statusLabel}.`, 'success');
      await fetchAppointments();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Handle Reset Samples
  const handleResetSeed = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/appointments/reset-seed`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to reset sample data');
      setDateFilter('');
      setStatusFilter('all');
      setSearchQuery('');
      showToast('Database reset to pristine sample appointments.', 'info');
      await fetchAppointments();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Open modal for new appointment
  const handleOpenAddModal = () => {
    setEditingAppointment(null);
    setIsModalOpen(true);
  };

  // Open modal for editing
  const handleOpenEditModal = (appointment) => {
    setEditingAppointment(appointment);
    setIsModalOpen(true);
  };

  // Stats calculation
  const totalCount = appointments.length;
  const scheduledCount = appointments.filter((a) => a.status === 'scheduled').length;
  const completedCount = appointments.filter((a) => a.status === 'completed').length;
  const cancelledCount = appointments.filter((a) => a.status === 'cancelled').length;

  // Split appointments by status for Kanban Board
  const scheduledList = appointments.filter((a) => a.status === 'scheduled');
  const completedList = appointments.filter((a) => a.status === 'completed');
  const cancelledList = appointments.filter((a) => a.status === 'cancelled');

  return (
    <div className="app-layout">
      {/* Full Width Top Navigation Bar */}
      <header className="navbar-fullwidth">
        <div className="navbar-inner">
          <div className="brand-area">
            <div className="brand-titles">
              <h1 className="brand-heading">TeamSync Appointment Board</h1>
              <div className="brand-subtitle">
                <span>Small Team Scheduling System</span>
                <span className="brand-pill">FastAPI • SQL • React</span>
              </div>
            </div>
          </div>

          <div className="header-actions">
            <button
              id="btn-toggle-theme"
              type="button"
              className="btn-icon-toggle"
              onClick={toggleTheme}
              title={`Switch to ${theme === 'light' ? 'Dark' : 'White Premium'} Theme`}
              aria-label="Toggle visual theme"
            >
              {theme === 'light' ? <MoonIcon size={18} /> : <SunIcon size={18} />}
            </button>

            <button
              id="btn-open-about"
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsAboutOpen(true)}
              title="View system architecture, conflict logic & assumptions"
            >
              <InfoIcon size={16} />
              <span>About & Assumptions</span>
            </button>

            <button
              id="btn-add-appointment"
              type="button"
              className="btn btn-primary"
              onClick={handleOpenAddModal}
            >
              <PlusIcon size={18} />
              <span>Add Appointment</span>
            </button>
          </div>
        </div>
      </header>

      {/* Full Width Main Workspace Content */}
      <div className="app-main-content">

      {/* Metrics / Summary Cards */}
      <section className="stats-row" aria-label="Appointment metrics">
        <div className="stat-card">
          <div className="stat-icon-wrapper stat-icon-all">
            <CalendarIcon size={22} />
          </div>
          <div className="stat-info">
            <div className="stat-label">Total Appointments</div>
            <div className="stat-number">{totalCount}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper stat-icon-sched">
            <ClockIcon size={22} />
          </div>
          <div className="stat-info">
            <div className="stat-label">Scheduled / Upcoming</div>
            <div className="stat-number">{scheduledCount}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper stat-icon-comp">
            <CheckIcon size={22} />
          </div>
          <div className="stat-info">
            <div className="stat-label">Completed</div>
            <div className="stat-number">{completedCount}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper stat-icon-canc">
            <XIcon size={22} />
          </div>
          <div className="stat-info">
            <div className="stat-label">Cancelled (Slots Free)</div>
            <div className="stat-number">{cancelledCount}</div>
          </div>
        </div>
      </section>

      {/* Filter and View Controls */}
      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        dateFilter={dateFilter}
        onDateFilterChange={setDateFilter}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onResetSeed={handleResetSeed}
      />

      {/* Main Board / List Content */}
      <main>
        {loading && appointments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px', color: 'var(--text-dim)' }}>
            <p>Loading appointments from database...</p>
          </div>
        ) : viewMode === 'list' ? (
          <AppointmentListView
            appointments={appointments}
            onEdit={handleOpenEditModal}
            onStatusChange={handleStatusChange}
          />
        ) : (
          /* Kanban Board View */
          <div className="kanban-board">
            {/* Scheduled Column */}
            <div className="kanban-column" id="column-scheduled">
              <div className="kanban-column-header">
                <div className="column-title-wrapper">
                  <span className="status-dot dot-scheduled" />
                  <span className="column-title">Scheduled</span>
                </div>
                <span className="column-badge">{scheduledList.length}</span>
              </div>
              <div className="kanban-card-list">
                {scheduledList.length > 0 ? (
                  scheduledList.map((appt) => (
                    <AppointmentCard
                      key={appt.id}
                      appointment={appt}
                      onEdit={handleOpenEditModal}
                      onStatusChange={handleStatusChange}
                    />
                  ))
                ) : (
                  <div className="empty-column">
                    <p>No scheduled appointments.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Completed Column */}
            <div className="kanban-column" id="column-completed">
              <div className="kanban-column-header">
                <div className="column-title-wrapper">
                  <span className="status-dot dot-completed" />
                  <span className="column-title">Completed</span>
                </div>
                <span className="column-badge">{completedList.length}</span>
              </div>
              <div className="kanban-card-list">
                {completedList.length > 0 ? (
                  completedList.map((appt) => (
                    <AppointmentCard
                      key={appt.id}
                      appointment={appt}
                      onEdit={handleOpenEditModal}
                      onStatusChange={handleStatusChange}
                    />
                  ))
                ) : (
                  <div className="empty-column">
                    <p>No completed appointments yet.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Cancelled Column */}
            <div className="kanban-column" id="column-cancelled">
              <div className="kanban-column-header">
                <div className="column-title-wrapper">
                  <span className="status-dot dot-cancelled" />
                  <span className="column-title">Cancelled</span>
                </div>
                <span className="column-badge">{cancelledList.length}</span>
              </div>
              <div className="kanban-card-list">
                {cancelledList.length > 0 ? (
                  cancelledList.map((appt) => (
                    <AppointmentCard
                      key={appt.id}
                      appointment={appt}
                      onEdit={handleOpenEditModal}
                      onStatusChange={handleStatusChange}
                    />
                  ))
                ) : (
                  <div className="empty-column">
                    <p>No cancelled appointments.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Add / Edit Modal */}
      <AppointmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveAppointment}
        editingAppointment={editingAppointment}
      />

      {/* Explanation & Assumptions Modal */}
      <ExplanationModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
      />

      {/* Toast Notification Container */}
      <div className="toast-container" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            {toast.type === 'success' && <CheckIcon size={18} />}
            {toast.type === 'error' && <AlertIcon size={18} />}
            {toast.type === 'info' && <InfoIcon size={18} />}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
      </div>
    </div>
  );
}
