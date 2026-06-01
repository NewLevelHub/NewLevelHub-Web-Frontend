import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { USER_ROLES } from '@/shared/config/constants';
import { useUser } from '@/shared/hooks/useAuth';
import { getApiError } from '@/shared/lib/getApiError';
import { PassFilters } from '@/pages/passes/components/PassFilters';
import { PassRow } from '@/pages/passes/components/PassRow';
import { PassSkeleton } from '@/pages/passes/components/PassSkeleton';
import { usePasses } from '@/pages/passes/hooks/usePasses';

export default function PassListPage() {
  const { t } = useTranslation();
  const user = useUser();
  const isAdminView = user?.role === USER_ROLES.SUPERADMIN || user?.role === USER_ROLES.COMPANY_ADMIN;
  const isSuperadmin = user?.role === USER_ROLES.SUPERADMIN;

  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const {
    passes,
    isLoading,
    isError,
    statusFilter,
    setStatusFilter,
    companyNameFilter,
    setCompanyNameFilter,
    createdByEmailFilter,
    setCreatedByEmailFilter,
    dateFromFilter,
    setDateFromFilter,
    dateToFilter,
    setDateToFilter,
    hasActiveFilters,
    resetFilters,
    totalCount,
    totalPages,
    page,
    setPage,
    pageSize,
  } = usePasses();

  const rangeStart = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, totalCount);

  async function handleExport() {
    try {
      setIsExporting(true);
      setExportError(null);
      const response = await apiClient.get<Blob>(API.passes.export, {
        responseType: 'blob',
        headers: { Accept: 'text/csv, */*;q=0.9' },
      });
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `guest_passes_${new Date().toISOString().slice(0, 10)}.csv`);
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
    <main className="mx-auto max-w-7xl space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">{t('passes.listTitle')}</h1>
          <p className="text-sm text-secondary">{t('passes.listSubtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          {isAdminView ? (
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              className="rounded-lg border border-default px-4 py-2 text-sm font-medium text-secondary hover:bg-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isExporting ? t('common.exporting') : t('common.exportCsv')}
            </button>
          ) : null}
          <Link
            to="/passes/new"
            className="inline-flex items-center rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
          >{t('passes.create')}</Link>
        </div>
      </div>

      <PassFilters
        isAdminView={isAdminView}
        isSuperadmin={isSuperadmin}
        statusFilter={statusFilter}
        companyNameFilter={companyNameFilter}
        createdByEmailFilter={createdByEmailFilter}
        dateFromFilter={dateFromFilter}
        dateToFilter={dateToFilter}
        hasActiveFilters={hasActiveFilters}
        onStatusChange={setStatusFilter}
        onCompanyNameChange={setCompanyNameFilter}
        onCreatedByEmailChange={setCreatedByEmailFilter}
        onDateFromChange={setDateFromFilter}
        onDateToChange={setDateToFilter}
        onReset={resetFilters}
      />

      {exportError ? <p className="text-sm text-danger">{exportError}</p> : null}
      {isLoading ? <PassSkeleton /> : null}
      {isError ? <div className="text-sm text-danger">{t('passes.loadListError')}</div> : null}

      {!isLoading && !isError ? (
        <div className="overflow-hidden rounded-xl border border-default bg-raised">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] divide-y divide-[color:var(--border)] text-sm">
              <thead className="bg-surface text-left">
                <tr>
                  <th className="px-4 py-3 font-medium text-primary">{t('team.roleGuest')}</th>
                  <th className="px-4 py-3 font-medium text-primary">{t('passes.owner')}</th>
                  <th className="px-4 py-3 font-medium text-primary">{t('passes.columnPurpose')}</th>
                  <th className="px-4 py-3 font-medium text-primary">{t('passes.columnPeriod')}</th>
                  <th className="px-4 py-3 font-medium text-primary">{t('common.status')}</th>
                  <th className="px-4 py-3 font-medium text-primary">{t('passes.columnChecker')}</th>
                  <th className="px-4 py-3 font-medium text-primary">{t('passes.columnValidated')}</th>
                  <th className="px-4 py-3 font-medium text-primary">{t('passes.columnMethod')}</th>
                  <th className="px-4 py-3 font-medium text-primary text-right">{t('passes.columnDetails')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--border)]">
                {passes.map(pass => (
                  <PassRow key={pass.id} pass={pass} isSuperadmin={isSuperadmin} />
                ))}
              </tbody>
            </table>
          </div>
          {totalCount === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-secondary">{t('passes.noPassesYet')}</div>
          ) : null}
          {totalCount > 0 ? (
            <div className="flex items-center justify-end gap-2 border-t border-default px-4 py-3 text-xs text-muted">
              <span>{t('passes.showing', { start: rangeStart, end: rangeEnd, total: totalCount })}</span>
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label={t('common.previousPage')}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-hover disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label={t('common.nextPage')}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-hover disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </main>
  );
}
