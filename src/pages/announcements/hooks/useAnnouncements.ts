import { useCallback, useMemo, useRef, useState } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { USER_ROLES } from '@/shared/config/constants';
import { useUser } from '@/shared/hooks/useAuth';
import { getApiError } from '@/shared/lib/getApiError';
import type { Announcement, CursorPaginatedResponse } from '@/shared/types';

import {
  buildListUrl,
  type CategoryFilter,
  type ScopeFilter,
} from '@/pages/announcements/utils/announcementUtils';

export function useAnnouncements() {
  const queryClient = useQueryClient();
  const user = useUser();

  const [category, setCategory] = useState<CategoryFilter>('all');
  const [scope, setScope] = useState<ScopeFilter>('all');

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['announcements', { category, scope }],
    queryFn: ({ pageParam }: { pageParam: string | null }) => {
      const url = buildListUrl(pageParam, category, scope);
      return apiClient
        .get<CursorPaginatedResponse<Announcement>>(url)
        .then((r) => r.data);
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next ?? null,
  });

  const visibleItems = useMemo(
    () => data?.pages.flatMap((page) => page.results) ?? [],
    [data],
  );

  const sentinelCallbackRef = useCallback(
    (node: HTMLDivElement | null) => {
      sentinelRef.current = node;
      if (!node) return;
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting) && hasNextPage && !isFetchingNextPage) {
            void fetchNextPage();
          }
        },
        { rootMargin: '200px' },
      );
      observer.observe(node);
      return () => observer.disconnect();
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage],
  );

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(API.announcements.detail(String(id))),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['announcements'] });
      await queryClient.invalidateQueries({ queryKey: ['announcements-widget'] });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: (id: number) =>
      apiClient.post<Announcement>(API.announcements.markRead(String(id))),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['announcements'] });
      await queryClient.invalidateQueries({ queryKey: ['announcements-widget'] });
    },
  });

  const readAllMutation = useMutation({
    mutationFn: () => apiClient.post(API.announcements.readAll),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['announcements'] });
      await queryClient.invalidateQueries({ queryKey: ['announcements-widget'] });
    },
  });

  const handleMarkRead = useCallback(
    (a: Announcement) => {
      if (!a.is_read) {
        markReadMutation.mutate(a.id);
      }
    },
    [markReadMutation],
  );

  const deleteError = deleteMutation.error
    ? getApiError(deleteMutation.error).message
    : null;

  const canDelete = useCallback(
    (a: Announcement) => {
      if (!user) return false;
      if (user.role === USER_ROLES.SUPERADMIN) return true;
      return a.author === user.id;
    },
    [user],
  );

  return {
    category,
    setCategory,
    scope,
    setScope,
    visibleItems,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    sentinelCallbackRef,
    deleteMutation,
    markReadMutation,
    readAllMutation,
    handleMarkRead,
    deleteError,
    canDelete,
  };
}
