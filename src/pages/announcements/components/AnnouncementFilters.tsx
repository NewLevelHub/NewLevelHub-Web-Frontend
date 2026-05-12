import {
  ANNOUNCEMENT_CATEGORIES,
  ANNOUNCEMENT_CATEGORY_LABELS,
  type AnnouncementCategory,
} from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';

type CategoryFilter = AnnouncementCategory | 'all';

const CATEGORY_FILTERS: Array<{ value: CategoryFilter; label: string }> = [
  { value: 'all', label: 'Все' },
  { value: ANNOUNCEMENT_CATEGORIES.INFO, label: ANNOUNCEMENT_CATEGORY_LABELS.info },
  { value: ANNOUNCEMENT_CATEGORIES.IMPORTANT, label: ANNOUNCEMENT_CATEGORY_LABELS.important },
  { value: ANNOUNCEMENT_CATEGORIES.EVENT, label: ANNOUNCEMENT_CATEGORY_LABELS.event },
];

interface AnnouncementFiltersProps {
  category: CategoryFilter;
  onCategoryChange: (v: CategoryFilter) => void;
}

export function AnnouncementFilters({ category, onCategoryChange }: AnnouncementFiltersProps) {
  return (
    <nav className="flex flex-wrap gap-2" aria-label="Фильтр по категории">
      {CATEGORY_FILTERS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onCategoryChange(opt.value)}
          className={cn(
            'rounded-full border px-3 py-1.5 text-sm transition-colors',
            category === opt.value
              ? 'border-blue-500 bg-brand/20 text-brand'
              : 'border-default text-secondary hover:bg-hover',
          )}
        >
          {opt.label}
        </button>
      ))}
    </nav>
  );
}
