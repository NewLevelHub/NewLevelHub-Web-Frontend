import { useTranslation } from 'react-i18next';
import {
  ANNOUNCEMENT_CATEGORIES,
  ANNOUNCEMENT_CATEGORY_LABEL_KEYS,
  type AnnouncementCategory,
} from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';
import type { CategoryFilter, ScopeFilter } from '@/pages/announcements/utils/announcementUtils';

interface AnnouncementFiltersProps {
  scope: ScopeFilter;
  onScopeChange: (v: ScopeFilter) => void;
  category: CategoryFilter;
  onCategoryChange: (v: CategoryFilter) => void;
  onMarkAllRead?: () => void;
  isMarkingAllRead?: boolean;
}

const SCOPE_FILTERS: Array<{ value: ScopeFilter; labelKey: string }> = [
  { value: 'all', labelKey: 'announcements.filterAll' },
  { value: 'building', labelKey: 'announcements.filterBC' },
  { value: 'company', labelKey: 'announcements.filterCompany' },
];

const CATEGORY_FILTERS: Array<{ value: CategoryFilter; labelKey: string }> = [
  { value: 'all', labelKey: 'announcements.filterAll' },
  { value: ANNOUNCEMENT_CATEGORIES.IMPORTANT, labelKey: ANNOUNCEMENT_CATEGORY_LABEL_KEYS[ANNOUNCEMENT_CATEGORIES.IMPORTANT] },
  { value: ANNOUNCEMENT_CATEGORIES.EVENT, labelKey: ANNOUNCEMENT_CATEGORY_LABEL_KEYS[ANNOUNCEMENT_CATEGORIES.EVENT] },
  { value: ANNOUNCEMENT_CATEGORIES.INFO, labelKey: ANNOUNCEMENT_CATEGORY_LABEL_KEYS[ANNOUNCEMENT_CATEGORIES.INFO] },
];

const chipBase = 'rounded-full border px-3 py-1 text-sm transition-colors cursor-pointer';
const chipActive = 'border-[color:var(--brand)] bg-brand-subtle text-brand';
const chipInactive = 'border-default text-secondary hover:bg-hover';

export function AnnouncementFilters({
  scope,
  onScopeChange,
  category,
  onCategoryChange,
  onMarkAllRead,
  isMarkingAllRead,
}: AnnouncementFiltersProps) {
  const { t } = useTranslation();

  return (
    <nav
      className="flex flex-wrap items-center gap-3"
      aria-label={t('announcements.sourceLabel')}
    >
      {/* Source label */}
      <span
        style={{
          fontSize: 12,
          color: 'var(--text-muted)',
          fontWeight: 500,
          whiteSpace: 'nowrap',
        }}
      >
        {t('announcements.sourceLabel')}
      </span>

      {/* Scope chips */}
      {SCOPE_FILTERS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onScopeChange(opt.value)}
          className={cn(chipBase, scope === opt.value ? chipActive : chipInactive)}
        >
          {t(opt.labelKey)}
        </button>
      ))}

      {/* Separator */}
      <span
        style={{
          display: 'inline-block',
          width: 1,
          height: 16,
          background: 'var(--border)',
          flexShrink: 0,
        }}
        aria-hidden="true"
      />

      {/* Category label */}
      <span
        style={{
          fontSize: 12,
          color: 'var(--text-muted)',
          fontWeight: 500,
          whiteSpace: 'nowrap',
        }}
      >
        {t('announcements.categoryLabel')}
      </span>

      {/* Category chips */}
      {CATEGORY_FILTERS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onCategoryChange(opt.value as CategoryFilter)}
          className={cn(chipBase, category === opt.value ? chipActive : chipInactive)}
        >
          {t(opt.labelKey)}
        </button>
      ))}

      {/* Mark all read */}
      {onMarkAllRead ? (
        <button
          type="button"
          onClick={onMarkAllRead}
          disabled={isMarkingAllRead}
          className="ml-auto rounded-full px-3 py-1 text-sm text-secondary hover:bg-hover transition-colors disabled:opacity-40"
        >
          ✓ {t('announcements.markAllRead')}
        </button>
      ) : null}
    </nav>
  );
}
