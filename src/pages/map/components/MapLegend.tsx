import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/shared/lib/cn';
import {
  LEGEND_ITEM_COLORS,
  LEGEND_STATUS_KEYS,
  POINT_STATUS_LABEL_KEYS,
  type PointUiStatus,
} from '@/pages/map/lib/status';

export interface MapLegendProps {
  statusCounts: Record<PointUiStatus, number> | null;
}

export const MapLegend = memo<MapLegendProps>(({ statusCounts }) => {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-4" aria-label={t('map.legend')} role="group">
      {LEGEND_STATUS_KEYS.map((status) => (
        <div key={status} className="flex items-center gap-1.5">
          <span
            className={cn('block h-3 w-3 rounded-full', LEGEND_ITEM_COLORS[status])}
            aria-hidden="true"
          />
          <span className="text-xs text-muted">
            {t(POINT_STATUS_LABEL_KEYS[status])}
            {statusCounts ? ` (${statusCounts[status]})` : ''}
          </span>
        </div>
      ))}
    </div>
  );
});

MapLegend.displayName = 'MapLegend';
