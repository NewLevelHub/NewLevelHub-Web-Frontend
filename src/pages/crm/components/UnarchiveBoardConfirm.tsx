import { ArchiveRestore, AlertCircle } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import type { CrmBoard } from '@/shared/types';

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
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onCancel();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="unarchive-confirm-title"
    >
      <div className="w-full max-w-sm rounded-xl bg-gray-900 border border-gray-800 shadow-2xl px-6 py-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-blue-900/40 p-2">
            <ArchiveRestore size={18} className="text-blue-400" />
          </div>
          <h2 id="unarchive-confirm-title" className="text-base font-semibold text-white">
            Разархивировать доску?
          </h2>
        </div>
        <p className="text-sm text-gray-400">
          Доска <span className="font-medium text-gray-200">«{board.name}»</span> будет восстановлена и снова станет
          активной.
        </p>
        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-red-900/30 border border-red-800 px-4 py-3 text-sm text-red-300">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              'bg-blue-600 text-white hover:bg-blue-500',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            {isPending ? 'Восстановление...' : 'Разархивировать'}
          </button>
        </div>
      </div>
    </div>
  );
}
