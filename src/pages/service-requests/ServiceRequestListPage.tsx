import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Star } from 'lucide-react';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import {
  SERVICE_REQUEST_STATUSES,
  SERVICE_REQUEST_STATUS_LABELS,
  SERVICE_REQUEST_STATUS_TRANSITIONS,
  SERVICE_REQUEST_TYPES,
  SERVICE_REQUEST_TYPE_LABELS,
  USER_ROLES,
  type ServiceRequestStatus,
  type ServiceRequestType,
} from '@/shared/config/constants';
import { useAuth } from '@/shared/hooks/useAuth';
import { getApiErrorMessage } from '@/shared/lib/apiError';
import { cn } from '@/shared/lib/cn';
import type {
  PaginatedResponse,
  ServiceRequest,
  ServiceRequestRatePayload,
  ServiceRequestUpdateStatusPayload,
} from '@/shared/types';

const STATUS_BADGE_CLASS: Record<ServiceRequestStatus, string> = {
  [SERVICE_REQUEST_STATUSES.NEW]: 'bg-sky-900/60 text-sky-300',
  [SERVICE_REQUEST_STATUSES.ACCEPTED]: 'bg-warning-subtle text-warning',
  [SERVICE_REQUEST_STATUSES.IN_PROGRESS]: 'bg-brand-subtle text-brand',
  [SERVICE_REQUEST_STATUSES.COMPLETED]: 'bg-success-subtle text-success',
};

const TYPE_OPTIONS: Array<{ value: ServiceRequestType | ''; label: string }> = [
  { value: '', label: 'Все типы' },
  { value: SERVICE_REQUEST_TYPES.CLEANING, label: SERVICE_REQUEST_TYPE_LABELS[SERVICE_REQUEST_TYPES.CLEANING] },
  { value: SERVICE_REQUEST_TYPES.REPAIR, label: SERVICE_REQUEST_TYPE_LABELS[SERVICE_REQUEST_TYPES.REPAIR] },
  { value: SERVICE_REQUEST_TYPES.SUPPLIES, label: SERVICE_REQUEST_TYPE_LABELS[SERVICE_REQUEST_TYPES.SUPPLIES] },
  { value: SERVICE_REQUEST_TYPES.GENERAL, label: SERVICE_REQUEST_TYPE_LABELS[SERVICE_REQUEST_TYPES.GENERAL] },
];

const STATUS_OPTIONS: Array<{ value: ServiceRequestStatus | ''; label: string }> = [
  { value: '', label: 'Все статусы' },
  { value: SERVICE_REQUEST_STATUSES.NEW, label: SERVICE_REQUEST_STATUS_LABELS[SERVICE_REQUEST_STATUSES.NEW] },
  { value: SERVICE_REQUEST_STATUSES.ACCEPTED, label: SERVICE_REQUEST_STATUS_LABELS[SERVICE_REQUEST_STATUSES.ACCEPTED] },
  { value: SERVICE_REQUEST_STATUSES.IN_PROGRESS, label: SERVICE_REQUEST_STATUS_LABELS[SERVICE_REQUEST_STATUSES.IN_PROGRESS] },
  { value: SERVICE_REQUEST_STATUSES.COMPLETED, label: SERVICE_REQUEST_STATUS_LABELS[SERVICE_REQUEST_STATUSES.COMPLETED] },
];

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

/** Prefer API floor_number/floor_name; otherwise resolve Floor id against loaded floors (never show raw DB id). */
function formatServiceRequestFloorCell(req: ServiceRequest, floors: ServiceFloorOption[]): string {
  const n = req.floor_number;
  const name = req.floor_name?.trim();
  if (n != null) {
    return name ? `Этаж ${n} — ${name}` : `Этаж ${n}`;
  }
  if (req.floor != null) {
    const match = floors.find((f) => f.id === req.floor);
    if (match) return formatFloorOptionLabel(match);
  }
  return '—';
}

type CreateModalState =
  | { mode: 'general' }
  | { mode: 'cleaning' };

function getRequestOwnerId(request: ServiceRequest): number | null {
  const requestWithFallback = request as ServiceRequest & { user?: number; created_by?: number };
  const ownerId = requestWithFallback.user ?? requestWithFallback.created_by;
  return ownerId != null ? Number(ownerId) : null;
}

function getRequestOwnerName(request: ServiceRequest): string | null {
  const requestWithFallback = request as ServiceRequest & {
    user_name?: string | null;
    created_by_name?: string | null;
  };
  return requestWithFallback.user_name ?? requestWithFallback.created_by_name ?? null;
}

export default function ServiceRequestListPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [typeFilter, setTypeFilter] = useState<ServiceRequestType | ''>('');
  const [statusFilter, setStatusFilter] = useState<ServiceRequestStatus | ''>('');
  const [mutationError, setMutationError] = useState<string | null>(null);

  // Create modal state
  const [createModal, setCreateModal] = useState<CreateModalState | null>(null);
  const [createType, setCreateType] = useState<ServiceRequestType>(SERVICE_REQUEST_TYPES.GENERAL);
  const [createDescription, setCreateDescription] = useState('');
  const [createFloorId, setCreateFloorId] = useState('');
  const [createLocation, setCreateLocation] = useState('');
  const [createUrgency, setCreateUrgency] = useState<'normal' | 'urgent'>('normal');
  const [createPhoto, setCreatePhoto] = useState<File | null>(null);

  // Rate modal state
  const [rateModal, setRateModal] = useState<{ requestId: number; autoOpened?: boolean } | null>(null);
  const [ratingValue, setRatingValue] = useState(5);

  const isAdmin =
    user?.role === USER_ROLES.SUPERADMIN || user?.role === USER_ROLES.COMPANY_ADMIN;
  const canChangeStatus = user?.role === USER_ROLES.SUPERADMIN;

  const queryParams: Record<string, string> = {};
  if (typeFilter) queryParams.type = typeFilter;
  if (statusFilter) queryParams.status = statusFilter;

  const { data, isLoading, error } = useQuery({
    queryKey: ['service-requests', queryParams],
    queryFn: () =>
      apiClient
        .get<PaginatedResponse<ServiceRequest>>(API.serviceRequests.list, { params: queryParams })
        .then((r) => r.data),
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

  const createMutation = useMutation({
    mutationFn: (payload: FormData) =>
      apiClient.post<ServiceRequest>(API.serviceRequests.create, payload).then((r) => r.data),
    onSuccess: async () => {
      setMutationError(null);
      closeCreateModal(true);
      await queryClient.invalidateQueries({ queryKey: ['service-requests'] });
    },
    onError: (err) => {
      setMutationError(getApiErrorMessage(err, 'Не удалось создать заявку.'));
    },
  });

  const cleaningMutation = useMutation({
    mutationFn: (payload: FormData) =>
      apiClient.post<ServiceRequest>(API.serviceRequests.quickCleaning, payload).then((r) => r.data),
    onSuccess: async () => {
      setMutationError(null);
      closeCreateModal(true);
      await queryClient.invalidateQueries({ queryKey: ['service-requests'] });
    },
    onError: (err) => {
      setMutationError(getApiErrorMessage(err, 'Не удалось создать заявку на уборку.'));
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: ServiceRequestStatus; isOwner: boolean }) =>
      apiClient
        .patch<ServiceRequest>(API.serviceRequests.updateStatus(String(id)), {
          status,
        } satisfies ServiceRequestUpdateStatusPayload)
        .then((r) => r.data),
    onSuccess: async (updatedRequest, variables) => {
      setMutationError(null);
      await queryClient.invalidateQueries({ queryKey: ['service-requests'] });
      if (
        variables.status === SERVICE_REQUEST_STATUSES.COMPLETED &&
        variables.isOwner &&
        updatedRequest.rating === null
      ) {
        openRateModal(variables.id, true);
      }
    },
    onError: (err) => {
      setMutationError(getApiErrorMessage(err, 'Не удалось изменить статус.'));
    },
  });

  const rateMutation = useMutation({
    mutationFn: ({ id, rating }: { id: number; rating: number }) =>
      apiClient
        .post<ServiceRequest>(API.serviceRequests.rate(String(id)), {
          rating,
        } satisfies ServiceRequestRatePayload)
        .then((r) => r.data),
    onSuccess: async () => {
      setMutationError(null);
      setRateModal(null);
      await queryClient.invalidateQueries({ queryKey: ['service-requests'] });
    },
    onError: (err) => {
      setMutationError(getApiErrorMessage(err, 'Не удалось оценить заявку.'));
    },
  });

  function openGeneralModal() {
    setCreateType(SERVICE_REQUEST_TYPES.GENERAL);
    setCreateDescription('');
    setCreateFloorId('');
    setCreateLocation('');
    setCreateUrgency('normal');
    setCreatePhoto(null);
    setMutationError(null);
    setCreateModal({ mode: 'general' });
  }

  function openCleaningModal() {
    setCreateDescription('');
    setCreateFloorId('');
    setCreatePhoto(null);
    setMutationError(null);
    setCreateModal({ mode: 'cleaning' });
  }

  function closeCreateModal(force = false) {
    if (!force && (createMutation.isPending || cleaningMutation.isPending)) return;
    setCreateModal(null);
    setMutationError(null);
  }

  function handleCreateSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMutationError(null);

    if (!createModal) return;
    if (!createFloorId) {
      setMutationError('Выберите этаж.');
      return;
    }
    if (!createLocation.trim()) {
      setMutationError('Укажите место.');
      return;
    }
    if (!createDescription.trim()) {
      setMutationError('Добавьте описание заявки.');
      return;
    }

    const payload = new FormData();

    if (createModal.mode === 'cleaning') {
      payload.append('description', createDescription.trim());
      payload.append('floor', createFloorId);
      payload.append('location', createLocation.trim());
      if (createPhoto) payload.append('photo', createPhoto);
      cleaningMutation.mutate(payload);
    } else {
      payload.append('request_type', createType);
      payload.append('description', createDescription.trim());
      payload.append('urgency', createUrgency);
      payload.append('floor', createFloorId);
      payload.append('location', createLocation.trim());
      if (createPhoto) payload.append('photo', createPhoto);
      createMutation.mutate(payload);
    }
  }

  function handleUpdateStatus(request: ServiceRequest) {
    const next = SERVICE_REQUEST_STATUS_TRANSITIONS[request.status];
    if (!next) return;
    const ownerId = getRequestOwnerId(request);
    const isOwner = user?.id != null && ownerId != null && Number(user.id) === ownerId;
    updateStatusMutation.mutate({ id: request.id, status: next, isOwner });
  }

  function openRateModal(requestId: number, autoOpened = false) {
    setRatingValue(5);
    setMutationError(null);
    setRateModal({ requestId, autoOpened });
  }

  function closeRateModal() {
    if (rateMutation.isPending) return;
    setRateModal(null);
  }

  const rows = data?.results ?? [];
  const isPendingMutation =
    createMutation.isPending ||
    cleaningMutation.isPending ||
    updateStatusMutation.isPending ||
    rateMutation.isPending;

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-primary">Сервисные заявки</h1>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openCleaningModal}
            className="inline-flex items-center justify-center rounded-lg border border-sky-700 bg-sky-900/30 px-4 py-2 text-sm font-medium text-sky-300 hover:bg-sky-900/50"
          >
            Вызвать уборку
          </button>
          <button
            type="button"
            onClick={openGeneralModal}
            className="inline-flex items-center justify-center rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
          >
            Создать заявку
          </button>
        </div>
      </div>

      {/* Filters */}
      <section className="grid gap-3 rounded-xl border border-default bg-raised p-4 sm:grid-cols-2">
        <label className="text-sm text-secondary">
          Тип
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as ServiceRequestType | '')}
            className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary"
          >
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value || 'all-types'} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-secondary">
          Статус
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ServiceRequestStatus | '')}
            className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value || 'all-statuses'} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </section>

      {/* Mutation error */}
      {mutationError ? (
        <div
          className="rounded-lg border border-rose-800 bg-rose-950/30 px-3 py-2 text-sm text-rose-300"
          role="alert"
        >
          {mutationError}
        </div>
      ) : null}

      {/* Query error */}
      {error ? (
        <div
          className="rounded-lg border border-rose-800 bg-rose-950/30 px-3 py-2 text-sm text-rose-300"
          role="alert"
        >
          {getApiErrorMessage(error, 'Не удалось загрузить заявки.')}
        </div>
      ) : null}

      {/* List */}
      {isLoading ? (
        <p className="text-sm text-secondary">Загрузка...</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-secondary">Заявок пока нет.</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-default bg-raised">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[color:var(--border)]/60">
              <thead className="bg-surface/60">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-secondary">Тип</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-secondary">Статус</th>
                  {isAdmin && (
                    <th className="px-4 py-3 text-left text-xs font-semibold text-secondary">Сотрудник</th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-semibold text-secondary">Описание</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-secondary">Фото</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-secondary">Этаж</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-secondary">Создана</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-secondary">Оценка</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-secondary">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--border)]/60">
                {rows.map((req) => {
                  const nextStatus = SERVICE_REQUEST_STATUS_TRANSITIONS[req.status];
                  const ownerId = getRequestOwnerId(req);
                  const isOwner = user?.id != null && ownerId != null && Number(user.id) === ownerId;
                  const canRate =
                    isOwner &&
                    req.status === SERVICE_REQUEST_STATUSES.COMPLETED &&
                    req.rating === null;

                  return (
                    <tr key={req.id} className="text-sm text-secondary">
                      <td className="px-4 py-3">
                        {SERVICE_REQUEST_TYPE_LABELS[req.request_type] ?? req.request_type}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                            STATUS_BADGE_CLASS[req.status],
                          )}
                        >
                          {SERVICE_REQUEST_STATUS_LABELS[req.status] ?? req.status}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="whitespace-nowrap px-4 py-3 text-secondary">
                          {getRequestOwnerName(req) || '—'}
                        </td>
                      )}
                      <td className="max-w-xs px-4 py-3 text-secondary">
                        <span className="line-clamp-2">{req.description || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        {req.photo ? (
                          <a
                            href={req.photo}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 text-xs text-sky-300 hover:text-sky-200"
                          >
                            <img
                              src={req.photo}
                              alt="Фото заявки"
                              className="h-8 w-8 rounded object-cover ring-1 ring-gray-600"
                            />
                            Открыть
                          </a>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">{formatServiceRequestFloorCell(req, floors)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-secondary">
                        {new Date(req.created_at).toLocaleDateString('ru-RU')}
                      </td>
                      <td className="px-4 py-3">
                        {req.rating !== null ? (
                          <span className="flex items-center gap-1 text-amber-400">
                            <Star className="h-3.5 w-3.5 fill-amber-400" aria-hidden="true" />
                            {req.rating}
                          </span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {/* Superadmin: advance status */}
                          {canChangeStatus && nextStatus ? (
                            <button
                              type="button"
                              disabled={isPendingMutation}
                              onClick={() => handleUpdateStatus(req)}
                              className="rounded-md border border-default bg-brand-subtle px-2 py-1 text-xs text-brand hover:bg-brand-subtle disabled:opacity-50"
                            >
                              {SERVICE_REQUEST_STATUS_LABELS[nextStatus]}
                            </button>
                          ) : null}

                          {/* Employee: rate completed request */}
                          {canRate ? (
                            <button
                              type="button"
                              disabled={isPendingMutation}
                              onClick={() => openRateModal(req.id)}
                              aria-label="Оценить выполненную заявку"
                              className="inline-flex items-center gap-1.5 rounded-md bg-amber-500 px-3 py-1.5 text-xs font-semibold text-primary shadow-sm hover:bg-amber-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 disabled:opacity-50"
                            >
                              <Star className="h-3.5 w-3.5 fill-gray-900" aria-hidden="true" />
                              Оценить
                            </button>
                          ) : null}

                          {!canChangeStatus && !canRate ? (
                            <span className="text-xs text-muted">—</span>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / Cleaning Modal */}
      {createModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => closeCreateModal()}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-default bg-raised p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-primary">
              {createModal.mode === 'cleaning' ? 'Вызвать уборку' : 'Новая сервисная заявка'}
            </h2>

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4">
              {/* Type selector — only for general mode */}
              {createModal.mode === 'general' ? (
                <label className="block text-sm text-secondary">
                  Тип заявки
                  <select
                    value={createType}
                    onChange={(e) => setCreateType(e.target.value as ServiceRequestType)}
                    className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary"
                  >
                    {TYPE_OPTIONS.filter((opt) => opt.value !== '').map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {/* Floor */}
              <label className="block text-sm text-secondary">
                Выбор этажа
                <p className="mt-1 text-xs text-muted">
                  Справочник этажей здания; не путать с полем «этаж» в настройках компании. Пустой
                  список — в БД нет записей Floor (их создаёт супер-админ).
                </p>
                <select
                  value={createFloorId}
                  onChange={(e) => setCreateFloorId(e.target.value)}
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
                  value={createLocation}
                  onChange={(e) => setCreateLocation(e.target.value)}
                  required
                  className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary"
                  placeholder="Переговорка A, туалет, кухня..."
                />
              </label>

              {/* Description */}
              <label className="block text-sm text-secondary">
                Описание
                <textarea
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  rows={3}
                  required
                  className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary placeholder:text-muted"
                  placeholder="Опишите проблему или запрос"
                />
              </label>

              <label className="block text-sm text-secondary">
                Фото (необязательно)
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setCreatePhoto(e.target.files?.[0] ?? null)}
                  className="mt-1 block w-full cursor-pointer rounded-lg border border-default bg-surface px-3 py-2 text-sm text-secondary file:mr-3 file:rounded-md file:border-0 file:bg-hover file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary hover:file:bg-gray-600"
                />
                {createPhoto ? (
                  <p className="mt-1 text-xs text-secondary">Выбрано: {createPhoto.name}</p>
                ) : null}
              </label>

              {/* Urgency — only for general mode */}
              {createModal.mode === 'general' ? (
                <label className="block text-sm text-secondary">
                  Срочность
                  <select
                    value={createUrgency}
                    onChange={(e) => setCreateUrgency(e.target.value as 'normal' | 'urgent')}
                    className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary"
                  >
                    <option value="normal">Обычная</option>
                    <option value="urgent">Срочная</option>
                  </select>
                </label>
              ) : null}

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
                  onClick={() => closeCreateModal()}
                  disabled={createMutation.isPending || cleaningMutation.isPending}
                  className="rounded-lg border border-default px-3 py-2 text-sm text-secondary hover:bg-hover"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || cleaningMutation.isPending}
                  className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
                >
                  {createMutation.isPending || cleaningMutation.isPending
                    ? 'Отправка...'
                    : createModal.mode === 'cleaning'
                      ? 'Вызвать уборку'
                      : 'Создать заявку'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Rate Modal */}
      {rateModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          onClick={closeRateModal}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-default bg-raised p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-primary">
              {rateModal.autoOpened ? 'Заявка выполнена!' : 'Оценить заявку'}
            </h2>
            <p className="mt-1 text-sm text-secondary">
              {rateModal.autoOpened
                ? 'Пожалуйста, оцените качество выполненной работы'
                : 'Выберите оценку от 1 до 5'}
            </p>

            <div className="mt-4 flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRatingValue(star)}
                  aria-label={`Оценка ${star}`}
                  className="focus:outline-none"
                >
                  <Star
                    className={cn(
                      'h-8 w-8 transition-colors',
                      star <= ratingValue
                        ? 'fill-amber-400 text-amber-400'
                        : 'fill-gray-700 text-muted hover:text-warning',
                    )}
                  />
                </button>
              ))}
            </div>

            {mutationError ? (
              <div
                className="mt-3 rounded-lg border border-rose-800 bg-rose-950/30 px-3 py-2 text-sm text-rose-300"
                role="alert"
              >
                {mutationError}
              </div>
            ) : null}

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeRateModal}
                disabled={rateMutation.isPending}
                className="rounded-lg border border-default px-3 py-2 text-sm text-secondary hover:bg-hover"
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={rateMutation.isPending}
                onClick={() =>
                  rateMutation.mutate({ id: rateModal.requestId, rating: ratingValue })
                }
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-primary hover:bg-amber-500 disabled:opacity-50"
              >
                {rateMutation.isPending ? 'Сохраняем...' : 'Отправить оценку'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
