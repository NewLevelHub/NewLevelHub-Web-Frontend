import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import {
  CAPSULE_ZONES,
  COMPANY_TIERS,
  PARKING_TYPES,
  RESOURCE_EQUIPMENT_KEYS,
  RESOURCE_EQUIPMENT_LABELS,
  RESOURCE_TYPES,
  type CapsuleZone,
  type ParkingType,
  type ResourceEquipmentKey,
} from '@/shared/config/constants';
import { useUser } from '@/shared/hooks/useAuth';
import { companiesCacheRoot } from '@/shared/lib/companyQueryKeys';
import { cn } from '@/shared/lib/cn';
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

const DAY_OPTIONS = [
  { value: 0, label: 'Пн' },
  { value: 1, label: 'Вт' },
  { value: 2, label: 'Ср' },
  { value: 3, label: 'Чт' },
  { value: 4, label: 'Пт' },
  { value: 5, label: 'Сб' },
  { value: 6, label: 'Вс' },
];

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
    message: 'Не удалось сохранить ресурс. Проверьте данные и попробуйте еще раз.',
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
    'w-full rounded-lg border bg-raised px-3 py-2 text-sm text-primary placeholder:text-placeholder focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors',
    hasError ? 'border-red-400 focus:ring-red-500/20' : 'border-default',
  );
}


export default function ResourceCreatePage() {
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
    name_prefix: 'Стол',
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
          successMessage: `Ресурс "${resource.name}" успешно создан.`,
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
          successMessage: `Успешно создано ${variables.count} ресурсов.`,
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
      setFieldErrors({ capacity: 'Для переговорки вместимость обязательна и должна быть больше 0.' });
      return false;
    }

    if (requiresCapacity) {
      const minDuration = Number(form.min_duration_minutes);
      const maxDuration = Number(form.max_duration_minutes);
      if (!Number.isInteger(minDuration) || minDuration < 1) {
        setFieldErrors({ min_duration_minutes: 'Минимальная длительность должна быть >= 1.' });
        return false;
      }
      if (!Number.isInteger(maxDuration) || maxDuration < 1) {
        setFieldErrors({ max_duration_minutes: 'Максимальная длительность должна быть >= 1.' });
        return false;
      }
      if (minDuration > maxDuration) {
        setFieldErrors({ min_duration_minutes: 'Минимальная длительность не может быть больше максимальной.' });
        return false;
      }
    }

    if (isParking && !form.parking_type) {
      setFieldErrors({ parking_type: 'Выберите тип парковки.' });
      return false;
    }

    if (isCapsule && !form.capsule_zone) {
      setFieldErrors({ capsule_zone: 'Выберите зону капсулы.' });
      return false;
    }

    return true;
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setGeneralError(null);
    setFieldErrors({});

    if (!form.floor) {
      setFieldErrors({ floor: 'Выберите этаж.' });
      return;
    }

    if (!validateTypeSpecificFields()) return;

    if (availabilityRangeInvalid) {
      setFieldErrors({ availability_start: 'Время начала должно быть раньше времени окончания.' });
      return;
    }

    if (form.availability_days.length === 0) {
      setFieldErrors({ availability_days: 'Выберите хотя бы один день доступности.' });
      return;
    }

    if (isBulkMode) {
      if (!bulk.name_prefix.trim()) {
        setFieldErrors({ name_prefix: 'Укажите префикс имени.' });
        return;
      }
      const count = Number(bulk.count);
      if (!bulk.count || Number.isNaN(count) || count < 1) {
        setFieldErrors({ count: 'Количество должно быть целым числом >= 1.' });
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
      setFieldErrors({ name: 'Название ресурса обязательно.' });
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
    <main className="mx-auto max-w-3xl space-y-6 px-3 py-4 sm:px-4 sm:py-6 md:py-8">
      <div className="space-y-1">
        <button
          type="button"
          onClick={() => navigate('/resources')}
          className="text-sm font-medium text-muted transition-colors hover:text-primary"
        >
          Назад к ресурсам
        </button>
        <h1 className="text-2xl font-bold text-primary">Добавление ресурсов</h1>
        <p className="text-sm text-muted">Создайте один ресурс или сразу несколько через массовое создание.</p>
      </div>

      <section className="rounded-2xl border border-default bg-surface p-6 shadow-sm">
        <div className="mb-5 inline-flex rounded-lg border border-default bg-raised p-1">
          <button
            type="button"
            onClick={() => setIsBulkMode(false)}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              !isBulkMode ? 'bg-surface text-primary shadow-sm' : 'text-muted hover:text-secondary',
            )}
          >
            Один ресурс
          </button>
          <button
            type="button"
            onClick={() => setIsBulkMode(true)}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              isBulkMode ? 'bg-surface text-primary shadow-sm' : 'text-muted hover:text-secondary',
            )}
          >
            Массовое создание
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {generalError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {generalError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="type" className="mb-1 block text-sm font-medium text-secondary">
                Тип ресурса
              </label>
              <select
                id="type"
                value={form.type}
                onChange={(e) => updateForm('type', e.target.value as ResourceTypeValue)}
                className={inputClass(!!fieldErrors.type)}
              >
                <option value={RESOURCE_TYPES.DESK}>Стол</option>
                <option value={RESOURCE_TYPES.MEETING_ROOM}>Переговорка</option>
                <option value={RESOURCE_TYPES.PARKING}>Парковка</option>
                <option value={RESOURCE_TYPES.CAPSULE}>Капсула</option>
              </select>
            </div>

            <div>
              <label htmlFor="floor" className="mb-1 block text-sm font-medium text-secondary">
                Этаж
              </label>
              <select
                id="floor"
                value={form.floor}
                disabled={floorsLoading}
                onChange={(e) => updateForm('floor', e.target.value)}
                className={inputClass(!!fieldErrors.floor)}
              >
                <option value="">— Выберите этаж —</option>
                {floors.map((f) => (
                  <option key={f.id} value={String(f.number)}>
                    {f.name ? `Этаж ${f.number} — ${f.name}` : `Этаж ${f.number}`}
                  </option>
                ))}
              </select>
              {fieldErrors.floor && <p className="mt-1 text-xs text-red-600">{fieldErrors.floor}</p>}
            </div>
          </div>

          {!isBulkMode && (
            <div>
              <label htmlFor="name" className="mb-1 block text-sm font-medium text-secondary">
                Название ресурса
              </label>
              <input
                id="name"
                type="text"
                value={form.name}
                onChange={(e) => updateForm('name', e.target.value)}
                placeholder="Стол 12"
                className={inputClass(!!fieldErrors.name)}
              />
              {fieldErrors.name && <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>}
            </div>
          )}

          {isBulkMode && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="name_prefix" className="mb-1 block text-sm font-medium text-secondary">
                  Префикс имени
                </label>
                <input
                  id="name_prefix"
                  type="text"
                  value={bulk.name_prefix}
                  onChange={(e) => {
                    setBulk((prev) => ({ ...prev, name_prefix: e.target.value }));
                    clearError('name_prefix');
                  }}
                  placeholder="Стол"
                  className={inputClass(!!fieldErrors.name_prefix)}
                />
                {fieldErrors.name_prefix && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.name_prefix}</p>
                )}
              </div>
              <div>
                <label htmlFor="count" className="mb-1 block text-sm font-medium text-secondary">
                  Количество
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
                {fieldErrors.count && <p className="mt-1 text-xs text-red-600">{fieldErrors.count}</p>}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="zone" className="mb-1 block text-sm font-medium text-secondary">
                Зона
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
              <div>
                <label htmlFor="capacity" className="mb-1 block text-sm font-medium text-secondary">
                  Вместимость
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
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.capacity}</p>
                )}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="description" className="mb-1 block text-sm font-medium text-secondary">
              Описание
            </label>
            <textarea
              id="description"
              rows={3}
              value={form.description}
              onChange={(e) => updateForm('description', e.target.value)}
              className={cn(inputClass(false), 'resize-none')}
              placeholder="Дополнительная информация о ресурсе"
            />
          </div>

          {!isBulkMode && (
            <div>
              <label className="mb-1 block text-sm font-medium text-secondary">
                Фотографии
              </label>
              <label
                htmlFor="photos"
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-default bg-raised px-4 py-3 text-sm text-secondary transition-colors hover:bg-hover"
              >
                <span className="font-medium text-blue-600">Выбрать фото</span>
                <span className="text-muted">или перетащите файлы сюда</span>
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
                <ul className="mt-2 space-y-1">
                  {photoFiles.map((file, i) => {
                    const isPrimary = primaryPhotoIndex === i || photoFiles.length === 1;
                    return (
                      <li
                        key={i}
                        className={cn(
                          'flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm',
                          isPrimary
                            ? 'border-blue-400 bg-blue-50 text-blue-900'
                            : 'border-default bg-raised text-secondary',
                        )}
                      >
                        {isPrimary ? (
                          <span className="shrink-0 text-xs font-semibold text-blue-600">Главная</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setPrimaryPhotoIndex(i)}
                            className="shrink-0 text-xs text-muted hover:text-blue-600 transition-colors"
                          >
                            Сделать главной
                          </button>
                        )}
                        <span className="min-w-0 flex-1 truncate">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removePhoto(i)}
                          className="shrink-0 text-red-500 hover:text-red-700"
                        >
                          Удалить
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          <label className="flex items-center gap-2 text-sm text-secondary">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => updateForm('is_active', e.target.checked)}
              className="h-4 w-4 rounded border-default text-blue-600"
            />
            Активен (в каталоге)
          </label>

          {isDesk && (
            <div className="space-y-3 rounded-xl border border-default bg-raised p-4">
              <p className="text-sm font-semibold text-secondary">Настройки стола</p>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                <label className="flex items-center gap-2 text-sm text-secondary">
                  <input
                    type="checkbox"
                    checked={form.has_monitor}
                    onChange={(e) => updateForm('has_monitor', e.target.checked)}
                    className="h-4 w-4 rounded border-default text-blue-600"
                  />
                  Монитор
                </label>
                <label className="flex items-center gap-2 text-sm text-secondary">
                  <input
                    type="checkbox"
                    checked={form.has_dock}
                    onChange={(e) => updateForm('has_dock', e.target.checked)}
                    className="h-4 w-4 rounded border-default text-blue-600"
                  />
                  Док-станция
                </label>
                <label className="flex items-center gap-2 text-sm text-secondary">
                  <input
                    type="checkbox"
                    checked={form.has_power_outlet}
                    onChange={(e) => updateForm('has_power_outlet', e.target.checked)}
                    className="h-4 w-4 rounded border-default text-blue-600"
                  />
                  Розетка
                </label>
                <label className="flex items-center gap-2 text-sm text-secondary">
                  <input
                    type="checkbox"
                    checked={form.is_hot_desk}
                    onChange={(e) => updateForm('is_hot_desk', e.target.checked)}
                    className="h-4 w-4 rounded border-default text-blue-600"
                  />
                  Hot desk
                </label>
              </div>
              <div>
                <label htmlFor="desk_assigned_company" className="mb-1 block text-sm font-medium text-secondary">
                  Закрепить за компанией (необязательно)
                </label>
                <select
                  id="desk_assigned_company"
                  value={form.assigned_company_id}
                  onChange={(e) => updateForm('assigned_company_id', e.target.value)}
                  className={inputClass(!!fieldErrors.assigned_company)}
                >
                  <option value="">— Не закреплять —</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Политика бронирования — для всех типов ресурсов */}
          <div className="space-y-3 rounded-xl border border-default bg-raised p-4">
            <p className="text-sm font-semibold text-secondary">Политика бронирования</p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="advance_booking_days" className="mb-1 block text-sm font-medium text-secondary">
                  Бронирование вперёд (дней)
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
              <div>
                <label htmlFor="min_cancel_minutes" className="mb-1 block text-sm font-medium text-secondary">
                  Минимум для отмены (минут)
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

          {requiresCapacity && (
            <div className="space-y-3 rounded-xl border border-default bg-raised p-4">
              <p className="text-sm font-semibold text-secondary">Настройки переговорной</p>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {RESOURCE_EQUIPMENT_KEYS.map((key) => (
                  <label key={key} className="flex items-center gap-2 text-sm text-secondary">
                    <input
                      type="checkbox"
                      checked={form.equipment[key]}
                      onChange={() => toggleEquipment(key)}
                      className="h-4 w-4 rounded border-default text-blue-600"
                    />
                    {RESOURCE_EQUIPMENT_LABELS[key]}
                  </label>
                ))}
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="min_duration_minutes" className="mb-1 block text-sm font-medium text-secondary">
                    Мин. длительность (мин)
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
                    <p className="mt-1 text-xs text-red-600">{fieldErrors.min_duration_minutes}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="max_duration_minutes" className="mb-1 block text-sm font-medium text-secondary">
                    Макс. длительность (мин)
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
                    <p className="mt-1 text-xs text-red-600">{fieldErrors.max_duration_minutes}</p>
                  )}
                </div>
              </div>
              <div>
                <label htmlFor="meeting_room_assigned_company" className="mb-1 block text-sm font-medium text-secondary">
                  Закрепить за компанией (необязательно)
                </label>
                <select
                  id="meeting_room_assigned_company"
                  value={form.assigned_company_id}
                  onChange={(e) => updateForm('assigned_company_id', e.target.value)}
                  className={inputClass(!!fieldErrors.assigned_company)}
                >
                  <option value="">— Не закреплять —</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {isParking && (
            <div className="space-y-3 rounded-xl border border-default bg-raised p-4">
              <p className="text-sm font-semibold text-secondary">Настройки парковки</p>
              <div>
                <label htmlFor="parking_type" className="mb-1 block text-sm font-medium text-secondary">
                  Тип парковки
                </label>
                <select
                  id="parking_type"
                  value={form.parking_type}
                  onChange={(e) => updateForm('parking_type', e.target.value as ParkingType)}
                  className={inputClass(!!fieldErrors.parking_type)}
                >
                  <option value={PARKING_TYPES.REGULAR}>Обычная</option>
                  <option value={PARKING_TYPES.VIP}>VIP</option>
                </select>
                {fieldErrors.parking_type && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.parking_type}</p>
                )}
              </div>
              <div>
                <label htmlFor="parking_assigned_company" className="mb-1 block text-sm font-medium text-secondary">
                  Закрепить за компанией (необязательно)
                </label>
                <select
                  id="parking_assigned_company"
                  value={form.assigned_company_id}
                  onChange={(e) => updateForm('assigned_company_id', e.target.value)}
                  className={inputClass(!!fieldErrors.assigned_company)}
                >
                  <option value="">— Не закреплять —</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {isCapsule && (
            <div className="space-y-3 rounded-xl border border-default bg-raised p-4">
              <p className="text-sm font-semibold text-secondary">Настройки капсулы</p>
              <div>
                <label htmlFor="capsule_zone" className="mb-1 block text-sm font-medium text-secondary">
                  Зона капсулы
                </label>
                <select
                  id="capsule_zone"
                  value={form.capsule_zone}
                  onChange={(e) => updateForm('capsule_zone', e.target.value as CapsuleZone)}
                  className={inputClass(!!fieldErrors.capsule_zone)}
                >
                  <option value={CAPSULE_ZONES.QUIET}>Тихая</option>
                  <option value={CAPSULE_ZONES.REGULAR}>Обычная</option>
                </select>
                {fieldErrors.capsule_zone && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.capsule_zone}</p>
                )}
              </div>
              <div>
                <label htmlFor="capsule_assigned_company" className="mb-1 block text-sm font-medium text-secondary">
                  Закрепить за компанией (необязательно)
                </label>
                <select
                  id="capsule_assigned_company"
                  value={form.assigned_company_id}
                  onChange={(e) => updateForm('assigned_company_id', e.target.value)}
                  className={inputClass(!!fieldErrors.assigned_company)}
                >
                  <option value="">— Не закреплять —</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <hr className="border-default" />
          <p className="text-sm font-semibold text-secondary">Доступность ресурса</p>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="availability_start" className="mb-1 block text-sm font-medium text-secondary">
                Начало
              </label>
              <input
                id="availability_start"
                type="time"
                value={form.availability_start}
                onChange={(e) => updateForm('availability_start', e.target.value)}
                className={inputClass(!!fieldErrors.availability_start || availabilityRangeInvalid)}
              />
            </div>
            <div>
              <label htmlFor="availability_end" className="mb-1 block text-sm font-medium text-secondary">
                Конец
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
            <p className="text-xs text-red-600">
              {fieldErrors.availability_start || 'Время начала должно быть раньше времени окончания.'}
            </p>
          )}

          <div>
            <p className="mb-2 text-sm font-medium text-secondary">Дни доступности</p>
            <div className="flex flex-wrap gap-2">
              {DAY_OPTIONS.map((day) => {
                const active = form.availability_days.includes(day.value);
                return (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    className={cn(
                      'rounded-md border px-3 py-1.5 text-sm transition-colors',
                      active
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-default text-secondary hover:bg-raised',
                    )}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
            {fieldErrors.availability_days && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.availability_days}</p>
            )}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isPending}
              className={cn(
                'rounded-lg px-5 py-2.5 text-sm font-semibold text-primary transition-colors',
                isPending ? 'cursor-not-allowed bg-blue-300' : 'bg-blue-600 hover:bg-blue-700',
              )}
            >
              {isPending ? 'Сохранение...' : isBulkMode ? 'Создать пачку ресурсов' : 'Создать ресурс'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/resources')}
              className="rounded-lg px-4 py-2.5 text-sm font-medium text-secondary transition-colors hover:bg-hover"
            >
              Отмена
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
