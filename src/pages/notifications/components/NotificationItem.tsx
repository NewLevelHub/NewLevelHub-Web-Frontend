import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Notification } from '@/shared/types';
import { NotifIcon, NOTIF_TYPE_CONFIG } from '@/pages/notifications/components/NotificationTypeIcon';

function getNotifType(n: Notification): string {
  return n.type ?? n.notification_type ?? '';
}

function formatRelTime(dateStr: string, t: ReturnType<typeof useTranslation>['t']): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return t('common.timeJustNow');
  if (minutes < 60) return t('common.timeMinutesAgo', { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('common.timeHoursAgo', { count: hours });
  const days = Math.floor(hours / 24);
  if (days < 7) return t('common.timeDaysAgo', { count: days });
  return new Date(dateStr).toLocaleDateString();
}

interface NotificationItemProps {
  notification: Notification;
  onDelete: (e: React.MouseEvent, id: number) => void;
  onClick: (n: Notification) => void;
  isDeleting: boolean;
  compact?: boolean;
}

export const NotificationItem = memo<NotificationItemProps>(
  ({ notification: n, onDelete, onClick, compact = false }) => {
    const { t } = useTranslation();
    const [hovered, setHovered] = useState(false);
    const [removing, setRemoving] = useState(false);

    const type = getNotifType(n);
    const cfg = NOTIF_TYPE_CONFIG[type] ?? { color: 'var(--text-muted)' };
    const relTime = formatRelTime(n.created_at, t);

    const padding = compact ? '10px 16px' : '14px 20px';
    const iconSize = compact ? 14 : 16;
    const titleFontSize = compact ? 12 : 13;
    const titleFontWeight = n.is_read ? 400 : 600;
    const dotLeft = compact ? 4 : 6;

    function handleDelete(e: React.MouseEvent) {
      e.stopPropagation();
      setRemoving(true);
      // Let the fade-out animation play before calling the real delete
      setTimeout(() => {
        onDelete(e, n.id);
      }, 250);
    }

    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => onClick(n)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') onClick(n);
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'flex-start',
          padding,
          borderBottom: '1px solid var(--border-faint)',
          background: n.is_read ? 'transparent' : 'var(--bg-hover)',
          transition: 'background 0.15s, opacity 0.25s',
          position: 'relative',
          cursor: 'pointer',
          opacity: removing ? 0 : 1,
        }}
      >
        {/* Unread dot */}
        {!n.is_read && (
          <div
            style={{
              position: 'absolute',
              left: dotLeft,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: 'var(--brand)',
              flexShrink: 0,
            }}
            aria-hidden="true"
          />
        )}

        {/* Type icon */}
        <NotifIcon type={type} size={iconSize} />

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: titleFontSize,
              fontWeight: titleFontWeight,
              color: 'var(--text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {n.title}
          </div>
          <div
            style={{
              fontSize: 12,
              color: 'var(--text-muted)',
              marginTop: 2,
              display: '-webkit-box',
              WebkitLineClamp: compact ? 1 : 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {n.message ?? n.body}
          </div>

          {/* Type chip + time row — only in full (non-compact) variant */}
          {!compact && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }}>
              {type && (
                <span
                  style={{
                    fontSize: 10,
                    padding: '1px 6px',
                    borderRadius: 3,
                    background: cfg.color + '18',
                    color: cfg.color,
                  }}
                >
                  {t(`notifications.types.${type}`, { defaultValue: type })}
                </span>
              )}
              <span style={{ fontSize: 11, color: 'var(--text-subtle)' }}>{relTime}</span>
            </div>
          )}
        </div>

        {/* Right column */}
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <span style={{ fontSize: 10, color: 'var(--text-subtle)', whiteSpace: 'nowrap' }}>
            {relTime}
          </span>
          {hovered && (
            <div style={{ display: 'flex', gap: 2 }}>
              {/* Mark read / unread toggle */}
              <button
                type="button"
                title={n.is_read ? t('notifications.markUnread') : t('notifications.markRead')}
                aria-label={n.is_read ? t('notifications.markUnread') : t('notifications.markRead')}
                onClick={e => {
                  e.stopPropagation();
                  onClick(n);
                }}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 5,
                  border: 'none',
                  background: 'var(--bg-raised)',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                {n.is_read ? (
                  /* Circle (mark unread) */
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="5.5" cy="5.5" r="4.5" />
                  </svg>
                ) : (
                  /* Checkmark (mark read) */
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <polyline points="2,6 4.5,8.5 9,3" />
                  </svg>
                )}
              </button>

              {/* Delete */}
              <button
                type="button"
                title={t('notifications.deleteNotif')}
                aria-label={t('notifications.deleteNotif')}
                onClick={handleDelete}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 5,
                  border: 'none',
                  background: 'var(--bg-raised)',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'background 0.12s, color 0.12s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(185,28,28,0.08)';
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--danger)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-raised)';
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
                }}
              >
                {/* Trash icon */}
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <polyline points="2,3 9,3" />
                  <path d="M4,3V2a1,1,0,0,1,1-1h1a1,1,0,0,1,1,1v1" />
                  <path d="M3,3l.5,6.5a.5.5,0,0,0,.5.5h3a.5.5,0,0,0,.5-.5L8,3" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  },
);

NotificationItem.displayName = 'NotificationItem';
