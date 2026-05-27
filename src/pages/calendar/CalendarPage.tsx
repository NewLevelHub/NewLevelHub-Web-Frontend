import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import {
  CALENDAR_EVENT_TYPES,
  CALENDAR_EVENT_TYPE_LABELS,
  CALENDAR_VIEWS,
  LEAVE_TYPE_LABELS,
  LEAVE_TYPES,
  USER_ROLES,
  type CalendarEventType,
  type CalendarView,
} from '@/shared/config/constants';
import { useAuth } from '@/shared/hooks/useAuth';
import { companiesCacheRoot } from '@/shared/lib/companyQueryKeys';
import { getApiError } from '@/shared/lib/getApiError';
import { cn } from '@/shared/lib/cn';
import type {
  CalendarBusySlot,
  CalendarEvent,
  Company,
  CompanyMember,
  PaginatedResponse,
} from '@/shared/types';

type CompanyOption = {
  id: number;
  name: string;
};

function toIsoDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfWeek(date: Date) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function resolveRange(anchorDate: Date, view: CalendarView) {
  if (view === CALENDAR_VIEWS.DAY) {
    return { dateFrom: toIsoDate(anchorDate), dateTo: toIsoDate(anchorDate) };
  }
  if (view === CALENDAR_VIEWS.WEEK) {
    const weekStart = startOfWeek(anchorDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    return { dateFrom: toIsoDate(weekStart), dateTo: toIsoDate(weekEnd) };
  }
  const monthStart = startOfMonth(anchorDate);
  const monthEnd = endOfMonth(anchorDate);
  return { dateFrom: toIsoDate(monthStart), dateTo: toIsoDate(monthEnd) };
}

function shiftAnchor(anchorDate: Date, view: CalendarView, direction: -1 | 1) {
  const next = new Date(anchorDate);
  if (view === CALENDAR_VIEWS.DAY) {
    next.setDate(next.getDate() + direction);
    return next;
  }
  if (view === CALENDAR_VIEWS.WEEK) {
    next.setDate(next.getDate() + direction * 7);
    return next;
  }
  next.setMonth(next.getMonth() + direction, 1);
  return next;
}

function formatPeriodLabel(anchorDate: Date, view: CalendarView) {
  if (view === CALENDAR_VIEWS.DAY) {
    return anchorDate.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });
  }
  if (view === CALENDAR_VIEWS.WEEK) {
    const weekStart = startOfWeek(anchorDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    return `${weekStart.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })} - ${weekEnd.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' })}`;
  }
  return anchorDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const EVENT_BADGE_CLASS: Record<CalendarEventType, string> = {
  [CALENDAR_EVENT_TYPES.BOOKING]: 'bg-blue-900/40 text-blue-300 border-blue-700',
  [CALENDAR_EVENT_TYPES.TASK_DEADLINE]: 'bg-warning-subtle text-warning border-amber-700',
  [CALENDAR_EVENT_TYPES.LEAVE]: 'bg-success-subtle text-success border-emerald-700',
  [CALENDAR_EVENT_TYPES.GUEST_VISIT]: 'bg-violet-900/40 text-violet-300 border-violet-700',
};

const LEAVE_CALENDAR_LABELS = {
  [LEAVE_TYPES.VACATION]: LEAVE_TYPE_LABELS[LEAVE_TYPES.VACATION],
  [LEAVE_TYPES.DAY_OFF]: LEAVE_TYPE_LABELS[LEAVE_TYPES.DAY_OFF],
  [LEAVE_TYPES.SICK_LEAVE]: LEAVE_TYPE_LABELS[LEAVE_TYPES.SICK_LEAVE],
  [LEAVE_TYPES.REMOTE]: LEAVE_TYPE_LABELS[LEAVE_TYPES.REMOTE],
} as const;

function formatCalendarTitle(event: CalendarEvent) {
  if (event.type !== CALENDAR_EVENT_TYPES.LEAVE) {
    return event.title;
  }

  const [namePart, leaveTypeRaw] = event.title.split(' — ');
  if (!leaveTypeRaw) return event.title;

  const leaveType = leaveTypeRaw.trim().toLowerCase() as keyof typeof LEAVE_CALENDAR_LABELS;
  const translated = LEAVE_CALENDAR_LABELS[leaveType];
  if (!translated) return event.title;

  return `${namePart} — ${translated}`;
}

export default function CalendarPage() {
  const { user } = useAuth();
  const isSuperadmin = user?.role === USER_ROLES.SUPERADMIN;

  const [anchorDate, setAnchorDate] = useState(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  });
  const [view, setView] = useState<CalendarView>(CALENDAR_VIEWS.WEEK);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedEventType, setSelectedEventType] = useState('');
  const [myOnly, setMyOnly] = useState(false);

  const companyId = isSuperadmin
    ? selectedCompanyId || null
    : user?.company_id != null
      ? String(user.company_id)
      : null;

  const period = useMemo(() => resolveRange(anchorDate, view), [anchorDate, view]);

  const { data: companiesData } = useQuery<PaginatedResponse<Company>>({
    queryKey: [...companiesCacheRoot(user?.id), 'calendar', 'companies'],
    queryFn: () =>
      apiClient
        .get<PaginatedResponse<Company>>(API.companies.list, { params: { page_size: 1000 } })
        .then((r) => r.data),
    enabled: isSuperadmin,
    staleTime: 60_000,
  });

  const companyOptions = useMemo<CompanyOption[]>(
    () => (companiesData?.results ?? []).map((item) => ({ id: item.id, name: item.name })),
    [companiesData],
  );

  const { data: membersData } = useQuery<CompanyMember[] | PaginatedResponse<CompanyMember>>({
    queryKey: ['calendar', 'members', companyId],
    queryFn: () =>
      apiClient.get<CompanyMember[] | PaginatedResponse<CompanyMember>>(API.companies.members(companyId!), {
        params: { page_size: 1000 },
      }).then((r) => r.data),
    enabled: companyId !== null,
    staleTime: 30_000,
  });

  const memberOptions = useMemo<CompanyMember[]>(() => {
    if (!membersData) return [];
    return Array.isArray(membersData) ? membersData : membersData.results;
  }, [membersData]);

  const eventsParams = useMemo(() => ({
    date_from: period.dateFrom,
    date_to: period.dateTo,
    user_id: !myOnly && selectedUserId ? Number(selectedUserId) : undefined,
    event_type: selectedEventType || undefined,
    my: myOnly ? true : undefined,
  }), [period, myOnly, selectedUserId, selectedEventType]);

  const {
    data: events = [],
    isLoading: isEventsLoading,
    isError: isEventsError,
    error: eventsError,
    isFetching: isEventsFetching,
  } = useQuery<CalendarEvent[]>({
    queryKey: ['company-calendar', companyId, eventsParams],
    queryFn: () =>
      apiClient.get<CalendarEvent[]>(API.companies.calendar(companyId!), { params: eventsParams }).then((r) => r.data),
    enabled: companyId !== null,
    staleTime: 15_000,
  });

  const busyUserId = myOnly ? user?.id : selectedUserId ? Number(selectedUserId) : undefined;

  const {
    data: busySlots = [],
    isLoading: isBusyLoading,
  } = useQuery<CalendarBusySlot[]>({
    queryKey: ['company-calendar-busy', companyId, period.dateFrom, busyUserId, view],
    queryFn: () =>
      apiClient.get<CalendarBusySlot[]>(API.companies.calendarBusy(companyId!), {
        params: {
          user_id: busyUserId,
          date: period.dateFrom,
        },
      }).then((r) => r.data),
    enabled: companyId !== null && view === CALENDAR_VIEWS.DAY && busyUserId != null,
    staleTime: 15_000,
  });

  const groupedEvents = useMemo(() => {
    const groups = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const startKey = event.start.slice(0, 10);
      const endKey = event.end.slice(0, 10);
      let key = startKey;
      if (key < period.dateFrom) key = period.dateFrom;
      if (endKey < key) key = endKey;
      if (key > period.dateTo) key = period.dateTo;
      const list = groups.get(key) ?? [];
      list.push(event);
      groups.set(key, list);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [events, period.dateFrom, period.dateTo]);

  const resetFilters = () => {
    setSelectedUserId('');
    setSelectedEventType('');
    setMyOnly(false);
  };

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-3 py-4 sm:px-4 sm:py-6 md:py-8">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Календарь компании</h1>
          <p className="mt-1 text-sm text-secondary">
            Единый календарь по бронированиям, дедлайнам CRM, отпускам и гостевым визитам.
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-default bg-raised p-1">
          {Object.values(CALENDAR_VIEWS).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setView(mode)}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                view === mode ? 'bg-brand text-white' : 'text-secondary hover:bg-hover',
              )}
            >
              {mode === CALENDAR_VIEWS.DAY ? 'День' : mode === CALENDAR_VIEWS.WEEK ? 'Неделя' : 'Месяц'}
            </button>
          ))}
        </div>
      </div>

      <section className="rounded-xl border border-default bg-raised p-4">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setAnchorDate((prev) => shiftAnchor(prev, view, -1))}
            className="rounded-lg border border-default bg-surface p-2 text-secondary hover:bg-hover"
            aria-label="Предыдущий период"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="min-w-[230px] rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary">
            {formatPeriodLabel(anchorDate, view)}
          </div>
          <button
            type="button"
            onClick={() => setAnchorDate((prev) => shiftAnchor(prev, view, 1))}
            className="rounded-lg border border-default bg-surface p-2 text-secondary hover:bg-hover"
            aria-label="Следующий период"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              setAnchorDate(today);
            }}
            className="rounded-lg border border-default bg-surface px-3 py-2 text-sm text-secondary hover:bg-hover"
          >
            Сегодня
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          {isSuperadmin && (
            <label className="text-sm text-secondary">
              Компания
              <select
                value={selectedCompanyId}
                onChange={(event) => {
                  setSelectedCompanyId(event.target.value);
                  setSelectedUserId('');
                }}
                className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary"
              >
                <option value="">Выберите компанию</option>
                {companyOptions.map((option) => (
                  <option key={option.id} value={String(option.id)}>
                    {option.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="text-sm text-secondary">
            Сотрудник
            <select
              value={selectedUserId}
              onChange={(event) => setSelectedUserId(event.target.value)}
              disabled={companyId === null || myOnly}
              className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary disabled:opacity-50"
            >
              <option value="">Все сотрудники</option>
              {memberOptions.map((member) => (
                <option key={member.id} value={String(member.id)}>
                  {member.full_name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm text-secondary">
            Тип события
            <select
              value={selectedEventType}
              onChange={(event) => setSelectedEventType(event.target.value)}
              className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary"
            >
              <option value="">Все типы</option>
              {Object.entries(CALENDAR_EVENT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="mt-6 inline-flex items-center gap-2 text-sm text-secondary">
            <input
              type="checkbox"
              checked={myOnly}
              onChange={(event) => setMyOnly(event.target.checked)}
              className="h-4 w-4 rounded border-default bg-surface text-brand focus:ring-blue-500/20"
            />
            Только мои
          </label>

          <button
            type="button"
            onClick={resetFilters}
            className="mt-6 rounded-lg border border-default bg-surface px-3 py-2 text-sm text-secondary hover:bg-hover"
          >
            Сбросить фильтры
          </button>
        </div>
      </section>

      {companyId === null && (
        <div className="rounded-xl border border-default bg-raised p-8 text-center text-sm text-secondary">
          Выберите компанию для отображения календаря.
        </div>
      )}

      {companyId !== null && (
        <section className={cn('space-y-4', isEventsFetching && 'opacity-75')}>
          {isEventsLoading ? (
            <div className="flex items-center gap-2 rounded-xl border border-default bg-raised p-6 text-sm text-secondary">
              <Loader2 className="h-4 w-4 animate-spin" />
              Загрузка событий календаря...
            </div>
          ) : isEventsError ? (
            <div className="rounded-xl border border-red-200 dark:border-red-800 bg-danger-subtle p-6 text-sm text-danger">
              {getApiError(eventsError).message}
            </div>
          ) : events.length === 0 ? (
            <div className="rounded-xl border border-default bg-raised p-8 text-center text-sm text-secondary">
              <CalendarDays className="mx-auto mb-2 h-6 w-6 text-muted" />
              Событий за выбранный период не найдено.
            </div>
          ) : (
            <div className="space-y-4">
              {groupedEvents.map(([day, items]) => (
                <div key={day} className="rounded-xl border border-default bg-raised">
                  <div className="border-b border-default px-4 py-3 text-sm font-semibold text-secondary">
                    {new Date(day).toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </div>
                  <ul className="divide-y divide-[color:var(--border)]/70">
                    {items.map((event) => (
                      <li key={`${event.type}-${event.start}-${event.user.id}-${event.title}`} className="px-4 py-3">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <span className={cn('rounded-full border px-2 py-0.5 text-xs font-medium', EVENT_BADGE_CLASS[event.type])}>
                            {CALENDAR_EVENT_TYPE_LABELS[event.type]}
                          </span>
                          <span className="text-sm font-medium text-primary">{formatCalendarTitle(event)}</span>
                        </div>
                        <p className="text-xs text-secondary">
                          {formatDateTime(event.start)} - {formatDateTime(event.end)}
                        </p>
                        <p className="text-xs text-secondary">Сотрудник: {event.user.full_name}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {companyId !== null && view === CALENDAR_VIEWS.DAY && busyUserId != null && (
        <section className="rounded-xl border border-default bg-raised">
          <div className="border-b border-default px-4 py-3 text-sm font-semibold text-secondary">
            Слоты занятости на день
          </div>
          {isBusyLoading ? (
            <div className="flex items-center gap-2 px-4 py-4 text-sm text-secondary">
              <Loader2 className="h-4 w-4 animate-spin" />
              Загрузка занятости...
            </div>
          ) : busySlots.length === 0 ? (
            <div className="px-4 py-4 text-sm text-secondary">Свободно на весь день.</div>
          ) : (
            <ul className="divide-y divide-[color:var(--border)]/70">
              {busySlots.map((slot, index) => (
                <li key={`${slot.start}-${slot.end}-${index}`} className="px-4 py-3 text-sm text-secondary">
                  {formatDateTime(slot.start)} - {formatDateTime(slot.end)}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </main>
  );
}
