import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { BOOKING_STATUSES, RESOURCE_TYPES, RESOURCE_TYPE_LABELS, USER_ROLES } from '@/shared/config/constants';
import { useAuth } from '@/shared/hooks/useAuth';
import { getApiErrorMessage } from '@/shared/lib/apiError';
import { cn } from '@/shared/lib/cn';
import type {
  Booking,
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
  [BOOKING_STATUSES.CONFIRMED]: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  [BOOKING_STATUSES.CANCELLED]: 'bg-rose-100 text-rose-800 border-rose-200',
  [BOOKING_STATUSES.COMPLETED]: 'bg-blue-100 text-blue-800 border-blue-200',
  [BOOKING_STATUSES.NO_SHOW]: 'bg-amber-100 text-amber-800 border-amber-200',
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

  const { data: companiesData } = useQuery({
    queryKey: ['admin-bookings', 'company-options'],
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
        return response.results.map<SelectOption>((u) => ({
          id: u.id,
          label: `${u.first_name} ${u.last_name}`.trim() || u.email,
        }));
      }

      const companyIdForMembers = user?.company?.id;
      if (!companyIdForMembers) return [];

      const { data: response } = await apiClient.get<CompanyMember[] | PaginatedResponse<CompanyMember>>(
        API.companies.members(String(companyIdForMembers)),
      );
      const rows = Array.isArray(response) ? response : response.results;
      return rows.map<SelectOption>((member) => ({
        id: member.id,
        label: member.full_name || member.email,
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

  const queryErrorText = isError ? getApiErrorMessage(error, 'Не удалось загрузить бронирования.') : null;

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Управление бронированиями</h1>
          <p className="mt-1 text-sm text-gray-500">
            Фильтрация всех бронирований и административная отмена с обязательной причиной.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/bookings/catalog"
            className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
          >
            Каталог ресурсов
          </Link>
          <Link
            to="/bookings/my"
            className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
          >
            Мои бронирования
          </Link>
        </div>
      </div>

      <section className="grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        {isSuperadmin && (
          <label className="text-sm text-gray-700">
            Компания
            <select
              value={companyId}
              onChange={(e) => {
                setCompanyId(e.target.value);
                setPage(1);
              }}
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
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
        <label className="text-sm text-gray-700">
          Пользователь
          <select
            value={userId}
            onChange={(e) => {
              setUserId(e.target.value);
              setPage(1);
            }}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
          >
            <option value="">Все пользователи</option>
            {userOptions.map((option) => (
              <option key={option.id} value={String(option.id)}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-gray-700">
          Ресурс
          <select
            value={resourceId}
            onChange={(e) => {
              setResourceId(e.target.value);
              setPage(1);
            }}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
          >
            <option value="">Все ресурсы</option>
            {resourceOptions.map((option) => (
              <option key={option.id} value={String(option.id)}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-gray-700">
          Тип ресурса
          <select
            value={resourceType}
            onChange={(e) => {
              setResourceType(e.target.value);
              setPage(1);
            }}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
          >
            {RESOURCE_TYPE_OPTIONS.map((option) => (
              <option key={option.value || 'all'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-gray-700">
          Статус
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value || 'all'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-gray-700">
          Date from
          <input
            type="datetime-local"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
          />
        </label>
        <label className="text-sm text-gray-700">
          Date to
          <input
            type="datetime-local"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
          />
        </label>
        <div className="flex items-end">
          <button
            type="button"
            onClick={resetFilters}
            className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100"
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

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-4 py-3 text-sm text-gray-600">
          Найдено: <span className="font-semibold text-gray-900">{totalCount}</span>
        </div>
        {isLoading ? (
          <div className="px-4 py-10 text-sm text-gray-500">Загрузка бронирований…</div>
        ) : rows.length === 0 ? (
          <div className="px-4 py-10 text-sm text-gray-500">Ничего не найдено по текущим фильтрам.</div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {rows.map((booking) => {
              const statusClass =
                STATUS_BADGE_CLASS[booking.status] ?? 'bg-gray-100 text-gray-700 border-gray-200';
              const canAdminCancel = booking.status === BOOKING_STATUSES.CONFIRMED;

              return (
                <li
                  key={booking.id}
                  className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/bookings/${booking.id}`}
                        className="text-sm font-semibold text-gray-900 hover:text-blue-700"
                      >
                        {booking.resource_name}
                      </Link>
                      <span className={cn('rounded-full border px-2 py-0.5 text-xs font-medium', statusClass)}>
                        {STATUS_LABEL[booking.status] ?? booking.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-600">
                      Бронирование #{booking.id} · Пользователь: {booking.user_name} · Компания:{' '}
                      {booking.company
                        ? (companyNameById.get(booking.company) ??
                          user?.company?.name ??
                          `Компания #${booking.company}`)
                        : '—'}
                    </p>
                    <p className="text-xs text-gray-600">
                      {new Date(booking.start_time).toLocaleString()} —{' '}
                      {new Date(booking.end_time).toLocaleString()}
                    </p>
                    {booking.cancel_reason ? (
                      <p className="mt-1 text-xs text-rose-700">Причина отмены: {booking.cancel_reason}</p>
                    ) : null}
                  </div>
                  <div className="shrink-0">
                    {canAdminCancel ? (
                      <button
                        type="button"
                        onClick={() => openCancelModal(booking)}
                        className="rounded-lg border border-rose-300 px-3 py-2 text-xs font-medium text-rose-700 hover:bg-rose-50"
                      >
                        Админ-отмена
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">Недоступно для статуса {booking.status}</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Административная отмена бронирования"
          onClick={closeCancelModal}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-5 shadow-xl"
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

            <div className="mt-4 flex justify-end gap-2">
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
    </main>
  );
}
