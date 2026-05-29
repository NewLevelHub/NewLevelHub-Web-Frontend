import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin } from 'lucide-react';

import type { FloorMap, MapPoint } from '@/shared/types';

import { MapPinDot } from '@/pages/map/components/MapPinDot';

export interface FloorMapViewProps {
  floorMap: FloorMap;
  highlightedPointId: number | null;
  onPointClick: (point: MapPoint) => void;
}

export const FloorMapView = memo<FloorMapViewProps>(({ floorMap, highlightedPointId, onPointClick }) => {
  const { t } = useTranslation();
  return (
    <div className="relative w-full select-none overflow-hidden rounded-xl border border-default bg-gray-50">
      <div className="aspect-video w-full bg-gradient-to-br from-gray-100 to-gray-200">
        <div
          className="relative h-full w-full"
          role="img"
          aria-label={t('map.floorMap', { name: floorMap.floor_name })}
        >
          {floorMap.points.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <MapPin className="mx-auto mb-2 h-10 w-10 text-secondary" />
                <p className="text-sm text-secondary">{t('map.noPoints')}</p>
              </div>
            </div>
          )}
          {floorMap.points.map((point) => (
            <MapPinDot
              key={point.id}
              point={point}
              isHighlighted={point.id === highlightedPointId}
              onClick={onPointClick}
            />
          ))}
        </div>
      </div>
    </div>
  );
});

FloorMapView.displayName = 'FloorMapView';
