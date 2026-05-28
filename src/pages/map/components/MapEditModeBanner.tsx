import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Move, Pencil } from 'lucide-react';

import { cn } from '@/shared/lib/cn';

export interface MapEditModeBannerProps {
  movingPointId: number | null;
}

export const MapEditModeBanner = memo<MapEditModeBannerProps>(({ movingPointId }) => {
  return (
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
          Режим редактирования активен. Нажмите на карту, чтобы разместить новую точку. Наведите на точку для
          редактирования, перемещения или удаления.
        </>
      )}
    </div>
  );
});

MapEditModeBanner.displayName = 'MapEditModeBanner';
