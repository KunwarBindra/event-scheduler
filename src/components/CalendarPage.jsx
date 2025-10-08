import React, { useState, useRef, useMemo, useEffect, useLayoutEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import resourceTimeGridPlugin from '@fullcalendar/resource-timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import CalendarHeader from './CalendarHeader';
import EventModal from './EventModal';
import { addMinutes } from '../lib/calendarUtils';

import '../styles/Calendar.css';

/* ------------------------------ Static data ------------------------------ */
/** Keep initial events outside the component to avoid re-allocation on re-renders. */
const INITIAL_EVENTS = [
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
    title: 'Covid-19',
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

/* ------------------------------ Component ------------------------------ */

const CalendarPage = () => {
  const [events, setEvents] = useState(INITIAL_EVENTS);
  const [eventIdCounter, setEventIdCounter] = useState(INITIAL_EVENTS.length + 1);
  const [resourceIdCounter, setResourceIdCounter] = useState(4);

  const [resources, setResources] = useState([
    { id: '1', title: 'Generalist', people: ['Kunwar'] },
    {
      id: '2',
      title: 'Clinical',
      people: ['Robert', 'Sona', 'Munavar'],
    },
    { id: '3', title: 'Physical Environment', people: ['Joblin'] },
  ]);

  const [currentDate, setCurrentDate] = useState(new Date());

  // Modal state
  const [isModalOpen, setModalOpen] = useState(false);
  const [modalEvent, setModalEvent] = useState(null);
  const [modalStart, setModalStart] = useState(null);
  const [modalEnd, setModalEnd] = useState(null);
  const [defaultModalResourceIds, setDefaultModalResourceIds] = useState([]);

  const calendarRef = useRef(null);

  // Holds the in-progress horizontal resize
  const hDragRef = useRef({
    active: false,
    eventId: null,
    direction: null, // 'left' | 'right'
    anchorIdx: null, // fixed boundary index
    rects: [],       // DOMRects for resource columns (excluding time gutter)
  });

  // Compute default scroll time = two hours before now (clamped to 00:00:00 if previous day)
  const defaultScrollTime = useMemo(() => {
    const now = new Date();
    const scrollDate = new Date(now);
    scrollDate.setHours(now.getHours() - 2, now.getMinutes(), now.getSeconds(), 0);
    if (scrollDate.getDate() !== now.getDate()) return '00:00:00';
    return scrollDate.toTimeString().slice(0, 8);
  }, []);

  /* ------------------------------ Helpers ------------------------------ */

  /** Clamp events to visible day bounds to avoid cross-day render issues. */
  const visibleEvents = useMemo(() => {
    const dayStart = new Date(currentDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    return events
      .filter((evt) => evt.start < dayEnd && evt.end > dayStart) // overlaps the day
      .map((evt) => ({
        ...evt,
        start: new Date(Math.max(evt.start.getTime(), dayStart.getTime())),
        end: new Date(Math.min(evt.end.getTime(), dayEnd.getTime())),
      }));
  }, [events, currentDate]);

  // Put these near your other hooks/helpers
  const resourceOrder = useMemo(() => resources.map(r => r.id), [resources]);

  /** Keep a single function that syncs the custom resource header with FC columns. */
  const syncResourceHeader = () => {
    const fcCols = document.querySelectorAll('.fc-timegrid-col'); // includes time gutter at index 0
    const customCols = document.querySelectorAll('.resource-cell');
    const resourceRow = document.querySelector('.resource-row');
    if (!fcCols.length || !customCols.length || !resourceRow) return;

    // Align resource cells to match FC resource columns (skip gutter)
    for (let i = 0; i < customCols.length; i++) {
      const fcCol = fcCols[i + 1]; // skip the first one (time gutter)
      const customCol = customCols[i];
      if (fcCol && customCol) {
        const w = fcCol.getBoundingClientRect().width;
        customCol.style.width = `${w}px`;
      }
    }

    // Shift the entire custom resource row to account for the time gutter width
    const timeGutterCol = fcCols[0];
    if (timeGutterCol) {
      resourceRow.style.marginLeft = `${timeGutterCol.getBoundingClientRect().width}px`;
    }
  };

  /** Manual scroll fallback to "current time minus 2 hours" if native scroll misses. */
  const scrollToCurrentTimeMinusTwoHours = () => {
    const api = calendarRef.current?.getApi?.();
    if (!api) return;
    const calEl = api.el;
    if (!calEl) return;

    // Build time selectors. FullCalendar's data-time can be HH:mm or HH:mm:ss.
    const target = new Date();
    target.setMinutes(target.getMinutes() - 120);
    const hh = String(target.getHours()).padStart(2, '0');
    const mm = String(target.getMinutes()).padStart(2, '0');
    const timeAttrCandidates = [`${hh}:${mm}:00`, `${hh}:${mm}`];

    let slotEl = null;
    for (const t of timeAttrCandidates) {
      slotEl = calEl.querySelector(`[data-time='${t}']`);
      if (slotEl) break;
    }

    const findScroller = (node) =>
      node?.closest?.('.fc-scroller') ||
      calEl.querySelector('.fc-timegrid-body') ||
      calEl;

    if (slotEl) {
      const scroller = findScroller(slotEl);
      if (scroller) {
        scroller.scrollTop = slotEl.offsetTop;
        return;
      }
    }

    // Fallback by slot height math
    const firstSlot = calEl.querySelector('.fc-timegrid-slot');
    if (!firstSlot) return;
    const slotHeight = firstSlot.getBoundingClientRect().height;
    let minutesFromMidnight = Math.max(0, target.getHours() * 60 + target.getMinutes());
    const numberOfSlots = minutesFromMidnight / 30; // 30 min slots
    const scrollTop = numberOfSlots * slotHeight;
    const scroller = findScroller(firstSlot);
    if (scroller) scroller.scrollTop = scrollTop;
  };

  const getResourceRects = () => {
    // .fc-timegrid-col includes [0]=time gutter; resources start at 1
    const allCols = Array.from(document.querySelectorAll('.fc-timegrid-col'));
    return allCols.slice(1).map((el) => el.getBoundingClientRect());
  };

  const clamp = (val, lo, hi) => Math.max(lo, Math.min(hi, val));

  const buildSpanIds = (startIdx, endIdx) => {
    const lo = Math.min(startIdx, endIdx);
    const hi = Math.max(startIdx, endIdx);
    return resourceOrder.slice(lo, hi + 1);
  };

  const idxForClientX = (clientX, rects) => {
    if (!rects.length) return -1;
    for (let i = 0; i < rects.length; i++) {
      const r = rects[i];
      if (clientX >= r.left && clientX <= r.right) return i;
    }
    // Outside bounds: clamp to nearest edge
    if (clientX < rects[0].left) return 0;
    return rects.length - 1;
  };

  /* -------------------------- Effects & listeners -------------------------- */

  // Keep calendar date in sync with state
  useEffect(() => {
    const api = calendarRef.current?.getApi?.();
    api?.gotoDate(currentDate);
  }, [currentDate]);

  // Prefer API scroll; verify and fallback to manual after mount
  useEffect(() => {
    const api = calendarRef.current?.getApi?.();
    if (!api) return;

    // Ask FC to scroll; then fallback if it looks unchanged.
    api.scrollToTime(defaultScrollTime);

    // Give the DOM a tick to render before checking
    const id = requestAnimationFrame(() => {
      // Heuristic: if scroller is still near top during mid-day, apply fallback
      const calEl = api.el;
      const scroller =
        calEl.querySelector('.fc-timegrid-body .fc-scroller') ||
        calEl.querySelector('.fc-scroller') ||
        calEl;
      if (scroller && new Date().getHours() > 2 && scroller.scrollTop < 20) {
        scrollToCurrentTimeMinusTwoHours();
      }
    });

    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep custom header aligned whenever resources/date change (layout effect avoids flash)
  useLayoutEffect(() => {
    syncResourceHeader();
  }, [resources, currentDate]);

  // Observe FC grid size changes and window resizes for robust syncing
  useEffect(() => {
    const grid = document.querySelector('.fc-timegrid');
    const ro = new ResizeObserver(() => syncResourceHeader());
    if (grid) ro.observe(grid);

    const onResize = () => syncResourceHeader();
    window.addEventListener('resize', onResize);

    // Also hook into FC datesSet for reflows after navigation
    const api = calendarRef.current?.getApi?.();
    const onDatesSet = () => {
      // Sync header widths and keep scroll position intent
      syncResourceHeader();
      // Try native scroll again, then fallback; this helps on view/date changes
      api.scrollToTime(defaultScrollTime);
      const id = requestAnimationFrame(() => {
        const calEl = api.el;
        const scroller =
          calEl.querySelector('.fc-timegrid-body .fc-scroller') ||
          calEl.querySelector('.fc-scroller') ||
          calEl;
        if (scroller && new Date().getHours() > 2 && scroller.scrollTop < 20) {
          scrollToCurrentTimeMinusTwoHours();
        }
      });
      // cleanup of RAF is fine but not critical here
      return () => cancelAnimationFrame(id);
    };
    api?.on('datesSet', onDatesSet);

    // initial sync
    syncResourceHeader();

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', onResize);
      api?.off('datesSet', onDatesSet);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const startHorizontalResize = (fcEvent, direction, mouseDownEvent) => {
    mouseDownEvent.preventDefault();
    mouseDownEvent.stopPropagation();

    const currentIds = fcEvent.getResources().map((r) => r.id);
    if (!currentIds.length) return;

    // Current contiguous span indices
    const indices = currentIds.map((id) => resourceOrder.indexOf(id)).filter((i) => i >= 0);
    const minIdx = Math.min(...indices);
    const maxIdx = Math.max(...indices);

    const rects = getResourceRects();
    if (!rects.length) return;

    hDragRef.current = {
      active: true,
      eventId: fcEvent.id,
      direction,
      anchorIdx: direction === 'left' ? maxIdx : minIdx, // opposite edge is fixed
      rects,
    };

    document.body.classList.add('no-select');
    document.body.style.cursor = 'ew-resize';

    const onMove = (e) => {
      if (!hDragRef.current.active) return;
      const { anchorIdx, rects } = hDragRef.current;

      // Which resource column is the cursor over?
      const overIdxRaw = idxForClientX(e.clientX, rects);
      const overIdx = clamp(overIdxRaw, 0, resourceOrder.length - 1);

      // Determine new span
      let startIdx, endIdx;
      if (hDragRef.current.direction === 'left') {
        startIdx = Math.min(overIdx, anchorIdx);
        endIdx = anchorIdx;
      } else {
        startIdx = anchorIdx;
        endIdx = Math.max(overIdx, anchorIdx);
      }

      const newIds = buildSpanIds(startIdx, endIdx);

      // Live preview by updating React state for the specific event
      setEvents((prev) =>
        prev.map((evt) => (evt.id === hDragRef.current.eventId ? { ...evt, resourceIds: newIds } : evt))
      );
    };

    const onUp = () => {
      // Commit already happened via setEvents on move; just cleanup
      hDragRef.current.active = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.classList.remove('no-select');
      document.body.style.cursor = '';
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  /* ------------------------------ Handlers ------------------------------ */

  const handleRemoveColumn = (resourceId) => {
    setResources((prev) => prev.filter((res) => res.id !== resourceId));
    setEvents((prevEvents) =>
      prevEvents
        .map((evt) => {
          const newResourceIds = (evt.resourceIds || []).filter((rid) => rid !== resourceId);
          if (newResourceIds.length === 0) return null;
          return { ...evt, resourceIds: newResourceIds };
        })
        .filter(Boolean)
    );
  };

  const openCreateModal = (start, end, defaultResourceIds = []) => {
    setModalEvent(null);
    setModalStart(start);
    setModalEnd(end);
    setDefaultModalResourceIds(defaultResourceIds);
    setModalOpen(true);
  };

  const openEditModal = (eventInfo) => {
    const { event } = eventInfo;
    setModalEvent(event);
    setModalStart(event.start);
    setModalEnd(event.end);
    setDefaultModalResourceIds(event.getResources().map((r) => r.id));
    setModalOpen(true);
  };

  const handleSaveEvent = (data) => {
    const { title, start, end, resourceIds, id } = data;
    if (id) {
      setEvents((prevEvents) =>
        prevEvents.map((evt) =>
          evt.id === id ? { ...evt, title, start, end, resourceIds: resourceIds || [] } : evt
        )
      );
    } else {
      const newId = `e${eventIdCounter}`;
      setEventIdCounter((prev) => prev + 1);
      setEvents((prevEvents) => [
        ...prevEvents,
        {
          id: newId,
          title,
          start,
          end,
          resourceIds: resourceIds || [],
          extendedProps: { details: [] },
        },
      ]);
    }
    setModalOpen(false);
  };

  const handleEventChange = (changeInfo) => {
    const { event } = changeInfo;
    const updated = {
      id: event.id,
      title: event.title,
      start: event.start,
      end: event.end,
      resourceIds: event.getResources().map((r) => r.id),
      extendedProps: event.extendedProps
    };
    setEvents((prevEvents) => prevEvents.map((evt) => (evt.id === updated.id ? updated : evt)));
  };

  // Create by clicking/dragging a selection block; capture resource column
  const handleSelect = (selectInfo) => {
    const start = selectInfo.start;
    const end = addMinutes(start, 30);
    const resourceId =
      selectInfo.resource?.id ||
      // some builds store it here:
      selectInfo.jsEvent?.target?.getAttribute?.('data-resource-id') ||
      null;

    const defaults = resourceId ? [resourceId] : [];
    openCreateModal(start, end, defaults);
  };

  const handleAddColumn = () => {
    const name = window.prompt('Enter column name:');
    if (!name) return;
    const id = resourceIdCounter.toString();
    setResourceIdCounter((prev) => prev + 1);
    setResources((prev) => [...prev, { id, title: name, people: [] }]);
    // Re-sync after next paint
    requestAnimationFrame(syncResourceHeader);
  };

  const handleDateNavigate = (days) => {
    setCurrentDate((prev) => new Date(prev.getTime() + days * 24 * 60 * 60 * 1000));
  };

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
        {/* Horizontal span handles */}
        <div
          className="h-resize-handle h-resize-handle--left"
          onMouseDown={(e) => startHorizontalResize(event, 'left', e)}
          title="Expand to the left resource"
          aria-label="Expand to the left resource"
        />
        <div
          className="h-resize-handle h-resize-handle--right"
          onMouseDown={(e) => startHorizontalResize(event, 'right', e)}
          title="Expand to the right resource"
          aria-label="Expand to the right resource"
        />

        <div className="event-time">{`${startStr} - ${endStr}`}</div>
        <div className="event-title">{event.title}</div>
        {details.map((line, idx) => (
          <div className="event-detail" key={idx}>
            {line}
          </div>
        ))}
      </div>
    );
  };

  /* -------------------------------- Render -------------------------------- */

  return (
    <div className="calendar-page">
      <CalendarHeader
        currentDate={currentDate}
        onDateNavigate={handleDateNavigate}
        onAddColumn={handleAddColumn}
        onNewEvent={() => {
          const start = new Date(currentDate);
          start.setHours(8, 0, 0, 0);
          const end = new Date(currentDate);
          end.setHours(8, 30, 0, 0);
          openCreateModal(start, end);
        }}
      />

      {/* Custom resource header row that mirrors FC resource columns */}
      <div className="resource-row" role="group" aria-label="Resource columns">
        {resources.map((resource) => (
          <div className="resource-cell" key={resource.id}>
            <div className="resource-content">
              <div className="resource-title">{resource.title}</div>
              <div className="resource-people">
                {Array.isArray(resource.people) &&
                  resource.people.map((person, index) => (
                    <div className="person-chip" key={`${resource.id}-${index}`}>
                      {person}
                      <span className="arrow-down" aria-hidden="true">
                        ▾
                      </span>
                    </div>
                  ))}
                <button
                  className="add-people-btn"
                  onClick={() => alert('Add person not implemented')}
                  aria-label={`Add person to ${resource.title}`}
                  title={`Add person to ${resource.title}`}
                >
                  ＋
                </button>
              </div>
            </div>
            <button
              className="remove-column-btn"
              onClick={() => handleRemoveColumn(resource.id)}
              aria-label={`Remove ${resource.title} column`}
              title={`Remove ${resource.title} column`}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Calendar fills remaining space via flex */}
      <div className="calendar-wrap">
        <FullCalendar
          ref={calendarRef}
          plugins={[timeGridPlugin, resourceTimeGridPlugin, interactionPlugin]}
          initialView="resourceTimeGridDay"
          headerToolbar={false}
          height="100%"
          resources={resources}
          events={visibleEvents}
          nowIndicator={true}
          slotDuration="00:30:00"
          snapDuration="00:30:00"
          slotMinTime="00:00:00"
          slotMaxTime="24:00:00"
          allDaySlot={false}
          scrollTime={defaultScrollTime}
          scrollTimeReset={false}
          editable={true}
          eventDurationEditable={true}        // explicit: allow resize
          eventResizableFromStart={true}
          dragScroll={true}
          selectable={true}
          selectMirror={true}
          dayMaxEvents={true}
          initialDate={currentDate}
          select={handleSelect}
          eventClick={openEditModal}
          eventDrop={handleEventChange}
          eventResize={handleEventChange}
          eventContent={renderEventContent}
          slotLabelFormat={{ hour: 'numeric', minute: '2-digit', hour12: true }}
          // We still keep a datesSet handler to re-sync widths and reinforce scroll intent.
          datesSet={() => {
            // The ResizeObserver + global datesSet hook also handle this, but an extra call
            // here ensures correctness even if observers miss a micro-change.
            syncResourceHeader();
          }}
        />
      </div>

      {isModalOpen && (
        <EventModal
          event={modalEvent}
          start={modalStart}
          end={modalEnd}
          resources={resources}
          defaultResourceIds={defaultModalResourceIds} // Safe extra prop; ignore if modal doesn’t use it
          onClose={() => setModalOpen(false)}
          onSave={handleSaveEvent}
        />
      )}
    </div>
  );
};

export default CalendarPage;