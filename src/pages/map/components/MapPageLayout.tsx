import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Layers, Loader2, Minus, Pencil, Plus, ToggleLeft, ToggleRight, Trash2, X } from 'lucide-react';

import { cn } from '@/shared/lib/cn';
import { fmtTime } from '@/shared/lib/formatDate';
import { useAuth } from '@/shared/hooks/useAuth';
import { USER_ROLES } from '@/shared/config/constants';
import type { UseMapLogicReturn } from '@/pages/map/hooks/useMapLogic';
import {
  LEGEND_ITEM_COLORS,
  LEGEND_STATUS_KEYS,
  POINT_STATUS_LABEL_KEYS,
} from '@/pages/map/lib/status';

import { MapSearchBar } from '@/pages/map/components/MapSearchBar';
import { MapEditModeBanner } from '@/pages/map/components/MapEditModeBanner';
import { FloorMapView } from '@/pages/map/components/FloorMapView';
import { EditableFloorMapView } from '@/pages/map/components/EditableFloorMapView';
import { FloorMapWithImage } from '@/pages/map/components/FloorMapWithImage';
import { EditableFloorMapWithImage } from '@/pages/map/components/EditableFloorMapWithImage';
import { MapPointAddPanel } from '@/pages/map/components/MapPointAddPanel';
import { MapPointEditModal } from '@/pages/map/components/MapPointEditModal';
import { MapDeletePointDialog } from '@/pages/map/components/MapDeletePointDialog';
import { MapDeleteFloorDialog } from '@/pages/map/components/MapDeleteFloorDialog';
import { MapCreateFloorModal } from '@/pages/map/components/MapCreateFloorModal';
import { MapEditFloorModal } from '@/pages/map/components/MapEditFloorModal';
import { MapRoomPopup } from '@/pages/map/components/MapRoomPopup';
import { BookingModal } from '@/shared/ui/BookingModal';
import { CompanyResourceDetailModal } from '@/shared/ui/ResourceDetailModal';
import { CleaningModal } from '@/pages/service-requests/components/CleaningModal';

export type MapPageLayoutProps = UseMapLogicReturn;

const POPUP_W = 240;
const POPUP_H = 220;

function getPopupScreenPos(
  canvasEl: HTMLDivElement,
  point: { x: number; y: number; width?: number | null; height?: number | null },
  zoom: number,
  pan: { x: number; y: number },
  viewMode: '2D' | '3D',
): { left: number; top: number } {
  const rect = canvasEl.getBoundingClientRect();
  const w = point.width ?? 12;
  const h = point.height ?? 8;

  // Raw pixel position of the point's bottom-center within the canvas
  const rawX = ((point.x + w / 2) / 100) * rect.width;
  const rawY = ((point.y + h) / 100) * rect.height;

  // Transform origin differs between 2D and 3D
  const originX = rect.width / 2;
  const originY = viewMode === '3D' ? 0 : rect.height / 2;

  // Apply scale from origin + pan translation
  const scaledX = originX + (rawX - originX) * zoom + pan.x;
  const scaledY = originY + (rawY - originY) * zoom + pan.y;

  const left = rect.left + scaledX - POPUP_W / 2;
  const top = rect.top + scaledY + 8;

  // Clamp so the popup stays fully within the viewport
  const clampedLeft = Math.max(8, Math.min(left, window.innerWidth - POPUP_W - 8));
  const clampedTop = Math.max(8, Math.min(top, window.innerHeight - POPUP_H - 8));

  return { left: clampedLeft, top: clampedTop };
}

export const MapPageLayout = memo<MapPageLayoutProps>((logic) => {
  const {
    searchRef,
    isSuperadmin,
    viewMode,
    setViewMode,
    searchQuery,
    handleSearchChange,
    handleSearchClear,
    handleSearchFocusShowResults,
    showSearchResults,
    showSearch,
    searchFetching,
    searchResults,
    handleSearchSelect,
    statusCounts,
    floors,
    floorsLoading,
    selectedFloorId,
    handleSelectFloor,
    onOpenCreateFloor,
    createFloorOpen,
    onCloseCreateFloor,
    onFloorCreated,
    mapLoading,
    mapError,
    floorMap,
    editMode,
    setEditMode,
    movingPointId,
    draggingPointId,
    resolvedImageUrl,
    highlightedPointId,
    ghostPin,
    handleMapMouseDown,
    handleMapMouseMove,
    handleMapMouseUp,
    handleEditPoint,
    handleDeletePoint,
    handleMovePoint,
    handlePointDragStart,
    selectedPointId,
    handleRoomClick,
    handleCloseRoomPopup,
    handleBookPoint,
    handleDetailsPoint,
    bookingModalResource,
    handleCloseBookingModal,
    handleOpenBookingModal,
    detailModalResource,
    handleCloseDetailModal,
    addPanelOpen,
    addPanelForm,
    handleAddPanelFormChange,
    handleAddPanelCancel,
    handleAddPanelSuccess,
    editModalOpen,
    editModalInitialData,
    editingPointId,
    handleCloseEditModal,
    handleEditModalSuccess,
    deleteDialogOpen,
    deletingPoint,
    handleCloseDeleteDialog,
    handleDeleteSuccess,
    deleteFloorDialogOpen,
    deletingFloor,
    handleDeleteFloor,
    handleCloseDeleteFloorDialog,
    handleDeleteFloorSuccess,
    editFloorOpen,
    editingFloor,
    onOpenEditFloor,
    onCloseEditFloor,
    onFloorUpdated,
  } = logic;

  const { t } = useTranslation();
  const { user } = useAuth();
  const isServiceManager = user?.role === USER_ROLES.SERVICE_MANAGER;

  const [cleaningModalOpen, setCleaningModalOpen] = useState(false);
  const [cleaningFloorId, setCleaningFloorId] = useState<string>('');
  const [cleaningLocation, setCleaningLocation] = useState<string>('');
  const [cleaningKey, setCleaningKey] = useState(0);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = () => setZoom((z) => Math.min(3, parseFloat((z + 0.2).toFixed(1))));
  const handleZoomOut = () => setZoom((z) => Math.max(0.5, parseFloat((z - 0.2).toFixed(1))));

  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [selectedFloorId]);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (editMode) return;
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;
    e.preventDefault();
    panStart.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
    setIsPanning(true);
  }, [editMode, pan]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!panStart.current) return;
    const dx = e.clientX - panStart.current.mx;
    const dy = e.clientY - panStart.current.my;
    setPan({ x: panStart.current.px + dx, y: panStart.current.py + dy });
  }, []);

  const handleCanvasMouseUp = useCallback(() => {
    panStart.current = null;
    setIsPanning(false);
  }, []);

  const handleCanvasTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (editMode) return;
    if (e.touches.length !== 1) return;
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;
    const touch = e.touches[0];
    panStart.current = { mx: touch.clientX, my: touch.clientY, px: pan.x, py: pan.y };
    setIsPanning(true);
  }, [editMode, pan]);

  const handleCanvasTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!panStart.current || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const dx = touch.clientX - panStart.current.mx;
    const dy = touch.clientY - panStart.current.my;
    setPan({ x: panStart.current.px + dx, y: panStart.current.py + dy });
  }, []);

  const handleCanvasTouchEnd = useCallback(() => {
    panStart.current = null;
    setIsPanning(false);
  }, []);

  return (
    <div className="flex flex-col gap-4 p-6">
      {/* Page header + search */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">{t('map.buildingMap')}</h1>
          {floorMap && statusCounts && (
            <p className="mt-0.5 text-sm text-muted">
              {floorMap.floor_name} · {statusCounts.free} {t('map.status.free').toLowerCase()},{' '}
              {statusCounts.occupied} {t('map.status.occupied').toLowerCase()},{' '}
              {statusCounts.soon_available} {t('map.status.soon_available').toLowerCase()}
            </p>
          )}
        </div>
        <MapSearchBar
          searchRef={searchRef}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          onSearchClear={handleSearchClear}
          onSearchFocusShowResults={handleSearchFocusShowResults}
          showSearchResults={showSearchResults}
          showSearch={showSearch}
          searchFetching={searchFetching}
          searchResults={searchResults}
          onSelectResult={handleSearchSelect}
        />
      </div>

      {/* MAP FRAME: left sidebar + right stage */}
      <div
        className="grid overflow-hidden rounded-xl border border-default bg-surface md:grid-cols-[200px_1fr]"
        style={{
          minHeight: '540px',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        {/* LEFT SIDEBAR */}
        <div className="hidden flex-col gap-1 border-r border-default bg-raised p-3 md:flex">
          {/* Floors section */}
          <p className="px-2 pb-2.5 pt-1 text-[11px] font-medium uppercase tracking-wider text-muted">
            {t('map.floorsTitle')}
          </p>

          {floorsLoading && (
            <div className="flex items-center gap-2 px-2 py-1 text-xs text-muted">
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
              ...
            </div>
          )}

          {floors?.map((floor) => {
            const isSelected = selectedFloorId === floor.id;
            const pct = Math.max(0, Math.min(100, floor.occupancy_pct ?? 0));
            return (
              <div
                key={floor.id}
                role="tab"
                aria-selected={isSelected}
                className={cn(
                  'group flex w-full flex-col gap-0.5 rounded-md px-2.5 py-2 transition-colors',
                  isSelected ? 'bg-active' : 'hover:bg-hover',
                )}
              >
                {/* Name row: select button + action buttons */}
                <div className="flex w-full items-center gap-1">
                  {/* Main select button */}
                  <button
                    type="button"
                    onClick={() => handleSelectFloor(floor.id)}
                    className={cn(
                      'min-w-0 flex-1 truncate text-left text-[13px] font-medium transition-colors',
                      isSelected ? 'text-[var(--brand-text)] font-semibold' : 'text-secondary',
                    )}
                  >
                    {floor.name || `${t('map.floorFallbackName')} ${floor.number}`}
                  </button>

                  {/* Action buttons — always visible in editMode (not behind hover) */}
                  {editMode && isSuperadmin && (
                    <div className="flex shrink-0 items-center gap-0.5">
                      <button
                        type="button"
                        aria-label={t('map.editFloorAria', { name: floor.name ?? floor.number })}
                        onClick={() => onOpenEditFloor(floor)}
                        className="flex h-5 w-5 items-center justify-center rounded text-muted hover:bg-[var(--bg-hover)] hover:text-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] transition-colors"
                      >
                        <Pencil className="h-3 w-3" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        aria-label={t('map.deleteFloor', { name: floor.name ?? floor.number })}
                        onClick={() => handleDeleteFloor(floor)}
                        className="flex h-5 w-5 items-center justify-center rounded text-muted hover:bg-rose-100 hover:text-[var(--danger)] focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 transition-colors"
                      >
                        <Trash2 className="h-3 w-3" aria-hidden="true" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Occupancy row */}
                <div className="flex items-center gap-1.5 px-0 mt-1">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--bg-hover)]">
                    <span
                      role="progressbar"
                      aria-valuenow={pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      className={cn(
                        'block h-full rounded-full transition-all',
                        pct > 70
                          ? 'bg-[var(--danger)]'
                          : pct >= 50
                            ? 'bg-amber-500'
                            : 'bg-emerald-500',
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="font-mono text-[10px] text-muted whitespace-nowrap">
                    {pct}%
                  </span>
                </div>
              </div>
            );
          })}

          {isSuperadmin && (
            <button
              type="button"
              onClick={onOpenCreateFloor}
              className={cn(
                'mt-1 flex w-full items-center gap-1.5 rounded-md px-2.5 py-1.5 text-left text-[12px] font-medium transition-colors',
                editMode
                  ? 'text-[var(--brand-text)] hover:bg-active'
                  : 'text-muted hover:bg-hover hover:text-primary',
              )}
            >
              <Plus className="h-3 w-3" aria-hidden="true" />
              {t('map.addFloor')}
            </button>
          )}

          {/* Divider */}
          <div className="my-2 border-t border-default" />

          {/* Legend section */}
          <p className="px-2 pb-2 text-[11px] font-medium uppercase tracking-wider text-muted">
            {t('map.legendTitle')}
          </p>

          {LEGEND_STATUS_KEYS.map((status) => (
            <div key={status} className="flex items-center gap-2 px-2 py-1 text-[12px] text-muted">
              <span
                className={cn(
                  'block h-3.5 w-3.5 shrink-0 rounded-[3px] border',
                  LEGEND_ITEM_COLORS[status],
                  status === 'free' && 'border-emerald-600',
                  status === 'occupied' && 'border-rose-600',
                  status === 'soon_available' && 'border-amber-600',
                  status === 'none' && 'border-stone-600',
                )}
              />
              <span>
                {t(POINT_STATUS_LABEL_KEYS[status])}
                {statusCounts ? ` (${statusCounts[status]})` : ''}
              </span>
            </div>
          ))}
        </div>

        {/* RIGHT STAGE */}
        <div className="flex min-w-0 flex-col gap-3 p-3.5">
          {/* Toolbar — badge and 2D/3D only when floorMap is loaded; edit toggle always for superadmin */}
          <div className="flex min-h-[36px] items-center gap-2">
            {/* Floor name + point count badge — only when floorMap is ready */}
            {floorMap && !mapLoading && !mapError && (
              <span className="inline-flex items-center rounded-md border border-default bg-raised px-2.5 py-1 text-[12px] font-medium text-secondary">
                {floorMap.floor_name} &middot;{' '}
                {floorMap.points.length}{' '}
                {floorMap.points.length === 1
                  ? t('map.pointCount_one', { count: 1, defaultValue: 'точка' })
                  : floorMap.points.length < 5
                    ? t('map.pointCount_few', { count: floorMap.points.length, defaultValue: 'точки' })
                    : t('map.pointCount_many', { count: floorMap.points.length, defaultValue: 'точек' })}
              </span>
            )}

            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="flex items-center gap-1.5 rounded-md border border-default bg-surface px-3 py-1.5 text-[12px] font-medium text-secondary transition-colors hover:bg-raised md:hidden"
            >
              <Layers className="h-3.5 w-3.5" aria-hidden="true" />
              {t('map.floorsTitle')}
            </button>

            <div className="ml-auto flex items-center gap-2">
              {/* 2D / 3D toggle — only when floorMap is ready */}
              {floorMap && !mapLoading && !mapError && (
                <div className="inline-flex rounded-[6px] border border-default bg-raised p-0.5">
                  {(['2D', '3D'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setViewMode(m)}
                      className={cn(
                        'rounded-[4px] px-3 py-1 text-[12px] font-medium transition-all',
                        viewMode === m
                          ? 'bg-surface text-primary shadow-sm'
                          : 'text-muted hover:text-secondary',
                      )}
                    >
                      {m} {t('map.schemaLabel')}
                    </button>
                  ))}
                </div>
              )}

              {/* Edit mode toggle — ALWAYS visible for superadmin, regardless of floorMap state */}
              {isSuperadmin && (
                <button
                  type="button"
                  onClick={() => setEditMode((prev) => !prev)}
                  aria-pressed={editMode}
                  aria-label={editMode ? t('map.editModeOff') : t('map.editModeOn')}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-[12px] font-medium transition-colors',
                    editMode
                      ? 'border-[var(--brand)] bg-active text-[var(--brand-text)]'
                      : 'border-default bg-surface text-muted hover:bg-raised',
                  )}
                >
                  {editMode ? (
                    <ToggleRight className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <ToggleLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  {t('map.editMode')}
                </button>
              )}

              {/* Updated at — only when floorMap is ready and not in editMode */}
              {floorMap && !mapLoading && !mapError && !editMode && (
                <span className="text-[11px] text-muted">
                  {t('map.updatedAt')}{' '}
                  {fmtTime(floorMap.at_time)}
                </span>
              )}
            </div>
          </div>

          {/* Edit mode banner */}
          {isSuperadmin && editMode && <MapEditModeBanner movingPointId={movingPointId} />}

          {/* Canvas area */}
          <div className="relative flex-1" onClick={handleCloseRoomPopup}>
            {mapLoading && (
              <div
                className="flex min-h-64 items-center justify-center rounded-xl border border-default bg-raised"
                aria-live="polite"
              >
                <div className="flex flex-col items-center gap-3 text-secondary">
                  <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
                  <p className="text-sm">{t('map.loadingMap')}</p>
                </div>
              </div>
            )}

            {mapError && !mapLoading && (
              <div
                className="flex min-h-64 items-center justify-center rounded-xl border border-rose-200 bg-rose-50"
                role="alert"
              >
                <p className="text-sm text-rose-600">{t('map.loadError')}</p>
              </div>
            )}

            {!selectedFloorId && !floorsLoading && (
              <div className="flex min-h-64 items-center justify-center rounded-xl border border-default bg-raised">
                <p className="text-sm text-muted">{t('map.selectFloor')}</p>
              </div>
            )}

            {floorMap && !mapLoading && !mapError && selectedFloorId !== null ? (
              <div className="relative">
                {/* Canvas with dot-grid background */}
                <div
                  ref={canvasRef}
                  className={cn(
                    'relative overflow-hidden rounded-xl border border-default',
                    !editMode && (isPanning ? 'cursor-grabbing' : 'cursor-grab'),
                    editMode && 'cursor-crosshair',
                  )}
                  style={{
                    background: `
                      linear-gradient(var(--border-faint) 1px, transparent 1px) 0 0/24px 24px,
                      linear-gradient(90deg, var(--border-faint) 1px, transparent 1px) 0 0/24px 24px,
                      var(--bg-page)
                    `,
                    touchAction: editMode ? 'auto' : 'none',
                  }}
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  onMouseLeave={handleCanvasMouseUp}
                  onTouchStart={handleCanvasTouchStart}
                  onTouchMove={handleCanvasTouchMove}
                  onTouchEnd={handleCanvasTouchEnd}
                >
                  {/* 3D perspective wrapper */}
                  <div
                    style={
                      viewMode === '3D'
                        ? {
                            filter: 'drop-shadow(0 40px 30px rgba(0,0,0,0.25))',
                            transition: 'filter 0.3s ease',
                          }
                        : { transition: 'filter 0.3s ease' }
                    }
                  >
                  <div
                    style={{
                      transform:
                        viewMode === '3D'
                          ? `translate(${pan.x}px, ${pan.y}px) perspective(900px) rotateX(35deg) rotateZ(-3deg) scale(${zoom})`
                          : `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                      transformOrigin: viewMode === '3D' ? 'center top' : 'center center',
                      transition: isPanning ? 'none' : 'transform 0.25s ease',
                    }}
                  >
                    {editMode && isSuperadmin ? (
                      resolvedImageUrl ? (
                        <EditableFloorMapWithImage
                          imageUrl={resolvedImageUrl}
                          floorMap={floorMap}
                          highlightedPointId={highlightedPointId}
                          movingPointId={movingPointId}
                          draggingPointId={draggingPointId}
                          ghostPin={ghostPin}
                          onEditPoint={handleEditPoint}
                          onDeletePoint={handleDeletePoint}
                          onMovePoint={handleMovePoint}
                          onPointDragStart={handlePointDragStart}
                          onMapMouseDown={handleMapMouseDown}
                          onMapMouseMove={handleMapMouseMove}
                          onMapMouseUp={handleMapMouseUp}
                        />
                      ) : (
                        <EditableFloorMapView
                          floorMap={floorMap}
                          highlightedPointId={highlightedPointId}
                          movingPointId={movingPointId}
                          draggingPointId={draggingPointId}
                          ghostPin={ghostPin}
                          onEditPoint={handleEditPoint}
                          onDeletePoint={handleDeletePoint}
                          onMovePoint={handleMovePoint}
                          onPointDragStart={handlePointDragStart}
                          onMapMouseDown={handleMapMouseDown}
                          onMapMouseMove={handleMapMouseMove}
                          onMapMouseUp={handleMapMouseUp}
                        />
                      )
                    ) : resolvedImageUrl ? (
                      <FloorMapWithImage
                        imageUrl={resolvedImageUrl}
                        floorMap={floorMap}
                        highlightedPointId={highlightedPointId}
                        onPointClick={handleRoomClick}
                      />
                    ) : (
                      <FloorMapView
                        floorMap={floorMap}
                        highlightedPointId={highlightedPointId}
                        onPointClick={handleRoomClick}
                      />
                    )}
                  </div>
                  {/* floor base — visible only in 3D mode */}
                  {viewMode === '3D' && (
                    <div
                      aria-hidden="true"
                      style={{
                        position: 'absolute',
                        bottom: -6,
                        left: '4%',
                        right: '4%',
                        height: 12,
                        background: 'linear-gradient(to bottom, var(--bg-raised), transparent)',
                        borderRadius: '0 0 8px 8px',
                        opacity: 0.6,
                      }}
                    />
                  )}
                  </div>

                  {/* Zoom controls — absolute bottom-right of canvas */}
                  <div
                    className="absolute bottom-4 right-4 flex flex-col overflow-hidden rounded-md border border-default bg-surface"
                    style={{ boxShadow: 'var(--shadow-card)' }}
                  >
                    <button
                      type="button"
                      aria-label={t('map.zoomIn')}
                      onClick={handleZoomIn}
                      className="flex h-7 w-7 items-center justify-center text-secondary transition-colors hover:bg-hover"
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                    <div className="flex h-6 w-7 items-center justify-center border-t border-default">
                      <span className="font-mono text-[9px] text-muted select-none">
                        {Math.round(zoom * 100)}%
                      </span>
                    </div>
                    <button
                      type="button"
                      aria-label={t('map.zoomOut')}
                      onClick={handleZoomOut}
                      className="flex h-7 w-7 items-center justify-center border-t border-default text-secondary transition-colors hover:bg-hover"
                    >
                      <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                {/* Room popup — rendered via portal so overflow-hidden cannot clip it */}
                {selectedPointId !== null && !editMode && canvasRef.current && (() => {
                  const point = floorMap.points.find((p) => p.id === selectedPointId);
                  if (!point) return null;
                  const { left, top } = getPopupScreenPos(canvasRef.current!, point, zoom, pan, viewMode);
                  return createPortal(
                    <MapRoomPopup
                      point={point}
                      floorName={floorMap.floor_name}
                      onBook={handleBookPoint}
                      onDetails={handleDetailsPoint}
                      onClose={handleCloseRoomPopup}
                      screenLeft={left}
                      screenTop={top}
                      onCleaning={!isServiceManager ? (pointLabel: string) => {
                        setCleaningFloorId(selectedFloorId !== null ? String(selectedFloorId) : '');
                        setCleaningLocation(pointLabel);
                        setCleaningKey((k) => k + 1);
                        setCleaningModalOpen(true);
                      } : undefined}
                    />,
                    document.body,
                  );
                })()}

                {/* Add point panel */}
                {addPanelOpen && isSuperadmin && editMode && selectedFloorId !== null && (
                  <MapPointAddPanel
                    form={addPanelForm}
                    floorId={selectedFloorId}
                    onFormChange={handleAddPanelFormChange}
                    onCancel={handleAddPanelCancel}
                    onSuccess={handleAddPanelSuccess}
                  />
                )}

                {/* Points count hint */}
                {!editMode && floorMap.points.length > 0 && (
                  <p className="mt-2 text-xs text-muted">{t('map.clickToBook')}</p>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Modals */}
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

      {selectedFloorId !== null && (
        <MapDeletePointDialog
          open={deleteDialogOpen}
          point={deletingPoint}
          floorId={selectedFloorId}
          onClose={handleCloseDeleteDialog}
          onSuccess={handleDeleteSuccess}
        />
      )}

      <MapDeleteFloorDialog
        open={deleteFloorDialogOpen}
        floor={deletingFloor}
        onClose={handleCloseDeleteFloorDialog}
        onSuccess={handleDeleteFloorSuccess}
      />

      {isSuperadmin && (
        <MapCreateFloorModal
          open={createFloorOpen}
          onClose={onCloseCreateFloor}
          onCreated={onFloorCreated}
        />
      )}

      <MapEditFloorModal
        open={editFloorOpen}
        floor={editingFloor}
        onClose={onCloseEditFloor}
        onUpdated={onFloorUpdated}
      />

      <CompanyResourceDetailModal
        resource={detailModalResource}
        onClose={handleCloseDetailModal}
        onBook={() => {
          if (detailModalResource) handleOpenBookingModal(detailModalResource);
          handleCloseDetailModal();
        }}
      />

      {bookingModalResource !== null && (
        <BookingModal
          resource={bookingModalResource}
          open={true}
          onClose={handleCloseBookingModal}
        />
      )}

      <CleaningModal
        key={cleaningKey}
        isOpen={cleaningModalOpen}
        onClose={() => setCleaningModalOpen(false)}
        initialFloorId={cleaningFloorId}
        initialLocation={cleaningLocation}
      />

      {/* Mobile floor picker bottom sheet */}
      {mobileSidebarOpen && createPortal(
        <div
          className="fixed inset-0 z-50 md:hidden"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={() => setMobileSidebarOpen(false)}
        >
          <div
            className="absolute bottom-0 left-0 right-0 flex flex-col gap-1 rounded-t-2xl border-t border-default bg-surface p-4"
            style={{ maxHeight: '60vh', overflowY: 'auto', boxShadow: 'var(--shadow-card)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted">
                {t('map.floorsTitle')}
              </p>
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(false)}
                className="flex h-6 w-6 items-center justify-center rounded text-muted hover:bg-hover focus:outline-none"
                aria-label={t('common.close')}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {floorsLoading && (
              <div className="flex items-center gap-2 px-2 py-1 text-xs text-muted">
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                ...
              </div>
            )}

            {floors?.map((floor) => {
              const isSelected = selectedFloorId === floor.id;
              const pct = Math.max(0, Math.min(100, floor.occupancy_pct ?? 0));
              return (
                <div
                  key={floor.id}
                  role="tab"
                  aria-selected={isSelected}
                  className={cn(
                    'group flex w-full flex-col gap-0.5 rounded-md px-2.5 py-2 transition-colors',
                    isSelected ? 'bg-active' : 'hover:bg-hover',
                  )}
                >
                  <div className="flex w-full items-center gap-1">
                    <button
                      type="button"
                      onClick={() => { handleSelectFloor(floor.id); setMobileSidebarOpen(false); }}
                      className={cn(
                        'min-w-0 flex-1 truncate text-left text-[13px] font-medium transition-colors',
                        isSelected ? 'text-[var(--brand-text)] font-semibold' : 'text-secondary',
                      )}
                    >
                      {floor.name || `${t('map.floorFallbackName')} ${floor.number}`}
                    </button>
                  </div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--bg-hover)]">
                      <span
                        role="progressbar"
                        aria-valuenow={pct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        className={cn(
                          'block h-full rounded-full transition-all',
                          pct > 70 ? 'bg-[var(--danger)]' : pct >= 50 ? 'bg-amber-500' : 'bg-emerald-500',
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="whitespace-nowrap font-mono text-[10px] text-muted">{pct}%</span>
                  </div>
                </div>
              );
            })}

            {isSuperadmin && (
              <button
                type="button"
                onClick={() => { onOpenCreateFloor(); setMobileSidebarOpen(false); }}
                className={cn(
                  'mt-1 flex w-full items-center gap-1.5 rounded-md px-2.5 py-1.5 text-left text-[12px] font-medium transition-colors',
                  editMode
                    ? 'text-[var(--brand-text)] hover:bg-active'
                    : 'text-muted hover:bg-hover hover:text-primary',
                )}
              >
                <Plus className="h-3 w-3" aria-hidden="true" />
                {t('map.addFloor')}
              </button>
            )}

            <div className="my-2 border-t border-default" />

            <p className="px-2 pb-2 text-[11px] font-medium uppercase tracking-wider text-muted">
              {t('map.legendTitle')}
            </p>
            {LEGEND_STATUS_KEYS.map((status) => (
              <div key={status} className="flex items-center gap-2 px-2 py-1 text-[12px] text-muted">
                <span
                  className={cn(
                    'block h-3.5 w-3.5 shrink-0 rounded-[3px] border',
                    LEGEND_ITEM_COLORS[status],
                    status === 'free' && 'border-emerald-600',
                    status === 'occupied' && 'border-rose-600',
                    status === 'soon_available' && 'border-amber-600',
                    status === 'none' && 'border-stone-600',
                  )}
                />
                <span>
                  {t(POINT_STATUS_LABEL_KEYS[status])}
                  {statusCounts ? ` (${statusCounts[status]})` : ''}
                </span>
              </div>
            ))}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
});

MapPageLayout.displayName = 'MapPageLayout';
