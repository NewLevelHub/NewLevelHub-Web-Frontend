import { CALENDAR_EVENT_TYPES, type CalendarEventType } from '@/shared/config/constants';
import type { CalendarEvent } from '@/shared/types';

import {
  CALENDAR_END_HOUR,
  CALENDAR_HOUR_HEIGHT_PX,
  CALENDAR_START_HOUR,
} from './calendarConstants';

export type CalendarDayColumn = {
  iso: string;
  dowLabel: string;
  dayNum: number;
  isToday: boolean;
};

export const CALENDAR_SLOT_CHIP_HEIGHT_PX = 22;
export const CALENDAR_SLOT_CHIP_GAP_PX = 2;
export const CALENDAR_SLOT_PADDING_PX = 3;
export const CALENDAR_SINGLE_EVENT_MAX_HEIGHT_PX = 32;

export type PositionedTimedEvent = CalendarEvent & {
  dayIso: string;
  startHour: number;
  endHour: number;
  lane: number;
  laneCount: number;
};

export type PositionedLeaveEvent = CalendarEvent & {
  col: number;
  dayIso: string;
};

export function toIsoDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function startOfWeek(date: Date) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function addDaysIso(iso: string, delta: number) {
  const [y, m, d] = iso.split('-').map(Number);
  const next = new Date(y, m - 1, d + delta);
  return toIsoDate(next);
}

export function daysBetweenInclusive(startIso: string, endIso: string) {
  const [sy, sm, sd] = startIso.split('-').map(Number);
  const [ey, em, ed] = endIso.split('-').map(Number);
  const start = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);
  return Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
}

export function buildWeekColumns(anchorDate: Date, todayIso: string, dowFormatter: Intl.DateTimeFormat): CalendarDayColumn[] {
  const weekStart = startOfWeek(anchorDate);
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + index);
    const iso = toIsoDate(day);
    return {
      iso,
      dowLabel: dowFormatter.format(day),
      dayNum: day.getDate(),
      isToday: iso === todayIso,
    };
  });
}

export function buildMonthGrid(anchorDate: Date, todayIso: string): (CalendarDayColumn | null)[] {
  const monthStart = startOfMonth(anchorDate);
  const monthEnd = endOfMonth(anchorDate);
  const leading = (monthStart.getDay() + 6) % 7;
  const cells: (CalendarDayColumn | null)[] = Array.from({ length: leading }, () => null);

  for (let day = 1; day <= monthEnd.getDate(); day += 1) {
    const date = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), day);
    const iso = toIsoDate(date);
    cells.push({
      iso,
      dowLabel: '',
      dayNum: day,
      isToday: iso === todayIso,
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

function toDecimalHour(value: Date) {
  return value.getHours() + value.getMinutes() / 60 + value.getSeconds() / 3600;
}

function eventKey(event: CalendarEvent) {
  return `${event.type}-${event.start}-${event.user.id}-${event.title}`;
}

export function isAllDayLeave(event: CalendarEvent) {
  return event.type === CALENDAR_EVENT_TYPES.LEAVE;
}

export function isPointCalendarEvent(type: CalendarEventType) {
  return (
    type === CALENDAR_EVENT_TYPES.TASK_DEADLINE || type === CALENDAR_EVENT_TYPES.GUEST_VISIT
  );
}

export function isDurationCalendarEvent(event: CalendarEvent) {
  return !isAllDayLeave(event) && !isPointCalendarEvent(event.type);
}

export function layoutLeaveEvents(
  events: CalendarEvent[],
  weekStartIso: string,
  weekEndIso: string,
  dayIsos: string[],
): PositionedLeaveEvent[] {
  const dayIndex = new Map(dayIsos.map((iso, index) => [iso, index]));
  const positioned: PositionedLeaveEvent[] = [];

  for (const event of events.filter(isAllDayLeave)) {
    const rawStart = event.start.slice(0, 10);
    const rawEnd = event.end.slice(0, 10);
    let current = rawStart < weekStartIso ? weekStartIso : rawStart;
    const spanEnd = rawEnd > weekEndIso ? weekEndIso : rawEnd;

    while (current <= spanEnd) {
      const col = dayIndex.get(current);
      if (col != null) {
        positioned.push({ ...event, col, dayIso: current });
      }
      current = addDaysIso(current, 1);
    }
  }

  return positioned;
}

export function layoutTimedEvents(
  events: CalendarEvent[],
  dayIsos: string[],
): PositionedTimedEvent[] {
  const timed = events.filter((event) => isDurationCalendarEvent(event));
  const byDay = new Map<string, PositionedTimedEvent[]>();

  for (const event of timed) {
    const dayIso = event.start.slice(0, 10);
    if (!dayIsos.includes(dayIso)) continue;

    const startDate = new Date(event.start);
    const endDate = new Date(event.end);
    const startHour = toDecimalHour(startDate);
    const endHour = Math.max(startHour + 0.5, toDecimalHour(endDate));

    const list = byDay.get(dayIso) ?? [];
    list.push({
      ...event,
      dayIso,
      startHour,
      endHour,
      lane: 0,
      laneCount: 1,
    });
    byDay.set(dayIso, list);
  }

  const positioned: PositionedTimedEvent[] = [];

  for (const dayIso of dayIsos) {
    const dayEvents = (byDay.get(dayIso) ?? []).sort((a, b) => a.startHour - b.startHour);
    const lanes: number[] = [];

    for (const event of dayEvents) {
      let lane = lanes.findIndex((end) => end <= event.startHour);
      if (lane === -1) {
        lane = lanes.length;
        lanes.push(event.endHour);
      } else {
        lanes[lane] = event.endHour;
      }
      event.lane = lane;
    }

    const laneCount = Math.max(1, lanes.length);
    for (const event of dayEvents) {
      positioned.push({ ...event, laneCount });
    }
  }

  return positioned;
}

export function layoutPointEvents(
  events: CalendarEvent[],
  dayIsos: string[],
): PositionedTimedEvent[] {
  const positioned: PositionedTimedEvent[] = [];

  for (const event of events) {
    if (!isPointCalendarEvent(event.type)) continue;

    const dayIso = event.start.slice(0, 10);
    if (!dayIsos.includes(dayIso)) continue;

    const startHour = toDecimalHour(new Date(event.start));
    positioned.push({
      ...event,
      dayIso,
      startHour,
      endHour: startHour + 0.5,
      lane: 0,
      laneCount: 1,
    });
  }

  return positioned.sort((a, b) => a.startHour - b.startHour || a.title.localeCompare(b.title));
}

export function getPointEventsInHour(events: PositionedTimedEvent[], hour: number) {
  return events.filter(
    (event) => isPointCalendarEvent(event.type) && Math.floor(event.startHour) === hour,
  );
}

export function getSlotStackHeight(itemCount: number) {
  if (itemCount <= 0) return 0;
  return (
    CALENDAR_SLOT_PADDING_PX +
    itemCount * CALENDAR_SLOT_CHIP_HEIGHT_PX +
    (itemCount - 1) * CALENDAR_SLOT_CHIP_GAP_PX
  );
}

export function hourSlotStackHeight(pointCount: number, hasNote: boolean) {
  return getSlotStackHeight(pointCount + (hasNote ? 1 : 0));
}

export function formatHourLabel(hour: number) {
  const hh = Math.floor(hour);
  const mm = Math.round((hour - hh) * 60);
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export function calendarBodyHeightPx() {
  return (CALENDAR_END_HOUR - CALENDAR_START_HOUR) * CALENDAR_HOUR_HEIGHT_PX;
}

export function eventTopPx(startHour: number) {
  return (startHour - CALENDAR_START_HOUR) * CALENDAR_HOUR_HEIGHT_PX;
}

export function eventOverlapsHour(event: PositionedTimedEvent, hour: number) {
  return event.startHour < hour + 1 && event.endHour > hour;
}

export function computeDurationEventGeometry(
  event: PositionedTimedEvent,
  stackHeight: number,
  options?: { capAsSingleOccupant?: boolean },
) {
  const top = eventTopPx(event.startHour) + stackHeight;
  const width = 100 / event.laneCount;
  const left = event.lane * width;
  const spanPx = (event.endHour - event.startHour) * CALENDAR_HOUR_HEIGHT_PX;
  let height = Math.max(22, spanPx - stackHeight - CALENDAR_SLOT_PADDING_PX);

  if (options?.capAsSingleOccupant && spanPx <= CALENDAR_HOUR_HEIGHT_PX + 1) {
    height = Math.min(height, CALENDAR_SINGLE_EVENT_MAX_HEIGHT_PX);
  }

  return { top, height, left, width };
}

export { eventKey };
