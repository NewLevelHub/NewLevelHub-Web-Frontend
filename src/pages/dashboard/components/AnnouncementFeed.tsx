import { Link } from 'react-router';
import { Megaphone } from 'lucide-react';
import type { DashboardAnnouncementItem } from '@/shared/types';

export interface AnnouncementFeedProps {
  items: DashboardAnnouncementItem[];
  title?: string;
}

export function AnnouncementFeed({ items, title = 'Объявления' }: AnnouncementFeedProps) {
  if (items.length === 0) return null;
  return (
    <section className="rounded-xl border border-default bg-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-primary">
          <Megaphone size={15} className="text-amber-500" />
          {title}
        </h2>
        <Link to="/announcements" className="text-xs text-brand hover:text-brand-hover transition-colors">
          Все →
        </Link>
      </div>
      <ul className="space-y-3">
        {items.map((a) => (
          <li key={a.id} className="border-b border-default pb-3 last:border-0 last:pb-0">
            <p className="text-sm font-medium text-primary">{a.title}</p>
            <p className="mt-0.5 line-clamp-2 text-xs text-secondary">{a.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
