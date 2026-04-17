import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { BOOKING_STATUSES, RESOURCE_TYPES, USER_ROLES } from '@/shared/config/constants';
import { useAuth } from '@/shared/hooks/useAuth';
import { getApiErrorMessage } from '@/shared/lib/apiError';
import { cn } from '@/shared/lib/cn';
import type { Booking, BookingResourceDetail, CompanyMember, PaginatedResponse } from '@/shared/types';

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

export default function BookingDetailPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const bookingId = id ?? '';

  const [startInput, setStartInput] = useState('');
  const [endInput, setEndInput] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['booking-reservation', bookingId],
    enabled: Boolean(bookingId),
    queryFn: async () => {
      const { data: res } = await apiClient.get<Booking>(API.bookings.reservations.detail(bookingId));
      return res;
    },
  });

  const { data: resourceData } = useQuery({
    queryKey: ['booking-resource-detail', data?.resource],
    enabled: Boolean(data?.resource),
    queryFn: async () => {
      const { data: res } = await apiClient.get<BookingResourceDetail>(
        API.bookings.resources.detail(String(data!.resource)),
      );
      return res;
    },
  });

  const canManageParticipants =
    user?.role === USER_ROLES.COMPANY_ADMIN || user?.role === USER_ROLES.SUPERADMIN;

  const { data: companyMembersData } = useQuery({
    queryKey: ['booking-company-members', user?.company_id],
    enabled: Boolean(user?.company_id) && canManageParticipants,
    queryFn: async () => {
      const { data: res } = await apiClient.get<PaginatedResponse<CompanyMember>>(
        API.companies.members(String(user!.company_id)),
        { params: { page_size: 1000 } },
      );
      return res;
    },
  });

  useEffect(() => {
    if (!data) return;
    setStartInput(toDateTimeLocalValue(data.start_time));
    setEndInput(toDateTimeLocalValue(data.end_time));
  }, [data]);

  const updateTimeMutation = useMutation({
    mutationFn: async ({ startTime, endTime }: { startTime: string; endTime: string }) => {
      await apiClient.patch(API.bookings.reservations.detail(bookingId), {
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
      });
    },
    onSuccess: async () => {
      setFormError(null);
      setFormSuccess('Время бронирования обновлено.');
      await queryClient.invalidateQueries({ queryKey: ['booking-reservation', bookingId] });
      await queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
    },
    onError: (error: unknown) => {
      setFormSuccess(null);
      setFormError(getApiErrorMessage(error, 'Не удалось обновить время брони.'));
    },
  });

  const addParticipantMutation = useMutation({
    mutationFn: async ({ userId }: { userId: number }) => {
      await apiClient.post(API.bookings.reservations.addParticipants(bookingId), {
        user_ids: [userId],
      });
    },
    onSuccess: async () => {
      setFormError(null);
      setFormSuccess('Участник добавлен.');
      setSelectedUserId('');
      await queryClient.invalidateQueries({ queryKey: ['booking-reservation', bookingId] });
      await queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
    },
    onError: (error: unknown) => {
      setFormSuccess(null);
      setFormError(getApiErrorMessage(error, 'Не удалось добавить участника.'));
    },
  });

  const removeParticipantMutation = useMutation({
    mutationFn: async ({ userId }: { userId: number }) => {
      await apiClient.delete(API.bookings.reservations.removeParticipant(bookingId, String(userId)));
    },
    onSuccess: async () => {
      setFormError(null);
      setFormSuccess('Участник удален.');
      await queryClient.invalidateQueries({ queryKey: ['booking-reservation', bookingId] });
      await queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
    },
    onError: (error: unknown) => {
      setFormSuccess(null);
      setFormError(getApiErrorMessage(error, 'Не удалось удалить участника.'));
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post(API.bookings.reservations.cancel(bookingId), { reason: '' });
    },
    onSuccess: async () => {
      setFormError(null);
      setFormSuccess('Бронирование отменено.');
      await queryClient.invalidateQueries({ queryKey: ['booking-reservation', bookingId] });
      await queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
    },
    onError: (error: unknown) => {
      setFormSuccess(null);
      setFormError(getApiErrorMessage(error, 'Не удалось отменить бронирование.'));
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
        <p className="text-sm text-gray-500">Загрузка...</p>
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
  const isMeetingRoom = resourceData?.type === RESOURCE_TYPES.MEETING_ROOM;
  const canEditTime = data.status === BOOKING_STATUSES.CONFIRMED;
  const canCancel = user !== null && data.user === user.id && data.status === BOOKING_STATUSES.CONFIRMED;

  const participantIds = new Set(data.participants.map((participant) => participant.id));
  const candidateMembers = (companyMembersData?.results ?? []).filter(
    (member) => member.id !== data.user && !participantIds.has(member.id),
  );

  const selectedParticipantUserId = Number(selectedUserId);
  const isMutationPending = useMemo(
    () =>
      updateTimeMutation.isPending ||
      addParticipantMutation.isPending ||
      removeParticipantMutation.isPending ||
      cancelMutation.isPending,
    [
      updateTimeMutation.isPending,
      addParticipantMutation.isPending,
      removeParticipantMutation.isPending,
      cancelMutation.isPending,
    ],
  );

  return (
    <main className="px-4 py-8 max-w-lg mx-auto space-y-6">
      <Link to="/bookings/my" className="text-sm text-blue-600 hover:underline">
        ← Мои бронирования
      </Link>

      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-3">
        <h1 className="text-xl font-bold text-gray-900">{data.resource_name}</h1>
        <p className="text-sm text-gray-600">
          {start.toLocaleString()} — {end.toLocaleString()}
        </p>
        <p className="text-sm">
          <span className="font-medium text-gray-700">Статус: </span>
          <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', STATUS_BADGE_CLASS[data.status] ?? 'bg-gray-100 text-gray-600')}>
            {STATUS_LABEL[data.status] ?? data.status}
          </span>
        </p>
        {data.description ? <p className="text-sm text-gray-600">{data.description}</p> : null}
      </section>

      {formError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>
      ) : null}
      {formSuccess ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {formSuccess}
        </div>
      ) : null}

      {canCancel ? (
        <button
          type="button"
          disabled={isMutationPending}
          onClick={() => {
            setFormError(null);
            setFormSuccess(null);
            cancelMutation.mutate();
          }}
          className="w-full rounded-lg border border-red-300 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          Отменить бронирование
        </button>
      ) : null}

      {canEditTime ? (
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Изменить время</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-sm text-gray-700">
              Начало
              <input
                type="datetime-local"
                value={startInput}
                onChange={(event) => setStartInput(event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              />
            </label>
            <label className="text-sm text-gray-700">
              Конец
              <input
                type="datetime-local"
                value={endInput}
                onChange={(event) => setEndInput(event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              />
            </label>
          </div>
          <button
            type="button"
            disabled={isMutationPending}
            onClick={() => {
              setFormError(null);
              setFormSuccess(null);
              if (!startInput || !endInput) {
                setFormError('Укажите start_time и end_time.');
                return;
              }
              updateTimeMutation.mutate({ startTime: startInput, endTime: endInput });
            }}
            className="rounded-lg border border-blue-300 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50"
          >
            Сохранить время
          </button>
        </section>
      ) : null}

      {isMeetingRoom ? (
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Участники встречи</h2>
          <ul className="space-y-2">
            {data.participants.length > 0 ? (
              data.participants.map((participant) => (
                <li key={participant.id} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2">
                  <span className="text-sm text-gray-700">{participant.full_name || participant.email}</span>
                  {canManageParticipants ? (
                    <button
                      type="button"
                      disabled={isMutationPending}
                      onClick={() => {
                        setFormError(null);
                        setFormSuccess(null);
                        removeParticipantMutation.mutate({ userId: participant.id });
                      }}
                      className="rounded-md border border-red-300 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      Удалить
                    </button>
                  ) : null}
                </li>
              ))
            ) : (
              <li className="text-sm text-gray-500">Пока нет участников.</li>
            )}
          </ul>

          {canManageParticipants ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <label className="text-sm text-gray-700 sm:min-w-72">
                Добавить участника
                <select
                  value={selectedUserId}
                  onChange={(event) => setSelectedUserId(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                >
                  <option value="">Выберите пользователя</option>
                  {candidateMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.full_name} ({member.email})
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                disabled={isMutationPending || !selectedUserId || Number.isNaN(selectedParticipantUserId)}
                onClick={() => {
                  setFormError(null);
                  setFormSuccess(null);
                  addParticipantMutation.mutate({ userId: selectedParticipantUserId });
                }}
                className="rounded-lg border border-blue-300 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50"
              >
                Добавить
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              Управление участниками доступно только администраторам компании.
            </p>
          )}
        </section>
      ) : null}
    </main>
  );
}
