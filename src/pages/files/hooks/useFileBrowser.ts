import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Lock, Users } from 'lucide-react';
import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { useAuth } from '@/shared/hooks/useAuth';
import { getApiError } from '@/shared/lib/getApiError';
import { downloadFromApiEndpoint } from '@/shared/lib/resolveDownloadUrl';
import { USER_ROLES } from '@/shared/config/constants';
import type {
  PaginatedResponse,
  StorageFile,
  StorageFolder,
  StorageFolderDetail,
  StorageFileShare,
  StorageUsage,
} from '@/shared/types';
import type { CategoryFilter, FileBrowserConfirmAction, RenameTarget, StorageScope } from '@/pages/files/types';
import { buildGaugePaths, getFileCategoryFromContentType, getFileExt, MAX_UPLOAD_BYTES } from '@/pages/files/utils/fileBrowserUtils';
import { useFileShare } from '@/pages/files/hooks/useFileShare';
import { useFolderPermissions } from '@/pages/files/hooks/useFolderPermissions';

const CATEGORY_TO_BACKEND: Record<Exclude<CategoryFilter, 'all'>, string> = {
  docs:  'document',
  img:   'image',
  arch:  'archive',
  media: 'media',
  other: 'other',
};

export function useFileBrowser() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // ── UI state ──
  const [scope, setScope] = useState<StorageScope>('personal');
  const [trail, setTrail] = useState<StorageFolder[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [selectedFileIds, setSelectedFileIds] = useState<Set<number>>(new Set());
  const [openMenuId, setOpenMenuId] = useState<{ kind: 'file' | 'folder'; id: number } | null>(null);

  // ── Modals ──
  const [confirmAction, setConfirmAction] = useState<FileBrowserConfirmAction | null>(null);
  const [renameTarget, setRenameTarget] = useState<RenameTarget | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [moveTarget, setMoveTarget] = useState<StorageFile | null>(null);

  // ── Sort & category filter ──
  const [sortField, setSortField] = useState<'name' | 'file_size' | 'created_at' | 'type'>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const ordering = sortField === 'type' ? '-created_at' : (sortDir === 'asc' ? sortField : `-${sortField}`);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const fileCategoryParam = categoryFilter !== 'all' ? CATEGORY_TO_BACKEND[categoryFilter] : undefined;

  // ── Upload feedback ──
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!uploadSuccess) return;
    const timer = setTimeout(() => setUploadSuccess(null), 4000);
    return () => clearTimeout(timer);
  }, [uploadSuccess]);

  const currentFolder = trail.length > 0 ? trail[trail.length - 1] : null;
  const normalizedSearchTerm = searchTerm.trim();
  const isSearching = normalizedSearchTerm.length > 0;

  // ── Refresh helper ──
  const refreshStorageData = () => {
    queryClient.invalidateQueries({ queryKey: ['storage', 'folders', scope, 'root'] });
    queryClient.invalidateQueries({ queryKey: ['storage', 'files-root', scope] });
    queryClient.invalidateQueries({ queryKey: ['storage', 'all-files', scope] });
    queryClient.invalidateQueries({ queryKey: ['storage', 'files-search'] });
    queryClient.invalidateQueries({ queryKey: ['storage', 'usage'] });
    queryClient.invalidateQueries({ queryKey: ['storage', 'shares', 'shared-with-me'] });
    if (shareState.inlineShareFileId !== null) {
      queryClient.invalidateQueries({ queryKey: ['storage', 'shares', 'file', shareState.inlineShareFileId] });
    }
    if (currentFolder) {
      queryClient.invalidateQueries({ queryKey: ['storage', 'folder', currentFolder.id] });
    }
    if (user?.company_id) {
      queryClient.invalidateQueries({ queryKey: ['company-limits', String(user.company_id)] });
      queryClient.invalidateQueries({ queryKey: ['company', String(user.company_id)] });
    }
  };

  // ── Sharing sub-hook ──
  const shareState = useFileShare({
    onNeedRefresh: refreshStorageData,
    onRequestRevokeConfirm: (shareId) => setConfirmAction({ type: 'revoke-share', shareId }),
  });

  // ── Folder permissions sub-hook ──
  const folderPermState = useFolderPermissions({ onNeedRefresh: refreshStorageData });

  // ── Queries ──
  const rootFoldersQuery = useQuery({
    queryKey: ['storage', 'folders', scope, 'root'],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<StorageFolder>>(API.storage.folders, {
        params: { scope, parent_id: 'null' },
      });
      return data;
    },
    enabled: currentFolder === null,
  });

  const folderDetailQuery = useQuery({
    queryKey: ['storage', 'folder', currentFolder?.id],
    queryFn: async () => {
      const { data } = await apiClient.get<StorageFolderDetail>(
        API.storage.folder(String(currentFolder?.id)),
      );
      return data;
    },
    enabled: currentFolder !== null,
  });

  const searchedFilesQuery = useQuery({
    queryKey: ['storage', 'files-search', normalizedSearchTerm, scope, sortField, sortDir, categoryFilter],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<StorageFile>>(API.storage.files, {
        params: { search: normalizedSearchTerm, scope, ordering, page_size: 100, ...(fileCategoryParam ? { file_category: fileCategoryParam } : {}) },
      });
      return data;
    },
    enabled: isSearching,
  });

  const rootFilesQuery = useQuery({
    queryKey: ['storage', 'files-root', scope, sortField, sortDir, categoryFilter],
    queryFn: async () => {
      const catParam = fileCategoryParam ? { file_category: fileCategoryParam } : {};
      try {
        const { data } = await apiClient.get<PaginatedResponse<StorageFile>>(API.storage.files, {
          params: { folder_id: 'null', scope, page_size: 100, ordering, ...catParam },
        });
        return data;
      } catch {
        const { data } = await apiClient.get<PaginatedResponse<StorageFile>>(API.storage.files, {
          params: { scope, page_size: 100, ordering, ...catParam },
        });
        return { ...data, results: (data.results ?? []).filter((f) => f.folder === null) };
      }
    },
    enabled: currentFolder === null && !isSearching,
  });

  const storageUsageQuery = useQuery({
    queryKey: ['storage', 'usage'],
    queryFn: async () => {
      const { data } = await apiClient.get<StorageUsage>(API.storage.usage);
      return data;
    },
  });

  const sharedWithMeQuery = useQuery({
    queryKey: ['storage', 'shares', 'shared-with-me'],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<StorageFileShare>>(API.storage.shares, {
        params: { shared_with_me: true, page_size: 200 },
      });
      return data;
    },
  });

  // ── Mutations ──
  const createFolderMutation = useMutation({
    mutationFn: async ({ name }: { name: string }) => {
      await apiClient.post(API.storage.folders, {
        name,
        parent_id: currentFolder?.id ?? null,
        is_company_shared: scope === 'company',
      });
    },
    onSuccess: () => { refreshStorageData(); },
  });

  const renameFolderMutation = useMutation({
    mutationFn: async ({ folderId, name }: { folderId: number; name: string }) => {
      await apiClient.patch(API.storage.folder(String(folderId)), { name });
    },
    onSuccess: () => { refreshStorageData(); },
  });

  const deleteFolderMutation = useMutation({
    mutationFn: async (folderId: number) => {
      await apiClient.delete(API.storage.folder(String(folderId)));
    },
    onSuccess: (_, folderId) => {
      // Invalidate trash so the Trash page shows the newly deleted folder immediately.
      queryClient.invalidateQueries({ queryKey: ['storage', 'trash'] });
      if (currentFolder?.id === folderId) setTrail([]);
      else refreshStorageData();
    },
  });

  const uploadFileMutation = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append('name', file.name);
      form.append('file', file);
      if (currentFolder) {
        form.append('folder_id', String(currentFolder.id));
      } else {
        form.append('is_company_shared', scope === 'company' ? 'true' : 'false');
      }
      const { data } = await apiClient.post<StorageFile>(API.storage.files, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: (createdFile) => {
      setUploadError(null);
      setUploadSuccess(t('files.uploadSuccess', { name: createdFile.name }));
      if (currentFolder === null && createdFile.folder === null) {
        queryClient.setQueryData<PaginatedResponse<StorageFile>>(
          ['storage', 'files-root', scope],
          (prev) => {
            if (!prev) return { count: 1, next: null, previous: null, results: [createdFile] };
            if (prev.results.some((item) => item.id === createdFile.id)) return prev;
            return { ...prev, count: prev.count + 1, results: [createdFile, ...prev.results] };
          },
        );
      }
      refreshStorageData();
    },
    onError: (error) => {
      setUploadSuccess(null);
      setUploadError(getApiError(error).message);
    },
  });

  const renameFileMutation = useMutation({
    mutationFn: async ({ fileId, name }: { fileId: number; name: string }) => {
      await apiClient.patch(API.storage.file(String(fileId)), { name });
    },
    onSuccess: () => { refreshStorageData(); },
  });

  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: number) => {
      await apiClient.delete(API.storage.file(String(fileId)));
    },
    onSuccess: (_, fileId) => {
      if (currentFolder) {
        queryClient.setQueryData<StorageFolderDetail>(
          ['storage', 'folder', currentFolder.id],
          (prev) => prev ? { ...prev, files: prev.files.filter((f) => f.id !== fileId) } : prev,
        );
      } else {
        queryClient.setQueryData<PaginatedResponse<StorageFile>>(
          ['storage', 'files-root', scope, sortField, sortDir, categoryFilter],
          (prev) => prev ? { ...prev, count: prev.count - 1, results: prev.results.filter((f) => f.id !== fileId) } : prev,
        );
      }
      if (isSearching) {
        queryClient.setQueryData<PaginatedResponse<StorageFile>>(
          ['storage', 'files-search', normalizedSearchTerm, scope, sortField, sortDir, categoryFilter],
          (prev) => prev ? { ...prev, count: prev.count - 1, results: prev.results.filter((f) => f.id !== fileId) } : prev,
        );
      }
      // Refetch usage so trash_bytes and breakdown update; used_bytes stays the same (file is in trash).
      queryClient.invalidateQueries({ queryKey: ['storage', 'usage'] });
      // Invalidate trash cache so the Trash page shows the newly deleted file immediately.
      queryClient.invalidateQueries({ queryKey: ['storage', 'trash'] });
    },
  });

  const downloadFileMutation = useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) => {
      await downloadFromApiEndpoint(API.storage.fileDownload(String(id)), { filename: name });
    },
  });

  const moveFileMutation = useMutation({
    mutationFn: ({ fileId, folderId }: { fileId: number; folderId: number | null }) =>
      apiClient.post(API.storage.fileMove(String(fileId)), { folder_id: folderId }).then((r) => r.data),

    onMutate: async ({ fileId }) => {
      const rootKey = ['storage', 'files-root', scope, sortField, sortDir, categoryFilter] as const;
      const folderKey = currentFolder ? (['storage', 'folder', currentFolder.id] as const) : null;

      await queryClient.cancelQueries({ queryKey: rootKey });
      if (folderKey) await queryClient.cancelQueries({ queryKey: folderKey });

      const prevRoot = queryClient.getQueryData(rootKey);
      const prevFolder = folderKey ? queryClient.getQueryData(folderKey) : undefined;

      if (folderKey) {
        queryClient.setQueryData<StorageFolderDetail>(folderKey, (old) =>
          old ? { ...old, files: old.files.filter((f) => f.id !== fileId) } : old,
        );
      } else {
        queryClient.setQueryData<PaginatedResponse<StorageFile>>(rootKey, (old) =>
          old ? { ...old, count: old.count - 1, results: old.results.filter((f) => f.id !== fileId) } : old,
        );
      }

      return { prevRoot, prevFolder, rootKey, folderKey };
    },

    onError: (_err, _vars, ctx) => {
      if (!ctx) return;
      if (ctx.prevRoot !== undefined) queryClient.setQueryData(ctx.rootKey, ctx.prevRoot);
      if (ctx.folderKey && ctx.prevFolder !== undefined) queryClient.setQueryData(ctx.folderKey, ctx.prevFolder);
    },

    onSuccess: () => {
      setMoveTarget(null);
      refreshStorageData();
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await apiClient.post(API.storage.filesBulkDelete, { ids });
    },
    onSuccess: (_, ids) => {
      const idSet = new Set(ids);
      if (currentFolder) {
        queryClient.setQueryData<StorageFolderDetail>(
          ['storage', 'folder', currentFolder.id],
          (prev) => prev ? { ...prev, files: prev.files.filter((f) => !idSet.has(f.id)) } : prev,
        );
      } else {
        queryClient.setQueryData<PaginatedResponse<StorageFile>>(
          ['storage', 'files-root', scope, sortField, sortDir, categoryFilter],
          (prev) => prev ? { ...prev, count: prev.count - ids.length, results: prev.results.filter((f) => !idSet.has(f.id)) } : prev,
        );
      }
      setSelectedFileIds(new Set());
      // Refetch usage so trash_bytes and breakdown update; used_bytes stays the same (files are in trash).
      queryClient.invalidateQueries({ queryKey: ['storage', 'usage'] });
      // Invalidate trash cache so the Trash page shows the newly deleted files immediately.
      queryClient.invalidateQueries({ queryKey: ['storage', 'trash'] });
    },
  });

  // ── Derived data ──
  const folders = useMemo<StorageFolder[]>(() => {
    if (currentFolder) return folderDetailQuery.data?.folders ?? [];
    return rootFoldersQuery.data?.results ?? [];
  }, [currentFolder, folderDetailQuery.data?.folders, rootFoldersQuery.data?.results]);

  const sortedFiles = useMemo<StorageFile[]>(() => {
    let result: StorageFile[];
    if (isSearching) result = searchedFilesQuery.data?.results ?? [];
    else if (!currentFolder) result = rootFilesQuery.data?.results ?? [];
    else result = folderDetailQuery.data?.files ?? [];

    const needsClientSort = currentFolder !== null || sortField === 'type';
    if (needsClientSort) {
      const getSortVal = (f: StorageFile): string | number => {
        if (sortField === 'file_size') return f.file_size ?? 0;
        if (sortField === 'name') return f.name;
        if (sortField === 'type') return getFileExt(f.name);
        return f.created_at;
      };
      result = [...result].sort((a, b) => {
        const av = getSortVal(a);
        const bv = getSortVal(b);
        const cmp = typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' });
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }

    if (scope === 'personal' && user?.id !== undefined) {
      result = result.filter((f) => f.owner === user.id);
    }
    return result;
  }, [currentFolder, folderDetailQuery.data?.files, isSearching, rootFilesQuery.data?.results, searchedFilesQuery.data?.results, scope, user?.id, sortField, sortDir]);

  const files = useMemo<StorageFile[]>(() => {
    if (categoryFilter === 'all') return sortedFiles;
    // Folder detail: server doesn't filter embedded files — apply client-side
    if (currentFolder !== null && !isSearching) {
      return sortedFiles.filter((f) => getFileCategoryFromContentType(f.content_type) === categoryFilter);
    }
    // Root and search: server already applied file_category param
    return sortedFiles;
  }, [sortedFiles, categoryFilter, currentFolder, isSearching]);

  const sharedWithMe = sharedWithMeQuery.data?.results ?? [];

  const isLoading = rootFoldersQuery.isLoading || folderDetailQuery.isLoading || rootFilesQuery.isLoading;
  const isError = rootFoldersQuery.isError || folderDetailQuery.isError || rootFilesQuery.isError;
  const isGuest = user?.role === USER_ROLES.GUEST;
  const isAdmin = user?.role === USER_ROLES.COMPANY_ADMIN || user?.role === USER_ROLES.SUPERADMIN;

  // Derived from the user_permission annotation already present on the folder object.
  // The /permissions/ endpoint is admin-only — employees must not call it.
  const hasFullFolderAccess =
    !isAdmin && scope === 'company' && currentFolder?.user_permission === 'full';

  // True when any folder in the current navigation path has view-only access —
  // applies to the current folder and all its ancestors via the trail.
  const isCurrentLocationViewOnly = useMemo(
    () => scope === 'company' && !isAdmin && trail.some((f) => f.user_permission === 'view'),
    [scope, isAdmin, trail],
  );

  const canManageFile = (file: StorageFile) =>
    scope === 'personal' || file.owner === user?.id || isAdmin || hasFullFolderAccess;
  const canManageFolder = (folder: StorageFolder) => scope === 'personal' || folder.owner === user?.id || isAdmin;

  const totalFilesCount = currentFolder === null && !isSearching
    ? (rootFilesQuery.data?.count ?? sortedFiles.length)
    : sortedFiles.length;

  // ── Storage panel numbers ──
  const usageData = storageUsageQuery.data;
  const usedBytes = (usageData?.personal?.used_bytes ?? 0) + (usageData?.company?.used_bytes ?? 0);
  const limitBytes = usageData?.company?.limit_bytes ?? usageData?.personal?.limit_bytes ?? 0;
  const fileCount = (usageData?.personal?.file_count ?? 0) + (usageData?.company?.file_count ?? 0);
  const gaugePct = limitBytes > 0 ? Math.max(0, Math.min(1, usedBytes / limitBytes)) : 0;
  const { arcUsed, arcAll } = buildGaugePaths(gaugePct);

  // Trash bytes come directly from the usage API — accurate regardless of page size.
  const trashPersonalBytes = usageData?.personal?.trash_bytes ?? 0;
  const trashCompanyBytes  = usageData?.company?.trash_bytes  ?? 0;

  // Breakdown bytes come from the usage API. Backend keys → frontend keys used by BREAKDOWN_ITEMS.
  const BACKEND_KEY_MAP: Record<string, string> = {
    document: 'docs', image: 'img', archive: 'arch', media: 'media', other: 'other',
  };
  const scopeBreakdown = scope === 'personal'
    ? usageData?.personal?.breakdown
    : usageData?.company?.breakdown;
  const bytesCats = useMemo(() => {
    if (!scopeBreakdown) return { docs: 0, img: 0, media: 0, arch: 0, other: 0 };
    return Object.fromEntries(
      Object.entries(scopeBreakdown).map(([k, v]) => [BACKEND_KEY_MAP[k] ?? k, v]),
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeBreakdown]);

  const personalBytes = usageData?.personal?.used_bytes ?? 0;
  const companyBytes  = usageData?.company?.used_bytes  ?? 0;

  // ── Source cards ──
  const sourceCards = useMemo(() => [
    {
      id: 'personal' as StorageScope,
      name: t('files.personalStorage'),
      sub: t('files.personalStorageSub'),
      Icon: Lock,
      used: usageData?.personal?.used_bytes ?? 0,
      limit: usageData?.personal?.limit_bytes ?? 0,
    },
    ...(!isGuest ? [{
      id: 'company' as StorageScope,
      name: t('files.companyStorage'),
      sub: t('files.sharedStorageSub'),
      Icon: Users,
      used: usageData?.company?.used_bytes ?? 0,
      limit: usageData?.company?.limit_bytes ?? 0,
    }] : []),
  ], [t, isGuest, usageData]);

  // ── Sort handler ──
  const handleSortChange = (field: 'name' | 'file_size' | 'created_at' | 'type') => {
    if (field === sortField) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  // ── Navigation ──
  const openFolder = (folder: StorageFolder) => setTrail((prev) => [...prev, folder]);
  const goToTrailIndex = (idx: number) => setTrail((prev) => prev.slice(0, idx + 1));
  const resetToRoot = () => setTrail([]);

  // ── Selection ──
  const toggleFileSelection = (id: number) => {
    setSelectedFileIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedFileIds.size === files.length && files.length > 0) {
      setSelectedFileIds(new Set());
    } else {
      setSelectedFileIds(new Set(files.map((f) => f.id)));
    }
  };

  // ── Upload handler ──
  const handleAutoUpload = (file: File) => {
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadError(t('files.fileSizeExceeded'));
      return;
    }
    setUploadError(null);
    setUploadSuccess(null);
    uploadFileMutation.mutate(file);
  };

  // ── Modal confirm handlers ──
  const handleConfirmAction = () => {
    if (!confirmAction) return;
    if (confirmAction.type === 'delete-folder') {
      deleteFolderMutation.mutate(confirmAction.folder.id, { onSettled: () => setConfirmAction(null) });
    } else if (confirmAction.type === 'delete-file') {
      deleteFileMutation.mutate(confirmAction.file.id, { onSettled: () => setConfirmAction(null) });
    } else {
      shareState.revokeShareMutation.mutate(confirmAction.shareId, { onSettled: () => setConfirmAction(null) });
    }
  };

  const handleConfirmRename = (raw: string) => {
    if (!renameTarget) return;
    const nextName = raw.trim();
    if (renameTarget.kind === 'folder') {
      const { folder } = renameTarget;
      if (!nextName || nextName === folder.name) { setRenameTarget(null); return; }
      renameFolderMutation.mutate({ folderId: folder.id, name: nextName }, { onSettled: () => setRenameTarget(null) });
    } else {
      const { file } = renameTarget;
      if (!nextName || nextName === file.name) { setRenameTarget(null); return; }
      renameFileMutation.mutate({ fileId: file.id, name: nextName }, { onSettled: () => setRenameTarget(null) });
    }
  };

  const handleCreateFolder = (raw: string) => {
    const name = raw.trim();
    if (!name) { setShowNewFolderModal(false); return; }
    createFolderMutation.mutate({ name }, { onSettled: () => setShowNewFolderModal(false) });
  };

  const handleBulkDelete = () => {
    bulkDeleteMutation.mutate([...selectedFileIds], { onSettled: () => setConfirmBulkDelete(false) });
  };

  const handleDownload = (id: number, name: string) => {
    downloadFileMutation.mutate({ id, name });
  };

  const handleMoveFile = (file: StorageFile) => setMoveTarget(file);
  const handleCancelMove = () => setMoveTarget(null);
  const handleConfirmMove = (folderId: number | null) => {
    if (!moveTarget) return;
    moveFileMutation.mutate({ fileId: moveTarget.id, folderId });
  };

  return {
    // i18n
    lang: i18n.language,
    // auth / roles
    user,
    isGuest,
    isAdmin,
    // scope & navigation
    scope,
    setScope,
    trail,
    currentFolder,
    openFolder,
    goToTrailIndex,
    resetToRoot,
    // search
    searchTerm,
    setSearchTerm,
    showSearch,
    setShowSearch,
    isSearching,
    normalizedSearchTerm,
    // menus / modals
    openMenuId,
    setOpenMenuId,
    showNewFolderModal,
    setShowNewFolderModal,
    confirmAction,
    setConfirmAction,
    renameTarget,
    setRenameTarget,
    confirmBulkDelete,
    setConfirmBulkDelete,
    // selection
    selectedFileIds,
    setSelectedFileIds,
    toggleFileSelection,
    toggleSelectAll,
    // upload
    uploadInputRef,
    uploadError,
    uploadSuccess,
    setUploadError,
    setUploadSuccess,
    handleAutoUpload,
    isUploadPending: uploadFileMutation.isPending,
    // data
    folders,
    files,
    sharedWithMe,
    isLoading,
    isError,
    totalFilesCount,
    canManageFile,
    canManageFolder,
    isCurrentLocationViewOnly,
    sourceCards,
    // storage panel
    usedBytes,
    limitBytes,
    fileCount,
    gaugePct,
    arcUsed,
    arcAll,
    bytesCats,
    trashPersonalBytes,
    trashCompanyBytes,
    personalBytes,
    companyBytes,
    // pending states
    isDeletePending: deleteFolderMutation.isPending || deleteFileMutation.isPending || shareState.revokeShareMutation.isPending,
    isRenamePending: renameFolderMutation.isPending || renameFileMutation.isPending,
    isCreateFolderPending: createFolderMutation.isPending,
    isBulkDeletePending: bulkDeleteMutation.isPending,
    // modal handlers
    handleConfirmAction,
    handleConfirmRename,
    handleCreateFolder,
    handleBulkDelete,
    handleDownload,
    // move
    moveTarget,
    handleMoveFile,
    handleCancelMove,
    handleConfirmMove,
    isMovePending: moveFileMutation.isPending,
    // shared-with-me query state
    sharedWithMeLoading: sharedWithMeQuery.isLoading,
    sharedWithMeError: sharedWithMeQuery.isError,
    // rename targets for modals
    renameFolderMutation,
    renameFileMutation,
    // sort & category filter
    sortField,
    sortDir,
    handleSortChange,
    categoryFilter,
    setCategoryFilter,
    // sharing
    shareState,
    // folder permissions
    folderPermState,
  };
}

export type UseFileBrowserReturn = ReturnType<typeof useFileBrowser>;
