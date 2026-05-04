import { memo } from 'react';
import { MapPin } from 'lucide-react';

import type { FloorMap, MapPoint } from '@/shared/types';

import { MapPinDot } from '@/pages/map/components/MapPinDot';

export interface FloorMapViewProps {
  floorMap: FloorMap;
  highlightedPointId: number | null;
  onPointClick: (point: MapPoint) => void;
}

export const FloorMapView = memo<FloorMapViewProps>(({ floorMap, highlightedPointId, onPointClick }) => {
  return (
    <div className="relative w-full select-none overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
      <div className="aspect-video w-full bg-gradient-to-br from-gray-100 to-gray-200">
        <div
          className="relative h-full w-full"
          role="img"
          aria-label={`Карта этажа ${floorMap.floor_name}`}
        >
          {floorMap.points.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <MapPin className="mx-auto mb-2 h-10 w-10 text-gray-300" />
                <p className="text-sm text-gray-400">Точки для этого этажа не заданы</p>
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
