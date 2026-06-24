import { useTranslation } from 'react-i18next';
import { Lock, Trash2, Users } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import { useTrash } from '@/pages/files/trash/hooks/useTrash';
import type { TrashScopeFilter } from '@/pages/files/trash/hooks/useTrash';
import { TrashEmptyState } from '@/pages/files/trash/components/TrashEmptyState';
import { TrashItemRow } from '@/pages/files/trash/components/TrashItemRow';
import { TrashSkeleton } from '@/pages/files/trash/components/TrashSkeleton';

const SCOPE_TABS: { id: TrashScopeFilter; labelKey: string; Icon?: React.ElementType }[] = [
  { id: 'all', labelKey: 'trash.scopeAll' },
  { id: 'personal', labelKey: 'trash.scopePersonal', Icon: Lock },
  { id: 'company', labelKey: 'trash.scopeCompany', Icon: Users },
];

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 500,
  color: 'var(--text-muted)',
  padding: '8px 12px',
  whiteSpace: 'nowrap',
};

export default function TrashPage() {
  const { t, i18n } = useTranslation();
  const tr = useTrash();

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            className="text-[22px] font-semibold tracking-tight leading-none text-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 10 }}
          >
            {t('trash.title')}
            {tr.items.length > 0 && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: 20,
                  background: 'rgba(185,28,28,0.1)',
                  color: 'var(--danger)',
                }}
              >
                {tr.items.length}
              </span>
            )}
          </h1>
          <p className="mt-1 text-xs text-muted">
            {tr.items.length > 0
              ? `${t('trash.itemCount', { count: tr.items.length })} · ${t('trash.autoDeleteNote')}`
              : t('trash.subtitle')}
          </p>
        </div>

        {tr.items.length > 0 && (
          <button
            type="button"
            onClick={() => tr.setConfirmDeleteAll(true)}
            disabled={tr.isEmptyTrashPending || tr.isRestorePending || tr.isPermDeletePending}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[var(--radius-sm)] border border-[color:var(--border)] text-sm font-medium text-secondary hover:border-[color:var(--danger)] hover:text-[color:var(--danger)] hover:bg-[var(--danger-bg)] transition-colors disabled:opacity-50 shrink-0"
          >
            {tr.isEmptyTrashPending ? (
              <span
                className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
                aria-hidden="true"
              />
            ) : (
              <Trash2 size={13} />
            )}
            {t('trash.deleteAll')}
          </button>
        )}
      </div>

      {/* Scope filter */}
      {!tr.isGuest && (
        <div className="flex gap-2">
          {SCOPE_TABS.map(({ id, labelKey, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => tr.setScopeFilter(id)}
              className={cn(
                'inline-flex items-center gap-1.5 h-8 px-3 rounded-[var(--radius-sm)] border text-sm font-medium transition-colors',
                tr.scopeFilter === id
                  ? 'border-[color:var(--brand)] bg-[color:var(--brand-subtle)] text-[color:var(--brand-text)]'
                  : 'border-[color:var(--border)] bg-surface text-secondary hover:bg-[color:var(--bg-hover)]',
              )}
            >
              {Icon && <Icon size={13} />}
              {t(labelKey)}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {tr.isLoading ? (
        <TrashSkeleton />
      ) : tr.isError ? (
        <p className="text-sm" style={{ color: 'var(--danger)' }}>
          {t('files.loadError')}
        </p>
      ) : tr.items.length === 0 ? (
        <TrashEmptyState />
      ) : (
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-card)',
            overflow: 'hidden',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={thStyle}>{t('trash.colName')}</th>
                <th style={{ ...thStyle, width: 80 }}>{t('trash.colSize')}</th>
                <th style={{ ...thStyle, width: 130 }}>{t('trash.colDeletedAt')}</th>
                <th style={{ ...thStyle, width: 100 }}>{t('trash.colScope')}</th>
                <th style={{ ...thStyle, width: 240, textAlign: 'right', paddingRight: 16 }}>
                  {t('trash.colActions')}
                </th>
              </tr>
            </thead>
            <tbody>
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
            </tbody>
          </table>
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
