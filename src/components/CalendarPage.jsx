import React, { useState, useRef, useMemo, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import resourceTimeGridPlugin from '@fullcalendar/resource-timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import CalendarHeader from './CalendarHeader';
import EventModal from './EventModal';
import { addMinutes } from '../lib/calendarUtils';

import '../styles/Calendar.css';

/**
 * CalendarPage sets up the daily scheduler with resource columns. It manages
 * state for resources (columns), events, and modal visibility.  The FullCalendar
 * component is configured with the Scheduler plugin to display a single day
 * view with vertical resources.  Drag and drop, event creation and editing
 * are all handled here.
 */
const CalendarPage = () => {
  // Define initial events once. Having a separate constant helps compute
  // a unique starting ID for new events based on the existing length.
  const initialEvents = [
    {
      id: 'e1',
      resourceIds: ['1', '2', '3'],
      title: 'Operating Meeting',
      start: new Date(new Date().setHours(8, 0, 0, 0)),
      end: new Date(new Date().setHours(9, 0, 0, 0)),
      extendedProps: { details: ['Program Compliance Review'] },
    },
    {
      id: 'e2',
      resourceIds: ['1'],
      title: 'Covid‑19',
      start: new Date(new Date().setHours(9, 0, 0, 0)),
      end: new Date(new Date().setHours(10, 0, 0, 0)),
      extendedProps: { details: ['Program Compliance Review'] },
    },
    {
      id: 'e3',
      resourceIds: ['1'],
      title: 'Quality Management System',
      start: new Date(new Date().setHours(10, 0, 0, 0)),
      end: new Date(new Date().setHours(11, 30, 0, 0)),
      extendedProps: {
        details: ['Quality Operations', 'Project Review', 'Data Analysis and QC'],
      },
    },
    {
      id: 'e4',
      resourceIds: ['1'],
      title: 'Patient Grievance Process',
      start: new Date(new Date().setHours(12, 0, 0, 0)),
      end: new Date(new Date().setHours(12, 30, 0, 0)),
      extendedProps: { details: ['Process Review'] },
    },
  ];

  // Initialize events state from the initialEvents constant.
  const [events, setEvents] = useState(initialEvents);

  // Use the length of initial events to start the eventIdCounter. This prevents
  // collisions with existing IDs like 'e1', 'e2', etc. New events will
  // receive incrementing IDs (e5, e6, ...).
  const [eventIdCounter, setEventIdCounter] = useState(initialEvents.length + 1);

  // Unique ID counter for resources. If new columns are added, they
  // receive sequential numeric IDs.
  const [resourceIdCounter, setResourceIdCounter] = useState(4);

  // Resources represent columns. Each has an id, title, and people list.
  const [resources, setResources] = useState([
    { id: '1', title: 'Generalist', people: ['Lisa Rodriguez'] },
    {
      id: '2',
      title: 'Clinical',
      people: ['Lisa Rodriguez', 'Lisa Rodriguez', 'Lisa Rodriguez'],
    },
    { id: '3', title: 'Physical Environment', people: ['Lisa Rodriguez'] },
  ]);

  // Current date displayed in the calendar. Only a single day is shown.
  const [currentDate, setCurrentDate] = useState(new Date());

  // Compute the default scroll time: two hours before the current time.
  // If the subtraction would go into the previous day, clamp to midnight.
  const defaultScrollTime = useMemo(() => {
    const now = new Date();
    // Create a copy and subtract 2 hours but preserve minutes and seconds
    const scrollDate = new Date(now);
    scrollDate.setHours(now.getHours() - 2, now.getMinutes(), now.getSeconds(), 0);
    // If we crossed into the previous day, clamp to 00:00:00
    if (scrollDate.getDate() !== now.getDate()) {
      return '00:00:00';
    }
    return scrollDate.toTimeString().slice(0, 8);
  }, []);

  // Modal state
  const [isModalOpen, setModalOpen] = useState(false);
  const [modalEvent, setModalEvent] = useState(null);
  const [modalStart, setModalStart] = useState(null);
  const [modalEnd, setModalEnd] = useState(null);

  // Reference to FullCalendar instance (optional, used for view API calls).
  const calendarRef = useRef(null);

  const resourceRowRef = useRef(null);

  useEffect(() => {
    const fcCols = document.querySelectorAll('.fc-timegrid-col'); // includes time gutter
    const customCols = document.querySelectorAll('.resource-cell');
    const resourceRow = document.querySelector('.resource-row');

    // Align individual resource columns
    for (let i = 0; i < customCols.length; i++) {
      const fcCol = fcCols[i + 1]; // skip time gutter
      const customCol = customCols[i];
      if (fcCol && customCol) {
        customCol.style.width = `${fcCol.offsetWidth}px`;
      }
    }

    // Shift the entire custom resource row to account for the time gutter
    const timeGutterCol = fcCols[0];
    if (resourceRow && timeGutterCol) {
      resourceRow.style.marginLeft = `${timeGutterCol.offsetWidth}px`;
    }
  }, [resources, currentDate]);

  /**
   * Determines if a given date falls within the inclusive range of an
   * event's start and end dates.  The comparison is made at the day
   * granularity (year/month/day), ignoring time of day.  This allows
   * events that span multiple days to appear on all days within their
   * range.
   *
   * @param {Date} day - The calendar day being viewed (time ignored).
   * @param {Date} start - The event's start Date.
   * @param {Date} end - The event's end Date.
   * @returns {boolean} True if the day lies within [start, end], inclusive.
   */
  const isDateWithinRange = (targetDate, startDate, endDate) => {
    const target = new Date(targetDate);
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Extract year, month, and date for local comparison
    const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate());
    const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());

    return targetDay >= startDay && targetDay <= endDay;
  };

  /**
   * Removes a resource column from the scheduler.  It filters the
   * resources array to exclude the resource with the specified id.  It
   * also updates events: if an event spans multiple resources, the
   * removed id is filtered out.  Events that no longer span any
   * resources after removal are discarded.
   */
  const handleRemoveColumn = (resourceId) => {
    setResources((prev) => prev.filter((res) => res.id !== resourceId));
    setEvents((prevEvents) =>
      prevEvents
        .map((evt) => {
          const newResourceIds = evt.resourceIds.filter((rid) => rid !== resourceId);
          if (newResourceIds.length === 0) {
            return null;
          }
          return { ...evt, resourceIds: newResourceIds };
        })
        .filter(Boolean)
    );
  };

  /**
   * Manually scrolls the calendar’s timegrid scroller to two hours before the
   * current time. It calculates the number of minutes from midnight for the
   * target time, determines the height of a single slot (assumed to be the
   * height of the first slot element), and then computes a pixel offset. It
   * finally sets the scrollTop of the scroller element accordingly. This
   * approach does not rely on FullCalendar’s built‑in scrollTime or scrollToTime
   * methods, which have proven unreliable in some situations.
   */
  const scrollToCurrentTimeMinusTwoHours = () => {
    const api = calendarRef.current?.getApi?.();
    if (!api) return;
    const calEl = api.el;
    if (!calEl) return;
    // Construct the target time string in HH:mm:ss format for querying the DOM.
    const target = new Date();
    target.setMinutes(target.getMinutes() - 120);
    const h = String(target.getHours()).padStart(2, '0');
    const m = String(target.getMinutes()).padStart(2, '0');
    const s = '00';
    const timeAttr = `${h}:${m}:${s}`;

    // Try to find an element with a matching data-time attribute. The Scheduler
    // assigns data-time attributes to slot elements and labels. If found, use
    // it for scrolling.
    let slotEl = calEl.querySelector(`[data-time='${timeAttr}']`);
    if (slotEl) {
      // Find the scrollable container. In scheduler views, the scroller is
      // typically an ancestor with class 'fc-scroller'.
      let scroller = slotEl.closest('.fc-scroller');
      if (!scroller) {
        scroller = calEl.querySelector('.fc-timegrid-body') || calEl;
      }
      if (scroller) {
        // Scroll so that the target slot is at the top of the scroller.
        scroller.scrollTop = slotEl.offsetTop;
        return;
      }
    }

    // Fallback: compute pixel offset based on slot height and number of 30‑minute
    // intervals. This is used if the data-time lookup fails.
    const firstSlot = calEl.querySelector('.fc-timegrid-slot');
    if (!firstSlot) return;
    const slotHeight = firstSlot.getBoundingClientRect().height;
    // Determine the target time in minutes from midnight. Negative values are clamped to 0.
    let minutesFromMidnight = target.getHours() * 60 + target.getMinutes();
    if (minutesFromMidnight < 0) minutesFromMidnight = 0;
    // Each slot is 30 minutes.
    const numberOfSlots = minutesFromMidnight / 30;
    const scrollTop = numberOfSlots * slotHeight;
    let fallbackScroller = firstSlot.closest('.fc-scroller');
    if (!fallbackScroller) {
      fallbackScroller = calEl.querySelector('.fc-timegrid-body') || calEl;
    }
    if (fallbackScroller) {
      fallbackScroller.scrollTop = scrollTop;
    }
  };

  /**
   * Custom renderer for calendar events.  Displays the time range,
   * title and optional detail lines.  This function is passed to
   * FullCalendar’s `eventContent` prop and returns JSX which
   * FullCalendar will render inside the event element.
   */
  const renderEventContent = (eventInfo) => {
    const { event } = eventInfo;
    const start = event.start;
    const end = event.end;
    const timeOptions = { hour: 'numeric', minute: '2-digit' };
    const startStr = start.toLocaleTimeString('en-US', timeOptions);
    const endStr = end.toLocaleTimeString('en-US', timeOptions);
    const details = event.extendedProps?.details || [];
    return (
      <div className="custom-event">
        <div className="event-time">{`${startStr} - ${endStr}`}</div>
        <div className="event-title">{event.title}</div>
        {details.map((line, idx) => (
          <div className="event-detail" key={idx}>{line}</div>
        ))}
      </div>
    );
  };

  // After the component mounts, programmatically scroll the calendar to the desired
  // time. While the `scrollTime` prop sets the initial scroll position, it can
  // be overridden by subsequent state updates or FullCalendar’s internal
  // behavior. Invoking the `scrollToTime` method ensures that the scroll is
  // enforced once the calendar API is ready. The empty dependency array
  // guarantees this effect runs only once during the initial mount.
  useEffect(() => {
    const api = calendarRef.current?.getApi?.();
    if (api) {
      // Attempt to use FullCalendar’s built‑in scrollToTime first. If that fails
      // to scroll as expected, our manual scroll function will run below.
      api.scrollToTime(defaultScrollTime);
    }
    // Perform manual scrolling as a fallback to guarantee the correct offset.
    scrollToCurrentTimeMinusTwoHours();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.gotoDate(currentDate); // this is crucial
    }
  }, [currentDate]);

  /**
   * Opens the modal for creating a new event. The start and end times are
   * prepopulated based on the selected date range.
   */
  const openCreateModal = (start, end) => {
    setModalEvent(null);
    setModalStart(start);
    setModalEnd(end);
    setModalOpen(true);
  };

  /**
   * Opens the modal for editing an existing event.
   */
  const openEditModal = (eventInfo) => {
    const { event } = eventInfo;
    setModalEvent(event);
    setModalStart(event.start);
    setModalEnd(event.end);
    setModalOpen(true);
  };

  /**
   * Handles saving a new or edited event from the modal. If editing, updates
   * the existing event; if creating, adds a new event with a unique id. The
   * selected resources determine which columns the event spans.
   */
  const handleSaveEvent = (data) => {
    const { title, start, end, resourceIds, id } = data;
    if (id) {
      // Update an existing event.  Because FullCalendar identifies events
      // by their id, it is important that edits preserve the same id.
      // Only update the fields that may change.
      setEvents((prevEvents) =>
        prevEvents.map((evt) =>
          evt.id === id
            ? { ...evt, title, start, end, resourceIds }
            : evt
        )
      );
    } else {
      // Create a new event.  Use the eventIdCounter to generate a
      // unique identifier.  Without unique IDs, FullCalendar will
      // merge events with identical ids, leading to unexpected
      // behaviour such as existing events shrinking or moving when
      // creating a new one.
      const newId = `e${eventIdCounter}`;
      setEventIdCounter((prev) => prev + 1);
      setEvents((prevEvents) => [
        ...prevEvents,
        {
          id: newId,
          title,
          start,
          end,
          resourceIds,
          // Ensure the new event always has an extendedProps object.
          // Without this, eventContent may reference undefined.
          extendedProps: { details: [] },
        },
      ]);
    }
    // Close the modal after saving.
    setModalOpen(false);
  };

  /**
   * Updates event dates when dragged vertically or resized. FullCalendar
   * provides the new start/end and resource changes via the event object.
   */
  const handleEventChange = (changeInfo) => {
    const { event } = changeInfo;
    // Extract new values
    const updated = {
      id: event.id,
      title: event.title,
      start: event.start,
      end: event.end,
      resourceIds: event.getResources().map((r) => r.id),
    };
    setEvents((prevEvents) =>
      prevEvents.map((evt) => (evt.id === updated.id ? updated : evt))
    );
  };

  /**
   * Handles selecting a time range in the calendar. This is used for
   * click‑to‑create. It adds a default duration of 30 minutes to the
   * selected start time.
   */
  const handleSelect = (selectInfo) => {
    const start = selectInfo.start;
    const end = addMinutes(start, 30);
    openCreateModal(start, end);
  };

  /**
   * Adds a new column (resource) to the scheduler. The user is prompted
   * for a name; you could integrate a proper input dialog here. For now
   * this uses window.prompt as a simple placeholder.
   */
  const handleAddColumn = () => {
    const name = window.prompt('Enter column name:');
    if (!name) return;
    const id = resourceIdCounter.toString();
    setResourceIdCounter(resourceIdCounter + 1);
    setResources((prev) => [...prev, { id, title: name }]);
  };

  /**
   * Navigates forward or backward by a given number of days.  A positive
   * value moves forward, a negative value moves backwards.  Used by
   * the header nav buttons to change the viewed day.
   */
  const handleDateNavigate = (days) => {
    setCurrentDate((prev) => new Date(prev.getTime() + days * 24 * 60 * 60 * 1000));
  };

  const visibleEvents = useMemo(() => {
    return events.filter((evt) =>
      isDateWithinRange(currentDate, evt.start, evt.end)
    );
  }, [events, currentDate]);

  return (
    <div className="calendar-page">
      {/* Top header section. */}
      <CalendarHeader
        currentDate={currentDate}
        onDateNavigate={handleDateNavigate}
        onAddColumn={handleAddColumn}
        onNewEvent={() => {
          // When creating a new event from the header, tie the default
          // start/end times to the currentDate instead of the actual
          // current day.  This ensures that new events only appear on
          // the day being viewed and not on other days.
          const start = new Date(currentDate);
          start.setHours(8, 0, 0, 0);
          const end = new Date(currentDate);
          end.setHours(8, 30, 0, 0);
          openCreateModal(start, end);
        }}
      />

      {/* Resource header row replicating the column titles and people chips. */}
      <div className="resource-row" ref={resourceRowRef}>
        {resources.map((resource) => (
          <div className="resource-cell" key={resource.id}>
            <div className="resource-content">
              <div className="resource-title">{resource.title}</div>
              <div className="resource-people">
                {resource.people &&
                  resource.people.map((person, index) => (
                    <div className="person-chip" key={index}>
                      {person}
                      <span className="arrow-down">▾</span>
                    </div>
                  ))}
                <button
                  className="add-people-btn"
                  onClick={() => alert('Add person not implemented')}
                >
                  ＋
                </button>
              </div>
            </div>
            <button
              className="remove-column-btn"
              onClick={() => handleRemoveColumn(resource.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* FullCalendar for single day with resource columns */}
      <FullCalendar
        ref={calendarRef}
        plugins={[timeGridPlugin, resourceTimeGridPlugin, interactionPlugin]}
        initialView="resourceTimeGridDay"
        headerToolbar={false}
        height="calc(100vh - 180px)"
        resources={resources}
        /* Only display events whose start/end date range encompasses
           the currentDate.  Events with start and end dates that span
           multiple days will appear on each day within their range.
           Events entirely before or after the viewed day will be
           omitted. */
        events={visibleEvents}
        nowIndicator={true}
        slotDuration="00:30:00"
        snapDuration="00:30:00"
        slotMinTime="00:00:00"
        slotMaxTime="24:00:00"
        allDaySlot={false}
        scrollTime={defaultScrollTime}
        // Prevent the calendar from reapplying `scrollTime` after date-range
        // changes or event updates. Without this, the scroll position may reset
        // to the default (6am) when the calendar internally refreshes the view.
        scrollTimeReset={false}
        editable={true}
        selectable={true}
        selectMirror={true}
        dayMaxEvents={true}
        initialDate={currentDate}
        select={handleSelect}
        eventClick={openEditModal}
        eventDrop={handleEventChange}
        eventResize={handleEventChange}
        eventContent={renderEventContent}
        // Whenever the calendar’s date range changes or after it initializes,
        // ensure it scrolls to the desired time. The datesSet callback runs
        // after the DOM has been updated and is a reliable place to invoke
        // scrollToTime. See FullCalendar docs for details.
        datesSet={() => {
          // Use manual scrolling each time the date range or view changes. This
          // ensures that the view is consistently scrolled to two hours before
          // the current time whenever the calendar re-renders. Built-in
          // scrollTime/scrollToTime options are unreliable after certain
          // operations.
          scrollToCurrentTimeMinusTwoHours();
        }}
      />

      {/* Modal for creating/editing events */}
      {isModalOpen && (
        <EventModal
          event={modalEvent}
          start={modalStart}
          end={modalEnd}
          resources={resources}
          onClose={() => setModalOpen(false)}
          onSave={handleSaveEvent}
        />
      )}
    </div>
  );
};

export default CalendarPage;