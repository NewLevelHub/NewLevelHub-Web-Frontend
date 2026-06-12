import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { useAuth } from '@/shared/hooks/useAuth';
import { USER_ROLES } from '@/shared/config/constants';
import type { PaginatedResponse, TrashItem } from '@/shared/types';
import type { StorageScope } from '@/pages/files/types';

export function useTrash() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [scope, setScope] = useState<StorageScope>('personal');
  const [confirmPermDelete, setConfirmPermDelete] = useState<TrashItem | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

  const isGuest = user?.role === USER_ROLES.GUEST;

  const trashQuery = useQuery({
    queryKey: ['storage', 'trash', scope],
    queryFn: () =>
      apiClient
        .get<PaginatedResponse<TrashItem>>(API.storage.trash, { params: { scope } })
        .then((r) => r.data),
  });

  const refreshTrash = () => {
    queryClient.invalidateQueries({ queryKey: ['storage', 'trash', scope] });
    queryClient.invalidateQueries({ queryKey: ['storage', 'folders', scope, 'root'] });
    queryClient.invalidateQueries({ queryKey: ['storage', 'files-root', scope] });
    queryClient.invalidateQueries({ queryKey: ['storage', 'usage'] });
  };

  const removeFromTrashCache = (itemId: number) => {
    queryClient.setQueryData<PaginatedResponse<TrashItem>>(
      ['storage', 'trash', scope],
      (prev) => prev
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
      // File/folder lists will refetch automatically when user navigates to FileBrowserPage
      queryClient.invalidateQueries({ queryKey: ['storage', 'folders', scope, 'root'] });
      queryClient.invalidateQueries({ queryKey: ['storage', 'files-root', scope] });
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
    },
  });

  const handleConfirmPermDelete = () => {
    if (!confirmPermDelete) return;
    permDeleteMutation.mutate(confirmPermDelete);
  };

  const emptyTrashMutation = useMutation({
    mutationFn: () => apiClient.delete(API.storage.trash, { params: { scope } }),
    onSuccess: () => {
      setConfirmDeleteAll(false);
      queryClient.setQueryData<PaginatedResponse<TrashItem>>(
        ['storage', 'trash', scope],
        () => ({ count: 0, results: [], next: null, previous: null }),
      );
      queryClient.invalidateQueries({ queryKey: ['storage', 'usage'] });
    },
  });

  const items = trashQuery.data?.results ?? [];
  const isLoading = trashQuery.isLoading;
  const isError = trashQuery.isError;

  return {
    t,
    scope,
    setScope,
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
  };
}
