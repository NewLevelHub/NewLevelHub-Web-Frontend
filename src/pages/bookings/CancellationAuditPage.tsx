import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { STAFF_UI_PREFIX } from '@/shared/config/constants';
import { fmtDateTime } from '@/shared/lib/formatDate';
import { useCancellationAudit } from './hooks/useCancellationAudit';

export default function CancellationAuditPage() {
  const { t } = useTranslation();
  const {
    entries,
    totalCount,
    totalPages,
    page,
    setPage,
    isLoading,
    bookingId,
    setBookingId,
    cancelledBySearch,
    setCancelledBySearch,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
  } = useCancellationAudit();

  return (
    <main className="mx-auto max-w-7xl space-y-4 p-3 sm:space-y-6 sm:p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">{t('bookingCancellationAudit.title')}</h1>
        <p className="text-sm text-secondary">{t('bookingCancellationAudit.description')}</p>
      </div>

      <section className="rounded-xl border border-default bg-raised p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm text-secondary">
            {t('bookingCancellationAudit.filter.dateFrom')}
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary"
            />
          </label>

          <label className="text-sm text-secondary">
            {t('bookingCancellationAudit.filter.dateTo')}
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary"
            />
          </label>

          <label className="text-sm text-secondary">
            {t('bookingCancellationAudit.filter.bookingId')}
            <input
              type="text"
              value={bookingId}
              onChange={(e) => setBookingId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary"
              placeholder="#123"
              autoComplete="off"
            />
          </label>

          <label className="text-sm text-secondary">
            {t('bookingCancellationAudit.filter.cancelledBy')}
            <input
              type="text"
              value={cancelledBySearch}
              onChange={(e) => setCancelledBySearch(e.target.value)}
              className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary"
              placeholder={t('bookingCancellationAudit.filter.cancelledBy')}
              autoComplete="off"
            />
          </label>
        </div>
      </section>

      <div className="overflow-hidden rounded-xl border border-default bg-raised">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] divide-y divide-[color:var(--border)] text-sm">
            <thead className="bg-surface text-left text-secondary">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">{t('bookingCancellationAudit.col.cancelledAt')}</th>
                <th className="px-4 py-3 whitespace-nowrap">{t('bookingCancellationAudit.col.bookingId')}</th>
                <th className="px-4 py-3 whitespace-nowrap">{t('bookingCancellationAudit.col.cancelledBy')}</th>
                <th className="px-4 py-3 whitespace-nowrap">{t('bookingCancellationAudit.col.reason')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--border)]">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 4 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 animate-pulse rounded bg-[color:var(--bg-hover)]" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : entries.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-center text-secondary" colSpan={4}>
                    {t('bookingCancellationAudit.empty')}
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id} className="text-secondary hover:bg-[color:var(--bg-hover)] transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap align-middle">
                      {fmtDateTime(entry.cancelled_at)}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <Link
                        to={`${STAFF_UI_PREFIX}/bookings/${entry.booking_id}`}
                        className="font-medium text-brand hover:underline"
                      >
                        #{entry.booking_id}
                      </Link>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      {entry.cancelled_by?.full_name ?? (
                        <span className="italic text-secondary">{t('bookingCancellationAudit.deletedUser')}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      {entry.cancel_reason || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col gap-3 text-sm text-secondary sm:flex-row sm:items-center sm:justify-between">
        <span>{t('bookingCancellationAudit.totalRecords', { count: totalCount })}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1 || isLoading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-lg border border-default px-3 py-2 text-secondary hover:bg-[color:var(--bg-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t('common.back')}
          </button>
          <span>
            {t('common.pageOf', { page, total: totalPages })}
          </span>
          <button
            type="button"
            disabled={page >= totalPages || isLoading}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="rounded-lg border border-default px-3 py-2 text-secondary hover:bg-[color:var(--bg-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t('common.next')}
          </button>
        </div>
      </div>
    </main>
  );
}
