import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { dateLocaleTag } from '@/shared/lib/localeFormat';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, MoreHorizontal, Plus, QrCode, Repeat } from 'lucide-react';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { fmtDate, fmtDateTime, fmtDayMonth, fmtTime } from '@/shared/lib/formatDate';
import {
  BOOKING_STATUSES,
  RESOURCE_TYPES,
  RESOURCE_TYPE_LABEL_KEYS,
  STAFF_UI_PREFIX,
  USER_ROLES,
  type ResourceType,
} from '@/shared/config/constants';
import { useAuth } from '@/shared/hooks/useAuth';
import { getApiError } from '@/shared/lib/getApiError';
import { cn } from '@/shared/lib/cn';
import type { Booking, BookingResourceDetail, CompanyMember, PaginatedResponse, RecurringBooking } from '@/shared/types';
import { shouldShowBookingQrPanel } from '@/pages/bookings/components/BookingQRPanel';
import { BookingStatusBadge } from '@/pages/bookings/components/BookingStatusBadge';
import { RecurringSeriesCard } from '@/features/bookings/recurring/components/RecurringSeriesCard';
import { recurringSeriesDateEntries } from '@/shared/lib/recurringSeriesDates';
import { RecurringScopeModal } from '@/features/bookings/recurring/components/RecurringScopeModal';
import type { ScopeModalState } from '@/features/bookings/recurring/types';
import { CheckInButton, CheckInUrgencyBadge, canCheckIn as isCheckInAllowed, getCheckInUrgency } from '@/features/bookings/components/CheckInButton';

type MyBookingsStatusFilter = 'upcoming' | 'past' | 'cancelled' | 'recurring';

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

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}


export default function MyBookingsPage() {
  const { t, i18n } = useTranslation();
  const dateLocale = dateLocaleTag(i18n.language);
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
  const [openActionsId, setOpenActionsId] = useState<number | null>(null);
  const [dropdownCoords, setDropdownCoords] = useState<{ top: number; right: number } | null>(null);
  const actionButtonRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const [recurringScopeModal, setRecurringScopeModal] = useState<ScopeModalState | null>(null);

  useEffect(() => {
    if (openActionsId === null) return;
    const close = () => { setOpenActionsId(null); setDropdownCoords(null); };
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [openActionsId]);

  const canManageParticipants =
    user?.role === USER_ROLES.COMPANY_ADMIN || user?.role === USER_ROLES.SUPERADMIN;

  const tabOptions = useMemo(
    () => [
      { value: 'upcoming' as const, label: t('common.bookingFilter.upcoming') },
      { value: 'past' as const, label: t('common.bookingFilter.past') },
      { value: 'cancelled' as const, label: t('common.bookingFilter.cancelled') },
      { value: 'recurring' as const, label: t('booking.recurring.myTab') },
    ],
    [t],
  );

  const resourceTypeOptions = useMemo(
    () => [
      { value: '', label: t('common.bookingFilter.allTypes') },
      { value: RESOURCE_TYPES.DESK, label: t(RESOURCE_TYPE_LABEL_KEYS[RESOURCE_TYPES.DESK]) },
      { value: RESOURCE_TYPES.MEETING_ROOM, label: t(RESOURCE_TYPE_LABEL_KEYS[RESOURCE_TYPES.MEETING_ROOM]) },
      { value: RESOURCE_TYPES.PARKING, label: t(RESOURCE_TYPE_LABEL_KEYS[RESOURCE_TYPES.PARKING]) },
      { value: RESOURCE_TYPES.CAPSULE, label: t(RESOURCE_TYPE_LABEL_KEYS[RESOURCE_TYPES.CAPSULE]) },
    ],
    [t],
  );

  const isRecurringTab = statusTab === 'recurring';

  const queryParams = useMemo(() => {
    if (isRecurringTab) return { status: 'upcoming' };
    const params: Record<string, string> = { status: statusTab };
    if (resourceType) params.resource_type = resourceType;
    const fromIso = localDateTimeToIso(dateFrom);
    const toIso = localDateTimeToIso(dateTo);
    if (fromIso) params.date_from = fromIso;
    if (toIso) params.date_to = toIso;
    return params;
  }, [statusTab, resourceType, dateFrom, dateTo, isRecurringTab]);

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
    enabled: !isRecurringTab,
  });

  const cancelMutation = useMutation({
    mutationFn: async ({ bookingId }: { bookingId: number }) => {
      await apiClient.post(API.bookings.reservations.cancel(String(bookingId)), { reason: '' });
    },
    onSuccess: async () => {
      setListError(null);
      await queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
    },
    onError: (error: unknown) => {
      setListError(getApiError(error).message);
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
      await queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
    },
    onError: (error: unknown) => {
      setListError(getApiError(error).message);
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
      setEditSuccess(t('booking.myBookings.saveTime'));
      await queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      await queryClient.invalidateQueries({ queryKey: ['my-bookings', 'edit-booking'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
    },
    onError: (error: unknown) => {
      setEditSuccess(null);
      setEditError(getApiError(error).message);
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
      setEditSuccess(t('common.addMember'));
      setSelectedParticipantId('');
      await queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      await queryClient.invalidateQueries({ queryKey: ['my-bookings', 'edit-booking'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
    },
    onError: (error: unknown) => {
      setEditSuccess(null);
      setEditError(getApiError(error).message);
    },
  });

  const removeParticipantMutation = useMutation({
    mutationFn: async ({ bookingId, userId }: { bookingId: number; userId: number }) => {
      await apiClient.delete(API.bookings.reservations.removeParticipant(String(bookingId), String(userId)));
    },
    onSuccess: async () => {
      setEditError(null);
      setEditSuccess(t('common.delete'));
      await queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      await queryClient.invalidateQueries({ queryKey: ['my-bookings', 'edit-booking'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
    },
    onError: (error: unknown) => {
      setEditSuccess(null);
      setEditError(getApiError(error).message);
    },
  });

  const recurringDeleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(API.bookings.recurring.detail(String(id)));
    },
    onSuccess: async () => {
      setRecurringScopeModal(null);
      await queryClient.invalidateQueries({ queryKey: ['my-bookings-recurring'] });
    },
    onError: () => {
      setRecurringScopeModal(null);
    },
  });

  const rows = data?.results ?? [];
  const totalCount = data?.count ?? 0;

  const candidateMembers = useMemo(() => {
    if (!modalBooking) return [];
    const members = companyMembersData ?? [];
    const participantIds = new Set((modalBooking.participants ?? []).map((p) => p.id));
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
    setOpenActionsId(null);
    setDropdownCoords(null);
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

  const selectClass = 'w-full rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-[color:var(--bg-surface)] px-2.5 py-1.5 text-[13px] text-[color:var(--text-primary)] focus:outline-none';

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-lg sm:text-[22px] font-bold text-[color:var(--text-primary)] leading-tight">
            {t('common.myBookings')}
          </h1>
          {totalCount > 0 && (
            <p className="mt-0.5 text-[13px] text-[color:var(--text-secondary)]">
              {t('booking.myBookings.totalCount', { count: totalCount })}
            </p>
          )}
          {(user?.role === USER_ROLES.SUPERADMIN || user?.role === USER_ROLES.COMPANY_ADMIN) && (
            <Link
              to={`${STAFF_UI_PREFIX}/bookings`}
              className="inline-flex items-center gap-1 text-[13px] text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)] transition-colors mt-1"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              {t('booking.myBookings.backToAdmin')}
            </Link>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
          {(user?.role === USER_ROLES.EMPLOYEE || user?.role === USER_ROLES.COMPANY_ADMIN) && (
            <Link
              to="/bookings/recurring"
              className="inline-flex items-center gap-1.5 h-[34px] px-3 text-[13px] font-medium border border-[color:var(--border)] bg-[color:var(--bg-surface)] rounded-[var(--radius-sm)] text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-hover)] transition-colors"
            >
              <Repeat className="w-3.5 h-3.5" />
              {t('sidebar.navItem.recurringBookings')}
            </Link>
          )}
          <Link
            to="/bookings/catalog"
            className="inline-flex items-center gap-1.5 h-[34px] px-3 text-[13px] font-medium bg-[color:var(--brand)] text-white rounded-[var(--radius-sm)] hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            {t('catalog.bookButton')}
          </Link>
        </div>
      </div>

      {/* Secondary filter row: resource type + date range */}
      <div className="grid gap-2 grid-cols-1 sm:grid-cols-3">
        <select
          value={resourceType}
          onChange={(e) => setResourceType(e.target.value)}
          className={selectClass}
          aria-label={t('booking.myBookings.resourceType')}
        >
          {resourceTypeOptions.map((option) => (
            <option key={option.value || 'all'} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <input
          type="datetime-local"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          lang={dateLocale}
          className={selectClass}
          aria-label={t('common.dateFrom')}
          title={t('common.dateFrom')}
        />
        <input
          type="datetime-local"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          lang={dateLocale}
          className={selectClass}
          aria-label={t('common.dateTo')}
          title={t('common.dateTo')}
        />
      </div>

      {/* Error alerts */}
      {isError && (
        <p className="text-[13px] text-[color:var(--status-busy-text)]" role="alert">
          {t('booking.myBookings.errorLoad')}
        </p>
      )}
      {listError && (
        <div
          className="rounded-[var(--radius-sm)] border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700"
          role="alert"
        >
          {listError}
        </div>
      )}

      {/* Main card */}
      <div className="bg-[color:var(--bg-surface)] border border-[color:var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-card)] overflow-hidden">

        {/* Filter bar: status tabs + pagination */}
        <div className="flex items-center gap-1.5 flex-wrap px-4 py-3 border-b border-[color:var(--border)]">
          {/* Status chips */}
          {tabOptions.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setStatusTab(tab.value)}
              className={cn(
                'inline-flex items-center px-2.5 py-1 text-[12px] rounded-full transition-colors',
                statusTab === tab.value
                  ? 'border-transparent bg-[color:var(--brand-subtle)] text-[color:var(--brand-text)] cursor-pointer'
                  : 'border border-[color:var(--border)] text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-hover)] cursor-pointer',
              )}
            >
              {tab.label}
            </button>
          ))}

          {/* Pagination — pushed to right */}
          {totalCount > 0 && (
            <div className="ml-auto flex items-center gap-1.5 text-[12px] text-[color:var(--text-muted)]">
              <span>
                {t('booking.myBookings.totalCount', { count: totalCount })}
              </span>
              <button
                type="button"
                disabled
                aria-label={t('common.previousPage')}
                className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-sm)] text-[color:var(--text-muted)] hover:bg-[color:var(--bg-hover)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled
                aria-label={t('common.nextPage')}
                className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-sm)] text-[color:var(--text-muted)] hover:bg-[color:var(--bg-hover)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Recurring tab content */}
        {isRecurringTab && (
          <RecurringTabContent
            userId={user?.id ?? null}
            onScopeModal={(modal) => setRecurringScopeModal(modal)}
          />
        )}

        {/* Table */}
        {!isRecurringTab && (isLoading ? (
          <div className="px-4 py-10">
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-10 rounded-[var(--radius-sm)] bg-[color:var(--bg-raised)] animate-pulse"
                />
              ))}
            </div>
          </div>
        ) : rows.length === 0 ? (
          <div className="px-4 py-12 text-center text-[13px] text-[color:var(--text-muted)]">
            {t('booking.myBookings.noBookings')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] border-collapse text-[13px]" role="table">
              <thead>
                <tr className="border-b border-[color:var(--border)]">
                  <th className="px-3 py-2 text-left text-[11px] font-medium text-[color:var(--text-muted)] whitespace-nowrap">
                    {t('dashboard.table.resource')}
                  </th>
                  <th className="px-3 py-2 text-left text-[11px] font-medium text-[color:var(--text-muted)] whitespace-nowrap">
                    {t('dashboard.table.user')}
                  </th>
                  <th className="px-3 py-2 text-left text-[11px] font-medium text-[color:var(--text-muted)] whitespace-nowrap">
                    {t('booking.manage.dateTime')}
                  </th>
                  <th className="px-3 py-2 text-left text-[11px] font-medium text-[color:var(--text-muted)] whitespace-nowrap">
                    {t('common.status')}
                  </th>
                  <th className="w-8 px-3 py-2" aria-label={t('booking.manage.actions')} />
                </tr>
              </thead>
              <tbody>
                {rows.map((b) => {
                  const start = new Date(b.start_time);
                  const end = new Date(b.end_time);
                  const isActionsOpen = openActionsId === b.id;
                  const rowNow = new Date();
                  const rowUrgency = getCheckInUrgency(b, rowNow);
                  const rowCanCheckIn = isCheckInAllowed(b, rowNow);

                  return (
                    <tr
                      key={b.id}
                      className="border-b border-[color:var(--border)] hover:bg-[color:var(--bg-hover)] transition-colors"
                    >
                      <td className="px-3 py-2.5 align-middle">
                        <Link
                          to={`/bookings/${b.id}`}
                          className="font-medium text-[color:var(--text-primary)] hover:text-[color:var(--brand)] transition-colors"
                        >
                          {b.resource_name}
                        </Link>
                        <p className="text-[11px] text-[color:var(--text-muted)] mt-0.5">
                          {t(RESOURCE_TYPE_LABEL_KEYS[b.resource_type as ResourceType]) ?? b.resource_type}
                        </p>
                        {b.checked_in_at && (
                          <p className="text-[11px] text-[color:var(--status-free-text)] mt-0.5">
                            {t('booking.myBookings.checkedIn', { time: fmtDateTime(b.checked_in_at) })}
                          </p>
                        )}
                        {rowUrgency !== 'none' && (
                          <div className="mt-1">
                            <CheckInUrgencyBadge urgency={rowUrgency} />
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 align-middle">
                        <div className="flex items-center gap-1.5">
                          {b.booked_by?.avatar ? (
                            <img src={b.booked_by.avatar} alt={b.booked_by.full_name} className="h-6 w-6 rounded-full object-cover flex-shrink-0" />
                          ) : (
                            <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium bg-[color:var(--bg-raised)] text-[color:var(--text-secondary)] flex-shrink-0">
                              {getInitials(b.booked_by?.full_name ?? b.user_name ?? '')}
                            </span>
                          )}
                          <span className="text-[color:var(--text-primary)]">{b.booked_by?.full_name ?? b.user_name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 align-middle font-mono text-[color:var(--text-primary)] whitespace-nowrap">
                        {fmtDayMonth(start)}
                        {' · '}
                        {fmtTime(start)}
                        {' — '}
                        {fmtTime(end)}
                      </td>
                      <td className="px-3 py-2.5 align-middle">
                        <div className="flex flex-col items-start gap-1">
                          <BookingStatusBadge status={b.status} />
                          {rowCanCheckIn && (
                            <CheckInButton booking={b} variant="row" />
                          )}
                        </div>
                      </td>
                      <td className="w-8 px-3 py-2.5 align-middle">
                        <button
                          ref={(el) => {
                            if (el) actionButtonRefs.current.set(b.id, el);
                            else actionButtonRefs.current.delete(b.id);
                          }}
                          type="button"
                          onClick={() => {
                            if (isActionsOpen) {
                              setOpenActionsId(null);
                              setDropdownCoords(null);
                            } else {
                              const btn = actionButtonRefs.current.get(b.id);
                              if (btn) {
                                const rect = btn.getBoundingClientRect();
                                setDropdownCoords({
                                  top: rect.bottom + 4,
                                  right: window.innerWidth - rect.right,
                                });
                              }
                              setOpenActionsId(b.id);
                            }
                          }}
                          className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-sm)] text-[color:var(--text-muted)] hover:bg-[color:var(--bg-hover)] transition-colors"
                          aria-label={t('booking.manage.rowActions', { id: b.id })}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {editTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={t('common.edit')}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeEditModal();
          }}
        >
          <div
            className="w-full max-w-2xl mx-2 sm:mx-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-surface)] p-4 sm:p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">
              {t('common.edit')} #{modalBooking?.id ?? editTarget.id}
            </h2>
            <p className="mt-1 text-sm text-[color:var(--text-muted)]">
              {modalBooking?.resource_name ?? editTarget.resource_name} · {(modalBooking?.booked_by?.full_name ?? modalBooking?.user_name) ?? (editTarget.booked_by?.full_name ?? editTarget.user_name)}
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-sm text-[color:var(--text-secondary)]">
                {t('common.start')}
                <input
                  type="datetime-local"
                  value={editStart}
                  onChange={(event) => setEditStart(event.target.value)}
                  lang={dateLocale}
                  className="mt-1 w-full rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-[color:var(--bg-surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                />
              </label>
              <label className="text-sm text-[color:var(--text-secondary)]">
                {t('common.end')}
                <input
                  type="datetime-local"
                  value={editEnd}
                  onChange={(event) => setEditEnd(event.target.value)}
                  lang={dateLocale}
                  className="mt-1 w-full rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-[color:var(--bg-surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                />
              </label>
            </div>

            {editResourceData?.type === RESOURCE_TYPES.MEETING_ROOM ? (
              <div className="mt-4 space-y-3">
                {canManageParticipants ? (
                  <>
                    <label className="text-sm text-[color:var(--text-secondary)]">
                      {t('common.addMember')}
                      <select
                        value={selectedParticipantId}
                        onChange={(event) => setSelectedParticipantId(event.target.value)}
                        className="mt-1 w-full rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-[color:var(--bg-surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                      >
                        <option value="">{t('common.selectEmployee')}</option>
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
                      className="rounded-[var(--radius-sm)] border border-[color:var(--brand)] px-3 py-2 text-sm font-medium text-[color:var(--brand)] hover:bg-[color:var(--brand-subtle)] disabled:opacity-50"
                    >
                      {t('common.addMember')}
                    </button>
                    <ul className="space-y-2">
                      {(modalBooking?.participants ?? []).map((participant) => (
                        <li
                          key={participant.id}
                          className="flex items-center justify-between rounded-[var(--radius-sm)] border border-[color:var(--border)] px-3 py-2"
                        >
                          <span className="text-sm text-[color:var(--text-secondary)]">
                            {participant.full_name || participant.email}
                          </span>
                          <button
                            type="button"
                            disabled={removeParticipantMutation.isPending}
                            onClick={() => {
                              removeParticipantMutation.mutate({
                                bookingId: modalBooking?.id ?? editTarget.id,
                                userId: participant.id,
                              });
                            }}
                            className="rounded-[var(--radius-sm)] border border-rose-300 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                          >
                            {t('common.delete')}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="text-sm text-[color:var(--text-muted)]">
                    {t('common.addMember')}
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-4 text-sm text-[color:var(--text-muted)]">
                {t('booking.modal.participants')}
              </p>
            )}

            {editError && (
              <p className="mt-3 text-sm text-[color:var(--status-busy-text)]" role="alert">
                {editError}
              </p>
            )}
            {editSuccess && (
              <p className="mt-3 text-sm text-[color:var(--status-free-text)]">{editSuccess}</p>
            )}

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={closeEditModal}
                disabled={updateTimeMutation.isPending}
                className="rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-[color:var(--bg-surface)] px-4 py-2 text-sm font-medium text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-raised)] disabled:opacity-50"
              >
                {t('common.close')}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!editStart || !editEnd) {
                    setEditError(t('booking.modal.errors.timesRequired'));
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
                className="rounded-[var(--radius-sm)] bg-[color:var(--brand)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {updateTimeMutation.isPending ? t('common.saving') : t('booking.myBookings.saveTime')}
              </button>
            </div>
          </div>
        </div>
      )}

      {openActionsId !== null && dropdownCoords && (() => {
        const booking = rows.find((b) => b.id === openActionsId);
        if (!booking) return null;

        const dropdownNow = new Date();
        const canCancel =
          statusTab === 'upcoming' &&
          booking.status === BOOKING_STATUSES.CONFIRMED;
        const dropdownCanCheckIn =
          statusTab === 'upcoming' &&
          user !== null &&
          booking.user === user.id &&
          isCheckInAllowed(booking, dropdownNow);
        const showQrLink = shouldShowBookingQrPanel(booking);

        const closeDropdown = () => {
          setOpenActionsId(null);
          setDropdownCoords(null);
        };

        return createPortal(
          <>
            <div
              className="fixed inset-0 z-[49]"
              onClick={closeDropdown}
              aria-hidden="true"
            />
            <div
              style={{ top: dropdownCoords.top, right: dropdownCoords.right }}
              className="fixed z-50 w-40 rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-[color:var(--bg-surface)] shadow-[var(--shadow-card)] py-1"
              role="menu"
            >
              {showQrLink && (
                <Link
                  to={`/bookings/${booking.id}`}
                  role="menuitem"
                  onClick={closeDropdown}
                  className="flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-[13px] text-[color:var(--text-primary)] hover:bg-[color:var(--bg-hover)] transition-colors"
                >
                  <QrCode className="h-3.5 w-3.5" />
                  {t('booking.myBookings.showQr')}
                </Link>
              )}
              {dropdownCanCheckIn && (
                <button
                  type="button"
                  role="menuitem"
                  disabled={checkInMutation.isPending}
                  onClick={() => {
                    setListError(null);
                    closeDropdown();
                    checkInMutation.mutate({ bookingId: booking.id });
                  }}
                  className="w-full px-3 py-1.5 text-left text-[13px] text-[color:var(--status-free-text)] hover:bg-[color:var(--bg-hover)] transition-colors disabled:opacity-50"
                >
                  {checkInMutation.isPending ? '…' : t('booking.myBookings.checkIn')}
                </button>
              )}
              {canCancel && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => { openEditModal(booking); }}
                  className="w-full px-3 py-1.5 text-left text-[13px] text-[color:var(--text-primary)] hover:bg-[color:var(--bg-hover)] transition-colors"
                >
                  {t('common.edit')}
                </button>
              )}
              {canCancel && (
                <button
                  type="button"
                  role="menuitem"
                  disabled={cancelMutation.isPending}
                  onClick={() => {
                    setListError(null);
                    closeDropdown();
                    cancelMutation.mutate({ bookingId: booking.id });
                  }}
                  className="w-full px-3 py-1.5 text-left text-[13px] text-[color:var(--status-busy-text)] hover:bg-[color:var(--bg-hover)] transition-colors disabled:opacity-50"
                >
                  {t('common.cancel')}
                </button>
              )}
              {!dropdownCanCheckIn && !canCancel && !showQrLink && (
                <span className="block px-3 py-1.5 text-[12px] text-[color:var(--text-muted)]">
                  {t('booking.manage.noActions')}
                </span>
              )}
            </div>
          </>,
          document.body,
        );
      })()}

      {/* Recurring scope modal */}
      {recurringScopeModal && (
        <RecurringScopeModal
          mode={recurringScopeModal.mode}
          bookingLabel={recurringScopeModal.bookingLabel}
          onClose={() => setRecurringScopeModal(null)}
          onConfirm={(scope) => {
            if (scope === 'all') {
              recurringDeleteMutation.mutate(recurringScopeModal.seriesId);
            } else {
              setRecurringScopeModal(null);
            }
          }}
        />
      )}
    </div>
  );
}

// ─── Inline RecurringTabContent ──────────────────────────────────────────────

const WEEKDAY_LABEL_KEYS_TAB = [
  'booking.recurring.monday',
  'booking.recurring.tuesday',
  'booking.recurring.wednesday',
  'booking.recurring.thursday',
  'booking.recurring.friday',
  'booking.recurring.saturday',
  'booking.recurring.sunday',
] as const;

interface RecurringTabContentProps {
  userId: number | null;
  onScopeModal: (modal: ScopeModalState) => void;
}

function RecurringTabContent({ userId, onScopeModal }: RecurringTabContentProps) {
  const { t } = useTranslation();

  const { data: resourcesData } = useQuery({
    queryKey: ['my-bookings-recurring', 'resources'],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<{ id: number; name: string }>>(
        API.bookings.resources.list,
        { params: { page_size: 1000, ordering: 'name' } },
      );
      return data.results;
    },
  });

  const { data: recurringData, isLoading } = useQuery({
    queryKey: ['my-bookings-recurring'],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<RecurringBooking> | RecurringBooking[]>(
        API.bookings.recurring.list,
      );
      return Array.isArray(data) ? data : data.results;
    },
  });

  const resourceNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const r of resourcesData ?? []) map.set(r.id, r.name);
    return map;
  }, [resourcesData]);

  const dayLabels = WEEKDAY_LABEL_KEYS_TAB.map((key) => t(key));

  const myRows = useMemo(
    () => (recurringData ?? []).filter((r) => !userId || r.user === userId),
    [recurringData, userId],
  );

  if (isLoading) {
    return (
      <div className="px-4 py-10">
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-20 rounded-[var(--radius-sm)] bg-[color:var(--bg-raised)] animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (myRows.length === 0) {
    return (
      <div className="px-4 py-12 text-center">
        <p className="text-[13px] font-medium text-[color:var(--text-primary)]">
          {t('recurring.noRecurring')}
        </p>
        <p className="mt-1 text-[12px] text-[color:var(--text-muted)]">
          {t('recurring.noRecurringSub')}
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-3">
      {myRows.map((series) => {
        const seriesEntries = recurringSeriesDateEntries({
          dayOfWeek: series.day_of_week,
          validFrom: series.valid_from,
          repeatUntil: series.valid_until,
          endTime: series.end_time,
          recurrenceType: series.recurrence_type ?? 'weekly',
        });
        const nextEntry = seriesEntries.find((e) => e.status === 'will_create');
        const seriesNotStarted =
          series.is_active &&
          nextEntry !== undefined &&
          new Date(`${nextEntry.iso}T${series.start_time}`) > new Date();
        return (
          <RecurringSeriesCard
            key={series.id}
            series={series}
            resourceName={resourceNameById.get(series.resource_id) ?? t('booking.recurring.resourcePrefix', { id: series.resource_id })}
            dayLabel={dayLabels[series.day_of_week] ?? String(series.day_of_week)}
            onCancel={seriesNotStarted ? () =>
              onScopeModal({
                mode: 'cancel',
                bookingLabel: resourceNameById.get(series.resource_id) ?? '...',
                seriesId: series.id,
              }) : undefined}
          />
        );
      })}
    </div>
  );
}
