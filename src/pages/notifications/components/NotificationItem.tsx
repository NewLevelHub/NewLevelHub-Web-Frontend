import { memo } from 'react';
import { Bell, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/shared/lib/cn';
import { dateLocaleTag } from '@/shared/lib/localeFormat';
import type { Notification } from '@/shared/types';
import { NotificationBadge } from '@/pages/notifications/components/NotificationBadge';

function notificationType(n: Notification): string {
  return n.type ?? n.notification_type ?? '';
}

interface NotificationItemProps {
  notification: Notification;
  onDelete: (e: React.MouseEvent, id: number) => void;
  onClick: (n: Notification) => void;
  isDeleting: boolean;
}

export const NotificationItem = memo<NotificationItemProps>(
  ({ notification: n, onDelete, onClick, isDeleting }) => {
    const { t, i18n } = useTranslation();
    const locale = dateLocaleTag(i18n.language);

    return (
      <li
        onClick={() => onClick(n)}
        role="button"
        tabIndex={0}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') onClick(n);
        }}
        className={cn(
          'flex items-start gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-colors',
          n.is_read
            ? 'bg-surface border-default hover:bg-raised'
            : 'bg-blue-50 border-blue-100 hover:bg-blue-100',
        )}
      >
        {notificationType(n) === 'booking_reminder' && (
          <Bell size={16} className="mt-0.5 shrink-0 text-blue-500" aria-hidden="true" />
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-primary">{n.title}</p>
          <p className="text-sm text-muted mt-0.5 whitespace-pre-line">{n.message ?? n.body}</p>
          <p className="text-xs text-secondary mt-1">
            {new Date(n.created_at).toLocaleString(locale)}
          </p>
        </div>
        {!n.is_read && <NotificationBadge />}
        <button
          type="button"
          onClick={e => onDelete(e, n.id)}
          disabled={isDeleting}
          className="shrink-0 mt-0.5 p-1 rounded text-secondary hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
          aria-label={t('common.deleteNotification')}
        >
          <Trash2 size={15} aria-hidden="true" />
        </button>
      </li>
    );
  },
);

NotificationItem.displayName = 'NotificationItem';
