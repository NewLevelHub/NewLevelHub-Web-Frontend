import { useMemo } from 'react';

import { cn } from '@/shared/lib/cn';
import type { ResourceScheduleSlot } from '@/shared/types';

const DAY_MS = 24 * 60 * 60 * 1000;

function parseLocalDayBounds(isoDate: string): { dayStart: Date; dayEnd: Date } {
  const [y, m, d] = isoDate.split('-').map((x) => Number(x));
  const dayStart = new Date(y, m - 1, d, 0, 0, 0, 0);
  const dayEnd = new Date(y, m - 1, d + 1, 0, 0, 0, 0);
  return { dayStart, dayEnd };
}

function clipSegment(
  slotStart: number,
  slotEnd: number,
  dayStart: number,
  dayEnd: number,
): { left: number; width: number } | null {
  const s = Math.max(slotStart, dayStart);
  const e = Math.min(slotEnd, dayEnd);
  if (e <= s) return null;
  const left = ((s - dayStart) / DAY_MS) * 100;
  const width = ((e - s) / DAY_MS) * 100;
  return { left, width };
}

const HOUR_TICKS = [0, 6, 12, 18, 24];

type Props = {
  dayDate: string;
  slots: ResourceScheduleSlot[];
  className?: string;
};

export function ResourceDayTimeline({ dayDate, slots, className }: Props) {
  const { dayStart, dayEnd } = useMemo(() => parseLocalDayBounds(dayDate), [dayDate]);
  const dayStartMs = dayStart.getTime();
  const dayEndMs = dayEnd.getTime();

  const segments = useMemo(() => {
    const out: {
      left: number;
      width: number;
      label: string;
      isBlock: boolean;
    }[] = [];
    for (const sl of slots) {
      const start = new Date(sl.start).getTime();
      const end = new Date(sl.end).getTime();
      const geom = clipSegment(start, end, dayStartMs, dayEndMs);
      if (!geom) continue;
      const label =
        sl.booking_id != null
          ? (sl.user_name?.trim() || `Бронь #${sl.booking_id}`)
          : 'Блокировка';
      out.push({ ...geom, label, isBlock: sl.booking_id == null });
    }
    return out;
  }, [slots, dayStartMs, dayEndMs]);

  return (
    <div className={cn('space-y-2', className)}>
      <div className="relative h-14 rounded-lg border border-gray-200 bg-gradient-to-b from-gray-50 to-white overflow-hidden">
        <div className="absolute inset-0 flex">
          {HOUR_TICKS.slice(0, -1).map((h) => (
            <div
              key={h}
              className="flex-1 border-r border-gray-100/80 last:border-r-0"
              title={`${h}:00`}
            />
          ))}
        </div>
        {segments.map((seg, idx) => (
          <div
            key={`${seg.left}-${seg.width}-${idx}`}
            className={cn(
              'absolute top-1 bottom-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-white shadow-sm overflow-hidden flex items-center',
              seg.isBlock ? 'bg-amber-700/95' : 'bg-rose-600/95',
            )}
            style={{ left: `${seg.left}%`, width: `${Math.max(seg.width, 0.35)}%` }}
            title={seg.label}
          >
            <span className="truncate">{seg.label}</span>
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-gray-500 px-0.5">
        {HOUR_TICKS.map((h) => (
          <span key={h}>{h === 24 ? '24:00' : `${h}:00`}</span>
        ))}
      </div>
    </div>
  );
}
