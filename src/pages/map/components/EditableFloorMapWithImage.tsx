import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import type { FloorMap, MapPoint } from '@/shared/types';

import { EditableMapPinDot } from '@/pages/map/components/EditableMapPinDot';
import { GhostPin } from '@/pages/map/components/GhostPin';

export interface EditableFloorMapWithImageProps {
  imageUrl: string;
  floorMap: FloorMap;
  highlightedPointId: number | null;
  movingPointId: number | null;
  ghostPin: { x: number; y: number } | null;
  onEditPoint: (point: MapPoint) => void;
  onDeletePoint: (point: MapPoint) => void;
  onMovePoint: (point: MapPoint) => void;
  onMapClick: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export const EditableFloorMapWithImage = memo<EditableFloorMapWithImageProps>(
  ({
    imageUrl,
    floorMap,
    highlightedPointId,
    movingPointId,
    ghostPin,
    onEditPoint,
    onDeletePoint,
    onMovePoint,
    onMapClick,
  }) => {
    const { t } = useTranslation();
    return (
      <div
        className="relative w-full select-none overflow-hidden rounded-xl border-2 border-dashed border-indigo-300"
        role="img"
        aria-label={t('map.floorMapEdit', { name: floorMap.floor_name })}
      >
        <img
          src={imageUrl}
          alt={t('map.floorPlan', { name: floorMap.floor_name })}
          className="block w-full object-contain"
          draggable={false}
        />
        <div className="absolute inset-0 cursor-crosshair" onClick={onMapClick}>
          {floorMap.points.map((point) => (
            <EditableMapPinDot
              key={point.id}
              point={point}
              isHighlighted={point.id === highlightedPointId}
              isMoving={point.id === movingPointId}
              onEdit={onEditPoint}
              onDelete={onDeletePoint}
              onMove={onMovePoint}
            />
          ))}
          {ghostPin && <GhostPin x={ghostPin.x} y={ghostPin.y} />}
        </div>
      </div>
    );
  },
);

EditableFloorMapWithImage.displayName = 'EditableFloorMapWithImage';
