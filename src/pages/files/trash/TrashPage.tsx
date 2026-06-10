import { useTranslation } from 'react-i18next';
import { Lock, Trash2, Users } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import { useTrash } from './hooks/useTrash';
import { TrashEmptyState } from './components/TrashEmptyState';
import { TrashItemRow } from './components/TrashItemRow';
import { TrashSkeleton } from './components/TrashSkeleton';

const SCOPE_TABS = [
  { id: 'personal' as const, labelKey: 'trash.scopePersonal', Icon: Lock },
  { id: 'company' as const, labelKey: 'trash.scopeCompany', Icon: Users },
] as const;

export default function TrashPage() {
  const { t, i18n } = useTranslation();
  const tr = useTrash();

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight leading-none text-primary">
            {t('trash.title')}
          </h1>
          <p className="mt-1 text-xs text-muted">{t('trash.subtitle')}</p>
        </div>
        {tr.items.length > 0 && (
          <button
            type="button"
            onClick={() => tr.setConfirmDeleteAll(true)}
            disabled={tr.isEmptyTrashPending || tr.isRestorePending || tr.isPermDeletePending}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[var(--radius-sm)] bg-danger-subtle border border-[var(--danger)] text-sm font-medium text-danger hover:bg-[var(--danger)] hover:text-white transition-colors disabled:opacity-50 shrink-0"
          >
            {tr.isEmptyTrashPending ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
            ) : (
              <Trash2 size={13} />
            )}
            {t('trash.deleteAll')}
          </button>
        )}
      </div>

      {/* Scope toggle */}
      {!tr.isGuest && (
        <div className="flex gap-2">
          {SCOPE_TABS.map(({ id, labelKey, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => tr.setScope(id)}
              className={cn(
                'inline-flex items-center gap-1.5 h-8 px-3 rounded-[var(--radius-sm)] border text-sm font-medium transition-colors',
                tr.scope === id
                  ? 'border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--brand)]'
                  : 'border-default bg-surface text-secondary hover:bg-hover',
              )}
            >
              <Icon size={13} />
              {t(labelKey)}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {tr.isLoading ? (
        <TrashSkeleton />
      ) : tr.isError ? (
        <p className="text-sm text-danger-badge">{t('files.loadError')}</p>
      ) : tr.items.length === 0 ? (
        <TrashEmptyState />
      ) : (
        <div className="space-y-2">
          {tr.items.map((item) => (
            <TrashItemRow
              key={`${item.item_type}-${item.id}`}
              item={item}
              lang={i18n.language}
              isRestorePending={tr.isRestorePending}
              isPermDeletePending={tr.isPermDeletePending}
              onRestore={tr.restore}
              onRequestPermDelete={tr.setConfirmPermDelete}
            />
          ))}
        </div>
      )}

      {/* Permanent delete one item */}
      <ConfirmModal
        isOpen={tr.confirmPermDelete !== null}
        onClose={() => !tr.isPermDeletePending && tr.setConfirmPermDelete(null)}
        onConfirm={tr.handleConfirmPermDelete}
        title={t('trash.deleteForeverConfirm', { name: tr.confirmPermDelete?.name ?? '' })}
        description={t('trash.deleteForeverDesc')}
        confirmLabel={t('trash.deleteForever')}
        variant="danger"
        isLoading={tr.isPermDeletePending}
      />

      {/* Delete all confirmation */}
      <ConfirmModal
        isOpen={tr.confirmDeleteAll}
        onClose={() => !tr.isEmptyTrashPending && tr.setConfirmDeleteAll(false)}
        onConfirm={tr.handleConfirmDeleteAll}
        title={t('trash.deleteAll')}
        description={t('trash.deleteAllDesc')}
        confirmLabel={t('trash.deleteAll')}
        variant="danger"
        isLoading={tr.isEmptyTrashPending}
      />
    </div>
  );
}
