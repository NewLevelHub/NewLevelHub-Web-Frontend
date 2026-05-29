import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { USER_ROLES } from '@/shared/config/constants';
import { useUser } from '@/shared/hooks/useAuth';
import { companiesCacheRoot } from '@/shared/lib/companyQueryKeys';
import { getApiError } from '@/shared/lib/getApiError';
import type { AccessLogEntry, Company, GuestPass, PaginatedResponse } from '@/shared/types';

const PAGE_SIZE = 20;

function fmt(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('ru-RU');
}

export default function AccessLogPage() {
  const { t } = useTranslation();
  const user = useUser();
  const isSuperadmin = user?.role === USER_ROLES.SUPERADMIN;

  const [companyId, setCompanyId] = useState('');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [exportError, setExportError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const params = useMemo(() => {
    const query: Record<string, string | number> = {
      page,
      page_size: PAGE_SIZE,
      ordering: '-validated_at',
    };
    if (search.trim()) query.search = search.trim();
    if (dateFrom) query.date_from = dateFrom;
    if (dateTo) query.date_to = dateTo;
    if (isSuperadmin && companyId.trim()) query.company_id = companyId.trim();
    return query;
  }, [companyId, dateFrom, dateTo, isSuperadmin, page, search]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['access-logs', params],
    queryFn: () =>
      apiClient
        .get<PaginatedResponse<AccessLogEntry>>(API.accessLog.list, { params })
        .then((response) => response.data),
    placeholderData: (prev) => prev,
  });

  const guestPassIds = useMemo(() => {
    const ids = new Set<number>();
    for (const log of data?.results ?? []) {
      if (typeof log.guest_pass === 'number') ids.add(log.guest_pass);
    }
    return Array.from(ids);
  }, [data?.results]);

  const { data: guestPassMap } = useQuery({
    queryKey: ['access-log-guest-passes', guestPassIds],
    queryFn: async () => {
      const entries = await Promise.all(
        guestPassIds.map(async (passId) => {
          const response = await apiClient.get<GuestPass>(API.passes.detail(String(passId)));
          return [passId, response.data] as const;
        }),
      );
      return Object.fromEntries(entries) as Record<number, GuestPass>;
    },
    enabled: guestPassIds.length > 0,
  });

  const { data: companiesData, isLoading: isCompaniesLoading } = useQuery({
    queryKey: [...companiesCacheRoot(user?.id), 'access-log-companies'],
    queryFn: () =>
      apiClient
        .get<PaginatedResponse<Company>>(API.companies.list, {
          params: { page_size: 200 },
        })
        .then((response) => response.data),
    enabled: isSuperadmin,
  });

  const totalCount = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  async function handleExport() {
    try {
      setIsExporting(true);
      setExportError(null);
      const exportParams: Record<string, string> = { format: 'csv' };
      if (dateFrom) exportParams.date_from = dateFrom;
      if (dateTo) exportParams.date_to = dateTo;
      if (isSuperadmin && companyId.trim()) exportParams.company_id = companyId.trim();
      if (search.trim()) exportParams.search = search.trim();

      const response = await apiClient.get<Blob>(API.accessLog.export, {
        params: exportParams,
        responseType: 'blob',
        headers: {
          Accept: 'text/csv, */*;q=0.9',
        },
      });
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const stamp = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.setAttribute('download', `access_logs_${stamp}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setExportError(getApiError(e).message);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <main className="mx-auto max-w-7xl space-y-4 p-3 sm:space-y-6 sm:p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Лог доступа</h1>
          <p className="text-sm text-secondary">
            История валидаций QR-пропусков и ручных проверок доступа.
          </p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={isExporting}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isExporting ? 'Экспорт...' : t('common.exportCsv')}
        </button>
      </div>

      <section className="rounded-xl border border-default bg-raised p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="text-sm text-secondary">{t('common.search')}<input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary"
              placeholder="Имя или email гостя"
            />
          </label>

          <label className="text-sm text-secondary">
            Дата от
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => {
                setDateFrom(event.target.value);
                setPage(1);
              }}
              className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary"
            />
          </label>

          <label className="text-sm text-secondary">
            Дата до
            <input
              type="date"
              value={dateTo}
              onChange={(event) => {
                setDateTo(event.target.value);
                setPage(1);
              }}
              className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary"
            />
          </label>

          {isSuperadmin ? (
            <label className="text-sm text-secondary">{t('common.company')}<select
                value={companyId}
                onChange={(event) => {
                  setCompanyId(event.target.value);
                  setPage(1);
                }}
                className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary"
              >
                <option value="">{isCompaniesLoading ? 'Загрузка компаний...' : t('common.allCompanies')}</option>
                {(companiesData?.results ?? []).map((company) => (
                  <option key={company.id} value={String(company.id)}>
                    {company.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
      </section>

      {exportError ? <p className="text-sm text-danger">{exportError}</p> : null}
      {isError ? <p className="text-sm text-danger">{getApiError(error).message}</p> : null}

      <div className="overflow-hidden rounded-xl border border-default bg-raised">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] divide-y divide-[color:var(--border)] text-sm">
            <thead className="bg-surface text-left text-secondary">
              <tr>
                <th className="px-4 py-3">{t('team.roleGuest')}</th>
                <th className="px-4 py-3">{t('common.company')}</th>
                <th className="px-4 py-3">Пригласил</th>
                <th className="px-4 py-3">Проверил</th>
                <th className="px-4 py-3">Валидирован</th>
                <th className="px-4 py-3">Метод</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--border)]">
              {isLoading ? (
                <tr>
                  <td className="px-4 py-6 text-center text-secondary" colSpan={6}>
                    Загрузка лога...
                  </td>
                </tr>
              ) : (data?.results?.length ?? 0) === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-center text-secondary" colSpan={6}>
                    По выбранным фильтрам ничего не найдено.
                  </td>
                </tr>
              ) : (
                data?.results.map((log) => (
                  <tr key={log.id} className="text-secondary">
                    <td className="px-4 py-3 align-top">
                      {typeof log.guest_pass === 'number' && guestPassMap?.[log.guest_pass] ? (
                        <div>
                          <div className="font-medium text-primary">{guestPassMap[log.guest_pass].guest_name}</div>
                          <div className="text-xs text-secondary">{guestPassMap[log.guest_pass].guest_email}</div>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      {typeof log.guest_pass === 'number'
                        ? (guestPassMap?.[log.guest_pass]?.created_by_company_name ?? '—')
                        : '—'}
                    </td>
                    <td className="px-4 py-3 align-top">{log.invited_by ?? '—'}</td>
                    <td className="px-4 py-3 align-top">{log.validated_by ?? '—'}</td>
                    <td className="px-4 py-3 align-top whitespace-nowrap">{fmt(log.validated_at)}</td>
                    <td className="px-4 py-3 align-top">{log.method || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col gap-3 text-sm text-secondary sm:flex-row sm:items-center sm:justify-between">
        <span>
          Всего записей: {totalCount}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1 || isLoading}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            className="rounded-lg border border-default px-3 py-2 text-secondary hover:bg-hover disabled:cursor-not-allowed disabled:opacity-50"
          >{t('common.back')}</button>
          <span className="text-secondary">
            Страница {page} из {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages || isLoading}
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            className="rounded-lg border border-default px-3 py-2 text-secondary hover:bg-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            Вперед
          </button>
        </div>
      </div>
    </main>
  );
}
