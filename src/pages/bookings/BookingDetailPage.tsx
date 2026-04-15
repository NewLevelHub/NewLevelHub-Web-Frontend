import { Link, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { BOOKING_STATUSES, RESOURCE_TYPES, USER_ROLES } from '@/shared/config/constants';
import { useAuth } from '@/shared/hooks/useAuth';
import { cn } from '@/shared/lib/cn';
import type { Booking } from '@/shared/types';

const STATUS_LABEL: Record<string, string> = {
  [BOOKING_STATUSES.CONFIRMED]: 'Подтверждено',
  [BOOKING_STATUSES.CANCELLED]: 'Отменено',
  [BOOKING_STATUSES.COMPLETED]: 'Завершено',
  [BOOKING_STATUSES.NO_SHOW]: 'Неявка',
};

/** Map backend error detail strings to user-friendly Russian messages */
function mapCancelError(rawMessage: string, status?: number): string {
  if (status === 409) return 'Выбранное время уже занято';
  if (status === 403) return 'Нельзя отменить чужую бронь';
  if (rawMessage.includes('cancel your own')) return 'Нельзя отменить чужую бронь';
  return rawMessage || 'Произошла ошибка';
}

function getCancelError(error: unknown): string {
  const err = error as { response?: { status?: number; data?: { detail?: string } }; message?: string };
  const status = err.response?.status;
  const detail = err.response?.data?.detail ?? '';
  if (detail) return mapCancelError(detail, status);
  if (status === 403) return 'Нельзя отменить чужую бронь';
  return 'Не удалось отменить бронирование';
}

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const bookingId = id ?? '';
  const { user } = useAuth();
  const queryClient = useQueryClient();

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

  const cancelMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post(API.bookings.reservations.cancel(bookingId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-reservation', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
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

  // Show cancel button only to booking owner or admin/superadmin
  const canCancel =
    user !== null &&
    (data.user === user.id ||
      user.role === USER_ROLES.COMPANY_ADMIN ||
      user.role === USER_ROLES.SUPERADMIN);

  const isCancellable = data.status === BOOKING_STATUSES.CONFIRMED;
  const isMeetingRoom = data.resource_name !== undefined && data.participants !== undefined;

  // We detect meeting room by checking if participants array exists with values
  // or we rely on resource type from the booking detail page context
  const hasParticipants = Array.isArray(data.participants) && data.participants.length > 0;

  return (
    <main className="px-4 py-8 max-w-lg mx-auto space-y-6">
      <Link to="/bookings/my" className="text-sm text-blue-600 hover:underline">
        ← Мои бронирования
      </Link>
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{data.resource_name}</h1>
          <p className="mt-1 text-sm text-gray-600">
            {start.toLocaleString()} — {end.toLocaleString()}
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-sm">
            <span className="font-medium text-gray-700">Статус: </span>
            <span
              className={cn(
                'font-medium',
                data.status === BOOKING_STATUSES.CONFIRMED && 'text-emerald-600',
                data.status === BOOKING_STATUSES.CANCELLED && 'text-red-600',
                data.status === BOOKING_STATUSES.COMPLETED && 'text-gray-600',
                data.status === BOOKING_STATUSES.NO_SHOW && 'text-amber-600',
              )}
            >
              {STATUS_LABEL[data.status] ?? data.status}
            </span>
          </p>

          {data.description ? (
            <p className="text-sm text-gray-600">
              <span className="font-medium text-gray-700">Комментарий: </span>
              {data.description}
            </p>
          ) : null}

          {data.user_name && (
            <p className="text-sm text-gray-600">
              <span className="font-medium text-gray-700">Забронировал: </span>
              {data.user_name}
            </p>
          )}
        </div>

        {/* Participants — displayed for meeting room bookings */}
        {hasParticipants && (
          <div>
            <p className="mb-1 text-sm font-medium text-gray-700">Участники:</p>
            <ul className="space-y-1">
              {data.participants.map((email) => (
                <li key={email} className="text-sm text-gray-600">
                  {email}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Cancel error */}
        {cancelMutation.isError && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {getCancelError(cancelMutation.error)}
          </div>
        )}

        {/* Cancel success */}
        {cancelMutation.isSuccess && (
          <div
            role="status"
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
          >
            Бронирование отменено.
          </div>
        )}

        {/* Cancel button — only for owner or admin/superadmin */}
        {canCancel && isCancellable && !cancelMutation.isSuccess && (
          <button
            type="button"
            disabled={cancelMutation.isPending}
            onClick={() => cancelMutation.mutate()}
            className={cn(
              'w-full rounded-lg border border-red-300 py-2.5 text-sm font-medium',
              cancelMutation.isPending
                ? 'bg-red-50 text-red-400 cursor-not-allowed opacity-60'
                : 'bg-white text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500',
            )}
          >
            {cancelMutation.isPending ? 'Отмена…' : 'Отменить бронирование'}
          </button>
        )}
      </div>
    </main>
  );
}
