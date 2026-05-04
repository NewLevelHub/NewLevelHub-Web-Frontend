import { memo } from 'react';
import { Pencil, Trash2, Move } from 'lucide-react';

import { cn } from '@/shared/lib/cn';
import type { MapPoint } from '@/shared/types';
import { normalizePointStatus, POINT_STATUS_CLASS } from '@/pages/map/lib/status';

import { MapPointTooltip } from '@/pages/map/components/MapPointTooltip';

export interface EditableMapPinDotProps {
  point: MapPoint;
  isHighlighted: boolean;
  isMoving: boolean;
  onEdit: (point: MapPoint) => void;
  onDelete: (point: MapPoint) => void;
  onMove: (point: MapPoint) => void;
}

export const EditableMapPinDot = memo<EditableMapPinDotProps>(
  ({ point, isHighlighted, isMoving, onEdit, onDelete, onMove }) => {
    const status = normalizePointStatus(point.resource_status);
    const colorClass = POINT_STATUS_CLASS[status];

    return (
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2 group"
        style={{ left: `${point.x}%`, top: `${point.y}%` }}
      >
        <div className="relative flex flex-col items-center">
          {isMoving && (
            <span
              className="absolute inline-flex h-7 w-7 rounded-full bg-amber-400 opacity-50 animate-ping pointer-events-none"
              aria-hidden="true"
            />
          )}

          {!isMoving && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 pb-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-20">
              <MapPointTooltip point={point} />
            </div>
          )}

          <div
            className={cn(
              'relative block h-4 w-4 rounded-full border-2 cursor-pointer shadow-md transition-all duration-150',
              isMoving ? 'border-amber-500 bg-amber-400 scale-125' : colorClass,
              isHighlighted && !isMoving && 'ring-2 ring-white ring-offset-1 ring-offset-transparent scale-150',
            )}
          />

          {!isMoving && (
            <div className="pt-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-30">
              <div
                className="flex items-center gap-0.5 rounded-md bg-white border border-gray-200 shadow-lg p-0.5"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  aria-label={`Редактировать точку ${point.label}`}
                  className="rounded p-1 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 focus:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(point);
                  }}
                >
                  <Pencil className="h-3 w-3" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label={`Переместить точку ${point.label}`}
                  className="rounded p-1 text-gray-500 hover:bg-amber-50 hover:text-amber-600 focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-500 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMove(point);
                  }}
                >
                  <Move className="h-3 w-3" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label={`Удалить точку ${point.label}`}
                  className="rounded p-1 text-gray-500 hover:bg-rose-50 hover:text-rose-600 focus:outline-none focus-visible:ring-1 focus-visible:ring-rose-500 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(point);
                  }}
                >
                  <Trash2 className="h-3 w-3" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  },
);

EditableMapPinDot.displayName = 'EditableMapPinDot';
