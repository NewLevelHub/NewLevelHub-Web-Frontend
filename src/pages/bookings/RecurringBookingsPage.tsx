import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { USER_ROLES } from '@/shared/config/constants';
import { useAuth } from '@/shared/hooks/useAuth';
import { getApiErrorMessage } from '@/shared/lib/apiError';
import type {
  BookingResourceListItem,
  PaginatedResponse,
  RecurringBooking,
  RecurringBookingCreatePayload,
  RecurringBookingCreateResponse,
} from '@/shared/types';

const WEEKDAY_OPTIONS = [
  { value: 0, label: 'Понедельник' },
  { value: 1, label: 'Вторник' },
  { value: 2, label: 'Среда' },
  { value: 3, label: 'Четверг' },
  { value: 4, label: 'Пятница' },
  { value: 5, label: 'Суббота' },
  { value: 6, label: 'Воскресенье' },
];

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function RecurringBookingsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [resourceId, setResourceId] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState('0');
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:00');
  const [repeatUntil, setRepeatUntil] = useState(todayIsoDate());
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
        setErrorMessage('Серия не создана: обнаружены конфликты в выбранном диапазоне.');
        await queryClient.invalidateQueries({ queryKey: ['recurring-bookings', 'list'] });
        return;
      }
      setErrorMessage(null);
      setLastSkippedDates([]);
      await queryClient.invalidateQueries({ queryKey: ['recurring-bookings', 'list'] });
    },
    onError: (error: unknown) => {
      setLastSkippedDates([]);
      setErrorMessage(getApiErrorMessage(error, 'Не удалось создать рекуррентную серию.'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(API.bookings.recurring.detail(String(id)));
    },
    onSuccess: async () => {
      setErrorMessage(null);
      await queryClient.invalidateQueries({ queryKey: ['recurring-bookings', 'list'] });
    },
    onError: (error: unknown) => {
      setErrorMessage(getApiErrorMessage(error, 'Не удалось отменить серию.'));
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

  return (
    <main className="px-3 py-4 sm:px-4 sm:py-6 md:py-8 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-primary">Рекуррентные бронирования</h1>
        <Link
          to="/bookings/catalog"
          className="rounded-lg border border-default bg-raised px-3 py-2 text-sm font-medium text-secondary hover:bg-hover"
        >
          В каталог
        </Link>
      </div>

      {errorMessage && (
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-danger-subtle px-4 py-3 text-sm text-danger">
          {errorMessage}
        </div>
      )}

      {lastSkippedDates.length > 0 && (
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-danger-subtle px-4 py-3 text-sm text-danger">
          <p className="font-medium">Конфликты на датах:</p>
          <p className="mt-1">{lastSkippedDates.join(', ')}</p>
        </div>
      )}

      <section className="rounded-2xl border border-default bg-raised p-5">
        <h2 className="text-lg font-semibold text-primary">Создать серию</h2>
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
            Ресурс
            <select
              required
              value={resourceId}
              onChange={(event) => setResourceId(event.target.value)}
              className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary"
              disabled={resourcesLoading}
            >
              <option value="">Выберите ресурс</option>
              {(resourcesData ?? []).map((resource) => (
                <option key={resource.id} value={resource.id}>
                  {resource.name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm text-secondary">
            День недели
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
            Повторять до
            <input
              type="date"
              required
              min={todayIsoDate()}
              value={repeatUntil}
              onChange={(event) => setRepeatUntil(event.target.value)}
              className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary"
            />
          </label>

          <label className="text-sm text-secondary">
            Начало
            <input
              type="time"
              required
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
              className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary"
            />
          </label>

          <label className="text-sm text-secondary">
            Окончание
            <input
              type="time"
              required
              value={endTime}
              onChange={(event) => setEndTime(event.target.value)}
              className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary"
            />
          </label>

          <div className="sm:col-span-2 lg:col-span-1 flex items-end">
            <button
              type="submit"
              disabled={createMutation.isPending || !resourceId || allowedWeekdayOptions.length === 0}
              className="w-full rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
            >
              {createMutation.isPending ? 'Создание…' : 'Создать серию'}
            </button>
          </div>

          {resourceId && (
            <p className="sm:col-span-2 lg:col-span-3 text-xs text-secondary">
              Доступные дни ресурса:{' '}
              {allowedWeekdayOptions.length > 0
                ? allowedWeekdayOptions.map((option) => option.label).join(', ')
                : 'не настроены'}
            </p>
          )}
        </form>
      </section>

      <section className="rounded-2xl border border-default bg-raised p-5">
        <h2 className="text-lg font-semibold text-primary">
          {user?.role === USER_ROLES.COMPANY_ADMIN || user?.role === USER_ROLES.SUPERADMIN
            ? 'Доступные серии'
            : 'Мои серии'}
        </h2>

        {recurringError ? (
          <p className="mt-3 text-sm text-danger">Не удалось загрузить список серий.</p>
        ) : recurringLoading ? (
          <p className="mt-3 text-sm text-secondary">Загрузка…</p>
        ) : visibleRecurringRows.length === 0 ? (
          <p className="mt-3 text-sm text-secondary">Серий пока нет.</p>
        ) : (
          <ul className="mt-4 divide-y divide-[color:var(--border)] rounded-xl border border-default">
            {visibleRecurringRows.map((row) => (
              <li
                key={row.id}
                className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                    <p className="font-medium text-primary">
                    {resourceNameById.get(row.resource_id) ?? `Ресурс #${row.resource_id}`}
                  </p>
                  <p className="text-xs text-secondary">
                    {WEEKDAY_OPTIONS[row.day_of_week]?.label ?? `День ${row.day_of_week}`},{' '}
                    {row.start_time.slice(0, 5)}-{row.end_time.slice(0, 5)} · до {row.valid_until ?? 'без даты'}
                  </p>
                  {user?.role === USER_ROLES.COMPANY_ADMIN && row.user_name && (
                    <p className="text-xs text-secondary">Сотрудник: {row.user_name}</p>
                  )}
                </div>
                {canCancelSeries(row) ? (
                  <button
                    type="button"
                    onClick={() => deleteMutation.mutate(row.id)}
                    disabled={deleteMutation.isPending}
                    className="rounded-lg border border-red-200 dark:border-red-800 px-3 py-2 text-xs font-medium text-danger hover:bg-danger-subtle disabled:opacity-50"
                  >
                    Отменить серию
                  </button>
                ) : (
                  <span className="rounded-lg border border-default px-3 py-2 text-xs text-secondary">
                    Нет доступа к отмене
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
