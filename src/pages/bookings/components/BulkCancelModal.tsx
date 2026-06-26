import { useTranslation } from 'react-i18next';
import { Ban, X } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

interface BulkCancelModalProps {
  open: boolean;
  count: number;
  reason: string;
  error: string | null;
  isLoading: boolean;
  onClose: () => void;
  onReasonChange: (value: string) => void;
  onConfirm: () => void;
}

export function BulkCancelModal({
  open,
  count,
  reason,
  error,
  isLoading,
  onClose,
  onReasonChange,
  onConfirm,
}: BulkCancelModalProps) {
  const { t } = useTranslation();

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-cancel-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isLoading) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-surface)] shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-5 pb-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[color:var(--danger-bg)] flex items-center justify-center">
            <Ban className="w-5 h-5 text-[color:var(--danger)]" aria-hidden="true" />
          </div>
          <h2
            id="bulk-cancel-title"
            className="flex-1 text-[15px] font-semibold text-[color:var(--text-primary)] leading-tight"
          >
            {t('booking.manage.bulkCancelTitle', { count })}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-[var(--radius-sm)] text-[color:var(--text-muted)] hover:bg-[color:var(--bg-hover)] transition-colors disabled:opacity-50"
            aria-label={t('common.close')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 pb-5 space-y-4">
          {/* Warning callout */}
          <div
            className="flex items-start gap-2 px-3 py-2.5 rounded-[var(--radius-sm)] bg-[color:var(--status-soon-bg)] border border-[color:var(--status-soon-text)]/20"
            role="note"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              className="flex-shrink-0 mt-px text-[color:var(--status-soon-text)]"
              aria-hidden="true"
            >
              <path d="M7 1.5L12.5 11.5H1.5L7 1.5Z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
              <path d="M7 5.5V8" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
              <circle cx="7" cy="9.75" r="0.5" fill="currentColor" />
            </svg>
            <p className="text-[12px] text-[color:var(--status-soon-text)] leading-relaxed">
              {t('booking.manage.bulkCancelWarning')}
            </p>
          </div>

          {/* Reason textarea */}
          <label className="block">
            <span className="block text-[13px] font-medium text-[color:var(--text-secondary)] mb-1.5">
              {t('booking.manage.cancelReasonRequired2')}
            </span>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              placeholder={t('booking.manage.cancelReasonPlaceholder')}
              disabled={isLoading}
              autoFocus
              className={cn(
                'w-full resize-none rounded-[var(--radius-sm)] border px-3 py-2 text-[13px]',
                'bg-[color:var(--bg-surface)] text-[color:var(--text-primary)]',
                'focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]/25 focus:border-[color:var(--brand)]',
                'transition-colors disabled:opacity-60',
                error ? 'border-[color:var(--danger)]' : 'border-[color:var(--border)]',
              )}
            />
          </label>

          {error && (
            <p className="text-[12px] text-[color:var(--status-busy-text)]" role="alert">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[color:var(--border)] bg-[color:var(--bg-raised)]">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className={cn(
              'inline-flex items-center h-8 px-3.5 text-[13px] font-medium rounded-[var(--radius-sm)]',
              'border border-[color:var(--border)] bg-[color:var(--bg-surface)]',
              'text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-hover)] transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            {t('common.close')}
          </button>
          <button
            type="button"
            disabled={isLoading || !reason.trim()}
            onClick={onConfirm}
            className={cn(
              'inline-flex items-center gap-1.5 h-8 px-3.5 text-[13px] font-medium rounded-[var(--radius-sm)]',
              'bg-[color:var(--danger)] text-white hover:opacity-90 transition-opacity',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            {isLoading ? (
              <span
                className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin"
                aria-hidden="true"
              />
            ) : (
              <Ban className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            {isLoading
              ? t('common.saving')
              : t('booking.manage.bulkCancelWithCount', { count })}
          </button>
        </div>
      </div>
    </div>
  );
}
