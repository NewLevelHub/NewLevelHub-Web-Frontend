import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/shared/lib/cn';
import type { MapPoint } from '@/shared/types';
import { normalizePointStatus, ROOM_STATUS_STYLES, formatNextFreeAt } from '@/pages/map/lib/status';
import { POINT_TYPE_LABEL_KEYS } from '@/pages/map/constants/mapConstants';

const DEFAULT_W = 12;
const DEFAULT_H = 8;

export interface MapRoomPopupProps {
  point: MapPoint;
  floorName: string;
  onBook: (point: MapPoint) => void;
  onDetails: (point: MapPoint) => void;
  onClose: () => void;
  /** When provided, the popup renders with fixed positioning at these screen coordinates */
  screenLeft?: number;
  screenTop?: number;
}

function getStatusBadgeStyle(status: ReturnType<typeof normalizePointStatus>): {
  dotColor: string;
  textColor: string;
  bgColor: string;
} {
  switch (status) {
    case 'free':
      return {
        dotColor: 'bg-emerald-500',
        textColor: 'text-emerald-700',
        bgColor: 'bg-emerald-50',
      };
    case 'occupied':
      return {
        dotColor: 'bg-rose-500',
        textColor: 'text-rose-700',
        bgColor: 'bg-rose-50',
      };
    case 'soon_available':
      return {
        dotColor: 'bg-amber-500',
        textColor: 'text-amber-700',
        bgColor: 'bg-amber-50',
      };
    default:
      return {
        dotColor: 'bg-stone-400',
        textColor: 'text-stone-600',
        bgColor: 'bg-stone-50',
      };
  }
}

export const MapRoomPopup = memo<MapRoomPopupProps>(({ point, floorName, onBook, onDetails, onClose, screenLeft, screenTop }) => {
  const { t } = useTranslation();

  const w = point.width ?? DEFAULT_W;
  const h = point.height ?? DEFAULT_H;
  const status = normalizePointStatus(point.resource_status);
  const styles = ROOM_STATUS_STYLES[status];
  const badgeStyle = getStatusBadgeStyle(status);

  const isBookDisabled = status === 'occupied' || status === 'none';
  const hasResource = point.resource_id !== null;

  const statusLabel = (() => {
    if (status === 'free') return t('map.popup.freeNow');
    if (status === 'occupied') {
      const time = formatNextFreeAt(point.next_free_at);
      return time ? t('map.popup.occupiedUntil', { time }) : t('map.popup.unavailable');
    }
    if (status === 'soon_available') {
      const msRemaining = point.next_free_at
        ? new Date(point.next_free_at).getTime() - Date.now()
        : 0;
      const mins = Math.max(1, Math.round(msRemaining / 60000));
      return t('map.popup.freeInMin', { n: mins });
    }
    return t('map.popup.unavailable');
  })();

  // Position: fixed when screen coords are provided (portal mode), else absolute (fallback)
  const isFixed = screenLeft !== undefined && screenTop !== undefined;
  const positionStyle: React.CSSProperties = isFixed
    ? { position: 'fixed', left: screenLeft, top: screenTop, zIndex: 9999, pointerEvents: 'auto' }
    : {
        position: 'absolute',
        left: `calc(${point.x + w / 2}% - 112px)`,
        top: `calc(${point.y + h}% + 8px)`,
        zIndex: 9999,
        pointerEvents: 'auto',
      };

  // ESC close is handled in useMapLogic; stopPropagation on click prevents
  // the canvas click-outside handler from closing the popup when clicking inside.

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={point.label}
      className="w-60 overflow-hidden rounded-xl border border-default bg-surface p-4 shadow-xl"
      style={positionStyle}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Title */}
      <p className="truncate text-sm font-semibold text-primary">{point.label}</p>

      {/* Meta row */}
      <p className="mt-0.5 truncate text-xs text-muted">
        {POINT_TYPE_LABEL_KEYS[point.point_type]
          ? t(POINT_TYPE_LABEL_KEYS[point.point_type])
          : point.point_type}
        {' · '}
        {floorName}
      </p>

      {/* Status badge */}
      <div className="mt-2">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
            badgeStyle.bgColor,
            badgeStyle.textColor,
          )}
        >
          <span
            className={cn('h-1.5 w-1.5 shrink-0 rounded-full', badgeStyle.dotColor)}
            aria-hidden="true"
          />
          {statusLabel}
        </span>
      </div>

      {/* Color accent strip matching room color */}
      <div
        className="mt-3 h-0.5 rounded-full opacity-30"
        style={{ background: styles.border }}
        aria-hidden="true"
      />

      {/* Action buttons */}
      <div className="mt-3 flex flex-col gap-2">
        <button
          type="button"
          disabled={isBookDisabled}
          onClick={() => {
            if (!isBookDisabled) { onBook(point); onClose(); }
          }}
          className={cn(
            'w-full rounded-md px-3 py-1.5 text-sm font-medium transition-opacity',
            'bg-[var(--brand)] text-white hover:opacity-90',
            isBookDisabled && 'cursor-not-allowed opacity-40',
          )}
        >
          {t('map.popup.book')}
        </button>

        <button
          type="button"
          disabled={!hasResource}
          onClick={() => {
            if (hasResource) { onDetails(point); onClose(); }
          }}
          className={cn(
            'w-full rounded-md border border-default px-3 py-1.5 text-sm font-medium text-secondary transition-colors hover:bg-hover',
            !hasResource && 'cursor-not-allowed opacity-40',
          )}
        >
          {t('map.popup.details')}
        </button>
      </div>
    </div>
  );
});

MapRoomPopup.displayName = 'MapRoomPopup';
