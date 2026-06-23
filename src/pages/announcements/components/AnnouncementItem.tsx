import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle, Eye, Mail, Pin, Trash2 } from 'lucide-react';

import { ANNOUNCEMENT_CATEGORY_LABEL_KEYS, USER_ROLES } from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';
import { fmtDateTime } from '@/shared/lib/formatDate';
import type { Announcement } from '@/shared/types';

const CAT_CONFIG: Record<
  string,
  { bg: string; color: string; emoji: string }
> = {
  info: {
    bg: 'var(--bg-hover)',
    color: 'var(--info)',
    emoji: 'ℹ️',
  },
  important: {
    bg: 'rgba(185,28,28,0.08)',
    color: 'var(--danger)',
    emoji: '⚠️',
  },
  event: {
    bg: 'var(--bg-active)',
    color: 'var(--brand)',
    emoji: '🎉',
  },
};

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
  const { t } = useTranslation();
  const isBuilding = a.scope === 'building' || a.company_id === null;
  const isAuthor =
    currentUserId !== undefined &&
    (isSuperadmin || a.author === currentUserId);
  const cat = CAT_CONFIG[a.category] ?? CAT_CONFIG.info;

  return (
    <li
      className={cn(
        'rounded-xl border border-default bg-surface px-4 py-4 shadow-sm',
      )}
      style={{
        borderLeft: a.is_pinned
          ? '3px solid var(--brand)'
          : !a.is_read
            ? '3px solid var(--info)'
            : 'none',
        opacity: a.is_read ? 0.82 : 1,
        transition: 'opacity 0.2s',
      }}
    >
      <div className="flex items-start gap-3">
        {/* Category icon avatar */}
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 9,
            flexShrink: 0,
            background: isBuilding ? 'var(--brand-subtle)' : 'var(--bg-raised)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
          }}
          aria-hidden="true"
        >
          {cat.emoji}
        </div>

        <div className="min-w-0 flex-1">
          {/* Meta row */}
          <div
            className="flex flex-wrap items-center gap-2"
            style={{ marginBottom: 6 }}
          >
            {/* Source badge */}
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: '2px 7px',
                borderRadius: 4,
                background: isBuilding ? 'var(--brand-subtle)' : 'var(--bg-raised)',
                color: isBuilding ? 'var(--brand-text)' : 'var(--text-muted)',
              }}
            >
              {isBuilding ? `🏢 ${t('announcements.filterBC')}` : `🏷 ${t('announcements.filterCompany')}`}
            </span>

            {/* Category badge */}
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                padding: '2px 7px',
                borderRadius: 4,
                background: cat.bg,
                color: cat.color,
              }}
            >
              {t(ANNOUNCEMENT_CATEGORY_LABEL_KEYS[a.category])}
            </span>

            {/* Pinned badge */}
            {a.is_pinned ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                  fontSize: 10,
                  color: 'var(--brand)',
                  fontWeight: 600,
                }}
              >
                <Pin size={10} aria-hidden="true" />
                {t('announcements.pinned')}
              </span>
            ) : null}

            {/* Email badge */}
            {a.notify_email ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                  fontSize: 10,
                  color: 'var(--info)',
                  fontWeight: 500,
                }}
              >
                <Mail size={10} aria-hidden="true" />
                {t('announcements.emailSent')}
              </span>
            ) : null}

            {/* Unread dot */}
            {!a.is_read ? (
              <span
                style={{
                  display: 'inline-block',
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'var(--info)',
                }}
                aria-label={t('announcements.unread')}
              />
            ) : null}

            {/* Time — pushed to right */}
            <span
              style={{
                marginLeft: 'auto',
                fontSize: 11,
                color: 'var(--text-muted)',
                whiteSpace: 'nowrap',
              }}
            >
              {fmtDateTime(a.created_at)}
            </span>
          </div>

          {/* Title */}
          <p
            style={{
              fontSize: 14,
              fontWeight: a.is_read ? 500 : 700,
              color: 'var(--text-primary)',
              marginBottom: 5,
              lineHeight: 1.3,
            }}
          >
            {a.title}
          </p>

          {/* Body */}
          <p
            className="whitespace-pre-line"
            style={{
              fontSize: 12,
              color: 'var(--text-secondary)',
              lineHeight: 1.65,
            }}
          >
            {a.text}
          </p>

          {/* Image */}
          {a.image ? (
            <img
              src={a.image}
              alt=""
              className="mt-2 max-h-80 w-full rounded-lg border border-default object-cover"
            />
          ) : null}

          {/* Actions row */}
          <div
            className="flex flex-wrap items-center gap-[10px]"
            style={{ marginTop: 10 }}
          >
            {/* Mark read / already read */}
            {!a.is_read ? (
              <button
                type="button"
                onClick={() => onMarkRead(a)}
                disabled={isMarkingRead}
                className="inline-flex items-center gap-1 text-xs font-medium disabled:opacity-40 transition-colors"
                style={{ color: 'var(--info)' }}
              >
                <CheckCircle size={12} aria-hidden="true" />
                {t('announcements.markRead')}
              </button>
            ) : (
              <span
                className="inline-flex items-center gap-1 text-xs"
                style={{ color: 'var(--text-muted)' }}
              >
                <CheckCircle size={12} aria-hidden="true" />
                {t('announcements.alreadyRead')}
              </span>
            )}

            {/* Delete */}
            {canDelete ? (
              <button
                type="button"
                onClick={() => onDelete(a.id)}
                disabled={isDeleting}
                className="inline-flex items-center gap-1 text-xs disabled:opacity-40 transition-colors"
                style={{ color: 'var(--danger)' }}
                aria-label={t('announcements.deleteAria')}
              >
                <Trash2 size={12} aria-hidden="true" />
                {t('common.delete')}
              </button>
            ) : null}

            {/* Read count */}
            {isAuthor ? (
              <span className="inline-flex items-center gap-1 text-xs text-muted">
                <Eye size={12} aria-hidden="true" />
                {a.read_count}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </li>
  );
});
