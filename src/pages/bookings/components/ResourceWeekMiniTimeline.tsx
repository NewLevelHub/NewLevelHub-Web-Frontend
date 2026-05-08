import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { cn } from '@/shared/lib/cn';
import type { ResourceScheduleSlot } from '@/shared/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000;

/** Подписи дней недели начиная с понедельника. */
const DAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

/** Метки часов на шкале (0, 6, 12, 18, 24). */
const HOUR_TICKS = [0, 6, 12, 18, 24];

/** ISO-дата понедельника недели, к которой принадлежит `today`. */
function getMondayIso(today: Date): string {
  const d = new Date(today);
  d.setHours(0, 0, 0, 0);
  const dow = (d.getDay() + 6) % 7; // Mon = 0
  d.setDate(d.getDate() - dow);
  return isoDate(d);
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDaysToIso(iso: string, delta: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return isoDate(new Date(y, m - 1, d + delta));
}

/** Дата в формате «04.05» */
function shortDate(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}.${m}`;
}

interface Segment {
  left: number;
  width: number;
  isBlock: boolean;
  isSoonAvailable: boolean;
  label: string;
}

function buildSegments(slots: ResourceScheduleSlot[], dayStartMs: number): Segment[] {
  const raw: Segment[] = [];
  for (const sl of slots) {
    const s = Math.max(new Date(sl.start).getTime(), dayStartMs);
    const e = Math.min(new Date(sl.end).getTime(), dayStartMs + DAY_MS);
    if (e <= s) continue;
    raw.push({
      left: ((s - dayStartMs) / DAY_MS) * 100,
      width: ((e - s) / DAY_MS) * 100,
      isBlock: sl.booking_id == null,
      isSoonAvailable: sl.status === 'soon_available',
      label:
        sl.booking_id != null
          ? sl.user_name?.trim() || `Бронь #${sl.booking_id}`
          : 'Блокировка',
    });
  }
  // dedupe & merge overlapping same-type segments
  raw.sort((a, b) => a.left - b.left);
  const merged: Segment[] = [];
  for (const cur of raw) {
    const prev = merged[merged.length - 1];
    if (prev && prev.isBlock === cur.isBlock && prev.isSoonAvailable === cur.isSoonAvailable && cur.left <= prev.left + prev.width) {
      prev.width = Math.max(prev.width, cur.left + cur.width - prev.left);
    } else {
      merged.push({ ...cur });
    }
  }
  return merged;
}

// ─── Single day row ────────────────────────────────────────────────────────────

interface DayRowProps {
  resourceId: number;
  isoDay: string;
  label: string;
  dateLabel: string;
  isToday: boolean;
}

function DayRow({ resourceId, isoDay, label, dateLabel, isToday }: DayRowProps) {
  const { data: slots, isLoading } = useQuery<ResourceScheduleSlot[]>({
    queryKey: ['resource-week-slot', resourceId, isoDay],
    queryFn: () =>
      apiClient
        .get<ResourceScheduleSlot[]>(API.bookings.resources.schedule(String(resourceId)), {
          params: { date: isoDay },
        })
        .then((r) => r.data),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 60_000,
  });

  const [y, m, d] = isoDay.split('-').map(Number);
  const dayStartMs = new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
  const segments = buildSegments(slots ?? [], dayStartMs);
  const hasBusy = segments.length > 0;

  return (
    <div className="flex items-center gap-2">
      {/* Day label */}
      <div className="flex w-14 shrink-0 flex-col items-end">
        <span
          className={cn(
            'text-[11px] font-medium leading-tight',
            isToday ? 'text-indigo-400' : 'text-gray-400',
          )}
        >
          {label}
        </span>
        <span className={cn('text-[9px] leading-tight', isToday ? 'text-indigo-500' : 'text-gray-600')}>
          {dateLabel}
        </span>
      </div>

      {/* Timeline bar */}
      <div className="relative h-5 flex-1 overflow-hidden rounded bg-gray-900/80">
        {isLoading ? (
          <div className="h-full w-full animate-pulse bg-gray-700/60 rounded" />
        ) : !hasBusy ? (
          <div className="flex h-full items-center pl-1.5">
            <span className="text-[9px] text-gray-600">свободно</span>
          </div>
        ) : (
          segments.map((seg, i) => (
            <div
              key={i}
              className={cn(
                'absolute top-0.5 bottom-0.5 rounded-sm',
                seg.isBlock ? 'bg-amber-600/80' : seg.isSoonAvailable ? 'bg-amber-400/90' : 'bg-rose-500/85',
              )}
              style={{ left: `${seg.left}%`, width: `${Math.max(seg.width, 0.6)}%` }}
              title={`${seg.label} — ${isoDay}`}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Public component ──────────────────────────────────────────────────────────

interface Props {
  resourceId: number;
  className?: string;
}

export function ResourceWeekMiniTimeline({ resourceId, className }: Props) {
  const today = new Date();
  const todayIso = isoDate(today);
  const monday = getMondayIso(today);
  const days = Array.from({ length: 7 }, (_, i) => addDaysToIso(monday, i));

  return (
    <div className={cn('space-y-1.5', className)}>
      {/* Hour tick labels */}
      <div className="flex items-center gap-2">
        <div className="w-14 shrink-0" />
        <div className="flex flex-1 justify-between px-0">
          {HOUR_TICKS.map((h) => (
            <span key={h} className="text-[8px] text-gray-600">
              {h === 24 ? '24' : `${h}`}
            </span>
          ))}
        </div>
      </div>

      {days.map((iso, idx) => (
        <DayRow
          key={iso}
          resourceId={resourceId}
          isoDay={iso}
          label={DAY_LABELS[idx]}
          dateLabel={shortDate(iso)}
          isToday={iso === todayIso}
        />
      ))}

      {/* Legend */}
      <div className="flex items-center gap-3 pt-0.5">
        <div className="w-14 shrink-0" />
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-[9px] text-gray-500">
            <span className="inline-block h-2 w-3 rounded-sm bg-rose-500/85" />
            Бронь
          </span>
          <span className="flex items-center gap-1 text-[9px] text-gray-500">
            <span className="inline-block h-2 w-3 rounded-sm bg-amber-400/90" />
            Скоро свободен
          </span>
          <span className="flex items-center gap-1 text-[9px] text-gray-500">
            <span className="inline-block h-2 w-3 rounded-sm bg-amber-600/80" />
            Блок
          </span>
        </div>
      </div>
    </div>
  );
}
