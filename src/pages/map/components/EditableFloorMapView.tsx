import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin } from 'lucide-react';

import type { FloorMap, MapPoint } from '@/shared/types';

import { EditableMapPinDot } from '@/pages/map/components/EditableMapPinDot';
import { GhostPin } from '@/pages/map/components/GhostPin';

export interface EditableFloorMapViewProps {
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

export const EditableFloorMapView = memo<EditableFloorMapViewProps>(
  ({
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
      <div className="relative w-full select-none overflow-hidden rounded-xl border-2 border-dashed border-indigo-300 bg-gray-50">
        <div className="aspect-video w-full bg-gradient-to-br from-indigo-50/40 to-gray-100">
          <div
            className="relative h-full w-full cursor-crosshair"
            role="img"
            aria-label={t('map.floorMapEdit', { name: floorMap.floor_name })}
            onMouseDown={onMapMouseDown}
            onMouseMove={onMapMouseMove}
            onMouseUp={onMapMouseUp}
            onMouseLeave={onMapMouseUp}
          >
            {floorMap.points.length === 0 && !ghostPin && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <MapPin className="mx-auto mb-2 h-10 w-10 text-brand" />
                  <p className="text-sm text-brand">{t('map.clickToPlace')}</p>
                </div>
              </div>
            )}
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
      </div>
    );
  },
);

EditableFloorMapView.displayName = 'EditableFloorMapView';
