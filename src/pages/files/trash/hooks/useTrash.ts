import { useCallback, useMemo, useState } from 'react';
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
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [confirmBulkDeleteForever, setConfirmBulkDeleteForever] = useState(false);

  const isGuest = user?.role === USER_ROLES.GUEST;
  const isEmployee = user?.role === USER_ROLES.EMPLOYEE;

  // When filter is "all" we fetch personal scope and then also company,
  // but simpler approach: fetch without scope filter (omit param) for "all",
  // or fetch specific scope when selected.
  const apiScope: StorageScope | undefined =
    scopeFilter === 'all' ? undefined : scopeFilter;

  // Reset selection when tab changes
  const handleSetScopeFilter = useCallback((scope: TrashScopeFilter) => {
    setScopeFilter(scope);
    setSelectedIds(new Set());
  }, []);

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

  // ── Bulk selection helpers ───────────────────────────────────────────────
  const toggleSelectId = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  // ── Bulk restore ─────────────────────────────────────────────────────────
  const bulkRestoreMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const currentItems = trashQuery.data?.results ?? [];
      const file_ids = ids.filter((id) => currentItems.find((i) => i.id === id)?.item_type === 'file');
      const folder_ids = ids.filter((id) => currentItems.find((i) => i.id === id)?.item_type === 'folder');
      await apiClient.post(API.storage.trashBulkRestore, { file_ids, folder_ids });
    },
    onSuccess: () => {
      clearSelection();
      queryClient.invalidateQueries({ queryKey: ['storage', 'trash'] });
      queryClient.invalidateQueries({ queryKey: ['storage', 'folders'] });
      queryClient.invalidateQueries({ queryKey: ['storage', 'files-root'] });
      queryClient.invalidateQueries({ queryKey: ['storage', 'usage'] });
    },
  });

  // ── Bulk permanent delete ─────────────────────────────────────────────────
  const bulkPermDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const currentItems = trashQuery.data?.results ?? [];
      const file_ids = ids.filter((id) => currentItems.find((i) => i.id === id)?.item_type === 'file');
      const folder_ids = ids.filter((id) => currentItems.find((i) => i.id === id)?.item_type === 'folder');
      await apiClient.post(API.storage.trashBulkDelete, { file_ids, folder_ids });
    },
    onSuccess: () => {
      setConfirmBulkDeleteForever(false);
      clearSelection();
      queryClient.invalidateQueries({ queryKey: ['storage', 'trash'] });
      queryClient.invalidateQueries({ queryKey: ['storage', 'usage'] });
    },
  });

  // ── Items ─────────────────────────────────────────────────────────────────
  const items = useMemo(
    () => trashQuery.data?.results ?? [],
    [trashQuery.data],
  );

  // ── Total size (sum of file_size across all trash items) ──────────────────
  const totalSize = useMemo(
    () => items.reduce((acc, item) => acc + (item.file_size ?? 0), 0),
    [items],
  );

  const isLoading = trashQuery.isLoading;
  const isError = trashQuery.isError;

  const allVisibleIds = useMemo(() => items.map((i) => i.id), [items]);
  const isAllSelected = allVisibleIds.length > 0 && allVisibleIds.every((id) => selectedIds.has(id));
  const isIndeterminate = !isAllSelected && allVisibleIds.some((id) => selectedIds.has(id));

  const toggleSelectAll = useCallback(() => {
    if (isAllSelected) {
      clearSelection();
    } else {
      setSelectedIds(new Set(allVisibleIds));
    }
  }, [isAllSelected, allVisibleIds, clearSelection]);

  return {
    t,
    scopeFilter,
    setScopeFilter: handleSetScopeFilter,
    isGuest,
    isEmployee,
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
    // bulk selection
    selectedIds,
    toggleSelectId,
    clearSelection,
    isAllSelected,
    isIndeterminate,
    toggleSelectAll,
    // bulk actions
    confirmBulkDeleteForever,
    setConfirmBulkDeleteForever,
    isBulkRestorePending: bulkRestoreMutation.isPending,
    isBulkPermDeletePending: bulkPermDeleteMutation.isPending,
    handleBulkRestore: () => bulkRestoreMutation.mutate([...selectedIds]),
    handleBulkPermDelete: () => bulkPermDeleteMutation.mutate([...selectedIds]),
    // size
    totalSize,
  };
}
