import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, X, MapPin, Loader2, Pencil, Trash2, ToggleLeft, ToggleRight, Move } from 'lucide-react';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { cn } from '@/shared/lib/cn';
import { resolveMediaUrl } from '@/shared/lib/mediaUrl';
import { getApiErrorMessage } from '@/shared/lib/apiError';
import { useAuth } from '@/shared/hooks/useAuth';
import { USER_ROLES } from '@/shared/config/constants';
import { BookingModal } from '@/shared/ui/BookingModal';
import type {
  FloorMap,
  MapPoint,
  MapPointType,
  MapPointSearchResult,
  MapPointCreatePayload,
  MapPointUpdatePayload,
  ServiceFloor,
  BookingResourceListItem,
  PaginatedResponse,
} from '@/shared/types';

// ─── Constants ───────────────────────────────────────────────────────────────

const POINT_TYPE_LABELS: Record<string, string> = {
  desk: 'Рабочее место',
  meeting_room: 'Переговорная',
  parking: 'Парковка',
  capsule: 'Капсула',
  office: 'Офис',
};

const POINT_TYPES: MapPointType[] = ['desk', 'meeting_room', 'parking', 'capsule', 'office'];

type PointUiStatus =
  | 'free'
  | 'occupied'
  | 'soon_available'
  | 'blocked'
  | 'none'
  | 'disabled';

const POINT_STATUS_CLASS: Record<PointUiStatus, string> = {
  free: 'bg-emerald-500 border-emerald-600 hover:bg-emerald-400',
  occupied: 'bg-rose-500 border-rose-600 hover:bg-rose-400',
  soon_available: 'bg-amber-500 border-amber-600 hover:bg-amber-400',
  blocked: 'bg-violet-600 border-violet-700 hover:bg-violet-500',
  /** Точка без привязки к ресурсу или тип без статуса бронирования (null с бэка) */
  none: 'bg-stone-500 border-stone-600 hover:bg-stone-400',
  disabled: 'bg-slate-400 border-slate-500 hover:bg-slate-300',
};

const POINT_STATUS_LABEL: Record<PointUiStatus, string> = {
  free: 'Свободно',
  occupied: 'Занято',
  soon_available: 'Скоро освободится',
  blocked: 'Заблокировано',
  none: 'Статус не применим',
  disabled: 'Недоступно',
};

const STATUS_LABEL_CLASS: Record<PointUiStatus, string> = {
  free: 'text-emerald-400',
  occupied: 'text-rose-400',
  soon_available: 'text-amber-400',
  blocked: 'text-violet-400',
  none: 'text-stone-400',
  disabled: 'text-slate-400',
};

const LEGEND_ITEMS = [
  { status: 'free' as const, label: 'Свободно', color: 'bg-emerald-500' },
  { status: 'occupied' as const, label: 'Занято', color: 'bg-rose-500' },
  { status: 'soon_available' as const, label: 'Скоро освободится', color: 'bg-amber-500' },
  { status: 'blocked' as const, label: 'Заблокировано', color: 'bg-violet-600' },
  { status: 'none' as const, label: 'Статус не применим', color: 'bg-stone-500' },
  { status: 'disabled' as const, label: 'Недоступно', color: 'bg-slate-400' },
];

function normalizePointStatus(status: string | null | undefined): PointUiStatus {
  switch (status) {
    case 'free':
    case 'available':
      return 'free';
    case 'occupied':
    case 'booked':
      return 'occupied';
    case 'soon_available':
      return 'soon_available';
    case 'blocked':
      return 'blocked';
    case 'disabled':
    case 'unavailable':
      return 'disabled';
    case null:
    case undefined:
      return 'none';
    default:
      return 'disabled';
  }
}

function isBookablePoint(point: MapPoint): boolean {
  return normalizePointStatus(point.resource_status) === 'free' && Boolean(point.resource_id);
}

// ─── MapPoint form state ──────────────────────────────────────────────────────

interface MapPointFormState {
  point_type: MapPointType;
  label: string;
  x: string;
  y: string;
  resource: string;
  company: string;
}

const EMPTY_FORM: MapPointFormState = {
  point_type: 'desk',
  label: '',
  x: '',
  y: '',
  resource: '',
  company: '',
};

// ─── Tooltip ─────────────────────────────────────────────────────────────────

interface MapPointTooltipProps {
  point: MapPoint;
}

const MapPointTooltip = memo<MapPointTooltipProps>(({ point }) => {
  const status = normalizePointStatus(point.resource_status);
  return (
    <div
      className="pointer-events-none absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-48 rounded-lg bg-gray-900 px-3 py-2 text-center shadow-xl"
      role="tooltip"
    >
      <p className="text-xs font-semibold text-white">{point.label}</p>
      {point.resource_name && (
        <p className="mt-0.5 text-xs text-gray-300">{point.resource_name}</p>
      )}
      <p className="mt-0.5 text-xs text-gray-400">{POINT_TYPE_LABELS[point.point_type] ?? point.point_type}</p>
      {status === 'none' ? (
        <p className={cn('mt-1 text-xs font-medium', STATUS_LABEL_CLASS.none)}>
          {POINT_STATUS_LABEL.none}
        </p>
      ) : point.resource_status ? (
        <p
          className={cn(
            'mt-1 text-xs font-medium',
            STATUS_LABEL_CLASS[status],
          )}
        >
          {POINT_STATUS_LABEL[status]}
        </p>
      ) : null}
      {/* caret */}
      <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
    </div>
  );
});

MapPointTooltip.displayName = 'MapPointTooltip';

// ─── MapPin component (read-only mode) ───────────────────────────────────────

interface MapPinProps {
  point: MapPoint;
  isHighlighted: boolean;
  onClick: (point: MapPoint) => void;
}

const MapPinDot = memo<MapPinProps>(({ point, isHighlighted, onClick }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const status = normalizePointStatus(point.resource_status);
  const colorClass = POINT_STATUS_CLASS[status];
  const isClickable = isBookablePoint(point);

  const handleClick = useCallback(() => {
    if (isClickable) onClick(point);
  }, [isClickable, onClick, point]);

  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${point.x}%`, top: `${point.y}%` }}
    >
      <div className="relative">
        {showTooltip && <MapPointTooltip point={point} />}
        <button
          type="button"
          aria-label={`${point.label}${point.resource_name ? ` — ${point.resource_name}` : ''}`}
          className={cn(
            'block h-4 w-4 rounded-full border-2 transition-all duration-150',
            colorClass,
            isClickable ? 'cursor-pointer shadow-md' : 'cursor-default',
            isHighlighted && 'ring-2 ring-white ring-offset-1 ring-offset-transparent scale-150',
          )}
          onClick={handleClick}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          onFocus={() => setShowTooltip(true)}
          onBlur={() => setShowTooltip(false)}
          tabIndex={isClickable ? 0 : -1}
        />
      </div>
    </div>
  );
});

MapPinDot.displayName = 'MapPinDot';

// ─── MapPin component (edit mode) ────────────────────────────────────────────

interface EditableMapPinProps {
  point: MapPoint;
  isHighlighted: boolean;
  isMoving: boolean;
  onEdit: (point: MapPoint) => void;
  onDelete: (point: MapPoint) => void;
  onMove: (point: MapPoint) => void;
}

const EditableMapPinDot = memo<EditableMapPinProps>(({ point, isHighlighted, isMoving, onEdit, onDelete, onMove }) => {
  const status = normalizePointStatus(point.resource_status);
  const colorClass = POINT_STATUS_CLASS[status];

  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 group"
      style={{ left: `${point.x}%`, top: `${point.y}%` }}
    >
      {/*
        Single hover zone that covers the dot, the bridging padding, and the
        popup/toolbar below. CSS group-hover drives all visibility — no JS
        onMouseEnter/onMouseLeave needed, so there is no gap that can break hover.
      */}
      <div className="relative flex flex-col items-center">
        {/* Pulsing ring shown when this point is being repositioned */}
        {isMoving && (
          <span
            className="absolute inline-flex h-7 w-7 rounded-full bg-amber-400 opacity-50 animate-ping pointer-events-none"
            aria-hidden="true"
          />
        )}

        {/* Tooltip above the dot — visible on group-hover when not moving */}
        {!isMoving && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 pb-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-20">
            <MapPointTooltip point={point} />
          </div>
        )}

        {/* The dot */}
        <div
          className={cn(
            'relative block h-4 w-4 rounded-full border-2 cursor-pointer shadow-md transition-all duration-150',
            isMoving ? 'border-amber-500 bg-amber-400 scale-125' : colorClass,
            isHighlighted && !isMoving && 'ring-2 ring-white ring-offset-1 ring-offset-transparent scale-150',
          )}
        />

        {/* Edit/move/delete toolbar below the dot — no margin gap, uses padding bridge */}
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
                onClick={(e) => { e.stopPropagation(); onEdit(point); }}
              >
                <Pencil className="h-3 w-3" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label={`Переместить точку ${point.label}`}
                className="rounded p-1 text-gray-500 hover:bg-amber-50 hover:text-amber-600 focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-500 transition-colors"
                onClick={(e) => { e.stopPropagation(); onMove(point); }}
              >
                <Move className="h-3 w-3" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label={`Удалить точку ${point.label}`}
                className="rounded p-1 text-gray-500 hover:bg-rose-50 hover:text-rose-600 focus:outline-none focus-visible:ring-1 focus-visible:ring-rose-500 transition-colors"
                onClick={(e) => { e.stopPropagation(); onDelete(point); }}
              >
                <Trash2 className="h-3 w-3" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

EditableMapPinDot.displayName = 'EditableMapPinDot';

// ─── Ghost pin (pending placement) ───────────────────────────────────────────

interface GhostPinProps {
  x: number;
  y: number;
}

const GhostPin = memo<GhostPinProps>(({ x, y }) => (
  <div
    className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20"
    style={{ left: `${x}%`, top: `${y}%` }}
    aria-hidden="true"
  >
    <div className="relative flex items-center justify-center">
      {/* Pulsing ring */}
      <span className="absolute inline-flex h-6 w-6 rounded-full bg-indigo-400 opacity-40 animate-ping" />
      {/* Pin dot */}
      <div className="relative h-5 w-5 rounded-full border-2 border-dashed border-indigo-400 bg-gray-700 flex items-center justify-center shadow-lg">
        <span className="text-[9px] font-bold text-indigo-300 leading-none">?</span>
      </div>
    </div>
  </div>
));

GhostPin.displayName = 'GhostPin';

// ─── FloorMap view (read-only) ────────────────────────────────────────────────

interface FloorMapViewProps {
  floorMap: FloorMap;
  highlightedPointId: number | null;
  onPointClick: (point: MapPoint) => void;
}

const FloorMapView = memo<FloorMapViewProps>(({ floorMap, highlightedPointId, onPointClick }) => {
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

// ─── FloorMap view (edit mode, no image) ─────────────────────────────────────

interface EditableFloorMapViewProps {
  floorMap: FloorMap;
  highlightedPointId: number | null;
  movingPointId: number | null;
  ghostPin: { x: number; y: number } | null;
  onEditPoint: (point: MapPoint) => void;
  onDeletePoint: (point: MapPoint) => void;
  onMovePoint: (point: MapPoint) => void;
  onMapClick: (e: React.MouseEvent<HTMLDivElement>) => void;
}

const EditableFloorMapView = memo<EditableFloorMapViewProps>(({
  floorMap,
  highlightedPointId,
  movingPointId,
  ghostPin,
  onEditPoint,
  onDeletePoint,
  onMovePoint,
  onMapClick,
}) => {
  return (
    <div className="relative w-full select-none overflow-hidden rounded-xl border-2 border-dashed border-indigo-300 bg-gray-50">
      <div className="aspect-video w-full bg-gradient-to-br from-indigo-50/40 to-gray-100">
        <div
          className="relative h-full w-full cursor-crosshair"
          role="img"
          aria-label={`Карта этажа ${floorMap.floor_name} (режим редактирования)`}
          onClick={onMapClick}
        >
          {floorMap.points.length === 0 && !ghostPin && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <MapPin className="mx-auto mb-2 h-10 w-10 text-indigo-200" />
                <p className="text-sm text-indigo-300">Нажмите на карту, чтобы разместить точку</p>
              </div>
            </div>
          )}
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
    </div>
  );
});

EditableFloorMapView.displayName = 'EditableFloorMapView';

// ─── FloorMap view with image (read-only) ─────────────────────────────────────

interface FloorMapWithImageProps {
  imageUrl: string;
  floorMap: FloorMap;
  highlightedPointId: number | null;
  onPointClick: (point: MapPoint) => void;
}

const FloorMapWithImage = memo<FloorMapWithImageProps>(({
  imageUrl,
  floorMap,
  highlightedPointId,
  onPointClick,
}) => {
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
});

FloorMapWithImage.displayName = 'FloorMapWithImage';

// ─── FloorMap view with image (edit mode) ─────────────────────────────────────

interface EditableFloorMapWithImageProps {
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

const EditableFloorMapWithImage = memo<EditableFloorMapWithImageProps>(({
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
  return (
    <div
      className="relative w-full select-none overflow-hidden rounded-xl border-2 border-dashed border-indigo-300"
      role="img"
      aria-label={`Карта этажа ${floorMap.floor_name} (режим редактирования)`}
    >
      <img
        src={imageUrl}
        alt={`План этажа ${floorMap.floor_name}`}
        className="block w-full object-contain"
        draggable={false}
      />
      <div
        className="absolute inset-0 cursor-crosshair"
        onClick={onMapClick}
      >
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
});

EditableFloorMapWithImage.displayName = 'EditableFloorMapWithImage';

// ─── Search results ───────────────────────────────────────────────────────────

interface SearchResultsProps {
  results: MapPointSearchResult[];
  onSelect: (result: MapPointSearchResult) => void;
}

const SearchResults = memo<SearchResultsProps>(({ results, onSelect }) => {
  if (results.length === 0) {
    return (
      <div className="absolute top-full left-0 right-0 z-30 mt-1 rounded-xl border border-gray-200 bg-white p-4 text-center shadow-xl">
        <p className="text-sm text-gray-500">Ничего не найдено</p>
      </div>
    );
  }

  return (
    <ul
      className="absolute top-full left-0 right-0 z-30 mt-1 max-h-64 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl"
      role="listbox"
      aria-label="Результаты поиска"
    >
      {results.map((result) => (
        <li key={result.id} role="option" aria-selected={false}>
          <button
            type="button"
            className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
            onClick={() => onSelect(result)}
          >
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" aria-hidden="true" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-900">{result.label}</p>
              {result.resource_name && (
                <p className="truncate text-xs text-gray-500">{result.resource_name}</p>
              )}
              <p className="text-xs text-gray-400">
                {result.floor_name} · {POINT_TYPE_LABELS[result.point_type] ?? result.point_type}
              </p>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
});

SearchResults.displayName = 'SearchResults';

// ─── MapPoint Add Panel (click-to-place side panel) ──────────────────────────

interface MapPointAddPanelProps {
  form: MapPointFormState;
  floorId: number;
  onFormChange: (updates: Partial<MapPointFormState>) => void;
  onCancel: () => void;
  onSuccess: () => void;
}

const MapPointAddPanel = memo<MapPointAddPanelProps>(({
  form,
  floorId,
  onFormChange,
  onCancel,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);

  const requiresResource = (t: MapPointType) =>
    t === 'desk' || t === 'meeting_room' || t === 'parking' || t === 'capsule';

  const { data: resourcesData, isLoading: resourcesLoading } = useQuery({
    queryKey: ['booking-resources-list'],
    queryFn: () =>
      apiClient
        .get<PaginatedResponse<BookingResourceListItem>>(API.bookings.resources.list)
        .then((r) => r.data),
    enabled: requiresResource(form.point_type),
    staleTime: 60_000,
  });

  const createMutation = useMutation({
    mutationFn: (payload: MapPointCreatePayload) =>
      apiClient.post(API.map.mapPoints.create, payload).then((r) => r.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['floor-map', floorId] });
      onSuccess();
    },
    onError: (err: unknown) => {
      setFormError(getApiErrorMessage(err, 'Не удалось создать точку'));
    },
  });

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      onFormChange({ [name]: value });
      setFormError(null);
    },
    [onFormChange],
  );

  const handleResourceChangeWithAutoLabel = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const resourceId = e.target.value;
      const selectedResource = resourcesData?.results.find(
        (r) => String(r.id) === resourceId,
      );
      const updates: Partial<MapPointFormState> = {
        resource: resourceId,
      };
      if (selectedResource) {
        updates.point_type = selectedResource.type as MapPointType;
        // Auto-fill label with resource name (user can still edit it after)
        updates.label = selectedResource.name;
      }
      onFormChange(updates);
      setFormError(null);
    },
    [resourcesData, onFormChange],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setFormError(null);

      const xNum = parseFloat(form.x);
      const yNum = parseFloat(form.y);

      if (isNaN(xNum) || xNum < 0 || xNum > 100) {
        setFormError('X должно быть числом от 0 до 100');
        return;
      }
      if (isNaN(yNum) || yNum < 0 || yNum > 100) {
        setFormError('Y должно быть числом от 0 до 100');
        return;
      }
      if (!form.label.trim()) {
        setFormError('Метка обязательна');
        return;
      }
      if (requiresResource(form.point_type) && !form.resource.trim()) {
        setFormError('Выберите ресурс для данного типа точки');
        return;
      }
      if (form.point_type === 'office' && !form.company.trim()) {
        setFormError('ID компании обязателен для офисной точки');
        return;
      }

      const payload: MapPointCreatePayload = {
        floor: floorId,
        point_type: form.point_type,
        label: form.label.trim(),
        x: xNum,
        y: yNum,
        resource: form.resource.trim() ? parseInt(form.resource, 10) : null,
        company: form.company.trim() ? parseInt(form.company, 10) : null,
      };

      createMutation.mutate(payload);
    },
    [form, floorId, createMutation],
  );

  // Stop click propagation so clicking inside the panel doesn't place another pin
  const handlePanelClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-30 rounded-b-xl bg-gray-800 border-t-2 border-indigo-500 shadow-2xl"
      onClick={handlePanelClick}
      role="dialog"
      aria-modal="false"
      aria-label="Добавить точку"
    >
      <form onSubmit={handleSubmit} noValidate>
        <div className="px-4 pt-3 pb-1 flex items-center justify-between">
          <span className="text-sm font-semibold text-white flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-indigo-400" aria-hidden="true" />
            Новая точка
          </span>
          <button
            type="button"
            aria-label="Отмена"
            onClick={onCancel}
            className="rounded p-1 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {formError && (
          <div
            className="mx-4 mb-2 rounded-lg border border-rose-700 bg-rose-900/60 px-3 py-2 text-xs text-rose-300"
            role="alert"
          >
            {formError}
          </div>
        )}

        <div className="grid grid-cols-2 gap-x-3 gap-y-2 px-4 pb-2 sm:grid-cols-4">
          {/* X */}
          <div className="flex flex-col gap-1">
            <label htmlFor="ap-x" className="text-xs font-medium text-gray-400">
              X (0–100)
            </label>
            <input
              id="ap-x"
              type="number"
              name="x"
              value={form.x}
              onChange={handleInputChange}
              min={0}
              max={100}
              step={0.1}
              required
              className="rounded-md border border-gray-600 bg-gray-700 px-2 py-1.5 text-sm text-white outline-none placeholder:text-gray-500 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/40 transition [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
          </div>

          {/* Y */}
          <div className="flex flex-col gap-1">
            <label htmlFor="ap-y" className="text-xs font-medium text-gray-400">
              Y (0–100)
            </label>
            <input
              id="ap-y"
              type="number"
              name="y"
              value={form.y}
              onChange={handleInputChange}
              min={0}
              max={100}
              step={0.1}
              required
              className="rounded-md border border-gray-600 bg-gray-700 px-2 py-1.5 text-sm text-white outline-none placeholder:text-gray-500 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/40 transition [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
          </div>

          {/* Resource */}
          <div className="flex flex-col gap-1">
            <label htmlFor="ap-resource" className="text-xs font-medium text-gray-400">
              Ресурс {requiresResource(form.point_type) && <span className="text-rose-400">*</span>}
            </label>
            {resourcesLoading ? (
              <div className="flex items-center gap-1.5 rounded-md border border-gray-600 bg-gray-700 px-2 py-1.5 text-xs text-gray-400">
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                Загрузка...
              </div>
            ) : (
              <select
                id="ap-resource"
                name="resource"
                value={form.resource}
                onChange={handleResourceChangeWithAutoLabel}
                className="rounded-md border border-gray-600 bg-gray-700 px-2 py-1.5 text-sm text-white outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/40 transition"
              >
                <option value="">— Выбрать —</option>
                {resourcesData?.results.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Label */}
          <div className="flex flex-col gap-1">
            <label htmlFor="ap-label" className="text-xs font-medium text-gray-400">
              Метка <span className="text-rose-400">*</span>
            </label>
            <input
              id="ap-label"
              type="text"
              name="label"
              value={form.label}
              onChange={handleInputChange}
              required
              placeholder="Desk A1"
              className="rounded-md border border-gray-600 bg-gray-700 px-2 py-1.5 text-sm text-white outline-none placeholder:text-gray-500 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/40 transition"
            />
          </div>

          {/* Point type — только отображение: задаётся типом выбранного ресурса */}
          <div className="flex flex-col gap-1">
            <label htmlFor="ap-point_type" className="text-xs font-medium text-gray-400">
              Тип точки
            </label>
            <select
              id="ap-point_type"
              name="point_type"
              value={form.point_type}
              disabled
              aria-disabled="true"
              title="Выберите ресурс — тип точки возьмётся из ресурса"
              className="cursor-not-allowed rounded-md border border-gray-600 bg-gray-600/40 px-2 py-1.5 text-sm text-gray-400 outline-none"
            >
              {POINT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {POINT_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
            <p className="text-[11px] leading-snug text-gray-500">
              Меняется при выборе ресурса (тип берётся из ресурса).
            </p>
          </div>

          {/* Company ID — only for office type */}
          {form.point_type === 'office' && (
            <div className="flex flex-col gap-1">
              <label htmlFor="ap-company" className="text-xs font-medium text-gray-400">
                ID компании <span className="text-rose-400">*</span>
              </label>
              <input
                id="ap-company"
                type="number"
                name="company"
                value={form.company}
                onChange={handleInputChange}
                required
                min={1}
                placeholder="3"
                className="rounded-md border border-gray-600 bg-gray-700 px-2 py-1.5 text-sm text-white outline-none placeholder:text-gray-500 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/40 transition [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-2 border-t border-gray-700 px-4 py-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={createMutation.isPending}
            className="rounded-lg border border-gray-600 bg-transparent px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-gray-700 hover:text-white focus:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400 disabled:opacity-50 transition-colors"
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 focus:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400 disabled:opacity-50 transition-colors"
          >
            {createMutation.isPending && (
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
            )}
            Создать точку
          </button>
        </div>
      </form>
    </div>
  );
});

MapPointAddPanel.displayName = 'MapPointAddPanel';

// ─── MapPoint Edit Modal (edit existing point) ───────────────────────────────

interface MapPointEditModalProps {
  open: boolean;
  initialData: MapPointFormState;
  floorId: number;
  editingPointId: number | null;
  onClose: () => void;
  onSuccess: () => void;
}

const MapPointEditModal = memo<MapPointEditModalProps>(({
  open,
  initialData,
  floorId,
  editingPointId,
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<MapPointFormState>(initialData);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setForm(initialData);
    setFormError(null);
  }, [initialData, open]);

  const requiresResource = (t: MapPointType) =>
    t === 'desk' || t === 'meeting_room' || t === 'parking' || t === 'capsule';

  const { data: resourcesData, isLoading: resourcesLoading } = useQuery({
    queryKey: ['booking-resources-list'],
    queryFn: () =>
      apiClient
        .get<PaginatedResponse<BookingResourceListItem>>(API.bookings.resources.list)
        .then((r) => r.data),
    enabled: open && requiresResource(form.point_type),
    staleTime: 60_000,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: MapPointUpdatePayload }) =>
      apiClient.patch(API.map.mapPoints.detail(id), payload).then((r) => r.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['floor-map', floorId] });
      onSuccess();
    },
    onError: (err: unknown) => {
      setFormError(getApiErrorMessage(err, 'Не удалось обновить точку'));
    },
  });

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setForm((prev) => ({ ...prev, [name]: value }));
      setFormError(null);
    },
    [],
  );

  const handleResourceChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const resourceId = e.target.value;
      const selectedResource = resourcesData?.results.find(
        (r) => String(r.id) === resourceId,
      );
      setForm((prev) => ({
        ...prev,
        resource: resourceId,
        ...(selectedResource
          ? { point_type: selectedResource.type as MapPointType, label: selectedResource.name }
          : {}),
      }));
      setFormError(null);
    },
    [resourcesData],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setFormError(null);

      const xNum = parseFloat(form.x);
      const yNum = parseFloat(form.y);

      if (isNaN(xNum) || xNum < 0 || xNum > 100) {
        setFormError('X должно быть числом от 0 до 100');
        return;
      }
      if (isNaN(yNum) || yNum < 0 || yNum > 100) {
        setFormError('Y должно быть числом от 0 до 100');
        return;
      }
      if (!form.label.trim()) {
        setFormError('Метка обязательна');
        return;
      }
      if (requiresResource(form.point_type) && !form.resource.trim()) {
        setFormError('ID ресурса обязателен для данного типа точки');
        return;
      }
      if (form.point_type === 'office' && !form.company.trim()) {
        setFormError('ID компании обязателен для офисной точки');
        return;
      }

      if (editingPointId === null) return;

      const payload: MapPointUpdatePayload = {
        point_type: form.point_type,
        label: form.label.trim(),
        x: xNum,
        y: yNum,
        resource: form.resource.trim() ? parseInt(form.resource, 10) : null,
        company: form.company.trim() ? parseInt(form.company, 10) : null,
      };

      updateMutation.mutate({ id: editingPointId, payload });
    },
    [form, editingPointId, updateMutation],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="map-point-edit-modal-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 id="map-point-edit-modal-title" className="text-base font-semibold text-gray-900">
            Редактировать точку
          </h2>
          <button
            type="button"
            aria-label="Закрыть"
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors"
            onClick={onClose}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-4 px-6 py-5">
            {formError && (
              <div
                className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
                role="alert"
              >
                {formError}
              </div>
            )}

            {/* Point type — только отображение: совпадает с типом ресурса (или задан при создании точки) */}
            <div className="flex flex-col gap-1">
              <label htmlFor="ep-point_type" className="text-sm font-medium text-gray-700">
                Тип точки
              </label>
              <select
                id="ep-point_type"
                name="point_type"
                value={form.point_type}
                disabled
                aria-disabled="true"
                title="Тип точки определяется типом выбранного ресурса"
                className="cursor-not-allowed rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-600 outline-none"
              >
                {POINT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {POINT_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500">
                Меняется при смене ресурса: тип берётся из ресурса.
              </p>
            </div>

            {/* Label */}
            <div className="flex flex-col gap-1">
              <label htmlFor="ep-label" className="text-sm font-medium text-gray-700">
                Метка <span className="text-rose-500">*</span>
              </label>
              <input
                id="ep-label"
                type="text"
                name="label"
                value={form.label}
                onChange={handleChange}
                required
                placeholder="Desk A1"
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
              />
            </div>

            {/* X / Y */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor="ep-x" className="text-sm font-medium text-gray-700">
                  X (0–100) <span className="text-rose-500">*</span>
                </label>
                <input
                  id="ep-x"
                  type="number"
                  name="x"
                  value={form.x}
                  onChange={handleChange}
                  required
                  min={0}
                  max={100}
                  step="any"
                  placeholder="45.5"
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="ep-y" className="text-sm font-medium text-gray-700">
                  Y (0–100) <span className="text-rose-500">*</span>
                </label>
                <input
                  id="ep-y"
                  type="number"
                  name="y"
                  value={form.y}
                  onChange={handleChange}
                  required
                  min={0}
                  max={100}
                  step="any"
                  placeholder="30.2"
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
                />
              </div>
            </div>

            {/* Resource */}
            {requiresResource(form.point_type) && (
              <div className="flex flex-col gap-1">
                <label htmlFor="ep-resource" className="text-sm font-medium text-gray-700">
                  Ресурс <span className="text-rose-500">*</span>
                </label>
                {resourcesLoading ? (
                  <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    Загрузка ресурсов...
                  </div>
                ) : (
                  <select
                    id="ep-resource"
                    name="resource"
                    value={form.resource}
                    onChange={handleResourceChange}
                    required
                    className={cn(
                      'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition',
                      !form.resource && 'text-gray-400',
                    )}
                  >
                    <option value="">— Выберите ресурс —</option>
                    {resourcesData?.results.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} (ID: {r.id})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Company ID */}
            {form.point_type === 'office' && (
              <div className="flex flex-col gap-1">
                <label htmlFor="ep-company" className="text-sm font-medium text-gray-700">
                  ID компании <span className="text-rose-500">*</span>
                </label>
                <input
                  id="ep-company"
                  type="number"
                  name="company"
                  value={form.company}
                  onChange={handleChange}
                  required
                  min={1}
                  placeholder="3"
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={updateMutation.isPending}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50 transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50 transition-colors"
            >
              {updateMutation.isPending && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              )}
              Сохранить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

MapPointEditModal.displayName = 'MapPointEditModal';

// ─── Delete confirmation dialog ───────────────────────────────────────────────

interface DeleteConfirmDialogProps {
  open: boolean;
  point: MapPoint | null;
  floorId: number;
  onClose: () => void;
  onSuccess: () => void;
}

const DeleteConfirmDialog = memo<DeleteConfirmDialogProps>(({
  open,
  point,
  floorId,
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiClient.delete(API.map.mapPoints.detail(id)).then((r) => r.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['floor-map', floorId] });
      onSuccess();
    },
    onError: (err: unknown) => {
      setDeleteError(getApiErrorMessage(err, 'Не удалось удалить точку'));
    },
  });

  useEffect(() => {
    if (!open) setDeleteError(null);
  }, [open]);

  if (!open || !point) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-confirm-title"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
        <div className="px-6 py-5">
          <h2 id="delete-confirm-title" className="text-base font-semibold text-gray-900">
            Удалить точку?
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Точка <span className="font-medium text-gray-700">«{point.label}»</span> будет
            безвозвратно удалена с карты.
          </p>

          {deleteError && (
            <div
              className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
              role="alert"
            >
              {deleteError}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={deleteMutation.isPending}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 disabled:opacity-50 transition-colors"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={() => point && deleteMutation.mutate(point.id)}
            disabled={deleteMutation.isPending}
            className="flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:opacity-50 transition-colors"
          >
            {deleteMutation.isPending && (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            )}
            Удалить
          </button>
        </div>
      </div>
    </div>
  );
});

DeleteConfirmDialog.displayName = 'DeleteConfirmDialog';

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MapPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isSuperadmin = user?.role === USER_ROLES.SUPERADMIN;

  const [selectedFloorId, setSelectedFloorId] = useState<number | null>(null);
  const [highlightedPointId, setHighlightedPointId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [bookingResource, setBookingResource] = useState<BookingResourceListItem | null>(null);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);

  // Edit mode state (superadmin only)
  const [editMode, setEditMode] = useState(false);

  // Move mode: id of the point currently being repositioned
  const [movingPointId, setMovingPointId] = useState<number | null>(null);

  // Click-to-place state: ghost pin position + pending add form
  const [ghostPin, setGhostPin] = useState<{ x: number; y: number } | null>(null);
  const [addPanelForm, setAddPanelForm] = useState<MapPointFormState>(EMPTY_FORM);
  const [addPanelOpen, setAddPanelOpen] = useState(false);

  // Edit existing point modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editModalInitialData, setEditModalInitialData] = useState<MapPointFormState>(EMPTY_FORM);
  const [editingPointId, setEditingPointId] = useState<number | null>(null);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingPoint, setDeletingPoint] = useState<MapPoint | null>(null);

  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Page-level mutation used for repositioning an existing point
  const repositionMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: MapPointUpdatePayload }) =>
      apiClient.patch(API.map.mapPoints.detail(id), payload).then((r) => r.data),
    onSuccess: () => {
      if (selectedFloorId !== null) {
        void queryClient.invalidateQueries({ queryKey: ['floor-map', selectedFloorId] });
      }
    },
  });

  // Debounce search input
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  // Close search results on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchResults(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset add panel and move mode when edit mode is turned off
  useEffect(() => {
    if (!editMode) {
      setAddPanelOpen(false);
      setGhostPin(null);
      setAddPanelForm(EMPTY_FORM);
      setMovingPointId(null);
    }
  }, [editMode]);

  // Escape key: cancel move mode (or close add panel if move mode is not active)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      if (movingPointId !== null) {
        setMovingPointId(null);
      } else if (addPanelOpen) {
        setAddPanelOpen(false);
        setGhostPin(null);
        setAddPanelForm(EMPTY_FORM);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [movingPointId, addPanelOpen]);

  // Fetch floor list
  const {
    data: floors,
    isLoading: floorsLoading,
    isError: floorsError,
  } = useQuery({
    queryKey: ['map-floors'],
    queryFn: () =>
      apiClient.get<{ results: ServiceFloor[] }>(API.map.floors).then((r) => r.data.results),
  });

  // Select first floor automatically
  useEffect(() => {
    if (floors && floors.length > 0 && selectedFloorId === null) {
      setSelectedFloorId(floors[0].id);
    }
  }, [floors, selectedFloorId]);

  const atDatetime = new Date().toISOString();

  // Fetch floor map for selected floor
  const {
    data: floorMap,
    isLoading: mapLoading,
    isError: mapError,
  } = useQuery({
    queryKey: ['floor-map', selectedFloorId, atDatetime.slice(0, 16)],
    queryFn: () =>
      apiClient
        .get<FloorMap>(API.map.floorMap(selectedFloorId!), {
          params: { datetime: atDatetime },
        })
        .then((r) => r.data),
    enabled: selectedFloorId !== null,
  });

  // Search query
  const {
    data: searchResults,
    isFetching: searchFetching,
  } = useQuery({
    queryKey: ['map-search', debouncedQuery],
    queryFn: () =>
      apiClient
        .get<MapPointSearchResult[]>(API.map.search, { params: { q: debouncedQuery } })
        .then((r) => r.data),
    enabled: debouncedQuery.length >= 2,
    staleTime: 30_000,
  });

  // Fetch resource detail when a point is clicked (read-only mode)
  const handlePointClick = useCallback(
    async (point: MapPoint) => {
      if (!isBookablePoint(point)) return;
      try {
        const { data } = await apiClient.get<BookingResourceListItem>(
          API.bookings.resources.detail(String(point.resource_id)),
        );
        setBookingResource(data);
        setBookingModalOpen(true);
      } catch {
        window.location.href = `/bookings/catalog`;
      }
    },
    [],
  );

  const handleSearchSelect = useCallback(
    (result: MapPointSearchResult) => {
      setSelectedFloorId(result.floor_id);
      setHighlightedPointId(result.id);
      setSearchQuery('');
      setDebouncedQuery('');
      setShowSearchResults(false);
      setTimeout(() => setHighlightedPointId(null), 3000);
    },
    [],
  );

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setShowSearchResults(true);
  }, []);

  const handleSearchClear = useCallback(() => {
    setSearchQuery('');
    setDebouncedQuery('');
    setShowSearchResults(false);
  }, []);

  // Click-to-place handler: compute percentage coords and open add panel
  const handleMapClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isSuperadmin || !editMode) return;
      // Don't open a new panel if edit modal is open
      if (editModalOpen) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const x = Math.round(((e.clientX - rect.left) / rect.width) * 1000) / 10;
      const y = Math.round(((e.clientY - rect.top) / rect.height) * 1000) / 10;

      const clampedX = Math.min(100, Math.max(0, x));
      const clampedY = Math.min(100, Math.max(0, y));

      // Move mode: reposition the selected point instead of placing a new one
      if (movingPointId !== null) {
        repositionMutation.mutate({ id: movingPointId, payload: { x: clampedX, y: clampedY } });
        setMovingPointId(null);
        return;
      }

      setGhostPin({ x: clampedX, y: clampedY });
      setAddPanelForm({ ...EMPTY_FORM, x: String(clampedX), y: String(clampedY) });
      setAddPanelOpen(true);
    },
    [isSuperadmin, editMode, editModalOpen, movingPointId, repositionMutation],
  );

  // Handler to enter move mode for a specific point
  const handleMovePoint = useCallback((point: MapPoint) => {
    // Close add panel if open
    setAddPanelOpen(false);
    setGhostPin(null);
    setAddPanelForm(EMPTY_FORM);
    setMovingPointId(point.id);
  }, []);

  const handleAddPanelFormChange = useCallback((updates: Partial<MapPointFormState>) => {
    setAddPanelForm((prev) => {
      const next = { ...prev, ...updates };
      // Keep ghost pin in sync with x/y field edits
      const xNum = parseFloat(next.x);
      const yNum = parseFloat(next.y);
      if (!isNaN(xNum) && !isNaN(yNum)) {
        setGhostPin({
          x: Math.min(100, Math.max(0, xNum)),
          y: Math.min(100, Math.max(0, yNum)),
        });
      }
      return next;
    });
  }, []);

  const handleAddPanelCancel = useCallback(() => {
    setAddPanelOpen(false);
    setGhostPin(null);
    setAddPanelForm(EMPTY_FORM);
  }, []);

  const handleAddPanelSuccess = useCallback(() => {
    setAddPanelOpen(false);
    setGhostPin(null);
    setAddPanelForm(EMPTY_FORM);
  }, []);

  // Edit existing point handlers
  const handleEditPoint = useCallback((point: MapPoint) => {
    setEditingPointId(point.id);
    setEditModalInitialData({
      point_type: point.point_type,
      label: point.label,
      x: String(point.x),
      y: String(point.y),
      resource: point.resource_id != null ? String(point.resource_id) : '',
      company: '',
    });
    setEditModalOpen(true);
  }, []);

  const handleCloseEditModal = useCallback(() => {
    setEditModalOpen(false);
    setEditingPointId(null);
  }, []);

  const handleEditModalSuccess = useCallback(() => {
    setEditModalOpen(false);
    setEditingPointId(null);
  }, []);

  // Delete handlers
  const handleDeletePoint = useCallback((point: MapPoint) => {
    setDeletingPoint(point);
    setDeleteDialogOpen(true);
  }, []);

  const handleCloseDeleteDialog = useCallback(() => {
    setDeleteDialogOpen(false);
    setDeletingPoint(null);
  }, []);

  const handleDeleteSuccess = useCallback(() => {
    setDeleteDialogOpen(false);
    setDeletingPoint(null);
  }, []);

  const selectedFloor = floors?.find((f) => f.id === selectedFloorId);
  const resolvedImageUrl = selectedFloor
    ? resolveMediaUrl(selectedFloor.plan_image_url ?? selectedFloor.plan_image)
    : null;
  const showSearch = debouncedQuery.length >= 2;

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-gray-900">Карта здания</h1>
        <p className="text-sm text-gray-500">
          Интерактивная карта этажей. Нажмите на точку, чтобы открыть бронирование.
        </p>
      </div>

      {/* Search + Legend row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div ref={searchRef} className="relative w-full max-w-sm">
          <label htmlFor="map-search" className="sr-only">
            Поиск по карте
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              aria-hidden="true"
            />
            <input
              id="map-search"
              type="search"
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => searchQuery.length >= 2 && setShowSearchResults(true)}
              placeholder="Поиск по карте..."
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-9 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              aria-label="Поиск по карте"
              aria-autocomplete="list"
              aria-expanded={showSearchResults && showSearch}
              role="combobox"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={handleSearchClear}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:text-gray-600 focus:outline-none"
                aria-label="Очистить поиск"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
          {showSearchResults && showSearch && (
            <div aria-live="polite">
              {searchFetching ? (
                <div className="absolute top-full left-0 right-0 z-30 mt-1 flex items-center justify-center rounded-xl border border-gray-200 bg-white p-4 shadow-xl">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" aria-hidden="true" />
                  <span className="ml-2 text-sm text-gray-500">Поиск...</span>
                </div>
              ) : (
                <SearchResults
                  results={searchResults ?? []}
                  onSelect={handleSearchSelect}
                />
              )}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4" aria-label="Легенда карты" role="group">
          {LEGEND_ITEMS.map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <span className={cn('block h-3 w-3 rounded-full', item.color)} aria-hidden="true" />
              <span className="text-xs text-gray-600">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Floor tabs */}
      {floorsLoading && (
        <div className="flex items-center gap-2 text-sm text-gray-500" aria-live="polite">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Загрузка этажей...
        </div>
      )}
      {floorsError && (
        <div
          className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
          role="alert"
        >
          Не удалось загрузить список этажей. Попробуйте обновить страницу.
        </div>
      )}
      {floors && floors.length > 0 && (
        <div
          className="flex gap-2 overflow-x-auto pb-1"
          role="tablist"
          aria-label="Этажи здания"
        >
          {floors.map((floor) => (
            <button
              key={floor.id}
              type="button"
              role="tab"
              aria-selected={selectedFloorId === floor.id}
              aria-controls="floor-map-panel"
              id={`tab-floor-${floor.id}`}
              onClick={() => {
                setSelectedFloorId(floor.id);
                setHighlightedPointId(null);
                // Close add panel when switching floors
                setAddPanelOpen(false);
                setGhostPin(null);
                setAddPanelForm(EMPTY_FORM);
              }}
              className={cn(
                'shrink-0 rounded-lg border px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
                selectedFloorId === floor.id
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50',
              )}
            >
              {floor.name}
            </button>
          ))}
        </div>
      )}
      {floors && floors.length === 0 && !floorsLoading && (
        <div
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700"
          role="alert"
        >
          Этажи не найдены. Обратитесь к администратору.
        </div>
      )}

      {/* Map panel */}
      <div
        id="floor-map-panel"
        role="tabpanel"
        aria-labelledby={selectedFloorId ? `tab-floor-${selectedFloorId}` : undefined}
      >
        {mapLoading && (
          <div
            className="flex min-h-64 items-center justify-center rounded-xl border border-gray-200 bg-gray-50"
            aria-live="polite"
          >
            <div className="flex flex-col items-center gap-3 text-gray-400">
              <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
              <p className="text-sm">Загрузка карты...</p>
            </div>
          </div>
        )}

        {mapError && !mapLoading && (
          <div
            className="flex min-h-64 items-center justify-center rounded-xl border border-rose-200 bg-rose-50"
            role="alert"
          >
            <p className="text-sm text-rose-600">
              Не удалось загрузить карту этажа. Попробуйте выбрать другой этаж.
            </p>
          </div>
        )}

        {floorMap && !mapLoading && !mapError && (
          <div className="flex flex-col gap-3">
            {/* Map toolbar */}
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-800">{floorMap.floor_name}</h2>
              <div className="flex items-center gap-3">
                {/* Superadmin: edit mode toggle */}
                {isSuperadmin && (
                  <button
                    type="button"
                    onClick={() => setEditMode((prev) => !prev)}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
                      editMode
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50',
                    )}
                    aria-pressed={editMode}
                    aria-label={editMode ? 'Выключить режим редактирования' : 'Включить режим редактирования'}
                  >
                    {editMode ? (
                      <ToggleRight className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <ToggleLeft className="h-4 w-4" aria-hidden="true" />
                    )}
                    Режим редактирования
                  </button>
                )}

                {!editMode && (
                  <p className="text-xs text-gray-400">
                    Актуально на{' '}
                    {new Date(floorMap.at_time).toLocaleTimeString('ru-RU', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                )}
              </div>
            </div>

            {/* Edit mode badge */}
            {isSuperadmin && editMode && (
              <div
                className={cn(
                  'flex items-center gap-2 rounded-lg border px-4 py-2 text-sm',
                  movingPointId !== null
                    ? 'border-amber-200 bg-amber-50 text-amber-700'
                    : 'border-indigo-200 bg-indigo-50 text-indigo-700',
                )}
                role="status"
                aria-live="polite"
              >
                {movingPointId !== null ? (
                  <>
                    <Move className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    Режим перемещения. Нажмите на карту, чтобы поставить точку в новое место. Нажмите Escape для отмены.
                  </>
                ) : (
                  <>
                    <Pencil className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    Режим редактирования активен. Нажмите на карту, чтобы разместить новую точку. Наведите на точку для редактирования, перемещения или удаления.
                  </>
                )}
              </div>
            )}

            {/* Map canvas — wrapped in relative container for the add panel overlay */}
            <div className="relative">
              {editMode && isSuperadmin ? (
                resolvedImageUrl ? (
                  <EditableFloorMapWithImage
                    imageUrl={resolvedImageUrl}
                    floorMap={floorMap}
                    highlightedPointId={highlightedPointId}
                    movingPointId={movingPointId}
                    ghostPin={ghostPin}
                    onEditPoint={handleEditPoint}
                    onDeletePoint={handleDeletePoint}
                    onMovePoint={handleMovePoint}
                    onMapClick={handleMapClick}
                  />
                ) : (
                  <EditableFloorMapView
                    floorMap={floorMap}
                    highlightedPointId={highlightedPointId}
                    movingPointId={movingPointId}
                    ghostPin={ghostPin}
                    onEditPoint={handleEditPoint}
                    onDeletePoint={handleDeletePoint}
                    onMovePoint={handleMovePoint}
                    onMapClick={handleMapClick}
                  />
                )
              ) : resolvedImageUrl ? (
                <FloorMapWithImage
                  imageUrl={resolvedImageUrl}
                  floorMap={floorMap}
                  highlightedPointId={highlightedPointId}
                  onPointClick={handlePointClick}
                />
              ) : (
                <FloorMapView
                  floorMap={floorMap}
                  highlightedPointId={highlightedPointId}
                  onPointClick={handlePointClick}
                />
              )}

              {/* Add panel — overlays the bottom of the map container */}
              {addPanelOpen && isSuperadmin && editMode && selectedFloorId !== null && (
                <MapPointAddPanel
                  form={addPanelForm}
                  floorId={selectedFloorId}
                  onFormChange={handleAddPanelFormChange}
                  onCancel={handleAddPanelCancel}
                  onSuccess={handleAddPanelSuccess}
                />
              )}
            </div>

            {!editMode && floorMap.points.length > 0 && (
              <p className="text-xs text-gray-400">
                {floorMap.points.length}{' '}
                {floorMap.points.length === 1
                  ? 'точка'
                  : floorMap.points.length < 5
                    ? 'точки'
                    : 'точек'}{' '}
                на карте. Нажмите на точку, чтобы открыть бронирование.
              </p>
            )}
          </div>
        )}

        {!selectedFloorId && !floorsLoading && (
          <div className="flex min-h-64 items-center justify-center rounded-xl border border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-400">Выберите этаж для просмотра карты</p>
          </div>
        )}
      </div>

      {/* Booking modal (read-only mode) */}
      {bookingResource && (
        <BookingModal
          resource={bookingResource}
          open={bookingModalOpen}
          onClose={() => {
            setBookingModalOpen(false);
            setBookingResource(null);
          }}
        />
      )}

      {/* Edit point modal (superadmin) */}
      {selectedFloorId !== null && (
        <MapPointEditModal
          open={editModalOpen}
          initialData={editModalInitialData}
          floorId={selectedFloorId}
          editingPointId={editingPointId}
          onClose={handleCloseEditModal}
          onSuccess={handleEditModalSuccess}
        />
      )}

      {/* Delete confirmation dialog (superadmin) */}
      {selectedFloorId !== null && (
        <DeleteConfirmDialog
          open={deleteDialogOpen}
          point={deletingPoint}
          floorId={selectedFloorId}
          onClose={handleCloseDeleteDialog}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </div>
  );
}
