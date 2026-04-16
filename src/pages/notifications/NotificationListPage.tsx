import { useNavigate } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Check, CheckCheck } from 'lucide-react';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { cn } from '@/shared/lib/cn';
import type { Notification } from '@/shared/types';

interface NotificationsResponse {
  results: Notification[];
  count: number;
  next: string | null;
  previous: string | null;
}

export default function NotificationListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data } = await apiClient.get<NotificationsResponse>(API.notifications.list, {
        params: { page_size: 50 },
      });
      return data;
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.post(API.notifications.markRead(String(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post(API.notifications.markAllRead);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markReadMutation.mutate(notification.id);
    }
    if (notification.url) {
      navigate(notification.url);
    }
  };

  const notifications = data?.results ?? [];
  const hasUnread = notifications.some((n) => !n.is_read);

  if (isLoading) {
    return (
      <main className="px-4 py-8 max-w-2xl mx-auto">
        <p className="text-sm text-gray-500">Загрузка…</p>
      </main>
    );
  }

  if (isError) {
    return (
      <main className="px-4 py-8 max-w-2xl mx-auto">
        <p className="text-sm text-red-600">Не удалось загрузить уведомления.</p>
      </main>
    );
  }

  return (
    <main className="px-4 py-8 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Уведомления</h1>
        {hasUnread && (
          <button
            type="button"
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
          >
            <CheckCheck className="h-4 w-4" />
            Прочитать все
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
          <Bell className="h-10 w-10" />
          <p className="text-sm">Уведомлений нет</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {notifications.map((n) => (
            <li
              key={n.id}
              className={cn(
                'rounded-xl border bg-white p-4 shadow-sm',
                n.is_read ? 'border-gray-100' : 'border-blue-200 bg-blue-50/40',
                n.url && 'cursor-pointer hover:bg-gray-50',
              )}
              onClick={() => handleNotificationClick(n)}
              role={n.url ? 'button' : undefined}
              tabIndex={n.url ? 0 : undefined}
              onKeyDown={
                n.url
                  ? (e) => {
                      if (e.key === 'Enter') handleNotificationClick(n);
                    }
                  : undefined
              }
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      'text-sm font-medium text-gray-900',
                      !n.is_read && 'font-semibold',
                    )}
                  >
                    {n.title}
                  </p>
                  {n.body && (
                    <p className="mt-0.5 text-sm text-gray-600">{n.body}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-400">
                    {new Date(n.created_at).toLocaleString('ru-RU')}
                  </p>
                </div>
                {!n.is_read && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      markReadMutation.mutate(n.id);
                    }}
                    className="shrink-0 rounded-full p-1 text-blue-500 hover:bg-blue-100"
                    title="Отметить прочитанным"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
