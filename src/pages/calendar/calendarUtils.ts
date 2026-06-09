import { CALENDAR_EVENT_TYPES, type CalendarEventType } from '@/shared/config/constants';
import type { CalendarEvent } from '@/shared/types';

import {
  CALENDAR_CARD_MIN_HEIGHT_PX,
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
export const CALENDAR_SLOT_ICON_GAP_PX = 2;
export const CALENDAR_SLOT_ICONS_PER_ROW = 4;
export const CALENDAR_SINGLE_EVENT_MAX_HEIGHT_PX = 32;
export const CALENDAR_ALL_DAY_MIN_HEIGHT_PX = 42;
export const CALENDAR_ALL_DAY_PADDING_Y_PX = 12;

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

function eventsOverlapInTime(a: PositionedTimedEvent, b: PositionedTimedEvent) {
  return a.startHour < b.endHour && b.startHour < a.endHour;
}

function toPositionedTimedEvent(event: CalendarEvent, dayIso: string): PositionedTimedEvent | null {
  if (isAllDayLeave(event)) return null;

  if (isPointCalendarEvent(event.type)) {
    const startHour = toDecimalHour(new Date(event.start));
    return {
      ...event,
      dayIso,
      startHour,
      endHour: startHour + 0.5,
      lane: 0,
      laneCount: 1,
    };
  }

  if (isDurationCalendarEvent(event)) {
    const startDate = new Date(event.start);
    const endDate = new Date(event.end);
    const startHour = toDecimalHour(startDate);
    const endHour = Math.max(startHour + 0.5, toDecimalHour(endDate));
    return {
      ...event,
      dayIso,
      startHour,
      endHour,
      lane: 0,
      laneCount: 1,
    };
  }

  return null;
}

function assignOverlapLanes(dayEvents: PositionedTimedEvent[]) {
  const sorted = [...dayEvents].sort((a, b) => a.startHour - b.startHour);
  const lanes: number[] = [];

  for (const event of sorted) {
    let lane = lanes.findIndex((end) => end <= event.startHour);
    if (lane === -1) {
      lane = lanes.length;
      lanes.push(event.endHour);
    } else {
      lanes[lane] = event.endHour;
    }
    event.lane = lane;
  }

  for (const event of sorted) {
    const overlapping = sorted.filter((other) => eventsOverlapInTime(other, event));
    event.laneCount = Math.max(1, ...overlapping.map((other) => other.lane + 1));
  }

  return sorted;
}

/** Point + duration events with per-overlap-cluster lane layout (Google Calendar style). */
export function layoutOverlappingDayEvents(
  events: CalendarEvent[],
  dayIsos: string[],
): PositionedTimedEvent[] {
  const byDay = new Map<string, PositionedTimedEvent[]>();

  for (const event of events) {
    const dayIso = event.start.slice(0, 10);
    if (!dayIsos.includes(dayIso)) continue;

    const positioned = toPositionedTimedEvent(event, dayIso);
    if (!positioned) continue;

    const list = byDay.get(dayIso) ?? [];
    list.push(positioned);
    byDay.set(dayIso, list);
  }

  const positioned: PositionedTimedEvent[] = [];

  for (const dayIso of dayIsos) {
    const dayEvents = byDay.get(dayIso) ?? [];
    positioned.push(...assignOverlapLanes(dayEvents));
  }

  return positioned;
}

export function layoutTimedEvents(events: CalendarEvent[], dayIsos: string[]) {
  return layoutOverlappingDayEvents(events, dayIsos).filter((event) =>
    isDurationCalendarEvent(event),
  );
}

export function layoutPointEvents(events: CalendarEvent[], dayIsos: string[]) {
  return layoutOverlappingDayEvents(events, dayIsos).filter((event) =>
    isPointCalendarEvent(event.type),
  );
}

export function getPointEventsInHour(events: PositionedTimedEvent[], hour: number) {
  return events.filter(
    (event) => isPointCalendarEvent(event.type) && Math.floor(event.startHour) === hour,
  );
}

export function getDurationEventsStartingInHour(events: PositionedTimedEvent[], hour: number) {
  return events.filter(
    (event) => isDurationCalendarEvent(event) && Math.floor(event.startHour) === hour,
  );
}

export type CompactSlotLayout = {
  iconSize: number;
  perRow: number;
};

export function getCompactSlotLayout(
  itemCount: number,
  slotHeightPx = CALENDAR_HOUR_HEIGHT_PX,
): CompactSlotLayout {
  const maxH = slotHeightPx - CALENDAR_SLOT_PADDING_PX * 2;
  for (const size of [20, 18, 16, 14, 12]) {
    for (const perRow of [5, 4, 3]) {
      const rows = Math.ceil(itemCount / perRow);
      const h = rows * size + Math.max(0, rows - 1) * CALENDAR_SLOT_ICON_GAP_PX;
      if (h <= maxH) return { iconSize: size, perRow };
    }
  }
  return { iconSize: 12, perRow: 3 };
}

export function maxFullChipsInSlot(slotHeightPx: number) {
  const inner = slotHeightPx - CALENDAR_SLOT_PADDING_PX * 2;
  if (inner < CALENDAR_SLOT_CHIP_HEIGHT_PX) return 0;
  return Math.floor(
    (inner + CALENDAR_SLOT_CHIP_GAP_PX) / (CALENDAR_SLOT_CHIP_HEIGHT_PX + CALENDAR_SLOT_CHIP_GAP_PX),
  );
}

export function shouldUseCompactSlotDisplay(itemCount: number, slotHeightPx = CALENDAR_HOUR_HEIGHT_PX) {
  if (itemCount <= 0) return false;
  if (itemCount >= 2) return true;
  return itemCount > maxFullChipsInSlot(slotHeightPx);
}

export function getHourSlotItemCount(
  pointCount: number,
  hasNote: boolean,
  durationStartCount: number,
) {
  return pointCount + (hasNote ? 1 : 0) + durationStartCount;
}

export function shouldUseCompactHourSlot(
  pointCount: number,
  hasNote: boolean,
  durationStartCount: number,
) {
  const itemCount = getHourSlotItemCount(pointCount, hasNote, durationStartCount);
  if (itemCount <= 0) return false;
  if (itemCount >= 2) return true;

  if (durationStartCount > 0) {
    const stackH = getSlotStackHeight(itemCount - durationStartCount);
    const minDurationH = CALENDAR_SINGLE_EVENT_MAX_HEIGHT_PX;
    if (stackH + minDurationH > CALENDAR_HOUR_HEIGHT_PX - CALENDAR_SLOT_PADDING_PX) {
      return true;
    }
  }

  return shouldUseCompactSlotDisplay(itemCount);
}

export function shouldUseCompactAllDayDisplay(itemCount: number) {
  const inner = CALENDAR_ALL_DAY_MIN_HEIGHT_PX - CALENDAR_ALL_DAY_PADDING_Y_PX;
  return shouldUseCompactSlotDisplay(itemCount, inner + CALENDAR_SLOT_PADDING_PX * 2);
}

export function getCompactSlotIconSize(itemCount: number, slotHeightPx = CALENDAR_HOUR_HEIGHT_PX) {
  return getCompactSlotLayout(itemCount, slotHeightPx).iconSize;
}

export function compactSlotStackHeight(itemCount: number, slotHeightPx = CALENDAR_HOUR_HEIGHT_PX) {
  if (itemCount <= 0) return 0;
  const { iconSize, perRow } = getCompactSlotLayout(itemCount, slotHeightPx);
  const rows = Math.ceil(itemCount / perRow);
  const inner = rows * iconSize + Math.max(0, rows - 1) * CALENDAR_SLOT_ICON_GAP_PX;
  return CALENDAR_SLOT_PADDING_PX * 2 + inner;
}

export function getSlotStackHeight(itemCount: number) {
  if (itemCount <= 0) return 0;
  return (
    CALENDAR_SLOT_PADDING_PX +
    itemCount * CALENDAR_SLOT_CHIP_HEIGHT_PX +
    (itemCount - 1) * CALENDAR_SLOT_CHIP_GAP_PX
  );
}

export function hourSlotStackHeight(
  pointCount: number,
  hasNote: boolean,
  durationStartCount = 0,
) {
  const itemCount = getHourSlotItemCount(pointCount, hasNote, durationStartCount);
  if (itemCount <= 0) return 0;
  if (shouldUseCompactHourSlot(pointCount, hasNote, durationStartCount)) {
    return compactSlotStackHeight(itemCount);
  }
  return getSlotStackHeight(pointCount + (hasNote ? 1 : 0));
}

export function formatHourLabel(hour: number) {
  const hh = Math.floor(hour);
  const mm = Math.round((hour - hh) * 60);
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function formatAmPmHour(hour: number) {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  if (m === 0) return `${h12}${period}`;
  return `${h12}:${String(m).padStart(2, '0')}${period}`;
}

export function formatEventTimeRange(startHour: number, endHour: number) {
  return `${formatAmPmHour(startHour)}–${formatAmPmHour(endHour)}`;
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

/** Equal-width columns so overlapping events share the same card format. */
export function computeOverlapEventGeometry(
  event: PositionedTimedEvent,
  stackHeight: number,
  options?: { capAsSingleOccupant?: boolean; laneOverride?: number; laneCountOverride?: number },
) {
  const top = eventTopPx(event.startHour) + stackHeight;
  const n = Math.max(1, options?.laneCountOverride ?? event.laneCount);
  const lane = Math.min(options?.laneOverride ?? event.lane, n - 1);
  const columnWidth = 100 / n;
  const left = lane * columnWidth;
  const width = columnWidth;
  const spanPx = (event.endHour - event.startHour) * CALENDAR_HOUR_HEIGHT_PX;
  const endPx = eventTopPx(event.endHour) - CALENDAR_SLOT_PADDING_PX;
  const available = Math.max(0, endPx - top);

  let height = spanPx - stackHeight - CALENDAR_SLOT_PADDING_PX;
  // Always render at least CALENDAR_CARD_MIN_HEIGHT_PX so the card shows
  // icon + title + time range even for point events (30-min span = 27px).
  // The card may visually overflow its slot, which is acceptable.
  height = Math.max(CALENDAR_CARD_MIN_HEIGHT_PX, height);

  return { top, height, left, width, zIndex: 3 + lane };
}

export function computeDurationEventGeometry(
  event: PositionedTimedEvent,
  stackHeight: number,
  options?: { capAsSingleOccupant?: boolean },
) {
  return computeOverlapEventGeometry(event, stackHeight, options);
}

export function isNarrowOverlapStrip(widthPercent: number) {
  return widthPercent < 34;
}

export { eventKey };
