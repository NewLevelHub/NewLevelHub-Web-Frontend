import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { BOOKING_STATUSES, RESOURCE_TYPES, RESOURCE_TYPE_LABELS, USER_ROLES, type ResourceType } from '@/shared/config/constants';
import { useAuth } from '@/shared/hooks/useAuth';
import { getApiErrorMessage } from '@/shared/lib/apiError';
import { cn } from '@/shared/lib/cn';
import type { Booking, BookingResourceDetail, CompanyMember, PaginatedResponse } from '@/shared/types';

type MyBookingsStatusFilter = 'upcoming' | 'past' | 'cancelled';

const STATUS_LABEL: Record<string, string> = {
  [BOOKING_STATUSES.CONFIRMED]: 'Подтверждено',
  [BOOKING_STATUSES.CHECKED_IN]: 'Отмечен',
  [BOOKING_STATUSES.CANCELLED]: 'Отменено',
  [BOOKING_STATUSES.COMPLETED]: 'Завершено',
  [BOOKING_STATUSES.NO_SHOW]: 'Неявка',
};

const STATUS_BADGE_CLASS: Record<string, string> = {
  [BOOKING_STATUSES.CONFIRMED]: 'bg-blue-100 text-blue-800',
  [BOOKING_STATUSES.CHECKED_IN]: 'bg-emerald-100 text-emerald-800',
  [BOOKING_STATUSES.COMPLETED]: 'bg-gray-100 text-gray-600',
  [BOOKING_STATUSES.CANCELLED]: 'bg-gray-100 text-gray-600',
  [BOOKING_STATUSES.NO_SHOW]: 'bg-red-100 text-red-800',
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

export default function MyBookingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [statusTab, setStatusTab] = useState<MyBookingsStatusFilter>('upcoming');
  const [resourceType, setResourceType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [editTarget, setEditTarget] = useState<Booking | null>(null);
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [selectedParticipantId, setSelectedParticipantId] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const canManageParticipants =
    user?.role === USER_ROLES.COMPANY_ADMIN || user?.role === USER_ROLES.SUPERADMIN;

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
    refetchInterval: 30_000,
  });

  const cancelMutation = useMutation({
    mutationFn: async ({ bookingId }: { bookingId: number }) => {
      await apiClient.post(API.bookings.reservations.cancel(String(bookingId)), { reason: '' });
    },
    onSuccess: async () => {
      setListError(null);
      await queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
    },
    onError: (error: unknown) => {
      setListError(getApiErrorMessage(error, 'Не удалось отменить бронирование.'));
    },
  });

  const checkInMutation = useMutation({
    mutationFn: async ({ bookingId }: { bookingId: number }) => {
      await apiClient.post(API.bookings.reservations.checkIn(String(bookingId)));
    },
    onSuccess: async () => {
      setListError(null);
      await queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      await queryClient.invalidateQueries({ queryKey: ['booking-reservation'] });
    },
    onError: (error: unknown) => {
      setListError(getApiErrorMessage(error, 'Не удалось выполнить чек-ин.'));
    },
  });

  const { data: editBookingData } = useQuery({
    queryKey: ['my-bookings', 'edit-booking', editTarget?.id],
    enabled: Boolean(editTarget?.id),
    queryFn: async () => {
      const { data: res } = await apiClient.get<Booking>(
        API.bookings.reservations.detail(String(editTarget!.id)),
      );
      return res;
    },
  });

  const modalBooking = editBookingData ?? editTarget;

  const { data: editResourceData } = useQuery({
    queryKey: ['my-bookings', 'edit-resource', modalBooking?.resource],
    enabled: Boolean(modalBooking?.resource),
    queryFn: async () => {
      const { data: res } = await apiClient.get<BookingResourceDetail>(
        API.bookings.resources.detail(String(modalBooking!.resource)),
      );
      return res;
    },
  });

  const { data: companyMembersData } = useQuery({
    queryKey: ['my-bookings', 'company-members', user?.company_id],
    enabled: Boolean(user?.company_id) && canManageParticipants,
    queryFn: async () => {
      const { data: res } = await apiClient.get<CompanyMember[] | PaginatedResponse<CompanyMember>>(
        API.companies.members(String(user!.company_id)),
        { params: { page_size: 1000 } },
      );
      return Array.isArray(res) ? res : res.results;
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
      setEditError(null);
      setEditSuccess('Время бронирования обновлено.');
      await queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      await queryClient.invalidateQueries({ queryKey: ['my-bookings', 'edit-booking'] });
    },
    onError: (error: unknown) => {
      setEditSuccess(null);
      setEditError(getApiErrorMessage(error, 'Не удалось изменить время.'));
    },
  });

  const addParticipantMutation = useMutation({
    mutationFn: async ({ bookingId, userId }: { bookingId: number; userId: number }) => {
      await apiClient.post(API.bookings.reservations.addParticipants(String(bookingId)), {
        user_ids: [userId],
      });
    },
    onSuccess: async () => {
      setEditError(null);
      setEditSuccess('Участник добавлен.');
      setSelectedParticipantId('');
      await queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      await queryClient.invalidateQueries({ queryKey: ['my-bookings', 'edit-booking'] });
    },
    onError: (error: unknown) => {
      setEditSuccess(null);
      setEditError(getApiErrorMessage(error, 'Не удалось добавить участника.'));
    },
  });

  const removeParticipantMutation = useMutation({
    mutationFn: async ({ bookingId, userId }: { bookingId: number; userId: number }) => {
      await apiClient.delete(API.bookings.reservations.removeParticipant(String(bookingId), String(userId)));
    },
    onSuccess: async () => {
      setEditError(null);
      setEditSuccess('Участник удален.');
      await queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      await queryClient.invalidateQueries({ queryKey: ['my-bookings', 'edit-booking'] });
    },
    onError: (error: unknown) => {
      setEditSuccess(null);
      setEditError(getApiErrorMessage(error, 'Не удалось удалить участника.'));
    },
  });

  const rows = data?.results ?? [];
  const candidateMembers = useMemo(() => {
    if (!modalBooking) return [];
    const members = companyMembersData ?? [];
    const participantIds = new Set((modalBooking.participants ?? []).map((participant) => participant.id));
    return members
      .filter((m) => m.id !== modalBooking.user)
      .filter((m) => !participantIds.has(m.id))
      .filter((m) => m.role === USER_ROLES.EMPLOYEE || m.role === USER_ROLES.COMPANY_ADMIN);
  }, [companyMembersData, modalBooking]);

  const openEditModal = (booking: Booking) => {
    setEditTarget(booking);
    setEditStart(toDateTimeLocalValue(booking.start_time));
    setEditEnd(toDateTimeLocalValue(booking.end_time));
    setSelectedParticipantId('');
    setEditError(null);
    setEditSuccess(null);
  };

  const closeEditModal = () => {
    if (updateTimeMutation.isPending || addParticipantMutation.isPending || removeParticipantMutation.isPending) return;
    setEditTarget(null);
    setEditStart('');
    setEditEnd('');
    setSelectedParticipantId('');
    setEditError(null);
    setEditSuccess(null);
  };

  return (
    <main className="px-3 py-4 sm:px-4 sm:py-6 md:py-8 max-w-3xl mx-auto space-y-6">
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
      {listError ? (
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          role="alert"
        >
          {listError}
        </div>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-gray-500">Загрузка…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-500">Пока нет бронирований.</p>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-2xl border border-gray-100 bg-white shadow-sm">
          {rows.map((b) => {
            const start = new Date(b.start_time);
            const end = new Date(b.end_time);
            const now = new Date();
            const canCancel =
              statusTab === 'upcoming' &&
              b.status === BOOKING_STATUSES.CONFIRMED;
            const canCheckIn =
              statusTab === 'upcoming' &&
              b.status === BOOKING_STATUSES.CONFIRMED &&
              user !== null &&
              b.user === user.id &&
              now >= start &&
              now <= end &&
              !b.checked_in_at;
            return (
              <li key={b.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <Link
                  to={`/bookings/${b.id}`}
                  className="flex-1 rounded-lg p-1 hover:bg-gray-50"
                >
                  <p className="font-medium text-gray-900">{b.resource_name}</p>
                  <p className="text-xs text-gray-500">
                    {RESOURCE_TYPE_LABELS[b.resource_type as ResourceType] ?? b.resource_type}
                    {' · '}
                    {start.toLocaleString()} — {end.toLocaleString()}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', STATUS_BADGE_CLASS[b.status] ?? 'bg-gray-100 text-gray-600')}>
                      {STATUS_LABEL[b.status] ?? b.status}
                    </span>
                    {b.checked_in_at ? (
                      <span className="text-xs text-emerald-700">
                        Чек-ин: {new Date(b.checked_in_at).toLocaleString('ru-RU')}
                      </span>
                    ) : null}
                  </div>
                </Link>
                <div className="shrink-0 flex items-center gap-2">
                  {canCheckIn ? (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        setListError(null);
                        checkInMutation.mutate({ bookingId: b.id });
                      }}
                      disabled={checkInMutation.isPending}
                      className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {checkInMutation.isPending ? '…' : 'Чек-ин'}
                    </button>
                  ) : null}
                  {canCancel ? (
                    <>
                      <button
                        type="button"
                        onClick={() => openEditModal(b)}
                        className="rounded-lg border border-blue-300 px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-50"
                      >
                        Изменить
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setListError(null);
                          cancelMutation.mutate({ bookingId: b.id });
                        }}
                        disabled={cancelMutation.isPending}
                        className="rounded-lg border border-red-300 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        Отменить
                      </button>
                    </>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {editTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Изменение бронирования"
          onClick={closeEditModal}
        >
          <div
            className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-5 shadow-xl"
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
                {canManageParticipants ? (
                  <>
                    <label className="text-sm text-gray-700">
                      Добавить участника
                      <select
                        value={selectedParticipantId}
                        onChange={(event) => setSelectedParticipantId(event.target.value)}
                        className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                      >
                        <option value="">Выберите пользователя</option>
                        {candidateMembers.map((member) => (
                          <option key={member.id} value={String(member.id)}>
                            {member.full_name} ({member.email})
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
                  </>
                ) : (
                  <p className="text-sm text-gray-500">
                    Управление участниками для этой брони доступно только администратору компании.
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-4 text-sm text-gray-500">
                Управление участниками доступно только для бронирований переговорок.
              </p>
            )}

            {editError ? (
              <p className="mt-3 text-sm text-rose-700" role="alert">
                {editError}
              </p>
            ) : null}
            {editSuccess ? (
              <p className="mt-3 text-sm text-emerald-700">{editSuccess}</p>
            ) : null}

            <div className="mt-4 flex justify-end gap-2">
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
                onClick={() => {
                  if (!editStart || !editEnd) {
                    setEditError('Укажите start_time и end_time.');
                    return;
                  }
                  setEditError(null);
                  setEditSuccess(null);
                  updateTimeMutation.mutate({
                    bookingId: modalBooking?.id ?? editTarget.id,
                    startTime: editStart,
                    endTime: editEnd,
                  });
                }}
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
