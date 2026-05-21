import { memo, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { getApiErrorMessage } from '@/shared/lib/apiError';
import type { ServiceFloor } from '@/shared/types';

import { formatFloorTabLabel } from '@/pages/map/utils/formatFloorTabLabel';

export interface MapDeleteFloorDialogProps {
  open: boolean;
  floor: ServiceFloor | null;
  onClose: () => void;
  onSuccess: (deletedFloorId: number) => void;
}

export const MapDeleteFloorDialog = memo<MapDeleteFloorDialogProps>(
  ({ open, floor, onClose, onSuccess }) => {
    const queryClient = useQueryClient();
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const deleteMutation = useMutation({
      mutationFn: (id: number) => apiClient.delete(API.map.floor(id)).then((r) => r.data),
      onSuccess: (_, id) => {
        void queryClient.invalidateQueries({ queryKey: ['map-floors'] });
        void queryClient.invalidateQueries({ queryKey: ['booking-resources'] });
        onSuccess(id);
      },
      onError: (err: unknown) => {
        setDeleteError(getApiErrorMessage(err, 'Не удалось удалить этаж'));
      },
    });

    useEffect(() => {
      if (!open) setDeleteError(null);
    }, [open]);

    if (!open || !floor) return null;

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-floor-title"
      >
        <div className="w-full max-w-sm rounded-2xl bg-surface shadow-2xl">
          <div className="px-6 py-5">
            <h2 id="delete-floor-title" className="text-base font-semibold text-primary">
              Удалить этаж?
            </h2>
            <p className="mt-2 text-sm text-muted">
              Этаж <span className="font-medium text-gray-700">«{formatFloorTabLabel(floor)}»</span> будет безвозвратно
              удалён вместе со всеми точками на карте и связанными ресурсами каталога.
            </p>

            {deleteError ? (
              <div
                className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
                role="alert"
              >
                {deleteError}
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-default px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={deleteMutation.isPending}
              className="rounded-lg border border-gray-300 bg-surface px-4 py-2 text-sm font-medium text-gray-700 hover:bg-raised focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 disabled:opacity-50 transition-colors"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={() => floor && deleteMutation.mutate(floor.id)}
              disabled={deleteMutation.isPending}
              className="flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:opacity-50 transition-colors"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : null}
              Удалить
            </button>
          </div>
        </div>
      </div>
    );
  },
);

MapDeleteFloorDialog.displayName = 'MapDeleteFloorDialog';
