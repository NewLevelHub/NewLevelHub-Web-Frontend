import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useMutation } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { RESOURCE_TYPES } from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';
import type { Resource } from '@/shared/types';

type ResourceTypeValue = (typeof RESOURCE_TYPES)[keyof typeof RESOURCE_TYPES];

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
};

type BulkCreatePayload = {
  template: Omit<ResourceCreatePayload, 'name'>;
  count: number;
  name_prefix: string;
};

const DAY_OPTIONS = [
  { value: 0, label: 'Вс' },
  { value: 1, label: 'Пн' },
  { value: 2, label: 'Вт' },
  { value: 3, label: 'Ср' },
  { value: 4, label: 'Чт' },
  { value: 5, label: 'Пт' },
  { value: 6, label: 'Сб' },
];

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
    'w-full rounded-lg border px-3 py-2 text-sm text-gray-900 focus:border-transparent focus:outline-none focus:ring-2',
    hasError ? 'border-red-400 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500',
  );
}

export default function ResourceCreatePage() {
  const navigate = useNavigate();
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<FormState>({
    type: RESOURCE_TYPES.DESK,
    name: '',
    floor: '1',
    zone: '',
    description: '',
    capacity: '',
    availability_start: '09:00',
    availability_end: '18:00',
    availability_days: [1, 2, 3, 4, 5],
  });
  const [bulk, setBulk] = useState<BulkState>({
    name_prefix: 'Стол',
    count: '10',
  });

  const createMutation = useMutation({
    mutationFn: (payload: ResourceCreatePayload) =>
      apiClient.post<Resource>(API.bookings.resources.create, payload).then((res) => res.data),
    onSuccess: () => navigate('/resources'),
    onError: (error) => {
      const parsed = parseError(error);
      setFieldErrors(parsed.fieldErrors);
      setGeneralError(parsed.message);
    },
  });

  const bulkCreateMutation = useMutation({
    mutationFn: (payload: BulkCreatePayload) =>
      apiClient.post<Resource[]>(API.bookings.resources.bulkCreate, payload).then((res) => res.data),
    onSuccess: () => navigate('/resources'),
    onError: (error) => {
      const parsed = parseError(error);
      setFieldErrors(parsed.fieldErrors);
      setGeneralError(parsed.message);
    },
  });

  const isPending = createMutation.isPending || bulkCreateMutation.isPending;
  const requiresCapacity = form.type === RESOURCE_TYPES.MEETING_ROOM;

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

  function buildTemplate(): Omit<ResourceCreatePayload, 'name'> {
    const payload: Omit<ResourceCreatePayload, 'name'> = {
      type: form.type,
      floor: Number(form.floor),
      availability_start: form.availability_start,
      availability_end: form.availability_end,
      availability_days: form.availability_days,
    };

    if (form.zone.trim()) payload.zone = form.zone.trim();
    if (form.description.trim()) payload.description = form.description.trim();
    if (requiresCapacity) payload.capacity = Number(form.capacity);

    return payload;
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setGeneralError(null);
    setFieldErrors({});

    if (!form.floor || Number(form.floor) < 1) {
      setFieldErrors({ floor: 'Укажите корректный этаж (>= 1).' });
      return;
    }

    if (requiresCapacity && (!form.capacity || Number(form.capacity) < 1)) {
      setFieldErrors({ capacity: 'Для переговорной вместимость обязательна (>= 1).' });
      return;
    }

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
        setFieldErrors({ name_prefix: 'Укажите префикс имени для bulk-create.' });
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

    createMutation.mutate({
      ...buildTemplate(),
      name: form.name.trim(),
    });
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div className="space-y-1">
        <button
          type="button"
          onClick={() => navigate('/resources')}
          className="text-sm font-medium text-gray-500 transition-colors hover:text-gray-900"
        >
          Назад к ресурсам
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Добавление ресурсов</h1>
        <p className="text-sm text-gray-500">Создайте один ресурс или сразу пачку через bulk-create.</p>
      </div>

      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-5 inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
          <button
            type="button"
            onClick={() => setIsBulkMode(false)}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              !isBulkMode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
            )}
          >
            Один ресурс
          </button>
          <button
            type="button"
            onClick={() => setIsBulkMode(true)}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              isBulkMode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
            )}
          >
            Bulk-create
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
              <label htmlFor="type" className="mb-1 block text-sm font-medium text-gray-700">
                Тип ресурса
              </label>
              <select
                id="type"
                value={form.type}
                onChange={(e) => updateForm('type', e.target.value as ResourceTypeValue)}
                className={inputClass(!!fieldErrors.type)}
              >
                <option value={RESOURCE_TYPES.DESK}>Стол</option>
                <option value={RESOURCE_TYPES.MEETING_ROOM}>Переговорная</option>
                <option value={RESOURCE_TYPES.PARKING}>Парковка</option>
                <option value={RESOURCE_TYPES.CAPSULE}>Капсула</option>
              </select>
            </div>

            <div>
              <label htmlFor="floor" className="mb-1 block text-sm font-medium text-gray-700">
                Этаж
              </label>
              <input
                id="floor"
                type="number"
                min={1}
                value={form.floor}
                onChange={(e) => updateForm('floor', e.target.value)}
                className={inputClass(!!fieldErrors.floor)}
              />
              {fieldErrors.floor && <p className="mt-1 text-xs text-red-600">{fieldErrors.floor}</p>}
            </div>
          </div>

          {!isBulkMode && (
            <div>
              <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700">
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
                <label htmlFor="name_prefix" className="mb-1 block text-sm font-medium text-gray-700">
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
                <label htmlFor="count" className="mb-1 block text-sm font-medium text-gray-700">
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
              <label htmlFor="zone" className="mb-1 block text-sm font-medium text-gray-700">
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
                <label htmlFor="capacity" className="mb-1 block text-sm font-medium text-gray-700">
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
            <label htmlFor="description" className="mb-1 block text-sm font-medium text-gray-700">
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

          <hr className="border-gray-100" />
          <p className="text-sm font-semibold text-gray-700">Доступность ресурса</p>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="availability_start" className="mb-1 block text-sm font-medium text-gray-700">
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
              <label htmlFor="availability_end" className="mb-1 block text-sm font-medium text-gray-700">
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
            <p className="mb-2 text-sm font-medium text-gray-700">Дни доступности</p>
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
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50',
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
                'rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-colors',
                isPending ? 'cursor-not-allowed bg-blue-300' : 'bg-blue-600 hover:bg-blue-700',
              )}
            >
              {isPending ? 'Сохранение...' : isBulkMode ? 'Создать пачку ресурсов' : 'Создать ресурс'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/resources')}
              className="rounded-lg px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
            >
              Отмена
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
