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

export const POINT_STATUS_LABEL: Record<PointUiStatus, string> = {
  free: 'Свободно',
  occupied: 'Занято',
  soon_available: 'Скоро освободится',
  none: 'Статус не применим',
};

export const STATUS_LABEL_CLASS: Record<PointUiStatus, string> = {
  free: 'text-emerald-400',
  occupied: 'text-rose-400',
  soon_available: 'text-amber-400',
  none: 'text-stone-400',
};

export const LEGEND_ITEMS: Array<{ status: PointUiStatus; label: string; color: string }> = [
  { status: 'free', label: 'Свободно', color: 'bg-emerald-500' },
  { status: 'occupied', label: 'Занято', color: 'bg-rose-500' },
  { status: 'soon_available', label: 'Скоро освободится', color: 'bg-amber-500' },
  { status: 'none', label: 'Статус не применим', color: 'bg-stone-500' },
];

const BOOKABLE_STATUSES: readonly PointUiStatus[] = ['free', 'occupied', 'soon_available'];

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

export function formatNextFreeAt(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

export function getPointStatusReasonLabel(point: MapPoint): string | null {
  switch (point.resource_status_reason) {
    case 'active_block':
      return 'Ресурс на обслуживании';
    case 'active_booking':
      return 'Ресурс занят активным бронированием';
    case 'active_booking_ends_within_threshold':
      return 'Ресурс скоро освободится';
    case 'no_active_booking_or_block':
      return 'Ресурс доступен';
    case 'not_a_bookable_resource':
      return 'Для этой точки статус бронирования не применяется';
    default:
      return null;
  }
}

export function isBookablePoint(point: MapPoint): boolean {
  const status = normalizePointStatus(point.resource_status);
  const pointWithFallback = point as MapPoint & { resource?: number | null };
  const resourceId = pointWithFallback.resource_id ?? pointWithFallback.resource ?? null;
  return status === 'free' && Boolean(resourceId);
}
