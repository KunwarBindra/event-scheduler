import React from 'react';
import '../styles/CalendarHeader.css';

/**
 * CalendarHeader renders a simplified header for the day view of the
 * scheduler.  It includes navigation arrows to move between days, a
 * formatted date display, and action buttons to create events or
 * add columns.  The header no longer shows a static "Day One" label
 * or an avatar; both will be supplied dynamically by the backend in
 * future iterations.  The export button has also been removed per
 * updated requirements.
 *
 * Props:
 *   currentDate (Date): The date currently being viewed.  It is
 *     formatted into a human-readable string.
 *   onDateNavigate (function): Invoked with a signed integer when
 *     navigating forwards or backwards a day.  A value of 1 moves to
 *     the next day while -1 goes to the previous day.
 *   onAddColumn (function): Called when the "Add Column" button is
 *     clicked.
 *   onNewEvent (function): Called when the "New Event" button is
 *     clicked.
 */
const CalendarHeader = ({ currentDate, onDateNavigate, onAddColumn, onNewEvent }) => {
  // Format the date into a human friendly string (e.g., October 7, 2025).
  const friendlyDate = currentDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="calendar-header">
      {/* Navigation and date display */}
      <div className="header-nav">
        <button
          className="nav-button"
          onClick={() => onDateNavigate(-1)}
          aria-label="Previous day"
        >
          ‹
        </button>
        <div className="date-display">{friendlyDate}</div>
        <button
          className="nav-button"
          onClick={() => onDateNavigate(1)}
          aria-label="Next day"
        >
          ›
        </button>
      </div>
      {/* Action buttons aligned to the right */}
      <div className="header-buttons">
        <button className="new-event-button" onClick={onNewEvent}>
          ＋ New Event
        </button>
        <button className="add-column-button" onClick={onAddColumn}>
          Add Column
        </button>
      </div>
    </div>
  );
};

export default CalendarHeader;