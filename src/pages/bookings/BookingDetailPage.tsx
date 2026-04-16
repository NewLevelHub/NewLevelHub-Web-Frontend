import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { BOOKING_STATUSES, RESOURCE_TYPES } from '@/shared/config/constants';
import { useAuth } from '@/shared/hooks/useAuth';
import { getApiErrorMessage } from '@/shared/lib/apiError';
import type { Booking, BookingResourceDetail, CompanyMember, PaginatedResponse } from '@/shared/types';
import { cn } from '@/shared/lib/cn';
import { useEffect } from 'react';

const STATUS_LABEL: Record<string, string> = {
  [BOOKING_STATUSES.CONFIRMED]: 'Подтверждено',
  [BOOKING_STATUSES.CANCELLED]: 'Отменено',
  [BOOKING_STATUSES.COMPLETED]: 'Завершено',
  [BOOKING_STATUSES.NO_SHOW]: 'Неявка',
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
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const bookingId = id ?? '';
  const [startInput, setStartInput] = useState('');
  const [endInput, setEndInput] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
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

  const { data: companyMembersData } = useQuery({
    queryKey: ['booking-company-members', user?.company_id],
    enabled: Boolean(user?.company_id),
    queryFn: async () => {
      const { data: res } = await apiClient.get<PaginatedResponse<CompanyMember>>(
        API.companies.members(String(user!.company_id)),
        { params: { page_size: 200 } },
      );
      return res;
    },
  });

  const updateTimeMutation = useMutation({
    mutationFn: async ({ startTime, endTime }: { startTime: string; endTime: string }) => {
      const payload = {
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
      };
      await apiClient.patch(API.bookings.reservations.detail(bookingId), payload);
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
  const isMeetingRoom = resourceData?.type === RESOURCE_TYPES.MEETING_ROOM;
  const canEditTime = data.status === BOOKING_STATUSES.CONFIRMED;
  const participantEmailToId = useMemo(() => {
    const members = companyMembersData?.results ?? [];
    return new Map(members.map((m) => [m.email, m.id]));
  }, [companyMembersData]);
  const selectedParticipantUserId = Number(selectedUserId);
  const members = companyMembersData?.results ?? [];

  const candidateMembers = members.filter(
    (m) => !data.participants.includes(m.email) && m.id !== data.user,
  );
  const isMutationPending =
    updateTimeMutation.isPending || addParticipantMutation.isPending || removeParticipantMutation.isPending;

  const initialStart = toDateTimeLocalValue(data.start_time);
  const initialEnd = toDateTimeLocalValue(data.end_time);

  // Show cancel button only to the booking owner
  const canCancel = user !== null && data.user === user.id;

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
          <p className="text-xs text-gray-500">Участники: {data.participants.join(', ')}</p>
        ) : null}
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
              {data.participants.map((p) => (
                <li key={p.id} className="text-sm text-gray-600">
                  {p.full_name || p.email}
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

      {formError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {formError}
        </div>
      ) : null}
      {formSuccess ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {formSuccess}
        </div>
      ) : null}

      {canEditTime ? (
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Изменить время</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-sm text-gray-700">
              Начало
              <input
                type="datetime-local"
                value={startInput || initialStart}
                onChange={(e) => setStartInput(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              />
            </label>
            <label className="text-sm text-gray-700">
              Конец
              <input
                type="datetime-local"
                value={endInput || initialEnd}
                onChange={(e) => setEndInput(e.target.value)}
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
              const startTime = startInput || initialStart;
              const endTime = endInput || initialEnd;
              if (!startTime || !endTime) {
                setFormError('Укажите start_time и end_time.');
                return;
              }
              updateTimeMutation.mutate({ startTime, endTime });
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
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="text-sm text-gray-700 sm:min-w-72">
              Добавить участника
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
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
          <ul className="space-y-2">
            {data.participants?.length ? (
              data.participants.map((email) => {
                const mappedUserId = participantEmailToId.get(email);
                return (
                  <li key={email} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2">
                    <span className="text-sm text-gray-700">{email}</span>
                    <button
                      type="button"
                      disabled={isMutationPending || !mappedUserId}
                      onClick={() => {
                        if (!mappedUserId) return;
                        setFormError(null);
                        setFormSuccess(null);
                        removeParticipantMutation.mutate({ userId: mappedUserId });
                      }}
                      className="rounded-md border border-red-300 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      Удалить
                    </button>
                  </li>
                );
              })
            ) : (
              <li className="text-sm text-gray-500">Пока нет участников.</li>
            )}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
