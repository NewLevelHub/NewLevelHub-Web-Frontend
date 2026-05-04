import { memo } from 'react';

import type { FloorMap, MapPoint } from '@/shared/types';

import { MapPinDot } from '@/pages/map/components/MapPinDot';

export interface FloorMapWithImageProps {
  imageUrl: string;
  floorMap: FloorMap;
  highlightedPointId: number | null;
  onPointClick: (point: MapPoint) => void;
}

export const FloorMapWithImage = memo<FloorMapWithImageProps>(
  ({ imageUrl, floorMap, highlightedPointId, onPointClick }) => {
    return (
      <div
        className="relative w-full select-none overflow-hidden rounded-xl border border-gray-200"
        role="img"
        aria-label={`Карта этажа ${floorMap.floor_name}`}
      >
        <img
          src={imageUrl}
          alt={`План этажа ${floorMap.floor_name}`}
          className="block w-full object-contain"
          draggable={false}
        />
        <div className="absolute inset-0">
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
    );
  },
);

FloorMapWithImage.displayName = 'FloorMapWithImage';
