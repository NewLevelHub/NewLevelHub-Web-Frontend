import { memo } from 'react';
import { Pencil, Trash2 } from 'lucide-react';

import { cn } from '@/shared/lib/cn';
import type { MapPoint } from '@/shared/types';
import { normalizePointStatus, ROOM_STATUS_STYLES } from '@/pages/map/lib/status';

const DEFAULT_W = 12;
const DEFAULT_H = 8;

export interface EditableMapPinDotProps {
  point: MapPoint;
  isHighlighted: boolean;
  isMoving: boolean;
  isDragging: boolean;
  onEdit: (point: MapPoint) => void;
  onDelete: (point: MapPoint) => void;
  onMove: (point: MapPoint) => void;
  onDragStart: (point: MapPoint, clientX: number, clientY: number) => void;
}

export const EditableMapPinDot = memo<EditableMapPinDotProps>(
  ({ point, isHighlighted, isMoving, isDragging, onEdit, onDelete, onMove, onDragStart }) => {
    const status = normalizePointStatus(point.resource_status);
    const styles = ROOM_STATUS_STYLES[status];
    const w = point.width ?? DEFAULT_W;
    const h = point.height ?? DEFAULT_H;

    return (
      <div
        className={cn('absolute group', (isMoving || isDragging) && 'z-20')}
        style={{ left: `${point.x}%`, top: `${point.y}%`, width: `${w}%`, height: `${h}%` }}
        onMouseDown={(e) => {
          if (!isDragging && !isMoving) {
            e.stopPropagation();
            onDragStart(point, e.clientX, e.clientY);
          }
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Room rectangle */}
        <div
          className={cn(
            'relative h-full w-full rounded-[4px] flex flex-col items-start justify-end px-2 py-1.5 transition-all duration-150',
            isMoving
              ? 'border-2 border-dashed border-amber-400 bg-amber-50 opacity-60'
              : isDragging
                ? 'opacity-40 border'
                : 'border cursor-grab',
            isHighlighted && !isMoving && !isDragging && 'ring-2 ring-[var(--brand)]',
          )}
          style={
            isMoving || isDragging
              ? undefined
              : { background: styles.bg, border: `1px solid ${styles.border}` }
          }
        >
          <span
            className="block w-full truncate text-[11px] font-semibold leading-tight"
            style={{ color: isMoving ? '#b45309' : styles.nameText }}
          >
            {point.label}
          </span>
          {point.resource_name && !isMoving && !isDragging && (
            <span
              className="block w-full truncate text-[9px] leading-tight opacity-85"
              style={{ color: styles.text, fontFamily: 'var(--font-mono)' }}
            >
              {point.resource_name}
            </span>
          )}

          {/* Action buttons — top-right corner, visible on hover */}
          {!isMoving && !isDragging && (
            <div
              className="absolute right-1 top-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-10"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                aria-label={`Редактировать ${point.label}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(point);
                }}
                className="flex h-5 w-5 items-center justify-center rounded bg-surface/80 text-muted shadow-sm hover:bg-indigo-50 hover:text-brand transition-colors"
              >
                <Pencil className="h-2.5 w-2.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label={`Удалить ${point.label}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(point);
                }}
                className="flex h-5 w-5 items-center justify-center rounded bg-surface/80 text-muted shadow-sm hover:bg-rose-50 hover:text-rose-600 transition-colors"
              >
                <Trash2 className="h-2.5 w-2.5" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>

        {/* Moving pulse animation */}
        {isMoving && (
          <span
            className="absolute inset-0 rounded-[4px] border-2 border-amber-400 animate-pulse pointer-events-none"
            aria-hidden="true"
          />
        )}
      </div>
    );
  },
);

EditableMapPinDot.displayName = 'EditableMapPinDot';
