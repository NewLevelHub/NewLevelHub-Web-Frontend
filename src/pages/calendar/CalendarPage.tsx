import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Check, ChevronDown, ChevronLeft, ChevronRight, Loader2, RotateCcw } from 'lucide-react';

import { dateLocaleTag } from '@/shared/lib/localeFormat';
import { fmtDate, fmtDateTime as fmtDT, fmtDayMonth, fmtMonthYear } from '@/shared/lib/formatDate';
import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import {
  CALENDAR_EVENT_TYPE_LABEL_KEYS,
  CALENDAR_VIEWS,
  USER_ROLES,
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

import {
  buildMonthGrid,
  buildWeekColumns,
  endOfMonth,
  startOfMonth,
  startOfWeek,
  toIsoDate,
} from './calendarUtils';
import { CalendarEventPopover } from './components/CalendarEventPopover';
import { CalendarLegend } from './components/CalendarLegend';
import { CalendarMonthView } from './components/CalendarMonthView';
import { CalendarNotePopover } from './components/CalendarNotePopover';
import { CalendarTimeGrid } from './components/CalendarTimeGrid';
import { eventKey } from './calendarUtils';
import { useCalendarNotes, type CalendarNote } from './useCalendarNotes';

type CompanyOption = {
  id: number;
  name: string;
};

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
    return fmtDate(anchorDate, { day: '2-digit', month: 'long', year: 'numeric' });
  }
  if (view === CALENDAR_VIEWS.WEEK) {
    const weekStart = startOfWeek(anchorDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    return `${fmtDayMonth(weekStart)} – ${fmtDate(weekEnd, { day: '2-digit', month: 'short', year: 'numeric' })}`;
  }
  return fmtMonthYear(anchorDate);
}

function formatDateTime(value: string) {
  return fmtDT(value);
}

const VIEW_LABEL_KEYS: Record<CalendarView, string> = {
  [CALENDAR_VIEWS.DAY]: 'calendar.viewDay',
  [CALENDAR_VIEWS.WEEK]: 'calendar.viewWeek',
  [CALENDAR_VIEWS.MONTH]: 'calendar.viewMonth',
};

export default function CalendarPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const isSuperadmin = user?.role === USER_ROLES.SUPERADMIN;
  const todayIso = useMemo(() => toIsoDate(new Date()), []);

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
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [popoverAnchor, setPopoverAnchor] = useState<HTMLElement | null>(null);
  const [noteSlotDate, setNoteSlotDate] = useState<string | null>(null);
  const [noteSlotHour, setNoteSlotHour] = useState<number | null>(null);
  const [noteAnchor, setNoteAnchor] = useState<HTMLElement | null>(null);

  const companyId = isSuperadmin
    ? selectedCompanyId || null
    : user?.company_id != null
      ? String(user.company_id)
      : null;

  const { notes: calendarNotes, getNote, saveNote, deleteNote } = useCalendarNotes(
    companyId,
    user?.id,
  );

  const period = useMemo(() => resolveRange(anchorDate, view), [anchorDate, view]);
  const filtersActive = Boolean(selectedUserId || selectedEventType || myOnly);
  const rangeNotes = useMemo(
    () => calendarNotes.filter((note) => note.date >= period.dateFrom && note.date <= period.dateTo),
    [calendarNotes, period.dateFrom, period.dateTo],
  );
  const activeNote =
    noteSlotDate != null && noteSlotHour != null
      ? getNote(noteSlotDate, noteSlotHour)
      : null;

  const dowFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(dateLocaleTag(i18n.language), {
        weekday: 'short',
      }),
    [i18n.language],
  );

  const weekdayLabels = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const monday = new Date(2024, 5, 3 + index);
        return dowFormatter.format(monday);
      }),
    [dowFormatter],
  );

  const gridDays = useMemo(() => {
    if (view === CALENDAR_VIEWS.DAY) {
      const iso = toIsoDate(anchorDate);
      return [
        {
          iso,
          dowLabel: dowFormatter.format(anchorDate),
          dayNum: anchorDate.getDate(),
          isToday: iso === todayIso,
        },
      ];
    }
    if (view === CALENDAR_VIEWS.WEEK) {
      return buildWeekColumns(anchorDate, todayIso, dowFormatter);
    }
    return [];
  }, [anchorDate, dowFormatter, todayIso, view]);

  const monthCells = useMemo(
    () => (view === CALENDAR_VIEWS.MONTH ? buildMonthGrid(anchorDate, todayIso) : []),
    [anchorDate, todayIso, view],
  );

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

  const resetFilters = () => {
    setSelectedUserId('');
    setSelectedEventType('');
    setMyOnly(false);
  };

  const closeNoteEditor = () => {
    setNoteSlotDate(null);
    setNoteSlotHour(null);
    setNoteAnchor(null);
  };

  const handleEventClick = (event: CalendarEvent, anchor: HTMLElement) => {
    closeNoteEditor();
    setSelectedEvent(event);
    setPopoverAnchor(anchor);
  };

  const closePopover = () => {
    setSelectedEvent(null);
    setPopoverAnchor(null);
  };

  const openNoteEditor = (date: string, hour: number, anchor: HTMLElement) => {
    closePopover();
    setNoteSlotDate(date);
    setNoteSlotHour(hour);
    setNoteAnchor(anchor);
  };

  const handleSlotClick = (date: string, hour: number, anchor: HTMLElement) => {
    openNoteEditor(date, hour, anchor);
  };

  const handleNoteClick = (note: CalendarNote, anchor: HTMLElement) => {
    openNoteEditor(note.date, note.hour, anchor);
  };

  const handleSaveNote = (text: string) => {
    if (noteSlotDate == null || noteSlotHour == null) return;
    saveNote({ date: noteSlotDate, hour: noteSlotHour, text });
    closeNoteEditor();
  };

  const handleDeleteNote = () => {
    if (noteSlotDate == null || noteSlotHour == null) return;
    deleteNote(noteSlotDate, noteSlotHour);
    closeNoteEditor();
  };

  return (
    <main className="mx-auto max-w-[1560px] space-y-5 px-3 py-4 sm:px-4 sm:py-6 md:px-8 md:py-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.02em] text-primary sm:text-[28px]">{t('calendar.pageTitle')}</h1>
          <p className="mt-1 max-w-xl text-[13.5px] text-pretty text-muted">{t('calendar.pageSubtitle')}</p>
        </div>
        <div
          className="inline-flex w-full shrink-0 rounded-[11px] bg-[#f1f0ec] p-1 sm:w-auto dark:bg-raised"
          role="group"
          aria-label={t('calendar.viewToggle')}
        >
          {Object.values(CALENDAR_VIEWS).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setView(mode)}
              className={cn(
                'flex-1 rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors sm:flex-none sm:px-[18px]',
                view === mode
                  ? 'bg-brand text-white shadow-[0_1px_2px_rgba(12,140,99,0.35)]'
                  : 'text-muted hover:text-primary',
              )}
            >
              {t(VIEW_LABEL_KEYS[mode])}
            </button>
          ))}
        </div>
      </div>

      <section className="rounded-[14px] border border-default bg-surface p-4 shadow-[var(--shadow-card)] sm:px-[18px] sm:py-4">
        <div className="mb-4 flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setAnchorDate((prev) => shiftAnchor(prev, view, -1))}
            className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-[var(--border-strong)] bg-surface text-secondary hover:bg-raised"
            aria-label={t('calendar.prevPeriod')}
          >
            <ChevronLeft className="h-[17px] w-[17px]" />
          </button>
          <div className="flex h-9 min-w-0 flex-1 items-center rounded-[10px] border border-[var(--border-strong)] bg-surface px-4 text-[13px] font-semibold text-primary sm:min-w-[230px] sm:flex-none sm:text-[13.5px]">
            {formatPeriodLabel(anchorDate, view)}
          </div>
          <button
            type="button"
            onClick={() => setAnchorDate((prev) => shiftAnchor(prev, view, 1))}
            className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-[var(--border-strong)] bg-surface text-secondary hover:bg-raised"
            aria-label={t('calendar.nextPeriod')}
          >
            <ChevronRight className="h-[17px] w-[17px]" />
          </button>
          <button
            type="button"
            onClick={() => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              setAnchorDate(today);
            }}
            className="h-9 rounded-[10px] border border-[var(--border-strong)] bg-surface px-4 text-[13px] font-semibold text-secondary hover:bg-raised"
          >
            {t('common.today')}
          </button>
        </div>

        <div className="flex flex-wrap items-end gap-4">
          {isSuperadmin && (
            <label className="flex flex-col text-secondary">
              <span className="mb-1.5 text-[12.5px] font-semibold">{t('common.company')}</span>
              <div className="relative">
                <select
                  value={selectedCompanyId}
                  onChange={(event) => {
                    setSelectedCompanyId(event.target.value);
                    setSelectedUserId('');
                  }}
                  className="min-w-[210px] appearance-none rounded-[10px] border border-[var(--border-strong)] bg-surface py-2.5 pr-9 pl-3.5 text-[13.5px] text-primary focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-brand/15"
                >
                  <option value="">{t('common.selectCompany')}</option>
                  {companyOptions.map((option) => (
                    <option key={option.id} value={String(option.id)}>
                      {option.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-muted" />
              </div>
            </label>
          )}

          <label className="flex flex-col text-secondary">
            <span className="mb-1.5 text-[12.5px] font-semibold">{t('team.roleEmployee')}</span>
            <div className="relative">
              <select
                value={selectedUserId}
                onChange={(event) => setSelectedUserId(event.target.value)}
                disabled={companyId === null || myOnly}
                className="min-w-[210px] appearance-none rounded-[10px] border border-[var(--border-strong)] bg-surface py-2.5 pr-9 pl-3.5 text-[13.5px] text-primary focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-brand/15 disabled:opacity-50"
              >
                <option value="">{t('calendar.allEmployees')}</option>
                {memberOptions.map((member) => (
                  <option key={member.id} value={String(member.id)}>
                    {member.full_name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-muted" />
            </div>
          </label>

          <label className="flex flex-col text-secondary">
            <span className="mb-1.5 text-[12.5px] font-semibold">{t('calendar.eventType')}</span>
            <div className="relative">
              <select
                value={selectedEventType}
                onChange={(event) => setSelectedEventType(event.target.value)}
                className="min-w-[210px] appearance-none rounded-[10px] border border-[var(--border-strong)] bg-surface py-2.5 pr-9 pl-3.5 text-[13.5px] text-primary focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-brand/15"
              >
                <option value="">{t('common.allTypes')}</option>
                {Object.entries(CALENDAR_EVENT_TYPE_LABEL_KEYS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {t(label)}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-muted" />
            </div>
          </label>

          <label className="flex h-10 cursor-pointer items-center gap-2 text-[13.5px] font-medium text-secondary select-none">
            <input
              type="checkbox"
              checked={myOnly}
              onChange={(event) => setMyOnly(event.target.checked)}
              className="peer sr-only"
            />
            <span className="flex h-[19px] w-[19px] items-center justify-center rounded-md border-[1.5px] border-[var(--border-strong)] bg-surface transition-colors peer-checked:border-brand peer-checked:bg-brand [&_svg]:opacity-0 peer-checked:[&_svg]:opacity-100">
              <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
            </span>
            {t('common.onlyMine')}
          </label>

          <button
            type="button"
            onClick={resetFilters}
            className="ml-auto flex h-10 items-center gap-1.5 text-[13px] font-medium text-muted hover:text-primary"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {t('common.resetFilters')}
          </button>
        </div>
      </section>

      {companyId === null && (
        <div className="rounded-[14px] border border-default bg-surface p-8 text-center text-sm text-secondary shadow-[var(--shadow-card)]">
          {t('calendar.selectCompany')}
        </div>
      )}

      {companyId !== null && (
        <div className={cn('space-y-0', isEventsFetching && 'opacity-75')}>
          <CalendarLegend />

          <section className="overflow-hidden rounded-[14px] border border-default bg-surface shadow-[var(--shadow-card)]">
            {isEventsLoading ? (
              <div className="flex items-center gap-2 px-5 py-8 text-sm text-secondary">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('calendar.loadingEvents')}
              </div>
            ) : isEventsError ? (
              <div className="m-4 rounded-xl border border-red-200 bg-danger-subtle p-6 text-sm text-danger dark:border-red-800">
                {getApiError(eventsError).message}
              </div>
            ) : view === CALENDAR_VIEWS.MONTH ? (
              <CalendarMonthView
                cells={monthCells}
                events={events}
                weekdayLabels={weekdayLabels}
                filtersActive={filtersActive}
                onEventClick={handleEventClick}
              />
            ) : (
              <CalendarTimeGrid
                days={gridDays}
                events={events}
                notes={rangeNotes}
                selectedEventKey={selectedEvent ? eventKey(selectedEvent) : null}
                onEventClick={handleEventClick}
                onSlotClick={handleSlotClick}
                onNoteClick={handleNoteClick}
              />
            )}
          </section>
        </div>
      )}

      {companyId !== null && view === CALENDAR_VIEWS.DAY && busyUserId != null && (
        <section className="overflow-hidden rounded-[14px] border border-default bg-surface shadow-[var(--shadow-card)]">
          <div className="border-b border-default px-4 py-3 text-sm font-semibold text-secondary">
            {t('calendar.busySlotsTitle')}
          </div>
          {isBusyLoading ? (
            <div className="flex items-center gap-2 px-4 py-4 text-sm text-secondary">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('calendar.loadingBusy')}
            </div>
          ) : busySlots.length === 0 ? (
            <div className="px-4 py-4 text-sm text-secondary">{t('calendar.freeAllDay')}</div>
          ) : (
            <ul className="divide-y divide-[color:var(--border)]/70">
              {busySlots.map((slot, index) => (
                <li key={`${slot.start}-${slot.end}-${index}`} className="px-4 py-3 text-sm text-secondary">
                  {formatDateTime(slot.start)} – {formatDateTime(slot.end)}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <CalendarEventPopover event={selectedEvent} anchorEl={popoverAnchor} onClose={closePopover} />
      <CalendarNotePopover
        date={noteSlotDate}
        hour={noteSlotHour}
        note={activeNote}
        anchorEl={noteAnchor}
        onClose={closeNoteEditor}
        onSave={handleSaveNote}
        onDelete={handleDeleteNote}
      />
    </main>
  );
}
