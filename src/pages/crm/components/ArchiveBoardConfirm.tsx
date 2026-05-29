import { useTranslation } from 'react-i18next';
import { Archive } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import type { CrmBoard } from '@/shared/types';

export interface ArchiveBoardConfirmProps {
  board: CrmBoard;
  onCancel: () => void;
  onConfirm: () => void;
  isPending: boolean;
}

export function ArchiveBoardConfirm({ board, onCancel, onConfirm, isPending }: ArchiveBoardConfirmProps) {
  const { t } = useTranslation();
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onCancel();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="archive-confirm-title"
    >
      <div className="w-full max-w-sm rounded-xl bg-surface border border-default shadow-2xl px-6 py-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-warning-subtle p-2">
            <Archive size={18} className="text-amber-400" />
          </div>
          <h2 id="archive-confirm-title" className="text-base font-semibold text-primary">
            Архивировать доску?
          </h2>
        </div>
        <p className="text-sm text-secondary">
          Доска <span className="font-medium text-secondary">«{board.name}»</span> будет перемещена в архив. Вы
          сможете найти её через фильтр.
        </p>
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm font-medium text-secondary hover:text-primary hover:bg-hover transition-colors"
          >{t('common.cancel')}</button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              'bg-amber-600 text-primary hover:bg-amber-500',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            {isPending ? t('common.archivingPlain') : t('common.archive')}
          </button>
        </div>
      </div>
    </div>
  );
}
