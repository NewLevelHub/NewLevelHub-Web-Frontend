import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ChevronDown, ChevronUp, Layers, Minus, Search, X } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { BREAKDOWN_ITEMS } from '@/pages/files/utils/fileBrowserUtils';
import type { CategoryFilter } from '@/pages/files/types';

type SortField = 'name' | 'file_size' | 'created_at' | 'type';

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
  sortField: SortField;
  sortDir: 'asc' | 'desc';
  onSortChange: (field: SortField) => void;
  categoryFilter: CategoryFilter;
  onCategoryFilterChange: (v: CategoryFilter) => void;
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
  sortField,
  sortDir,
  onSortChange,
  categoryFilter,
  onCategoryFilterChange,
  children,
}: FilesTableShellProps) {
  const { t } = useTranslation();
  const [catDropOpen, setCatDropOpen] = useState(false);

  const activeCat = categoryFilter !== 'all'
    ? BREAKDOWN_ITEMS.find((item) => item.key === categoryFilter) ?? null
    : null;

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDir === 'asc'
      ? <ChevronUp size={10} strokeWidth={2.5} className="shrink-0" />
      : <ChevronDown size={10} strokeWidth={2.5} className="shrink-0" />;
  };

  return (
    <div>
      {/* Backdrop for category dropdown */}
      {catDropOpen && (
        <div className="fixed inset-0 z-20" onClick={() => setCatDropOpen(false)} />
      )}

      {/* Header row: title + count + category filter + search */}
      <div className="flex items-center gap-2 pb-3 flex-wrap">
        <span className="text-[15px] font-semibold text-primary">{t('files.recentFiles')}</span>
        {!isSearching && (
          <span className="text-[12px] text-muted">
            {filesShownCount !== totalFilesCount ? (
              <>{filesShownCount} / {totalFilesCount}</>
            ) : (
              totalFilesCount
            )}
          </span>
        )}
        {isSearching && (
          <span className="text-[12px] text-muted">
            {t('files.searchResultHint', { count: filesShownCount })}
          </span>
        )}

        <div className="ml-auto flex items-center gap-1.5">
          {/* Category filter dropdown */}
          <div className="relative z-30">
            <button
              type="button"
              onClick={() => setCatDropOpen((v) => !v)}
              className={cn(
                'inline-flex items-center gap-1.5 h-[26px] px-2.5 rounded-full border text-[12px] font-medium transition-colors',
                categoryFilter !== 'all'
                  ? 'bg-brand-subtle border-transparent text-[var(--brand-text)]'
                  : 'bg-raised border-default text-secondary hover:bg-hover',
              )}
            >
              {activeCat ? (
                <activeCat.Icon size={11} />
              ) : (
                <Layers size={11} />
              )}
              <span>{activeCat ? t(activeCat.labelKey) : t('files.categoryFilter')}</span>
              <ChevronDown
                size={10}
                className={cn('transition-transform duration-150', catDropOpen && 'rotate-180')}
              />
            </button>

            {catDropOpen && (
              <div className="absolute left-0 top-[30px] z-30 w-[196px] bg-surface border border-default rounded-xl shadow-[var(--shadow-pop)] py-1.5 overflow-hidden">
                {/* All categories */}
                <button
                  type="button"
                  onClick={() => { onCategoryFilterChange('all'); setCatDropOpen(false); }}
                  className={cn(
                    'flex w-full items-center gap-2.5 px-3 py-[7px] text-[12px] font-medium transition-colors',
                    categoryFilter === 'all'
                      ? 'text-[var(--brand-text)] bg-brand-subtle'
                      : 'text-secondary hover:bg-hover',
                  )}
                >
                  <span className="w-[22px] h-[22px] rounded-[5px] flex items-center justify-center bg-raised shrink-0">
                    <Layers size={11} className="text-muted" />
                  </span>
                  <span className="flex-1 text-left">{t('files.categoryAll')}</span>
                  {categoryFilter === 'all' && (
                    <Check size={11} className="shrink-0 text-[var(--brand)]" />
                  )}
                </button>

                <div className="mx-3 my-1 border-t border-[var(--border-faint)]" />

                {/* Per-category options */}
                {BREAKDOWN_ITEMS.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => { onCategoryFilterChange(item.key); setCatDropOpen(false); }}
                    className={cn(
                      'flex w-full items-center gap-2.5 px-3 py-[7px] text-[12px] font-medium transition-colors',
                      categoryFilter === item.key
                        ? 'text-[var(--brand-text)] bg-brand-subtle'
                        : 'text-secondary hover:bg-hover',
                    )}
                  >
                    <span className={cn(
                      'w-[22px] h-[22px] rounded-[5px] flex items-center justify-center shrink-0',
                      item.colorClass,
                    )}>
                      <item.Icon size={11} />
                    </span>
                    <span className="flex-1 text-left">{t(item.labelKey)}</span>
                    {categoryFilter === item.key && (
                      <Check size={11} className="shrink-0 text-[var(--brand)]" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Search toggle */}
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

      {/* Search input */}
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

      <div className="bg-surface border border-default rounded-xl overflow-hidden">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-default bg-raised/40">

              {/* Checkbox */}
              <th className="w-[38px] px-3 py-2.5 text-left">
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

              {/* Name — sortable */}
              <th className="text-left px-3 py-2.5">
                <button
                  type="button"
                  onClick={() => onSortChange('name')}
                  className={cn(
                    'inline-flex items-center gap-1 text-[11px] font-semibold tracking-wider uppercase transition-colors select-none',
                    sortField === 'name' ? 'text-[var(--brand-text)]' : 'text-muted hover:text-primary',
                  )}
                >
                  {t('files.tableColName')}
                  <SortIcon field="name" />
                </button>
              </th>

              {/* Type — sortable */}
              <th className="w-[72px] text-left px-3 py-2.5">
                <button
                  type="button"
                  onClick={() => onSortChange('type')}
                  className={cn(
                    'inline-flex items-center gap-1 text-[11px] font-semibold tracking-wider uppercase transition-colors select-none',
                    sortField === 'type' ? 'text-[var(--brand-text)]' : 'text-muted hover:text-primary',
                  )}
                >
                  {t('files.tableColType')}
                  <SortIcon field="type" />
                </button>
              </th>

              {/* Size — sortable */}
              <th className="w-[110px] text-left px-3 py-2.5">
                <button
                  type="button"
                  onClick={() => onSortChange('file_size')}
                  className={cn(
                    'inline-flex items-center gap-1 text-[11px] font-semibold tracking-wider uppercase transition-colors select-none',
                    sortField === 'file_size' ? 'text-[var(--brand-text)]' : 'text-muted hover:text-primary',
                  )}
                >
                  {t('files.tableColSize')}
                  <SortIcon field="file_size" />
                </button>
              </th>

              {/* Created — sortable */}
              <th className="w-[148px] text-left px-3 py-2.5">
                <button
                  type="button"
                  onClick={() => onSortChange('created_at')}
                  className={cn(
                    'inline-flex items-center gap-1 text-[11px] font-semibold tracking-wider uppercase transition-colors select-none',
                    sortField === 'created_at' ? 'text-[var(--brand-text)]' : 'text-muted hover:text-primary',
                  )}
                >
                  {t('files.tableColCreated')}
                  <SortIcon field="created_at" />
                </button>
              </th>

              {/* Actions */}
              <th className="w-[38px] px-3 py-2.5" />
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
