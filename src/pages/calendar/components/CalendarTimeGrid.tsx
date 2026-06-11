import { useMemo, type CSSProperties, type MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, MapPin, Shield, StickyNote, UserRound } from 'lucide-react';

import { CALENDAR_EVENT_TYPES } from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';
import type { CalendarEvent } from '@/shared/types';

import {
  CALENDAR_CARD_MIN_HEIGHT_PX,
  CALENDAR_END_HOUR,
  CALENDAR_EVENT_BLOCK_CLASS,
  CALENDAR_GRID_EVENT_LAYOUT_CLASS,
  CALENDAR_HOUR_HEIGHT_PX,
  CALENDAR_START_HOUR,
} from '../calendarConstants';
import {
  CALENDAR_SLOT_PADDING_PX,
  calendarBodyHeightPx,
  computeOverlapEventGeometry,
  eventKey,
  eventOverlapsHour,
  formatEventTimeRange,
  layoutLeaveEvents,
  layoutOverlappingDayEvents,
  type CalendarDayColumn,
  type PositionedTimedEvent,
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

const EVENT_ICON_CLASS = 'h-3.5 w-3.5 shrink-0';

function EventTypeIcon({
  type,
  className = EVENT_ICON_CLASS,
}: {
  type: CalendarEvent['type'];
  className?: string;
}) {
  if (type === CALENDAR_EVENT_TYPES.TASK_DEADLINE) return <Clock className={className} strokeWidth={2} />;
  if (type === CALENDAR_EVENT_TYPES.GUEST_VISIT) return <UserRound className={className} strokeWidth={2} />;
  if (type === CALENDAR_EVENT_TYPES.BOOKING) return <MapPin className={className} strokeWidth={2} />;
  if (type === CALENDAR_EVENT_TYPES.LEAVE) return <Shield className={className} strokeWidth={2} />;
  return null;
}

function GridEventBlock({
  event,
  title,
  subtitle,
  className,
  style,
  selected,
  truncateTitle = false,
  ariaLabel,
  onClick,
}: {
  event: CalendarEvent;
  title: string;
  subtitle: string;
  className?: string;
  style?: CSSProperties;
  selected?: boolean;
  truncateTitle?: boolean;
  ariaLabel?: string;
  onClick: (e: MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel ?? title}
      className={cn(
        CALENDAR_GRID_EVENT_LAYOUT_CLASS,
        'flex min-w-0 cursor-pointer items-start gap-1 leading-snug transition-shadow hover:!z-[12] hover:shadow-[var(--shadow-pop)]',
        CALENDAR_EVENT_BLOCK_CLASS[event.type],
        selected && '!z-[12] shadow-[0_0_0_1px_var(--bg-surface),0_0_0_2px_currentColor]',
        className,
      )}
      style={style}
      onClick={onClick}
    >
      <EventTypeIcon type={event.type} className={cn(EVENT_ICON_CLASS, 'mt-px')} />
      <span className="min-w-0 flex flex-1 flex-col gap-0.5">
        <span className={cn('text-[11px] font-semibold', truncateTitle ? 'truncate' : 'break-words')}>
          {title}
        </span>
        <span className="truncate text-[11px] font-medium opacity-80">{subtitle}</span>
      </span>
    </button>
  );
}

function NoteCard({
  note,
  top,
  height,
  left,
  width,
  zIndex,
  onNoteClick,
}: {
  note: CalendarNote;
  top: number;
  height: number;
  left: number;
  width: number;
  zIndex: number;
  onNoteClick: (note: CalendarNote, anchor: HTMLElement) => void;
}) {
  return (
    <button
      type="button"
      aria-label={note.text}
      className="absolute flex min-w-0 cursor-pointer items-start gap-1 overflow-hidden rounded-lg border border-l-[3px] border-[#f0d78c] border-l-[#F59E0B] bg-[#fef9e8] px-1.5 py-1 text-left text-[#a96710] shadow-sm leading-snug transition-shadow hover:!z-[12] hover:shadow-[var(--shadow-pop)]"
      style={{
        top,
        height,
        left: `calc(${left}% + 2px)`,
        width: `calc(${width}% - 4px)`,
        zIndex,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onNoteClick(note, e.currentTarget);
      }}
    >
      <StickyNote className={cn(EVENT_ICON_CLASS, 'mt-px shrink-0')} strokeWidth={2} />
      <span className="min-w-0 flex flex-1 flex-col gap-0.5">
        <span className="break-words text-[11px] font-semibold">{note.text}</span>
      </span>
    </button>
  );
}

function OverlapEventBlock({
  event,
  top,
  height,
  left,
  width,
  zIndex,
  selectedEventKey,
  onEventClick,
}: {
  event: PositionedTimedEvent;
  top: number;
  height: number;
  left: number;
  width: number;
  zIndex: number;
  selectedEventKey: string | null;
  onEventClick: (event: CalendarEvent, anchor: HTMLElement) => void;
}) {
  const key = eventKey(event);
  const timeLabel = formatEventTimeRange(event.startHour, event.endHour);

  return (
    <GridEventBlock
      event={event}
      title={event.title}
      subtitle={timeLabel}
      selected={selectedEventKey === key}
      className="absolute"
      style={{
        top,
        height,
        left: `calc(${left}% + 2px)`,
        width: `calc(${width}% - 4px)`,
        zIndex,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onEventClick(event, e.currentTarget);
      }}
    />
  );
}

// Only the hour divider line and the "add note" button — note card is rendered separately.
function HourSlotStack({
  slotTop,
  hasNote,
  hasEventsInHour,
  onAddNote,
  t,
}: {
  slotTop: number;
  hasNote: boolean;
  hasEventsInHour: boolean;
  onAddNote: (anchor: HTMLElement) => void;
  t: (key: string) => string;
}) {
  return (
    <div
      className="group/hour absolute right-0 left-0"
      style={{ top: slotTop, height: CALENDAR_HOUR_HEIGHT_PX }}
    >
      <div className="pointer-events-none absolute right-0 left-0 top-0 border-t border-default" />

      {!hasNote && (
        <button
          type="button"
          className="absolute right-1 bottom-1 z-[20] flex h-5 w-5 items-center justify-center rounded-md border border-[rgba(245,158,11,0.45)] bg-[rgba(254,249,232,0.95)] text-[#a96710] opacity-0 shadow-sm transition-opacity group-hover/hour:opacity-100 hover:bg-[#fef3e0]"
          onClick={(e) => {
            e.stopPropagation();
            onAddNote(e.currentTarget);
          }}
          aria-label={t('calendar.addNote')}
        >
          <StickyNote className="h-3 w-3" strokeWidth={2} />
        </button>
      )}

      {!hasNote && !hasEventsInHour && (
        <button
          type="button"
          className="absolute inset-0 z-[1] cursor-pointer border-0 bg-transparent p-0 transition-colors hover:bg-[rgba(245,158,11,0.05)]"
          onClick={(e) => onAddNote(e.currentTarget)}
          aria-label={t('calendar.addNote')}
        />
      )}
    </div>
  );
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
  const allDaySubtitle = t('calendar.allDay').replace('\n', ' ');
  const hours = Array.from(
    { length: CALENDAR_END_HOUR - CALENDAR_START_HOUR + 1 },
    (_, index) => CALENDAR_START_HOUR + index,
  );
  const gutterWidth = '64px';
  const gridColumns = `${gutterWidth} repeat(${days.length}, minmax(88px, 1fr))`;

  const leaveEvents = useMemo(
    () => layoutLeaveEvents(events, weekStartIso, weekEndIso, dayIsos),
    [events, weekStartIso, weekEndIso, dayIsos],
  );

  const overlappingEvents = useMemo(
    () => layoutOverlappingDayEvents(events, dayIsos),
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
        {/* Day header row */}
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

        {/* All-day row (leave events) */}
        <div
          className="grid border-b border-default"
          style={{ gridTemplateColumns: gridColumns }}
        >
          <div className="flex h-[56px] items-center justify-end border-r border-default px-2.5 text-right text-[10.5px] leading-[1.2] font-semibold tracking-[0.03em] text-muted uppercase">
            <span className="whitespace-pre-line">{t('calendar.allDay')}</span>
          </div>
          {days.map((day) => {
            const dayLeaves = leaveEvents.filter((event) => event.dayIso === day.iso);

            return (
              <div
                key={day.iso}
                className="flex h-[56px] min-w-0 items-stretch gap-0.5 overflow-hidden border-r border-default p-1.5 last:border-r-0"
              >
                {dayLeaves.map((event) => {
                  const key = `${eventKey(event)}-${event.dayIso}`;

                  return (
                    <GridEventBlock
                      key={key}
                      event={event}
                      title={event.title}
                      subtitle={allDaySubtitle}
                      className="min-h-0 flex-1"
                      truncateTitle
                      selected={selectedEventKey === eventKey(event)}
                      onClick={(e) => onEventClick(event, e.currentTarget)}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Time grid */}
        <div className="grid" style={{ gridTemplateColumns: gridColumns }}>
          {/* Hour gutter */}
          <div className="relative border-r border-default" style={{ height: bodyHeight }}>
            {hours.map((hour) => {
              const top = (hour - CALENDAR_START_HOUR) * CALENDAR_HOUR_HEIGHT_PX;
              const isFirstHour = hour === CALENDAR_START_HOUR;

              return (
                <div
                  key={hour}
                  className="absolute right-2 text-[11px] font-medium text-muted"
                  style={{
                    top,
                    transform: isFirstHour ? undefined : 'translateY(-50%)',
                  }}
                >
                  {String(hour).padStart(2, '0')}:00
                </div>
              );
            })}
          </div>

          {/* Day columns */}
          {days.map((day) => {
            const dayEvents = overlappingEvents.filter((event) => event.dayIso === day.iso);
            const dayNotes = notesByDay.get(day.iso) ?? [];
            const noteHourSet = new Set(dayNotes.map((n) => n.hour));

            return (
              <div
                key={day.iso}
                className={cn(
                  'relative overflow-hidden border-r border-default last:border-r-0',
                  day.isToday && 'bg-[rgba(16,160,114,0.025)]',
                )}
                style={{ height: bodyHeight }}
              >
                {/* Hour slot lines + add-note buttons */}
                {hours.slice(0, -1).map((hour) => {
                  const slotTop = (hour - CALENDAR_START_HOUR) * CALENDAR_HOUR_HEIGHT_PX;
                  const hasNote = noteHourSet.has(hour);
                  const hasEventsInHour = dayEvents.some((event) => eventOverlapsHour(event, hour));

                  return (
                    <HourSlotStack
                      key={hour}
                      slotTop={slotTop}
                      hasNote={hasNote}
                      hasEventsInHour={hasEventsInHour}
                      onAddNote={(anchor) => onSlotClick(day.iso, hour, anchor)}
                      t={t}
                    />
                  );
                })}

                <div
                  className="absolute right-0 left-0 border-t border-default"
                  style={{ top: bodyHeight }}
                />

                {/* Note cards — positioned in the same grid as events */}
                {dayNotes.map((note) => {
                  // How many event-lanes start in this hour slot?
                  const eventsStartingInHour = dayEvents.filter(
                    (e) => Math.floor(e.startHour) === note.hour,
                  );
                  const maxEventLanes =
                    eventsStartingInHour.length > 0
                      ? Math.max(...eventsStartingInHour.map((e) => e.laneCount))
                      : 0;
                  // Note always occupies lane 0; events are shifted right.
                  const totalLanes = maxEventLanes + 1;
                  const noteWidth = 100 / totalLanes;
                  const noteTop = (note.hour - CALENDAR_START_HOUR) * CALENDAR_HOUR_HEIGHT_PX;
                  const noteHeight = Math.max(
                    CALENDAR_CARD_MIN_HEIGHT_PX,
                    CALENDAR_HOUR_HEIGHT_PX - CALENDAR_SLOT_PADDING_PX,
                  );

                  return (
                    <NoteCard
                      key={`note-${note.date}-${note.hour}`}
                      note={note}
                      top={noteTop}
                      height={noteHeight}
                      left={0}
                      width={noteWidth}
                      zIndex={10}
                      onNoteClick={onNoteClick}
                    />
                  );
                })}

                {/* Event cards — shifted right when a note occupies lane 0 */}
                {dayEvents.map((event) => {
                  const startHourFloor = Math.floor(event.startHour);
                  const hasNoteInHour = noteHourSet.has(startHourFloor);
                  const extraLane = hasNoteInHour ? 1 : 0;

                  const { top, height, left, width, zIndex } = computeOverlapEventGeometry(
                    event,
                    0,
                    {
                      laneOverride: event.lane + extraLane,
                      laneCountOverride: event.laneCount + extraLane,
                    },
                  );
                  if (height <= 0) return null;

                  return (
                    <OverlapEventBlock
                      key={eventKey(event)}
                      event={event}
                      top={top}
                      height={height}
                      left={left}
                      width={width}
                      zIndex={zIndex}
                      selectedEventKey={selectedEventKey}
                      onEventClick={onEventClick}
                    />
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
