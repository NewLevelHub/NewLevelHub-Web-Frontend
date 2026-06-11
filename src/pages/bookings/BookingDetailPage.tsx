import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { dateLocaleTag } from '@/shared/lib/localeFormat';
import { fmtDateTime } from '@/shared/lib/formatDate';
import { Link, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { BOOKING_STATUSES, RESOURCE_TYPES, USER_ROLES } from '@/shared/config/constants';
import { useAuth } from '@/shared/hooks/useAuth';
import { getApiError } from '@/shared/lib/getApiError';
import { cn } from '@/shared/lib/cn';
import type { Booking, BookingResourceDetail, CompanyMember, PaginatedResponse } from '@/shared/types';
import { BookingQRPanel, shouldShowBookingQrPanel } from '@/pages/bookings/components/BookingQRPanel';


const STATUS_BADGE_CLASS: Record<string, string> = {
  [BOOKING_STATUSES.CONFIRMED]: 'bg-blue-100 text-blue-800',
  [BOOKING_STATUSES.CHECKED_IN]: 'bg-emerald-100 text-emerald-800',
  [BOOKING_STATUSES.COMPLETED]: 'bg-gray-100 text-muted',
  [BOOKING_STATUSES.CANCELLED]: 'bg-gray-100 text-muted',
  [BOOKING_STATUSES.NO_SHOW]: 'bg-red-100 text-red-800',
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
  const { t, i18n } = useTranslation();
  const dateLocale = dateLocaleTag(i18n.language);
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
      setFormSuccess(t('booking.detail.timeUpdated'));
      await queryClient.invalidateQueries({ queryKey: ['booking-reservation', bookingId] });
      await queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
    },
    onError: (error: unknown) => {
      setFormSuccess(null);
      setFormError(getApiError(error).message);
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
      setFormSuccess(t('booking.detail.participantAdded'));
      setSelectedUserId('');
      await queryClient.invalidateQueries({ queryKey: ['booking-reservation', bookingId] });
      await queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
    },
    onError: (error: unknown) => {
      setFormSuccess(null);
      setFormError(getApiError(error).message);
    },
  });

  const removeParticipantMutation = useMutation({
    mutationFn: async ({ userId }: { userId: number }) => {
      await apiClient.delete(API.bookings.reservations.removeParticipant(bookingId, String(userId)));
    },
    onSuccess: async () => {
      setFormError(null);
      setFormSuccess(t('booking.detail.participantRemoved'));
      await queryClient.invalidateQueries({ queryKey: ['booking-reservation', bookingId] });
      await queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
    },
    onError: (error: unknown) => {
      setFormSuccess(null);
      setFormError(getApiError(error).message);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post(API.bookings.reservations.cancel(bookingId), { reason: '' });
    },
    onSuccess: async () => {
      setFormError(null);
      setFormSuccess(t('booking.detail.cancelled'));
      await queryClient.invalidateQueries({ queryKey: ['booking-reservation', bookingId] });
      await queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
    },
    onError: (error: unknown) => {
      setFormSuccess(null);
      setFormError(getApiError(error).message);
    },
  });

  const checkInMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post(API.bookings.reservations.checkIn(bookingId));
    },
    onSuccess: async () => {
      setFormError(null);
      setFormSuccess(t('booking.detail.checkInSuccess'));
      await queryClient.invalidateQueries({ queryKey: ['booking-reservation', bookingId] });
      await queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
    },
    onError: (error: unknown) => {
      setFormSuccess(null);
      setFormError(getApiError(error).message);
    },
  });

  const isMutationPending = useMemo(
    () =>
      updateTimeMutation.isPending ||
      addParticipantMutation.isPending ||
      removeParticipantMutation.isPending ||
      cancelMutation.isPending ||
      checkInMutation.isPending,
    [
      updateTimeMutation.isPending,
      addParticipantMutation.isPending,
      removeParticipantMutation.isPending,
      cancelMutation.isPending,
      checkInMutation.isPending,
    ],
  );

  if (!bookingId) {
    return (
      <div>
        <p className="text-sm text-red-600">{t('booking.detail.invalidLink')}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div>
        <p className="text-sm text-muted">{t('common.loading')}</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-600">{t('booking.detail.notFound')}</p>
        <Link to="/bookings/my" className="text-sm text-blue-600 hover:underline">{t('common.myBookings')}</Link>
      </div>
    );
  }

  const start = new Date(data.start_time);
  const end = new Date(data.end_time);
  const now = new Date();
  const isMeetingRoom = resourceData?.type === RESOURCE_TYPES.MEETING_ROOM;
  const isOwner = user !== null && data.user === user.id;
  const isAdmin = user?.role === USER_ROLES.COMPANY_ADMIN || user?.role === USER_ROLES.SUPERADMIN;
  const canEditTime = data.status === BOOKING_STATUSES.CONFIRMED && (isOwner || isAdmin);
  const canCancel = isOwner && data.status === BOOKING_STATUSES.CONFIRMED;

  const canCheckIn =
    isOwner &&
    data.status === BOOKING_STATUSES.CONFIRMED &&
    now >= start &&
    now <= end &&
    !data.checked_in_at;

  const participantIds = new Set(data.participants.map((participant) => participant.id));
  const candidateMembers = (companyMembersData?.results ?? []).filter(
    (member) => member.id !== data.user && !participantIds.has(member.id),
  );

  const selectedParticipantUserId = Number(selectedUserId);

  const showQrPanel = shouldShowBookingQrPanel(data);

  return (
    <div className="space-y-6">
      {isOwner ? (
        <Link to="/bookings/my" className="text-sm text-blue-600 hover:underline">
          {t('booking.detail.myBookings')}
        </Link>
      ) : null}

      <div className={cn('grid gap-6', showQrPanel && 'lg:grid-cols-[1fr_320px] lg:items-start')}>
      <div className="space-y-6">
      <section className="rounded-2xl border border-default bg-surface p-6 shadow-sm space-y-3">
        <h1 className="text-xl font-bold text-primary">{data.resource_name}</h1>
        <p className="text-sm text-muted">
          {fmtDateTime(start)} — {fmtDateTime(end)}
        </p>
        <p className="text-sm">
          <span className="font-medium text-secondary">{t('booking.detail.statusLabel')} </span>
          <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', STATUS_BADGE_CLASS[data.status] ?? 'bg-gray-100 text-muted')}>
            {t(`common.bookingStatus.${data.status}`, { defaultValue: data.status })}
          </span>
        </p>
        {data.status === BOOKING_STATUSES.CANCELLED && data.cancel_reason?.trim() ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-primary">
            <p className="font-medium text-rose-900">
              {data.cancelled_by != null && data.cancelled_by !== data.user
                ? t('booking.detail.adminComment')
                : t('booking.detail.cancelReason')}
            </p>
            <p className="mt-1 whitespace-pre-wrap text-primary">{data.cancel_reason.trim()}</p>
          </div>
        ) : null}
        {data.checked_in_at ? (
          <p className="text-sm text-muted">
            <span className="font-medium text-secondary">{t('booking.detail.checkInLabel')} </span>
            {fmtDateTime(data.checked_in_at)}
          </p>
        ) : null}
        {data.description ? <p className="text-sm text-muted">{data.description}</p> : null}
        {(data.booked_by || data.user_name) ? (
          <p className="text-sm text-muted flex items-center gap-1.5">
            <span className="font-medium text-secondary">{t('booking.detail.bookedBy')} </span>
            {data.booked_by?.avatar ? (
              <img src={data.booked_by.avatar} alt={data.booked_by.full_name} className="h-5 w-5 rounded-full object-cover" />
            ) : null}
            {data.booked_by?.full_name ?? data.user_name}
          </p>
        ) : null}
      </section>

      {formError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{formError}</div>
      ) : null}
      {formSuccess ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {formSuccess}
        </div>
      ) : null}

      {canCheckIn ? (
        <button
          type="button"
          disabled={isMutationPending}
          onClick={() => {
            setFormError(null);
            setFormSuccess(null);
            checkInMutation.mutate();
          }}
          className="w-full rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {checkInMutation.isPending ? t('booking.detail.checkInPending') : t('booking.detail.checkInBtn')}
        </button>
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
          {t('booking.detail.cancelBtn')}
        </button>
      ) : null}

      {canEditTime ? (
        <section className="rounded-2xl border border-default bg-surface p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-primary">{t('booking.detail.updateTimeTitle')}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-sm text-secondary">{t('common.start')}<input
                type="datetime-local"
                value={startInput}
                onChange={(event) => setStartInput(event.target.value)}
                lang={dateLocale}
                className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary"
              />
            </label>
            <label className="text-sm text-secondary">
              {t('booking.detail.endLabel')}
              <input
                type="datetime-local"
                value={endInput}
                onChange={(event) => setEndInput(event.target.value)}
                lang={dateLocale}
                className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary"
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
                setFormError(t('booking.detail.startEndRequired'));
                return;
              }
              updateTimeMutation.mutate({ startTime: startInput, endTime: endInput });
            }}
            className="rounded-lg border border-blue-300 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50"
          >
            {t('booking.detail.saveTime')}
          </button>
        </section>
      ) : null}

      {isMeetingRoom ? (
        <section className="rounded-2xl border border-default bg-surface p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-primary">{t('booking.detail.meetingParticipants')}</h2>
          <ul className="space-y-2">
            {data.participants.length > 0 ? (
              data.participants.map((participant) => (
                <li key={participant.id} className="flex items-center justify-between rounded-lg border border-default px-3 py-2">
                  <span className="text-sm text-secondary">{participant.full_name || participant.email}</span>
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
                    >{t('common.delete')}</button>
                  ) : null}
                </li>
              ))
            ) : (
              <li className="text-sm text-muted">{t('booking.detail.noParticipants')}</li>
            )}
          </ul>

          {canManageParticipants ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <label className="text-sm text-secondary sm:min-w-72">{t('common.addMember')}<select
                  value={selectedUserId}
                  onChange={(event) => setSelectedUserId(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary"
                >
                  <option value="">{t('booking.detail.selectUser')}</option>
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
                {t('booking.detail.addBtn')}
              </button>
            </div>
          ) : (
            <p className="text-sm text-muted">
              {t('booking.detail.participantsAdminOnly')}
            </p>
          )}
        </section>
      ) : null}
      </div>

      {showQrPanel ? (
        <BookingQRPanel booking={data} className="lg:sticky lg:top-4" />
      ) : null}
      </div>
    </div>
  );
}
