import { useNavigate } from 'react-router';
import { Bell } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { cn } from '@/shared/lib/cn';
import type { Notification, PaginatedResponse } from '@/shared/types';

export default function NotificationListPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () =>
      apiClient.get<PaginatedResponse<Notification>>(API.notifications.list).then(r => r.data),
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

  const rows = data?.results ?? [];
  const hasUnread = rows.some(n => !n.is_read);

  function handleNotificationClick(n: Notification) {
    if (!n.is_read) {
      markReadMutation.mutate(n.id);
    }
    if (n.url) {
      navigate(n.url);
    }
  }

  return (
    <main className="px-4 py-8 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
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
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') handleNotificationClick(n); }}
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
                <p className="text-sm text-gray-600 mt-0.5">{n.body}</p>
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
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
