import { Link, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { BOOKING_STATUSES } from '@/shared/config/constants';
import type { Booking } from '@/shared/types';

const STATUS_LABEL: Record<string, string> = {
  [BOOKING_STATUSES.CONFIRMED]: 'Подтверждено',
  [BOOKING_STATUSES.CANCELLED]: 'Отменено',
  [BOOKING_STATUSES.COMPLETED]: 'Завершено',
  [BOOKING_STATUSES.NO_SHOW]: 'Неявка',
};

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const bookingId = id ?? '';

  const { data, isLoading, isError } = useQuery({
    queryKey: ['booking-reservation', bookingId],
    enabled: Boolean(bookingId),
    queryFn: async () => {
      const { data: res } = await apiClient.get<Booking>(
        API.bookings.reservations.detail(bookingId),
      );
      return res;
    },
  });

  if (!bookingId) {
    return (
      <main className="px-4 py-8 max-w-lg mx-auto">
        <p className="text-sm text-red-600">Некорректная ссылка.</p>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="px-4 py-8 max-w-lg mx-auto">
        <p className="text-sm text-gray-500">Загрузка…</p>
      </main>
    );
  }

  if (isError || !data) {
    return (
      <main className="px-4 py-8 max-w-lg mx-auto space-y-3">
        <p className="text-sm text-red-600">Бронирование не найдено.</p>
        <Link to="/bookings/my" className="text-sm text-blue-600 hover:underline">
          Мои бронирования
        </Link>
      </main>
    );
  }

  const start = new Date(data.start_time);
  const end = new Date(data.end_time);

  return (
    <main className="px-4 py-8 max-w-lg mx-auto space-y-6">
      <Link to="/bookings/my" className="text-sm text-blue-600 hover:underline">
        ← Мои бронирования
      </Link>
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-3">
        <h1 className="text-xl font-bold text-gray-900">{data.resource_name}</h1>
        <p className="text-sm text-gray-600">
          {start.toLocaleString()} — {end.toLocaleString()}
        </p>
        <p className="text-sm">
          <span className="font-medium text-gray-700">Статус: </span>
          {STATUS_LABEL[data.status] ?? data.status}
        </p>
        {data.description ? (
          <p className="text-sm text-gray-600">{data.description}</p>
        ) : null}
        {data.participants?.length ? (
          <p className="text-xs text-gray-500">
            Участники: {data.participants.join(', ')}
          </p>
        ) : null}
      </div>
    </main>
  );
}
