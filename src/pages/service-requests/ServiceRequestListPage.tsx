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
  ServiceRequestCleaningPayload,
  ServiceRequestCreatePayload,
  ServiceRequestRatePayload,
  ServiceRequestUpdateStatusPayload,
} from '@/shared/types';

const STATUS_BADGE_CLASS: Record<ServiceRequestStatus, string> = {
  [SERVICE_REQUEST_STATUSES.NEW]: 'bg-sky-900/60 text-sky-300',
  [SERVICE_REQUEST_STATUSES.ACCEPTED]: 'bg-amber-900/60 text-amber-300',
  [SERVICE_REQUEST_STATUSES.IN_PROGRESS]: 'bg-indigo-900/60 text-indigo-300',
  [SERVICE_REQUEST_STATUSES.COMPLETED]: 'bg-emerald-900/60 text-emerald-300',
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

type CreateModalState =
  | { mode: 'general' }
  | { mode: 'cleaning' };

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
  const [createFloor, setCreateFloor] = useState('');
  const [createLocation, setCreateLocation] = useState('');
  const [createUrgency, setCreateUrgency] = useState<'normal' | 'urgent'>('normal');

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

  const createMutation = useMutation({
    mutationFn: (payload: ServiceRequestCreatePayload) =>
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
    mutationFn: (payload: ServiceRequestCleaningPayload) =>
      apiClient.post<ServiceRequest>(API.serviceRequests.cleaning, payload).then((r) => r.data),
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
    setCreateFloor('');
    setCreateLocation('');
    setCreateUrgency('normal');
    setMutationError(null);
    setCreateModal({ mode: 'general' });
  }

  function openCleaningModal() {
    setCreateDescription('');
    setCreateFloor('');
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

    if (createModal.mode === 'cleaning') {
      cleaningMutation.mutate({
        description: createDescription.trim() || undefined,
        floor: createFloor ? Number(createFloor) : undefined,
      });
    } else {
      createMutation.mutate({
        request_type: createType,
        description: createDescription.trim(),
        floor: createFloor ? Number(createFloor) : undefined,
        location: createLocation.trim() || undefined,
        urgency: createUrgency,
      });
    }
  }

  function handleUpdateStatus(request: ServiceRequest) {
    const next = SERVICE_REQUEST_STATUS_TRANSITIONS[request.status];
    if (!next) return;
    const isOwner = user?.id === request.user;
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
        <h1 className="text-2xl font-bold text-white">Сервисные заявки</h1>
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
            className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            Создать заявку
          </button>
        </div>
      </div>

      {/* Filters */}
      <section className="grid gap-3 rounded-xl border border-gray-700 bg-gray-800 p-4 sm:grid-cols-2">
        <label className="text-sm text-gray-300">
          Тип
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as ServiceRequestType | '')}
            className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
          >
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value || 'all-types'} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-gray-300">
          Статус
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ServiceRequestStatus | '')}
            className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
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
        <p className="text-sm text-gray-400">Загрузка...</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-400">Заявок пока нет.</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-700 bg-gray-800">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700/60">
              <thead className="bg-gray-900/60">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">Тип</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">Статус</th>
                  {isAdmin && (
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">Сотрудник</th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">Описание</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">Этаж</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">Создана</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">Оценка</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/60">
                {rows.map((req) => {
                  const nextStatus = SERVICE_REQUEST_STATUS_TRANSITIONS[req.status];
                  const isOwner = user?.id === req.user;
                  const canRate =
                    isOwner &&
                    req.status === SERVICE_REQUEST_STATUSES.COMPLETED &&
                    req.rating === null;

                  return (
                    <tr key={req.id} className="text-sm text-gray-200">
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
                        <td className="whitespace-nowrap px-4 py-3 text-gray-300">
                          {req.user_name || '—'}
                        </td>
                      )}
                      <td className="max-w-xs px-4 py-3 text-gray-300">
                        <span className="line-clamp-2">{req.description || '—'}</span>
                      </td>
                      <td className="px-4 py-3">{req.floor ?? '—'}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-400">
                        {new Date(req.created_at).toLocaleDateString('ru-RU')}
                      </td>
                      <td className="px-4 py-3">
                        {req.rating !== null ? (
                          <span className="flex items-center gap-1 text-amber-400">
                            <Star className="h-3.5 w-3.5 fill-amber-400" aria-hidden="true" />
                            {req.rating}
                          </span>
                        ) : (
                          <span className="text-gray-500">—</span>
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
                              className="rounded-md border border-indigo-700 bg-indigo-900/30 px-2 py-1 text-xs text-indigo-300 hover:bg-indigo-900/50 disabled:opacity-50"
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
                              className="inline-flex items-center gap-1.5 rounded-md bg-amber-500 px-3 py-1.5 text-xs font-semibold text-gray-900 shadow-sm hover:bg-amber-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 disabled:opacity-50"
                            >
                              <Star className="h-3.5 w-3.5 fill-gray-900" aria-hidden="true" />
                              Оценить
                            </button>
                          ) : null}

                          {!canChangeStatus && !canRate ? (
                            <span className="text-xs text-gray-500">—</span>
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
            className="w-full max-w-lg rounded-xl border border-gray-700 bg-gray-800 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-white">
              {createModal.mode === 'cleaning' ? 'Вызвать уборку' : 'Новая сервисная заявка'}
            </h2>

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4">
              {/* Type selector — only for general mode */}
              {createModal.mode === 'general' ? (
                <label className="block text-sm text-gray-300">
                  Тип заявки
                  <select
                    value={createType}
                    onChange={(e) => setCreateType(e.target.value as ServiceRequestType)}
                    className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
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
              <label className="block text-sm text-gray-300">
                Этаж (необязательно)
                <input
                  type="number"
                  value={createFloor}
                  onChange={(e) => setCreateFloor(e.target.value)}
                  min={1}
                  className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
                  placeholder="Например: 3"
                />
              </label>

              {/* Location — only for general mode */}
              {createModal.mode === 'general' ? (
                <label className="block text-sm text-gray-300">
                  Место (необязательно)
                  <input
                    type="text"
                    value={createLocation}
                    onChange={(e) => setCreateLocation(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
                    placeholder="Переговорка A, туалет, кухня..."
                  />
                </label>
              ) : null}

              {/* Description */}
              <label className="block text-sm text-gray-300">
                Описание{createModal.mode === 'general' ? '' : ' (необязательно)'}
                <textarea
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  rows={3}
                  required={createModal.mode === 'general'}
                  className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder:text-gray-500"
                  placeholder={
                    createModal.mode === 'cleaning'
                      ? 'Уточнения при необходимости'
                      : 'Опишите проблему или запрос'
                  }
                />
              </label>

              {/* Urgency — only for general mode */}
              {createModal.mode === 'general' ? (
                <label className="block text-sm text-gray-300">
                  Срочность
                  <select
                    value={createUrgency}
                    onChange={(e) => setCreateUrgency(e.target.value as 'normal' | 'urgent')}
                    className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
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
                  className="rounded-lg border border-gray-600 px-3 py-2 text-sm text-gray-200 hover:bg-gray-700"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || cleaningMutation.isPending}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
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
            className="w-full max-w-sm rounded-xl border border-gray-700 bg-gray-800 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-white">
              {rateModal.autoOpened ? 'Заявка выполнена!' : 'Оценить заявку'}
            </h2>
            <p className="mt-1 text-sm text-gray-400">
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
                        : 'fill-gray-700 text-gray-600 hover:text-amber-300',
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
                className="rounded-lg border border-gray-600 px-3 py-2 text-sm text-gray-200 hover:bg-gray-700"
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={rateMutation.isPending}
                onClick={() =>
                  rateMutation.mutate({ id: rateModal.requestId, rating: ratingValue })
                }
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50"
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
