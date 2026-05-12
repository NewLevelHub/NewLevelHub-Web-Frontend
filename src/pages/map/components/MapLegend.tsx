import { memo } from 'react';

import { cn } from '@/shared/lib/cn';
import { LEGEND_ITEMS, type PointUiStatus } from '@/pages/map/lib/status';

export interface MapLegendProps {
  statusCounts: Record<PointUiStatus, number> | null;
}

export const MapLegend = memo<MapLegendProps>(({ statusCounts }) => {
  return (
    <div className="flex items-center gap-4" aria-label="Легенда карты" role="group">
      {LEGEND_ITEMS.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <span className={cn('block h-3 w-3 rounded-full', item.color)} aria-hidden="true" />
          <span className="text-xs text-muted">
            {item.label}
            {statusCounts ? ` (${statusCounts[item.status]})` : ''}
          </span>
        </div>
      ))}
    </div>
  );
});

MapLegend.displayName = 'MapLegend';
