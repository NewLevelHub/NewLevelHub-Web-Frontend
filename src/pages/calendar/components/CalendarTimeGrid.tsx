import { useMemo, type MouseEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, MapPin, Shield, StickyNote, UserRound } from 'lucide-react';

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
  CALENDAR_SINGLE_EVENT_MAX_HEIGHT_PX,
  CALENDAR_SLOT_CHIP_GAP_PX,
  CALENDAR_SLOT_CHIP_HEIGHT_PX,
  CALENDAR_SLOT_PADDING_PX,
  calendarBodyHeightPx,
  computeDurationEventGeometry,
  eventKey,
  eventOverlapsHour,
  getPointEventsInHour,
  hourSlotStackHeight,
  layoutLeaveEvents,
  layoutPointEvents,
  layoutTimedEvents,
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

function SlotChip({
  className,
  onClick,
  children,
  ariaLabel,
}: {
  className: string;
  onClick: (e: MouseEvent<HTMLButtonElement>) => void;
  children: ReactNode;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className={cn(
        'pointer-events-auto flex w-full min-w-0 items-center gap-1.5 overflow-hidden rounded-lg border border-l-[3px] px-1.5 text-left text-[10.5px] leading-tight font-semibold',
        className,
      )}
      style={{ height: CALENDAR_SLOT_CHIP_HEIGHT_PX, minHeight: CALENDAR_SLOT_CHIP_HEIGHT_PX }}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function EventTypeIcon({ type }: { type: CalendarEvent['type'] }) {
  if (type === CALENDAR_EVENT_TYPES.TASK_DEADLINE) {
    return <Clock className={EVENT_ICON_CLASS} strokeWidth={2} />;
  }
  if (type === CALENDAR_EVENT_TYPES.GUEST_VISIT) {
    return <UserRound className={EVENT_ICON_CLASS} strokeWidth={2} />;
  }
  if (type === CALENDAR_EVENT_TYPES.BOOKING) {
    return <MapPin className={EVENT_ICON_CLASS} strokeWidth={2} />;
  }
  return null;
}

function HourSlotStack({
  slotTop,
  pointEvents,
  slotNote,
  hasDurationInHour,
  selectedEventKey,
  onEventClick,
  onNoteClick,
  onAddNote,
  t,
}: {
  slotTop: number;
  pointEvents: PositionedTimedEvent[];
  slotNote: CalendarNote | null;
  hasDurationInHour: boolean;
  selectedEventKey: string | null;
  onEventClick: (event: CalendarEvent, anchor: HTMLElement) => void;
  onNoteClick: (note: CalendarNote, anchor: HTMLElement) => void;
  onAddNote: (anchor: HTMLElement) => void;
  t: (key: string) => string;
}) {
  const hasChips = pointEvents.length > 0 || slotNote != null;
  const isEmptySlot = !hasChips && !hasDurationInHour;

  return (
    <div
      className="group/hour pointer-events-none absolute right-0 left-0 z-[1]"
      style={{ top: slotTop, height: CALENDAR_HOUR_HEIGHT_PX }}
    >
      <div className="absolute right-0 left-0 top-0 border-t border-default" />

      {hasChips && (
        <div
          className="absolute right-1.5 left-1.5 z-[4] flex flex-col"
          style={{
            top: CALENDAR_SLOT_PADDING_PX,
            gap: CALENDAR_SLOT_CHIP_GAP_PX,
          }}
        >
          {pointEvents.map((event) => {
            const key = eventKey(event);

            return (
              <SlotChip
                key={key}
                className={cn(
                  CALENDAR_EVENT_BLOCK_CLASS[event.type],
                  selectedEventKey === key &&
                    'shadow-[0_0_0_1px_var(--bg-surface),0_0_0_2px_currentColor]',
                )}
                ariaLabel={event.title}
                onClick={(e) => {
                  e.stopPropagation();
                  onEventClick(event, e.currentTarget);
                }}
              >
                <EventTypeIcon type={event.type} />
                <span className="truncate">{event.title}</span>
              </SlotChip>
            );
          })}

          {slotNote && (
            <SlotChip
              className="border-[#f0d78c] border-l-[#F59E0B] bg-[#fef9e8] text-[#a96710]"
              ariaLabel={slotNote.text}
              onClick={(e) => {
                e.stopPropagation();
                onNoteClick(slotNote, e.currentTarget);
              }}
            >
              <StickyNote className={EVENT_ICON_CLASS} strokeWidth={2} />
              <span className="truncate">{slotNote.text}</span>
            </SlotChip>
          )}
        </div>
      )}

      {!slotNote && (
        <button
          type="button"
          className="pointer-events-auto absolute right-1 bottom-1 z-[5] flex h-5 w-5 items-center justify-center rounded-md border border-[rgba(245,158,11,0.45)] bg-[rgba(254,249,232,0.95)] text-[#a96710] opacity-0 shadow-sm transition-opacity group-hover/hour:opacity-100 hover:bg-[#fef3e0]"
          onClick={(e) => {
            e.stopPropagation();
            onAddNote(e.currentTarget);
          }}
          aria-label={t('calendar.addNote')}
        >
          <StickyNote className="h-3 w-3" strokeWidth={2} />
        </button>
      )}

      {isEmptySlot && (
        <button
          type="button"
          className="pointer-events-auto absolute inset-0 z-[1] cursor-pointer border-0 bg-transparent p-0 transition-colors hover:bg-[rgba(245,158,11,0.05)]"
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

  const durationEvents = useMemo(
    () => layoutTimedEvents(events, dayIsos),
    [events, dayIsos],
  );

  const pointEvents = useMemo(
    () => layoutPointEvents(events, dayIsos),
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
          <div className="flex items-center justify-end border-r border-default px-2.5 text-right text-[10.5px] leading-[1.2] font-semibold tracking-[0.03em] text-muted uppercase">
            <span className="whitespace-pre-line">{t('calendar.allDay')}</span>
          </div>
          {days.map((day) => (
            <div key={day.iso} className="border-r border-default last:border-r-0" />
          ))}
          {leaveEvents.length > 0 && (
            <div
              className="pointer-events-none absolute inset-y-0 left-[64px] grid content-start gap-1 py-1.5"
              style={{
                right: 0,
                gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))`,
              }}
            >
              {leaveEvents.map((event) => {
                const key = `${eventKey(event)}-${event.dayIso}`;

                return (
                  <button
                    key={key}
                    type="button"
                    className={cn(
                      'pointer-events-auto mx-1 flex h-[22px] items-center gap-1.5 overflow-hidden rounded-lg border border-l-[3px] px-1.5 text-left text-[10.5px] font-semibold text-ellipsis whitespace-nowrap sm:mx-1.5',
                      CALENDAR_EVENT_BLOCK_CLASS[CALENDAR_EVENT_TYPES.LEAVE],
                      selectedEventKey === eventKey(event) &&
                        'shadow-[0_0_0_2px_var(--bg-surface),0_0_0_4px_#8B5CF6]',
                    )}
                    style={{
                      gridColumn: `${event.col + 1} / ${event.col + 2}`,
                    }}
                    onClick={(e) => onEventClick(event, e.currentTarget)}
                  >
                    <Shield className={EVENT_ICON_CLASS} strokeWidth={2} />
                    <span className="truncate">
                      {event.title} · {event.user.full_name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="grid" style={{ gridTemplateColumns: gridColumns }}>
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

          {days.map((day) => {
            const dayDuration = durationEvents.filter((event) => event.dayIso === day.iso);
            const dayPoints = pointEvents.filter((event) => event.dayIso === day.iso);
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
                  const slotTop = (hour - CALENDAR_START_HOUR) * CALENDAR_HOUR_HEIGHT_PX;
                  const slotNote = dayNotes.find((note) => note.hour === hour) ?? null;
                  const hourPoints = getPointEventsInHour(dayPoints, hour);
                  const hasDurationInHour = dayDuration.some((event) =>
                    eventOverlapsHour(event, hour),
                  );

                  return (
                    <HourSlotStack
                      key={hour}
                      slotTop={slotTop}
                      pointEvents={hourPoints}
                      slotNote={slotNote}
                      hasDurationInHour={hasDurationInHour}
                      selectedEventKey={selectedEventKey}
                      onEventClick={onEventClick}
                      onNoteClick={onNoteClick}
                      onAddNote={(anchor) => onSlotClick(day.iso, hour, anchor)}
                      t={t}
                    />
                  );
                })}

                <div
                  className="absolute right-0 left-0 border-t border-default"
                  style={{ top: bodyHeight }}
                />

                {dayDuration.map((event) => {
                  const startHourFloor = Math.floor(event.startHour);
                  const slotNote = dayNotes.find((note) => note.hour === startHourFloor) ?? null;
                  const pointCount = getPointEventsInHour(dayPoints, startHourFloor).length;
                  const stackHeight = hourSlotStackHeight(pointCount, slotNote != null);
                  const eventsInHour = dayDuration.filter((item) =>
                    eventOverlapsHour(item, startHourFloor),
                  );
                  const pointsInHour = getPointEventsInHour(dayPoints, startHourFloor);
                  const isSingleOccupant =
                    eventsInHour.length === 1 &&
                    pointsInHour.length === 0 &&
                    slotNote == null &&
                    eventKey(eventsInHour[0]!) === eventKey(event);
                  const { top, height, left, width } = computeDurationEventGeometry(
                    event,
                    stackHeight,
                    { capAsSingleOccupant: isSingleOccupant },
                  );
                  const key = eventKey(event);
                  const showSubtitle = height >= CALENDAR_SINGLE_EVENT_MAX_HEIGHT_PX - 4;

                  return (
                    <button
                      key={key}
                      type="button"
                      className={cn(
                        'absolute z-[3] flex cursor-pointer items-start gap-1.5 overflow-hidden rounded-lg border border-l-[3px] px-1.5 py-1 text-left transition-shadow hover:z-[4] hover:shadow-[var(--shadow-pop)]',
                        CALENDAR_EVENT_BLOCK_CLASS[event.type],
                        selectedEventKey === key &&
                          'shadow-[0_0_0_1px_var(--bg-surface),0_0_0_2px_currentColor]',
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
                      <EventTypeIcon type={event.type} />
                      <span className="min-w-0 flex flex-col gap-0.5">
                        <span className="truncate text-[10.5px] leading-tight font-semibold">
                          {event.title}
                        </span>
                        {showSubtitle && (
                          <span className="truncate text-[9.5px] leading-tight font-medium opacity-85">
                            {event.user.full_name}
                          </span>
                        )}
                      </span>
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
