import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Minus, Search, X } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

interface FilesTableShellProps {
  totalFilesCount: number;
  filesShownCount: number;
  isSearching: boolean;
  showSearch: boolean;
  searchTerm: string;
  allSelected: boolean;
  someSelected: boolean;
  onToggleSearch: () => void;
  onSearchChange: (v: string) => void;
  onClearSearch: () => void;
  onToggleSelectAll: () => void;
  children: ReactNode;
}

export function FilesTableShell({
  totalFilesCount,
  filesShownCount,
  isSearching,
  showSearch,
  searchTerm,
  allSelected,
  someSelected,
  onToggleSearch,
  onSearchChange,
  onClearSearch,
  onToggleSelectAll,
  children,
}: FilesTableShellProps) {
  const { t } = useTranslation();

  return (
    <div>
      <div className="flex items-center gap-2 pb-3 flex-wrap">
        <span className="text-[15px] font-semibold text-primary">{t('files.recentFiles')}</span>
        {!isSearching && (
          <span className="text-[12px] text-muted">
            {filesShownCount} / {totalFilesCount}
          </span>
        )}
        {isSearching && (
          <span className="text-[12px] text-muted">
            {t('files.searchResultHint', { count: filesShownCount })}
          </span>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={onToggleSearch}
            className={cn(
              'inline-flex items-center gap-1.5 h-[26px] px-2.5 rounded-full border text-[12px] font-medium transition-colors',
              showSearch
                ? 'bg-brand-subtle border-transparent text-[var(--brand-text)]'
                : 'bg-raised border-default text-secondary hover:bg-hover',
            )}
          >
            <Search size={11} /> {t('common.search')}
          </button>
        </div>
      </div>

      {showSearch && (
        <div className="flex items-center gap-2 mb-3">
          <input
            autoFocus
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t('files.searchFilesPlaceholder')}
            className="h-8 flex-1 rounded-[var(--radius-sm)] border border-default bg-raised px-3 text-sm text-primary placeholder:text-muted focus:border-[var(--brand)] focus:outline-none focus:ring-1 focus:ring-[color-mix(in_srgb,var(--brand)_20%,transparent)]"
          />
          <button
            type="button"
            onClick={onClearSearch}
            className="rounded-[var(--radius-sm)] p-1.5 text-muted hover:bg-hover hover:text-primary transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="bg-surface border border-default rounded-xl">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-default">
              <th className="w-[34px] px-3 py-2.5 text-left">
                <button
                  type="button"
                  onClick={onToggleSelectAll}
                  className={cn(
                    'w-3.5 h-3.5 rounded-[3px] border-[1.5px] transition-colors flex items-center justify-center',
                    allSelected || someSelected
                      ? 'bg-[var(--brand)] border-[var(--brand)]'
                      : 'border-[var(--border-strong)] hover:border-[var(--brand)]',
                  )}
                >
                  {allSelected && <Check size={10} strokeWidth={3} className="text-white" />}
                  {someSelected && !allSelected && <Minus size={10} strokeWidth={3} className="text-white" />}
                </button>
              </th>
              <th className="text-left text-[11px] font-medium tracking-wider uppercase text-muted px-3 py-2.5">
                {t('files.tableColName')}
              </th>
              <th className="w-[90px] text-left text-[11px] font-medium tracking-wider uppercase text-muted px-3 py-2.5">
                {t('files.tableColSize')}
              </th>
              <th className="w-[130px] text-left text-[11px] font-medium tracking-wider uppercase text-muted px-3 py-2.5">
                {t('files.tableColCreated')}
              </th>
              <th className="w-[34px] px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {children}
          </tbody>
        </table>
      </div>
    </div>
  );
}
