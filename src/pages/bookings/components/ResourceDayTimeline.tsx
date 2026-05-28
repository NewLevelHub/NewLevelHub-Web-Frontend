import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

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

type NormalizedInterval = {
  start: number;
  end: number;
  isBlock: boolean;
  isSoonAvailable: boolean;
  label: string;
};

function slotLabel(sl: ResourceScheduleSlot): string {
  return sl.booking_id != null
    ? (sl.user_name?.trim() || `#${sl.booking_id}`)
    : '__block__';
}

function normalizeIntervals(
  slots: ResourceScheduleSlot[],
  dayStartMs: number,
  dayEndMs: number,
): NormalizedInterval[] {
  // 1) Clip to selected day, drop invalid.
  const clipped: NormalizedInterval[] = [];
  for (const sl of slots) {
    const start = new Date(sl.start).getTime();
    const end = new Date(sl.end).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
    const s = Math.max(start, dayStartMs);
    const e = Math.min(end, dayEndMs);
    if (e <= s) continue;
    clipped.push({
      start: s,
      end: e,
      isBlock: sl.booking_id == null,
      isSoonAvailable: sl.status === 'soon_available',
      label: slotLabel(sl),
    });
  }

  // 2) Deterministic order to avoid flicker after refetches.
  clipped.sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start;
    if (a.end !== b.end) return a.end - b.end;
    if (a.isBlock !== b.isBlock) return Number(a.isBlock) - Number(b.isBlock);
    return a.label.localeCompare(b.label);
  });

  // 3) Remove exact duplicates.
  const deduped: NormalizedInterval[] = [];
  for (const cur of clipped) {
    const prev = deduped[deduped.length - 1];
    if (
      prev &&
      prev.start === cur.start &&
      prev.end === cur.end &&
      prev.isBlock === cur.isBlock &&
      prev.label === cur.label
    ) {
      continue;
    }
    deduped.push(cur);
  }

  // 4) Merge intersecting/adjacent ranges with the same visual semantics.
  const merged: NormalizedInterval[] = [];
  for (const cur of deduped) {
    const prev = merged[merged.length - 1];
    if (!prev) {
      merged.push({ ...cur });
      continue;
    }
    if (prev.isBlock === cur.isBlock && prev.isSoonAvailable === cur.isSoonAvailable && prev.label === cur.label && cur.start <= prev.end) {
      prev.end = Math.max(prev.end, cur.end);
      continue;
    }
    merged.push({ ...cur });
  }

  return merged;
}

function resolveLabel(label: string, t: (key: string, opts?: Record<string, unknown>) => string): string {
  if (label === '__block__') return t('booking.timeline.blockLabel');
  if (label.startsWith('#')) return t('booking.timeline.bookingLabel', { id: label.slice(1) });
  return label;
}

export function ResourceDayTimeline({ dayDate, slots, className }: Props) {
  const { t } = useTranslation();
  const { dayStart, dayEnd } = useMemo(() => parseLocalDayBounds(dayDate), [dayDate]);
  const dayStartMs = dayStart.getTime();
  const dayEndMs = dayEnd.getTime();

  const segments = useMemo(() => {
    const out: {
      left: number;
      width: number;
      label: string;
      isBlock: boolean;
      isSoonAvailable: boolean;
    }[] = [];
    const normalized = normalizeIntervals(slots, dayStartMs, dayEndMs);
    for (const sl of normalized) {
      const geom = clipSegment(sl.start, sl.end, dayStartMs, dayEndMs);
      if (!geom) continue;
      out.push({ ...geom, label: sl.label, isBlock: sl.isBlock, isSoonAvailable: sl.isSoonAvailable });
    }
    return out;
  }, [slots, dayStartMs, dayEndMs]);

  return (
    <div className={cn('space-y-2', className)}>
      <div className="relative h-14 rounded-lg border border-default bg-gradient-to-b from-gray-50 to-white overflow-hidden">
        <div className="absolute inset-0 flex">
          {HOUR_TICKS.slice(0, -1).map((h) => (
            <div
              key={h}
              className="flex-1 border-r border-default/80 last:border-r-0"
              title={`${h}:00`}
            />
          ))}
        </div>
        {segments.map((seg, idx) => (
          <div
            key={`${seg.left}-${seg.width}-${idx}`}
            className={cn(
              'absolute top-1 bottom-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-primary shadow-sm overflow-hidden flex items-center',
              seg.isBlock ? 'bg-amber-700/95' : seg.isSoonAvailable ? 'bg-amber-500/95' : 'bg-rose-600/95',
            )}
            style={{ left: `${seg.left}%`, width: `${Math.max(seg.width, 0.35)}%` }}
            title={resolveLabel(seg.label, t)}
          >
            <span className="truncate">{resolveLabel(seg.label, t)}</span>
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-muted px-0.5">
        {HOUR_TICKS.map((h) => (
          <span key={h}>{`${String(h).padStart(2, '0')}:00`}</span>
        ))}
      </div>
    </div>
  );
}
