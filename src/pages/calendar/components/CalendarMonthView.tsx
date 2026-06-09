import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarDays } from 'lucide-react';

import { cn } from '@/shared/lib/cn';
import type { CalendarEvent } from '@/shared/types';

import { CALENDAR_EVENT_BLOCK_CLASS } from '../calendarConstants';
import { eventKey, type CalendarDayColumn } from '../calendarUtils';

type Props = {
  cells: (CalendarDayColumn | null)[];
  events: CalendarEvent[];
  weekdayLabels: string[];
  filtersActive: boolean;
  onEventClick: (event: CalendarEvent, anchor: HTMLElement) => void;
};

export function CalendarMonthView({
  cells,
  events,
  weekdayLabels,
  filtersActive,
  onEventClick,
}: Props) {
  const { t } = useTranslation();

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const start = event.start.slice(0, 10);
      const end = event.end.slice(0, 10);
      let cursor = start;
      while (cursor <= end) {
        const list = map.get(cursor) ?? [];
        list.push(event);
        map.set(cursor, list);
        const [y, m, d] = cursor.split('-').map(Number);
        const next = new Date(y, m - 1, d + 1);
        cursor = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
      }
    }
    return map;
  }, [events]);

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-5 py-[70px] text-center">
        <div className="mb-1.5 flex h-[58px] w-[58px] items-center justify-center rounded-2xl border border-default bg-raised text-muted">
          <CalendarDays className="h-7 w-7" />
        </div>
        <div className="text-[15px] font-semibold text-primary">
          {filtersActive ? t('calendar.noEventsFiltered') : t('calendar.noEvents')}
        </div>
        <div className="max-w-md text-[13px] text-muted">
          {filtersActive ? t('calendar.noEventsFilteredHint') : t('calendar.noEventsHint')}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="grid grid-cols-7 border-b border-default bg-raised">
        {weekdayLabels.map((label) => (
          <div
            key={label}
            className="border-r border-default px-2 py-2.5 text-center text-[11px] font-semibold tracking-[0.04em] text-muted uppercase last:border-r-0"
          >
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((cell, index) => {
          if (!cell) {
            return <div key={`empty-${index}`} className="min-h-[110px] border-r border-b border-default bg-page last:border-r-0" />;
          }

          const dayEvents = eventsByDay.get(cell.iso) ?? [];

          return (
            <div
              key={cell.iso}
              className={cn(
                'min-h-[110px] border-r border-b border-default p-2 last:border-r-0',
                cell.isToday && 'bg-[rgba(16,160,114,0.04)]',
              )}
            >
              <div
                className={cn(
                  'mb-1.5 text-sm font-bold text-primary',
                  cell.isToday &&
                    'inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand text-white',
                )}
              >
                {cell.dayNum}
              </div>
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map((event) => (
                  <button
                    key={eventKey(event)}
                    type="button"
                    className={cn(
                      'block w-full truncate rounded-lg border border-l-[3px] px-1.5 py-1 text-left text-[11px] font-semibold',
                      CALENDAR_EVENT_BLOCK_CLASS[event.type],
                    )}
                    onClick={(e) => onEventClick(event, e.currentTarget)}
                  >
                    {event.title}
                  </button>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-[10px] font-medium text-muted">
                    {t('calendar.moreEvents', { count: dayEvents.length - 3 })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
