import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Loader2 } from 'lucide-react';
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

const inputClass =
  'rounded-[var(--radius-sm)] border border-default bg-surface px-3 py-2 text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)] transition w-full';

const disabledSelectClass =
  'rounded-[var(--radius-sm)] border border-default bg-raised px-3 py-2 text-sm text-secondary w-full cursor-not-allowed opacity-60';

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
          setFormError(t('map.addPanel.errorX'));
          return;
        }
        if (isNaN(yNum) || yNum < 0 || yNum > 100) {
          setFormError(t('map.addPanel.errorY'));
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
          setFormError(t('map.addPanel.errorCompany'));
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
      [form, floorId, createMutation, t],
    );

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onCancel();
        }}
        role="dialog"
        aria-modal="true"
        aria-label={t('map.addPoint')}
      >
        <div className="relative w-full max-w-[480px] rounded-2xl border border-default bg-surface shadow-xl overflow-y-auto max-h-[90vh]">
          <form onSubmit={handleSubmit} noValidate>
            {/* Header */}
            <div className="flex items-start justify-between px-[22px] pt-[18px] pb-[14px]">
              <div className="min-w-0 pr-4">
                <h2 className="text-base font-semibold text-primary tracking-[-0.015em]">
                  {t('map.addPanel.title')}
                </h2>
                <p className="text-xs text-muted mt-0.5">{t('map.clickToPlace')}</p>
              </div>
              <button
                type="button"
                onClick={onCancel}
                aria-label={t('common.close')}
                className="shrink-0 flex items-center justify-center w-7 h-7 rounded-lg text-secondary hover:bg-raised hover:text-primary focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)] transition-colors"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {/* Error banner */}
            {formError ? (
              <div
                className="mx-[22px] mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                role="alert"
              >
                {formError}
              </div>
            ) : null}

            {/* Form body */}
            <div className="px-[22px] pb-0 space-y-3">
              {/* X / Y coordinates row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label htmlFor="ap-x" className="text-xs font-medium text-secondary">
                    {t('map.addPanel.xLabel')}
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
                    className={inputClass}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="ap-y" className="text-xs font-medium text-secondary">
                    {t('map.addPanel.yLabel')}
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
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Resource */}
              <div className="flex flex-col gap-1">
                <label htmlFor="ap-resource" className="text-xs font-medium text-secondary">
                  {t('map.addPanel.resourceLabel')}{' '}
                  {requiresResource(form.point_type) ? <span className="text-danger">*</span> : null}
                </label>
                {resourcesLoading ? (
                  <div className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-default bg-surface px-3 py-2 text-sm text-secondary">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    {t('common.loading')}
                  </div>
                ) : (
                  <select
                    id="ap-resource"
                    name="resource"
                    value={form.resource}
                    onChange={handleResourceChangeWithAutoLabel}
                    className={inputClass}
                  >
                    <option value="">{t('map.addPanel.selectDefault')}</option>
                    {resourcesData?.results.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Label */}
              <div className="flex flex-col gap-1">
                <label htmlFor="ap-label" className="text-xs font-medium text-secondary">
                  {t('map.addPanel.labelField')} <span className="text-danger">*</span>
                </label>
                <input
                  id="ap-label"
                  type="text"
                  name="label"
                  value={form.label}
                  onChange={handleInputChange}
                  required
                  placeholder="Desk A1"
                  className={inputClass}
                />
              </div>

              {/* Point type (disabled) */}
              <div className="flex flex-col gap-1">
                <label htmlFor="ap-point_type" className="text-xs font-medium text-secondary">
                  {t('map.addPanel.pointTypeLabel')}
                </label>
                <select
                  id="ap-point_type"
                  name="point_type"
                  value={form.point_type}
                  disabled
                  aria-disabled="true"
                  title={t('map.addPanel.resourceSelectHint')}
                  className={disabledSelectClass}
                >
                  {POINT_TYPES.map((pointType) => (
                    <option key={pointType} value={pointType}>
                      {t(POINT_TYPE_LABEL_KEYS[pointType])}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] leading-snug text-muted">
                  {t('map.addPanel.typeHint')}
                </p>
              </div>

              {/* Company ID (office type only) */}
              {form.point_type === 'office' ? (
                <div className="flex flex-col gap-1">
                  <label htmlFor="ap-company" className="text-xs font-medium text-secondary">
                    {t('map.addPanel.companyIdLabel')} <span className="text-danger">*</span>
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
                    className={inputClass}
                  />
                </div>
              ) : null}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 border-t border-[color:var(--border-faint)] px-[22px] pt-[14px] pb-[18px] mt-3">
              <button
                type="button"
                onClick={onCancel}
                disabled={createMutation.isPending}
                className="h-8 px-4 text-sm font-medium text-secondary hover:bg-raised rounded-[var(--radius-sm)] transition-colors disabled:opacity-50"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="inline-flex items-center gap-1.5 h-8 px-4 text-sm font-medium rounded-[var(--radius-sm)] text-white bg-[color:var(--brand)] hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {createMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : null}
                {t('map.addPanel.createBtn')}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  },
);

MapPointAddPanel.displayName = 'MapPointAddPanel';
