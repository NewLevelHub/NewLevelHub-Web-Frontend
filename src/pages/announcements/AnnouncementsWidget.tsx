import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Megaphone, Pin, Building2, AlertTriangle, Calendar } from 'lucide-react';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import {
  ANNOUNCEMENT_CATEGORY_LABELS,
  type AnnouncementCategory,
} from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';
import type { Announcement, CursorPaginatedResponse } from '@/shared/types';

const CATEGORY_ICON: Record<AnnouncementCategory, React.ComponentType<{ size?: number; className?: string }>> = {
  info: Megaphone,
  important: AlertTriangle,
  event: Calendar,
};

const CATEGORY_BADGE_CLASS: Record<AnnouncementCategory, string> = {
  info: 'bg-blue-900/40 text-blue-200',
  important: 'bg-red-900/40 text-red-200',
  event: 'bg-emerald-900/40 text-emerald-200',
};

const WIDGET_LIMIT = 5;

/**
 * Compact "latest 5 announcements" widget for the dashboard.
 *
 * Hits the same cursor-based feed endpoint as the full page but with
 * ``page_size=5``; relies on the backend ordering (pinned first, then most
 * recent) so the widget surfaces the most relevant items.
 */
export function AnnouncementsWidget() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['announcements-widget'],
    queryFn: async () => {
      const response = await apiClient.get<CursorPaginatedResponse<Announcement>>(
        API.announcements.list,
        { params: { page_size: WIDGET_LIMIT } },
      );
      return response.data;
    },
  });

  const items = data?.results ?? [];

  return (
    <section
      aria-labelledby="announcements-widget-heading"
      className="rounded-xl border border-gray-800 bg-gray-900/80 p-5"
    >
      <header className="mb-3 flex items-center justify-between">
        <h2 id="announcements-widget-heading" className="text-base font-semibold text-white">
          Последние объявления
        </h2>
        <Link
          to="/announcements"
          className="text-sm text-indigo-300 hover:text-indigo-200 hover:underline"
        >
          Вся лента →
        </Link>
      </header>

      {isLoading ? (
        <p className="text-sm text-gray-500">Загрузка…</p>
      ) : isError ? (
        <p className="text-sm text-rose-300">Не удалось загрузить ленту.</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-500">Объявлений пока нет.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((a) => {
            const Icon = CATEGORY_ICON[a.category] ?? Megaphone;
            const isBuilding = a.scope === 'building' || a.company_id === null;
            return (
              <li
                key={a.id}
                className={cn(
                  'flex items-start gap-3 rounded-lg border px-3 py-2',
                  a.is_pinned ? 'border-indigo-700/70 bg-indigo-950/20' : 'border-gray-800 bg-gray-900',
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded',
                    CATEGORY_BADGE_CLASS[a.category],
                  )}
                  aria-label={ANNOUNCEMENT_CATEGORY_LABELS[a.category]}
                >
                  <Icon size={13} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {a.is_pinned ? (
                      <Pin size={12} aria-hidden="true" className="text-indigo-300" />
                    ) : null}
                    <p className="truncate text-sm font-medium text-white">{a.title}</p>
                    {isBuilding ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-gray-700 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-gray-300">
                        <Building2 size={10} aria-hidden="true" />
                        БЦ
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-xs text-gray-400">{a.text}</p>
                  <p className="mt-1 text-[11px] text-gray-500">
                    {new Date(a.created_at).toLocaleString()}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
