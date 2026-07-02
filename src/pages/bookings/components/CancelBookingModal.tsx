import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/cn';
import type { Booking } from '@/shared/types';

interface CancelBookingModalProps {
  booking: Booking | null;
  reason: string;
  error: string | null;
  isLoading: boolean;
  onClose: () => void;
  onReasonChange: (value: string) => void;
  onConfirm: () => void;
}

export function CancelBookingModal({
  booking,
  reason,
  error,
  isLoading,
  onClose,
  onReasonChange,
  onConfirm,
}: CancelBookingModalProps) {
  const { t } = useTranslation();

  if (!booking) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t('booking.manage.adminCancelTitle')}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isLoading) onClose();
      }}
    >
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-surface)] p-4 sm:p-5 shadow-xl">
        <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">
          {t('booking.manage.adminCancelTitle')}
        </h2>
        <p className="mt-1 text-sm text-[color:var(--text-muted)]">
          #{booking.id} ({booking.resource_name}, {booking.booked_by?.full_name ?? booking.user_name})
        </p>

        <label className="mt-4 block text-sm text-[color:var(--text-secondary)]">
          {t('booking.manage.cancelReasonLabel')}
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder={t('booking.manage.cancelReasonPlaceholder')}
            disabled={isLoading}
            className="mt-1 w-full resize-none rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-[color:var(--bg-surface)] px-3 py-2 text-sm text-[color:var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]/25 focus:border-[color:var(--brand)] transition-colors disabled:opacity-60"
          />
        </label>

        {error && (
          <p className="mt-2 text-sm text-[color:var(--status-busy-text)]" role="alert">
            {error}
          </p>
        )}

        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-[color:var(--bg-surface)] px-4 py-2 text-sm font-medium text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-raised)] disabled:opacity-50 transition-colors"
          >
            {t('common.close')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] px-4 py-2 text-sm font-medium text-white',
              'bg-[color:var(--danger)] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            {isLoading && (
              <span
                className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin"
                aria-hidden="true"
              />
            )}
            {isLoading ? t('common.saving') : t('booking.manage.confirmCancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
