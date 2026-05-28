import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import {
  CAPSULE_ZONES,
  COMPANY_TIERS,
  PARKING_TYPES,
  RESOURCE_EQUIPMENT_KEYS,
  RESOURCE_EQUIPMENT_LABEL_KEYS,
  RESOURCE_TYPES,
  type CapsuleZone,
  type ParkingType,
  type ResourceEquipmentKey,
} from '@/shared/config/constants';
import { useUser } from '@/shared/hooks/useAuth';
import { companiesCacheRoot } from '@/shared/lib/companyQueryKeys';
import { cn } from '@/shared/lib/cn';
import i18n from '@/shared/lib/i18n';
import type { Company, PaginatedResponse, Resource, ServiceFloor } from '@/shared/types';

type ResourceTypeValue = (typeof RESOURCE_TYPES)[keyof typeof RESOURCE_TYPES];
type EquipmentState = Record<ResourceEquipmentKey, boolean>;

type ResourceCreatePayload = {
  type: ResourceTypeValue;
  name: string;
  floor: number;
  zone?: string;
  description?: string;
  capacity?: number;
  availability_start: string;
  availability_end: string;
  availability_days: number[];
  is_active: boolean;
  has_monitor?: boolean;
  has_dock?: boolean;
  has_power_outlet?: boolean;
  is_hot_desk?: boolean;
  assigned_company?: number | null;
  equipment?: EquipmentState;
  min_duration_minutes?: number;
  max_duration_minutes?: number;
  advance_booking_days?: number;
  min_cancel_minutes?: number;
  parking_type?: ParkingType;
  capsule_zone?: CapsuleZone;
};

type BulkCreatePayload = {
  template: Omit<ResourceCreatePayload, 'name'>;
  count: number;
  name_prefix: string;
};

type CreateMutationInput = {
  payload: ResourceCreatePayload;
  photoFiles: File[];
};

const WEEKDAY_VALUES = [0, 1, 2, 3, 4, 5, 6] as const;

function defaultEquipment(): EquipmentState {
  return {
    projector: false,
    tv: false,
    whiteboard: false,
    video_conf: false,
    monitor: false,
    dock: false,
    power_outlet: true,
  };
}

type FormState = {
  type: ResourceTypeValue;
  name: string;
  floor: string;
  zone: string;
  description: string;
  capacity: string;
  availability_start: string;
  availability_end: string;
  availability_days: number[];
  is_active: boolean;
  has_monitor: boolean;
  has_dock: boolean;
  has_power_outlet: boolean;
  is_hot_desk: boolean;
  assigned_company_id: string;
  equipment: EquipmentState;
  min_duration_minutes: string;
  max_duration_minutes: string;
  advance_booking_days: string;
  min_cancel_minutes: string;
  parking_type: ParkingType;
  capsule_zone: CapsuleZone;
};

type BulkState = {
  name_prefix: string;
  count: string;
};

function parseError(error: unknown): { fieldErrors: Record<string, string>; message: string | null } {
  const fallback = {
    fieldErrors: {},
    message: i18n.t('resources.create.saveError'),
  };

  const raw = (error as { response?: { data?: unknown } })?.response?.data;
  if (!raw || typeof raw !== 'object') return fallback;

  const payload = raw as Record<string, unknown>;
  const detail = (payload.detail as Record<string, unknown> | undefined) ?? payload;
  if (!detail || typeof detail !== 'object') return fallback;

  const fieldErrors: Record<string, string> = {};
  for (const [key, value] of Object.entries(detail)) {
    if (Array.isArray(value)) {
      fieldErrors[key] = String(value[0] ?? '');
    } else if (typeof value === 'string') {
      fieldErrors[key] = value;
    }
  }

  return {
    fieldErrors,
    message: Object.keys(fieldErrors).length > 0 ? null : fallback.message,
  };
}

function inputClass(hasError: boolean) {
  return cn(
    'w-full h-9 px-3 text-sm border rounded-[var(--radius-sm)] bg-surface focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)] transition-colors',
    hasError ? 'border-red-400 focus:ring-red-500/20' : 'border-default',
  );
}

export default function ResourceCreatePage() {
  const { t } = useTranslation();
  const dayOptions = useMemo(() => {
    const labels = t('common.weekdaysShort', { returnObjects: true }) as string[];
    return WEEKDAY_VALUES.map((value) => ({ value, label: labels[value] ?? String(value) }));
  }, [t]);
  const user = useUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [primaryPhotoIndex, setPrimaryPhotoIndex] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>({
    type: RESOURCE_TYPES.DESK,
    name: '',
    floor: '',
    zone: '',
    description: '',
    capacity: '',
    availability_start: '09:00',
    availability_end: '18:00',
    availability_days: [0, 1, 2, 3, 4],
    is_active: true,
    has_monitor: false,
    has_dock: false,
    has_power_outlet: true,
    is_hot_desk: true,
    assigned_company_id: '',
    equipment: defaultEquipment(),
    min_duration_minutes: '30',
    max_duration_minutes: '480',
    advance_booking_days: '14',
    min_cancel_minutes: '30',
    parking_type: PARKING_TYPES.REGULAR,
    capsule_zone: CAPSULE_ZONES.QUIET,
  });
  const [bulk, setBulk] = useState<BulkState>({
    name_prefix: t('resources.create.deskPrefix'),
    count: '10',
  });

  const { data: companies = [] } = useQuery({
    queryKey: [...companiesCacheRoot(user?.id), 'resource-create', COMPANY_TIERS.PREMIUM],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<Company>>(API.companies.list, {
        params: { page_size: 100, plan: COMPANY_TIERS.PREMIUM },
      });
      return data.results;
    },
  });

  const { data: floors = [], isLoading: floorsLoading } = useQuery({
    queryKey: ['map-floors'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ results: ServiceFloor[] }>(API.map.floors);
      return data.results;
    },
  });

  const createMutation = useMutation({
    mutationFn: async ({ payload, photoFiles: files }: CreateMutationInput) => {
      const { data: resource } = await apiClient.post<Resource>(API.bookings.resources.create, payload);
      for (const file of files) {
        const fd = new FormData();
        fd.append('image', file);
        await apiClient.post(API.bookings.resources.uploadPhoto(String(resource.id)), fd, {
          headers: { 'Content-Type': undefined },
        });
      }
      return resource;
    },
    onSuccess: async (resource) => {
      await queryClient.invalidateQueries({ queryKey: ['booking-resources'] });
      navigate('/resources', {
        state: {
          successMessage: t('resources.create.createdOne', { name: resource.name }),
        },
      });
    },
    onError: (error) => {
      const parsed = parseError(error);
      setFieldErrors(parsed.fieldErrors);
      setGeneralError(parsed.message);
    },
  });

  const bulkCreateMutation = useMutation({
    mutationFn: (payload: BulkCreatePayload) =>
      apiClient.post<Resource[]>(API.bookings.resources.bulkCreate, payload).then((res) => res.data),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['booking-resources'] });
      navigate('/resources', {
        state: {
          successMessage: t('resources.create.createdMany', { count: variables.count }),
        },
      });
    },
    onError: (error) => {
      const parsed = parseError(error);
      setFieldErrors(parsed.fieldErrors);
      setGeneralError(parsed.message);
    },
  });

  const isPending = createMutation.isPending || bulkCreateMutation.isPending;
  const requiresCapacity = form.type === RESOURCE_TYPES.MEETING_ROOM;
  const isDesk = form.type === RESOURCE_TYPES.DESK;
  const isParking = form.type === RESOURCE_TYPES.PARKING;
  const isCapsule = form.type === RESOURCE_TYPES.CAPSULE;

  const availabilityRangeInvalid = useMemo(() => {
    if (!form.availability_start || !form.availability_end) return false;
    return form.availability_start >= form.availability_end;
  }, [form.availability_start, form.availability_end]);

  function clearError(key: string) {
    if (!fieldErrors[key]) return;
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    clearError(key);
    setGeneralError(null);
  }

  function toggleDay(day: number) {
    const exists = form.availability_days.includes(day);
    const nextDays = exists
      ? form.availability_days.filter((item) => item !== day)
      : [...form.availability_days, day].sort((a, b) => a - b);
    updateForm('availability_days', nextDays);
  }

  function toggleEquipment(key: ResourceEquipmentKey) {
    updateForm('equipment', {
      ...form.equipment,
      [key]: !form.equipment[key],
    });
  }

  function addPhotos(files: File[]) {
    setPhotoFiles((prev) => {
      const next = [...prev, ...files];
      if (primaryPhotoIndex === null && next.length > 0) setPrimaryPhotoIndex(0);
      return next;
    });
  }

  function removePhoto(idx: number) {
    setPhotoFiles((prev) => prev.filter((_, i) => i !== idx));
    setPrimaryPhotoIndex((prev) => {
      if (prev === null) return null;
      if (prev === idx) return 0;
      if (idx < prev) return prev - 1;
      return prev;
    });
  }

  function buildTemplate(): Omit<ResourceCreatePayload, 'name'> {
    const payload: Omit<ResourceCreatePayload, 'name'> = {
      type: form.type,
      floor: Number(form.floor),
      availability_start: form.availability_start,
      availability_end: form.availability_end,
      availability_days: form.availability_days,
      is_active: form.is_active,
    };

    if (form.zone.trim()) payload.zone = form.zone.trim();
    if (form.description.trim()) payload.description = form.description.trim();

    if (requiresCapacity) {
      payload.capacity = Number(form.capacity);
      payload.equipment = { ...form.equipment };
      payload.min_duration_minutes = Number(form.min_duration_minutes);
      payload.max_duration_minutes = Number(form.max_duration_minutes);
    }
    if (form.advance_booking_days) payload.advance_booking_days = Number(form.advance_booking_days);
    if (form.min_cancel_minutes) payload.min_cancel_minutes = Number(form.min_cancel_minutes);

    if (isDesk) {
      payload.has_monitor = form.has_monitor;
      payload.has_dock = form.has_dock;
      payload.has_power_outlet = form.has_power_outlet;
      payload.is_hot_desk = form.is_hot_desk;
    }

    if (isParking) {
      payload.parking_type = form.parking_type;
    }

    if (isCapsule) {
      payload.capsule_zone = form.capsule_zone;
    }

    if (form.assigned_company_id) {
      payload.assigned_company = Number(form.assigned_company_id);
    }

    return payload;
  }

  function validateTypeSpecificFields() {
    if (requiresCapacity && (!form.capacity || Number(form.capacity) < 1)) {
      setFieldErrors({ capacity: t('resources.create.capacityRequired') });
      return false;
    }

    if (requiresCapacity) {
      const minDuration = Number(form.min_duration_minutes);
      const maxDuration = Number(form.max_duration_minutes);
      if (!Number.isInteger(minDuration) || minDuration < 1) {
        setFieldErrors({ min_duration_minutes: t('resources.create.minDuration') });
        return false;
      }
      if (!Number.isInteger(maxDuration) || maxDuration < 1) {
        setFieldErrors({ max_duration_minutes: t('resources.create.maxDuration') });
        return false;
      }
      if (minDuration > maxDuration) {
        setFieldErrors({ min_duration_minutes: t('resources.create.minMaxOrder') });
        return false;
      }
    }

    if (isParking && !form.parking_type) {
      setFieldErrors({ parking_type: t('resources.create.parkingTypeRequired') });
      return false;
    }

    if (isCapsule && !form.capsule_zone) {
      setFieldErrors({ capsule_zone: t('resources.create.capsuleZoneRequired') });
      return false;
    }

    return true;
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setGeneralError(null);
    setFieldErrors({});

    if (!form.floor) {
      setFieldErrors({ floor: t('resources.create.floorRequired') });
      return;
    }

    if (!validateTypeSpecificFields()) return;

    if (availabilityRangeInvalid) {
      setFieldErrors({ availability_start: t('resources.create.availabilityOrder') });
      return;
    }

    if (form.availability_days.length === 0) {
      setFieldErrors({ availability_days: t('resources.create.availabilityDays') });
      return;
    }

    if (isBulkMode) {
      if (!bulk.name_prefix.trim()) {
        setFieldErrors({ name_prefix: t('resources.create.namePrefixRequired') });
        return;
      }
      const count = Number(bulk.count);
      if (!bulk.count || Number.isNaN(count) || count < 1) {
        setFieldErrors({ count: t('resources.create.countRequired') });
        return;
      }
      bulkCreateMutation.mutate({
        template: buildTemplate(),
        count,
        name_prefix: bulk.name_prefix.trim(),
      });
      return;
    }

    if (!form.name.trim()) {
      setFieldErrors({ name: t('resources.create.nameRequired') });
      return;
    }

    const orderedFiles =
      primaryPhotoIndex !== null && photoFiles.length > 1
        ? [photoFiles[primaryPhotoIndex], ...photoFiles.filter((_, i) => i !== primaryPhotoIndex)]
        : photoFiles;

    createMutation.mutate({
      payload: {
        ...buildTemplate(),
        name: form.name.trim(),
      },
      photoFiles: orderedFiles,
    });
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 md:py-8 space-y-5">
      {/* Page header */}
      <div className="space-y-1">
        <button
          type="button"
          onClick={() => navigate('/resources')}
          className="text-sm font-medium text-muted transition-colors hover:text-primary"
        >
          {t('resources.create.backToResources')}
        </button>
        <h1 className="text-xl font-semibold text-primary">{t('resources.create.pageTitle')}</h1>
        <p className="text-sm text-muted">{t('resources.create.pageSubtitle')}</p>
      </div>

      {/* Card */}
      <div className="rounded-2xl border border-default bg-surface shadow-xl overflow-hidden">
        {/* Card header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[color:var(--border-faint)]">
          <div>
            <h2 className="text-base font-semibold text-primary tracking-[-0.015em]">
              {t('resources.create.pageTitle')}
            </h2>
            <p className="text-xs text-muted mt-0.5">{t('resources.create.pageSubtitle')}</p>
          </div>
          {/* Mode toggle */}
          <div className="rounded-lg border border-default bg-raised p-0.5 inline-flex shrink-0">
            <button
              type="button"
              onClick={() => setIsBulkMode(false)}
              className={cn(
                'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                !isBulkMode ? 'bg-surface text-primary shadow-sm' : 'text-muted hover:text-secondary',
              )}
            >
              {t('resources.create.singleMode')}
            </button>
            <button
              type="button"
              onClick={() => setIsBulkMode(true)}
              className={cn(
                'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                isBulkMode ? 'bg-surface text-primary shadow-sm' : 'text-muted hover:text-secondary',
              )}
            >
              {t('resources.create.bulkMode')}
            </button>
          </div>
        </div>

        {/* Form body + footer */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="px-6 py-5 space-y-4">
            {/* Global error banner */}
            {generalError && (
              <div className="rounded-[var(--radius-sm)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {generalError}
              </div>
            )}

            {/* Row: type + floor */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="type" className="text-xs font-medium text-secondary">
                  {t('resources.create.resourceTypeLabel')}
                </label>
                <select
                  id="type"
                  value={form.type}
                  onChange={(e) => updateForm('type', e.target.value as ResourceTypeValue)}
                  className={inputClass(!!fieldErrors.type)}
                >
                  <option value={RESOURCE_TYPES.DESK}>{t('resources.create.deskPrefix')}</option>
                  <option value={RESOURCE_TYPES.MEETING_ROOM}>{t('resources.create.meetingRoomOption')}</option>
                  <option value={RESOURCE_TYPES.PARKING}>{t('resources.create.parkingOption')}</option>
                  <option value={RESOURCE_TYPES.CAPSULE}>{t('resources.create.capsuleOption')}</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="floor" className="text-xs font-medium text-secondary">
                  {t('resources.create.floorLabel')}
                </label>
                <select
                  id="floor"
                  value={form.floor}
                  disabled={floorsLoading}
                  onChange={(e) => updateForm('floor', e.target.value)}
                  className={inputClass(!!fieldErrors.floor)}
                >
                  <option value="">{t('resources.create.floorSelectDefault')}</option>
                  {floors.map((f) => (
                    <option key={f.id} value={String(f.number)}>
                      {f.name
                        ? t('resources.create.floorOptionWithName', { number: f.number, name: f.name })
                        : t('resources.create.floorOptionNoName', { number: f.number })}
                    </option>
                  ))}
                </select>
                {fieldErrors.floor && (
                  <p className="text-xs text-red-600 mt-0.5">{fieldErrors.floor}</p>
                )}
              </div>
            </div>

            {/* Single mode: resource name */}
            {!isBulkMode && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="name" className="text-xs font-medium text-secondary">
                  {t('resources.create.resourceNameLabel')}
                </label>
                <input
                  id="name"
                  type="text"
                  value={form.name}
                  onChange={(e) => updateForm('name', e.target.value)}
                  placeholder={t('resources.create.namePlaceholder')}
                  className={inputClass(!!fieldErrors.name)}
                />
                {fieldErrors.name && (
                  <p className="text-xs text-red-600 mt-0.5">{fieldErrors.name}</p>
                )}
              </div>
            )}

            {/* Bulk mode: prefix + count */}
            {isBulkMode && (
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="name_prefix" className="text-xs font-medium text-secondary">
                    {t('resources.create.namePrefixLabel')}
                  </label>
                  <input
                    id="name_prefix"
                    type="text"
                    value={bulk.name_prefix}
                    onChange={(e) => {
                      setBulk((prev) => ({ ...prev, name_prefix: e.target.value }));
                      clearError('name_prefix');
                    }}
                    placeholder={t('resources.create.prefixPlaceholder')}
                    className={inputClass(!!fieldErrors.name_prefix)}
                  />
                  {fieldErrors.name_prefix && (
                    <p className="text-xs text-red-600 mt-0.5">{fieldErrors.name_prefix}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="count" className="text-xs font-medium text-secondary">
                    {t('resources.create.countLabel')}
                  </label>
                  <input
                    id="count"
                    type="number"
                    min={1}
                    value={bulk.count}
                    onChange={(e) => {
                      setBulk((prev) => ({ ...prev, count: e.target.value }));
                      clearError('count');
                    }}
                    className={inputClass(!!fieldErrors.count)}
                  />
                  {fieldErrors.count && (
                    <p className="text-xs text-red-600 mt-0.5">{fieldErrors.count}</p>
                  )}
                </div>
              </div>
            )}

            {/* Row: zone + capacity (capacity only for meeting room) */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="zone" className="text-xs font-medium text-secondary">
                  {t('resources.create.zoneLabel')}
                </label>
                <input
                  id="zone"
                  type="text"
                  value={form.zone}
                  onChange={(e) => updateForm('zone', e.target.value)}
                  placeholder="North"
                  className={inputClass(!!fieldErrors.zone)}
                />
              </div>
              {requiresCapacity && (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="capacity" className="text-xs font-medium text-secondary">
                    {t('resources.create.capacityLabel')}
                  </label>
                  <input
                    id="capacity"
                    type="number"
                    min={1}
                    value={form.capacity}
                    onChange={(e) => updateForm('capacity', e.target.value)}
                    className={inputClass(!!fieldErrors.capacity)}
                  />
                  {fieldErrors.capacity && (
                    <p className="text-xs text-red-600 mt-0.5">{fieldErrors.capacity}</p>
                  )}
                </div>
              )}
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="description" className="text-xs font-medium text-secondary">
                {t('resources.create.descriptionLabel')}
              </label>
              <textarea
                id="description"
                rows={3}
                value={form.description}
                onChange={(e) => updateForm('description', e.target.value)}
                placeholder={t('resources.create.descriptionPlaceholder')}
                className="w-full px-3 py-2 text-sm border border-default rounded-[var(--radius-sm)] bg-surface focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)] resize-none transition-colors"
              />
            </div>

            {/* Photo upload (single mode only) */}
            {!isBulkMode && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-secondary">
                  {t('resources.create.photosLabel')}
                </label>
                <label
                  htmlFor="photos"
                  className="flex cursor-pointer items-center gap-2 rounded-[var(--radius-sm)] border border-dashed border-default bg-raised px-4 py-3 text-sm text-secondary hover:bg-hover transition-colors"
                >
                  <span className="font-medium text-[color:var(--brand)]">{t('resources.create.choosePhoto')}</span>
                  <span className="text-muted">{t('resources.create.dropFilesHint')}</span>
                  <input
                    id="photos"
                    type="file"
                    accept="image/*"
                    multiple
                    className="sr-only"
                    onChange={(e) => {
                      addPhotos(Array.from(e.target.files ?? []));
                      e.target.value = '';
                    }}
                  />
                </label>
                {photoFiles.length > 0 && (
                  <ul className="mt-1 space-y-1">
                    {photoFiles.map((file, i) => {
                      const isPrimary = primaryPhotoIndex === i || photoFiles.length === 1;
                      return (
                        <li
                          key={i}
                          className={cn(
                            'flex items-center gap-2 rounded-[var(--radius-sm)] border px-3 py-1.5 text-sm',
                            isPrimary
                              ? 'border-[color:var(--brand)] bg-[color:var(--brand-subtle)] text-primary'
                              : 'border-default bg-raised text-secondary',
                          )}
                        >
                          {isPrimary ? (
                            <span className="shrink-0 text-xs font-semibold text-[color:var(--brand-text)]">
                              {t('resources.create.photoPrimary')}
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setPrimaryPhotoIndex(i)}
                              className="shrink-0 text-xs text-muted hover:text-[color:var(--brand)] transition-colors"
                            >
                              {t('resources.create.photoMakePrimary')}
                            </button>
                          )}
                          <span className="min-w-0 flex-1 truncate">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => removePhoto(i)}
                            className="shrink-0 text-xs text-red-500 hover:text-red-700 transition-colors"
                          >
                            {t('common.delete')}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}

            {/* is_active checkbox */}
            <label className="inline-flex items-center gap-2 text-xs text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => updateForm('is_active', e.target.checked)}
                className="h-3.5 w-3.5 rounded border-default text-[color:var(--brand)]"
              />
              {t('resources.create.activeInCatalog')}
            </label>

            {/* Desk settings sub-card */}
            {isDesk && (
              <div className="rounded-xl border border-[color:var(--border-faint)] bg-raised px-4 py-3 space-y-3">
                <p className="text-xs font-semibold text-secondary mb-2">{t('resources.create.deskSettings')}</p>
                <div className="grid grid-cols-2 gap-2">
                  <label className="inline-flex items-center gap-2 text-xs text-secondary cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.has_monitor}
                      onChange={(e) => updateForm('has_monitor', e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-default text-[color:var(--brand)]"
                    />
                    {t('resources.create.monitorLabel')}
                  </label>
                  <label className="inline-flex items-center gap-2 text-xs text-secondary cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.has_dock}
                      onChange={(e) => updateForm('has_dock', e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-default text-[color:var(--brand)]"
                    />
                    {t('resources.create.dockLabel')}
                  </label>
                  <label className="inline-flex items-center gap-2 text-xs text-secondary cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.has_power_outlet}
                      onChange={(e) => updateForm('has_power_outlet', e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-default text-[color:var(--brand)]"
                    />
                    {t('resources.create.outletLabel')}
                  </label>
                  <label className="inline-flex items-center gap-2 text-xs text-secondary cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_hot_desk}
                      onChange={(e) => updateForm('is_hot_desk', e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-default text-[color:var(--brand)]"
                    />
                    {t('resources.create.hotDeskLabel')}
                  </label>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="desk_assigned_company" className="text-xs font-medium text-secondary">
                    {t('resources.create.assignCompanyLabel')}
                  </label>
                  <select
                    id="desk_assigned_company"
                    value={form.assigned_company_id}
                    onChange={(e) => updateForm('assigned_company_id', e.target.value)}
                    className={inputClass(!!fieldErrors.assigned_company)}
                  >
                    <option value="">{t('resources.create.noAssignCompany')}</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Meeting room settings sub-card */}
            {requiresCapacity && (
              <div className="rounded-xl border border-[color:var(--border-faint)] bg-raised px-4 py-3 space-y-3">
                <p className="text-xs font-semibold text-secondary mb-2">{t('resources.create.meetingSettings')}</p>
                <div className="grid grid-cols-2 gap-2">
                  {RESOURCE_EQUIPMENT_KEYS.map((key) => (
                    <label key={key} className="inline-flex items-center gap-2 text-xs text-secondary cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.equipment[key]}
                        onChange={() => toggleEquipment(key)}
                        className="h-3.5 w-3.5 rounded border-default text-[color:var(--brand)]"
                      />
                      {t(RESOURCE_EQUIPMENT_LABEL_KEYS[key])}
                    </label>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="min_duration_minutes" className="text-xs font-medium text-secondary">
                      {t('resources.create.minDurationLabel')}
                    </label>
                    <input
                      id="min_duration_minutes"
                      type="number"
                      min={1}
                      value={form.min_duration_minutes}
                      onChange={(e) => updateForm('min_duration_minutes', e.target.value)}
                      className={inputClass(!!fieldErrors.min_duration_minutes)}
                    />
                    {fieldErrors.min_duration_minutes && (
                      <p className="text-xs text-red-600 mt-0.5">{fieldErrors.min_duration_minutes}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="max_duration_minutes" className="text-xs font-medium text-secondary">
                      {t('resources.create.maxDurationLabel')}
                    </label>
                    <input
                      id="max_duration_minutes"
                      type="number"
                      min={1}
                      value={form.max_duration_minutes}
                      onChange={(e) => updateForm('max_duration_minutes', e.target.value)}
                      className={inputClass(!!fieldErrors.max_duration_minutes)}
                    />
                    {fieldErrors.max_duration_minutes && (
                      <p className="text-xs text-red-600 mt-0.5">{fieldErrors.max_duration_minutes}</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="meeting_room_assigned_company" className="text-xs font-medium text-secondary">
                    {t('resources.create.assignCompanyLabel')}
                  </label>
                  <select
                    id="meeting_room_assigned_company"
                    value={form.assigned_company_id}
                    onChange={(e) => updateForm('assigned_company_id', e.target.value)}
                    className={inputClass(!!fieldErrors.assigned_company)}
                  >
                    <option value="">{t('resources.create.noAssignCompany')}</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Parking settings sub-card */}
            {isParking && (
              <div className="rounded-xl border border-[color:var(--border-faint)] bg-raised px-4 py-3 space-y-3">
                <p className="text-xs font-semibold text-secondary mb-2">{t('resources.create.parkingSettings')}</p>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="parking_type" className="text-xs font-medium text-secondary">
                    {t('resources.create.parkingTypeLabel')}
                  </label>
                  <select
                    id="parking_type"
                    value={form.parking_type}
                    onChange={(e) => updateForm('parking_type', e.target.value as ParkingType)}
                    className={inputClass(!!fieldErrors.parking_type)}
                  >
                    <option value={PARKING_TYPES.REGULAR}>{t('resources.create.parkingRegular')}</option>
                    <option value={PARKING_TYPES.VIP}>VIP</option>
                  </select>
                  {fieldErrors.parking_type && (
                    <p className="text-xs text-red-600 mt-0.5">{fieldErrors.parking_type}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="parking_assigned_company" className="text-xs font-medium text-secondary">
                    {t('resources.create.assignCompanyLabel')}
                  </label>
                  <select
                    id="parking_assigned_company"
                    value={form.assigned_company_id}
                    onChange={(e) => updateForm('assigned_company_id', e.target.value)}
                    className={inputClass(!!fieldErrors.assigned_company)}
                  >
                    <option value="">{t('resources.create.noAssignCompany')}</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Capsule settings sub-card */}
            {isCapsule && (
              <div className="rounded-xl border border-[color:var(--border-faint)] bg-raised px-4 py-3 space-y-3">
                <p className="text-xs font-semibold text-secondary mb-2">{t('resources.create.capsuleSettings')}</p>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="capsule_zone" className="text-xs font-medium text-secondary">
                    {t('resources.create.capsuleZoneLabel')}
                  </label>
                  <select
                    id="capsule_zone"
                    value={form.capsule_zone}
                    onChange={(e) => updateForm('capsule_zone', e.target.value as CapsuleZone)}
                    className={inputClass(!!fieldErrors.capsule_zone)}
                  >
                    <option value={CAPSULE_ZONES.QUIET}>{t('resources.create.capsuleQuiet')}</option>
                    <option value={CAPSULE_ZONES.REGULAR}>{t('resources.create.capsuleRegular')}</option>
                  </select>
                  {fieldErrors.capsule_zone && (
                    <p className="text-xs text-red-600 mt-0.5">{fieldErrors.capsule_zone}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="capsule_assigned_company" className="text-xs font-medium text-secondary">
                    {t('resources.create.assignCompanyLabel')}
                  </label>
                  <select
                    id="capsule_assigned_company"
                    value={form.assigned_company_id}
                    onChange={(e) => updateForm('assigned_company_id', e.target.value)}
                    className={inputClass(!!fieldErrors.assigned_company)}
                  >
                    <option value="">{t('resources.create.noAssignCompany')}</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Booking policy sub-card */}
            <div className="rounded-xl border border-[color:var(--border-faint)] bg-raised px-4 py-3 space-y-3">
              <p className="text-xs font-semibold text-secondary mb-2">{t('resources.create.bookingPolicyLabel')}</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="advance_booking_days" className="text-xs font-medium text-secondary">
                    {t('resources.create.advanceDaysLabel')}
                  </label>
                  <input
                    type="number"
                    id="advance_booking_days"
                    min={1}
                    placeholder="14"
                    value={form.advance_booking_days}
                    onChange={(e) => updateForm('advance_booking_days', e.target.value)}
                    className={inputClass(false)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="min_cancel_minutes" className="text-xs font-medium text-secondary">
                    {t('resources.create.minCancelLabel')}
                  </label>
                  <input
                    type="number"
                    id="min_cancel_minutes"
                    min={1}
                    placeholder="30"
                    value={form.min_cancel_minutes}
                    onChange={(e) => updateForm('min_cancel_minutes', e.target.value)}
                    className={inputClass(false)}
                  />
                </div>
              </div>
            </div>

            {/* Availability section */}
            <div className="rounded-xl border border-[color:var(--border-faint)] bg-raised px-4 py-3 space-y-3">
              <p className="text-xs font-semibold text-secondary mb-2">{t('resources.create.availabilitySection')}</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="availability_start" className="text-xs font-medium text-secondary">
                    {t('common.start')}
                  </label>
                  <input
                    id="availability_start"
                    type="time"
                    value={form.availability_start}
                    onChange={(e) => updateForm('availability_start', e.target.value)}
                    className={inputClass(!!fieldErrors.availability_start || availabilityRangeInvalid)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="availability_end" className="text-xs font-medium text-secondary">
                    {t('resources.create.endLabel')}
                  </label>
                  <input
                    id="availability_end"
                    type="time"
                    value={form.availability_end}
                    onChange={(e) => updateForm('availability_end', e.target.value)}
                    className={inputClass(!!fieldErrors.availability_end || availabilityRangeInvalid)}
                  />
                </div>
              </div>
              {(fieldErrors.availability_start || availabilityRangeInvalid) && (
                <p className="text-xs text-red-600 mt-0.5">
                  {fieldErrors.availability_start || t('resources.create.availabilityOrder')}
                </p>
              )}

              <div>
                <p className="text-xs font-medium text-secondary mb-2">{t('resources.create.availabilityDaysLabel')}</p>
                <div className="flex flex-wrap gap-1.5">
                  {dayOptions.map((day) => {
                    const active = form.availability_days.includes(day.value);
                    return (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => toggleDay(day.value)}
                        className={cn(
                          'h-7 px-2.5 text-xs font-medium rounded-[var(--radius-sm)] border transition-colors',
                          active
                            ? 'border-[color:var(--brand)] bg-[color:var(--brand-subtle)] text-[color:var(--brand-text)]'
                            : 'border-default text-secondary hover:bg-raised',
                        )}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
                {fieldErrors.availability_days && (
                  <p className="text-xs text-red-600 mt-1">{fieldErrors.availability_days}</p>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 border-t border-[color:var(--border-faint)] px-6 pt-4 pb-5 mt-0">
            <button
              type="button"
              onClick={() => navigate('/resources')}
              className="h-8 px-4 text-sm font-medium text-secondary hover:bg-raised rounded-[var(--radius-sm)] transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isPending}
              className={cn(
                'inline-flex items-center gap-1.5 h-8 px-4 text-sm font-medium rounded-[var(--radius-sm)] transition-colors',
                'text-[color:var(--text-onbrand)] bg-[color:var(--brand)] hover:bg-[color:var(--brand-hover)]',
                'disabled:opacity-60 disabled:cursor-not-allowed',
              )}
            >
              <Plus size={14} />
              {isPending
                ? t('common.savingPlain')
                : isBulkMode
                  ? t('resources.create.submitBulk')
                  : t('resources.create.submit')}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
