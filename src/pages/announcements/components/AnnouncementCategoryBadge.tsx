import { Megaphone } from 'lucide-react';

import {
  ANNOUNCEMENT_CATEGORY_LABELS,
  type AnnouncementCategory,
} from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';

import { CATEGORY_ICON } from '@/pages/announcements/utils/announcementUtils';

interface AnnouncementCategoryBadgeProps {
  category: AnnouncementCategory;
}

const CATEGORY_BADGE_CLASS: Record<AnnouncementCategory, string> = {
  info: 'bg-blue-900/40 text-blue-200 border-blue-800/60',
  important: 'bg-red-900/40 text-red-200 border-red-800/60',
  event: 'bg-emerald-900/40 text-emerald-200 border-emerald-800/60',
};

export function AnnouncementCategoryBadge({ category }: AnnouncementCategoryBadgeProps) {
  const Icon = CATEGORY_ICON[category] ?? Megaphone;
  return (
    <span
      className={cn(
        'mt-0.5 inline-flex items-center justify-center rounded-lg border px-2 py-1 text-xs',
        CATEGORY_BADGE_CLASS[category],
      )}
      aria-label={ANNOUNCEMENT_CATEGORY_LABELS[category]}
    >
      <Icon size={14} aria-hidden="true" />
      <span className="ml-1">{ANNOUNCEMENT_CATEGORY_LABELS[category]}</span>
    </span>
  );
}
