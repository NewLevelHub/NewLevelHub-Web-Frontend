import { memo } from 'react';
import { Loader2 } from 'lucide-react';

import type { UseMapLogicReturn } from '@/pages/map/hooks/useMapLogic';

import { MapSearchBar } from '@/pages/map/components/MapSearchBar';
import { MapLegend } from '@/pages/map/components/MapLegend';
import { MapFloorTabs } from '@/pages/map/components/MapFloorTabs';
import { MapEditToolbar } from '@/pages/map/components/MapEditToolbar';
import { MapEditModeBanner } from '@/pages/map/components/MapEditModeBanner';
import { FloorMapView } from '@/pages/map/components/FloorMapView';
import { EditableFloorMapView } from '@/pages/map/components/EditableFloorMapView';
import { FloorMapWithImage } from '@/pages/map/components/FloorMapWithImage';
import { EditableFloorMapWithImage } from '@/pages/map/components/EditableFloorMapWithImage';
import { MapPointAddPanel } from '@/pages/map/components/MapPointAddPanel';
import { MapPointEditModal } from '@/pages/map/components/MapPointEditModal';
import { MapDeletePointDialog } from '@/pages/map/components/MapDeletePointDialog';
import { MapCreateFloorModal } from '@/pages/map/components/MapCreateFloorModal';

export type MapPageLayoutProps = UseMapLogicReturn;

export const MapPageLayout = memo<MapPageLayoutProps>((logic) => {
  const {
    searchRef,
    isSuperadmin,
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
    floorsError,
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
    resolvedImageUrl,
    highlightedPointId,
    ghostPin,
    handleMapClick,
    handleEditPoint,
    handleDeletePoint,
    handleMovePoint,
    handlePointClick,
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
  } = logic;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-primary">Карта здания</h1>
        <p className="text-sm text-muted">
          Интерактивная карта этажей. Нажмите на точку, чтобы открыть бронирование.
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
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
        <MapLegend statusCounts={statusCounts} />
      </div>

      <MapFloorTabs
        floors={floors}
        floorsLoading={floorsLoading}
        floorsError={floorsError}
        selectedFloorId={selectedFloorId}
        isSuperadmin={isSuperadmin}
        onSelectFloor={handleSelectFloor}
        onOpenCreateFloor={onOpenCreateFloor}
      />

      <div
        id="floor-map-panel"
        role="tabpanel"
        aria-labelledby={selectedFloorId ? `tab-floor-${selectedFloorId}` : undefined}
      >
        {mapLoading ? (
          <div
            className="flex min-h-64 items-center justify-center rounded-xl border border-default bg-gray-50"
            aria-live="polite"
          >
            <div className="flex flex-col items-center gap-3 text-secondary">
              <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
              <p className="text-sm">Загрузка карты...</p>
            </div>
          </div>
        ) : null}

        {mapError && !mapLoading ? (
          <div
            className="flex min-h-64 items-center justify-center rounded-xl border border-rose-200 bg-rose-50"
            role="alert"
          >
            <p className="text-sm text-rose-600">
              Не удалось загрузить карту этажа. Попробуйте выбрать другой этаж.
            </p>
          </div>
        ) : null}

        {floorMap && !mapLoading && !mapError ? (
          <div className="flex flex-col gap-3">
            <MapEditToolbar
              floorName={floorMap.floor_name}
              atTimeIso={floorMap.at_time}
              editMode={editMode}
              onToggleEditMode={() => setEditMode((prev) => !prev)}
              isSuperadmin={isSuperadmin}
            />

            {isSuperadmin && editMode ? <MapEditModeBanner movingPointId={movingPointId} /> : null}

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

              {addPanelOpen && isSuperadmin && editMode && selectedFloorId !== null ? (
                <MapPointAddPanel
                  form={addPanelForm}
                  floorId={selectedFloorId}
                  onFormChange={handleAddPanelFormChange}
                  onCancel={handleAddPanelCancel}
                  onSuccess={handleAddPanelSuccess}
                />
              ) : null}
            </div>

            {!editMode && floorMap.points.length > 0 ? (
              <p className="text-xs text-secondary">
                {floorMap.points.length}{' '}
                {floorMap.points.length === 1
                  ? 'точка'
                  : floorMap.points.length < 5
                    ? 'точки'
                    : 'точек'}{' '}
                на карте. Нажмите на точку, чтобы открыть бронирование.
              </p>
            ) : null}
          </div>
        ) : null}

        {!selectedFloorId && !floorsLoading ? (
          <div className="flex min-h-64 items-center justify-center rounded-xl border border-default bg-gray-50">
            <p className="text-sm text-secondary">Выберите этаж для просмотра карты</p>
          </div>
        ) : null}
      </div>

      {selectedFloorId !== null ? (
        <MapPointEditModal
          open={editModalOpen}
          initialData={editModalInitialData}
          floorId={selectedFloorId}
          editingPointId={editingPointId}
          onClose={handleCloseEditModal}
          onSuccess={handleEditModalSuccess}
        />
      ) : null}

      {selectedFloorId !== null ? (
        <MapDeletePointDialog
          open={deleteDialogOpen}
          point={deletingPoint}
          floorId={selectedFloorId}
          onClose={handleCloseDeleteDialog}
          onSuccess={handleDeleteSuccess}
        />
      ) : null}

      {isSuperadmin ? (
        <MapCreateFloorModal
          open={createFloorOpen}
          onClose={onCloseCreateFloor}
          onCreated={onFloorCreated}
        />
      ) : null}
    </div>
  );
});

MapPageLayout.displayName = 'MapPageLayout';
