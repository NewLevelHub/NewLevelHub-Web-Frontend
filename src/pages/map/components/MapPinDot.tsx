import { memo, useCallback } from 'react';

import { cn } from '@/shared/lib/cn';
import type { MapPoint } from '@/shared/types';
import { isBookablePoint, normalizePointStatus, ROOM_STATUS_STYLES } from '@/pages/map/lib/status';

const DEFAULT_W = 12;
const DEFAULT_H = 8;

export interface MapPinDotProps {
  point: MapPoint;
  isHighlighted: boolean;
  onClick: (point: MapPoint) => void;
}

export const MapPinDot = memo<MapPinDotProps>(({ point, isHighlighted, onClick }) => {
  const status = normalizePointStatus(point.resource_status);
  const styles = ROOM_STATUS_STYLES[status];
  const isClickable = isBookablePoint(point);

  const w = point.width ?? DEFAULT_W;
  const h = point.height ?? DEFAULT_H;

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onClick(point);
  }, [onClick, point]);

  return (
    <div
      className="absolute"
      style={{ left: `${point.x}%`, top: `${point.y}%`, width: `${w}%`, height: `${h}%` }}
    >
      <button
        type="button"
        aria-label={`${point.label}${point.resource_name ? ` — ${point.resource_name}` : ''}`}
        onClick={handleClick}
        tabIndex={0}
        className={cn(
          'relative flex h-full w-full flex-col items-start justify-end rounded-[4px] px-2 py-1.5 transition-all duration-150',
          isClickable ? 'cursor-pointer hover:-translate-y-px hover:shadow-md' : 'cursor-default',
          isHighlighted && 'ring-2 ring-[var(--brand)] ring-offset-1',
        )}
        style={{
          background: styles.bg,
          border: `1px solid ${styles.border}`,
          boxShadow: isHighlighted
            ? `0 0 0 2px var(--brand), 0 8px 22px rgba(0,0,0,0.12)`
            : undefined,
        }}
      >
        <span
          className="block truncate text-[11px] font-semibold leading-tight"
          style={{ color: styles.nameText }}
        >
          {point.label}
        </span>
        {point.resource_name && (
          <span
            className="block truncate text-[9px] leading-tight"
            style={{ color: styles.text, fontFamily: 'var(--font-mono)', opacity: 0.85 }}
          >
            {point.resource_name}
          </span>
        )}
      </button>
    </div>
  );
});

MapPinDot.displayName = 'MapPinDot';
