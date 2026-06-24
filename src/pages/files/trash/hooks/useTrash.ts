import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { useAuth } from '@/shared/hooks/useAuth';
import { USER_ROLES } from '@/shared/config/constants';
import type { PaginatedResponse, TrashItem } from '@/shared/types';
import type { StorageScope } from '@/pages/files/types';

export type TrashScopeFilter = StorageScope | 'all';

export function useTrash() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [scopeFilter, setScopeFilter] = useState<TrashScopeFilter>('all');
  const [confirmPermDelete, setConfirmPermDelete] = useState<TrashItem | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

  const isGuest = user?.role === USER_ROLES.GUEST;

  // When filter is "all" we fetch personal scope and then also company,
  // but simpler approach: fetch without scope filter (omit param) for "all",
  // or fetch specific scope when selected.
  const apiScope: StorageScope | undefined =
    scopeFilter === 'all' ? undefined : scopeFilter;

  const trashQuery = useQuery({
    queryKey: ['storage', 'trash', scopeFilter],
    queryFn: () =>
      apiClient
        .get<PaginatedResponse<TrashItem>>(API.storage.trash, {
          params: apiScope ? { scope: apiScope } : undefined,
        })
        .then((r) => r.data),
  });

  const refreshTrash = () => {
    queryClient.invalidateQueries({ queryKey: ['storage', 'trash'] });
    queryClient.invalidateQueries({ queryKey: ['storage', 'usage'] });
  };

  const removeFromTrashCache = (itemId: number) => {
    queryClient.setQueryData<PaginatedResponse<TrashItem>>(
      ['storage', 'trash', scopeFilter],
      (prev) =>
        prev
          ? { ...prev, count: prev.count - 1, results: prev.results.filter((i) => i.id !== itemId) }
          : prev,
    );
    queryClient.invalidateQueries({ queryKey: ['storage', 'usage'] });
  };

  const restoreMutation = useMutation({
    mutationFn: async (item: TrashItem) => {
      const url =
        item.item_type === 'file'
          ? API.storage.fileRestore(String(item.id))
          : API.storage.folderRestore(String(item.id));
      await apiClient.post(url);
    },
    onSuccess: (_, item) => {
      removeFromTrashCache(item.id);
      queryClient.invalidateQueries({ queryKey: ['storage', 'trash'] });
      queryClient.invalidateQueries({ queryKey: ['storage', 'folders'] });
      queryClient.invalidateQueries({ queryKey: ['storage', 'files-root'] });
    },
  });

  const permDeleteMutation = useMutation({
    mutationFn: async (item: TrashItem) => {
      const url =
        item.item_type === 'file'
          ? API.storage.filePermDelete(String(item.id))
          : API.storage.folderPermDelete(String(item.id));
      await apiClient.delete(url);
    },
    onSuccess: (_, item) => {
      setConfirmPermDelete(null);
      removeFromTrashCache(item.id);
      queryClient.invalidateQueries({ queryKey: ['storage', 'trash'] });
    },
  });

  const handleConfirmPermDelete = () => {
    if (!confirmPermDelete) return;
    permDeleteMutation.mutate(confirmPermDelete);
  };

  const emptyTrashMutation = useMutation({
    mutationFn: () =>
      apiClient.delete(API.storage.trash, {
        params: apiScope ? { scope: apiScope } : undefined,
      }),
    onSuccess: () => {
      setConfirmDeleteAll(false);
      queryClient.setQueryData<PaginatedResponse<TrashItem>>(
        ['storage', 'trash', scopeFilter],
        () => ({ count: 0, results: [], next: null, previous: null }),
      );
      queryClient.invalidateQueries({ queryKey: ['storage', 'usage'] });
    },
  });

  const items = useMemo(
    () => trashQuery.data?.results ?? [],
    [trashQuery.data],
  );

  const isLoading = trashQuery.isLoading;
  const isError = trashQuery.isError;

  return {
    t,
    scopeFilter,
    setScopeFilter,
    isGuest,
    items,
    isLoading,
    isError,
    confirmPermDelete,
    setConfirmPermDelete,
    handleConfirmPermDelete,
    isRestorePending: restoreMutation.isPending,
    isPermDeletePending: permDeleteMutation.isPending,
    restore: restoreMutation.mutate,
    confirmDeleteAll,
    setConfirmDeleteAll,
    isEmptyTrashPending: emptyTrashMutation.isPending,
    handleConfirmDeleteAll: () => emptyTrashMutation.mutate(),
    refreshTrash,
  };
}
