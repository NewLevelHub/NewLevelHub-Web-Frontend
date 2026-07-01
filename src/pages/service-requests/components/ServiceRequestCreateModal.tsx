import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, X } from 'lucide-react';

import { cn } from '@/shared/lib/cn';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import {
  SERVICE_REQUEST_TYPES,
  type ServiceRequestType,
} from '@/shared/config/constants';
import { getApiError } from '@/shared/lib/getApiError';
import type { BookingResourceListItem, PaginatedResponse, ServiceFloor, ServiceRequest } from '@/shared/types';
import { getTypeConfig } from '@/pages/service-requests/components/ServiceRequestBadges';
import { Button } from '@/shared/ui/Button';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const TYPE_LIST: ServiceRequestType[] = [
  SERVICE_REQUEST_TYPES.CLEANING,
  SERVICE_REQUEST_TYPES.REPAIR,
  SERVICE_REQUEST_TYPES.SUPPLIES,
  SERVICE_REQUEST_TYPES.GENERAL,
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function ServiceRequestCreateModal({ open, onClose, onSuccess }: Props) {
  const { t } = useTranslation();

  const TYPE_CONFIG = getTypeConfig(t);

  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [reqType, setReqType]       = useState<ServiceRequestType>(SERVICE_REQUEST_TYPES.GENERAL);
  const [floorId, setFloorId]       = useState('');
  const [location, setLocation]     = useState('');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency]       = useState<'normal' | 'urgent'>('normal');
  const [photo, setPhoto]           = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [formError, setFormError]   = useState<string | null>(null);

  const { data: floorsRaw, isLoading: floorsLoading } = useQuery({
    queryKey: ['building-floors'],
    queryFn: () =>
      apiClient
        .get<ServiceFloor[] | PaginatedResponse<ServiceFloor>>(API.serviceRequests.floors, { params: { page_size: 500 } })
        .then((r) => {
          const d = r.data;
          return Array.isArray(d) ? d : d.results;
        }),
    enabled: open,
  });

  const floors = floorsRaw ?? [];

  const { data: resourcesRaw, isLoading: resourcesLoading } = useQuery({
    queryKey: ['floor-resources', floorId],
    queryFn: () =>
      apiClient
        .get<PaginatedResponse<BookingResourceListItem>>(API.bookings.resources.list, {
          params: { floor_id: Number(floorId), page_size: 200, is_active: true },
        })
        .then((r) => r.data.results),
    enabled: !!floorId,
  });

  const floorResources = resourcesRaw ?? [];

  useEffect(() => {
    setLocation('');
  }, [floorId]);

  const mutation = useMutation({
    mutationFn: (payload: FormData) =>
      apiClient.post<ServiceRequest>(API.serviceRequests.create, payload).then((r) => r.data),
    onSuccess: async () => {
      setFormError(null);
      await queryClient.invalidateQueries({ queryKey: ['service-requests'] });
      resetForm();
      onSuccess();
    },
    onError: (err) => {
      setFormError(getApiError(err).message);
    },
  });

  function resetForm() {
    setReqType(SERVICE_REQUEST_TYPES.GENERAL);
    setFloorId('');
    setLocation('');
    setDescription('');
    setUrgency('normal');
    setPhoto(null);
    setPhotoPreview(null);
    setFormError(null);
  }

  function handleClose() {
    if (mutation.isPending) return;
    resetForm();
    onClose();
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setPhoto(file);
    if (file) {
      setPhotoPreview(URL.createObjectURL(file));
    } else {
      setPhotoPreview(null);
    }
  }

  function removePhoto() {
    setPhoto(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const canSubmit = !!floorId && !!location.trim() && !!description.trim() && !mutation.isPending;

  function handleSubmit() {
    setFormError(null);
    if (!floorId) { setFormError(t('serviceRequests.floorLoadError')); return; }
    if (!location.trim()) { setFormError(t('serviceRequests.locationRequired')); return; }
    if (!description.trim()) { setFormError(t('serviceRequests.descriptionRequired')); return; }

    const fd = new FormData();
    fd.append('request_type', reqType);
    fd.append('floor', floorId);
    fd.append('location', location.trim());
    fd.append('description', description.trim());
    fd.append('urgency', urgency);
    if (photo) fd.append('photo', photo);
    mutation.mutate(fd);
  }

  if (!open) return null;

  const inputStyle: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    height: 36,
    padding: '0 12px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)',
    background: 'var(--bg-surface)',
    color: 'var(--text-primary)',
    fontSize: 14,
    outline: 'none',
    fontFamily: 'inherit',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--text-secondary)',
    display: 'block',
    marginBottom: 6,
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
      role="dialog"
      aria-modal="true"
      aria-label={t('serviceRequests.createTitle')}
    >
      <div className="relative w-full max-w-[560px] rounded-2xl border border-default bg-surface shadow-xl overflow-y-auto max-h-[90vh]">

        {/* Header */}
        <div className="flex items-start justify-between px-[22px] pt-[18px] pb-[14px]">
          <div className="min-w-0 pr-4">
            <h2 className="text-base font-semibold text-primary tracking-[-0.015em]">
              {t('serviceRequests.createTitle')}
            </h2>
            <p className="text-xs text-muted mt-0.5">
              {t('serviceRequests.createSub')}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={mutation.isPending}
            className="shrink-0 flex items-center justify-center w-7 h-7 rounded-lg text-secondary hover:bg-raised hover:text-primary focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]"
            aria-label={t('common.close')}
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="px-[22px] pb-0 flex flex-col gap-4 max-h-[calc(90vh-120px)] overflow-y-auto">

          {/* 1. Type — 4-column grid */}
          <div>
            <label style={labelStyle}>
              {t('serviceRequests.fieldType')} <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginTop: 8 }}>
              {TYPE_LIST.map((k) => {
                const cfg = TYPE_CONFIG[k];
                const isSelected = reqType === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setReqType(k)}
                    style={{
                      padding: '12px 8px', borderRadius: 'var(--radius-sm)',
                      border: `1.5px solid ${isSelected ? cfg.color : 'var(--border)'}`,
                      background: isSelected ? cfg.bg : 'var(--bg-raised)',
                      color: isSelected ? cfg.color : 'var(--text-muted)',
                      cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                      fontSize: 13, fontWeight: isSelected ? 600 : 400, transition: 'all 0.15s',
                    }}
                  >
                    <cfg.Icon size={18} />
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Floor + Location — 2 col */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>{t('serviceRequests.fieldFloor')} <span style={{ color: 'var(--danger)' }}>*</span></label>
              <select
                value={floorId}
                onChange={(e) => setFloorId(e.target.value)}
                disabled={floorsLoading}
                style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}
              >
                {floorsLoading ? (
                  <option value="">{t('serviceRequests.floorLoading')}</option>
                ) : (
                  <>
                    <option value="">{t('serviceRequests.selectFloor')}</option>
                    {floors.length === 0 ? (
                      <option value="__none" disabled>{t('serviceRequests.noFloors')}</option>
                    ) : (
                      floors.map((f) => (
                        <option key={f.id} value={String(f.id)}>
                          {f.name?.trim() ? `${f.number} — ${f.name}` : String(f.number)}
                        </option>
                      ))
                    )}
                  </>
                )}
              </select>
            </div>
            <div>
              <label style={labelStyle}>{t('serviceRequests.fieldLocation')} <span style={{ color: 'var(--danger)' }}>*</span></label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                disabled={!floorId || resourcesLoading}
                style={{ ...inputStyle, appearance: 'none', cursor: floorId ? 'pointer' : 'default' }}
              >
                {!floorId ? (
                  <option value="">{t('serviceRequests.locationSelectFloorFirst')}</option>
                ) : resourcesLoading ? (
                  <option value="">{t('serviceRequests.locationResourcesLoading')}</option>
                ) : (
                  <>
                    <option value="">{t('serviceRequests.locationSelectResource')}</option>
                    {floorResources.length === 0 ? (
                      <option value="__none" disabled>{t('serviceRequests.locationNoResources')}</option>
                    ) : (
                      floorResources.map((r) => (
                        <option key={r.id} value={r.name}>
                          {r.name}
                        </option>
                      ))
                    )}
                  </>
                )}
              </select>
            </div>
          </div>

          {/* 3. Description */}
          <div>
            <label style={labelStyle}>{t('serviceRequests.fieldDescription')} <span style={{ color: 'var(--danger)' }}>*</span></label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('serviceRequests.fieldDescriptionPlaceholder')}
              rows={3}
              style={{ ...inputStyle, height: 'auto', padding: '8px 12px', resize: 'none', minHeight: 80 }}
            />
          </div>

          {/* 4. Urgency — 2 col */}
          <div>
            <label style={labelStyle}>{t('serviceRequests.fieldUrgency')}</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
              <button
                type="button"
                onClick={() => setUrgency('normal')}
                style={{
                  padding: '10px 14px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                  border: `1.5px solid ${urgency === 'normal' ? 'var(--text-muted)' : 'var(--border)'}`,
                  background: urgency === 'normal' ? 'var(--bg-raised)' : 'var(--bg-raised)',
                  color: urgency === 'normal' ? 'var(--text-secondary)' : 'var(--text-muted)',
                  fontSize: 13, fontWeight: urgency === 'normal' ? 600 : 400, transition: 'all 0.15s',
                }}
              >
                {t('serviceRequests.urgencyNormal')}
              </button>
              <button
                type="button"
                onClick={() => setUrgency('urgent')}
                style={{
                  padding: '10px 14px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                  border: `1.5px solid ${urgency === 'urgent' ? 'var(--danger)' : 'var(--border)'}`,
                  background: urgency === 'urgent' ? 'rgba(185,28,28,0.08)' : 'var(--bg-raised)',
                  color: urgency === 'urgent' ? 'var(--danger)' : 'var(--text-muted)',
                  fontSize: 13, fontWeight: urgency === 'urgent' ? 700 : 400, transition: 'all 0.15s',
                }}
              >
                {t('serviceRequests.urgencyUrgent')}
              </button>
            </div>
          </div>

          {/* 5. Photo */}
          <div>
            <label style={labelStyle}>{t('serviceRequests.fieldPhoto')}</label>
            {photoPreview ? (
              <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden' }}>
                <img
                  src={photoPreview}
                  alt={t('serviceRequests.photoAlt')}
                  style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }}
                />
                <button
                  type="button"
                  onClick={removePhoto}
                  style={{
                    position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: '50%',
                    background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                  aria-label={t('common.remove')}
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  border: '1.5px dashed var(--border)', borderRadius: 'var(--radius-sm)',
                  padding: '20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                  cursor: 'pointer', background: 'var(--bg-raised)', transition: 'border-color 0.15s',
                }}
              >
                <ImagePlus size={24} style={{ color: 'var(--text-muted)' }} />
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>
                  {t('serviceRequests.photoUpload')}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {t('serviceRequests.photoHint')}
                </span>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              style={{ display: 'none' }}
              aria-label={t('serviceRequests.fieldPhoto')}
            />
          </div>

          {/* Error */}
          {formError && (
            <div
              role="alert"
              style={{
                padding: '8px 12px', borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--danger)', background: 'var(--danger-bg)',
                color: 'var(--danger-text)', fontSize: 13,
              }}
            >
              {formError}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-[color:var(--border-faint)] px-[22px] pt-[14px] pb-[18px] mt-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClose}
            disabled={mutation.isPending}
          >
            {t('serviceRequests.cancelBtn')}
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={!canSubmit}
            loading={mutation.isPending}
          >
            {mutation.isPending ? t('common.submittingPlain') : t('serviceRequests.submitBtn')}
          </Button>
        </div>
      </div>
    </div>
  );
}
