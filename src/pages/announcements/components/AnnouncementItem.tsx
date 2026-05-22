import { memo } from 'react';
import { Building2, Eye, Pin, Trash2 } from 'lucide-react';

import { USER_ROLES } from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';
import type { Announcement } from '@/shared/types';

import { AnnouncementCategoryBadge } from '@/pages/announcements/components/AnnouncementCategoryBadge';

interface AnnouncementItemProps {
  announcement: Announcement;
  canDelete: boolean;
  onMarkRead: (a: Announcement) => void;
  onDelete: (id: number) => void;
  isMarkingRead: boolean;
  isDeleting: boolean;
  currentUserId?: number;
  isSuperadmin: boolean;
}

export const AnnouncementItem = memo<AnnouncementItemProps>(function AnnouncementItem({
  announcement: a,
  canDelete,
  onMarkRead,
  onDelete,
  isMarkingRead,
  isDeleting,
  currentUserId,
  isSuperadmin,
}) {
  const isBuilding = a.scope === 'building' || a.company_id === null;
  const isAuthor =
    currentUserId !== undefined &&
    (isSuperadmin || a.author === currentUserId);

  return (
    <li
      className={cn(
        'rounded-xl border bg-surface px-4 py-4 shadow-sm transition-colors',
        a.is_pinned ? 'border-blue-200 dark:border-default/50' : 'border-default',
        !a.is_read && 'ring-1 ring-blue-500/30',
      )}
    >
      <div className="flex items-start gap-3">
        <AnnouncementCategoryBadge category={a.category} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {a.is_pinned ? (
              <Pin size={14} aria-hidden="true" className="text-brand" />
            ) : null}
            {!a.is_read ? (
              <span
                className="inline-block h-2 w-2 shrink-0 rounded-full bg-indigo-400"
                aria-label="Непрочитано"
              />
            ) : null}
            <h2 className={cn('font-semibold', a.is_read ? 'text-secondary' : 'text-white')}>
              {a.title}
            </h2>
            {isBuilding ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-default px-2 py-0.5 text-xs text-secondary">
                <Building2 size={12} aria-hidden="true" />
                БЦ
              </span>
            ) : null}
          </div>
          <p className="mt-2 whitespace-pre-line text-sm text-secondary">{a.text}</p>
          {a.image ? (
            <img
              src={a.image}
              alt=""
              className="mt-3 max-h-80 w-full rounded-lg border border-default object-cover"
            />
          ) : null}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted">
              {a.author_name ? `${a.author_name} · ` : ''}
              {new Date(a.created_at).toLocaleString('ru-RU')}
            </p>
            <div className="flex items-center gap-3">
              {isAuthor ? (
                <span className="inline-flex items-center gap-1 text-xs text-muted">
                  <Eye size={12} aria-hidden="true" />
                  {a.read_count}
                </span>
              ) : null}
              {!a.is_read ? (
                <button
                  type="button"
                  onClick={() => onMarkRead(a)}
                  disabled={isMarkingRead}
                  className="text-xs text-brand hover:text-brand disabled:opacity-40"
                >
                  Отметить прочитанным
                </button>
              ) : (
                <span className="text-xs text-muted">Прочитано</span>
              )}
            </div>
          </div>
        </div>
        {canDelete ? (
          <button
            type="button"
            onClick={() => onDelete(a.id)}
            disabled={isDeleting}
            className="shrink-0 rounded p-1 text-secondary hover:bg-danger-subtle hover:text-danger disabled:opacity-40"
            aria-label="Удалить объявление"
          >
            <Trash2 size={16} aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </li>
  );
});
