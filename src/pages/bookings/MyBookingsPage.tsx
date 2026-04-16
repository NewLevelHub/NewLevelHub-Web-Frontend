import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { BOOKING_STATUSES, RESOURCE_TYPES, RESOURCE_TYPE_LABELS, USER_ROLES } from '@/shared/config/constants';
import { useAuth } from '@/shared/hooks/useAuth';
import { cn } from '@/shared/lib/cn';
import type { Booking, PaginatedResponse } from '@/shared/types';

type MyBookingsStatusFilter = 'upcoming' | 'past' | 'cancelled';

const STATUS_LABEL: Record<string, string> = {
  [BOOKING_STATUSES.CONFIRMED]: 'Подтверждено',
  [BOOKING_STATUSES.CANCELLED]: 'Отменено',
  [BOOKING_STATUSES.COMPLETED]: 'Завершено',
  [BOOKING_STATUSES.NO_SHOW]: 'Не явился',
};

const STATUS_BADGE_CLASS: Record<string, string> = {
  [BOOKING_STATUSES.CONFIRMED]: 'bg-green-100 text-green-800',
  [BOOKING_STATUSES.COMPLETED]: 'bg-gray-100 text-gray-600',
  [BOOKING_STATUSES.CANCELLED]: 'bg-red-100 text-red-700',
  [BOOKING_STATUSES.NO_SHOW]: 'bg-orange-100 text-orange-700',
};

const TAB_OPTIONS: Array<{ value: MyBookingsStatusFilter; label: string }> = [
  { value: 'upcoming', label: 'Предстоящие' },
  { value: 'past', label: 'Прошедшие' },
  { value: 'cancelled', label: 'Отмененные' },
];

const RESOURCE_TYPE_OPTIONS = [
  { value: '', label: 'Все типы' },
  { value: RESOURCE_TYPES.DESK, label: RESOURCE_TYPE_LABELS[RESOURCE_TYPES.DESK] },
  { value: RESOURCE_TYPES.MEETING_ROOM, label: RESOURCE_TYPE_LABELS[RESOURCE_TYPES.MEETING_ROOM] },
  { value: RESOURCE_TYPES.PARKING, label: RESOURCE_TYPE_LABELS[RESOURCE_TYPES.PARKING] },
  { value: RESOURCE_TYPES.CAPSULE, label: RESOURCE_TYPE_LABELS[RESOURCE_TYPES.CAPSULE] },
];

function localDateTimeToIso(value: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

export default function MyBookingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [statusTab, setStatusTab] = useState<MyBookingsStatusFilter>('upcoming');
  const [resourceType, setResourceType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const queryParams = useMemo(() => {
    const params: Record<string, string> = { status: statusTab };
    if (resourceType) params.resource_type = resourceType;
    const fromIso = localDateTimeToIso(dateFrom);
    const toIso = localDateTimeToIso(dateTo);
    if (fromIso) params.date_from = fromIso;
    if (toIso) params.date_to = toIso;
    return params;
  }, [statusTab, resourceType, dateFrom, dateTo]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['my-bookings', queryParams],
    queryFn: async () => {
      const { data: res } = await apiClient.get<PaginatedResponse<Booking>>(
        API.bookings.reservations.my,
        { params: queryParams },
      );
      return res;
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async ({ bookingId }: { bookingId: number }) => {
      await apiClient.post(API.bookings.reservations.cancel(String(bookingId)), { reason: '' });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
    },
  });

  const rows = data?.results ?? [];

  return (
    <main className="px-4 py-8 max-w-3xl mx-auto space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Мои бронирования</h1>
        <div className="flex flex-wrap items-center gap-3">
          {(user?.role === USER_ROLES.SUPERADMIN || user?.role === USER_ROLES.COMPANY_ADMIN) && (
            <Link
              to="/admin/bookings"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Назад в бронирования (админ)
            </Link>
          )}
          <Link
            to="/bookings/catalog"
            className="text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            Каталог ресурсов
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border border-gray-200 bg-white p-2">
        {TAB_OPTIONS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setStatusTab(tab.value)}
            className={[
              'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              statusTab === tab.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <section className="grid gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-3">
        <label className="text-sm text-gray-700">
          Тип ресурса
          <select
            value={resourceType}
            onChange={(e) => setResourceType(e.target.value)}
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
          С даты
          <input
            type="datetime-local"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
          />
        </label>
        <label className="text-sm text-gray-700">
          По дату
          <input
            type="datetime-local"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
          />
        </label>
      </section>

      {isError && (
        <p className="text-sm text-red-600">Не удалось загрузить список.</p>
      )}
      {cancelMutation.isError && (
        <p className="text-sm text-red-600">Не удалось отменить бронирование.</p>
      )}

      {isLoading ? (
        <p className="text-sm text-gray-500">Загрузка…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-500">Пока нет бронирований.</p>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-2xl border border-gray-100 bg-white shadow-sm">
          {rows.map((b) => {
            const start = new Date(b.start_time);
            const canCancel = statusTab === 'upcoming' && b.status === BOOKING_STATUSES.CONFIRMED;
            return (
              <li key={b.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <Link
                  to={`/bookings/${b.id}`}
                  className="flex-1 rounded-lg p-1 hover:bg-gray-50"
                >
                  <p className="font-medium text-gray-900">{b.resource_name}</p>
                  <p className="text-xs text-gray-500">
                    {start.toLocaleString()} — {new Date(b.end_time).toLocaleString()}
                  </p>
                  <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', STATUS_BADGE_CLASS[b.status] ?? 'bg-gray-100 text-gray-600')}>
                    {STATUS_LABEL[b.status] ?? b.status}
                  </span>
                </Link>
                {canCancel ? (
                  <button
                    type="button"
                    onClick={() => cancelMutation.mutate({ bookingId: b.id })}
                    disabled={cancelMutation.isPending}
                    className="shrink-0 rounded-lg border border-red-300 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    Отменить
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
