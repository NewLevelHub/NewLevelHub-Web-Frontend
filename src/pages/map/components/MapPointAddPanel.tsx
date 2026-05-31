import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, X, Loader2 } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { getApiError } from '@/shared/lib/getApiError';
import type {
  BookingResourceListItem,
  MapPointCreatePayload,
  MapPointType,
  PaginatedResponse,
} from '@/shared/types';

import { POINT_TYPES, POINT_TYPE_LABEL_KEYS } from '@/pages/map/constants/mapConstants';
import type { MapPointFormState } from '@/pages/map/types/mapPage.types';

export interface MapPointAddPanelProps {
  form: MapPointFormState;
  floorId: number;
  onFormChange: (updates: Partial<MapPointFormState>) => void;
  onCancel: () => void;
  onSuccess: () => void;
}

function requiresResource(t: MapPointType) {
  return t === 'desk' || t === 'meeting_room' || t === 'parking' || t === 'capsule';
}

export const MapPointAddPanel = memo<MapPointAddPanelProps>(
  ({ form, floorId, onFormChange, onCancel, onSuccess }) => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [formError, setFormError] = useState<string | null>(null);

    const { data: resourcesData, isLoading: resourcesLoading } = useQuery({
      queryKey: ['booking-resources-list', floorId],
      queryFn: () =>
        apiClient
          .get<PaginatedResponse<BookingResourceListItem>>(API.bookings.resources.list, {
            params: { floor_id: floorId, page_size: 200 },
          })
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
        setFormError(getApiError(err).message);
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
        const selectedResource = resourcesData?.results.find((r) => String(r.id) === resourceId);
        const updates: Partial<MapPointFormState> = {
          resource: resourceId,
        };
        if (selectedResource) {
          updates.point_type = selectedResource.type as MapPointType;
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
          setFormError(t('common.markRequired'));
          return;
        }
        if (requiresResource(form.point_type) && !form.resource.trim()) {
          setFormError(t('map.selectResource'));
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
          width: form.width ? parseFloat(form.width) : undefined,
          height: form.height ? parseFloat(form.height) : undefined,
          resource: form.resource.trim() ? parseInt(form.resource, 10) : null,
          company: form.company.trim() ? parseInt(form.company, 10) : null,
        };

        createMutation.mutate(payload);
      },
      [form, floorId, createMutation],
    );

    const handlePanelClick = useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
    }, []);

    return (
      <div
        className="absolute bottom-0 left-0 right-0 z-30 rounded-b-xl bg-raised border-t-2 border-blue-500 shadow-2xl"
        onClick={handlePanelClick}
        role="dialog"
        aria-modal="false"
        aria-label={t('map.addPoint')}
      >
        <form onSubmit={handleSubmit} noValidate>
          <div className="px-4 pt-3 pb-1 flex items-center justify-between">
            <span className="text-sm font-semibold text-primary flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
              Новая точка
            </span>
            <button
              type="button"
              aria-label={t('common.cancel')}
              onClick={onCancel}
              className="rounded p-1 text-secondary hover:text-primary hover:bg-hover transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {formError ? (
            <div
              className="mx-4 mb-2 rounded-lg border border-rose-700 bg-rose-900/60 px-3 py-2 text-xs text-rose-300"
              role="alert"
            >
              {formError}
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-x-3 gap-y-2 px-4 pb-2 sm:grid-cols-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="ap-x" className="text-xs font-medium text-secondary">
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
                className="rounded-md border border-default bg-hover px-2 py-1.5 text-sm text-primary outline-none placeholder:text-muted focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/40 transition [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="ap-y" className="text-xs font-medium text-secondary">
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
                className="rounded-md border border-default bg-hover px-2 py-1.5 text-sm text-primary outline-none placeholder:text-muted focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/40 transition [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="ap-resource" className="text-xs font-medium text-secondary">
                Ресурс {requiresResource(form.point_type) ? <span className="text-danger">*</span> : null}
              </label>
              {resourcesLoading ? (
                <div className="flex items-center gap-1.5 rounded-md border border-default bg-hover px-2 py-1.5 text-xs text-secondary">
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />{t('common.loading')}</div>
              ) : (
                <select
                  id="ap-resource"
                  name="resource"
                  value={form.resource}
                  onChange={handleResourceChangeWithAutoLabel}
                  className="rounded-md border border-default bg-hover px-2 py-1.5 text-sm text-primary outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/40 transition"
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

            <div className="flex flex-col gap-1">
              <label htmlFor="ap-label" className="text-xs font-medium text-secondary">
                Метка <span className="text-danger">*</span>
              </label>
              <input
                id="ap-label"
                type="text"
                name="label"
                value={form.label}
                onChange={handleInputChange}
                required
                placeholder="Desk A1"
                className="rounded-md border border-default bg-hover px-2 py-1.5 text-sm text-primary outline-none placeholder:text-muted focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/40 transition"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="ap-point_type" className="text-xs font-medium text-secondary">
                Тип точки
              </label>
              <select
                id="ap-point_type"
                name="point_type"
                value={form.point_type}
                disabled
                aria-disabled="true"
                title="Выберите ресурс — тип точки возьмётся из ресурса"
                className="cursor-not-allowed rounded-md border border-default bg-gray-600/40 px-2 py-1.5 text-sm text-secondary outline-none"
              >
                {POINT_TYPES.map((pointType) => (
                  <option key={pointType} value={pointType}>
                    {t(POINT_TYPE_LABEL_KEYS[pointType])}
                  </option>
                ))}
              </select>
              <p className="text-[11px] leading-snug text-muted">
                Меняется при выборе ресурса (тип берётся из ресурса).
              </p>
            </div>

            {form.point_type === 'office' ? (
              <div className="flex flex-col gap-1">
                <label htmlFor="ap-company" className="text-xs font-medium text-secondary">
                  ID компании <span className="text-danger">*</span>
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
                  className="rounded-md border border-default bg-hover px-2 py-1.5 text-sm text-primary outline-none placeholder:text-muted focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/40 transition [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-default px-4 py-2.5">
            <button
              type="button"
              onClick={onCancel}
              disabled={createMutation.isPending}
              className="rounded-lg border border-default bg-transparent px-3 py-1.5 text-xs font-medium text-secondary hover:bg-hover hover:text-primary focus:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400 disabled:opacity-50 transition-colors"
            >{t('common.cancel')}</button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-hover focus:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400 disabled:opacity-50 transition-colors"
            >
              {createMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> : null}
              Создать точку
            </button>
          </div>
        </form>
      </div>
    );
  },
);

MapPointAddPanel.displayName = 'MapPointAddPanel';
