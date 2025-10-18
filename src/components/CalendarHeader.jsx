import React, { useRef, useState, useEffect } from 'react';
import '../styles/CalendarHeader.css';

/**
 * Header with: prev/next, big date label, New Event, Add Column,
 * and a modern Templates dropdown:
 *  - "Save Template" button
 *  - "Templates" menu where clicking a name immediately applies it
 *  - per-item delete icon inside the menu
 */
const CalendarHeader = ({
  currentDate,
  onDateNavigate,
  onAddColumn,
  onNewEvent,
  /** template props */
  templates = [],
  onSaveTemplate,
  onApplyTemplate,
  onDeleteTemplate,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const btnRef = useRef(null);

  const friendlyDate = currentDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // Close menu on outside click / ESC
  useEffect(() => {
    const onDocClick = (e) => {
      if (!menuOpen) return;
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        btnRef.current &&
        !btnRef.current.contains(e.target)
      ) {
        setMenuOpen(false);
      }
    };
    const onEsc = (e) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [menuOpen]);

  const applyTemplate = (name) => {
    if (!name) return;
    onApplyTemplate?.(name);
    setMenuOpen(false);
  };

  const deleteTemplate = (name, e) => {
    e.stopPropagation(); // don’t also apply
    const ok = window.confirm(`Delete template “${name}”?`);
    if (!ok) return;
    onDeleteTemplate?.(name);
  };

  return (
    <div className="calendar-header">
      {/* Left: navigation */}
      <div className="header-left">
        <button
          className="icon-button"
          onClick={() => onDateNavigate(-1)}
          aria-label="Previous day"
        >
          ‹
        </button>
        <div className="date-display" aria-live="polite">
          {friendlyDate}
        </div>
        <button
          className="icon-button"
          onClick={() => onDateNavigate(1)}
          aria-label="Next day"
        >
          ›
        </button>
      </div>

      {/* Right: actions */}
      <div className="header-right">
        {/* Save current day as template */}
        <button
          className="btn btn-secondary"
          onClick={onSaveTemplate}
          title="Save today's schedule as a template"
        >
          Save Template
        </button>

        {/* Templates dropdown */}
        <div className="templates">
          <button
            ref={btnRef}
            className="btn btn-light templates-trigger"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            title="Templates"
          >
            Agenda Templates
            <span className="caret" aria-hidden>▾</span>
          </button>

          {menuOpen && (
            <div
              ref={menuRef}
              className="templates-menu"
              role="menu"
              aria-label="Saved templates"
            >
              {templates.length === 0 ? (
                <div className="templates-empty" role="menuitem" aria-disabled="true">
                  No templates yet
                </div>
              ) : (
                templates.map((name) => (
                  <div
                    key={name}
                    className="templates-item"
                    role="menuitem"
                    tabIndex={0}
                    onClick={() => applyTemplate(name)}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && applyTemplate(name)}
                    title={`Apply “${name}”`}
                  >
                    <span className="templates-name">{name}</span>
                    <button
                      className="templates-delete"
                      aria-label={`Delete template ${name}`}
                      title="Delete"
                      onClick={(e) => deleteTemplate(name, e)}
                    >
                      {/* tiny trash can (unicode/emoji fallback) */}
                      <svg viewBox="0 0 24 24" className="trash" width="16" height="16" aria-hidden>
                        <path d="M9 3h6l1 2h4v2H4V5h4l1-2zm1 6h2v9h-2V9zm4 0h2v9h-2V9zM6 9h2v9H6V9z" fill="currentColor" />
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="divider" aria-hidden />

        <button className="btn btn-primary" onClick={onNewEvent}>
          ＋ New Event
        </button>
        <button className="btn btn-outline" onClick={onAddColumn}>
          Add Column
        </button>
      </div>
    </div>
  );
};

export default CalendarHeader;