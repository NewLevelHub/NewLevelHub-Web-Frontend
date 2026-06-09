import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, Shield, StickyNote } from 'lucide-react';

import { CALENDAR_EVENT_TYPES } from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';
import type { CalendarEvent } from '@/shared/types';

import {
  CALENDAR_END_HOUR,
  CALENDAR_EVENT_BLOCK_CLASS,
  CALENDAR_HOUR_HEIGHT_PX,
  CALENDAR_START_HOUR,
} from '../calendarConstants';
import {
  calendarBodyHeightPx,
  eventHeightPx,
  eventKey,
  eventTopPx,
  layoutLeaveEvents,
  layoutTimedEvents,
  type CalendarDayColumn,
} from '../calendarUtils';
import type { CalendarNote } from '../useCalendarNotes';

type Props = {
  days: CalendarDayColumn[];
  events: CalendarEvent[];
  notes: CalendarNote[];
  selectedEventKey: string | null;
  onEventClick: (event: CalendarEvent, anchor: HTMLElement) => void;
  onSlotClick: (date: string, hour: number, anchor: HTMLElement) => void;
  onNoteClick: (note: CalendarNote, anchor: HTMLElement) => void;
};

function formatCalendarEventTitle(event: CalendarEvent, t: (key: string) => string) {
  if (event.type === CALENDAR_EVENT_TYPES.TASK_DEADLINE) {
    return `${t('calendar.deadlinePrefix')}: ${event.title}`;
  }
  if (event.type === CALENDAR_EVENT_TYPES.GUEST_VISIT) {
    return `${t('calendar.guestPrefix')}: ${event.title}`;
  }
  return event.title;
}

export function CalendarTimeGrid({
  days,
  events,
  notes,
  selectedEventKey,
  onEventClick,
  onSlotClick,
  onNoteClick,
}: Props) {
  const { t } = useTranslation();
  const dayIsos = useMemo(() => days.map((day) => day.iso), [days]);
  const weekStartIso = dayIsos[0] ?? '';
  const weekEndIso = dayIsos[dayIsos.length - 1] ?? '';
  const bodyHeight = calendarBodyHeightPx();
  const hours = Array.from(
    { length: CALENDAR_END_HOUR - CALENDAR_START_HOUR + 1 },
    (_, index) => CALENDAR_START_HOUR + index,
  );
  const gutterWidth = days.length > 1 ? 'minmax(48px,64px)' : 'minmax(44px,64px)';
  const gridColumns = `${gutterWidth} repeat(${days.length}, minmax(88px, 1fr))`;

  const leaveEvents = useMemo(
    () => layoutLeaveEvents(events, weekStartIso, weekEndIso, dayIsos),
    [events, weekStartIso, weekEndIso, dayIsos],
  );

  const timedEvents = useMemo(
    () => layoutTimedEvents(events, dayIsos),
    [events, dayIsos],
  );

  const notesByDay = useMemo(() => {
    const map = new Map<string, CalendarNote[]>();
    for (const note of notes) {
      if (!dayIsos.includes(note.date)) continue;
      const list = map.get(note.date) ?? [];
      list.push(note);
      map.set(note.date, list);
    }
    return map;
  }, [dayIsos, notes]);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[min(100%,640px)] sm:min-w-[720px]">
        <div
          className="grid border-b border-default bg-raised"
          style={{ gridTemplateColumns: gridColumns }}
        >
          <div className="border-r border-default" />
          {days.map((day) => (
            <div
              key={day.iso}
              className={cn(
                'border-r border-default px-1.5 py-2 text-center last:border-r-0 sm:px-2.5 sm:py-[11px]',
                day.isToday && '[&_.dow]:text-[#0a7553]',
              )}
            >
              <div className="dow text-[10px] font-semibold tracking-[0.04em] text-muted uppercase sm:text-[11px]">
                {day.dowLabel}
              </div>
              <div
                className={cn(
                  'dnum mt-0.5 text-base leading-none font-bold text-primary sm:text-lg',
                  day.isToday &&
                    'mx-auto mt-1 flex h-7 w-7 items-center justify-center rounded-full bg-brand text-sm text-white sm:h-[30px] sm:w-[30px] sm:text-lg',
                )}
              >
                {day.dayNum}
              </div>
            </div>
          ))}
        </div>

        <div
          className="relative grid min-h-[42px] border-b border-default"
          style={{ gridTemplateColumns: gridColumns }}
        >
          <div className="flex items-center justify-end border-r border-default px-1.5 text-right text-[9px] leading-tight font-semibold tracking-[0.03em] text-muted uppercase sm:px-2 sm:text-[10.5px]">
            {t('calendar.allDay')}
          </div>
          {days.map((day) => (
            <div key={day.iso} className="border-r border-default last:border-r-0" />
          ))}
          {leaveEvents.length > 0 && (
            <div
              className="pointer-events-none absolute inset-y-0 left-[48px] grid content-start gap-1 py-1.5 sm:left-[64px]"
              style={{
                right: 0,
                gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))`,
              }}
            >
              {leaveEvents.map((event) => (
                <button
                  key={eventKey(event)}
                  type="button"
                  className={cn(
                    'pointer-events-auto mx-1 flex items-center gap-1.5 overflow-hidden rounded-[9px] border px-2 py-1.5 text-left text-[11px] font-semibold text-ellipsis whitespace-nowrap sm:mx-1.5 sm:gap-1.5 sm:px-2.5 sm:text-xs',
                    CALENDAR_EVENT_BLOCK_CLASS[CALENDAR_EVENT_TYPES.LEAVE],
                    selectedEventKey === eventKey(event) &&
                      'shadow-[0_0_0_2px_var(--bg-surface),0_0_0_4px_#8B5CF6]',
                  )}
                  style={{
                    gridColumn: `${event.colStart + 1} / ${event.colEnd + 2}`,
                  }}
                  onClick={(e) => onEventClick(event, e.currentTarget)}
                >
                  <Shield className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" strokeWidth={2} />
                  <span className="truncate">
                    {event.title} · {event.user.full_name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid" style={{ gridTemplateColumns: gridColumns }}>
          <div className="relative border-r border-default" style={{ height: bodyHeight }}>
            {hours.map((hour) => (
              <div
                key={hour}
                className="absolute right-1 text-[10px] font-medium text-muted sm:right-2 sm:text-[11px]"
                style={{ top: (hour - CALENDAR_START_HOUR) * CALENDAR_HOUR_HEIGHT_PX, transform: 'translateY(-50%)' }}
              >
                {String(hour).padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {days.map((day) => {
            const dayTimed = timedEvents.filter((event) => event.dayIso === day.iso);
            const dayNotes = notesByDay.get(day.iso) ?? [];

            return (
              <div
                key={day.iso}
                className={cn(
                  'relative border-r border-default last:border-r-0',
                  day.isToday && 'bg-[rgba(16,160,114,0.025)]',
                )}
                style={{ height: bodyHeight }}
              >
                {hours.slice(0, -1).map((hour) => {
                  const slotNote = dayNotes.find((note) => note.hour === hour);

                  return (
                    <div key={hour}>
                      <div
                        className="absolute right-0 left-0 border-t border-default"
                        style={{ top: (hour - CALENDAR_START_HOUR) * CALENDAR_HOUR_HEIGHT_PX }}
                      />
                      <button
                        type="button"
                        className="group/slot absolute right-0 left-0 z-[1] cursor-pointer border-0 bg-transparent p-0 transition-colors hover:bg-[rgba(245,158,11,0.08)]"
                        style={{
                          top: (hour - CALENDAR_START_HOUR) * CALENDAR_HOUR_HEIGHT_PX,
                          height: CALENDAR_HOUR_HEIGHT_PX,
                        }}
                        onClick={(e) => onSlotClick(day.iso, hour, e.currentTarget)}
                        aria-label={slotNote ? t('calendar.editNote') : t('calendar.addNote')}
                      >
                        <div className="absolute inset-[3px] hidden items-center justify-center gap-1 rounded-lg border-[1.5px] border-dashed border-[rgba(245,158,11,0.45)] bg-[rgba(254,249,232,0.75)] px-1 text-[10px] font-semibold text-[#a96710] group-hover/slot:flex sm:gap-1.5 sm:text-[11.5px]">
                          <StickyNote className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" strokeWidth={2} />
                          <span className="truncate">{slotNote ? t('calendar.editNote') : t('calendar.addNote')}</span>
                        </div>
                      </button>
                    </div>
                  );
                })}
                <div
                  className="absolute right-0 left-0 border-t border-default"
                  style={{ top: bodyHeight }}
                />

                {dayNotes.map((note) => (
                  <button
                    key={note.id}
                    type="button"
                    className="absolute z-[2] flex cursor-pointer flex-col gap-0.5 overflow-hidden rounded-[9px] border border-[#f0d78c] border-l-[3px] border-l-[#F59E0B] bg-[#fef9e8] px-2 py-1.5 text-left text-[#a96710] transition-shadow hover:z-[4] hover:shadow-[var(--shadow-card)]"
                    style={{
                      top: (note.hour - CALENDAR_START_HOUR) * CALENDAR_HOUR_HEIGHT_PX + 2,
                      height: CALENDAR_HOUR_HEIGHT_PX - 6,
                      left: '6px',
                      right: '6px',
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onNoteClick(note, e.currentTarget);
                    }}
                  >
                    <span className="flex items-center gap-1 text-[10px] font-bold uppercase sm:text-[11px]">
                      <StickyNote className="h-3 w-3 shrink-0" />
                      {t('calendar.noteLabel')}
                    </span>
                    <span className="line-clamp-2 text-[11px] leading-tight font-medium sm:text-[12px]">
                      {note.text}
                    </span>
                  </button>
                ))}

                {dayTimed.map((event) => {
                  const top = eventTopPx(event.startHour);
                  const height = eventHeightPx(event.startHour, event.endHour, event.type);
                  const width = 100 / event.laneCount;
                  const left = event.lane * width;
                  const isDeadline = event.type === CALENDAR_EVENT_TYPES.TASK_DEADLINE;
                  const key = eventKey(event);

                  return (
                    <button
                      key={key}
                      type="button"
                      className={cn(
                        'absolute z-[3] flex cursor-pointer overflow-hidden rounded-[9px] border border-l-[3px] px-1.5 py-1 text-left transition-shadow hover:z-[5] hover:shadow-[var(--shadow-pop)] sm:px-2 sm:py-1.5',
                        CALENDAR_EVENT_BLOCK_CLASS[event.type],
                        isDeadline ? 'flex-row items-center gap-1.5' : 'flex-col gap-px',
                        selectedEventKey === key &&
                          'shadow-[0_0_0_2px_var(--bg-surface),0_0_0_4px_currentColor]',
                      )}
                      style={{
                        top,
                        height,
                        left: `calc(${left}% + 4px)`,
                        width: `calc(${width}% - 8px)`,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick(event, e.currentTarget);
                      }}
                    >
                      {isDeadline ? (
                        <>
                          <Clock className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" strokeWidth={1.8} />
                          <span className="truncate text-[11px] font-semibold sm:text-xs">
                            {formatCalendarEventTitle(event, t)}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="truncate text-[11px] leading-tight font-bold sm:text-[12.5px]">
                            {formatCalendarEventTitle(event, t)}
                          </span>
                          <span className="truncate text-[10px] font-medium opacity-85 sm:text-[11px]">
                            {event.type === CALENDAR_EVENT_TYPES.GUEST_VISIT
                              ? `${t('calendar.popover.invitedBy')}: ${event.user.full_name}`
                              : event.user.full_name}
                          </span>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
