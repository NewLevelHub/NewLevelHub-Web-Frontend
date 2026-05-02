import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Bell, Trash2 } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { cn } from '@/shared/lib/cn';
import type { Notification, PaginatedResponse } from '@/shared/types';

const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
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
  announcement: 'Объявление',
  invitation: 'Приглашение',
  leave_review: 'Проверка отпуска',
  leave_approved: 'Отпуск одобрен',
  leave_rejected: 'Отпуск отклонён',
  system: 'Системное',
};

type UnreadFilter = 'all' | 'unread';

export default function NotificationListPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [unreadFilter, setUnreadFilter] = useState<UnreadFilter>('all');
  const [typeFilter, setTypeFilter] = useState<string>('');

  const queryParams: Record<string, string> = {};
  if (unreadFilter === 'unread') queryParams['is_read'] = 'false';
  if (typeFilter) queryParams['notification_type'] = typeFilter;

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', unreadFilter, typeFilter],
    queryFn: () =>
      apiClient
        .get<PaginatedResponse<Notification>>(API.notifications.list, { params: queryParams })
        .then(r => r.data),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: number) => apiClient.post(API.notifications.markRead(String(id))),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
      await queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => apiClient.post(API.notifications.markAllRead),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
      await queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(API.notifications.delete(String(id))),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
      await queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  const rows = data?.results ?? [];
  const hasUnread = rows.some(n => !n.is_read);

  function handleNotificationClick(n: Notification) {
    if (!n.is_read) {
      markReadMutation.mutate(n.id);
    }
    if (n.link) {
      navigate(n.link);
    }
  }

  function handleDelete(e: React.MouseEvent, id: number) {
    e.stopPropagation();
    deleteMutation.mutate(id);
  }

  return (
    <main className="px-3 py-4 sm:px-4 sm:py-6 md:py-8 max-w-2xl mx-auto space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Уведомления</h1>
        {hasUnread && (
          <button
            type="button"
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
            className="text-sm text-blue-600 hover:underline disabled:opacity-50"
          >
            Прочитать все
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex w-full sm:w-auto rounded-lg border border-gray-200 overflow-hidden text-sm">
          <button
            type="button"
            onClick={() => setUnreadFilter('all')}
            className={cn(
              'px-3 py-1.5 transition-colors',
              unreadFilter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50',
            )}
          >
            Все
          </button>
          <button
            type="button"
            onClick={() => setUnreadFilter('unread')}
            className={cn(
              'px-3 py-1.5 border-l border-gray-200 transition-colors',
              unreadFilter === 'unread'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50',
            )}
          >
            Непрочитанные
          </button>
        </div>

        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="w-full sm:w-auto text-sm rounded-lg border border-gray-200 px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Фильтр по типу"
        >
          <option value="">Все типы</option>
          {Object.entries(NOTIFICATION_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500">Загрузка…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-500">Нет уведомлений</p>
      ) : (
        <ul className="space-y-2">
          {rows.map(n => (
            <li
              key={n.id}
              onClick={() => handleNotificationClick(n)}
              role="button"
              tabIndex={0}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') handleNotificationClick(n);
              }}
              className={cn(
                'flex items-start gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-colors',
                n.is_read
                  ? 'bg-white border-gray-100 hover:bg-gray-50'
                  : 'bg-blue-50 border-blue-100 hover:bg-blue-100',
              )}
            >
              {n.notification_type === 'booking_reminder' && (
                <Bell size={16} className="mt-0.5 shrink-0 text-blue-500" aria-hidden="true" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-gray-900">{n.title}</p>
                <p className="text-sm text-gray-600 mt-0.5">{n.message ?? n.body}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(n.created_at).toLocaleString()}
                </p>
              </div>
              {!n.is_read && (
                <span
                  className="mt-1 shrink-0 w-2 h-2 rounded-full bg-blue-500"
                  aria-label="Непрочитанное"
                />
              )}
              <button
                type="button"
                onClick={e => handleDelete(e, n.id)}
                disabled={deleteMutation.isPending}
                className="shrink-0 mt-0.5 p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                aria-label="Удалить уведомление"
              >
                <Trash2 size={15} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
