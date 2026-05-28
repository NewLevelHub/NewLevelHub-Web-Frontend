import { RESOURCE_EQUIPMENT_KEYS } from '@/shared/config/constants';
import type { ResourceEquipmentKey } from '@/shared/config/constants';
import type { BookingResourceDetail } from '@/shared/types';

// ─── Design token constants ───────────────────────────────────────────────────

export const inputCls =
  'w-full h-9 px-3 text-sm border border-default rounded-[var(--radius-sm)] bg-surface focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)] transition-colors';

export const textareaCls =
  'w-full px-3 py-2 text-sm border border-default rounded-[var(--radius-sm)] bg-surface focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)] resize-none transition-colors';

// ─── Day options ──────────────────────────────────────────────────────────────

/** {value, labelKey} for each weekday. labelKey indexes into common.weekdaysShort[value]. */
export const DAY_OPTIONS = [0, 1, 2, 3, 4, 5, 6].map((value) => ({
  value,
  labelKey: `common.weekdaysShort.${value}`,
}));

// ─── Equipment helpers ────────────────────────────────────────────────────────

export function defaultEquipment(): Record<ResourceEquipmentKey, boolean> {
  return {
    projector: false,
    tv: false,
    whiteboard: false,
    video_conf: false,
    monitor: false,
    dock: false,
    power_outlet: true,
  };
}

export function equipmentFromDetail(
  eq: BookingResourceDetail['equipment'],
): Record<ResourceEquipmentKey, boolean> {
  if (!eq) {
    return Object.fromEntries(
      RESOURCE_EQUIPMENT_KEYS.map((k) => [k, false]),
    ) as Record<ResourceEquipmentKey, boolean>;
  }
  return { ...eq } as Record<ResourceEquipmentKey, boolean>;
}

// ─── Date / time helpers ──────────────────────────────────────────────────────

/**
 * Converts separate date and time strings (local) to ISO 8601 string.
 * Returns null if either part is missing or produces an invalid date.
 */
export function localDateTimeToIso(datePart: string, timePart: string): string | null {
  if (!datePart || !timePart) return null;
  const date = new Date(`${datePart}T${timePart}`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

/**
 * Returns YYYY-MM-DD string for a given Date in local time.
 */
export function localIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Formats an ISO datetime string for display as DD.MM.YYYY, HH:MM (local time).
 */
export function fmtDT(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const HH = String(d.getHours()).padStart(2, '0');
  const MM = String(d.getMinutes()).padStart(2, '0');
  return `${dd}.${mm}.${yyyy}, ${HH}:${MM}`;
}

/**
 * Formats a block's time range for display.
 * If start and end are on the same calendar day, shows DD.MM.YYYY, HH:MM – HH:MM.
 * Otherwise shows full datetime for both ends.
 */
export function fmtBlockRange(start: string, end: string): string {
  const ds = new Date(start);
  const de = new Date(end);
  const sameDay =
    ds.getFullYear() === de.getFullYear() &&
    ds.getMonth() === de.getMonth() &&
    ds.getDate() === de.getDate();
  const timeOf = (d: Date) =>
    `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  if (sameDay) {
    const dd = String(ds.getDate()).padStart(2, '0');
    const mm = String(ds.getMonth() + 1).padStart(2, '0');
    return `${dd}.${mm}.${ds.getFullYear()}, ${timeOf(ds)} – ${timeOf(de)}`;
  }
  return `${fmtDT(start)} – ${fmtDT(end)}`;
}

// ─── Error parsing ────────────────────────────────────────────────────────────

/**
 * Extracts a human-readable error message from an API error.
 */
export function parseError(e: unknown): string {
  const raw = (e as { response?: { data?: unknown } })?.response?.data;
  if (!raw || typeof raw !== 'object') return '';

  const payload = raw as Record<string, unknown>;
  const detail = (payload.detail as Record<string, unknown> | undefined) ?? payload;
  if (!detail || typeof detail !== 'object') return '';

  for (const value of Object.values(detail)) {
    if (Array.isArray(value) && value.length > 0) return String(value[0]);
    if (typeof value === 'string') return value;
  }

  return '';
}
