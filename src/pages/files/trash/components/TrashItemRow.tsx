import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Folder, RotateCcw, Trash2 } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import type { TrashItem } from '@/shared/types';
import { EXT_BADGE_STYLES, formatFileSize, getFileExt } from '@/pages/files/utils/fileBrowserUtils';
import { daysUntilPurge } from '@/pages/files/trash/utils/trashUtils';

interface Props {
  item: TrashItem;
  lang: string;
  isRestorePending: boolean;
  isPermDeletePending: boolean;
  onRestore: (item: TrashItem) => void;
  onRequestPermDelete: (item: TrashItem) => void;
  isSelected: boolean;
  onToggle: (id: number) => void;
}

const tdStyle: React.CSSProperties = {
  padding: '10px 12px',
  fontSize: 13,
  color: 'var(--text-primary)',
  verticalAlign: 'middle',
};

export const TrashItemRow = memo(function TrashItemRow({
  item,
  lang,
  isRestorePending,
  isPermDeletePending,
  onRestore,
  onRequestPermDelete,
  isSelected,
  onToggle,
}: Props) {
  const { t } = useTranslation();
  const days = daysUntilPurge(item.deleted_at);
  const isUrgent = days <= 3;

  const ext = item.item_type === 'file' ? getFileExt(item.name) : '';
  const badgeGradient = EXT_BADGE_STYLES[ext] ?? 'from-slate-400 to-slate-600';

  const deletedDate = new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(item.deleted_at),
  );

  // Pluralised days label (approximate — i18next plural for Russian)
  const daysUnit = t('trash.purgeDays', { count: days, defaultValue: 'дн.' });
  const purgeLabel =
    days === 0
      ? t('trash.purgeUrgent')
      : t('trash.purgeInFull', { days, unit: daysUnit });

  return (
    <tr
      style={{ borderBottom: '1px solid var(--border)' }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLTableRowElement).style.background = 'var(--bg-hover)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLTableRowElement).style.background = '';
      }}
    >
      {/* Checkbox */}
      <td style={{ ...tdStyle, width: 36, paddingRight: 0 }}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggle(item.id)}
          aria-label={item.name}
          style={{ accentColor: 'var(--brand)', width: 15, height: 15, cursor: 'pointer' }}
        />
      </td>

      {/* Name + purge hint below */}
      <td style={tdStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* File type badge */}
          {item.item_type === 'folder' ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-raised)',
                flexShrink: 0,
                opacity: 0.7,
              }}
            >
              <Folder size={16} style={{ color: 'var(--text-muted)' }} />
            </div>
          ) : (
            <div
              className={cn(
                'flex items-center justify-center shrink-0 rounded text-[9px] font-bold uppercase text-white bg-gradient-to-br',
                badgeGradient,
              )}
              style={{ width: 32, height: 32, opacity: 0.75 }}
            >
              {ext || '?'}
            </div>
          )}

          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--text-muted)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: 320,
              }}
              title={item.name}
            >
              {item.name}
            </div>
            <div
              style={{
                fontSize: 10,
                marginTop: 2,
                color: isUrgent ? 'var(--danger)' : 'var(--text-subtle)',
                display: 'flex',
                alignItems: 'center',
                gap: 3,
              }}
            >
              {isUrgent && <AlertTriangle size={10} />}
              {purgeLabel}
            </div>
          </div>
        </div>
      </td>

      {/* Size */}
      <td
        style={{
          ...tdStyle,
          fontFamily: 'var(--font-mono, monospace)',
          color: 'var(--text-muted)',
          whiteSpace: 'nowrap',
        }}
      >
        {item.item_type === 'file' && item.file_size != null
          ? formatFileSize(item.file_size)
          : '—'}
      </td>

      {/* Deleted at */}
      <td style={{ ...tdStyle, fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
        {deletedDate}
      </td>

      {/* Scope badge */}
      <td style={tdStyle}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            padding: '2px 7px',
            borderRadius: 4,
            background:
              item.scope === 'personal'
                ? 'rgba(3,105,161,0.1)'
                : 'rgba(5,150,105,0.1)',
            color:
              item.scope === 'personal' ? 'var(--info)' : 'var(--brand)',
            whiteSpace: 'nowrap',
          }}
        >
          {item.scope === 'personal'
            ? t('trash.scopePersonal')
            : t('trash.scopeCompany')}
        </span>
      </td>

      {/* Actions */}
      <td style={{ ...tdStyle, textAlign: 'right', paddingRight: 16 }}>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
          <button
            type="button"
            disabled={isRestorePending || isPermDeletePending}
            onClick={() => onRestore(item)}
            className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-[var(--radius-sm)] border border-[color:var(--border)] text-[12px] font-medium text-secondary hover:bg-[color:var(--bg-hover)] hover:text-primary transition-colors disabled:opacity-50"
            title={t('trash.restore')}
          >
            <RotateCcw size={11} />
            {t('trash.restore')}
          </button>

          <button
            type="button"
            disabled={isRestorePending || isPermDeletePending}
            onClick={() => onRequestPermDelete(item)}
            className="inline-flex items-center gap-1.5 h-7 px-3 rounded-[var(--radius-sm)] border border-[color:var(--border)] text-[12px] font-medium whitespace-nowrap hover:border-[color:var(--danger)] hover:text-[color:var(--danger)] hover:bg-[var(--danger-bg)] text-secondary transition-colors disabled:opacity-50"
            title={t('trash.deleteForever')}
          >
            <Trash2 size={11} />
            {t('trash.deleteForever')}
          </button>
        </div>
      </td>
    </tr>
  );
});
