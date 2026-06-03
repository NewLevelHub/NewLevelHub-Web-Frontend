import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Plus, Trash2 } from 'lucide-react';

import { cn } from '@/shared/lib/cn';
import type { ServiceFloor } from '@/shared/types';

import { formatFloorTabLabel } from '@/pages/map/utils/formatFloorTabLabel';

export interface MapFloorTabsProps {
  floors: ServiceFloor[] | undefined;
  floorsLoading: boolean;
  floorsError: boolean;
  selectedFloorId: number | null;
  isSuperadmin: boolean;
  editMode: boolean;
  onSelectFloor: (floorId: number) => void;
  onOpenCreateFloor: () => void;
  onDeleteFloor: (floor: ServiceFloor) => void;
}

export const MapFloorTabs = memo<MapFloorTabsProps>(
  ({
    floors,
    floorsLoading,
    floorsError,
    selectedFloorId,
    isSuperadmin,
    editMode,
    onSelectFloor,
    onOpenCreateFloor,
    onDeleteFloor,
  }) => {
  const { t } = useTranslation();
    return (
      <>
        {floorsLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted" aria-live="polite">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            {t('map.floorsLoading')}
          </div>
        ) : null}
        {floorsError ? (
          <div
            className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
            role="alert"
          >
            {t('map.floorsLoadError')}
          </div>
        ) : null}
        {floors && floors.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <div
              className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1"
              role="tablist"
              aria-label={t('map.floorsAria')}
            >
              {floors.map((floor) => (
                <div key={floor.id} className="relative shrink-0 flex items-center">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={selectedFloorId === floor.id}
                    aria-controls="floor-map-panel"
                    id={`tab-floor-${floor.id}`}
                    onClick={() => onSelectFloor(floor.id)}
                    className={cn(
                      'flex flex-col items-start rounded-lg border px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
                      isSuperadmin && editMode ? 'pr-8' : '',
                      selectedFloorId === floor.id
                        ? 'border-blue-500 bg-indigo-50 text-indigo-700'
                        : 'border-default bg-surface text-gray-700 hover:border-gray-300 hover:bg-raised',
                    )}
                  >
                    <span>{formatFloorTabLabel(floor)}</span>
                    {(() => {
                      const pct = Math.max(0, Math.min(100, floor.occupancy_pct ?? 0));
                      return (
                        <span className="mt-1.5 flex w-full items-center gap-1.5">
                          <span className="h-1.5 w-20 shrink-0 overflow-hidden rounded-full bg-raised">
                            <span
                              className={cn(
                                'block h-full rounded-full transition-all',
                                pct > 70
                                  ? 'bg-danger'
                                  : pct >= 50
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500',
                              )}
                              style={{ width: `${pct}%` }}
                              role="progressbar"
                              aria-valuenow={pct}
                              aria-valuemin={0}
                              aria-valuemax={100}
                            />
                          </span>
                          <span className="font-mono text-xs font-normal opacity-70">
                            {pct}%
                          </span>
                        </span>
                      );
                    })()}
                  </button>
                  {isSuperadmin && editMode ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteFloor(floor);
                      }}
                      aria-label={t('map.deleteFloor', { name: formatFloorTabLabel(floor) })}
                      className="absolute right-1.5 flex h-5 w-5 items-center justify-center rounded text-gray-400 hover:bg-rose-100 hover:text-rose-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 transition-colors"
                    >
                      <Trash2 className="h-3 w-3" aria-hidden="true" />
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
            {isSuperadmin ? (
              <button
                type="button"
                onClick={onOpenCreateFloor}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                {t('map.addFloor')}
              </button>
            ) : null}
          </div>
        ) : null}
        {floors && floors.length === 0 && !floorsLoading ? (
          <div
            className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
            role="alert"
          >
            <p>{t('map.floorsNotFound')}</p>
            {isSuperadmin ? (
              <button
                type="button"
                onClick={onOpenCreateFloor}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                {t('map.createFloor')}
              </button>
            ) : (
              <p className="mt-2 text-amber-700">{t('map.floorsContactAdmin')}</p>
            )}
          </div>
        ) : null}
      </>
    );
  },
);

MapFloorTabs.displayName = 'MapFloorTabs';
