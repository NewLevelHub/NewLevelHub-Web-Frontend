import { useTranslation } from 'react-i18next';
import {
  ANNOUNCEMENT_CATEGORIES,
  ANNOUNCEMENT_CATEGORY_LABEL_KEYS,
  type AnnouncementCategory,
} from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';

type CategoryFilter = AnnouncementCategory | 'all';

const CATEGORY_FILTERS: Array<{ value: CategoryFilter; label: string }> = [
  { value: 'all', label: 'Все' },
  { value: ANNOUNCEMENT_CATEGORIES.INFO, label: ANNOUNCEMENT_CATEGORY_LABEL_KEYS.info },
  { value: ANNOUNCEMENT_CATEGORIES.IMPORTANT, label: ANNOUNCEMENT_CATEGORY_LABEL_KEYS.important },
  { value: ANNOUNCEMENT_CATEGORIES.EVENT, label: ANNOUNCEMENT_CATEGORY_LABEL_KEYS.event },
];

interface AnnouncementFiltersProps {
  category: CategoryFilter;
  onCategoryChange: (v: CategoryFilter) => void;
}

export function AnnouncementFilters({ category, onCategoryChange }: AnnouncementFiltersProps) {
  const { t } = useTranslation();
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
