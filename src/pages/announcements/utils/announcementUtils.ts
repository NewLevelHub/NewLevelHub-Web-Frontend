import { AlertTriangle, Calendar, Megaphone } from 'lucide-react';

import { API } from '@/shared/api/endpoints';
import type { AnnouncementCategory } from '@/shared/config/constants';

export type CategoryFilter = AnnouncementCategory | 'all';
export type ScopeFilter = 'all' | 'building' | 'company';

export const CATEGORY_ICON: Record<
  AnnouncementCategory,
  React.ComponentType<{ size?: number; className?: string }>
> = {
  info: Megaphone,
  important: AlertTriangle,
  event: Calendar,
};

export function buildListUrl(
  cursor: string | null,
  category: CategoryFilter,
  scope: ScopeFilter = 'all',
): string {
  if (cursor) return cursor;
  const params = new URLSearchParams();
  if (category !== 'all') params.set('category', category);
  if (scope !== 'all') params.set('scope', scope);
  const qs = params.toString();
  return qs ? `${API.announcements.list}?${qs}` : API.announcements.list;
}
