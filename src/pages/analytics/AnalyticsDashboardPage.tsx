import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import type { CompanyAnalytics } from '@/shared/types';
import { PageStub } from '@/shared/ui/PageStub';
import { USER_ROLES } from '@/shared/config/constants';
import { getApiError } from '@/shared/lib/getApiError';
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

export default function AnalyticsDashboardPage() {
  const { t } = useTranslation();
  const role = useAuthStore((s) => s.user?.role);
  const isCompanyAdmin = role === USER_ROLES.COMPANY_ADMIN;
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery<CompanyAnalytics>({
    queryKey: ['analytics', 'company-dashboard'],
    queryFn: () => apiClient.get<CompanyAnalytics>(API.analytics.companyDashboard).then((r) => r.data),
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
        headers: {
          Accept: 'text/csv, */*;q=0.9',
        },
      });
      const fallback = 'analytics-company.csv';
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

  if (role === USER_ROLES.SUPERADMIN) {
    return (
      <PageStub
        title="Аналитика"
        description="Аналитика всего БЦ"
        todos={['Интеграция супер-админской аналитики в рамках отдельной задачи']}
      />
    );
  }

  if (!isCompanyAdmin) {
    return null;
  }

  if (isLoading) {
    return <div className="p-6 text-sm text-secondary">Загрузка аналитики...</div>;
  }

  if (isError || !data) {
    return <div className="p-6 text-sm text-red-400">Не удалось загрузить аналитику компании.</div>;
  }

  const crm = data.active_crm_tasks;
  const statusLineParts = [
    `К выполнению (эвристика): ${crm.todo}`,
    `В работе: ${crm.in_progress}`,
    `Готово: ${crm.done}`,
  ];
  if (crm.other > 0) {
    statusLineParts.push(`Другие колонки: ${crm.other}`);
  }

  const cards: Array<{
    title: string;
    value: ReactNode;
  }> = [
    { title: 'Сотрудники', value: data.total_employees },
    { title: 'Активные за 7 дней', value: data.active_7d },
    { title: 'Бронирования за месяц', value: data.bookings_month },
    { title: 'Гостевые визиты за месяц', value: data.guest_visits_month },
    {
      title: 'Хранилище',
      value: `${formatBytes(data.storage.used)} / ${formatBytes(data.storage.limit)}`,
    },
    {
      title: 'CRM задачи',
      value: (
        <div className="space-y-2">
          <span className="text-2xl font-semibold text-primary">{crm.total}</span>
          <p className="text-sm font-normal leading-snug text-secondary">Всего активных задач на досках</p>
          <p className="text-xs font-normal leading-relaxed text-secondary">{statusLineParts.join(' · ')}</p>
          {crm.by_column.length > 0 ? (
            <ul className="mt-2 max-h-36 space-y-1 overflow-y-auto text-xs text-secondary" aria-label="Задачи по колонкам">
              {crm.by_column.map((col) => (
                <li key={col.column_id} className="flex justify-between gap-2 border-t border-default/60 pt-1 first:border-t-0 first:pt-0">
                  <span className="min-w-0 truncate" title={col.board_name ? `${col.board_name} — ${col.name}` : col.name}>
                    {col.board_name ? `${col.board_name}: ${col.name}` : col.name}
                  </span>
                  <span className="shrink-0 font-medium tabular-nums text-primary">{col.count}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Аналитика компании</h1>
          <p className="mt-1 text-sm text-secondary">Ключевые метрики и активность сотрудников.</p>
        </div>
        <button
          type="button"
          onClick={() => void handleExportCsv()}
          disabled={isExporting}
          className={cn(
            'inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors shrink-0',
            isExporting
              ? 'border-default bg-surface text-muted cursor-not-allowed'
              : 'border-emerald-700 bg-success-subtle text-emerald-100 hover:border-emerald-600',
          )}
        >
          <Download size={18} aria-hidden />
          {isExporting ? 'Выгрузка…' : t('common.downloadCsv')}
        </button>
      </div>

      {exportError && (
        <div className="rounded-xl border border-rose-800 bg-rose-950/40 px-4 py-3 text-sm text-rose-100" role="alert">
          {exportError}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const simple = typeof card.value === 'number' || typeof card.value === 'string';
          return (
            <div key={card.title} className="rounded-xl border border-default bg-raised p-4">
              <p className="text-xs uppercase tracking-wide text-secondary">{card.title}</p>
              <div
                className={cn(
                  'mt-2',
                  simple && 'text-2xl font-semibold text-primary',
                )}
              >
                {card.value}
              </div>
            </div>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-xl border border-default bg-raised">
        <div className="border-b border-default px-4 py-3">
          <h2 className="text-sm font-semibold text-primary">Активность сотрудников</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-raised text-xs uppercase tracking-wide text-secondary">
              <tr>
                <th className="px-4 py-3">{t('team.roleEmployee')}</th>
                <th className="px-4 py-3">Брони (30д)</th>
                <th className="px-4 py-3">{t('common.activeTasks')}</th>
                <th className="px-4 py-3">{t('common.lastLogin')}</th>
              </tr>
            </thead>
            <tbody>
              {data.employee_activity.map((row) => (
                <tr key={row.user_id} className="border-t border-default/70 text-secondary">
                  <td className="px-4 py-3">{row.full_name}</td>
                  <td className="px-4 py-3">{row.booking_count_30d}</td>
                  <td className="px-4 py-3">{row.task_count_active}</td>
                  <td className="px-4 py-3">{formatDateTime(row.last_login)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
