import { Fragment, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { dateLocaleTag } from '@/shared/lib/localeFormat';
import { Link } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { USER_ROLES } from '@/shared/config/constants';
import { useAuth } from '@/shared/hooks/useAuth';
import { cn } from '@/shared/lib/cn';
import { getApiError } from '@/shared/lib/getApiError';
import { localTodayIso, recurringSeriesDateEntries } from '@/shared/lib/recurringSeriesDates';
import type {
  BookingResourceListItem,
  PaginatedResponse,
  RecurringBooking,
  RecurringBookingCreatePayload,
  RecurringBookingCreateResponse,
} from '@/shared/types';

const WEEKDAY_KEYS = [
  'booking.recurring.monday',
  'booking.recurring.tuesday',
  'booking.recurring.wednesday',
  'booking.recurring.thursday',
  'booking.recurring.friday',
  'booking.recurring.saturday',
  'booking.recurring.sunday',
] as const;

export default function RecurringBookingsPage() {
  const { t, i18n } = useTranslation();
  const dateLocale = dateLocaleTag(i18n.language);
  const WEEKDAY_OPTIONS = WEEKDAY_KEYS.map((key, idx) => ({ value: idx, label: t(key) }));
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [resourceId, setResourceId] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState('0');
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:00');
  const [repeatUntil, setRepeatUntil] = useState(localTodayIso);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastSkippedDates, setLastSkippedDates] = useState<string[]>([]);
  const [expandedSeriesId, setExpandedSeriesId] = useState<number | null>(null);

  const { data: resourcesData, isLoading: resourcesLoading } = useQuery({
    queryKey: ['recurring-bookings', 'resources'],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<BookingResourceListItem>>(
        API.bookings.resources.list,
        { params: { page_size: 1000, ordering: 'name' } },
      );
      return data.results;
    },
  });

  const { data: recurringRows, isLoading: recurringLoading, isError: recurringError } = useQuery({
    queryKey: ['recurring-bookings', 'list'],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<RecurringBooking> | RecurringBooking[]>(
        API.bookings.recurring.list,
      );
      return Array.isArray(data) ? data : data.results;
    },
  });

  const resourceNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const resource of resourcesData ?? []) {
      map.set(resource.id, resource.name);
    }
    return map;
  }, [resourcesData]);

  const selectedResource = useMemo(() => {
    const id = Number(resourceId);
    if (!id) return null;
    return (resourcesData ?? []).find((resource) => resource.id === id) ?? null;
  }, [resourceId, resourcesData]);

  const allowedWeekdayValues = useMemo(() => {
    const sourceDays = selectedResource?.availability_days;
    if (!sourceDays || sourceDays.length === 0) {
      return WEEKDAY_OPTIONS.map((option) => option.value);
    }
    return Array.from(
      new Set(sourceDays.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)),
    ).sort((left, right) => left - right);
  }, [selectedResource]);

  const allowedWeekdayOptions = useMemo(
    () => WEEKDAY_OPTIONS.filter((option) => allowedWeekdayValues.includes(option.value)),
    [allowedWeekdayValues],
  );

  useEffect(() => {
    if (allowedWeekdayValues.length === 0) return;
    if (!allowedWeekdayValues.includes(Number(dayOfWeek))) {
      setDayOfWeek(String(allowedWeekdayValues[0]));
    }
  }, [allowedWeekdayValues, dayOfWeek]);

  const formatSeriesDate = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(dateLocale, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    return (iso: string) => formatter.format(new Date(`${iso}T12:00:00`));
  }, [dateLocale]);

  const createMutation = useMutation({
    mutationFn: async (payload: RecurringBookingCreatePayload) => {
      const { data } = await apiClient.post<RecurringBookingCreateResponse>(
        API.bookings.recurring.create,
        payload,
      );
      return data;
    },
    onSuccess: async (data) => {
      const skippedDates = data.skipped_dates ?? [];
      if (skippedDates.length > 0) {
        try {
          await apiClient.delete(API.bookings.recurring.detail(String(data.id)));
        } catch {
          // Если откат не удался, всё равно показываем понятную причину пользователю.
        }
        setLastSkippedDates(skippedDates);
        setErrorMessage(t('booking.recurring.conflictError'));
        await queryClient.invalidateQueries({ queryKey: ['recurring-bookings', 'list'] });
        return;
      }
      setErrorMessage(null);
      setLastSkippedDates([]);
      await queryClient.invalidateQueries({ queryKey: ['recurring-bookings', 'list'] });
    },
    onError: (error: unknown) => {
      setLastSkippedDates([]);
      setErrorMessage(getApiError(error).message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(API.bookings.recurring.detail(String(id)));
    },
    onSuccess: async () => {
      setErrorMessage(null);
      setExpandedSeriesId(null);
      await queryClient.invalidateQueries({ queryKey: ['recurring-bookings', 'list'] });
    },
    onError: (error: unknown) => {
      setErrorMessage(getApiError(error).message);
    },
  });

  const visibleRecurringRows = useMemo(() => {
    const rows = recurringRows ?? [];
    if (!user) return rows;
    if (user.role === USER_ROLES.EMPLOYEE) {
      return rows.filter((row) => row.user === user.id);
    }
    return rows;
  }, [recurringRows, user]);

  function canCancelSeries(row: RecurringBooking): boolean {
    if (!user) return false;
    if (user.role === USER_ROLES.SUPERADMIN) return true;
    if (user.role === USER_ROLES.COMPANY_ADMIN) {
      if (row.user === user.id) return true;
      return row.company === user.company_id && row.user_role === USER_ROLES.EMPLOYEE;
    }
    if (user.role === USER_ROLES.EMPLOYEE) {
      return row.user === user.id;
    }
    return false;
  }

  function toggleSeriesExpanded(rowId: number) {
    setExpandedSeriesId((current) => (current === rowId ? null : rowId));
  }

  const listColumnCount =
    (user?.role === USER_ROLES.COMPANY_ADMIN || user?.role === USER_ROLES.SUPERADMIN ? 6 : 5);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-primary">{t('booking.recurring.title')}</h1>
        <Link
          to="/bookings/catalog"
          className="rounded-lg border border-default bg-raised px-3 py-2 text-sm font-medium text-secondary hover:bg-hover"
        >{t('common.goToCatalog')}</Link>
      </div>

      {errorMessage && (
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-danger-subtle px-4 py-3 text-sm text-danger">
          {errorMessage}
        </div>
      )}

      {lastSkippedDates.length > 0 && (
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-danger-subtle px-4 py-3 text-sm text-danger">
          <p className="font-medium">{t('booking.recurring.conflictsTitle')}</p>
          <p className="mt-1">{lastSkippedDates.join(', ')}</p>
        </div>
      )}

      <section className="rounded-2xl border border-default bg-raised p-5">
        <h2 className="text-lg font-semibold text-primary">{t('booking.recurring.createSection')}</h2>
        <form
          className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          onSubmit={(event) => {
            event.preventDefault();
            setErrorMessage(null);
            setLastSkippedDates([]);
            createMutation.mutate({
              resource_id: Number(resourceId),
              day_of_week: Number(dayOfWeek),
              start_time: startTime,
              end_time: endTime,
              repeat_until: repeatUntil,
            });
          }}
        >
          <label className="text-sm text-secondary">
            {t('booking.recurring.resourceLabel')}
            <select
              required
              value={resourceId}
              onChange={(event) => setResourceId(event.target.value)}
              className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary"
              disabled={resourcesLoading}
            >
              <option value="">{t('booking.recurring.selectResource')}</option>
              {(resourcesData ?? []).map((resource) => (
                <option key={resource.id} value={resource.id}>
                  {resource.name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm text-secondary">
            {t('booking.recurring.dayOfWeekLabel')}
            <select
              required
              value={dayOfWeek}
              onChange={(event) => setDayOfWeek(event.target.value)}
              className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary"
              disabled={allowedWeekdayOptions.length === 0}
            >
              {allowedWeekdayOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm text-secondary">
            {t('booking.recurring.repeatUntilLabel')}
            <input
              type="date"
              required
              min={localTodayIso()}
              value={repeatUntil}
              onChange={(event) => setRepeatUntil(event.target.value)}
              lang={dateLocale}
              className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary"
            />
          </label>

          <label className="text-sm text-secondary">{t('common.start')}<input
              type="time"
              required
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
              lang={dateLocale}
              className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary"
            />
          </label>

          <label className="text-sm text-secondary">{t('common.end')}<input
              type="time"
              required
              value={endTime}
              onChange={(event) => setEndTime(event.target.value)}
              lang={dateLocale}
              className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary"
            />
          </label>

          <div className="sm:col-span-2 lg:col-span-1 flex items-end">
            <button
              type="submit"
              disabled={createMutation.isPending || !resourceId || allowedWeekdayOptions.length === 0}
              className="w-full rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
            >
              {createMutation.isPending ? t('common.creating') : t('booking.recurring.createBtn')}
            </button>
          </div>

          {resourceId && (
            <p className="sm:col-span-2 lg:col-span-3 text-xs text-secondary">
              {t('booking.recurring.availableDaysHint')}{' '}
              {allowedWeekdayOptions.length > 0
                ? allowedWeekdayOptions.map((option) => option.label).join(', ')
                : t('booking.recurring.noDays')}
            </p>
          )}
        </form>
      </section>

      <div>
        <div className="mb-3">
          <h2 className="text-[15px] font-semibold text-[color:var(--text-primary)]">
            {user?.role === USER_ROLES.COMPANY_ADMIN || user?.role === USER_ROLES.SUPERADMIN
              ? t('booking.recurring.listSectionAdmin')
              : t('booking.recurring.listSectionMy')}
          </h2>
          <p className="mt-1 text-xs text-[color:var(--text-muted)]">{t('booking.recurring.expandSeriesHint')}</p>
        </div>

        <div className="bg-[color:var(--bg-surface)] border border-[color:var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-card)] overflow-hidden">
          {recurringError ? (
            <div className="px-4 py-12 text-center text-[13px] text-[color:var(--text-muted)]">
              {t('booking.recurring.loadError')}
            </div>
          ) : recurringLoading ? (
            <div className="px-4 py-12 text-center text-[13px] text-[color:var(--text-muted)]">
              {t('common.loading')}
            </div>
          ) : visibleRecurringRows.length === 0 ? (
            <div className="px-4 py-12 text-center text-[13px] text-[color:var(--text-muted)]">
              {t('booking.recurring.noSeries')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13px]" role="table">
                <thead>
                  <tr className="border-b border-[color:var(--border)]">
                    <th className="px-3 py-2 text-left text-[11px] font-medium text-[color:var(--text-muted)] whitespace-nowrap">
                      {t('dashboard.table.resource')}
                    </th>
                    <th className="px-3 py-2 text-left text-[11px] font-medium text-[color:var(--text-muted)] whitespace-nowrap">
                      {t('booking.recurring.dayOfWeekLabel')}
                    </th>
                    <th className="px-3 py-2 text-left text-[11px] font-medium text-[color:var(--text-muted)] whitespace-nowrap">
                      {t('booking.manage.dateTime')}
                    </th>
                    <th className="px-3 py-2 text-left text-[11px] font-medium text-[color:var(--text-muted)] whitespace-nowrap">
                      {t('booking.recurring.repeatUntilLabel')}
                    </th>
                    {(user?.role === USER_ROLES.COMPANY_ADMIN || user?.role === USER_ROLES.SUPERADMIN) && (
                      <th className="px-3 py-2 text-left text-[11px] font-medium text-[color:var(--text-muted)] whitespace-nowrap">
                        {t('dashboard.table.user')}
                      </th>
                    )}
                    <th className="px-3 py-2" aria-label={t('booking.manage.actions')} />
                  </tr>
                </thead>
                <tbody>
                  {visibleRecurringRows.map((row) => {
                    const isExpanded = expandedSeriesId === row.id;
                    const seriesDates = recurringSeriesDateEntries({
                      dayOfWeek: row.day_of_week,
                      validFrom: row.valid_from,
                      repeatUntil: row.valid_until,
                      endTime: row.end_time,
                    });

                    return (
                      <Fragment key={row.id}>
                        <tr
                          className={cn(
                            'border-b border-[color:var(--border)] transition-colors cursor-pointer',
                            isExpanded
                              ? 'bg-[color:var(--bg-hover)]'
                              : 'hover:bg-[color:var(--bg-hover)]',
                          )}
                          onClick={() => toggleSeriesExpanded(row.id)}
                        >
                          <td className="px-3 py-2.5 align-middle text-[13px] font-medium text-[color:var(--text-primary)]">
                            {resourceNameById.get(row.resource_id) ?? t('booking.recurring.resourcePrefix', { id: row.resource_id })}
                          </td>
                          <td className="px-3 py-2.5 align-middle text-[13px] text-[color:var(--text-muted)]">
                            {WEEKDAY_OPTIONS[row.day_of_week]?.label ?? String(row.day_of_week)}
                          </td>
                          <td className="px-3 py-2.5 align-middle text-[13px] font-mono text-[color:var(--text-primary)]">
                            {row.start_time.slice(0, 5)}–{row.end_time.slice(0, 5)}
                          </td>
                          <td className="px-3 py-2.5 align-middle text-[13px] text-[color:var(--text-muted)]">
                            {row.valid_until ?? t('common.noDate')}
                          </td>
                          {(user?.role === USER_ROLES.COMPANY_ADMIN || user?.role === USER_ROLES.SUPERADMIN) && (
                            <td className="px-3 py-2.5 align-middle text-[13px] text-[color:var(--text-muted)]">
                              {row.user_name ?? '—'}
                            </td>
                          )}
                          <td className="px-3 py-2.5 align-middle" onClick={(event) => event.stopPropagation()}>
                            {canCancelSeries(row) ? (
                              <button
                                type="button"
                                onClick={() => deleteMutation.mutate(row.id)}
                                disabled={deleteMutation.isPending}
                                className="inline-flex items-center gap-1 h-7 px-2.5 text-[12px] rounded-[var(--radius-sm)] border border-[color:var(--status-busy-bg)] text-[color:var(--status-busy-text)] hover:bg-[color:var(--status-busy-bg)] disabled:opacity-50 transition-colors"
                              >
                                {t('booking.recurring.cancelSeries')}
                              </button>
                            ) : (
                              <span className="text-[12px] text-[color:var(--text-muted)]">
                                {t('booking.recurring.noAccess')}
                              </span>
                            )}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="border-b border-[color:var(--border)] bg-[color:var(--bg-raised)]">
                            <td colSpan={listColumnCount} className="px-3 py-3">
                              <p className="text-xs font-medium text-[color:var(--text-primary)] mb-2">
                                {t('booking.recurring.previewTitle')}
                              </p>
                              {seriesDates.length === 0 ? (
                                <p className="text-xs text-[color:var(--text-muted)]">
                                  {t('booking.recurring.previewNoDates')}
                                </p>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  {seriesDates.map((entry) => (
                                    <div
                                      key={entry.iso}
                                      className={cn(
                                        'min-w-[9.5rem] rounded-lg border px-3 py-2',
                                        entry.status === 'will_create'
                                          ? 'border-brand/40 bg-brand/5'
                                          : 'border-[color:var(--border)] bg-[color:var(--bg-surface)] opacity-75',
                                      )}
                                    >
                                      <p className="text-sm font-medium text-[color:var(--text-primary)]">
                                        {formatSeriesDate(entry.iso)}
                                      </p>
                                      <p className="mt-0.5 font-mono text-xs text-[color:var(--text-muted)]">
                                        {row.start_time.slice(0, 5)}–{row.end_time.slice(0, 5)}
                                      </p>
                                      <p
                                        className={cn(
                                          'mt-1 text-[11px] font-medium',
                                          entry.status === 'will_create'
                                            ? 'text-brand'
                                            : 'text-[color:var(--text-muted)]',
                                        )}
                                      >
                                        {entry.status === 'will_create'
                                          ? t('booking.recurring.dateWillCreate')
                                          : t('booking.recurring.dateSkippedPast')}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
