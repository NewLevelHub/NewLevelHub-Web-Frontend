import { useState } from 'react';
import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Bookmark,
  ClipboardList,
  Download,
  HardDrive,
  Users,
  UserCheck,
  UserPlus,
} from 'lucide-react';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import type { CompanyAnalytics } from '@/shared/types';
import { USER_ROLES } from '@/shared/config/constants';
import { getApiErrorMessage } from '@/shared/lib/apiError';
import { cn } from '@/shared/lib/cn';
import { filenameFromContentDisposition, triggerCsvFileDownload } from '@/shared/lib/csvDownload';
import { useAuthStore } from '@/shared/store/auth';

function formatBytes(value: number) {
  if (value <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const power = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const normalized = value / 1024 ** power;
  return `${normalized.toFixed(power === 0 ? 0 : 1)} ${units[power]}`;
}

function formatDateTime(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

function StatCard({
  icon,
  label,
  value,
  sub,
  isLoading,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  isLoading?: boolean;
}) {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-gray-700 bg-gray-800 p-5">
      <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-900/40 text-blue-300">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
        <p className="mt-1 text-2xl font-bold tabular-nums text-white">
          {isLoading ? (
            <span className="inline-block h-7 w-16 animate-pulse rounded-md bg-gray-700" />
          ) : (
            value
          )}
        </p>
        {sub && <div className="mt-2">{sub}</div>}
      </div>
    </div>
  );
}

function StorageBar({ used, limit }: { used: number; limit: number }) {
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const barColor =
    pct > 90 ? 'bg-rose-500' : pct > 70 ? 'bg-amber-500' : 'bg-blue-500';
  return (
    <div className="space-y-1.5">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-700">
        <div
          className={cn('h-full rounded-full transition-all', barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-gray-400">
        {formatBytes(used)} / {formatBytes(limit)} · {pct.toFixed(1)}%
      </p>
    </div>
  );
}

export default function AnalyticsDashboardPage() {
  const role = useAuthStore((s) => s.user?.role);
  const isCompanyAdmin = role === USER_ROLES.COMPANY_ADMIN;
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery<CompanyAnalytics>({
    queryKey: ['analytics', 'company-dashboard'],
    queryFn: () =>
      apiClient.get<CompanyAnalytics>(API.analytics.companyDashboard).then((r) => r.data),
    enabled: isCompanyAdmin,
    staleTime: 30_000,
  });

  async function handleExportCsv() {
    try {
      setIsExporting(true);
      setExportError(null);
      const response = await apiClient.get<Blob>(API.analytics.companyExport, {
        params: { format: 'csv' },
        responseType: 'blob',
        headers: { Accept: 'text/csv, */*;q=0.9' },
      });
      const fallback = 'analytics-company.csv';
      const rawCd =
        response.headers['content-disposition'] ??
        (response.headers as { get?: (n: string) => string | undefined }).get?.(
          'content-disposition',
        );
      const filename = filenameFromContentDisposition(rawCd, fallback);
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      triggerCsvFileDownload(blob, filename);
    } catch (e) {
      setExportError(getApiErrorMessage(e, 'Не удалось выгрузить CSV.'));
    } finally {
      setIsExporting(false);
    }
  }

  if (role === USER_ROLES.SUPERADMIN) return null;

  if (!isCompanyAdmin) return null;

  if (isError) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-rose-800 bg-rose-950/40 px-4 py-3 text-sm text-rose-100">
          Не удалось загрузить аналитику компании.
        </div>
      </div>
    );
  }

  const crm = data?.active_crm_tasks;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Аналитика компании</h1>
          <p className="mt-1 text-sm text-gray-400">Ключевые метрики и активность сотрудников.</p>
        </div>
        <button
          type="button"
          onClick={() => void handleExportCsv()}
          disabled={isExporting || isLoading}
          className={cn(
            'inline-flex shrink-0 items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
            isExporting || isLoading
              ? 'cursor-not-allowed border-gray-700 bg-gray-900 text-gray-500'
              : 'border-emerald-700 bg-emerald-950/50 text-emerald-100 hover:border-emerald-600',
          )}
        >
          <Download size={16} aria-hidden />
          {isExporting ? 'Выгрузка…' : 'Скачать CSV'}
        </button>
      </div>

      {exportError && (
        <div
          className="rounded-xl border border-rose-800 bg-rose-950/40 px-4 py-3 text-sm text-rose-100"
          role="alert"
        >
          {exportError}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          icon={<Users size={22} aria-hidden />}
          label="Сотрудники"
          value={data?.total_employees ?? '—'}
          isLoading={isLoading}
        />
        <StatCard
          icon={<UserCheck size={22} aria-hidden />}
          label="Активные за 7 дней"
          value={data?.active_7d ?? '—'}
          isLoading={isLoading}
        />
        <StatCard
          icon={<Bookmark size={22} aria-hidden />}
          label="Бронирования за месяц"
          value={data?.bookings_month ?? '—'}
          isLoading={isLoading}
        />
        <StatCard
          icon={<UserPlus size={22} aria-hidden />}
          label="Гостевые визиты за месяц"
          value={data?.guest_visits_month ?? '—'}
          isLoading={isLoading}
        />
        <StatCard
          icon={<HardDrive size={22} aria-hidden />}
          label="Хранилище"
          value={data ? formatBytes(data.storage.used) : '—'}
          isLoading={isLoading}
          sub={
            data ? (
              <StorageBar used={data.storage.used} limit={data.storage.limit} />
            ) : undefined
          }
        />
        <StatCard
          icon={<ClipboardList size={22} aria-hidden />}
          label="CRM — активных задач"
          value={crm?.total ?? '—'}
          isLoading={isLoading}
          sub={
            crm ? (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-400">
                  <span>К выполнению: <span className="text-gray-200">{crm.todo}</span></span>
                  <span>В работе: <span className="text-gray-200">{crm.in_progress}</span></span>
                  <span>Готово: <span className="text-gray-200">{crm.done}</span></span>
                  {crm.other > 0 && (
                    <span>Другие: <span className="text-gray-200">{crm.other}</span></span>
                  )}
                </div>
                {crm.by_column.length > 0 && (
                  <ul
                    className="max-h-32 space-y-1 overflow-y-auto text-xs"
                    aria-label="Задачи по колонкам"
                  >
                    {crm.by_column.map((col) => (
                      <li
                        key={col.column_id}
                        className="flex items-center justify-between gap-2 border-t border-gray-700/60 pt-1 first:border-t-0 first:pt-0"
                      >
                        <span
                          className="min-w-0 truncate text-gray-300"
                          title={col.board_name ? `${col.board_name} — ${col.name}` : col.name}
                        >
                          {col.board_name ? `${col.board_name}: ${col.name}` : col.name}
                        </span>
                        <span className="shrink-0 font-semibold tabular-nums text-white">
                          {col.count}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : undefined
          }
        />
      </div>

      {/* Employee activity table */}
      <div className="overflow-hidden rounded-2xl border border-gray-700 bg-gray-800">
        <div className="border-b border-gray-700 px-5 py-4">
          <h2 className="text-sm font-semibold text-white">Активность сотрудников</h2>
          <p className="mt-0.5 text-xs text-gray-500">Бронирования, задачи и последний вход</p>
        </div>

        {isLoading ? (
          <div className="space-y-px p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl p-3">
                <div className="h-8 w-8 animate-pulse rounded-full bg-gray-700" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-32 animate-pulse rounded bg-gray-700" />
                  <div className="h-2.5 w-48 animate-pulse rounded bg-gray-700/60" />
                </div>
              </div>
            ))}
          </div>
        ) : data?.employee_activity.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-500">Нет данных об активности</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-700/60 bg-gray-900/30">
                  <th className="px-5 py-3 text-xs font-medium uppercase tracking-wide text-gray-400">
                    Сотрудник
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-400">
                    Брони (30д)
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-400">
                    Активные задачи
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-400">
                    Последний вход
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {data?.employee_activity.map((row) => (
                  <tr
                    key={row.user_id}
                    className="transition-colors hover:bg-gray-700/30"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-900/60 text-xs font-semibold text-blue-200">
                          {getInitials(row.full_name)}
                        </div>
                        <span className="font-medium text-gray-100">{row.full_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-gray-200">
                      {row.booking_count_30d}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-gray-200">
                      {row.task_count_active > 0 ? (
                        <span className="inline-flex items-center justify-center rounded-full bg-blue-900/50 px-2.5 py-0.5 text-xs font-medium text-blue-200">
                          {row.task_count_active}
                        </span>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right text-gray-400">
                      {formatDateTime(row.last_login)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
