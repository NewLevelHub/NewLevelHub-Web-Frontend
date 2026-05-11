import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { BOOKING_RESOURCE_CATALOG_STATUS } from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';
import type { BookingResourceCatalogStatus } from '@/shared/config/constants';
import type { ResourceScheduleSlot } from '@/shared/types';

// ─── Time window: 09:00 – 18:00 ──────────────────────────────────────────────

const VIEW_START_H = 9;
const VIEW_END_H = 18;
const VIEW_RANGE_MS = (VIEW_END_H - VIEW_START_H) * 60 * 60 * 1000;
const HOUR_TICKS = [9, 12, 15, 18];

const DAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMondayIso(today: Date): string {
  const d = new Date(today);
  d.setHours(0, 0, 0, 0);
  const dow = (d.getDay() + 6) % 7;
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

function shortDate(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}.${m}`;
}

function fmtTime(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

interface Segment {
  left: number;
  width: number;
  startMs: number;
  endMs: number;
  isBlock: boolean;
  isSoonAvailable: boolean;
  label: string;
  /** index into the original (unmerged) slots that contributed to this segment */
  slotIndices: number[];
}

function buildSegments(slots: ResourceScheduleSlot[], dayStartMs: number): Segment[] {
  const viewStartMs = dayStartMs + VIEW_START_H * 3600_000;
  const viewEndMs   = dayStartMs + VIEW_END_H   * 3600_000;

  const raw: Segment[] = [];
  slots.forEach((sl, idx) => {
    const s = Math.max(new Date(sl.start).getTime(), viewStartMs);
    const e = Math.min(new Date(sl.end).getTime(),   viewEndMs);
    if (e <= s) return;
    raw.push({
      left:  ((s - viewStartMs) / VIEW_RANGE_MS) * 100,
      width: ((e - s)           / VIEW_RANGE_MS) * 100,
      startMs: s,
      endMs:   e,
      isBlock: sl.booking_id == null,
      isSoonAvailable: sl.status === 'soon_available',
      label:
        sl.booking_id != null
          ? sl.user_name?.trim() || `Бронь #${sl.booking_id}`
          : 'Блокировка',
      slotIndices: [idx],
    });
  });

  raw.sort((a, b) => a.left - b.left);

  const merged: Segment[] = [];
  for (const cur of raw) {
    const prev = merged[merged.length - 1];
    if (prev && prev.isBlock === cur.isBlock && prev.isSoonAvailable === cur.isSoonAvailable && cur.left <= prev.left + prev.width) {
      prev.width       = Math.max(prev.width, cur.left + cur.width - prev.left);
      prev.endMs       = Math.max(prev.endMs, cur.endMs);
      prev.slotIndices.push(...cur.slotIndices);
    } else {
      merged.push({ ...cur, slotIndices: [...cur.slotIndices] });
    }
  }
  return merged;
}

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_DOT: Record<BookingResourceCatalogStatus, string> = {
  [BOOKING_RESOURCE_CATALOG_STATUS.FREE]:           'bg-emerald-400',
  [BOOKING_RESOURCE_CATALOG_STATUS.OCCUPIED]:       'bg-rose-400',
  [BOOKING_RESOURCE_CATALOG_STATUS.BLOCKED]:        'bg-slate-400',
  [BOOKING_RESOURCE_CATALOG_STATUS.SOON_AVAILABLE]: 'bg-amber-400',
};

const STATUS_LABEL_SHORT: Record<BookingResourceCatalogStatus, string> = {
  [BOOKING_RESOURCE_CATALOG_STATUS.FREE]:           'Свободен',
  [BOOKING_RESOURCE_CATALOG_STATUS.OCCUPIED]:       'Занят',
  [BOOKING_RESOURCE_CATALOG_STATUS.BLOCKED]:        'Заблок.',
  [BOOKING_RESOURCE_CATALOG_STATUS.SOON_AVAILABLE]: 'Скоро свободен',
};

// ─── Slot detail popup ────────────────────────────────────────────────────────

interface SlotDetailPanelProps {
  isoDay: string;
  slots: ResourceScheduleSlot[];
  onClose: () => void;
}

function SlotDetailPanel({ isoDay, slots, onClose }: SlotDetailPanelProps) {
  const [, m, d] = isoDay.split('-');
  const dateStr = `${d}.${m}`;

  return (
    <div className="mt-1 rounded-lg border border-gray-600 bg-gray-850 shadow-lg text-xs overflow-hidden"
         style={{ background: 'rgb(17 24 39)' }}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
        <span className="font-medium text-gray-200">Занятость {dateStr}</span>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-500 hover:text-gray-300 transition-colors"
        >
          <X size={13} />
        </button>
      </div>
      <ul className="divide-y divide-gray-800">
        {slots.map((sl, i) => {
          const startMs = new Date(sl.start).getTime();
          const endMs   = new Date(sl.end).getTime();
          const isBlock = sl.booking_id == null;
          return (
            <li key={i} className="flex items-start gap-2 px-3 py-2">
              <span
                className={cn(
                  'mt-0.5 shrink-0 h-2 w-2 rounded-full',
                  isBlock ? 'bg-amber-400' : 'bg-rose-400',
                )}
              />
              <div className="min-w-0">
                <p className="font-medium text-gray-200 truncate">
                  {isBlock ? 'Блокировка' : (sl.user_name?.trim() || `Бронь #${sl.booking_id}`)}
                </p>
                <p className="text-gray-500 tabular-nums">
                  {fmtTime(startMs)} – {fmtTime(endMs)}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ─── Single day row ────────────────────────────────────────────────────────────

interface DayRowProps {
  slots: ResourceScheduleSlot[];
  isLoading: boolean;
  isoDay: string;
  label: string;
  dateLabel: string;
  isToday: boolean;
  nowPct?: number;
  currentStatus?: BookingResourceCatalogStatus;
}

function DayRow({ slots, isLoading, isoDay, label, dateLabel, isToday, nowPct, currentStatus }: DayRowProps) {
  const [detailOpen, setDetailOpen] = useState(false);

  const [y, m, d] = isoDay.split('-').map(Number);
  const dayStartMs = new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
  const segments = buildSegments(slots, dayStartMs);
  const hasBusy = segments.length > 0;
  const isCompletelyFree = !isLoading && !hasBusy;

  return (
    <div>
      <div className={cn('flex items-center gap-2', isToday && 'relative')}>
        {/* Day label */}
        <div className="flex w-16 shrink-0 flex-col items-end gap-0.5">
          <div className="flex items-center gap-1">
            {isToday && currentStatus && (
              <span
                className={cn('inline-block h-1.5 w-1.5 rounded-full shrink-0', STATUS_DOT[currentStatus])}
                title={STATUS_LABEL_SHORT[currentStatus]}
              />
            )}
            <span className={cn('text-[11px] font-semibold leading-tight', isToday ? 'text-indigo-400' : 'text-gray-400')}>
              {label}
            </span>
          </div>
          <span className={cn('text-[10px] leading-tight tabular-nums', isToday ? 'text-indigo-400/70' : 'text-gray-600')}>
            {dateLabel}
          </span>
        </div>

        {/* Timeline bar */}
        <div
          className={cn(
            'relative h-6 flex-1 overflow-hidden rounded',
            isToday ? 'bg-gray-800 ring-1 ring-indigo-500/30' : 'bg-gray-900/80',
            hasBusy && 'cursor-pointer',
          )}
          onClick={() => hasBusy && setDetailOpen((v) => !v)}
          title={hasBusy ? 'Нажмите, чтобы посмотреть детали' : undefined}
        >
          {isLoading ? (
            <div className="h-full w-full animate-pulse bg-gray-700/50 rounded" />
          ) : (
            <>
              {/* Free background */}
              {isCompletelyFree && (
                <div className="absolute inset-0 bg-emerald-900/20 rounded" />
              )}

              {/* Busy segments */}
              {segments.map((seg, i) => (
                <div
                  key={i}
                  className={cn(
                    'absolute top-1 bottom-1 rounded-sm transition-opacity',
                    seg.isBlock ? 'bg-amber-500/75' : 'bg-rose-500/80',
                    detailOpen && 'opacity-90 ring-1 ring-white/20',
                  )}
                  style={{ left: `${seg.left}%`, width: `${Math.max(seg.width, 1)}%` }}
                />
              ))}

              {/* Free label */}
              {isCompletelyFree && (
                <div className="absolute inset-0 flex items-center pl-2">
                  <span className="text-[10px] font-medium text-emerald-500/70">свободно</span>
                </div>
              )}

              {/* "Now" marker */}
              {isToday && nowPct !== undefined && nowPct >= 0 && nowPct <= 100 && (
                <div
                  className="absolute top-0 bottom-0 w-px bg-indigo-400 z-10"
                  style={{ left: `${nowPct}%` }}
                >
                  <div className="absolute -top-0.5 -left-[3px] h-1.5 w-1.5 rounded-full bg-indigo-400" />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Detail popup */}
      {detailOpen && slots.length > 0 && (
        <SlotDetailPanel
          isoDay={isoDay}
          slots={slots}
          onClose={() => setDetailOpen(false)}
        />
      )}
    </div>
  );
}

// ─── Public component ──────────────────────────────────────────────────────────

interface Props {
  resourceId: number;
  currentStatus?: BookingResourceCatalogStatus;
  className?: string;
}

export function ResourceWeekMiniTimeline({ resourceId, currentStatus, className }: Props) {
  const now = new Date();
  const todayIso = isoDate(now);
  const monday = getMondayIso(now);
  const days = Array.from({ length: 7 }, (_, i) => addDaysToIso(monday, i));

  const { data: weekSlots = [], isLoading } = useQuery<ResourceScheduleSlot[]>({
    queryKey: ['resource-week-schedule', resourceId, monday],
    queryFn: () =>
      apiClient
        .get<ResourceScheduleSlot[]>(API.bookings.resources.schedule(String(resourceId)), {
          params: { week: monday },
        })
        .then((r) => r.data),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 60_000,
  });

  // "Now" position within the 9–18 window
  const [todayY, todayM, todayD] = todayIso.split('-').map(Number);
  const todayStartMs  = new Date(todayY, todayM - 1, todayD, 0, 0, 0, 0).getTime();
  const viewStartMs   = todayStartMs + VIEW_START_H * 3600_000;
  const nowOffsetMs   = now.getTime() - viewStartMs;
  const nowPct        = (nowOffsetMs / VIEW_RANGE_MS) * 100;

  return (
    <div className={cn('space-y-1', className)}>
      {/* Hour tick labels */}
      <div className="flex items-center gap-2">
        <div className="w-16 shrink-0" />
        <div className="flex flex-1 justify-between">
          {HOUR_TICKS.map((h) => (
            <span key={h} className="text-[9px] text-gray-600 tabular-nums">
              {String(h).padStart(2, '0')}:00
            </span>
          ))}
        </div>
      </div>

      {days.map((iso, idx) => (
        <DayRow
          key={iso}
          slots={weekSlots.filter((sl) => sl.start.startsWith(iso))}
          isLoading={isLoading}
          isoDay={iso}
          label={DAY_LABELS[idx]}
          dateLabel={shortDate(iso)}
          isToday={iso === todayIso}
          nowPct={iso === todayIso ? nowPct : undefined}
          currentStatus={iso === todayIso ? currentStatus : undefined}
        />
      ))}

      {/* Legend */}
      <div className="flex items-center gap-3 pt-1">
        <div className="w-16 shrink-0" />
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="flex items-center gap-1 text-[10px] text-gray-500">
            <span className="inline-block h-2 w-3 rounded-sm bg-rose-500/80" />
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
          <span className="flex items-center gap-1 text-[10px] text-gray-500">
            <span className="inline-block h-2 w-3 rounded-sm bg-emerald-900/40 border border-emerald-700/40" />
            Свободно
          </span>
          {currentStatus && (
            <span className="flex items-center gap-1 text-[10px] text-gray-500">
              <span className={cn('inline-block h-2 w-2 rounded-full', STATUS_DOT[currentStatus])} />
              Сейчас: {STATUS_LABEL_SHORT[currentStatus]}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 pt-0.5">
        <div className="w-16 shrink-0" />
        <p className="text-[9px] text-gray-600">Нажмите на занятый день, чтобы увидеть детали</p>
      </div>
    </div>
  );
}
