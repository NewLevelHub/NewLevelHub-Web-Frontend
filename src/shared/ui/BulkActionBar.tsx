import React from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

export interface BulkActionBarAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger';
  isLoading?: boolean;
  disabled?: boolean;
}

interface BulkActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  actions: BulkActionBarAction[];
}

/**
 * Shared bulk action bar — appears when one or more rows are selected.
 * Matches the design established in ManageBookingsPage and FileBrowserPage.
 */
export function BulkActionBar({ selectedCount, onClearSelection, actions }: BulkActionBarProps) {
  const { t } = useTranslation();

  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-[color:var(--brand)] bg-brand-subtle px-4 py-2.5 text-sm">
      <span className="font-medium text-[color:var(--brand-text)]">
        {t('common.bulkActionBar.selectedCount', { count: selectedCount })}
      </span>

      <div className="ml-auto flex items-center gap-2">
        {/* Clear selection */}
        <button
          type="button"
          onClick={onClearSelection}
          className="inline-flex items-center gap-1.5 h-7 px-3 rounded-[var(--radius-sm)] border border-default bg-surface text-[12px] font-medium text-secondary hover:bg-hover transition-colors"
        >
          <X size={12} aria-hidden="true" />
          {t('common.bulkActionBar.clearSelection')}
        </button>

        {/* Action buttons */}
        {actions.map((action, idx) => (
          <button
            key={idx}
            type="button"
            onClick={action.onClick}
            disabled={action.disabled ?? action.isLoading}
            className={cn(
              'inline-flex items-center gap-1.5 h-7 px-3 rounded-[var(--radius-sm)] text-[12px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
              action.variant === 'danger'
                ? 'bg-danger-subtle border border-[color:var(--danger)] text-[color:var(--danger)] hover:bg-[color:var(--danger)] hover:text-white'
                : 'border border-default bg-surface text-secondary hover:bg-hover',
            )}
          >
            {action.isLoading ? (
              <span
                className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent flex-shrink-0"
                aria-hidden="true"
              />
            ) : (
              action.icon
            )}
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
