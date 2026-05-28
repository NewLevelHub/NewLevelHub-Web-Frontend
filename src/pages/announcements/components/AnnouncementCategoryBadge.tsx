import { useTranslation } from 'react-i18next';
import { Megaphone } from 'lucide-react';

import {
  ANNOUNCEMENT_CATEGORY_LABEL_KEYS,
  type AnnouncementCategory,
} from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';

import { CATEGORY_ICON } from '@/pages/announcements/utils/announcementUtils';

interface AnnouncementCategoryBadgeProps {
  category: AnnouncementCategory;
}

const CATEGORY_BADGE_CLASS: Record<AnnouncementCategory, string> = {
  info: 'bg-blue-900/40 text-blue-200 border-blue-800/60',
  important: 'bg-danger-subtle text-danger-badge border-red-200 dark:border-red-900/40',
  event: 'bg-success-subtle text-emerald-200 border-green-200 dark:border-emerald-800/50',
};

export function AnnouncementCategoryBadge({ category }: AnnouncementCategoryBadgeProps) {
  const { t } = useTranslation();
  const Icon = CATEGORY_ICON[category] ?? Megaphone;
  return (
    <span
      className={cn(
        'mt-0.5 inline-flex items-center justify-center rounded-lg border px-2 py-1 text-xs',
        CATEGORY_BADGE_CLASS[category],
      )}
      aria-label={t(ANNOUNCEMENT_CATEGORY_LABEL_KEYS[category])}
    >
      <Icon size={14} aria-hidden="true" />
      <span className="ml-1">{t(ANNOUNCEMENT_CATEGORY_LABEL_KEYS[category])}</span>
    </span>
  );
}
