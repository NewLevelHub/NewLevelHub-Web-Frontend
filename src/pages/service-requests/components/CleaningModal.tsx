import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { dateLocaleTag } from '@/shared/lib/localeFormat';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { getApiError } from '@/shared/lib/getApiError';
import type { PaginatedResponse, ServiceRequest } from '@/shared/types';

type ServiceFloorOption = {
  id: number;
  number?: number;
  floor_number?: number;
  name?: string | null;
};

function normalizeServiceFloors(
  payload: ServiceFloorOption[] | PaginatedResponse<ServiceFloorOption>,
): ServiceFloorOption[] {
  return Array.isArray(payload) ? payload : payload.results;
}

function formatFloorOptionLabel(floor: ServiceFloorOption): string {
  const floorNumber = floor.number ?? floor.floor_number ?? floor.id;
  const floorName = floor.name?.trim();
  return floorName ? `Этаж ${floorNumber} — ${floorName}` : `Этаж ${floorNumber}`;
}

export interface CleaningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CleaningModal({ isOpen, onClose, onSuccess }: CleaningModalProps) {
  const { t, i18n } = useTranslation();
  const dateLocale = dateLocaleTag(i18n.language);
  const queryClient = useQueryClient();

  const [description, setDescription] = useState('');
  const [floorId, setFloorId] = useState('');
  const [location, setLocation] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const {
    data: floors = [],
    isLoading: isFloorsLoading,
    error: floorsError,
  } = useQuery({
    queryKey: ['building-floors'],
    queryFn: () =>
      apiClient
        .get<ServiceFloorOption[] | PaginatedResponse<ServiceFloorOption>>(
          API.serviceRequests.floors,
          { params: { page_size: 500 } },
        )
        .then((r) => normalizeServiceFloors(r.data)),
    enabled: isOpen,
  });

  const cleaningMutation = useMutation({
    mutationFn: (payload: FormData) =>
      apiClient
        .post<ServiceRequest>(API.serviceRequests.quickCleaning, payload)
        .then((r) => r.data),
    onSuccess: async () => {
      setMutationError(null);
      resetForm();
      onSuccess?.();
      await queryClient.invalidateQueries({ queryKey: ['service-requests'] });
      onClose();
    },
    onError: (err) => {
      setMutationError(getApiError(err).message);
    },
  });

  function resetForm() {
    setDescription('');
    setFloorId('');
    setLocation('');
    setPhoto(null);
    setMutationError(null);
  }

  function handleClose() {
    if (cleaningMutation.isPending) return;
    resetForm();
    onClose();
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMutationError(null);

    if (!floorId) {
      setMutationError(t('resources.create.floorRequired'));
      return;
    }
    if (!location.trim()) {
      setMutationError('Укажите место.');
      return;
    }
    if (!description.trim()) {
      setMutationError('Добавьте описание заявки.');
      return;
    }

    const payload = new FormData();
    payload.append('description', description.trim());
    payload.append('floor', floorId);
    payload.append('location', location.trim());
    if (photo) payload.append('photo', photo);

    cleaningMutation.mutate(payload);
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-lg rounded-xl border border-default bg-raised p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-primary">{t('serviceRequests.cleaning.call')}</h2>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Floor */}
          <label className="block text-sm text-secondary">
            Выбор этажа
            <p className="mt-1 text-xs text-muted">
              Справочник этажей здания; не путать с полем «этаж» в настройках компании. Пустой
              список — в БД нет записей Floor (их создаёт супер-админ).
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

          {/* Location */}
          <label className="block text-sm text-secondary">
            Место
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary"
              placeholder="Переговорка A, туалет, кухня..."
            />
          </label>

          {/* Description */}
          <label className="block text-sm text-secondary">
            Описание
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              required
              className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary placeholder:text-muted"
              placeholder="Опишите проблему или запрос"
            />
          </label>

          {/* Photo */}
          <label className="block text-sm text-secondary">
            Фото (необязательно)
            <input
              type="file"
              accept="image/*"
              lang={dateLocale}
              onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
              className="mt-1 block w-full cursor-pointer rounded-lg border border-default bg-surface px-3 py-2 text-sm text-secondary file:mr-3 file:rounded-md file:border-0 file:bg-hover file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary hover:file:bg-gray-600"
            />
            {photo ? (
              <p className="mt-1 text-xs text-secondary">Выбрано: {photo.name}</p>
            ) : null}
          </label>

          {mutationError ? (
            <div
              className="rounded-lg border border-rose-800 bg-rose-950/30 px-3 py-2 text-sm text-rose-300"
              role="alert"
            >
              {mutationError}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={cleaningMutation.isPending}
              className="rounded-lg border border-default px-3 py-2 text-sm text-secondary hover:bg-hover"
            >{t('common.cancel')}</button>
            <button
              type="submit"
              disabled={cleaningMutation.isPending}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
            >
              {cleaningMutation.isPending ? t('common.submittingPlain') : t('serviceRequests.cleaning.call')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
