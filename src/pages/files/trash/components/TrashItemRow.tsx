import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Folder, RotateCcw, Trash2 } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import type { TrashItem } from '@/shared/types';
import { EXT_BADGE_STYLES, formatFileSize, getFileExt, relativeDate } from '@/pages/files/utils/fileBrowserUtils';
import { daysUntilPurge } from '@/pages/files/trash/utils/trashUtils';

interface Props {
  item: TrashItem;
  lang: string;
  isRestorePending: boolean;
  isPermDeletePending: boolean;
  onRestore: (item: TrashItem) => void;
  onRequestPermDelete: (item: TrashItem) => void;
}

export const TrashItemRow = memo(function TrashItemRow({
  item,
  lang,
  isRestorePending,
  isPermDeletePending,
  onRestore,
  onRequestPermDelete,
}: Props) {
  const { t } = useTranslation();
  const days = daysUntilPurge(item.deleted_at);

  const ext = item.item_type === 'file' ? getFileExt(item.name) : '';
  const badgeGradient = EXT_BADGE_STYLES[ext] ?? 'from-slate-400 to-slate-600';

  const purgeLabel =
    days === 0 ? t('trash.purgeToday') : t('trash.purgeIn', { days });

  const purgeClass =
    days === 0
      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      : days <= 7
        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
        : 'bg-[var(--bg-muted)] text-muted';

  return (
    <div className="flex items-center gap-3 rounded-lg border border-default bg-surface px-4 py-3 hover:bg-hover transition-colors">
      {/* Icon */}
      <div className="shrink-0">
        {item.item_type === 'folder' ? (
          <div className="flex h-8 w-8 items-center justify-center rounded bg-[var(--bg-muted)]">
            <Folder size={16} className="text-muted" />
          </div>
        ) : (
          <div
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded bg-gradient-to-br text-[9px] font-bold uppercase text-white',
              badgeGradient,
            )}
          >
            {ext || '?'}
          </div>
        )}
      </div>

      {/* Name + meta */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-primary" title={item.name}>
          {item.name}
        </p>
        <p className="text-xs text-muted">
          {item.item_type === 'file' && item.file_size != null
            ? `${formatFileSize(item.file_size)} · `
            : ''}
          {relativeDate(item.deleted_at, lang)}
        </p>
      </div>

      {/* Purge countdown */}
      <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium', purgeClass)}>
        {purgeLabel}
      </span>

      {/* Scope badge */}
      <span className="shrink-0 rounded border border-default px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted">
        {item.scope === 'personal' ? t('trash.scopePersonal') : t('trash.scopeCompany')}
      </span>

      {/* Restore */}
      <button
        type="button"
        disabled={isRestorePending || isPermDeletePending}
        onClick={() => onRestore(item)}
        className="shrink-0 flex items-center gap-1 rounded border border-default px-2 py-1 text-xs text-secondary hover:bg-hover transition-colors disabled:opacity-50"
        title={t('trash.restore')}
      >
        <RotateCcw size={12} />
        <span>{t('trash.restore')}</span>
      </button>

      {/* Permanent delete */}
      <button
        type="button"
        disabled={isRestorePending || isPermDeletePending}
        onClick={() => onRequestPermDelete(item)}
        className="shrink-0 flex items-center justify-center h-7 w-7 rounded border border-default text-muted hover:bg-danger-badge/10 hover:text-danger-badge hover:border-danger-badge transition-colors disabled:opacity-50"
        title={t('trash.deleteForever')}
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
});
