import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import {
  BOOKING_STATUSES,
  RESOURCE_TYPES,
  RESOURCE_TYPE_LABELS,
  STAFF_UI_PREFIX,
  USER_ROLES,
} from '@/shared/config/constants';
import { useAuth } from '@/shared/hooks/useAuth';
import { getApiErrorMessage } from '@/shared/lib/apiError';
import { companiesCacheRoot } from '@/shared/lib/companyQueryKeys';
import { cn } from '@/shared/lib/cn';
import type {
  Booking,
  BookingResourceDetail,
  BookingResourceListItem,
  Company,
  CompanyMember,
  PaginatedResponse,
  UserListItem,
} from '@/shared/types';

const PAGE_SIZE = 20;

const STATUS_LABEL: Record<string, string> = {
  [BOOKING_STATUSES.CONFIRMED]: 'Подтверждено',
  [BOOKING_STATUSES.CANCELLED]: 'Отменено',
  [BOOKING_STATUSES.COMPLETED]: 'Завершено',
  [BOOKING_STATUSES.NO_SHOW]: 'Неявка',
};

const STATUS_BADGE_CLASS: Record<string, string> = {
  [BOOKING_STATUSES.CONFIRMED]: 'bg-emerald-900/60 text-emerald-300 border-emerald-700',
  [BOOKING_STATUSES.CANCELLED]: 'bg-rose-900/60 text-rose-300 border-rose-700',
  [BOOKING_STATUSES.COMPLETED]: 'bg-blue-900/60 text-blue-300 border-blue-700',
  [BOOKING_STATUSES.NO_SHOW]: 'bg-amber-900/60 text-amber-300 border-amber-700',
};

const RESOURCE_TYPE_OPTIONS = [
  { value: '', label: 'Все типы' },
  { value: RESOURCE_TYPES.DESK, label: RESOURCE_TYPE_LABELS[RESOURCE_TYPES.DESK] },
  { value: RESOURCE_TYPES.MEETING_ROOM, label: RESOURCE_TYPE_LABELS[RESOURCE_TYPES.MEETING_ROOM] },
  { value: RESOURCE_TYPES.PARKING, label: RESOURCE_TYPE_LABELS[RESOURCE_TYPES.PARKING] },
  { value: RESOURCE_TYPES.CAPSULE, label: RESOURCE_TYPE_LABELS[RESOURCE_TYPES.CAPSULE] },
];

const STATUS_OPTIONS = [
  { value: '', label: 'Все статусы' },
  { value: BOOKING_STATUSES.CONFIRMED, label: STATUS_LABEL[BOOKING_STATUSES.CONFIRMED] },
  { value: BOOKING_STATUSES.CANCELLED, label: STATUS_LABEL[BOOKING_STATUSES.CANCELLED] },
  { value: BOOKING_STATUSES.COMPLETED, label: STATUS_LABEL[BOOKING_STATUSES.COMPLETED] },
  { value: BOOKING_STATUSES.NO_SHOW, label: STATUS_LABEL[BOOKING_STATUSES.NO_SHOW] },
];

function localDateTimeToIso(value: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

type SelectOption = { id: number; label: string };
type UserOption = SelectOption & {
  email?: string;
  role?: string;
  companyId?: number | null;
};

function toDateTimeLocalValue(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function ManageBookingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isSuperadmin = user?.role === USER_ROLES.SUPERADMIN;

  const [page, setPage] = useState(1);
  const [companyId, setCompanyId] = useState('');
  const [userId, setUserId] = useState('');
  const [resourceId, setResourceId] = useState('');
  const [resourceType, setResourceType] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelFormError, setCancelFormError] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<Booking | null>(null);
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [selectedParticipantId, setSelectedParticipantId] = useState('');
  const [editFormError, setEditFormError] = useState<string | null>(null);

  const { data: companiesData } = useQuery({
    queryKey: [...companiesCacheRoot(user?.id), 'admin-bookings', 'company-options'],
    enabled: isSuperadmin,
    queryFn: async () => {
      const { data: response } = await apiClient.get<PaginatedResponse<Company>>(API.companies.list, {
        params: { page_size: 1000 },
      });
      return response.results;
    },
  });

  const { data: usersData } = useQuery({
    queryKey: ['admin-bookings', 'user-options', isSuperadmin, user?.company?.id],
    enabled: Boolean(user && (isSuperadmin || user?.company?.id)),
    queryFn: async () => {
      if (isSuperadmin) {
        const { data: response } = await apiClient.get<PaginatedResponse<UserListItem>>(API.users.list, {
          params: { page_size: 1000 },
        });
        return response.results.map<UserOption>((u) => ({
          id: u.id,
          label: `${u.first_name} ${u.last_name}`.trim() || u.email,
          email: u.email,
          role: u.role,
          companyId: u.company?.id ?? null,
        }));
      }

      const companyIdForMembers = user?.company?.id;
      if (!companyIdForMembers) return [];

      const { data: response } = await apiClient.get<CompanyMember[] | PaginatedResponse<CompanyMember>>(
        API.companies.members(String(companyIdForMembers)),
        { params: { page_size: 1000 } },
      );
      const rows = Array.isArray(response) ? response : response.results;
      return rows.map<UserOption>((member) => ({
        id: member.id,
        label: member.full_name || member.email,
        email: member.email,
        role: member.role,
      }));
    },
  });

  const { data: resourcesData } = useQuery({
    queryKey: ['admin-bookings', 'resource-options'],
    queryFn: async () => {
      const { data: response } = await apiClient.get<PaginatedResponse<BookingResourceListItem>>(
        API.bookings.resources.list,
        { params: { page_size: 1000, ordering: 'name' } },
      );
      return response.results;
    },
  });

  const companyOptions = (companiesData ?? []).map<SelectOption>((company) => ({
    id: company.id,
    label: company.name,
  }));
  const userOptions = usersData ?? [];
  const resourceOptions = (resourcesData ?? []).map<SelectOption>((resource) => ({
    id: resource.id,
    label: resource.name,
  }));

  const companyNameById = useMemo(() => {
    const entries = companyOptions.map((company) => [company.id, company.label] as const);
    return new Map<number, string>(entries);
  }, [companyOptions]);

  const queryParams = useMemo(() => {
    const params: Record<string, string | number> = {
      page,
      page_size: PAGE_SIZE,
      ordering: '-start_time',
    };

    if (isSuperadmin && companyId) {
      params.company_id = Number(companyId);
    }
    if (userId) params.user_id = Number(userId);
    if (resourceId) params.resource_id = Number(resourceId);

    if (resourceType) params.resource_type = resourceType;
    if (statusFilter) params.status = statusFilter;

    const fromIso = localDateTimeToIso(dateFrom);
    if (fromIso) params.date_from = fromIso;

    const toIso = localDateTimeToIso(dateTo);
    if (toIso) params.date_to = toIso;

    return params;
  }, [page, isSuperadmin, companyId, userId, resourceId, resourceType, statusFilter, dateFrom, dateTo]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-bookings', queryParams],
    queryFn: async () => {
      const { data: response } = await apiClient.get<PaginatedResponse<Booking>>(
        API.bookings.reservations.list,
        { params: queryParams },
      );
      return response;
    },
    refetchInterval: 30_000,
  });

  const { data: editBookingData } = useQuery({
    queryKey: ['admin-bookings', 'edit-booking', editTarget?.id],
    enabled: Boolean(editTarget?.id),
    queryFn: async () => {
      const { data: response } = await apiClient.get<Booking>(
        API.bookings.reservations.detail(String(editTarget!.id)),
      );
      return response;
    },
  });

  const modalBooking = editBookingData ?? editTarget;

  const { data: editResourceData } = useQuery({
    queryKey: ['admin-bookings', 'edit-resource', modalBooking?.resource],
    enabled: Boolean(modalBooking?.resource),
    queryFn: async () => {
      const { data: response } = await apiClient.get<BookingResourceDetail>(
        API.bookings.resources.detail(String(modalBooking!.resource)),
      );
      return response;
    },
  });

  const adminCancelMutation = useMutation({
    mutationFn: async ({ bookingId, reason }: { bookingId: number; reason: string }) => {
      await apiClient.post(API.bookings.reservations.adminCancel(String(bookingId)), { reason });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
      setCancelTarget(null);
      setCancelReason('');
      setCancelFormError(null);
    },
    onError: (mutationError) => {
      setCancelFormError(getApiErrorMessage(mutationError));
    },
  });

  const updateTimeMutation = useMutation({
    mutationFn: async ({ bookingId, startTime, endTime }: { bookingId: number; startTime: string; endTime: string }) => {
      await apiClient.patch(API.bookings.reservations.detail(String(bookingId)), {
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
      await queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      setEditFormError(null);
    },
    onError: (mutationError) => {
      setEditFormError(getApiErrorMessage(mutationError, 'Не удалось обновить время.'));
    },
  });

  const addParticipantMutation = useMutation({
    mutationFn: async ({ bookingId, userId }: { bookingId: number; userId: number }) => {
      await apiClient.post(API.bookings.reservations.addParticipants(String(bookingId)), {
        user_ids: [userId],
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-bookings', 'edit-booking'] });
      setSelectedParticipantId('');
      setEditFormError(null);
    },
    onError: (mutationError) => {
      setEditFormError(getApiErrorMessage(mutationError, 'Не удалось добавить участника.'));
    },
  });

  const removeParticipantMutation = useMutation({
    mutationFn: async ({ bookingId, userId }: { bookingId: number; userId: number }) => {
      await apiClient.delete(API.bookings.reservations.removeParticipant(String(bookingId), String(userId)));
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-bookings', 'edit-booking'] });
      setEditFormError(null);
    },
    onError: (mutationError) => {
      setEditFormError(getApiErrorMessage(mutationError, 'Не удалось удалить участника.'));
    },
  });

  const rows = data?.results ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const resetFilters = () => {
    setPage(1);
    setCompanyId('');
    setUserId('');
    setResourceId('');
    setResourceType('');
    setStatusFilter('');
    setDateFrom('');
    setDateTo('');
  };

  const openCancelModal = (booking: Booking) => {
    setCancelTarget(booking);
    setCancelReason('');
    setCancelFormError(null);
  };

  const closeCancelModal = () => {
    if (adminCancelMutation.isPending) return;
    setCancelTarget(null);
    setCancelReason('');
    setCancelFormError(null);
  };

  const submitAdminCancel = () => {
    if (!cancelTarget) return;
    const reason = cancelReason.trim();
    if (!reason) {
      setCancelFormError('Укажите причину отмены.');
      return;
    }
    adminCancelMutation.mutate({ bookingId: cancelTarget.id, reason });
  };

  const openEditModal = (booking: Booking) => {
    setEditTarget(booking);
    setEditStart(toDateTimeLocalValue(booking.start_time));
    setEditEnd(toDateTimeLocalValue(booking.end_time));
    setSelectedParticipantId('');
    setEditFormError(null);
  };

  const closeEditModal = () => {
    if (updateTimeMutation.isPending || addParticipantMutation.isPending || removeParticipantMutation.isPending) return;
    setEditTarget(null);
    setEditStart('');
    setEditEnd('');
    setSelectedParticipantId('');
    setEditFormError(null);
  };

  const submitEditTime = () => {
    if (!editTarget) return;
    if (!editStart || !editEnd) {
      setEditFormError('Укажите start_time и end_time.');
      return;
    }
    setEditFormError(null);
    updateTimeMutation.mutate({
      bookingId: editTarget.id,
      startTime: editStart,
      endTime: editEnd,
    });
  };

  const queryErrorText = isError ? getApiErrorMessage(error, 'Не удалось загрузить бронирования.') : null;

  return (
    <main className="mx-auto max-w-7xl space-y-4 sm:space-y-6 px-3 py-4 sm:px-4 sm:py-6 md:py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Управление бронированиями</h1>
          <p className="mt-1 text-sm text-gray-400">
            Фильтрация всех бронирований и административная отмена с обязательной причиной.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Link
            to="/bookings/catalog"
            className="inline-flex items-center rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm font-medium text-gray-200 hover:bg-gray-700"
          >
            Каталог ресурсов
          </Link>
          <Link
            to="/bookings/my"
            className="inline-flex items-center rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm font-medium text-gray-200 hover:bg-gray-700"
          >
            Мои бронирования
          </Link>
        </div>
      </div>

      <section className="grid gap-3 rounded-2xl border border-gray-700 bg-gray-800 p-3 sm:p-4 sm:grid-cols-2 lg:grid-cols-4">
        {isSuperadmin && (
          <label className="text-sm text-gray-300">
            Компания
            <select
              value={companyId}
              onChange={(e) => {
                setCompanyId(e.target.value);
                setPage(1);
              }}
              className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
            >
              <option value="">Все компании</option>
              {companyOptions.map((option) => (
                <option key={option.id} value={String(option.id)}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="text-sm text-gray-300">
          Пользователь
          <select
            value={userId}
            onChange={(e) => {
              setUserId(e.target.value);
              setPage(1);
            }}
            className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
          >
            <option value="">Все пользователи</option>
            {userOptions.map((option) => (
              <option key={option.id} value={String(option.id)}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-gray-300">
          Ресурс
          <select
            value={resourceId}
            onChange={(e) => {
              setResourceId(e.target.value);
              setPage(1);
            }}
            className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
          >
            <option value="">Все ресурсы</option>
            {resourceOptions.map((option) => (
              <option key={option.id} value={String(option.id)}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-gray-300">
          Тип ресурса
          <select
            value={resourceType}
            onChange={(e) => {
              setResourceType(e.target.value);
              setPage(1);
            }}
            className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
          >
            {RESOURCE_TYPE_OPTIONS.map((option) => (
              <option key={option.value || 'all'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-gray-300">
          Статус
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value || 'all'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-gray-300">
          Date from
          <input
            type="datetime-local"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="text-sm text-gray-300">
          Date to
          <input
            type="datetime-local"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
          />
        </label>
        <div className="flex items-end">
          <button
            type="button"
            onClick={resetFilters}
            className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm font-medium text-gray-200 hover:bg-gray-700"
          >
            Сбросить фильтры
          </button>
        </div>
      </section>

      {queryErrorText && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {queryErrorText}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-gray-700 bg-gray-800">
        <div className="border-b border-gray-700 px-4 py-3 text-sm text-gray-400">
          Найдено: <span className="font-semibold text-white">{totalCount}</span>
        </div>
        {isLoading ? (
          <div className="px-4 py-10 text-sm text-gray-400">Загрузка бронирований…</div>
        ) : rows.length === 0 ? (
          <div className="px-4 py-10 text-sm text-gray-400">Ничего не найдено по текущим фильтрам.</div>
        ) : (
          <ul className="divide-y divide-gray-700/60">
            {rows.map((booking) => {
              const statusClass =
                STATUS_BADGE_CLASS[booking.status] ?? 'bg-gray-100 text-gray-700 border-gray-200';
              const canAdminCancel = booking.status === BOOKING_STATUSES.CONFIRMED;
              const canEdit = booking.status === BOOKING_STATUSES.CONFIRMED;

              return (
                <li
                  key={booking.id}
                  className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`${STAFF_UI_PREFIX}/bookings/${booking.id}`}
                        className="text-sm font-semibold text-white hover:text-indigo-300"
                      >
                        {booking.resource_name}
                      </Link>
                      <span className={cn('rounded-full border px-2 py-0.5 text-xs font-medium', statusClass)}>
                        {STATUS_LABEL[booking.status] ?? booking.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-400">
                      Бронирование #{booking.id} · Пользователь: {booking.user_name} · Компания:{' '}
                      {booking.company
                        ? (companyNameById.get(booking.company) ??
                          user?.company?.name ??
                          `Компания #${booking.company}`)
                        : '—'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(booking.start_time).toLocaleString()} —{' '}
                      {new Date(booking.end_time).toLocaleString()}
                    </p>
                    {booking.checked_in_at && (
                      <p className="text-xs text-green-300">
                        Check-in: {new Date(booking.checked_in_at).toLocaleString()}
                      </p>
                    )}
                    {booking.cancel_reason ? (
                      <p className="mt-1 text-xs text-rose-300">Причина отмены: {booking.cancel_reason}</p>
                    ) : null}
                  </div>
                  <div className="shrink-0 w-full lg:w-auto">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      {canEdit ? (
                        <button
                          type="button"
                          onClick={() => openEditModal(booking)}
                          className="rounded-lg border border-indigo-700 px-3 py-2 text-xs font-medium text-indigo-300 hover:bg-indigo-900/30"
                        >
                          Изменить
                        </button>
                      ) : null}
                      {canAdminCancel ? (
                        <button
                          type="button"
                          onClick={() => openCancelModal(booking)}
                          className="rounded-lg border border-rose-800 px-3 py-2 text-xs font-medium text-rose-300 hover:bg-rose-900/30"
                        >
                          Админ-отмена
                        </button>
                      ) : (
                        <span className="text-xs text-gray-500">Недоступно для статуса {booking.status}</span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Назад
          </button>
          <span className="text-sm text-gray-600">
            Страница {page} из {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Вперёд
          </button>
        </div>
      )}

      {cancelTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Административная отмена бронирования"
          onClick={closeCancelModal}
        >
          <div
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-gray-900">Административная отмена</h2>
            <p className="mt-1 text-sm text-gray-600">
              Бронирование #{cancelTarget.id} ({cancelTarget.resource_name}, {cancelTarget.user_name})
            </p>

            <label className="mt-4 block text-sm text-gray-700">
              Причина отмены
              <textarea
                rows={3}
                value={cancelReason}
                onChange={(event) => {
                  setCancelReason(event.target.value);
                  if (cancelFormError) setCancelFormError(null);
                }}
                placeholder="Укажите причину для пользователя"
                className="mt-1 w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              />
            </label>

            {cancelFormError && (
              <p className="mt-2 text-sm text-rose-700" role="alert">
                {cancelFormError}
              </p>
            )}

            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeCancelModal}
                disabled={adminCancelMutation.isPending}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Закрыть
              </button>
              <button
                type="button"
                onClick={submitAdminCancel}
                disabled={adminCancelMutation.isPending}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {adminCancelMutation.isPending ? 'Отмена…' : 'Подтвердить отмену'}
              </button>
            </div>
          </div>
        </div>
      )}
      {editTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Изменение бронирования"
          onClick={closeEditModal}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-gray-900">Изменение бронирования #{modalBooking?.id ?? editTarget.id}</h2>
            <p className="mt-1 text-sm text-gray-600">
              {modalBooking?.resource_name ?? editTarget.resource_name} · {modalBooking?.user_name ?? editTarget.user_name}
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-sm text-gray-700">
                Начало
                <input
                  type="datetime-local"
                  value={editStart}
                  onChange={(event) => setEditStart(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                />
              </label>
              <label className="text-sm text-gray-700">
                Конец
                <input
                  type="datetime-local"
                  value={editEnd}
                  onChange={(event) => setEditEnd(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                />
              </label>
            </div>

            {editResourceData?.type === RESOURCE_TYPES.MEETING_ROOM ? (
              <div className="mt-4 space-y-3">
                <label className="text-sm text-gray-700">
                  Добавить участника
                  <select
                    value={selectedParticipantId}
                    onChange={(event) => setSelectedParticipantId(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                  >
                    <option value="">Выберите пользователя</option>
                    {userOptions
                      .filter((option) => option.role === USER_ROLES.EMPLOYEE)
                      .filter((option) => {
                        if (!isSuperadmin) return true;
                        if (!modalBooking?.company) return true;
                        return option.companyId === modalBooking.company;
                      })
                      .filter((option) => option.id !== (modalBooking?.user ?? editTarget.user))
                      .filter((option) =>
                        !(modalBooking?.participants ?? []).some((participant) => participant.email === option.email),
                      )
                      .map((option) => (
                        <option key={option.id} value={String(option.id)}>
                          {option.label}{option.email ? ` (${option.email})` : ''}
                        </option>
                      ))}
                  </select>
                </label>
                <button
                  type="button"
                  disabled={!selectedParticipantId || addParticipantMutation.isPending}
                  onClick={() => {
                    addParticipantMutation.mutate({
                      bookingId: modalBooking?.id ?? editTarget.id,
                      userId: Number(selectedParticipantId),
                    });
                  }}
                  className="rounded-lg border border-blue-300 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                >
                  Добавить участника
                </button>
                <ul className="space-y-2">
                  {(modalBooking?.participants ?? []).map((participant) => (
                    <li
                      key={participant.id}
                      className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2"
                    >
                      <span className="text-sm text-gray-700">{participant.full_name || participant.email}</span>
                      <button
                        type="button"
                        disabled={removeParticipantMutation.isPending}
                        onClick={() => {
                          removeParticipantMutation.mutate({
                            bookingId: modalBooking?.id ?? editTarget.id,
                            userId: participant.id,
                          });
                        }}
                        className="rounded-lg border border-rose-300 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                      >
                        Удалить
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="mt-4 text-sm text-gray-500">
                Управление участниками доступно только для бронирований переговорок.
              </p>
            )}

            {editFormError && (
              <p className="mt-3 text-sm text-rose-700" role="alert">
                {editFormError}
              </p>
            )}

            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeEditModal}
                disabled={updateTimeMutation.isPending}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Закрыть
              </button>
              <button
                type="button"
                onClick={submitEditTime}
                disabled={updateTimeMutation.isPending}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {updateTimeMutation.isPending ? 'Сохранение…' : 'Сохранить время'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
