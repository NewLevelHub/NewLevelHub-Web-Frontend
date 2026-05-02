import { useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  Building2,
  Bookmark,
  ClipboardList,
  UserCheck,
  Users,
  UserPlus,
} from 'lucide-react';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { RESOURCE_TYPES, RESOURCE_TYPE_LABELS, USER_ROLES } from '@/shared/config/constants';
import { useAuth } from '@/shared/hooks/useAuth';
import { getApiErrorMessage } from '@/shared/lib/apiError';
import { cn } from '@/shared/lib/cn';
import type { Company, PaginatedResponse, SuperadminAnalyticsPeriod, SuperadminAnalyticsResponse } from '@/shared/types';

const PERIOD_OPTIONS: { value: SuperadminAnalyticsPeriod; label: string }[] = [
  { value: '7d', label: '7 дн.' },
  { value: '30d', label: '30 дн.' },
  { value: '90d', label: '90 дн.' },
  { value: 'custom', label: 'Свой' },
];

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

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
      className="bg-gray-800 rounded-2xl border border-gray-700 p-5 flex items-center gap-4"
      title={ariaDescription}
    >
      <div className="w-12 h-12 rounded-xl bg-blue-900/40 flex items-center justify-center shrink-0 text-blue-300">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-white tabular-nums">
          {isLoading ? <span className="inline-block h-8 w-16 animate-pulse rounded bg-gray-700" /> : value}
        </p>
        <p className="text-sm text-gray-400">{label}</p>
      </div>
    </div>
  );
}

export default function SuperadminAnalyticsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const isSuperadmin = user?.role === USER_ROLES.SUPERADMIN;

  const [period, setPeriod] = useState<SuperadminAnalyticsPeriod>('30d');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [resourceType, setResourceType] = useState('');

  const { data: companiesData } = useQuery({
    queryKey: ['analytics-superadmin', 'company-options'],
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
  const errorText = isError ? getApiErrorMessage(error) : null;

  if (authLoading) {
    return (
      <main className="max-w-7xl mx-auto px-4 py-8">
        <p className="text-sm text-gray-500">Загрузка…</p>
      </main>
    );
  }

  if (!isSuperadmin) {
    return (
      <main className="max-w-7xl mx-auto px-4 py-8">
        <p className="text-sm text-gray-500">Недостаточно прав для просмотра этой страницы.</p>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
            <BarChart3 className="text-blue-400 shrink-0" size={28} aria-hidden />
            Аналитика
          </h1>
          <p className="text-sm text-gray-400 mt-1">Обзор по платформе (суперадмин)</p>
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
                  : 'bg-gray-800 text-gray-300 border-gray-600 hover:border-gray-500',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </header>

      {period === 'custom' && (
        <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4">
          <label className="flex flex-col gap-1 text-sm text-gray-300">
            <span className="text-gray-400">С даты</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-white"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-gray-300">
            <span className="text-gray-400">По дату</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-white"
            />
          </label>
          {customRangeError && <p className="text-sm text-amber-300 sm:pb-2">{customRangeError}</p>}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 sm:items-end sm:gap-4">
        <label className="flex flex-col gap-1 text-sm text-gray-300 min-w-[200px]">
          <span className="text-gray-400">Компания</span>
          <select
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            className="rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-white"
          >
            <option value="">Все компании</option>
            {(companiesData ?? []).map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-gray-300 min-w-[220px]">
          <span className="text-gray-400">Тип ресурса (только «Бронирований сегодня»)</span>
          <select
            value={resourceType}
            onChange={(e) => setResourceType(e.target.value)}
            className="rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-white"
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
          className="rounded-lg border border-gray-600 px-3 py-2 text-sm text-gray-300 hover:border-gray-500 self-start sm:self-end"
        >
          Сбросить фильтры
        </button>
      </div>

      {data && (
        <p className="text-xs text-gray-500">
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
        <p className="text-sm text-gray-500">Укажите и проверьте даты, чтобы загрузить обзор.</p>
      )}
    </main>
  );
}
