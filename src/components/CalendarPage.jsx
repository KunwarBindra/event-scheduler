import React, { useState, useRef, useMemo, useEffect, useLayoutEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import resourceTimeGridPlugin from '@fullcalendar/resource-timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import CalendarHeader from './CalendarHeader';
import EventModal from './EventModal';
import { addMinutes } from '../lib/calendarUtils';
import AddColumnModal from './AddColumnModal';
import AddPeopleModal from './AddPeopleModal';
import SaveTemplateModal from './SaveTemplateModal';


import '../styles/Calendar.css';

/* ------------------------------ Static data ------------------------------ */
const INITIAL_EVENTS = [
  {
    id: 'e1',
    resourceIds: ['1', '2', '3'],
    title: 'Operating Meeting',
    start: new Date(new Date().setHours(7, 0, 0, 0)),
    end: new Date(new Date().setHours(8, 0, 0, 0)),
    extendedProps: { details: ['Program Compliance Review'] },
  },
  {
    id: 'e2',
    resourceIds: ['1'],
    title: 'Covid-19',
    start: new Date(new Date().setHours(10, 0, 0, 0)),
    end: new Date(new Date().setHours(11, 0, 0, 0)),
    extendedProps: { details: ['Program Compliance Review'] },
  },
  {
    id: 'e3',
    resourceIds: ['1'],
    title: 'Quality Management System',
    start: new Date(new Date().setHours(11, 0, 0, 0)),
    end: new Date(new Date().setHours(12, 30, 0, 0)),
    extendedProps: {
      details: ['Quality Operations', 'Project Review', 'Data Analysis and QC'],
    },
  },
  {
    id: 'e4',
    resourceIds: ['1'],
    title: 'Patient Grievance Process',
    start: new Date(new Date().setHours(13, 0, 0, 0)),
    end: new Date(new Date().setHours(13, 30, 0, 0)),
    extendedProps: { details: ['Process Review'] },
  },
];

const ALL_USERS = [
  'Alice', 'Bob', 'Charlie', 'Diana', 'Ethan',
  'Fiona', 'Grace', 'Henry', 'Ivy', 'Jack',
];

/* ------------------------------ Component ------------------------------ */
const CalendarPage = () => {
  const [events, setEvents] = useState(INITIAL_EVENTS);
  const [eventIdCounter, setEventIdCounter] = useState(INITIAL_EVENTS.length + 1);
  const [resourceIdCounter, setResourceIdCounter] = useState(4);

  const [resources, setResources] = useState([
    { id: '1', title: 'Generalist', people: [] },
    { id: '2', title: 'Clinical', people: [] },
    { id: '3', title: 'Physical Environment', people: [] },
  ]);

  const [currentDate, setCurrentDate] = useState(new Date());

  // Templates (persisted to localStorage)
  const [templates, setTemplates] = useState({}); // { [name]: TemplateItem[] }

  // Modal state
  const [isModalOpen, setModalOpen] = useState(false);
  const [modalEvent, setModalEvent] = useState(null);
  const [modalStart, setModalStart] = useState(null);
  const [modalEnd, setModalEnd] = useState(null);
  const [defaultModalResourceIds, setDefaultModalResourceIds] = useState([]);

  // ...inside component state (near other modals)
  const [addColOpen, setAddColOpen] = useState(false);

  const [peopleModalOpen, setPeopleModalOpen] = useState(false);
  const [peopleModalResourceId, setPeopleModalResourceId] = useState(null);

  const [saveTplOpen, setSaveTplOpen] = useState(false);

  // replace old handleAddColumn with this:
  const openAddColumnModal = () => setAddColOpen(true);

  const calendarRef = useRef(null);

  // Horizontal-resize (future feature – kept as-is)
  const hDragRef = useRef({
    active: false,
    eventId: null,
    direction: null,
    anchorIdx: null,
    rects: [],
  });

  // Default scroll time
  const defaultScrollTime = useMemo(() => {
    const now = new Date();
    const scrollDate = new Date(now);
    scrollDate.setHours(now.getHours() - 2, now.getMinutes(), now.getSeconds(), 0);
    if (scrollDate.getDate() !== now.getDate()) return '00:00:00';
    return scrollDate.toTimeString().slice(0, 8);
  }, []);

  /* ------------------------------ Helpers ------------------------------ */
  const visibleEvents = useMemo(() => {
    const dayStart = new Date(currentDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    return events
      .filter((evt) => evt.start < dayEnd && evt.end > dayStart)
      .map((evt) => ({
        ...evt,
        start: new Date(Math.max(evt.start.getTime(), dayStart.getTime())),
        end: new Date(Math.min(evt.end.getTime(), dayEnd.getTime())),
      }));
  }, [events, currentDate]);

  const resourceOrder = useMemo(() => resources.map((r) => r.id), [resources]);

  const syncResourceHeader = () => {
    const fcCols = document.querySelectorAll('.fc-timegrid-col'); // includes time gutter at [0]
    const customCols = document.querySelectorAll('.resource-cell');
    const resourceRow = document.querySelector('.resource-row');
    if (!fcCols.length || !customCols.length || !resourceRow) return;

    for (let i = 0; i < customCols.length; i++) {
      const fcCol = fcCols[i + 1]; // skip gutter
      const customCol = customCols[i];
      if (fcCol && customCol) {
        const w = fcCol.getBoundingClientRect().width;
        customCol.style.width = `${w}px`;
      }
    }

    const timeGutterCol = fcCols[0];
    if (timeGutterCol) {
      resourceRow.style.marginLeft = `${timeGutterCol.getBoundingClientRect().width}px`;
    }
  };

  const scrollToCurrentTimeMinusTwoHours = () => {
    const api = calendarRef.current?.getApi?.();
    if (!api) return;
    const calEl = api.el;
    if (!calEl) return;

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

    const firstSlot = calEl.querySelector('.fc-timegrid-slot');
    if (!firstSlot) return;
    const slotHeight = firstSlot.getBoundingClientRect().height;
    let minutesFromMidnight = Math.max(0, target.getHours() * 60 + target.getMinutes());
    const numberOfSlots = minutesFromMidnight / 30;
    const scrollTop = numberOfSlots * slotHeight;
    const scroller = findScroller(firstSlot);
    if (scroller) scroller.scrollTop = scrollTop;
  };

  /* ------------------------------ Template utils ------------------------------ */

  // Load templates from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem('calendarTemplates');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') setTemplates(parsed);
      }
    } catch (_) {
      // ignore bad JSON
    }
  }, []);

  // Persist whenever templates change
  useEffect(() => {
    try {
      localStorage.setItem('calendarTemplates', JSON.stringify(templates));
    } catch (_) {
      // storage full / disabled – silently ignore
    }
  }, [templates]);

  // Human date (e.g., "Oct 10, 2025") for default template name
  const formatDayLabel = (d) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  // Convert a Date to {h,m}
  const toHM = (d) => ({ h: d.getHours(), m: d.getMinutes() });

  // Build a Date for the current day from {h,m}
  const fromHMOnDate = (hm, day) => {
    const d = new Date(day);
    d.setHours(hm.h, hm.m, 0, 0);
    return d;
  };

  // Open the title-only modal
  const handleSaveTemplate = () => setSaveTplOpen(true);

  // Persist as a SINGLE-DAY template using visibleEvents
  const confirmSaveTemplate = (name) => {
    if (!name) return;

    const items = visibleEvents.map((e) => ({
      title: e.title,
      resourceIds: Array.isArray(e.resourceIds) ? e.resourceIds : (e.extendedProps?.resourceIds || []),
      startHM: { h: e.start.getHours(), m: e.start.getMinutes() },
      endHM: { h: e.end.getHours(), m: e.end.getMinutes() },
      extendedProps: e.extendedProps || {},
    }));

    setTemplates((prev) => ({
      ...prev,
      [name]: { type: 'single', items }
    }));

    setSaveTplOpen(false);
  };

  // Apply a template to the CURRENT date (append to existing events)
  const handleApplyTemplate = (name) => {
    const tpl = templates?.[name];
    if (!tpl || !Array.isArray(tpl)) return;

    const newEvents = tpl.map((t) => {
      const id = `e${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const start = fromHMOnDate(t.startHM, currentDate);
      const end = fromHMOnDate(t.endHM, currentDate);
      return {
        id,
        title: t.title,
        start,
        end,
        resourceIds: t.resourceIds || [],
        extendedProps: t.extendedProps || { details: [] },
      };
    });

    setEvents((prev) => {
      // Ensure unique IDs and advance counter roughly
      setEventIdCounter((c) => c + newEvents.length);
      return [...prev, ...newEvents];
    });
  };

  // Optional convenience: remove a template
  const handleDeleteTemplate = (name) => {
    setTemplates((prev) => {
      const copy = { ...prev };
      delete copy[name];
      return copy;
    });
  };

  /* -------------------------- Effects & listeners -------------------------- */
  useEffect(() => {
    const api = calendarRef.current?.getApi?.();
    api?.gotoDate(currentDate);
  }, [currentDate]);

  useEffect(() => {
    const api = calendarRef.current?.getApi?.();
    if (!api) return;

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

    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    syncResourceHeader();
  }, [resources, currentDate]);

  useEffect(() => {
    const grid = document.querySelector('.fc-timegrid');
    const ro = new ResizeObserver(() => syncResourceHeader());
    if (grid) ro.observe(grid);

    const onResize = () => syncResourceHeader();
    window.addEventListener('resize', onResize);

    const api = calendarRef.current?.getApi?.();
    const onDatesSet = () => {
      syncResourceHeader();
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
      return () => cancelAnimationFrame(id);
    };
    api?.on('datesSet', onDatesSet);

    syncResourceHeader();

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', onResize);
      api?.off('datesSet', onDatesSet);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ------------------------------ Handlers ------------------------------ */
  const getResourceRects = () => {
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
    if (clientX < rects[0].left) return 0;
    return rects.length - 1;
  };

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
      extendedProps: event.extendedProps,
    };
    setEvents((prevEvents) => prevEvents.map((evt) => (evt.id === updated.id ? updated : evt)));
  };

  const handleSelect = (selectInfo) => {
    const start = selectInfo.start;
    const end = addMinutes(start, 30);
    const resourceId =
      selectInfo.resource?.id ||
      selectInfo.jsEvent?.target?.getAttribute?.('data-resource-id') ||
      null;
    const defaults = resourceId ? [resourceId] : [];
    openCreateModal(start, end, defaults);
  };

  const handleAddColumn = ({ title }) => {
    const id = resourceIdCounter.toString();
    setResourceIdCounter(prev => prev + 1);
    setResources(prev => [...prev, { id, title, people: [] }]);
    setAddColOpen(false);
    requestAnimationFrame(syncResourceHeader);
  };

  const handleDateNavigate = (days) => {
    setCurrentDate((prev) => new Date(prev.getTime() + days * 24 * 60 * 60 * 1000));
  };

  const startHorizontalResize = (fcEvent, direction, mouseDownEvent) => {
    mouseDownEvent.preventDefault();
    mouseDownEvent.stopPropagation();

    const currentIds = fcEvent.getResources().map((r) => r.id);
    if (!currentIds.length) return;

    const indices = currentIds.map((id) => resourceOrder.indexOf(id)).filter((i) => i >= 0);
    const minIdx = Math.min(...indices);
    const maxIdx = Math.max(...indices);

    const rects = getResourceRects();
    if (!rects.length) return;

    hDragRef.current = {
      active: true,
      eventId: fcEvent.id,
      direction,
      anchorIdx: direction === 'left' ? maxIdx : minIdx,
      rects,
    };

    document.body.classList.add('no-select');
    document.body.style.cursor = 'ew-resize';

    const onMove = (e) => {
      if (!hDragRef.current.active) return;
      const { anchorIdx, rects } = hDragRef.current;

      const overIdxRaw = idxForClientX(e.clientX, rects);
      const overIdx = clamp(overIdxRaw, 0, resourceOrder.length - 1);

      let startIdx, endIdx;
      if (hDragRef.current.direction === 'left') {
        startIdx = Math.min(overIdx, anchorIdx);
        endIdx = anchorIdx;
      } else {
        startIdx = anchorIdx;
        endIdx = Math.max(overIdx, anchorIdx);
      }

      const newIds = buildSpanIds(startIdx, endIdx);

      setEvents((prev) =>
        prev.map((evt) => (evt.id === hDragRef.current.eventId ? { ...evt, resourceIds: newIds } : evt))
      );
    };

    const onUp = () => {
      hDragRef.current.active = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.classList.remove('no-select');
      document.body.style.cursor = '';
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const openPeopleModal = (resourceId) => {
    setPeopleModalResourceId(resourceId);
    setPeopleModalOpen(true);
  };

  const handleSavePeople = (selectedPeople) => {
    setResources(prev => prev.map(r => {
      if (r.id !== peopleModalResourceId) return r;
      // merge without duplicates, preserve order: existing first, then new ones not present
      const existing = Array.isArray(r.people) ? r.people : [];
      const toAdd = selectedPeople.filter(p => !existing.includes(p));
      return { ...r, people: [...existing, ...toAdd] };
    }));
    setPeopleModalOpen(false);
    setPeopleModalResourceId(null);
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
        {/* horizontal span handles kept for future */}
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
        onAddColumn={openAddColumnModal}
        onNewEvent={() => {
          const start = new Date(currentDate);
          start.setHours(8, 0, 0, 0);
          const end = new Date(currentDate);
          end.setHours(8, 30, 0, 0);
          openCreateModal(start, end);
        }}
        /** NEW: template controls */
        templates={Object.keys(templates)}
        onSaveTemplate={handleSaveTemplate}
        onApplyTemplate={handleApplyTemplate}
        onDeleteTemplate={handleDeleteTemplate}
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
                      <span className="arrow-down" aria-hidden="true">▾</span>
                    </div>
                  ))}
                <button
                  className="add-people-btn"
                  onClick={() => openPeopleModal(resource.id)}
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
          eventDurationEditable={true}
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
          datesSet={() => {
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
          defaultResourceIds={defaultModalResourceIds}
          onClose={() => setModalOpen(false)}
          onSave={handleSaveEvent}
        />
      )}

      {addColOpen && (
        <AddColumnModal
          open={addColOpen}
          onCancel={() => setAddColOpen(false)}
          onSave={handleAddColumn}
        />
      )}

      {peopleModalOpen && (
        <AddPeopleModal
          open={peopleModalOpen}
          resourceTitle={resources.find(r => r.id === peopleModalResourceId)?.title}
          allUsers={ALL_USERS}
          initialSelected={resources.find(r => r.id === peopleModalResourceId)?.people || []}
          onCancel={() => { setPeopleModalOpen(false); setPeopleModalResourceId(null); }}
          onSave={handleSavePeople}
        />
      )}

      {saveTplOpen && (
        <SaveTemplateModal
          open={saveTplOpen}
          defaultName={`Template – ${currentDate.toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
          })}`}
          onCancel={() => setSaveTplOpen(false)}
          onSave={confirmSaveTemplate}
        />
      )}
    </div>
  );
};

export default CalendarPage;