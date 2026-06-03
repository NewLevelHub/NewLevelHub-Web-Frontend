/** Python weekday: Monday=0 … Sunday=6 (matches backend day_of_week). */
export function pythonWeekday(date: Date): number {
  return (date.getDay() + 6) % 7;
}

export function localTodayIso(): string {
  return formatLocalIso(new Date());
}

export function formatLocalIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/** First calendar date for weekday on or after baseDate (backend _first_matching_weekday). */
export function firstMatchingWeekday(dayOfWeek: number, baseDate: Date): Date {
  const daysAhead = (dayOfWeek - pythonWeekday(baseDate) + 7) % 7;
  return addDays(baseDate, daysAhead);
}

/** All occurrence dates from validFrom through repeatUntil inclusive (backend _matching_dates). */
export function matchingSeriesDateIsos(
  dayOfWeek: number,
  validFrom: Date,
  repeatUntilIso: string,
): string[] {
  const endDate = parseLocalDate(repeatUntilIso);
  const dates: string[] = [];
  const daysUntilFirst = (dayOfWeek - pythonWeekday(validFrom) + 7) % 7;
  let current = addDays(validFrom, daysUntilFirst);
  while (current <= endDate) {
    dates.push(formatLocalIso(current));
    current = addDays(current, 7);
  }
  return dates;
}

export type RecurringSeriesDateStatus = 'will_create' | 'skipped_past';

export interface RecurringSeriesDateEntry {
  iso: string;
  status: RecurringSeriesDateStatus;
}

function isSlotEndInPast(dateIso: string, endTime: string, now: Date): boolean {
  const [hours, minutes] = endTime.split(':').map(Number);
  const end = parseLocalDate(dateIso);
  end.setHours(hours, minutes ?? 0, 0, 0);
  return end.getTime() <= now.getTime();
}

export function recurringSeriesDateEntries(params: {
  dayOfWeek: number;
  validFrom: string;
  repeatUntil: string | null;
  endTime: string;
  now?: Date;
}): RecurringSeriesDateEntry[] {
  if (!params.repeatUntil) return [];
  const now = params.now ?? new Date();
  const endTime = params.endTime.slice(0, 5);
  const validFrom = parseLocalDate(params.validFrom);
  const isos = matchingSeriesDateIsos(params.dayOfWeek, validFrom, params.repeatUntil);
  return isos.map((iso) => ({
    iso,
    status: isSlotEndInPast(iso, endTime, now) ? 'skipped_past' : 'will_create',
  }));
}

/** True when at least one occurrence in the create range is not in the past. */
export function hasCreatableRecurringSeriesDate(params: {
  dayOfWeek: number;
  repeatUntil: string;
  endTime: string;
  now?: Date;
}): boolean {
  return previewRecurringSeriesDates(params).some((entry) => entry.status === 'will_create');
}

/** Preview dates the backend will materialise when creating a series. */
export function previewRecurringSeriesDates(params: {
  dayOfWeek: number;
  repeatUntil: string;
  endTime: string;
  now?: Date;
}): RecurringSeriesDateEntry[] {
  const today = parseLocalDate(localTodayIso());
  const validFrom = formatLocalIso(firstMatchingWeekday(params.dayOfWeek, today));
  return recurringSeriesDateEntries({
    dayOfWeek: params.dayOfWeek,
    validFrom,
    repeatUntil: params.repeatUntil,
    endTime: params.endTime,
    now: params.now,
  });
}
