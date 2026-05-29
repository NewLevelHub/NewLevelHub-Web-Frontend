import i18n from '@/shared/lib/i18n';
import { dateLocaleTag } from '@/shared/lib/localeFormat';
import type { MapPoint, MapPointStatus } from '@/shared/types';

/**
 * Статусы для UI карты: три «живых» статуса брони + `none` для `resource_status: null`.
 * Значение `blocked` с API на карте не выделяем — показываем как занято (`occupied`).
 */
export type PointUiStatus = Exclude<MapPointStatus, 'blocked'> | 'none';

export const POINT_STATUS_CLASS: Record<PointUiStatus, string> = {
  free: 'bg-emerald-500 border-emerald-600 hover:bg-emerald-400',
  occupied: 'bg-rose-500 border-rose-600 hover:bg-rose-400',
  soon_available: 'bg-amber-500 border-amber-600 hover:bg-amber-400',
  none: 'bg-stone-500 border-stone-600 hover:bg-stone-400',
};

export const POINT_STATUS_LABEL_KEYS: Record<PointUiStatus, string> = {
  free: 'map.status.free',
  occupied: 'map.status.occupied',
  soon_available: 'map.status.soon_available',
  none: 'map.status.none',
};

export const STATUS_LABEL_CLASS: Record<PointUiStatus, string> = {
  free: 'text-emerald-400',
  occupied: 'text-rose-400',
  soon_available: 'text-amber-400',
  none: 'text-stone-400',
};

export const LEGEND_STATUS_KEYS: PointUiStatus[] = ['free', 'occupied', 'soon_available', 'none'];

export const LEGEND_ITEM_COLORS: Record<PointUiStatus, string> = {
  free: 'bg-emerald-500',
  occupied: 'bg-rose-500',
  soon_available: 'bg-amber-500',
  none: 'bg-stone-500',
};

export const ROOM_STATUS_STYLES: Record<PointUiStatus, { bg: string; border: string; text: string; nameText: string }> = {
  free: {
    bg: 'var(--status-free-bg)',
    border: 'color-mix(in oklab, var(--status-free-text) 30%, transparent)',
    text: 'var(--status-free-text)',
    nameText: 'var(--status-free-text)',
  },
  occupied: {
    bg: 'var(--status-busy-bg)',
    border: 'color-mix(in oklab, var(--status-busy-text) 30%, transparent)',
    text: 'var(--status-busy-text)',
    nameText: 'var(--status-busy-text)',
  },
  soon_available: {
    bg: 'var(--status-soon-bg)',
    border: 'color-mix(in oklab, var(--status-soon-text) 30%, transparent)',
    text: 'var(--status-soon-text)',
    nameText: 'var(--status-soon-text)',
  },
  none: {
    bg: 'var(--status-na-bg)',
    border: 'color-mix(in oklab, var(--status-na-text) 30%, transparent)',
    text: 'var(--status-na-text)',
    nameText: 'var(--status-na-text)',
  },
};

const BOOKABLE_STATUSES: readonly PointUiStatus[] = ['free', 'occupied', 'soon_available'];

const REASON_LABEL_KEYS: Record<string, string> = {
  active_block: 'map.reason.active_block',
  active_booking: 'map.reason.active_booking',
  active_booking_ends_within_threshold: 'map.reason.active_booking_ends_within_threshold',
  no_active_booking_or_block: 'map.reason.no_active_booking_or_block',
  not_a_bookable_resource: 'map.reason.not_a_bookable_resource',
};

function isBookableUiStatus(value: string): value is Exclude<PointUiStatus, 'none'> {
  return (BOOKABLE_STATUSES as readonly string[]).includes(value);
}

/**
 * null/undefined → `none`; `blocked` с API → `occupied` (на карте без отдельного состояния блокировки).
 */
export function normalizePointStatus(status: MapPointStatus | string | null | undefined): PointUiStatus {
  if (status == null || status === '') return 'none';
  const normalized = typeof status === 'string' ? status.trim().toLowerCase() : status;
  if (normalized === 'blocked') return 'occupied';
  if (isBookableUiStatus(normalized)) return normalized;
  return 'none';
}

export function getPointStatusLabel(status: PointUiStatus): string {
  return i18n.t(POINT_STATUS_LABEL_KEYS[status]);
}

export function formatNextFreeAt(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString(dateLocaleTag(i18n.language), { hour: '2-digit', minute: '2-digit' });
}

export function getPointStatusReasonLabel(point: MapPoint): string | null {
  const key = point.resource_status_reason;
  if (!key) return null;
  const labelKey = REASON_LABEL_KEYS[key];
  return labelKey ? i18n.t(labelKey) : null;
}

export function isBookablePoint(point: MapPoint): boolean {
  const status = normalizePointStatus(point.resource_status);
  const pointWithFallback = point as MapPoint & { resource?: number | null };
  const resourceId = pointWithFallback.resource_id ?? pointWithFallback.resource ?? null;
  return status === 'free' && Boolean(resourceId);
}
