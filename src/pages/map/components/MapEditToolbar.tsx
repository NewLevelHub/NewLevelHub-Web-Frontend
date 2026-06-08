import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { ToggleLeft, ToggleRight } from 'lucide-react';

import { cn } from '@/shared/lib/cn';
import { fmtTime } from '@/shared/lib/formatDate';

export interface MapEditToolbarProps {
  floorName: string;
  atTimeIso: string;
  editMode: boolean;
  onToggleEditMode: () => void;
  isSuperadmin: boolean;
}

export const MapEditToolbar = memo<MapEditToolbarProps>(
  ({ floorName, atTimeIso, editMode, onToggleEditMode, isSuperadmin }) => {
    const { t } = useTranslation();
    return (
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-primary">{floorName}</h2>
        <div className="flex items-center gap-3">
          {isSuperadmin ? (
            <button
              type="button"
              onClick={onToggleEditMode}
              className={cn(
                'flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
                editMode
                  ? 'border-blue-500 bg-indigo-50 text-indigo-700'
                  : 'border-default bg-surface text-muted hover:border-gray-300 hover:bg-raised',
              )}
              aria-pressed={editMode}
              aria-label={editMode ? t('map.toolbar.disableEditMode') : t('map.toolbar.enableEditMode')}
            >
              {editMode ? (
                <ToggleRight className="h-4 w-4" aria-hidden="true" />
              ) : (
                <ToggleLeft className="h-4 w-4" aria-hidden="true" />
              )}
              {t('map.editMode')}
            </button>
          ) : null}

          {!editMode ? (
            <p className="text-xs text-secondary">
              {t('map.updatedAt')}{' '}
              {fmtTime(atTimeIso)}
            </p>
          ) : null}
        </div>
      </div>
    );
  },
);

MapEditToolbar.displayName = 'MapEditToolbar';
