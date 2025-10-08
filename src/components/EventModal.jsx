import React, { useState } from 'react';
import '../styles/EventModal.css';

/**
 * EventModal renders a simple overlay form for creating or editing events.
 * It accepts an existing event (for editing), start and end times for
 * prepopulating fields, the list of available resources, and callbacks for
 * closing and saving.  It uses native form elements and basic validation.
 */
// Formats a Date object into a string suitable for the value of a
// datetime-local input (YYYY-MM-DDTHH:MM) in the user's local time.
const formatDateTimeLocal = (date) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const EventModal = ({ event, start, end, resources, onClose, onSave }) => {
  const isEditMode = Boolean(event);
  const [title, setTitle] = useState(event ? event.title : '');
  const [startTime, setStartTime] = useState(
    formatDateTimeLocal(new Date(start))
  );
  const [endTime, setEndTime] = useState(
    formatDateTimeLocal(new Date(end))
  );
  const [selectedResources, setSelectedResources] = useState(
    event ? event.getResources().map((r) => r.id) : resources.map((r) => r.id)
  );

  // Handler for saving the event. It performs basic validation and then
  // delegates to the parent callback. Dates are converted from ISO strings
  // back to Date objects.
  const handleSave = () => {
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);
    if (!title.trim()) {
      alert('Please enter a title.');
      return;
    }
    if (endDate <= startDate) {
      alert('End time must be after start time.');
      return;
    }
    const payload = {
      id: isEditMode ? event.id : undefined,
      title: title.trim(),
      start: startDate,
      end: endDate,
      resourceIds: selectedResources,
    };
    onSave(payload);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>{isEditMode ? 'Edit Event' : 'New Event'}</h2>
        <div className="form-group">
          <label>Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Event title"
          />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Start</label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>End</label>
            <input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
        </div>
        <div className="form-group">
          <label>Columns (select one or more)</label>
          <select
            multiple
            value={selectedResources}
            onChange={(e) => {
              const options = Array.from(e.target.options);
              const values = options
                .filter((opt) => opt.selected)
                .map((opt) => opt.value);
              setSelectedResources(values);
            }}
          >
            {resources.map((res) => (
              <option key={res.id} value={res.id}>
                {res.title}
              </option>
            ))}
          </select>
        </div>
        <div className="modal-actions">
          <button className="save-button" onClick={handleSave}>
            Save
          </button>
          <button className="cancel-button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventModal;