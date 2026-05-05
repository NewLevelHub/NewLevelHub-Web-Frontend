import { memo, useCallback, useState } from 'react';

import { cn } from '@/shared/lib/cn';
import type { MapPoint } from '@/shared/types';
import { isBookablePoint, normalizePointStatus, POINT_STATUS_CLASS } from '@/pages/map/lib/status';

import { MapPointTooltip } from '@/pages/map/components/MapPointTooltip';

export interface MapPinDotProps {
  point: MapPoint;
  isHighlighted: boolean;
  onClick: (point: MapPoint) => void;
}

export const MapPinDot = memo<MapPinDotProps>(({ point, isHighlighted, onClick }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const status = normalizePointStatus(point.resource_status);
  const colorClass = POINT_STATUS_CLASS[status];
  const isClickable = isBookablePoint(point);

  const handleClick = useCallback(() => {
    if (isClickable) onClick(point);
  }, [isClickable, onClick, point]);

  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${point.x}%`, top: `${point.y}%` }}
    >
      <div className="relative">
        {showTooltip && <MapPointTooltip point={point} />}
        <button
          type="button"
          aria-label={`${point.label}${point.resource_name ? ` — ${point.resource_name}` : ''}`}
          className={cn(
            'block h-4 w-4 rounded-full border-2 transition-all duration-150',
            colorClass,
            isClickable ? 'cursor-pointer shadow-md' : 'cursor-default',
            isHighlighted && 'ring-2 ring-white ring-offset-1 ring-offset-transparent scale-150',
          )}
          onClick={handleClick}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          onFocus={() => setShowTooltip(true)}
          onBlur={() => setShowTooltip(false)}
          tabIndex={isClickable ? 0 : -1}
        />
      </div>
    </div>
  );
});

MapPinDot.displayName = 'MapPinDot';
