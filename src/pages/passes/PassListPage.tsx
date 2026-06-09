import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Calendar, ChevronLeft, ChevronRight, Download } from 'lucide-react';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { PASS_STATUSES, USER_ROLES, type PassStatus } from '@/shared/config/constants';
import { useUser } from '@/shared/hooks/useAuth';
import { cn } from '@/shared/lib/cn';
import { fmtDate } from '@/shared/lib/formatDate';
import { getApiError } from '@/shared/lib/getApiError';
import { PassQRPanel } from '@/pages/passes/components/PassQRPanel';
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
  const [selectedPassId, setSelectedPassId] = useState<number | null>(null);
  const [showDateFilter, setShowDateFilter] = useState(false);

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
    totalCount,
    totalPages,
    page,
    setPage,
    pageSize,
  } = usePasses();

  const rangeStart = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, totalCount);

  const statusChips = useMemo(
    () => [
      { label: t('passes.filters.all'), value: '' as PassStatus | '' },
      { label: t('passes.filters.active'), value: PASS_STATUSES.ACTIVE as PassStatus | '' },
      { label: t('passes.filters.expired'), value: PASS_STATUSES.EXPIRED as PassStatus | '' },
      { label: t('passes.filters.revoked'), value: PASS_STATUSES.REVOKED as PassStatus | '' },
    ],
    [t],
  );

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
    <div className="space-y-4 sm:space-y-6">
      {/* Page header */}
      <div className="flex items-end justify-between mb-[18px]">
        <div>
          <h1 className="text-[22px] font-semibold text-[color:var(--text-primary)] tracking-[-0.025em] leading-tight">
            {t('passes.listTitle')}
          </h1>
          <p className="text-[13px] text-[color:var(--text-muted)] mt-0.5">
            {t('passes.listSubtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdminView ? (
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              className="h-[32px] px-3 text-[13px] font-medium bg-transparent border border-[color:var(--border)] text-[color:var(--text-secondary)] rounded-[var(--radius-sm)] inline-flex items-center gap-1.5 hover:bg-[color:var(--bg-hover)] hover:text-[color:var(--text-primary)] transition-colors disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Download className="w-3.5 h-3.5" />
              {isExporting ? t('common.exporting') : t('common.exportCsv')}
            </button>
          ) : null}
          <Link
            to="/passes/new"
            className="h-[32px] px-3 text-[13px] font-medium bg-[color:var(--brand)] text-white border-transparent rounded-[var(--radius-sm)] inline-flex items-center gap-1.5 hover:opacity-90 transition-opacity"
          >
            {t('passes.create')}
          </Link>
        </div>
      </div>

      {exportError ? <p className="text-sm text-danger">{exportError}</p> : null}

      {/* Two-column grid */}
      <div className="grid grid-cols-1 sm:grid-cols-[1.5fr_1fr] gap-4 items-start">
        {/* Left: table card */}
        <div className="bg-[color:var(--bg-surface)] border border-[color:var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-card)] overflow-hidden">

          {/* Filter bar — single row */}
          <div className="flex items-center gap-1.5 flex-wrap px-4 py-3 border-b border-[color:var(--border)]">

            {/* Date range toggle button */}
            <button
              type="button"
              onClick={() => setShowDateFilter((v) => !v)}
              className={cn(
                'inline-flex items-center gap-1.5 h-[30px] px-2.5 text-[12px] border rounded-[var(--radius-sm)] transition-colors',
                dateFromFilter || dateToFilter
                  ? 'border-[color:var(--brand)] bg-[color:var(--brand)]/10 text-[color:var(--brand-text)]'
                  : 'border-[color:var(--border)] bg-[color:var(--bg-surface)] text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-hover)]',
              )}
            >
              <Calendar className="w-3 h-3 flex-shrink-0" />
              {dateFromFilter || dateToFilter
                ? `${dateFromFilter ? fmtDate(dateFromFilter) : '…'} — ${dateToFilter ? fmtDate(dateToFilter) : '…'}`
                : t('passes.filters.allDates')}
            </button>

            {/* Company filter — superadmin only */}
            {isSuperadmin && (
              <input
                type="text"
                value={companyNameFilter}
                onChange={(e) => {
                  setCompanyNameFilter(e.target.value);
                }}
                placeholder={t('common.allCompanies')}
                className={cn(
                  'inline-flex items-center h-[30px] px-2.5 text-[12px] border rounded-[var(--radius-sm)] focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]/20 bg-[color:var(--bg-surface)]',
                  companyNameFilter
                    ? 'border-[color:var(--brand)] bg-[color:var(--brand)]/10 text-[color:var(--brand-text)]'
                    : 'border-[color:var(--border)] text-[color:var(--text-secondary)]',
                )}
              />
            )}

            {/* Creator email filter — admin only */}
            {isAdminView && (
              <input
                type="text"
                value={createdByEmailFilter}
                onChange={(e) => {
                  setCreatedByEmailFilter(e.target.value);
                }}
                placeholder={t('passes.filters.creatorEmail')}
                className={cn(
                  'inline-flex items-center h-[30px] px-2.5 text-[12px] border rounded-[var(--radius-sm)] focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]/20 bg-[color:var(--bg-surface)]',
                  createdByEmailFilter
                    ? 'border-[color:var(--brand)] bg-[color:var(--brand)]/10 text-[color:var(--brand-text)]'
                    : 'border-[color:var(--border)] text-[color:var(--text-secondary)]',
                )}
              />
            )}

            {/* Separator */}
            <span className="self-stretch w-px bg-[color:var(--border)] flex-shrink-0 my-0.5" />

            {/* Status chips */}
            {statusChips.map((chip) => (
              <button
                key={chip.value}
                type="button"
                onClick={() => {
                  setStatusFilter(chip.value);
                  setPage(1);
                }}
                className={cn(
                  'inline-flex items-center px-2.5 py-1 text-[12px] rounded-full transition-colors',
                  statusFilter === chip.value
                    ? 'border-transparent bg-[color:var(--brand-subtle)] text-[color:var(--brand-text)]'
                    : 'border border-[color:var(--border)] text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-hover)]',
                )}
              >
                {chip.label}
              </button>
            ))}

            {/* Pagination — right */}
            {totalCount > 0 && (
              <div className="ml-auto flex items-center gap-1.5 text-[12px] text-[color:var(--text-muted)]">
                <span>
                  {t('passes.showing', { start: rangeStart, end: rangeEnd, total: totalCount })}
                </span>
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  aria-label={t('common.previousPage')}
                  className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-[color:var(--text-muted)] hover:bg-[color:var(--bg-hover)] disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  aria-label={t('common.nextPage')}
                  className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-[color:var(--text-muted)] hover:bg-[color:var(--bg-hover)] disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Expandable date row */}
          {showDateFilter && (
            <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b border-[color:var(--border)] bg-[color:var(--bg-raised)]">
              <input
                type="date"
                value={dateFromFilter}
                onChange={(e) => {
                  setDateFromFilter(e.target.value);
                  setPage(1);
                }}
                className="h-7 rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-[color:var(--bg-surface)] px-2 text-[12px] text-[color:var(--text-primary)]"
              />
              <span className="text-[11px] text-[color:var(--text-muted)]">—</span>
              <input
                type="date"
                value={dateToFilter}
                onChange={(e) => {
                  setDateToFilter(e.target.value);
                  setPage(1);
                }}
                className="h-7 rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-[color:var(--bg-surface)] px-2 text-[12px] text-[color:var(--text-primary)]"
              />
              {(dateFromFilter || dateToFilter) && (
                <button
                  type="button"
                  onClick={() => {
                    setDateFromFilter('');
                    setDateToFilter('');
                    setPage(1);
                  }}
                  className="text-[11px] text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)] transition-colors ml-1"
                >
                  {t('common.reset')}
                </button>
              )}
            </div>
          )}

          {/* Table area */}
          {isLoading ? (
            <PassSkeleton />
          ) : isError ? (
            <div className="px-4 py-6 text-sm text-danger">{t('passes.loadListError')}</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[13px]">
                  <thead>
                    <tr>
                      <th className="text-[11px] font-medium text-[color:var(--text-muted)] uppercase tracking-[0.02em] px-3 py-2.5 border-b border-[color:var(--border)] text-left">
                        {t('passes.columnGuest')}
                      </th>
                      <th className="text-[11px] font-medium text-[color:var(--text-muted)] uppercase tracking-[0.02em] px-3 py-2.5 border-b border-[color:var(--border)] text-left">
                        {t('passes.columnPeriod')}
                      </th>
                      <th className="text-[11px] font-medium text-[color:var(--text-muted)] uppercase tracking-[0.02em] px-3 py-2.5 border-b border-[color:var(--border)] text-left">
                        {t('common.status')}
                      </th>
                      <th className="text-[11px] font-medium text-[color:var(--text-muted)] uppercase tracking-[0.02em] px-3 py-2.5 border-b border-[color:var(--border)] text-right pr-[18px]">
                        {t('passes.columnActions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {passes.map((pass) => (
                      <PassRow
                        key={pass.id}
                        pass={pass}
                        isSuperadmin={isSuperadmin}
                        onRowClick={setSelectedPassId}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {totalCount === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-[color:var(--text-muted)]">
                  {t('passes.noPassesYet')}
                </div>
              ) : null}
            </>
          )}
        </div>

        {/* Right: QR panel — always rendered */}
        <PassQRPanel passId={selectedPassId} />
      </div>
    </div>
  );
}
