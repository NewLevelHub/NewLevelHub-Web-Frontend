import { Fragment, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Download, MoreVertical, Pencil, Search, Trash2, Users, X } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import type { CompanyDirectoryMember, StorageFile, StorageFileShare } from '@/shared/types';
import type { StorageScope } from '../types';
import { EXT_BADGE_STYLES, formatFileSize, getFileExt, getOwnerInitials, relativeDate } from '../utils/fileBrowserUtils';

// ── Tiny sub-components (used only here, too small to extract) ──

function FileTypeBadge({ name }: { name: string }) {
  const ext = getFileExt(name);
  const grad = EXT_BADGE_STYLES[ext];
  return (
    <span
      className={cn(
        'inline-grid shrink-0 place-items-center rounded-[5px] font-mono text-[9.5px] font-bold tracking-wide',
        'w-[38px] h-[28px]',
        grad ? `bg-gradient-to-b ${grad} text-white` : 'bg-raised text-secondary',
      )}
    >
      {(ext.toUpperCase() || '?').slice(0, 4)}
    </span>
  );
}

// ── Props ──

interface FileRowProps {
  file: StorageFile;
  isSelected: boolean;
  isMenuOpen: boolean;
  isShareOpen: boolean;
  canManage: boolean;
  isGuest: boolean;
  scope: StorageScope;
  lang: string;
  // Share panel data (individual primitives for memo stability)
  shareSearch: string;
  shareError: string | null;
  filteredShareMembers: CompanyDirectoryMember[];
  fileShares: StorageFileShare[];
  isLoadingShares: boolean;
  isSharePending: boolean;
  isRevokePending: boolean;
  // Handlers
  onToggleSelect: (id: number) => void;
  onMenuToggle: (id: number | null) => void;
  onDownload: (id: number, name: string) => void;
  onRename: (file: StorageFile) => void;
  onDelete: (file: StorageFile) => void;
  onToggleShare: (id: number) => void;
  onCloseShare: () => void;
  onShareSearchChange: (v: string) => void;
  onGrantShare: (fileId: number, userId: number) => void;
  onRevokeShareConfirm: (shareId: number) => void;
}

export const FileRow = memo(function FileRow({
  file,
  isSelected,
  isMenuOpen,
  isShareOpen,
  canManage,
  isGuest,
  scope,
  lang,
  shareSearch,
  shareError,
  filteredShareMembers,
  fileShares,
  isLoadingShares,
  isSharePending,
  isRevokePending,
  onToggleSelect,
  onMenuToggle,
  onDownload,
  onRename,
  onDelete,
  onToggleShare,
  onCloseShare,
  onShareSearchChange,
  onGrantShare,
  onRevokeShareConfirm,
}: FileRowProps) {
  const { t } = useTranslation();

  return (
    <Fragment>
      {/* ── Main file row ── */}
      <tr
        className={cn(
          'group border-b border-[var(--border-faint)] transition-colors',
          isShareOpen ? 'border-b-0' : 'last:border-0',
          isSelected
            ? 'bg-[color-mix(in_srgb,var(--brand)_7%,transparent)]'
            : isMenuOpen
              ? 'bg-hover'
              : 'hover:bg-hover',
        )}
      >
        <td className="px-3 py-2.5">
          <button
            type="button"
            onClick={() => onToggleSelect(file.id)}
            className={cn(
              'w-3.5 h-3.5 rounded-[3px] border-[1.5px] transition-colors flex items-center justify-center',
              isSelected
                ? 'bg-[var(--brand)] border-[var(--brand)]'
                : 'border-[var(--border-strong)] hover:border-[var(--brand)]',
            )}
          >
            {isSelected && <Check size={10} strokeWidth={3} className="text-white" />}
          </button>
        </td>
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <FileTypeBadge name={file.name} />
            <span className="font-medium text-primary truncate">{file.name}</span>
          </div>
        </td>
        <td className="px-3 py-2.5 font-mono text-[12px] text-muted whitespace-nowrap">
          {formatFileSize(file.file_size ?? file.size ?? 0)}
        </td>
        <td className="px-3 py-2.5 text-muted whitespace-nowrap">
          {relativeDate(file.created_at, lang)}
        </td>
        <td className="px-3 py-2.5 relative">
          <button
            type="button"
            onClick={() => onMenuToggle(isMenuOpen ? null : file.id)}
            className="flex items-center justify-center w-7 h-7 rounded-[6px] border border-default bg-surface text-secondary hover:bg-hover hover:text-primary transition-colors"
          >
            <MoreVertical size={14} />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 top-9 z-30 w-52 bg-surface border border-default rounded-xl shadow-[var(--shadow-pop)] py-1">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onDownload(file.id, file.name); onMenuToggle(null); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-secondary hover:bg-hover whitespace-nowrap"
              >
                <Download size={13} /> {t('files.download')}
              </button>
              {canManage && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onRename(file); onMenuToggle(null); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-secondary hover:bg-hover whitespace-nowrap"
                >
                  <Pencil size={13} /> {t('files.rename')}
                </button>
              )}
              {!isGuest && scope === 'personal' && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onToggleShare(file.id); onMenuToggle(null); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-secondary hover:bg-hover whitespace-nowrap"
                >
                  <Users size={13} /> {t('files.shareAccessTitle')}
                </button>
              )}
              {canManage && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onDelete(file); onMenuToggle(null); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-danger hover:bg-hover whitespace-nowrap border-t border-[var(--border-faint)] mt-1 pt-2.5"
                >
                  <Trash2 size={13} /> {t('common.delete')}
                </button>
              )}
            </div>
          )}
        </td>
      </tr>

      {/* ── Inline share panel ── */}
      {isShareOpen && (
        <tr className="border-b border-[var(--border-faint)] last:border-0">
          <td colSpan={5} className="px-4 py-3 bg-raised">
            <div className="flex flex-col gap-2.5">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Users size={13} className="text-muted" />
                  <span className="text-[12px] font-semibold text-primary">
                    {t('files.shareAccessTitle')}
                  </span>
                  <span className="text-[11px] text-muted truncate max-w-[200px]">
                    — {file.name}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onCloseShare}
                  className="rounded p-0.5 text-muted hover:text-primary transition-colors"
                >
                  <X size={13} />
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                <input
                  autoFocus
                  type="text"
                  value={shareSearch}
                  onChange={(e) => onShareSearchChange(e.target.value)}
                  placeholder={t('files.searchEmployees')}
                  className="h-8 w-full rounded-[var(--radius-sm)] border border-default bg-surface pl-7 pr-3 text-[13px] text-primary placeholder:text-muted focus:border-[var(--brand)] focus:outline-none"
                />
              </div>

              {/* Members list */}
              {isLoadingShares ? (
                <p className="text-[12px] text-muted py-1">{t('common.loading')}</p>
              ) : filteredShareMembers.length === 0 ? (
                <p className="text-[12px] text-muted py-1">{t('files.noMembersFound')}</p>
              ) : (
                <div className="max-h-[220px] overflow-y-auto -mx-1 space-y-0.5">
                  {filteredShareMembers.map((m) => {
                    const existingShare = fileShares.find(
                      (s) => s.shared_with_user_id === m.id || s.shared_with === m.id,
                    );
                    const initials = getOwnerInitials(m.full_name);
                    return (
                      <div
                        key={m.id}
                        className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] px-2 py-1.5 hover:bg-hover transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="inline-grid shrink-0 place-items-center rounded-full text-[10px] font-semibold w-[28px] h-[28px] bg-surface border border-default text-secondary">
                            {initials}
                          </span>
                          <div className="min-w-0">
                            <p className="text-[13px] font-medium text-primary truncate leading-tight">{m.full_name}</p>
                            <p className="text-[11px] text-muted truncate leading-tight">{m.email}</p>
                          </div>
                        </div>
                        {existingShare ? (
                          <button
                            type="button"
                            onClick={() => onRevokeShareConfirm(existingShare.id)}
                            disabled={isRevokePending}
                            className="shrink-0 rounded-[var(--radius-sm)] border border-[var(--danger)] px-2.5 py-1 text-[12px] font-medium text-danger hover:bg-danger-subtle transition-colors disabled:opacity-50"
                          >
                            {t('files.revoke')}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onGrantShare(file.id, m.id)}
                            disabled={isSharePending}
                            className="shrink-0 rounded-[var(--radius-sm)] bg-brand-subtle px-2.5 py-1 text-[12px] font-medium text-brand hover:bg-[var(--brand)] hover:text-white transition-colors disabled:opacity-50"
                          >
                            {t('files.grantBtn')}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {shareError && (
                <p className="text-[12px] text-danger-badge">{shareError}</p>
              )}
            </div>
          </td>
        </tr>
      )}
    </Fragment>
  );
});

