import { useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import {
  SERVICE_REQUEST_TYPES,
  SERVICE_REQUEST_TYPE_LABEL_KEYS,
  type ServiceRequestType,
} from '@/shared/config/constants';
import { getApiError } from '@/shared/lib/getApiError';
import type { PaginatedResponse, ServiceRequest } from '@/shared/types';

type ServiceFloorOption = {
  id: number;
  number?: number;
  floor_number?: number;
  name?: string | null;
};

function normalizeServiceFloors(payload: ServiceFloorOption[] | PaginatedResponse<ServiceFloorOption>) {
  return Array.isArray(payload) ? payload : payload.results;
}

function formatFloorOptionLabel(floor: ServiceFloorOption): string {
  const floorNumber = floor.number ?? floor.floor_number ?? floor.id;
  const floorName = floor.name?.trim();
  return floorName ? `Этаж ${floorNumber} — ${floorName}` : `Этаж ${floorNumber}`;
}

export default function ServiceRequestCreatePage() {
  const { t } = useTranslation();
  const typeOptions = useMemo(
    () => [
      { value: SERVICE_REQUEST_TYPES.GENERAL, label: t(SERVICE_REQUEST_TYPE_LABEL_KEYS[SERVICE_REQUEST_TYPES.GENERAL]) },
      { value: SERVICE_REQUEST_TYPES.CLEANING, label: t(SERVICE_REQUEST_TYPE_LABEL_KEYS[SERVICE_REQUEST_TYPES.CLEANING]) },
      { value: SERVICE_REQUEST_TYPES.REPAIR, label: t(SERVICE_REQUEST_TYPE_LABEL_KEYS[SERVICE_REQUEST_TYPES.REPAIR]) },
      { value: SERVICE_REQUEST_TYPES.SUPPLIES, label: t(SERVICE_REQUEST_TYPE_LABEL_KEYS[SERVICE_REQUEST_TYPES.SUPPLIES]) },
    ],
    [t],
  );
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [requestType, setRequestType] = useState<ServiceRequestType>(SERVICE_REQUEST_TYPES.GENERAL);
  const [description, setDescription] = useState('');
  const [floorId, setFloorId] = useState('');
  const [location, setLocation] = useState('');
  const [urgency, setUrgency] = useState<'normal' | 'urgent'>('normal');
  const [photo, setPhoto] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: (payload: FormData) =>
      apiClient.post<ServiceRequest>(API.serviceRequests.create, payload).then((r) => r.data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['service-requests'] });
      void navigate('/service-requests');
    },
    onError: (err: unknown) => {
      setFormError(getApiError(err).message);
    },
  });

  const {
    data: floors = [],
    isLoading: isFloorsLoading,
    error: floorsError,
  } = useQuery({
    queryKey: ['building-floors'],
    queryFn: () =>
      apiClient
        .get<ServiceFloorOption[] | PaginatedResponse<ServiceFloorOption>>(API.serviceRequests.floors, {
          params: { page_size: 500 },
        })
        .then((r) => normalizeServiceFloors(r.data)),
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (!floorId) {
      setFormError(t('resources.create.floorRequired'));
      return;
    }
    if (!location.trim()) {
      setFormError('Укажите место.');
      return;
    }
    if (!description.trim()) {
      setFormError('Заполните описание заявки.');
      return;
    }

    const payload = new FormData();
    payload.append('request_type', requestType);
    payload.append('description', description.trim());
    payload.append('urgency', urgency);
    payload.append('floor', floorId);
    payload.append('location', location.trim());
    if (photo) payload.append('photo', photo);
    createMutation.mutate(payload);
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-primary">Новая сервисная заявка</h1>
        <p className="text-sm text-secondary">
          Опишите проблему или запрос — мы назначим исполнителя.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-default bg-raised p-5"
      >
        <label className="block text-sm text-secondary">
          Тип заявки
          <select
            value={requestType}
            onChange={(e) => setRequestType(e.target.value as ServiceRequestType)}
            className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary"
          >
            {typeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm text-secondary">
            Выбор этажа
            <p className="mt-1 text-xs text-muted">
              Здесь только этажи из справочника здания. Поле «этаж» в профиле компании к заявкам не
              подключается — справочник настраивает супер-администратор.
            </p>
            <select
              value={floorId}
              onChange={(e) => setFloorId(e.target.value)}
              disabled={isFloorsLoading}
              required
              className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary"
            >
              {isFloorsLoading ? (
                <option value="">Загрузка этажей...</option>
              ) : (
                <>
                  <option value="">Выберите этаж</option>
                  {floors.length === 0 ? (
                    <option value="__no_floors" disabled>
                      Этажи не настроены
                    </option>
                  ) : (
                    floors.map((floor) => (
                      <option key={floor.id} value={String(floor.id)}>
                        {formatFloorOptionLabel(floor)}
                      </option>
                    ))
                  )}
                </>
              )}
            </select>
            {floorsError ? (
              <p className="mt-1 text-xs text-warning">
                Не удалось загрузить этажи. Без этажа отправка невозможна.
              </p>
            ) : null}
          </label>

          <label className="block text-sm text-secondary">
            Место
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary"
              placeholder="Переговорка A, кухня..."
            />
          </label>
        </div>

        <label className="block text-sm text-secondary">
          Описание
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            required
            className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary placeholder:text-muted"
            placeholder="Опишите проблему или запрос подробнее"
          />
        </label>

        <label className="block text-sm text-secondary">
          Фото (необязательно)
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
            className="mt-1 block w-full cursor-pointer rounded-lg border border-default bg-surface px-3 py-2 text-sm text-secondary file:mr-3 file:rounded-md file:border-0 file:bg-hover file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary hover:file:bg-gray-600"
          />
          {photo ? <p className="mt-1 text-xs text-secondary">Выбрано: {photo.name}</p> : null}
        </label>

        <label className="block text-sm text-secondary">
          Срочность
          <select
            value={urgency}
            onChange={(e) => setUrgency(e.target.value as 'normal' | 'urgent')}
            className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary"
          >
            <option value="normal">Обычная</option>
            <option value="urgent">Срочная</option>
          </select>
        </label>

        {formError ? (
          <div
            className="rounded-lg border border-rose-800 bg-rose-950/30 px-3 py-2 text-sm text-rose-300"
            role="alert"
          >
            {formError}
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-2">
          <Link
            to="/service-requests"
            className="inline-flex items-center rounded-lg border border-default bg-transparent px-4 py-2 text-sm font-medium text-secondary hover:bg-hover"
          >{t('common.cancel')}</Link>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="inline-flex items-center rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
          >
            {createMutation.isPending ? t('common.submittingPlain') : 'Создать заявку'}
          </button>
        </div>
      </form>
    </main>
  );
}
