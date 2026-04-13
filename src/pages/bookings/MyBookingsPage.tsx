import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { BOOKING_STATUSES } from '@/shared/config/constants';
import type { Booking, PaginatedResponse } from '@/shared/types';

const STATUS_LABEL: Record<string, string> = {
  [BOOKING_STATUSES.CONFIRMED]: 'Подтверждено',
  [BOOKING_STATUSES.CANCELLED]: 'Отменено',
  [BOOKING_STATUSES.COMPLETED]: 'Завершено',
  [BOOKING_STATUSES.NO_SHOW]: 'Неявка',
};

export default function MyBookingsPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['my-bookings'],
    queryFn: async () => {
      const { data: res } = await apiClient.get<PaginatedResponse<Booking>>(
        API.bookings.reservations.my,
      );
      return res;
    },
  });

  const rows = data?.results ?? [];

  return (
    <main className="px-4 py-8 max-w-3xl mx-auto space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Мои бронирования</h1>
        <Link
          to="/bookings/catalog"
          className="text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          Каталог ресурсов
        </Link>
      </div>

      {isError && (
        <p className="text-sm text-red-600">Не удалось загрузить список.</p>
      )}

      {isLoading ? (
        <p className="text-sm text-gray-500">Загрузка…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-500">Пока нет бронирований.</p>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-2xl border border-gray-100 bg-white shadow-sm">
          {rows.map((b) => {
            const start = new Date(b.start_time);
            return (
              <li key={b.id}>
                <Link
                  to={`/bookings/${b.id}`}
                  className="flex flex-col gap-1 px-4 py-3 hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-gray-900">{b.resource_name}</p>
                    <p className="text-xs text-gray-500">
                      {start.toLocaleString()} — {new Date(b.end_time).toLocaleString()}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-gray-600">
                    {STATUS_LABEL[b.status] ?? b.status}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
