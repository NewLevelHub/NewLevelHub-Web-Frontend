import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/shared/lib/cn';
import type { MapPoint } from '@/shared/types';
import {
  POINT_STATUS_LABEL_KEYS,
  STATUS_LABEL_CLASS,
  formatNextFreeAt,
  getPointStatusLabel,
  getPointStatusReasonLabel,
  normalizePointStatus,
} from '@/pages/map/lib/status';

import { POINT_TYPE_LABEL_KEYS } from '@/pages/map/constants/mapConstants';

export interface MapPointTooltipProps {
  point: MapPoint;
}

export const MapPointTooltip = memo<MapPointTooltipProps>(({ point }) => {
  const { t } = useTranslation();
  const status = normalizePointStatus(point.resource_status);
  const nextFreeAt = formatNextFreeAt(point.next_free_at);
  const reasonLabel = getPointStatusReasonLabel(point);
  return (
    <div
      className="pointer-events-none absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-48 rounded-lg bg-surface px-3 py-2 text-center shadow-xl"
      role="tooltip"
    >
      <p className="text-xs font-semibold text-primary">{point.label}</p>
      {point.resource_name && (
        <p className="mt-0.5 text-xs text-secondary">{point.resource_name}</p>
      )}
      <p className="mt-0.5 text-xs text-secondary">{t(POINT_TYPE_LABEL_KEYS[point.point_type]) ?? point.point_type}</p>
      {status === 'none' ? (
        <p className={cn('mt-1 text-xs font-medium', STATUS_LABEL_CLASS.none)}>
          {getPointStatusLabel('none')}
        </p>
      ) : point.resource_status ? (
        <p className={cn('mt-1 text-xs font-medium', STATUS_LABEL_CLASS[status])}>
          {t(POINT_STATUS_LABEL_KEYS[status])}
        </p>
      ) : null}
      {status === 'soon_available' && nextFreeAt ? (
        <p className="mt-0.5 text-[11px] text-warning">{t('map.freeAt', { time: nextFreeAt })}</p>
      ) : null}
      {reasonLabel ? <p className="mt-0.5 text-[11px] text-muted">{reasonLabel}</p> : null}
      <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
    </div>
  );
});

MapPointTooltip.displayName = 'MapPointTooltip';
