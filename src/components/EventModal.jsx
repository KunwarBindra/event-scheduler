import React, { useEffect, useMemo, useState } from 'react';
import '../styles/EventModal.css';

/**
 * Formats a Date to a "datetime-local" string in local time: YYYY-MM-DDTHH:mm
 */
const formatDateTimeLocal = (date) => {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
};

/**
 * A modern, accessible event modal with:
 * - Responsive two-column grid for Start/End
 * - Chip-style multi-select for columns (resources)
 * - Overlay + ESC to close
 * - Inline validation (title, time order, at least one column)
 * - Optional defaultResourceIds for new-event preselection
 */
const EventModal = ({
  event,
  start,
  end,
  resources,
  onClose,
  onSave,
  defaultResourceIds = [],
}) => {
  const isEditMode = Boolean(event);

  // Resolve initial resource selection
  const initialSelected = useMemo(() => {
    if (isEditMode && event) {
      // FullCalendar event object
      const fromApi = typeof event.getResources === 'function'
        ? event.getResources().map((r) => r.id)
        : (event.resourceIds || []);
      return fromApi && fromApi.length ? fromApi : defaultResourceIds;
    }
    return defaultResourceIds.length
      ? defaultResourceIds
      : resources.map((r) => r.id); // fallback: select all
  }, [isEditMode, event, defaultResourceIds, resources]);

  // State
  const [title, setTitle] = useState(isEditMode ? event.title || '' : '');
  const [startTime, setStartTime] = useState(formatDateTimeLocal(start));
  const [endTime, setEndTime] = useState(formatDateTimeLocal(end));
  const [selectedResources, setSelectedResources] = useState(initialSelected);

  // Inline errors
  const [errors, setErrors] = useState({});

  // Keep times in sync if parent changes (e.g., user reopens modal with new range)
  useEffect(() => {
    setStartTime(formatDateTimeLocal(start));
  }, [start]);
  useEffect(() => {
    setEndTime(formatDateTimeLocal(end));
  }, [end]);

  // ESC to close
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const toggleResource = (id) => {
    setSelectedResources((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => setSelectedResources(resources.map((r) => r.id));
  const clearAll = () => setSelectedResources([]);

  const validate = () => {
    const err = {};
    const s = new Date(startTime);
    const e = new Date(endTime);

    if (!title.trim()) err.title = 'Title is required.';
    if (!(s instanceof Date) || Number.isNaN(s.getTime())) err.start = 'Invalid start time.';
    if (!(e instanceof Date) || Number.isNaN(e.getTime())) err.end = 'Invalid end time.';
    if (!err.start && !err.end && e <= s) err.end = 'End must be after start.';
    if (!selectedResources.length) err.resources = 'Select at least one column.';
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({
      id: isEditMode ? event.id : undefined,
      title: title.trim(),
      start: new Date(startTime),
      end: new Date(endTime),
      resourceIds: selectedResources,
    });
  };

  // Close on overlay click (but not when clicking inside the card)
  const onOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="modal-overlay modern" onClick={onOverlayClick} role="dialog" aria-modal="true">
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-wrap">
            <div className="modal-icon" aria-hidden="true">🗓️</div>
            <h2 className="modal-title">{isEditMode ? 'Edit Event' : 'New Event'}</h2>
          </div>
          <button
            className="icon-btn"
            aria-label="Close"
            title="Close"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Title */}
          <div className={`field ${errors.title ? 'has-error' : ''}`}>
            <label htmlFor="evt-title">Title</label>
            <input
              id="evt-title"
              type="text"
              placeholder="Enter a descriptive title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            {errors.title && <p className="error-text">{errors.title}</p>}
          </div>

          {/* Time grid */}
          <div className="grid-2">
            <div className={`field ${errors.start ? 'has-error' : ''}`}>
              <label htmlFor="evt-start">Start</label>
              <input
                id="evt-start"
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
              {errors.start && <p className="error-text">{errors.start}</p>}
            </div>
            <div className={`field ${errors.end ? 'has-error' : ''}`}>
              <label htmlFor="evt-end">End</label>
              <input
                id="evt-end"
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
              {errors.end && <p className="error-text">{errors.end}</p>}
            </div>
          </div>

          {/* Columns */}
          <div className={`field ${errors.resources ? 'has-error' : ''}`}>
            <div className="label-row">
              <label>Columns</label>
              <div className="label-actions">
                <button type="button" className="link-btn" onClick={selectAll}>
                  Select all
                </button>
                <span className="dot">·</span>
                <button type="button" className="link-btn" onClick={clearAll}>
                  Clear
                </button>
              </div>
            </div>

            <div className="chip-list" role="group" aria-label="Columns">
              {resources.map((res) => {
                const checked = selectedResources.includes(res.id);
                return (
                  <label
                    key={res.id}
                    className={`chip ${checked ? 'is-selected' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleResource(res.id)}
                    />
                    <span className="chip-label">{res.title}</span>
                  </label>
                );
              })}
            </div>
            {errors.resources && <p className="error-text">{errors.resources}</p>}
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
};

export default EventModal;