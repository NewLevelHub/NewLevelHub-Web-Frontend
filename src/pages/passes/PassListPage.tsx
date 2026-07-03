import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { PASS_STATUSES, PASS_STATUS_LABEL_KEYS } from '@/shared/config/constants';
import { fmtDate } from '@/shared/lib/formatDate';
import { getApiError } from '@/shared/lib/getApiError';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/Button';
import { PassQRPanel } from '@/pages/passes/components/PassQRPanel';
import { PassStatusBadge } from '@/pages/passes/components/PassStatusBadge';
import { useAccessLogs } from '@/pages/passes/hooks/useAccessLogs';

export default function PassListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
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
    <main className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">{t('passes.listTitle')}</h1>
          <p className="text-sm text-secondary">{t('passes.listSubtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          {isAdminView && (
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={handleExport}
              disabled={isExporting}
              loading={isExporting}
            >
              {isExporting ? t('common.exportingPlain') : t('common.exportCsv')}
            </Button>
          )}
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={() => navigate('/passes/new')}
          >
            {t('passes.create')}
          </Button>
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
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ textAlign: 'left', fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', padding: '8px 12px', whiteSpace: 'nowrap' }}>{t('passes.columnGuest')}</th>
                    <th style={{ textAlign: 'left', fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', padding: '8px 12px', whiteSpace: 'nowrap' }}>{t('common.company')}</th>
                    <th style={{ textAlign: 'left', fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', padding: '8px 12px', whiteSpace: 'nowrap' }}>{t('passes.columnCreatedBy')}</th>
                    <th style={{ textAlign: 'left', fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', padding: '8px 12px', whiteSpace: 'nowrap' }}>{t('passes.columnPeriod')}</th>
                    <th style={{ textAlign: 'left', fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', padding: '8px 12px', whiteSpace: 'nowrap' }}>{t('common.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td style={{ padding: '24px 12px', fontSize: 13, color: 'var(--text-primary)', verticalAlign: 'middle', textAlign: 'center' }} colSpan={5}>
                        {t('access.loadingLog')}
                      </td>
                    </tr>
                  ) : passes.length === 0 ? (
                    <tr>
                      <td style={{ padding: '24px 12px', fontSize: 13, color: 'var(--text-primary)', verticalAlign: 'middle', textAlign: 'center' }} colSpan={5}>
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
                          style={{
                            borderBottom: '1px solid var(--border)',
                            background: isSelected ? 'var(--bg-active)' : undefined,
                            cursor: 'pointer',
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) (e.currentTarget as HTMLTableRowElement).style.background = 'var(--bg-hover)';
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLTableRowElement).style.background = isSelected ? 'var(--bg-active)' : '';
                          }}
                        >
                          <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text-primary)', verticalAlign: 'middle' }}>
                            <div style={{ fontWeight: 500 }}>{pass.guest_name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{pass.guest_email}</div>
                          </td>
                          <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text-primary)', verticalAlign: 'middle' }}>
                            {pass.created_by_company_name ?? '—'}
                          </td>
                          <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text-primary)', verticalAlign: 'middle' }}>{pass.created_by_name}</td>
                          <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text-primary)', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                            {fmtDate(pass.valid_from)} — {fmtDate(pass.valid_until)}
                          </td>
                          <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text-primary)', verticalAlign: 'middle' }}>
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
              <Button
                type="button"
                variant="secondary"
                size="md"
                disabled={page <= 1 || isLoading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                {t('common.back')}
              </Button>
              <span>{t('access.pageOf', { page, total: totalPages })}</span>
              <Button
                type="button"
                variant="secondary"
                size="md"
                disabled={page >= totalPages || isLoading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                {t('access.forward')}
              </Button>
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
