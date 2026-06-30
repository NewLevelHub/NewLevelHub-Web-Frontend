import { useTranslation } from 'react-i18next';
import { ArchiveRestore, AlertCircle } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import type { CrmBoard } from '@/shared/types';
import { Button } from '@/shared/ui/Button';

export interface UnarchiveBoardConfirmProps {
  board: CrmBoard;
  onCancel: () => void;
  onConfirm: () => void;
  isPending: boolean;
  error: string | null;
}

export function UnarchiveBoardConfirm({
  board,
  onCancel,
  onConfirm,
  isPending,
  error,
}: UnarchiveBoardConfirmProps) {
  const { t } = useTranslation();
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onCancel();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onMouseDown={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="unarchive-confirm-title"
    >
      <div className="w-full max-w-sm rounded-xl bg-surface border border-default shadow-2xl px-6 py-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-blue-900/40 p-2">
            <ArchiveRestore size={18} className="text-blue-400" />
          </div>
          <h2 id="unarchive-confirm-title" className="text-base font-semibold text-primary">
            Разархивировать доску?
          </h2>
        </div>
        <p className="text-sm text-secondary">
          Доска <span className="font-medium text-secondary">«{board.name}»</span> будет восстановлена и снова станет
          активной.
        </p>
        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-danger-subtle border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-danger">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
          >{t('common.cancel')}</Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={onConfirm}
            disabled={isPending}
            loading={isPending}
          >
            {isPending ? t('common.unarchivingPlain') : t('common.unarchive')}
          </Button>
        </div>
      </div>
    </div>
  );
}
