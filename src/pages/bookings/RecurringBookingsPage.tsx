import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { dateLocaleTag } from '@/shared/lib/localeFormat';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { USER_ROLES } from '@/shared/config/constants';
import { useAuth } from '@/shared/hooks/useAuth';
import { getApiError } from '@/shared/lib/getApiError';
import {
  localTodayIso,
} from '@/shared/lib/recurringSeriesDates';
import type {
  Booking,
  BookingResourceListItem,
  PaginatedResponse,
  RecurringBooking,
  RecurringBookingCreatePayload,
  RecurringBookingCreateResponse,
} from '@/shared/types';

import { RecurringBadge } from '@/features/bookings/recurring/components/RecurringBadge';
import { RecurringTable } from '@/features/bookings/recurring/components/RecurringTable';
import { RecurringForm } from '@/features/bookings/recurring/components/RecurringForm';
import { RecurringScopeModal } from '@/features/bookings/recurring/components/RecurringScopeModal';
import type { ScopeModalState } from '@/features/bookings/recurring/types';
import { Button } from '@/shared/ui/Button';

const WEEKDAY_KEYS = [
  'booking.recurring.monday',
  'booking.recurring.tuesday',
  'booking.recurring.wednesday',
  'booking.recurring.thursday',
  'booking.recurring.friday',
  'booking.recurring.saturday',
  'booking.recurring.sunday',
] as const;

type TabValue = 'series' | 'create';

export default function RecurringBookingsPage() {
  const { t, i18n } = useTranslation();
  const dateLocale = dateLocaleTag(i18n.language);
  const WEEKDAY_OPTIONS = WEEKDAY_KEYS.map((key, idx) => ({ value: idx, label: t(key) }));
  const DAY_LABELS = WEEKDAY_KEYS.map((key) => t(key));
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [tab, setTab] = useState<TabValue>('series');
  const [scopeModal, setScopeModal] = useState<ScopeModalState | null>(null);

  // Form state
  const [resourceId, setResourceId] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState('0');
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:00');
  const [freq, setFreq] = useState<'weekly' | 'daily'>('weekly');
  const [startDate, setStartDate] = useState(localTodayIso);
  const [endDate, setEndDate] = useState(localTodayIso);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastSkippedDates, setLastSkippedDates] = useState<string[]>([]);

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
  }, [selectedResource, WEEKDAY_OPTIONS]);

  const allowedWeekdayOptions = useMemo(
    () => WEEKDAY_OPTIONS.filter((option) => allowedWeekdayValues.includes(option.value)),
    [allowedWeekdayValues, WEEKDAY_OPTIONS],
  );

  useEffect(() => {
    if (allowedWeekdayValues.length === 0) return;
    if (!allowedWeekdayValues.includes(Number(dayOfWeek))) {
      setDayOfWeek(String(allowedWeekdayValues[0]));
    }
  }, [allowedWeekdayValues, dayOfWeek]);

  const canCreateSeries = useMemo(() => {
    if (!resourceId || !endDate) return false;
    return endDate > localTodayIso();
  }, [resourceId, endDate]);

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
          // Rollback failed — still show the user a meaningful error.
        }
        setLastSkippedDates(skippedDates);
        setErrorMessage(t('booking.recurring.conflictError'));
        await queryClient.invalidateQueries({ queryKey: ['recurring-bookings', 'list'] });
        return;
      }
      setErrorMessage(null);
      setLastSkippedDates([]);
      setTab('series');
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
      setScopeModal(null);
      await queryClient.invalidateQueries({ queryKey: ['recurring-bookings', 'list'] });
    },
    onError: (error: unknown) => {
      setErrorMessage(getApiError(error).message);
      setScopeModal(null);
    },
  });

  const cancelBookingMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.post(API.bookings.reservations.cancel(String(id)), { reason: '' });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['recurring-series-bookings'] });
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

  const isSuperadmin = user?.role === USER_ROLES.SUPERADMIN;

  const tabs: Array<{ value: TabValue; label: string }> = [
    { value: 'series', label: t('booking.recurring.seriesTab') },
    { value: 'create', label: t('booking.recurring.createTab') },
  ];

  return (
    <div>
      {/* Page header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 20,
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            {t('booking.recurring.title')}
            <RecurringBadge />
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4, marginBottom: 0 }}>
            {t('booking.recurring.allSeriesLabel', {
              count: visibleRecurringRows.length,
              active: visibleRecurringRows.filter((r) => r.is_active).length,
            })}
          </p>
        </div>
        <Button
          type="button"
          variant="primary"
          size="md"
          onClick={() => setTab('create')}
        >
          + {t('booking.recurring.createBtn')}
        </Button>
      </div>

      {/* Error banner */}
      {errorMessage && (
        <div
          style={{
            borderRadius: 8,
            border: '1px solid var(--danger)',
            background: 'var(--danger-bg)',
            padding: '10px 14px',
            fontSize: 13,
            color: 'var(--danger)',
            marginBottom: 14,
          }}
          role="alert"
        >
          {errorMessage}
        </div>
      )}

      {/* Conflict dates banner */}
      {lastSkippedDates.length > 0 && (
        <div
          style={{
            borderRadius: 8,
            border: '1px solid var(--danger)',
            background: 'var(--danger-bg)',
            padding: '10px 14px',
            fontSize: 13,
            color: 'var(--danger)',
            marginBottom: 14,
          }}
          role="alert"
        >
          <p style={{ margin: '0 0 4px', fontWeight: 600 }}>{t('booking.recurring.conflictsTitle')}</p>
          <p style={{ margin: 0 }}>{lastSkippedDates.join(', ')}</p>
        </div>
      )}

      {/* Tab strip */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {tabs.map((tabItem) => (
          <button
            key={tabItem.value}
            type="button"
            onClick={() => setTab(tabItem.value)}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              border: tab === tabItem.value ? 'none' : '1px solid var(--border)',
              background: tab === tabItem.value ? 'var(--brand)' : 'var(--bg-raised)',
              color: tab === tabItem.value ? 'var(--text-on-brand)' : 'var(--text-secondary)',
              fontSize: 13,
              fontWeight: tab === tabItem.value ? 600 : 400,
              cursor: 'pointer',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            {tabItem.label}
          </button>
        ))}
      </div>

      {/* Series tab */}
      {tab === 'series' && (
        recurringError ? (
          <div style={{ padding: '40px 0', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
            {t('booking.recurring.loadError')}
          </div>
        ) : (
          <RecurringTable
            rows={visibleRecurringRows}
            resourceNameById={resourceNameById}
            dayLabels={DAY_LABELS}
            isSuperadmin={isSuperadmin}
            isLoading={recurringLoading}
            onCancelSeries={(id) =>
              setScopeModal({
                mode: 'cancel',
                bookingLabel: resourceNameById.get(
                  visibleRecurringRows.find((r) => r.id === id)?.resource_id ?? 0,
                ) ?? '...',
                seriesId: id,
              })
            }
            onCancelBooking={(bookingId) => cancelBookingMutation.mutate(bookingId)}
            canCancel={canCancelSeries}
            isCancelling={deleteMutation.isPending || cancelBookingMutation.isPending}
            locale={dateLocale}
          />
        )
      )}

      {/* Create tab */}
      {tab === 'create' && (
        <RecurringForm
          resources={resourcesData ?? []}
          resourcesLoading={resourcesLoading}
          dayOptions={WEEKDAY_OPTIONS}
          allowedDayOptions={allowedWeekdayOptions}
          resourceId={resourceId}
          setResourceId={setResourceId}
          dayOfWeek={dayOfWeek}
          setDayOfWeek={setDayOfWeek}
          startTime={startTime}
          setStartTime={setStartTime}
          endTime={endTime}
          setEndTime={setEndTime}
          freq={freq}
          setFreq={setFreq}
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate}
          canCreate={canCreateSeries}
          isPending={createMutation.isPending}
          onSubmit={() => {
            setErrorMessage(null);
            setLastSkippedDates([]);
            createMutation.mutate({
              resource_id: Number(resourceId),
              recurrence_type: freq,
              start_time: startTime,
              end_time: endTime,
              repeat_until: endDate,
              ...(freq === 'weekly' ? { day_of_week: Number(dayOfWeek) } : {}),
            });
          }}
          onCancel={() => setTab('series')}
          locale={dateLocale}
        />
      )}

      {/* Scope modal */}
      {scopeModal && (
        <RecurringScopeModal
          mode={scopeModal.mode}
          bookingLabel={scopeModal.bookingLabel}
          onClose={() => setScopeModal(null)}
          onConfirm={(scope) => {
            if (scope === 'all') {
              deleteMutation.mutate(scopeModal.seriesId);
            } else {
              // this_only — find next confirmed booking for this series and cancel it
              setScopeModal(null);
              apiClient.get<PaginatedResponse<Booking> | Booking[]>(
                API.bookings.reservations.list,
                {
                  params: {
                    recurring_booking_id: scopeModal.seriesId,
                    status: 'confirmed',
                    ordering: 'start_time',
                    page_size: 1,
                  },
                },
              ).then((r) => {
                const bookings = Array.isArray(r.data) ? r.data : r.data.results;
                if (bookings.length > 0) {
                  cancelBookingMutation.mutate(bookings[0].id);
                }
              }).catch(() => {
                // silently ignore — user already dismissed modal
              });
            }
          }}
        />
      )}
    </div>
  );
}
