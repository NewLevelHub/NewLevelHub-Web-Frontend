import { Fragment, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowUpDown,
  BarChart3,
  BedDouble,
  Briefcase,
  Building2,
  Bookmark,
  Calendar,
  Car,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock,
  Download,
  FileDown,
  Inbox,
  Layers,
  UserCheck,
  User as UserIcon,
  Users,
  UserPlus,
  X,
  type LucideIcon,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { RESOURCE_TYPES, RESOURCE_TYPE_LABELS, USER_ROLES } from '@/shared/config/constants';
import { useAuth } from '@/shared/hooks/useAuth';
import { companiesCacheRoot } from '@/shared/lib/companyQueryKeys';
import { getApiError } from '@/shared/lib/getApiError';
import { cn } from '@/shared/lib/cn';
import { fmtDayMonth, fmtTime } from '@/shared/lib/formatDate';
import { filenameFromContentDisposition, triggerCsvFileDownload } from '@/shared/lib/csvDownload';
import type {
  Booking,
  BookingResourceListItem,
  Company,
  PaginatedResponse,
  ResourceUsageResponse,
  ServiceFloor,
  SuperadminAnalyticsPeriod,
  SuperadminAnalyticsResponse,
} from '@/shared/types';

const PERIOD_OPTIONS: { value: SuperadminAnalyticsPeriod; label: string }[] = [
  { value: '7d', label: '7 дн.' },
  { value: '30d', label: '30 дн.' },
  { value: '90d', label: '90 дн.' },
  { value: 'custom', label: 'Свой' },
];

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const SR_TYPE_LABELS: Record<string, string> = {
  cleaning: 'Уборка',
  repair: 'Ремонт',
  supplies: 'Снабжение',
  general: 'Общая',
};

type ResourceUsageSortKey =
  | 'resource_name'
  | 'resource_type'
  | 'floor'
  | 'total_bookings'
  | 'avg_duration_minutes'
  | 'total_booked_minutes'
  | 'peak_hour_bookings';

const RESOURCE_TYPE_ICONS: Record<string, LucideIcon> = {
  desk: Briefcase,
  meeting_room: Users,
  parking: Car,
  capsule: BedDouble,
};

const RESOURCE_TYPE_BADGE: Record<string, string> = {
  desk: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
  meeting_room: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  parking: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  capsule: 'bg-violet-500/10 text-violet-300 border-violet-500/30',
};

const RESOURCE_TYPE_ICON_BG: Record<string, string> = {
  desk: 'bg-blue-500/15 text-blue-300',
  meeting_room: 'bg-emerald-500/15 text-emerald-300',
  parking: 'bg-amber-500/15 text-amber-300',
  capsule: 'bg-violet-500/15 text-violet-300',
};

function fmtMinutes(value: number): string {
  if (!value) return '0 мин';
  const total = Math.round(value);
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (hours === 0) return `${mins} мин`;
  if (mins === 0) return `${hours} ч`;
  return `${hours} ч ${mins} мин`;
}

/** "2026-05-26T09:00:00+05:00" → "26 мая, 09:00" (locale-aware) */
function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${fmtDayMonth(d)}, ${fmtTime(d)}`;
}

/** "2026-W18" → "4 мая" (locale-aware) */
function fmtWeek(weekStr: string): string {
  const m = weekStr.match(/^(\d{4})-W(\d+)$/);
  if (!m) return weekStr;
  const [, year, week] = m;
  // ISO week Monday: Jan 4 is always in week 1
  const jan4 = new Date(Number(year), 0, 4);
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7) + (Number(week) - 1) * 7);
  return fmtDayMonth(monday);
}

/** "cleaning" → "Уборка" */
function fmtType(type: string): string {
  return SR_TYPE_LABELS[type] ?? type;
}

function isValidIsoDate(v: string): boolean {
  if (!ISO_DATE_RE.test(v)) return false;
  const d = new Date(`${v}T00:00:00`);
  return !Number.isNaN(d.getTime());
}

function StatCard({
  icon,
  label,
  value,
  title: ariaDescription,
  isLoading,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  title?: string;
  isLoading?: boolean;
}) {
  return (
    <div
      className="bg-raised rounded-2xl border border-default p-5 flex items-center gap-4"
      title={ariaDescription}
    >
      <div className="w-12 h-12 rounded-xl bg-blue-900/40 flex items-center justify-center shrink-0 text-blue-300">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-primary tabular-nums">
          {isLoading ? <span className="inline-block h-8 w-16 animate-pulse rounded bg-hover" /> : value}
        </p>
        <p className="text-sm text-secondary">{label}</p>
      </div>
    </div>
  );
}

function ResourceBookingsRow({
  resourceId,
  dateFrom,
  dateTo,
  companyId,
  colSpan,
}: {
  resourceId: number;
  dateFrom: string;
  dateTo: string;
  companyId: string;
  colSpan: number;
}) {
  const params = useMemo(() => {
    const p: Record<string, string | number> = {
      resource_id: resourceId,
      status_in: 'confirmed,completed',
      page_size: 200,
      ordering: '-start_time',
    };
    if (dateFrom) p.date_from = `${dateFrom}T00:00:00`;
    if (dateTo) p.date_to = `${dateTo}T23:59:59`;
    const cid = companyId.trim();
    if (cid) {
      const n = Number(cid);
      if (Number.isInteger(n) && n > 0) p.company_id = n;
    }
    return p;
  }, [companyId, dateFrom, dateTo, resourceId]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['analytics', 'resource-bookings', params],
    queryFn: async () => {
      const { data: body } = await apiClient.get<PaginatedResponse<Booking>>(
        API.bookings.reservations.list,
        { params },
      );
      return body.results;
    },
  });

  return (
    <tr>
      <td colSpan={colSpan} className="bg-surface/40 px-0 pt-0 pb-3">
        <div className="mx-2 mt-1 rounded-xl border border-default/60 bg-surface/60 p-3">
          {isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-9 animate-pulse rounded-lg bg-hover/70" />
              ))}
            </div>
          ) : isError ? (
            <p className="py-2 text-center text-xs text-rose-300">{getApiError(error).message}</p>
          ) : !data || data.length === 0 ? (
            <div className="flex flex-col items-center gap-1 py-4 text-muted">
              <Inbox size={20} aria-hidden />
              <p className="text-xs">За выбранный период бронирований нет.</p>
            </div>
          ) : (
            <ul className="divide-y divide-default/40">
              <li className="grid grid-cols-12 gap-3 pb-2 text-[10px] uppercase tracking-wide text-muted">
                <span className="col-span-5 flex items-center gap-1.5">
                  <Calendar size={12} aria-hidden /> Период
                </span>
                <span className="col-span-3 flex items-center gap-1.5">
                  <Clock size={12} aria-hidden /> Длительность
                </span>
                <span className="col-span-4 flex items-center gap-1.5">
                  <UserIcon size={12} aria-hidden /> Сотрудник
                </span>
              </li>
              {data.map((b) => {
                const start = new Date(b.start_time);
                const end = new Date(b.end_time);
                const durationMin = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
                return (
                  <li key={b.id} className="grid grid-cols-12 gap-3 py-2 text-xs">
                    <span className="col-span-5 tabular-nums text-secondary">
                      {fmtDateTime(b.start_time)}
                      <span className="px-1.5 text-muted">→</span>
                      {fmtDateTime(b.end_time)}
                    </span>
                    <span className="col-span-3 tabular-nums text-muted">{fmtMinutes(durationMin)}</span>
                    <span className="col-span-4 flex items-center gap-2 text-primary">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/15 text-[10px] font-medium text-blue-300">
                        {(b.user_name || '?').trim().charAt(0).toUpperCase()}
                      </span>
                      <span className="truncate">{b.user_name || '—'}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </td>
    </tr>
  );
}

function ResourceUsageSection({
  period,
  dateFrom,
  dateTo,
  companyId,
  enabled,
}: {
  period: SuperadminAnalyticsPeriod;
  dateFrom: string;
  dateTo: string;
  companyId: string;
  enabled: boolean;
}) {
  const [resourceFilter, setResourceFilter] = useState('');
  const [floorFilter, setFloorFilter] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [sort, setSort] = useState<{ key: ResourceUsageSortKey; dir: 'asc' | 'desc' }>({
    key: 'total_bookings',
    dir: 'desc',
  });

  const { data: resources } = useQuery({
    queryKey: ['analytics', 'superadmin', 'resource-options'],
    enabled,
    queryFn: async () => {
      const { data: body } = await apiClient.get<PaginatedResponse<BookingResourceListItem>>(
        API.bookings.resources.list,
        { params: { page_size: 1000, ordering: 'name' } },
      );
      return body.results;
    },
  });

  const { data: mapFloors } = useQuery({
    queryKey: ['analytics', 'superadmin', 'map-floors'],
    enabled,
    queryFn: async () => {
      const { data: body } = await apiClient.get<{ results: ServiceFloor[] }>(API.map.floors);
      return body.results;
    },
  });

  const floorOptions = useMemo(() => {
    return [...(mapFloors ?? [])]
      .map((f) => f.number)
      .sort((a, b) => a - b);
  }, [mapFloors]);

  const resourceOptions = useMemo(() => {
    const all = resources ?? [];
    if (!floorFilter) return all;
    const n = Number(floorFilter);
    if (!Number.isInteger(n)) return all;
    return all.filter((r) => r.floor === n);
  }, [resources, floorFilter]);

  const params = useMemo(() => {
    const p: Record<string, string | number> = { period };
    if (period === 'custom') {
      if (dateFrom) p.date_from = dateFrom;
      if (dateTo) p.date_to = dateTo;
    }
    const cid = companyId.trim();
    if (cid) {
      const n = Number(cid);
      if (Number.isInteger(n) && n > 0) p.company_id = n;
    }
    if (resourceFilter) {
      const n = Number(resourceFilter);
      if (Number.isInteger(n) && n > 0) p.resource_id = n;
    }
    if (floorFilter) {
      const n = Number(floorFilter);
      if (Number.isInteger(n)) p.floor = n;
    }
    return p;
  }, [companyId, dateFrom, dateTo, floorFilter, period, resourceFilter]);

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['analytics', 'resources', params],
    enabled,
    queryFn: async () => {
      const { data: body } = await apiClient.get<ResourceUsageResponse>(API.analytics.resources, {
        params,
      });
      return body;
    },
  });

  const sortedRows = useMemo(() => {
    if (!data?.results) return [];
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...data.results].sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv), 'ru') * dir;
    });
  }, [data, sort]);

  const summary = useMemo(() => {
    const rows = data?.results ?? [];
    const totalBookings = rows.reduce((s, r) => s + r.total_bookings, 0);
    const totalMinutes = rows.reduce((s, r) => s + r.total_booked_minutes, 0);
    return {
      totalBookings,
      totalMinutes,
      activeResources: rows.length,
      maxBookings: rows.reduce((m, r) => Math.max(m, r.total_bookings), 0),
    };
  }, [data]);

  const errorText = isError ? getApiError(error).message : null;
  const hasLocalFilters = Boolean(resourceFilter || floorFilter);

  function toggleSort(key: ResourceUsageSortKey) {
    setSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' },
    );
  }

  return (
    <section className="rounded-2xl border border-default bg-raised overflow-hidden">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-default/70 bg-surface/30 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-blue-300">
            <Layers size={20} aria-hidden />
          </div>
          <div>
            <h2 className="text-base font-semibold text-primary">Загруженность по ресурсам</h2>
            <p className="text-xs text-muted mt-0.5">
              Бронирования и фактическая занятость в разрезе каждого ресурса
              {isFetching ? <span className="ml-1 text-blue-300">· обновление…</span> : ''}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:flex sm:items-stretch sm:gap-2">
          <div className="rounded-xl border border-default/60 bg-raised px-3 py-2 text-center sm:text-left">
            <p className="text-[10px] uppercase tracking-wide text-muted">Бронирований</p>
            <p className="text-lg font-semibold text-primary tabular-nums leading-tight">
              {summary.totalBookings}
            </p>
          </div>
          <div className="rounded-xl border border-default/60 bg-raised px-3 py-2 text-center sm:text-left">
            <p className="text-[10px] uppercase tracking-wide text-muted">Всего занято</p>
            <p className="text-lg font-semibold text-primary tabular-nums leading-tight">
              {fmtMinutes(summary.totalMinutes)}
            </p>
          </div>
          <div className="rounded-xl border border-default/60 bg-raised px-3 py-2 text-center sm:text-left">
            <p className="text-[10px] uppercase tracking-wide text-muted">Активных ресурсов</p>
            <p className="text-lg font-semibold text-primary tabular-nums leading-tight">
              {summary.activeResources}
            </p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-default/70 bg-surface/20 px-5 py-3">
        <label className="flex items-center gap-2 rounded-full border border-default bg-raised px-3 py-1.5 text-xs text-secondary focus-within:border-blue-500/60">
          <Briefcase size={13} aria-hidden className="text-muted" />
          <span className="text-muted">Ресурс:</span>
          <select
            value={resourceFilter}
            onChange={(e) => setResourceFilter(e.target.value)}
            className="bg-transparent text-primary outline-none cursor-pointer"
          >
            <option value="">Все</option>
            {resourceOptions.map((r) => (
              <option key={r.id} value={String(r.id)}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 rounded-full border border-default bg-raised px-3 py-1.5 text-xs text-secondary focus-within:border-blue-500/60">
          <Layers size={13} aria-hidden className="text-muted" />
          <span className="text-muted">Этаж:</span>
          <select
            value={floorFilter}
            onChange={(e) => {
              const next = e.target.value;
              setFloorFilter(next);
              if (next && resourceFilter) {
                const n = Number(next);
                const current = (resources ?? []).find((r) => String(r.id) === resourceFilter);
                if (current && current.floor !== n) setResourceFilter('');
              }
            }}
            className="bg-transparent text-primary outline-none cursor-pointer"
          >
            <option value="">Все</option>
            {floorOptions.map((f) => (
              <option key={f} value={String(f)}>
                {f}
              </option>
            ))}
          </select>
        </label>
        {hasLocalFilters && (
          <button
            type="button"
            onClick={() => {
              setResourceFilter('');
              setFloorFilter('');
            }}
            className="inline-flex items-center gap-1 rounded-full border border-default/60 px-3 py-1.5 text-xs text-muted hover:text-primary hover:border-gray-500"
          >
            <X size={12} aria-hidden />
            Сбросить
          </button>
        )}
        <div className="ml-auto text-[11px] text-muted">
          Сортировка:{' '}
          <span className="text-secondary">
            {(
              {
                resource_name: 'по названию',
                resource_type: 'по типу',
                floor: 'по этажу',
                total_bookings: 'по бронированиям',
                avg_duration_minutes: 'по средней длительности',
                total_booked_minutes: 'по общему времени',
                peak_hour_bookings: 'по пиковому часу',
              } as Record<ResourceUsageSortKey, string>
            )[sort.key]}{' '}
            {sort.dir === 'asc' ? '↑' : '↓'}
          </span>
        </div>
      </div>

      {errorText && (
        <div
          className="m-4 rounded-xl border border-rose-800 bg-rose-950/40 px-4 py-3 text-sm text-rose-100 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
          role="alert"
        >
          <span>{errorText}</span>
          <button
            type="button"
            onClick={() => void refetch()}
            className="rounded-lg bg-rose-900/80 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-800 shrink-0"
          >
            Повторить
          </button>
        </div>
      )}

      {!enabled ? (
        <div className="flex flex-col items-center gap-2 py-12 text-muted">
          <Calendar size={28} aria-hidden />
          <p className="text-sm">Укажите корректный период.</p>
        </div>
      ) : isLoading ? (
        <div className="space-y-2 p-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-hover/70" />
          ))}
        </div>
      ) : sortedRows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-muted">
          <Inbox size={28} aria-hidden />
          <p className="text-sm">Нет бронирований за выбранный период.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wide text-muted border-b border-default/60 bg-surface/20">
                <th className="w-8 py-2.5" aria-label="Развернуть" />
                <SortHeader
                  label="Ресурс"
                  sortKey="resource_name"
                  current={sort}
                  onClick={toggleSort}
                />
                <SortHeader
                  label="Тип"
                  sortKey="resource_type"
                  current={sort}
                  onClick={toggleSort}
                />
                <SortHeader
                  label="Этаж"
                  sortKey="floor"
                  current={sort}
                  onClick={toggleSort}
                />
                <SortHeader
                  label="Бронирований"
                  sortKey="total_bookings"
                  current={sort}
                  onClick={toggleSort}
                  align="right"
                />
                <SortHeader
                  label="Средняя"
                  sortKey="avg_duration_minutes"
                  current={sort}
                  onClick={toggleSort}
                  align="right"
                />
                <SortHeader
                  label="Всего"
                  sortKey="total_booked_minutes"
                  current={sort}
                  onClick={toggleSort}
                  align="right"
                />
                <SortHeader
                  label="Пиковый час"
                  sortKey="peak_hour_bookings"
                  current={sort}
                  onClick={toggleSort}
                  align="right"
                  last
                />
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row) => {
                const isExpanded = expandedId === row.resource_id;
                const Icon = RESOURCE_TYPE_ICONS[row.resource_type] ?? Briefcase;
                const badge = RESOURCE_TYPE_BADGE[row.resource_type] ?? '';
                const iconBg = RESOURCE_TYPE_ICON_BG[row.resource_type] ?? 'bg-gray-500/15 text-gray-300';
                const share = summary.maxBookings
                  ? Math.round((row.total_bookings / summary.maxBookings) * 100)
                  : 0;
                return (
                  <Fragment key={row.resource_id}>
                    <tr
                      className={cn(
                        'border-b border-default/40 transition-colors',
                        isExpanded ? 'bg-surface/40' : 'hover:bg-hover/40',
                      )}
                    >
                      <td className="py-3 pl-3 pr-0 align-middle">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedId((cur) => (cur === row.resource_id ? null : row.resource_id))
                          }
                          className={cn(
                            'flex h-7 w-7 items-center justify-center rounded-lg transition-colors',
                            isExpanded
                              ? 'bg-blue-500/15 text-blue-300'
                              : 'text-muted hover:bg-hover hover:text-primary',
                          )}
                          aria-label={isExpanded ? 'Свернуть' : 'Развернуть'}
                          aria-expanded={isExpanded}
                        >
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                      </td>
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-3">
                          <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', iconBg)}>
                            <Icon size={15} aria-hidden />
                          </div>
                          <Link
                            to={`/resources/${row.resource_id}`}
                            className="font-medium text-primary hover:text-blue-300 underline-offset-2 hover:underline truncate"
                            title={row.resource_name}
                          >
                            {row.resource_name}
                          </Link>
                        </div>
                      </td>
                      <td className="py-3 pr-3">
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium',
                            badge || 'border-default text-secondary',
                          )}
                        >
                          {RESOURCE_TYPE_LABELS[row.resource_type as keyof typeof RESOURCE_TYPE_LABELS] ??
                            row.resource_type}
                        </span>
                      </td>
                      <td className="py-3 pr-3">
                        <span className="inline-flex h-6 min-w-[26px] items-center justify-center rounded-md border border-default/60 px-1.5 text-xs tabular-nums text-secondary">
                          {row.floor}
                        </span>
                      </td>
                      <td className="py-3 pr-3">
                        <div className="flex items-center justify-end gap-2">
                          <div className="hidden xl:block w-16 h-1.5 rounded-full bg-default/40 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-blue-500/70"
                              style={{ width: `${share}%` }}
                            />
                          </div>
                          <span className="tabular-nums font-medium text-primary min-w-[2ch] text-right">
                            {row.total_bookings}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 pr-3 text-right tabular-nums text-secondary">
                        {fmtMinutes(row.avg_duration_minutes)}
                      </td>
                      <td className="py-3 pr-3 text-right tabular-nums text-secondary">
                        {fmtMinutes(row.total_booked_minutes)}
                      </td>
                      <td className="py-3 pr-4 text-right tabular-nums text-secondary">
                        {row.peak_hour === null ? (
                          <span className="text-muted">—</span>
                        ) : (
                          <span title={`Пик в ${String(row.peak_hour).padStart(2, '0')}:00 — ${row.peak_hour_bookings} брон.`}>
                            <span className="text-primary">
                              {String(row.peak_hour).padStart(2, '0')}:00
                            </span>
                            <span className="ml-1.5 text-muted">·{' '}{row.peak_hour_bookings}</span>
                          </span>
                        )}
                      </td>
                    </tr>
                    {isExpanded && data && (
                      <ResourceBookingsRow
                        resourceId={row.resource_id}
                        dateFrom={data.date_from}
                        dateTo={data.date_to}
                        companyId={companyId}
                        colSpan={8}
                      />
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function SortHeader({
  label,
  sortKey,
  current,
  onClick,
  align = 'left',
  last = false,
}: {
  label: string;
  sortKey: ResourceUsageSortKey;
  current: { key: ResourceUsageSortKey; dir: 'asc' | 'desc' };
  onClick: (key: ResourceUsageSortKey) => void;
  align?: 'left' | 'right';
  last?: boolean;
}) {
  const isActive = current.key === sortKey;
  return (
    <th
      className={cn(
        'py-2.5 cursor-pointer select-none transition-colors',
        align === 'right' ? 'text-right pl-3' : 'pr-3',
        last ? 'pr-4' : '',
        isActive ? 'text-blue-300' : 'hover:text-secondary',
      )}
      onClick={() => onClick(sortKey)}
    >
      <span className={cn('inline-flex items-center gap-1', align === 'right' && 'flex-row-reverse')}>
        {label}
        {isActive ? (
          <span className="text-[10px]">{current.dir === 'asc' ? '▲' : '▼'}</span>
        ) : (
          <ArrowUpDown size={10} className="opacity-30" aria-hidden />
        )}
      </span>
    </th>
  );
}

export default function SuperadminAnalyticsPage() {
  const { t } = useTranslation();
  const { user, isLoading: authLoading } = useAuth();
  const isSuperadmin = user?.role === USER_ROLES.SUPERADMIN;

  const [period, setPeriod] = useState<SuperadminAnalyticsPeriod>('30d');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [resourceType, setResourceType] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportPdfError, setExportPdfError] = useState<string | null>(null);

  const { data: companiesData } = useQuery({
    queryKey: [...companiesCacheRoot(user?.id), 'analytics-superadmin', 'company-options'],
    enabled: isSuperadmin && !authLoading,
    queryFn: async () => {
      const { data: response } = await apiClient.get<PaginatedResponse<Company>>(API.companies.list, {
        params: { page_size: 1000, ordering: 'name' },
      });
      return response.results;
    },
  });

  const customRangeValid = useMemo(() => {
    if (period !== 'custom') return true;
    if (!dateFrom || !dateTo) return false;
    if (!isValidIsoDate(dateFrom) || !isValidIsoDate(dateTo)) return false;
    if (dateFrom > dateTo) return false;
    return true;
  }, [dateFrom, dateTo, period]);

  const customRangeError = useMemo(() => {
    if (period !== 'custom') return null;
    if (!dateFrom || !dateTo) return 'Укажите даты начала и конца периода.';
    if (!isValidIsoDate(dateFrom) || !isValidIsoDate(dateTo)) return 'Формат даты: YYYY-MM-DD.';
    if (dateFrom > dateTo) return 'Дата «с» не может быть позже даты «по».';
    return null;
  }, [dateFrom, dateTo, period]);

  const requestParams = useMemo(() => {
    const params: Record<string, string | number> = { period };
    if (period === 'custom' && customRangeValid) {
      params.date_from = dateFrom;
      params.date_to = dateTo;
    }
    const cid = companyId.trim();
    if (cid) {
      const n = Number(cid);
      if (Number.isInteger(n) && n > 0) params.company_id = n;
    }
    if (resourceType) params.resource_type = resourceType;
    return params;
  }, [companyId, customRangeValid, dateFrom, dateTo, period, resourceType]);

  const queryEnabled =
    isSuperadmin &&
    !authLoading &&
    (period !== 'custom' || customRangeValid) &&
    (period === 'custom' ? Boolean(dateFrom && dateTo) : true);

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['analytics', 'superadmin', requestParams],
    enabled: queryEnabled,
    queryFn: async () => {
      const { data: body } = await apiClient.get<SuperadminAnalyticsResponse>(API.analytics.superadmin, {
        params: requestParams,
      });
      return body;
    },
  });

  const overview = data?.overview;
  const errorText = isError ? getApiError(error).message : null;

  async function handleExportCsv() {
    if (!queryEnabled) return;
    try {
      setIsExporting(true);
      setExportError(null);
      const params = { ...requestParams, format: 'csv' as const };
      const response = await apiClient.get<Blob>(API.analytics.superadminExport, {
        params,
        responseType: 'blob',
        headers: {
          Accept: 'text/csv, */*;q=0.9',
        },
      });
      const fallback = `analytics-superadmin-${period}.csv`;
      const rawCd =
        response.headers['content-disposition'] ??
        (response.headers as { get?: (n: string) => string | undefined }).get?.('content-disposition');
      const filename = filenameFromContentDisposition(rawCd, fallback);
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      triggerCsvFileDownload(blob, filename);
    } catch (e) {
      setExportError(getApiError(e).message);
    } finally {
      setIsExporting(false);
    }
  }

  async function handleExportPdf() {
    if (!queryEnabled) return;
    try {
      setIsExportingPdf(true);
      setExportPdfError(null);
      const params = { ...requestParams, format: 'pdf' as const };
      const response = await apiClient.get<Blob>(API.analytics.superadminExport, {
        params,
        responseType: 'blob',
        headers: {
          Accept: 'application/pdf',
        },
      });
      const fallback = `analytics-superadmin-${period}.pdf`;
      const rawCd =
        response.headers['content-disposition'] ??
        (response.headers as { get?: (n: string) => string | undefined }).get?.('content-disposition');
      const filename = filenameFromContentDisposition(rawCd, fallback);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      triggerCsvFileDownload(blob, filename);
    } catch (e) {
      setExportPdfError(getApiError(e).message);
    } finally {
      setIsExportingPdf(false);
    }
  }

  if (authLoading) {
    return (
      <main className="max-w-7xl mx-auto px-4 py-8">
        <p className="text-sm text-muted">Загрузка…</p>
      </main>
    );
  }

  if (!isSuperadmin) {
    return (
      <main className="max-w-7xl mx-auto px-4 py-8">
        <p className="text-sm text-muted">Недостаточно прав для просмотра этой страницы.</p>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-primary flex items-center gap-2">
            <BarChart3 className="text-blue-400 shrink-0" size={28} aria-hidden />
            Аналитика
          </h1>
          <p className="text-sm text-secondary mt-1">Обзор по платформе (суперадмин)</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPeriod(opt.value)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm font-medium border transition-colors',
                period === opt.value
                  ? 'bg-blue-600 text-white border-blue-500'
                  : 'bg-raised text-secondary border-default hover:border-gray-500',
              )}
            >
              {opt.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => void handleExportCsv()}
            disabled={!queryEnabled || isExporting}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium border transition-colors',
              !queryEnabled || isExporting
                ? 'border-default bg-surface text-muted cursor-not-allowed'
                : 'border-emerald-700 bg-success-subtle text-emerald-100 hover:border-emerald-600',
            )}
          >
            <Download size={16} aria-hidden />
            {isExporting ? 'Выгрузка…' : 'Скачать CSV'}
          </button>
          <button
            type="button"
            onClick={() => void handleExportPdf()}
            disabled={!queryEnabled || isExportingPdf}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium border transition-colors',
              !queryEnabled || isExportingPdf
                ? 'border-default bg-surface text-muted cursor-not-allowed'
                : 'border-[color:var(--brand)] bg-brand-subtle text-brand hover:opacity-90',
            )}
          >
            <FileDown size={16} aria-hidden />
            {isExportingPdf ? t('analytics.exportingPdf') : t('analytics.exportPdf')}
          </button>
        </div>
      </header>

      {exportError && (
        <div className="rounded-xl border border-rose-800 bg-rose-950/40 px-4 py-3 text-sm text-rose-100" role="alert">
          {exportError}
        </div>
      )}

      {exportPdfError && (
        <div className="rounded-xl border border-rose-800 bg-rose-950/40 px-4 py-3 text-sm text-rose-100" role="alert">
          {exportPdfError}
        </div>
      )}

      {period === 'custom' && (
        <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4">
          <label className="flex flex-col gap-1 text-sm text-secondary">
            <span className="text-secondary">С даты</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-lg border border-default bg-raised px-3 py-2 text-primary"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-secondary">
            <span className="text-secondary">По дату</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-lg border border-default bg-raised px-3 py-2 text-primary"
            />
          </label>
          {customRangeError && <p className="text-sm text-warning sm:pb-2">{customRangeError}</p>}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 sm:items-end sm:gap-4">
        <label className="flex flex-col gap-1 text-sm text-secondary min-w-[200px]">
          <span className="text-secondary">Компания</span>
          <select
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            className="rounded-lg border border-default bg-raised px-3 py-2 text-primary"
          >
            <option value="">Все компании</option>
            {(companiesData ?? []).map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-secondary min-w-[220px]">
          <span className="text-secondary">Тип ресурса (только «Бронирований сегодня»)</span>
          <select
            value={resourceType}
            onChange={(e) => setResourceType(e.target.value)}
            className="rounded-lg border border-default bg-raised px-3 py-2 text-primary"
          >
            <option value="">Все типы</option>
            <option value={RESOURCE_TYPES.DESK}>{RESOURCE_TYPE_LABELS[RESOURCE_TYPES.DESK]}</option>
            <option value={RESOURCE_TYPES.MEETING_ROOM}>{RESOURCE_TYPE_LABELS[RESOURCE_TYPES.MEETING_ROOM]}</option>
            <option value={RESOURCE_TYPES.PARKING}>{RESOURCE_TYPE_LABELS[RESOURCE_TYPES.PARKING]}</option>
            <option value={RESOURCE_TYPES.CAPSULE}>{RESOURCE_TYPE_LABELS[RESOURCE_TYPES.CAPSULE]}</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => {
            setCompanyId('');
            setResourceType('');
            setPeriod('30d');
            setDateFrom('');
            setDateTo('');
          }}
          className="rounded-lg border border-default px-3 py-2 text-sm text-secondary hover:border-gray-500 self-start sm:self-end"
        >
          Сбросить фильтры
        </button>
      </div>

      {data && (
        <p className="text-xs text-muted">
          Окно отчёта: {data.date_from} — {data.date_to}
          {isFetching ? ' · обновление…' : ''}
        </p>
      )}

      {errorText && (
        <div
          className="rounded-xl border border-rose-800 bg-rose-950/40 px-4 py-3 text-sm text-rose-100 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
          role="alert"
        >
          <span>{errorText}</span>
          <button
            type="button"
            onClick={() => void refetch()}
            className="rounded-lg bg-rose-900/80 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-800 shrink-0"
          >
            Повторить
          </button>
        </div>
      )}

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4" aria-label="Ключевые показатели">
        <StatCard
          icon={<Building2 size={22} aria-hidden />}
          label="Всего компаний"
          value={overview?.total_companies ?? '—'}
          title="Число компаний в разрезе выбранного фильтра (или по всей платформе)."
          isLoading={isLoading && queryEnabled}
        />
        <StatCard
          icon={<Building2 size={22} aria-hidden />}
          label="Активных компаний"
          value={overview?.active_companies ?? '—'}
          title="Компании со статусом активна в выбранном разрезе."
          isLoading={isLoading && queryEnabled}
        />
        <StatCard
          icon={<Users size={22} aria-hidden />}
          label="Всего пользователей"
          value={overview?.total_users ?? '—'}
          title="Пользователи в разрезе выбранной компании или по всей платформе."
          isLoading={isLoading && queryEnabled}
        />
        <StatCard
          icon={<UserCheck size={22} aria-hidden />}
          label="Активных пользователей (7 дней)"
          value={overview?.active_users_7d ?? '—'}
          title="Уникальные пользователи с входом за последние 7 суток от текущего момента (last_login)."
          isLoading={isLoading && queryEnabled}
        />
        <StatCard
          icon={<Bookmark size={22} aria-hidden />}
          label="Бронирований сегодня"
          value={overview?.bookings_today ?? '—'}
          title="Календарный «сегодня» в часовом поясе бэкенда (Asia/Almaty). При выборе типа ресурса учитываются только брони этого типа."
          isLoading={isLoading && queryEnabled}
        />
        <StatCard
          icon={<UserPlus size={22} aria-hidden />}
          label="Гостей сегодня"
          value={overview?.guests_today ?? '—'}
          title="Гости за календарный «сегодня» в часовом поясе бэкенда (Asia/Almaty)."
          isLoading={isLoading && queryEnabled}
        />
        <StatCard
          icon={<ClipboardList size={22} aria-hidden />}
          label="Открытых сервисных заявок"
          value={overview?.open_service_requests ?? '—'}
          title="Заявки не в статусе «completed»."
          isLoading={isLoading && queryEnabled}
        />
      </section>

      {!queryEnabled && period === 'custom' && (
        <p className="text-sm text-muted">Укажите и проверьте даты, чтобы загрузить обзор.</p>
      )}

      <ResourceUsageSection
        period={period}
        dateFrom={dateFrom}
        dateTo={dateTo}
        companyId={companyId}
        enabled={queryEnabled}
      />

      {data && (
        <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-default bg-raised p-4">
            <h2 className="text-sm font-semibold text-primary mb-1">Новые регистрации</h2>
            <p className="text-xs text-muted mb-3">Пользователей зарегистрировано по неделям</p>
            <div className="h-64">
              {data.new_registrations.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <p className="text-sm text-muted">Нет регистраций за выбранный период</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 0, height: 0 }}>
                  <BarChart data={data.new_registrations} barCategoryGap="40%">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis
                      dataKey="week"
                      tick={{ fill: '#9ca3af', fontSize: 11 }}
                      tickFormatter={fmtWeek}
                    />
                    <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} allowDecimals={false} width={28} />
                    <Tooltip
                      contentStyle={{ background: '#111827', border: '1px solid #374151', color: '#f9fafb', borderRadius: 8 }}
                      cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                      labelFormatter={(label) => `Неделя с ${fmtWeek(String(label))}`}
                    />
                    <Bar dataKey="count" fill="#3b82f6" name="Новых пользователей" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-default bg-raised p-4">
            <h2 className="text-sm font-semibold text-primary mb-1">Заявки по типам</h2>
            <p className="text-xs text-muted mb-3">Сервисные заявки за период</p>
            <div className="h-64">
              {data.service_requests_by_type.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <p className="text-sm text-muted">Нет заявок за выбранный период</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 0, height: 0 }}>
                  <BarChart data={data.service_requests_by_type} barCategoryGap="40%">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis
                      dataKey="type"
                      tick={{ fill: '#9ca3af', fontSize: 12 }}
                      tickFormatter={fmtType}
                    />
                    <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} allowDecimals={false} width={28} />
                    <Tooltip
                      contentStyle={{ background: '#111827', border: '1px solid #374151', color: '#f9fafb', borderRadius: 8 }}
                      cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                      labelFormatter={(label) => fmtType(String(label))}
                    />
                    <Bar dataKey="count" fill="#22c55e" name="Заявок" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </section>
      )}

      {data && (
        <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-default bg-raised p-4">
            <h3 className="text-sm font-semibold text-primary mb-3">Top-5 ресурсов</h3>
            <div className="space-y-2 text-sm">
              {data.top_resources.map((row) => (
                <div key={row.resource_id} className="flex items-center justify-between text-secondary">
                  <span className="truncate pr-3">{row.name}</span>
                  <span className="tabular-nums">{row.booking_count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top-5 компаний скрыты до проработки метрики:
              сейчас рейтинг строится по числу бронирований, что не отражает ценность компании. */}

          <div className="rounded-2xl border border-default bg-raised p-4">
            <h3 className="text-sm font-semibold text-primary mb-3">Низкая загруженность (&lt;20%)</h3>
            <div className="space-y-2 text-sm">
              {data.low_utilization.map((row) => (
                <div key={row.resource_id} className="flex items-center justify-between text-secondary">
                  <span className="truncate pr-3">{row.name}</span>
                  <span className="tabular-nums">{row.utilization_percent}%</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
