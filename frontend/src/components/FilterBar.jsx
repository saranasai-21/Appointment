import React from 'react';
import { SearchIcon, BoardIcon, ListIcon, RefreshIcon } from './Icons';

export default function FilterBar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  dateFilter,
  onDateFilterChange,
  viewMode,
  onViewModeChange,
  onResetSeed
}) {
  const handleTodayClick = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    onDateFilterChange(todayStr);
  };

  const handleClearDate = () => {
    onDateFilterChange('');
  };

  return (
    <div className="toolbar-container">
      <div className="filter-group">
        {/* Keyword Search */}
        <div className="search-input-wrapper">
          <SearchIcon size={15} />
          <input
            id="filter-search-input"
            type="text"
            className="search-input"
            placeholder="Search by title, attendee, category..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {/* Status Filter */}
        <select
          id="filter-status-select"
          className="filter-select"
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="scheduled">Scheduled</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>

        {/* Date Filter & Quick Presets */}
        <div className="date-filter-group">
          <input
            id="filter-date-input"
            type="date"
            className="date-input"
            value={dateFilter}
            onChange={(e) => onDateFilterChange(e.target.value)}
            title="Filter by appointment date"
          />
          <button
            id="btn-filter-today"
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleTodayClick}
          >
            Today
          </button>
          {dateFilter && (
            <button
              id="btn-filter-clear-date"
              type="button"
              className="btn btn-outline btn-sm"
              onClick={handleClearDate}
            >
              Clear Date
            </button>
          )}
        </div>
      </div>

      <div className="filter-group">
        {/* Reset Sample Appointments */}
        <button
          id="btn-reset-sample-data"
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={onResetSeed}
          title="Reset sample appointments for testing"
        >
          <RefreshIcon size={13} />
          <span>Reset Samples</span>
        </button>

        {/* View Toggle: Board vs List */}
        <div className="view-mode-toggle" role="group" aria-label="View mode">
          <button
            id="btn-view-board"
            type="button"
            className={`view-btn ${viewMode === 'board' ? 'active' : ''}`}
            onClick={() => onViewModeChange('board')}
            title="Kanban Board View"
          >
            <BoardIcon size={14} />
            <span>Board</span>
          </button>
          <button
            id="btn-view-list"
            type="button"
            className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => onViewModeChange('list')}
            title="List Table View"
          >
            <ListIcon size={14} />
            <span>List</span>
          </button>
        </div>
      </div>
    </div>
  );
}
