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
  draggingPointId: number | null;
  ghostPin: { x: number; y: number; w: number; h: number } | null;
  onEditPoint: (point: MapPoint) => void;
  onDeletePoint: (point: MapPoint) => void;
  onMovePoint: (point: MapPoint) => void;
  onPointDragStart: (point: MapPoint, clientX: number, clientY: number) => void;
  onMapMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMapMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMapMouseUp: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export const EditableFloorMapWithImage = memo<EditableFloorMapWithImageProps>(
  ({
    imageUrl,
    floorMap,
    highlightedPointId,
    movingPointId,
    draggingPointId,
    ghostPin,
    onEditPoint,
    onDeletePoint,
    onMovePoint,
    onPointDragStart,
    onMapMouseDown,
    onMapMouseMove,
    onMapMouseUp,
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
        <div
          className="absolute inset-0 cursor-crosshair"
          onMouseDown={onMapMouseDown}
          onMouseMove={onMapMouseMove}
          onMouseUp={onMapMouseUp}
          onMouseLeave={onMapMouseUp}
        >
          {floorMap.points.map((point) => (
            <EditableMapPinDot
              key={point.id}
              point={point}
              isHighlighted={point.id === highlightedPointId}
              isMoving={point.id === movingPointId}
              isDragging={point.id === draggingPointId}
              onEdit={onEditPoint}
              onDelete={onDeletePoint}
              onMove={onMovePoint}
              onDragStart={onPointDragStart}
            />
          ))}
          {ghostPin && (
            <GhostPin x={ghostPin.x} y={ghostPin.y} w={ghostPin.w} h={ghostPin.h} />
          )}
        </div>
      </div>
    );
  },
);

EditableFloorMapWithImage.displayName = 'EditableFloorMapWithImage';
