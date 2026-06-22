import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import type { Notification, PaginatedResponse } from '@/shared/types';

export type UnreadFilter = 'all' | 'unread';

const PAGE_SIZE = 10;
const INCREMENT = 8;

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function groupByDate(
  items: Notification[],
  groupToday: string,
  groupYesterday: string,
  groupEarlier: string,
): [string, Notification[]][] {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  const todayItems: Notification[] = [];
  const yesterdayItems: Notification[] = [];
  const earlierItems: Notification[] = [];

  for (const n of items) {
    const d = new Date(n.created_at);
    if (isSameDay(d, now)) {
      todayItems.push(n);
    } else if (isSameDay(d, yesterday)) {
      yesterdayItems.push(n);
    } else {
      earlierItems.push(n);
    }
  }

  const result: [string, Notification[]][] = [];
  if (todayItems.length) result.push([groupToday, todayItems]);
  if (yesterdayItems.length) result.push([groupYesterday, yesterdayItems]);
  if (earlierItems.length) result.push([groupEarlier, earlierItems]);
  return result;
}

export function useNotifications() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [unreadFilter, setUnreadFilter] = useState<UnreadFilter>('all');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [showCount, setShowCount] = useState<number>(PAGE_SIZE);

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

  const markUnreadMutation = useMutation({
    mutationFn: (id: number) =>
      apiClient.post(`/notifications/${id}/unread/`),
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
  const unreadCount = useMemo(() => rows.filter(n => !n.is_read).length, [rows]);
  const hasUnread = unreadCount > 0;

  const visibleRows = useMemo(() => rows.slice(0, showCount), [rows, showCount]);
  const hasMore = showCount < rows.length;

  const groups = useMemo(
    () =>
      groupByDate(
        visibleRows,
        t('notifications.groupToday'),
        t('notifications.groupYesterday'),
        t('notifications.groupEarlier'),
      ),
    [visibleRows, t],
  );

  function handleNotificationClick(n: Notification) {
    if (!n.is_read) {
      markReadMutation.mutate(n.id);
    } else {
      markUnreadMutation.mutate(n.id);
    }
    if (n.link) {
      navigate(n.link);
    }
  }

  function handleDelete(e: React.MouseEvent, id: number) {
    e.stopPropagation();
    deleteMutation.mutate(id);
  }

  function resetFilters() {
    setUnreadFilter('all');
    setTypeFilter('');
  }

  function loadMore() {
    setShowCount(prev => prev + INCREMENT);
  }

  return {
    rows,
    visibleRows,
    isLoading,
    hasUnread,
    unreadCount,
    unreadFilter,
    setUnreadFilter,
    typeFilter,
    setTypeFilter,
    groups,
    hasMore,
    handleNotificationClick,
    handleDelete,
    resetFilters,
    loadMore,
    showCount,
    markAllReadMutation,
    deleteMutation,
  };
}
