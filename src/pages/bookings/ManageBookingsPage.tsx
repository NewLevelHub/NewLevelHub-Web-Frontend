import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { dateLocaleTag } from '@/shared/lib/localeFormat';
import { Link } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookMarked, Calendar, ChevronLeft, ChevronRight, Filter, MoreHorizontal, Repeat } from 'lucide-react';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import {
  BOOKING_STATUSES,
  BOOKING_STATUS_LABEL_KEYS,
  RESOURCE_TYPES,
  RESOURCE_TYPE_LABEL_KEYS,
  STAFF_UI_PREFIX,
  USER_ROLES,
  type BookingStatus,
} from '@/shared/config/constants';
import { useAuth } from '@/shared/hooks/useAuth';
import { getApiError } from '@/shared/lib/getApiError';
import { companiesCacheRoot } from '@/shared/lib/companyQueryKeys';
import { cn } from '@/shared/lib/cn';
import type {
  Booking,
  BookingResourceDetail,
  BookingResourceListItem,
  Company,
  CompanyMember,
  PaginatedResponse,
  UserListItem,
} from '@/shared/types';

const PAGE_SIZE = 20;

function localDateTimeToIso(value: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

type SelectOption = { id: number; label: string };
type UserOption = SelectOption & {
  email?: string;
  role?: string;
  companyId?: number | null;
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

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

type StatusBadgeProps = { status: string };

function StatusBadge({ status }: StatusBadgeProps) {
  const { t } = useTranslation();

  const colorClass = useMemo(() => {
    switch (status) {
      case BOOKING_STATUSES.CONFIRMED:
      case BOOKING_STATUSES.CHECKED_IN:
        return 'bg-[color:var(--status-free-bg)] text-[color:var(--status-free-text)]';
      case 'pending':
        return 'bg-[color:var(--status-soon-bg)] text-[color:var(--status-soon-text)]';
      case BOOKING_STATUSES.CANCELLED:
      case BOOKING_STATUSES.NO_SHOW:
        return 'bg-[color:var(--status-busy-bg)] text-[color:var(--status-busy-text)]';
      case BOOKING_STATUSES.COMPLETED:
        return 'bg-[color:var(--status-na-bg)] text-[color:var(--status-na-text)]';
      default:
        return 'bg-[color:var(--status-na-bg)] text-[color:var(--status-na-text)]';
    }
  }, [status]);

  const label = BOOKING_STATUS_LABEL_KEYS[status as BookingStatus]
    ? t(BOOKING_STATUS_LABEL_KEYS[status as BookingStatus])
    : status;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium',
        colorClass,
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current flex-shrink-0" />
      {label}
    </span>
  );
}

export default function ManageBookingsPage() {
  const { t, i18n } = useTranslation();
  const dateLocale = dateLocaleTag(i18n.language);
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

  const [openActionsId, setOpenActionsId] = useState<number | null>(null);
  const [dropdownCoords, setDropdownCoords] = useState<{ top: number; right: number } | null>(null);
  const actionButtonRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

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

  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelFormError, setCancelFormError] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<Booking | null>(null);
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [selectedParticipantId, setSelectedParticipantId] = useState('');
  const [editFormError, setEditFormError] = useState<string | null>(null);

  const { data: companiesData } = useQuery({
    queryKey: [...companiesCacheRoot(user?.id), 'admin-bookings', 'company-options'],
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
        return response.results.map<UserOption>((u) => ({
          id: u.id,
          label: `${u.first_name} ${u.last_name}`.trim() || u.email,
          email: u.email,
          role: u.role,
          companyId: u.company?.id ?? null,
        }));
      }

      const companyIdForMembers = user?.company?.id;
      if (!companyIdForMembers) return [];

      const { data: response } = await apiClient.get<CompanyMember[] | PaginatedResponse<CompanyMember>>(
        API.companies.members(String(companyIdForMembers)),
        { params: { page_size: 1000 } },
      );
      const rows = Array.isArray(response) ? response : response.results;
      return rows.map<UserOption>((member) => ({
        id: member.id,
        label: member.full_name || member.email,
        email: member.email,
        role: member.role,
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
    refetchInterval: 30_000,
    refetchOnMount: 'always',
  });

  const { data: editBookingData } = useQuery({
    queryKey: ['admin-bookings', 'edit-booking', editTarget?.id],
    enabled: Boolean(editTarget?.id),
    queryFn: async () => {
      const { data: response } = await apiClient.get<Booking>(
        API.bookings.reservations.detail(String(editTarget!.id)),
      );
      return response;
    },
  });

  const modalBooking = editBookingData ?? editTarget;

  const { data: editResourceData } = useQuery({
    queryKey: ['admin-bookings', 'edit-resource', modalBooking?.resource],
    enabled: Boolean(modalBooking?.resource),
    queryFn: async () => {
      const { data: response } = await apiClient.get<BookingResourceDetail>(
        API.bookings.resources.detail(String(modalBooking!.resource)),
      );
      return response;
    },
  });

  const adminCancelMutation = useMutation({
    mutationFn: async ({ bookingId, reason }: { bookingId: number; reason: string }) => {
      await apiClient.post(API.bookings.reservations.adminCancel(String(bookingId)), { reason });
    },
    onSuccess: (_, { bookingId }) => {
      queryClient.setQueryData<PaginatedResponse<Booking>>(
        ['admin-bookings', queryParams],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            results: old.results.map((b) =>
              b.id === bookingId ? { ...b, status: BOOKING_STATUSES.CANCELLED } : b,
            ),
          };
        },
      );
      void queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
      setCancelTarget(null);
      setCancelReason('');
      setCancelFormError(null);
    },
    onError: (mutationError) => {
      setCancelFormError(getApiError(mutationError).message);
    },
  });

  const updateTimeMutation = useMutation({
    mutationFn: async ({ bookingId, startTime, endTime }: { bookingId: number; startTime: string; endTime: string }) => {
      await apiClient.patch(API.bookings.reservations.detail(String(bookingId)), {
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
      void queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      setEditFormError(null);
    },
    onError: (mutationError) => {
      setEditFormError(getApiError(mutationError).message);
    },
  });

  const addParticipantMutation = useMutation({
    mutationFn: async ({ bookingId, userId: uid }: { bookingId: number; userId: number }) => {
      await apiClient.post(API.bookings.reservations.addParticipants(String(bookingId)), {
        user_ids: [uid],
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-bookings', 'edit-booking'] });
      setSelectedParticipantId('');
      setEditFormError(null);
    },
    onError: (mutationError) => {
      setEditFormError(getApiError(mutationError).message);
    },
  });

  const removeParticipantMutation = useMutation({
    mutationFn: async ({ bookingId, userId: uid }: { bookingId: number; userId: number }) => {
      await apiClient.delete(API.bookings.reservations.removeParticipant(String(bookingId), String(uid)));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-bookings', 'edit-booking'] });
      setEditFormError(null);
    },
    onError: (mutationError) => {
      setEditFormError(getApiError(mutationError).message);
    },
  });

  const rows = data?.results ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const rangeStart = (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, totalCount);

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
    setOpenActionsId(null);
  };

  const submitAdminCancel = () => {
    if (!cancelTarget) return;
    const reason = cancelReason.trim();
    if (!reason) {
      setCancelFormError(t('booking.manage.cancelReasonRequired'));
      return;
    }
    adminCancelMutation.mutate({ bookingId: cancelTarget.id, reason });
  };

  const openEditModal = (booking: Booking) => {
    setEditTarget(booking);
    setEditStart(toDateTimeLocalValue(booking.start_time));
    setEditEnd(toDateTimeLocalValue(booking.end_time));
    setSelectedParticipantId('');
    setEditFormError(null);

  };

  const closeEditModal = () => {
    if (updateTimeMutation.isPending || addParticipantMutation.isPending || removeParticipantMutation.isPending) return;
    setEditTarget(null);
    setEditStart('');
    setEditEnd('');
    setSelectedParticipantId('');
    setEditFormError(null);
    setOpenActionsId(null);
  };

  const submitEditTime = () => {
    if (!editTarget) return;
    if (!editStart || !editEnd) {
      setEditFormError(t('booking.detail.startEndRequired'));
      return;
    }
    setEditFormError(null);
    updateTimeMutation.mutate({
      bookingId: editTarget.id,
      startTime: editStart,
      endTime: editEnd,
    });
  };

  const queryErrorText = isError ? getApiError(error).message : null;

  // Status chip options for filter bar
  const statusChips = useMemo(() => [
    { value: '', label: t('common.allStatuses') },
    { value: BOOKING_STATUSES.CONFIRMED, label: t(BOOKING_STATUS_LABEL_KEYS[BOOKING_STATUSES.CONFIRMED]) },
    { value: 'pending', label: t('booking.manage.statusPending') },
    { value: BOOKING_STATUSES.CANCELLED, label: t(BOOKING_STATUS_LABEL_KEYS[BOOKING_STATUSES.CANCELLED]) },
  ], [t]);

  const selectClass = 'w-full rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-[color:var(--bg-surface)] px-2.5 py-1.5 text-[13px] text-[color:var(--text-primary)] focus:outline-none';

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-[color:var(--text-primary)] leading-tight">
            {t('booking.manage.title')}
          </h1>
          {totalCount > 0 && (
            <p className="mt-0.5 text-[13px] text-[color:var(--text-secondary)]">
              {t('booking.manage.activeCount', { count: totalCount })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            to="/bookings/my"
            className="inline-flex items-center gap-1.5 h-[34px] px-3 text-[13px] font-medium border border-[color:var(--border)] bg-[color:var(--bg-surface)] rounded-[var(--radius-sm)] text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-hover)] transition-colors"
          >
            <BookMarked className="w-3.5 h-3.5" />
            {t('common.myBookings')}
          </Link>
          {(user?.role === USER_ROLES.SUPERADMIN || user?.role === USER_ROLES.COMPANY_ADMIN) && (
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
            className="inline-flex items-center gap-1.5 h-8 px-3 text-[13px] font-medium bg-[color:var(--brand)] text-white rounded-[var(--radius-sm)] hover:opacity-90 transition-opacity"
          >
            {t('booking.manage.createBooking')}
          </Link>
        </div>
      </div>

      {/* Secondary filter row */}
      <div className={cn(
        'grid gap-2 grid-cols-2 sm:grid-cols-3',
        isSuperadmin ? 'lg:grid-cols-7' : 'lg:grid-cols-6',
      )}>
        {isSuperadmin && (
          <select
            value={companyId}
            onChange={(e) => { setCompanyId(e.target.value); setPage(1); }}
            className={selectClass}
            aria-label={t('common.allCompanies')}
          >
            <option value="">{t('common.allCompanies')}</option>
            {companyOptions.map((option) => (
              <option key={option.id} value={String(option.id)}>{option.label}</option>
            ))}
          </select>
        )}
        <select
          value={userId}
          onChange={(e) => { setUserId(e.target.value); setPage(1); }}
          className={selectClass}
          aria-label={t('booking.manage.allUsers')}
        >
          <option value="">{t('booking.manage.allUsers')}</option>
          {userOptions.map((option) => (
            <option key={option.id} value={String(option.id)}>{option.label}</option>
          ))}
        </select>
        <select
          value={resourceId}
          onChange={(e) => { setResourceId(e.target.value); setPage(1); }}
          className={selectClass}
          aria-label={t('booking.manage.allResources')}
        >
          <option value="">{t('booking.manage.allResources')}</option>
          {resourceOptions.map((option) => (
            <option key={option.id} value={String(option.id)}>{option.label}</option>
          ))}
        </select>
        <select
          value={resourceType}
          onChange={(e) => { setResourceType(e.target.value); setPage(1); }}
          className={selectClass}
          aria-label={t('common.bookingFilter.allTypes')}
        >
          {resourceTypeOptions.map((option) => (
            <option key={option.value || 'all'} value={option.value}>{option.label}</option>
          ))}
        </select>
        <input
          type="datetime-local"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          lang={dateLocale}
          className={selectClass}
          aria-label={t('common.dateFrom')}
          title={t('common.dateFrom')}
        />
        <input
          type="datetime-local"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
          lang={dateLocale}
          className={selectClass}
          aria-label={t('common.dateTo')}
          title={t('common.dateTo')}
        />
        <button
          type="button"
          onClick={resetFilters}
          className={cn(selectClass, 'text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-hover)] transition-colors cursor-pointer')}
        >
          {t('common.resetFilters')}
        </button>
      </div>

      {queryErrorText && (
        <div className="rounded-[var(--radius-sm)] border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700" role="alert">
          {queryErrorText}
        </div>
      )}

      {/* Main card */}
      <div className="bg-[color:var(--bg-surface)] border border-[color:var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-card)] overflow-hidden">

        {/* Filter bar */}
        <div className="flex items-center gap-1.5 flex-wrap px-4 py-3 border-b border-[color:var(--border)]">
          {/* Date range button (display only) */}
          <button
            type="button"
            className="inline-flex items-center gap-1.5 h-[30px] px-2.5 text-[12px] border border-[color:var(--border)] bg-[color:var(--bg-surface)] rounded-[var(--radius-sm)] text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-hover)] transition-colors"
          >
            <Calendar className="w-3 h-3 flex-shrink-0" />
            {dateFrom || dateTo
              ? `${dateFrom ? new Date(dateFrom).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : '…'} — ${dateTo ? new Date(dateTo).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : '…'}`
              : t('booking.manage.allDates')
            }
          </button>

          {/* Company filter (superadmin) */}
          {isSuperadmin && (
            <button
              type="button"
              className="inline-flex items-center gap-1.5 h-[30px] px-2.5 text-[12px] border border-[color:var(--border)] bg-[color:var(--bg-surface)] rounded-[var(--radius-sm)] text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-hover)] transition-colors"
            >
              <Filter className="w-3 h-3 flex-shrink-0" />
              {companyId
                ? (companyNameById.get(Number(companyId)) ?? t('common.allCompanies'))
                : t('common.allCompanies')
              }
            </button>
          )}

          {/* Resource filter */}
          <button
            type="button"
            className="inline-flex items-center gap-1.5 h-[30px] px-2.5 text-[12px] border border-[color:var(--border)] bg-[color:var(--bg-surface)] rounded-[var(--radius-sm)] text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-hover)] transition-colors"
          >
            {resourceId
              ? (resourceOptions.find((r) => String(r.id) === resourceId)?.label ?? t('booking.manage.allResources'))
              : t('booking.manage.allResources')
            }
          </button>

          {/* Separator */}
          <span className="self-stretch w-px bg-[color:var(--border)] flex-shrink-0 my-0.5" aria-hidden="true" />

          {/* Status chips */}
          {statusChips.map((chip) => (
            <button
              key={chip.value}
              type="button"
              onClick={() => { setStatusFilter(chip.value); setPage(1); }}
              className={cn(
                'inline-flex items-center px-2.5 py-1 text-[12px] rounded-full transition-colors',
                statusFilter === chip.value
                  ? 'border-transparent bg-[color:var(--brand-subtle)] text-[color:var(--brand-text)] cursor-pointer'
                  : 'border border-[color:var(--border)] text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-hover)] cursor-pointer',
              )}
            >
              {chip.label}
            </button>
          ))}

          {/* Pagination — pushed to right */}
          {totalCount > 0 && (
            <div className="ml-auto flex items-center gap-1.5 text-[12px] text-[color:var(--text-muted)]">
              <span>
                {t('booking.manage.showing', {
                  start: rangeStart,
                  end: rangeEnd,
                  total: totalCount,
                })}
              </span>
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label={t('common.previousPage')}
                className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-sm)] text-[color:var(--text-muted)] hover:bg-[color:var(--bg-hover)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label={t('common.nextPage')}
                className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-sm)] text-[color:var(--text-muted)] hover:bg-[color:var(--bg-hover)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Table */}
        {isLoading ? (
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
            {t('booking.manage.noResults')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]" role="table">
              <thead>
                <tr className="border-b border-[color:var(--border)]">
                  <th className="px-3 py-2 text-left text-[11px] font-medium text-[color:var(--text-muted)] whitespace-nowrap">
                    {t('dashboard.table.resource')}
                  </th>
                  {isSuperadmin && (
                    <th className="px-3 py-2 text-left text-[11px] font-medium text-[color:var(--text-muted)] whitespace-nowrap">
                      {t('common.company')}
                    </th>
                  )}
                  <th className="px-3 py-2 text-left text-[11px] font-medium text-[color:var(--text-muted)] whitespace-nowrap">
                    {t('dashboard.table.user')}
                  </th>
                  <th className="px-3 py-2 text-left text-[11px] font-medium text-[color:var(--text-muted)] whitespace-nowrap">
                    {t('booking.manage.dateTime')}
                  </th>
                  <th className="px-3 py-2 text-left text-[11px] font-medium text-[color:var(--text-muted)] whitespace-nowrap">
                    {t('booking.manage.participants')}
                  </th>
                  <th className="px-3 py-2 text-left text-[11px] font-medium text-[color:var(--text-muted)] whitespace-nowrap">
                    {t('common.status')}
                  </th>
                  <th className="w-8 px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((booking) => {
                  const canAdminCancel = booking.status === BOOKING_STATUSES.CONFIRMED;
                  const canEdit = booking.status === BOOKING_STATUSES.CONFIRMED;
                  const isActionsOpen = openActionsId === booking.id;
                  const companyLabel = booking.company
                    ? (companyNameById.get(booking.company) ?? user?.company?.name ?? `#${booking.company}`)
                    : '—';

                  return (
                    <tr
                      key={booking.id}
                      className="border-b border-[color:var(--border)] hover:bg-[color:var(--bg-hover)] transition-colors"
                    >
                      <td className="px-3 py-2.5 align-middle">
                        <Link
                          to={`${STAFF_UI_PREFIX}/bookings/${booking.id}`}
                          className="font-medium text-[color:var(--text-primary)] hover:text-[color:var(--brand)] transition-colors"
                        >
                          {booking.resource_name}
                        </Link>
                      </td>
                      {isSuperadmin && (
                        <td className="px-3 py-2.5 align-middle text-[color:var(--text-muted)]">
                          {companyLabel}
                        </td>
                      )}
                      <td className="px-3 py-2.5 align-middle">
                        <div className="flex items-center gap-1.5">
                          <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium bg-[color:var(--bg-raised)] text-[color:var(--text-secondary)] flex-shrink-0">
                            {getInitials(booking.user_name ?? '')}
                          </span>
                          <span className="text-[color:var(--text-primary)]">{booking.user_name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 align-middle font-mono text-[color:var(--text-primary)]">
                        {new Date(booking.start_time).toLocaleString('ru-RU', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        {' — '}
                        {new Date(booking.end_time).toLocaleTimeString('ru-RU', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-3 py-2.5 align-middle text-[color:var(--text-muted)]">
                        {(booking.participants?.length ?? 0) > 0
                          ? booking.participants!.length
                          : '—'
                        }
                      </td>
                      <td className="px-3 py-2.5 align-middle">
                        <StatusBadge status={booking.status} />
                      </td>
                      <td className="w-8 px-3 py-2.5 align-middle">
                        <button
                          ref={(el) => {
                            if (el) actionButtonRefs.current.set(booking.id, el);
                            else actionButtonRefs.current.delete(booking.id);
                          }}
                          type="button"
                          onClick={() => {
                            if (isActionsOpen) {
                              setOpenActionsId(null);
                              setDropdownCoords(null);
                            } else {
                              const btn = actionButtonRefs.current.get(booking.id);
                              if (btn) {
                                const rect = btn.getBoundingClientRect();
                                setDropdownCoords({
                                  top: rect.bottom + 4,
                                  right: window.innerWidth - rect.right,
                                });
                              }
                              setOpenActionsId(booking.id);
                            }
                          }}
                          className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-sm)] text-[color:var(--text-muted)] hover:bg-[color:var(--bg-hover)] transition-colors"
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
        )}
      </div>

      {/* Cancel Modal */}
      {cancelTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={t('booking.manage.adminCancelTitle')}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeCancelModal();
          }}
        >
          <div
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-surface)] p-4 sm:p-5 shadow-xl"
          >
            <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">
              {t('booking.manage.adminCancelTitle')}
            </h2>
            <p className="mt-1 text-sm text-[color:var(--text-muted)]">
              #{cancelTarget.id} ({cancelTarget.resource_name}, {cancelTarget.user_name})
            </p>

            <label className="mt-4 block text-sm text-[color:var(--text-secondary)]">
              {t('booking.manage.cancelReasonLabel')}
              <textarea
                rows={3}
                value={cancelReason}
                onChange={(event) => {
                  setCancelReason(event.target.value);
                  if (cancelFormError) setCancelFormError(null);
                }}
                placeholder={t('booking.manage.cancelReasonPlaceholder')}
                className="mt-1 w-full resize-none rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-[color:var(--bg-surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
              />
            </label>

            {cancelFormError && (
              <p className="mt-2 text-sm text-[color:var(--status-busy-text)]" role="alert">
                {cancelFormError}
              </p>
            )}

            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeCancelModal}
                disabled={adminCancelMutation.isPending}
                className="rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-[color:var(--bg-surface)] px-4 py-2 text-sm font-medium text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-raised)] disabled:opacity-50"
              >
                {t('common.close')}
              </button>
              <button
                type="button"
                onClick={submitAdminCancel}
                disabled={adminCancelMutation.isPending}
                className="rounded-[var(--radius-sm)] bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {adminCancelMutation.isPending ? t('common.saving') : t('booking.manage.confirmCancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={t('common.edit')}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeEditModal();
          }}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-surface)] p-4 sm:p-5 shadow-xl"
          >
            <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">
              {t('booking.manage.editTitle', { id: modalBooking?.id ?? editTarget.id })}
            </h2>
            <p className="mt-1 text-sm text-[color:var(--text-muted)]">
              {modalBooking?.resource_name ?? editTarget.resource_name} · {modalBooking?.user_name ?? editTarget.user_name}
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
                <label className="text-sm text-[color:var(--text-secondary)]">
                  {t('common.addMember')}
                  <select
                    value={selectedParticipantId}
                    onChange={(event) => setSelectedParticipantId(event.target.value)}
                    className="mt-1 w-full rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-[color:var(--bg-surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                  >
                    <option value="">{t('common.selectEmployee')}</option>
                    {userOptions
                      .filter((option) => option.role === USER_ROLES.EMPLOYEE)
                      .filter((option) => {
                        if (!isSuperadmin) return true;
                        if (!modalBooking?.company) return true;
                        return option.companyId === modalBooking.company;
                      })
                      .filter((option) => option.id !== (modalBooking?.user ?? editTarget.user))
                      .filter((option) =>
                        !(modalBooking?.participants ?? []).some((participant) => participant.email === option.email),
                      )
                      .map((option) => (
                        <option key={option.id} value={String(option.id)}>
                          {option.label}{option.email ? ` (${option.email})` : ''}
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
              </div>
            ) : (
              <p className="mt-4 text-sm text-[color:var(--text-muted)]">
                {t('booking.manage.participantsOnlyMeeting')}
              </p>
            )}

            {editFormError && (
              <p className="mt-3 text-sm text-[color:var(--status-busy-text)]" role="alert">
                {editFormError}
              </p>
            )}

            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
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
                onClick={submitEditTime}
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
        const canAdminCancelPortal = booking.status === BOOKING_STATUSES.CONFIRMED;
        const canEditPortal = booking.status === BOOKING_STATUSES.CONFIRMED;
        return createPortal(
          <>
            <div
              className="fixed inset-0 z-[49]"
              onClick={() => { setOpenActionsId(null); setDropdownCoords(null); }}
              aria-hidden="true"
            />
            <div
              style={{ top: dropdownCoords.top, right: dropdownCoords.right }}
              className="fixed z-50 w-40 rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-[color:var(--bg-surface)] shadow-[var(--shadow-card)] py-1"
            >
              {canEditPortal && (
                <button
                  type="button"
                  onClick={() => { openEditModal(booking); setDropdownCoords(null); }}
                  className="w-full px-3 py-1.5 text-left text-[13px] text-[color:var(--text-primary)] hover:bg-[color:var(--bg-hover)] transition-colors"
                >
                  {t('common.edit')}
                </button>
              )}
              {canAdminCancelPortal && (
                <button
                  type="button"
                  onClick={() => { openCancelModal(booking); setDropdownCoords(null); }}
                  className="w-full px-3 py-1.5 text-left text-[13px] text-[color:var(--status-busy-text)] hover:bg-[color:var(--bg-hover)] transition-colors"
                >
                  {t('booking.manage.adminCancel')}
                </button>
              )}
              {!canEditPortal && !canAdminCancelPortal && (
                <span className="block px-3 py-1.5 text-[12px] text-[color:var(--text-muted)]">
                  {t('booking.manage.noActions')}
                </span>
              )}
            </div>
          </>,
          document.body,
        );
      })()}
    </div>
  );
}
