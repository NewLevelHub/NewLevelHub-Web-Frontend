import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import type { Notification, PaginatedResponse } from '@/shared/types';

export type UnreadFilter = 'all' | 'unread';

export function useNotifications() {
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

  return {
    rows,
    isLoading,
    hasUnread,
    unreadFilter,
    setUnreadFilter,
    typeFilter,
    setTypeFilter,
    handleNotificationClick,
    handleDelete,
    markAllReadMutation,
    deleteMutation,
  };
}
