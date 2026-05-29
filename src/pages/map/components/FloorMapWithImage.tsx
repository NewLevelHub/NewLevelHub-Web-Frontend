import { memo } from 'react';
import { useTranslation } from 'react-i18next';

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
    const { t } = useTranslation();
    return (
      <div
        className="relative w-full select-none overflow-hidden rounded-xl border border-default"
        role="img"
        aria-label={t('map.floorMap', { name: floorMap.floor_name })}
      >
        <img
          src={imageUrl}
          alt={t('map.floorPlan', { name: floorMap.floor_name })}
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
