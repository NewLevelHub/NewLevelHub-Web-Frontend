import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { PASS_STATUSES, PASS_STATUS_LABEL_KEYS } from '@/shared/config/constants';
import { fmtDate } from '@/shared/lib/formatDate';
import { getApiError } from '@/shared/lib/getApiError';
import { cn } from '@/shared/lib/cn';
import { PassQRPanel } from '@/pages/passes/components/PassQRPanel';
import { PassStatusBadge } from '@/pages/passes/components/PassStatusBadge';
import { useAccessLogs } from '@/pages/passes/hooks/useAccessLogs';

export default function PassListPage() {
  const { t } = useTranslation();
  const [selectedPassId, setSelectedPassId] = useState<number | null>(null);

  const {
    passes,
    companiesData,
    isLoading,
    isError,
    error,
    isCompaniesLoading,
    isSuperadmin,
    search,
    setSearch,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    companyId,
    setCompanyId,
    status,
    setStatus,
    page,
    setPage,
    totalCount,
    totalPages,
    handleExport,
    isExporting,
    exportError,
    isAdminView,
  } = useAccessLogs();

  return (
    <main className="mx-auto max-w-7xl space-y-4 p-3 sm:space-y-6 sm:p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">{t('passes.listTitle')}</h1>
          <p className="text-sm text-secondary">{t('passes.listSubtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          {isAdminView && (
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isExporting ? t('common.exportingPlain') : t('common.exportCsv')}
            </button>
          )}
          <Link
            to="/passes/new"
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
          >
            {t('passes.create')}
          </Link>
        </div>
      </div>

      <section className="rounded-xl border border-default bg-raised p-4">
        <div className={cn('grid gap-3 sm:grid-cols-2', isSuperadmin ? 'lg:grid-cols-5' : 'lg:grid-cols-4')}>
          <label className="text-sm text-secondary">
            {t('common.search')}
            <input
              type="search"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary"
              placeholder={t('access.searchPlaceholder')}
            />
          </label>

          <label className="text-sm text-secondary">
            {t('access.dateFrom')}
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary"
            />
          </label>

          <label className="text-sm text-secondary">
            {t('access.dateTo')}
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary"
            />
          </label>

          <label className="text-sm text-secondary">
            {t('common.status')}
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value as typeof status); setPage(1); }}
              className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary"
            >
              <option value="">{t('common.all')}</option>
              {(Object.values(PASS_STATUSES)).map((s) => (
                <option key={s} value={s}>{t(PASS_STATUS_LABEL_KEYS[s])}</option>
              ))}
            </select>
          </label>

          {isSuperadmin ? (
            <label className="text-sm text-secondary">
              {t('common.company')}
              <select
                value={companyId}
                onChange={(e) => { setCompanyId(e.target.value); setPage(1); }}
                className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary"
              >
                <option value="">
                  {isCompaniesLoading ? t('access.loadingCompanies') : t('common.allCompanies')}
                </option>
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

      <div className="grid grid-cols-1 gap-4 items-start lg:grid-cols-[1fr_auto]">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-default bg-raised">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] divide-y divide-[color:var(--border)] text-sm">
                <thead className="bg-surface text-left text-secondary">
                  <tr>
                    <th className="px-4 py-3">{t('passes.columnGuest')}</th>
                    <th className="px-4 py-3">{t('common.company')}</th>
                    <th className="px-4 py-3">{t('passes.columnCreatedBy')}</th>
                    <th className="px-4 py-3">{t('passes.columnPeriod')}</th>
                    <th className="px-4 py-3">{t('common.status')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--border)]">
                  {isLoading ? (
                    <tr>
                      <td className="px-4 py-6 text-center text-secondary" colSpan={5}>
                        {t('access.loadingLog')}
                      </td>
                    </tr>
                  ) : passes.length === 0 ? (
                    <tr>
                      <td className="px-4 py-6 text-center text-secondary" colSpan={5}>
                        {t('access.noResults')}
                      </td>
                    </tr>
                  ) : (
                    passes.map((pass) => {
                      const isSelected = pass.id === selectedPassId;
                      return (
                        <tr
                          key={pass.id}
                          onClick={() => setSelectedPassId(isSelected ? null : pass.id)}
                          className={cn(
                            'cursor-pointer text-secondary transition-colors hover:bg-hover/40',
                            isSelected && 'bg-[color:var(--bg-active)]',
                          )}
                        >
                          <td className="px-4 py-3 align-top">
                            <div className="font-medium text-primary">{pass.guest_name}</div>
                            <div className="text-xs text-secondary">{pass.guest_email}</div>
                          </td>
                          <td className="px-4 py-3 align-top">
                            {pass.created_by_company_name ?? '—'}
                          </td>
                          <td className="px-4 py-3 align-top">{pass.created_by_name}</td>
                          <td className="px-4 py-3 align-top whitespace-nowrap">
                            {fmtDate(pass.valid_from)} — {fmtDate(pass.valid_until)}
                          </td>
                          <td className="px-4 py-3 align-top">
                            <PassStatusBadge status={pass.status} />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col gap-3 text-sm text-secondary sm:flex-row sm:items-center sm:justify-between">
            <span>{t('access.totalRecords', { count: totalCount })}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1 || isLoading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-default px-3 py-2 text-secondary hover:bg-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t('common.back')}
              </button>
              <span>{t('access.pageOf', { page, total: totalPages })}</span>
              <button
                type="button"
                disabled={page >= totalPages || isLoading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-lg border border-default px-3 py-2 text-secondary hover:bg-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t('access.forward')}
              </button>
            </div>
          </div>
        </div>

        <div className="w-[260px] shrink-0">
          <PassQRPanel passId={selectedPassId} />
        </div>
      </div>
    </main>
  );
}
