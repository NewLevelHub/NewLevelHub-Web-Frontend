import { memo } from 'react';
import { Bell, Trash2 } from 'lucide-react';

import { cn } from '@/shared/lib/cn';
import type { Notification } from '@/shared/types';
import { NotificationBadge } from '@/pages/notifications/components/NotificationBadge';

export const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  booking_confirmed: 'Бронь подтверждена',
  booking_reminder: 'Напоминание о брони',
  booking_cancelled: 'Бронь отменена',
  task_assigned: 'Задача назначена',
  task_moved: 'Задача перемещена',
  task_comment: 'Комментарий к задаче',
  task_deadline: 'Дедлайн задачи',
  task_deadline_overdue: 'Просрочен дедлайн',
  guest_validated: 'Гость подтверждён',
  guest_pass_expiring: 'Пропуск истекает',
  service_request_update: 'Обновление заявки',
  announcement: 'Новое объявление',
  announcement_building: 'Объявление для здания',
  announcement_company: 'Объявление компании',
  invitation: 'Приглашение',
  leave_review: 'Проверка отпуска',
  leave_approved: 'Отпуск одобрен',
  leave_rejected: 'Отпуск отклонён',
  system: 'Системное',
};

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
            ? 'bg-white border-gray-100 hover:bg-gray-50'
            : 'bg-blue-50 border-blue-100 hover:bg-blue-100',
        )}
      >
        {notificationType(n) === 'booking_reminder' && (
          <Bell size={16} className="mt-0.5 shrink-0 text-blue-500" aria-hidden="true" />
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-gray-900">{n.title}</p>
          <p className="text-sm text-gray-600 mt-0.5 whitespace-pre-line">{n.message ?? n.body}</p>
          <p className="text-xs text-gray-400 mt-1">
            {new Date(n.created_at).toLocaleString()}
          </p>
        </div>
        {!n.is_read && <NotificationBadge />}
        <button
          type="button"
          onClick={e => onDelete(e, n.id)}
          disabled={isDeleting}
          className="shrink-0 mt-0.5 p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
          aria-label="Удалить уведомление"
        >
          <Trash2 size={15} aria-hidden="true" />
        </button>
      </li>
    );
  },
);

NotificationItem.displayName = 'NotificationItem';
