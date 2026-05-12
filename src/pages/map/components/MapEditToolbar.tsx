import { memo } from 'react';
import { ToggleLeft, ToggleRight } from 'lucide-react';

import { cn } from '@/shared/lib/cn';

export interface MapEditToolbarProps {
  floorName: string;
  atTimeIso: string;
  editMode: boolean;
  onToggleEditMode: () => void;
  isSuperadmin: boolean;
}

export const MapEditToolbar = memo<MapEditToolbarProps>(
  ({ floorName, atTimeIso, editMode, onToggleEditMode, isSuperadmin }) => {
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
              aria-label={editMode ? 'Выключить режим редактирования' : 'Включить режим редактирования'}
            >
              {editMode ? (
                <ToggleRight className="h-4 w-4" aria-hidden="true" />
              ) : (
                <ToggleLeft className="h-4 w-4" aria-hidden="true" />
              )}
              Режим редактирования
            </button>
          ) : null}

          {!editMode ? (
            <p className="text-xs text-secondary">
              Актуально на{' '}
              {new Date(atTimeIso).toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          ) : null}
        </div>
      </div>
    );
  },
);

MapEditToolbar.displayName = 'MapEditToolbar';
