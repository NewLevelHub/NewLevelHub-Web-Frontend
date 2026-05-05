import { memo } from 'react';

import { cn } from '@/shared/lib/cn';
import type { MapPoint } from '@/shared/types';
import {
  POINT_STATUS_LABEL,
  STATUS_LABEL_CLASS,
  formatNextFreeAt,
  getPointStatusReasonLabel,
  normalizePointStatus,
} from '@/pages/map/lib/status';

import { POINT_TYPE_LABELS } from '@/pages/map/constants/mapConstants';

export interface MapPointTooltipProps {
  point: MapPoint;
}

export const MapPointTooltip = memo<MapPointTooltipProps>(({ point }) => {
  const status = normalizePointStatus(point.resource_status);
  const nextFreeAt = formatNextFreeAt(point.next_free_at);
  const reasonLabel = getPointStatusReasonLabel(point);
  return (
    <div
      className="pointer-events-none absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-48 rounded-lg bg-gray-900 px-3 py-2 text-center shadow-xl"
      role="tooltip"
    >
      <p className="text-xs font-semibold text-white">{point.label}</p>
      {point.resource_name && (
        <p className="mt-0.5 text-xs text-gray-300">{point.resource_name}</p>
      )}
      <p className="mt-0.5 text-xs text-gray-400">{POINT_TYPE_LABELS[point.point_type] ?? point.point_type}</p>
      {status === 'none' ? (
        <p className={cn('mt-1 text-xs font-medium', STATUS_LABEL_CLASS.none)}>
          {POINT_STATUS_LABEL.none}
        </p>
      ) : point.resource_status ? (
        <p className={cn('mt-1 text-xs font-medium', STATUS_LABEL_CLASS[status])}>
          {POINT_STATUS_LABEL[status]}
        </p>
      ) : null}
      {status === 'soon_available' && nextFreeAt ? (
        <p className="mt-0.5 text-[11px] text-amber-300">Свободен в {nextFreeAt}</p>
      ) : null}
      {reasonLabel ? <p className="mt-0.5 text-[11px] text-gray-500">{reasonLabel}</p> : null}
      <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
    </div>
  );
});

MapPointTooltip.displayName = 'MapPointTooltip';
