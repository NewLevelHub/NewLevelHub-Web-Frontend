import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { getApiError } from '@/shared/lib/getApiError';
import type { ServiceFloor, ServiceFloorCreatePayload } from '@/shared/types';

export interface MapCreateFloorModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (floor: ServiceFloor) => void;
}

export const MapCreateFloorModal = memo<MapCreateFloorModalProps>(({ open, onClose, onCreated }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [numberStr, setNumberStr] = useState('1');
  const [name, setName] = useState('');
  const [planFile, setPlanFile] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setNumberStr('1');
    setName('');
    setPlanFile(null);
    setFormError(null);
  }, [open]);

  const createMutation = useMutation({
    mutationFn: async (vars: {
      number: number;
      nameTrimmed: string;
      planFile: File | null;
    }): Promise<ServiceFloor> => {
      const { number: n, nameTrimmed, planFile: file } = vars;
      if (file) {
        const fd = new FormData();
        fd.append('number', String(n));
        fd.append('name', nameTrimmed);
        fd.append('plan_image', file);
        const { data } = await apiClient.post<ServiceFloor>(API.map.floors, fd);
        return data;
      }
      const body: ServiceFloorCreatePayload = { number: n, name: nameTrimmed };
      const { data } = await apiClient.post<ServiceFloor>(API.map.floors, body);
      return data;
    },
    onSuccess: (floor) => {
      void queryClient.invalidateQueries({ queryKey: ['map-floors'] });
      void queryClient.invalidateQueries({ queryKey: ['building-floors'] });
      onCreated(floor);
      onClose();
    },
    onError: (err: unknown) => {
      setFormError(getApiError(err).message);
    },
  });

  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !createMutation.isPending) onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const n = Number(numberStr);
    if (!Number.isInteger(n) || n < 1) {
      setFormError(t('map.floorNumberMin'));
      return;
    }
    createMutation.mutate({ number: n, nameTrimmed: name.trim(), planFile });
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-floor-title"
      onClick={handleBackdrop}
    >
      <div className="w-full max-w-md rounded-2xl bg-surface shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-4">
            <h2 id="create-floor-title" className="text-base font-semibold text-primary">
              Новый этаж
            </h2>
            <p className="text-sm text-muted">
              Глобальный этаж для карты здания. После создания он появится у всех пользователей в списке этажей.
            </p>

            <div>
              <label htmlFor="create-floor-number" className="mb-1 block text-sm font-medium text-gray-700">
                Номер этажа <span className="text-rose-600">*</span>
              </label>
              <input
                id="create-floor-number"
                type="number"
                min={1}
                step={1}
                required
                value={numberStr}
                onChange={(e) => setNumberStr(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-primary focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label htmlFor="create-floor-name" className="mb-1 block text-sm font-medium text-gray-700">
                Название <span className="font-normal text-muted">{t('common.optional')}</span>
              </label>
              <input
                id="create-floor-name"
                type="text"
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('map.floorNamePlaceholder')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-primary placeholder:text-secondary focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label htmlFor="create-floor-plan" className="mb-1 block text-sm font-medium text-gray-700">
                Схема этажа <span className="font-normal text-muted">{t('common.optional')}</span>
              </label>
              <input
                id="create-floor-plan"
                type="file"
                accept="image/*"
                onChange={(e) => setPlanFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary hover:file:bg-gray-200"
              />
            </div>

            {formError ? (
              <div
                className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
                role="alert"
              >
                {formError}
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-default px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={createMutation.isPending}
              className="rounded-lg border border-gray-300 bg-surface px-4 py-2 text-sm font-medium text-gray-700 hover:bg-raised focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 disabled:opacity-50 transition-colors"
            >{t('common.cancel')}</button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50 transition-colors"
            >
              {createMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
              Создать
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

MapCreateFloorModal.displayName = 'MapCreateFloorModal';
