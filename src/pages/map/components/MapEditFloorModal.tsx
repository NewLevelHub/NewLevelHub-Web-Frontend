import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, X } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { getApiError } from '@/shared/lib/getApiError';
import type { ServiceFloor } from '@/shared/types';

export interface MapEditFloorModalProps {
  open: boolean;
  floor: ServiceFloor | null;
  onClose: () => void;
  onUpdated: (floor: ServiceFloor) => void;
}

export const MapEditFloorModal = memo<MapEditFloorModalProps>(({ open, floor, onClose, onUpdated }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [numberStr, setNumberStr] = useState('');
  const [name, setName] = useState('');
  const [planFile, setPlanFile] = useState<File | null>(null);
  const [imageClearedByUser, setImageClearedByUser] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const originalImageUrl = floor ? (floor.plan_image_url ?? floor.plan_image ?? null) : null;
  const currentPreviewUrl = imageClearedByUser ? null : originalImageUrl;

  const handleClearImage = () => {
    setImageClearedByUser(true);
    setPlanFile(null);
  };

  useEffect(() => {
    if (!open || !floor) return;
    setNumberStr(String(floor.number));
    setName(floor.name ?? '');
    setPlanFile(null);
    setImageClearedByUser(false);
    setFormError(null);
  }, [open, floor]);

  const updateMutation = useMutation({
    mutationFn: async (vars: {
      id: number;
      number: number;
      name: string;
      planFile: File | null;
      clearImage: boolean;
    }): Promise<ServiceFloor> => {
      if (vars.planFile) {
        const fd = new FormData();
        fd.append('number', String(vars.number));
        fd.append('name', vars.name);
        fd.append('plan_image', vars.planFile);
        const { data } = await apiClient.patch<ServiceFloor>(API.map.floor(vars.id), fd);
        return data;
      }
      if (vars.clearImage) {
        const fd = new FormData();
        fd.append('number', String(vars.number));
        fd.append('name', vars.name);
        fd.append('plan_image', '');
        const { data } = await apiClient.patch<ServiceFloor>(API.map.floor(vars.id), fd);
        return data;
      }
      const { data } = await apiClient.patch<ServiceFloor>(API.map.floor(vars.id), {
        number: vars.number,
        name: vars.name,
      });
      return data;
    },
    onSuccess: (updatedFloor) => {
      void queryClient.invalidateQueries({ queryKey: ['map-floors'] });
      void queryClient.invalidateQueries({ queryKey: ['building-floors'] });
      onUpdated(updatedFloor);
      onClose();
    },
    onError: (err: unknown) => {
      setFormError(getApiError(err).message);
    },
  });

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !updateMutation.isPending) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose, updateMutation.isPending]);

  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !updateMutation.isPending) onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!floor) return;
    setFormError(null);
    const n = Number(numberStr);
    if (!Number.isInteger(n) || n < 1) {
      setFormError(t('map.floorNumberMin'));
      return;
    }
    updateMutation.mutate({
      id: floor.id,
      number: n,
      name: name.trim(),
      planFile,
      clearImage: imageClearedByUser,
    });
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-floor-title"
      onClick={handleBackdrop}
    >
      <div className="w-full max-w-md rounded-2xl bg-surface shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-4">
            <h2 id="edit-floor-title" className="text-base font-semibold text-primary">
              {t('map.editFloor')}
            </h2>
            <p className="text-sm text-muted">{t('map.editFloorHint')}</p>

            {/* Floor number */}
            <div>
              <label htmlFor="edit-floor-number" className="mb-1 block text-sm font-medium text-gray-700">
                {t('map.floorNumber')} <span className="text-rose-600">*</span>
              </label>
              <input
                id="edit-floor-number"
                type="number"
                min={1}
                step={1}
                required
                value={numberStr}
                onChange={(e) => setNumberStr(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-primary focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
              />
            </div>

            {/* Floor name */}
            <div>
              <label htmlFor="edit-floor-name" className="mb-1 block text-sm font-medium text-gray-700">
                {t('map.floorNameLabel')}{' '}
                <span className="ml-1 font-normal text-muted">{t('common.optional')}</span>
              </label>
              <input
                id="edit-floor-name"
                type="text"
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('map.floorNamePlaceholder')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-primary placeholder:text-secondary focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
              />
            </div>

            {/* Current plan preview — show when there is a url and no new file selected */}
            {currentPreviewUrl && !planFile && (
              <div>
                <p className="mb-1 text-sm font-medium text-gray-700">{t('map.floorPlanLabel')}</p>
                <div className="flex items-center gap-3 rounded-lg border border-default bg-raised px-3 py-2.5">
                  <img
                    src={currentPreviewUrl}
                    alt={t('map.currentPlan')}
                    className="h-20 w-20 shrink-0 rounded-md object-cover border border-default"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-secondary truncate">{t('map.currentPlan')}</p>
                    <p className="mt-0.5 text-xs text-muted">{t('map.replacePlanHint')}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearImage}
                    aria-label={t('map.removePlan')}
                    className="shrink-0 rounded p-1 text-muted hover:bg-rose-100 hover:text-[var(--danger)] focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 transition-colors duration-150"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}

            {/* File input — show when image cleared or no original */}
            {(!currentPreviewUrl || imageClearedByUser) && (
              <div>
                <label htmlFor="edit-floor-plan" className="mb-1 block text-sm font-medium text-gray-700">
                  {t('map.floorPlanLabel')}{' '}
                  <span className="ml-1 font-normal text-muted">{t('common.optional')}</span>
                </label>
                <input
                  id="edit-floor-plan"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPlanFile(e.target.files?.[0] ?? null)}
                  className="w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary hover:file:bg-gray-200"
                />
              </div>
            )}

            {/* Replace plan input — show when preview exists, not cleared, and no new file yet */}
            {currentPreviewUrl && !imageClearedByUser && !planFile && (
              <div>
                <label htmlFor="edit-floor-plan-replace" className="mb-1 block text-sm font-medium text-gray-700">
                  {t('map.replacePlan')}{' '}
                  <span className="ml-1 font-normal text-muted">{t('common.optional')}</span>
                </label>
                <input
                  id="edit-floor-plan-replace"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPlanFile(e.target.files?.[0] ?? null)}
                  className="w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary hover:file:bg-gray-200"
                />
              </div>
            )}

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
              disabled={updateMutation.isPending}
              className="rounded-lg border border-gray-300 bg-surface px-4 py-2 text-sm font-medium text-gray-700 hover:bg-raised focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 disabled:opacity-50 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-[var(--brand-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] disabled:opacity-50 transition-colors"
            >
              {updateMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : null}
              {t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

MapEditFloorModal.displayName = 'MapEditFloorModal';
