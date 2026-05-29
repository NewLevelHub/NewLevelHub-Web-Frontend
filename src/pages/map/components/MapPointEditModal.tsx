import { memo, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Loader2 } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { cn } from '@/shared/lib/cn';
import { getApiError } from '@/shared/lib/getApiError';
import type {
  BookingResourceListItem,
  MapPointType,
  MapPointUpdatePayload,
  PaginatedResponse,
} from '@/shared/types';

import { POINT_TYPES, POINT_TYPE_LABEL_KEYS } from '@/pages/map/constants/mapConstants';
import type { MapPointFormState } from '@/pages/map/types/mapPage.types';

export interface MapPointEditModalProps {
  open: boolean;
  initialData: MapPointFormState;
  floorId: number;
  editingPointId: number | null;
  onClose: () => void;
  onSuccess: () => void;
}

function requiresResource(t: MapPointType) {
  return t === 'desk' || t === 'meeting_room' || t === 'parking' || t === 'capsule';
}

export const MapPointEditModal = memo<MapPointEditModalProps>(
  ({ open, initialData, floorId, editingPointId, onClose, onSuccess }) => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [form, setForm] = useState<MapPointFormState>(initialData);
    const [formError, setFormError] = useState<string | null>(null);

    useEffect(() => {
      setForm(initialData);
      setFormError(null);
    }, [initialData, open]);

    const { data: resourcesData, isLoading: resourcesLoading } = useQuery({
      queryKey: ['booking-resources-list'],
      queryFn: () =>
        apiClient
          .get<PaginatedResponse<BookingResourceListItem>>(API.bookings.resources.list)
          .then((r) => r.data),
      enabled: open && requiresResource(form.point_type),
      staleTime: 60_000,
    });

    const updateMutation = useMutation({
      mutationFn: ({ id, payload }: { id: number; payload: MapPointUpdatePayload }) =>
        apiClient.patch(API.map.mapPoints.detail(id), payload).then((r) => r.data),
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: ['floor-map', floorId] });
        onSuccess();
      },
      onError: (err: unknown) => {
        setFormError(getApiError(err).message);
      },
    });

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setForm((prev) => ({ ...prev, [name]: value }));
      setFormError(null);
    }, []);

    const handleResourceChange = useCallback(
      (e: React.ChangeEvent<HTMLSelectElement>) => {
        const resourceId = e.target.value;
        const selectedResource = resourcesData?.results.find((r) => String(r.id) === resourceId);
        setForm((prev) => ({
          ...prev,
          resource: resourceId,
          ...(selectedResource
            ? { point_type: selectedResource.type as MapPointType, label: selectedResource.name }
            : {}),
        }));
        setFormError(null);
      },
      [resourcesData],
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
          setFormError('ID ресурса обязателен для данного типа точки');
          return;
        }
        if (form.point_type === 'office' && !form.company.trim()) {
          setFormError('ID компании обязателен для офисной точки');
          return;
        }

        if (editingPointId === null) return;

        const payload: MapPointUpdatePayload = {
          point_type: form.point_type,
          label: form.label.trim(),
          x: xNum,
          y: yNum,
          resource: form.resource.trim() ? parseInt(form.resource, 10) : null,
          company: form.company.trim() ? parseInt(form.company, 10) : null,
        };

        updateMutation.mutate({ id: editingPointId, payload });
      },
      [form, editingPointId, updateMutation],
    );

    if (!open) return null;

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="map-point-edit-modal-title"
      >
        <div className="w-full max-w-md rounded-2xl bg-surface shadow-2xl">
          <div className="flex items-center justify-between border-b border-default px-6 py-4">
            <h2 id="map-point-edit-modal-title" className="text-base font-semibold text-primary">
              Редактировать точку
            </h2>
            <button
              type="button"
              aria-label={t('common.close')}
              className="rounded-lg p-1.5 text-secondary hover:bg-gray-100 hover:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors"
              onClick={onClose}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="flex flex-col gap-4 px-6 py-5">
              {formError ? (
                <div
                  className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
                  role="alert"
                >
                  {formError}
                </div>
              ) : null}

              <div className="flex flex-col gap-1">
                <label htmlFor="ep-point_type" className="text-sm font-medium text-gray-700">
                  Тип точки
                </label>
                <select
                  id="ep-point_type"
                  name="point_type"
                  value={form.point_type}
                  disabled
                  aria-disabled="true"
                  title="Тип точки определяется типом выбранного ресурса"
                  className="cursor-not-allowed rounded-lg border border-default bg-gray-100 px-3 py-2 text-sm text-muted outline-none"
                >
                  {POINT_TYPES.map((pointType) => (
                    <option key={pointType} value={pointType}>
                      {t(POINT_TYPE_LABEL_KEYS[pointType])}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted">Меняется при смене ресурса: тип берётся из ресурса.</p>
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="ep-label" className="text-sm font-medium text-gray-700">
                  Метка <span className="text-rose-500">*</span>
                </label>
                <input
                  id="ep-label"
                  type="text"
                  name="label"
                  value={form.label}
                  onChange={handleChange}
                  required
                  placeholder="Desk A1"
                  className="rounded-lg border border-gray-300 bg-surface px-3 py-2 text-sm text-primary outline-none placeholder:text-secondary focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20/20 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label htmlFor="ep-x" className="text-sm font-medium text-gray-700">
                    X (0–100) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="ep-x"
                    type="number"
                    name="x"
                    value={form.x}
                    onChange={handleChange}
                    required
                    min={0}
                    max={100}
                    step="any"
                    placeholder="45.5"
                    className="rounded-lg border border-gray-300 bg-surface px-3 py-2 text-sm text-primary outline-none placeholder:text-secondary focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20/20 transition"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="ep-y" className="text-sm font-medium text-gray-700">
                    Y (0–100) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="ep-y"
                    type="number"
                    name="y"
                    value={form.y}
                    onChange={handleChange}
                    required
                    min={0}
                    max={100}
                    step="any"
                    placeholder="30.2"
                    className="rounded-lg border border-gray-300 bg-surface px-3 py-2 text-sm text-primary outline-none placeholder:text-secondary focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20/20 transition"
                  />
                </div>
              </div>

              {requiresResource(form.point_type) ? (
                <div className="flex flex-col gap-1">
                  <label htmlFor="ep-resource" className="text-sm font-medium text-gray-700">
                    Ресурс <span className="text-rose-500">*</span>
                  </label>
                  {resourcesLoading ? (
                    <div className="flex items-center gap-2 rounded-lg border border-default bg-gray-50 px-3 py-2 text-sm text-muted">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      Загрузка ресурсов...
                    </div>
                  ) : (
                    <select
                      id="ep-resource"
                      name="resource"
                      value={form.resource}
                      onChange={handleResourceChange}
                      required
                      className={cn(
                        'rounded-lg border border-gray-300 bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20/20 transition',
                        !form.resource && 'text-secondary',
                      )}
                    >
                      <option value="">— Выберите ресурс —</option>
                      {resourcesData?.results.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} (ID: {r.id})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ) : null}

              {form.point_type === 'office' ? (
                <div className="flex flex-col gap-1">
                  <label htmlFor="ep-company" className="text-sm font-medium text-gray-700">
                    ID компании <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="ep-company"
                    type="number"
                    name="company"
                    value={form.company}
                    onChange={handleChange}
                    required
                    min={1}
                    placeholder="3"
                    className="rounded-lg border border-gray-300 bg-surface px-3 py-2 text-sm text-primary outline-none placeholder:text-secondary focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20/20 transition"
                  />
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-default px-6 py-4">
              <button
                type="button"
                onClick={onClose}
                disabled={updateMutation.isPending}
                className="rounded-lg border border-gray-300 bg-surface px-4 py-2 text-sm font-medium text-gray-700 hover:bg-raised focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50 transition-colors"
              >{t('common.cancel')}</button>
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50 transition-colors"
              >
                {updateMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : null}
                Сохранить
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  },
);

MapPointEditModal.displayName = 'MapPointEditModal';
