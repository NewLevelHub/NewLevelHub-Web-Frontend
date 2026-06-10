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
import type { FileBrowserConfirmAction, RenameTarget, StorageScope } from '../types';
import { buildGaugePaths, categorizeBytes, MAX_UPLOAD_BYTES } from '../utils/fileBrowserUtils';
import { useFileShare } from './useFileShare';

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
    queryKey: ['storage', 'files-search', normalizedSearchTerm, scope],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<StorageFile>>(API.storage.files, {
        params: { search: normalizedSearchTerm, scope, ordering: 'name', page_size: 100 },
      });
      return data;
    },
    enabled: isSearching,
  });

  const rootFilesQuery = useQuery({
    queryKey: ['storage', 'files-root', scope],
    queryFn: async () => {
      try {
        const { data } = await apiClient.get<PaginatedResponse<StorageFile>>(API.storage.files, {
          params: { folder_id: 'null', scope, page_size: 100, ordering: '-created_at' },
        });
        return data;
      } catch {
        const { data } = await apiClient.get<PaginatedResponse<StorageFile>>(API.storage.files, {
          params: { scope, page_size: 100, ordering: '-created_at' },
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

  const allScopeFilesQuery = useQuery({
    queryKey: ['storage', 'all-files', scope],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<StorageFile>>(API.storage.files, {
        params: { scope, page_size: 1000, ordering: '-created_at' },
      });
      return data;
    },
    enabled: currentFolder === null,
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
    onSuccess: () => { refreshStorageData(); },
  });

  const downloadFileMutation = useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) => {
      await downloadFromApiEndpoint(API.storage.fileDownload(String(id)), { filename: name });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await apiClient.post(API.storage.filesBulkDelete, { ids });
    },
    onSuccess: () => {
      setSelectedFileIds(new Set());
      refreshStorageData();
    },
  });

  // ── Derived data ──
  const folders = useMemo<StorageFolder[]>(() => {
    if (currentFolder) return folderDetailQuery.data?.folders ?? [];
    return rootFoldersQuery.data?.results ?? [];
  }, [currentFolder, folderDetailQuery.data?.folders, rootFoldersQuery.data?.results]);

  const files = useMemo<StorageFile[]>(() => {
    let result: StorageFile[];
    if (isSearching) result = searchedFilesQuery.data?.results ?? [];
    else if (!currentFolder) result = rootFilesQuery.data?.results ?? [];
    else result = folderDetailQuery.data?.files ?? [];
    if (scope === 'personal' && user?.id !== undefined) {
      result = result.filter((f) => f.owner === user.id);
    }
    return result;
  }, [currentFolder, folderDetailQuery.data?.files, isSearching, rootFilesQuery.data?.results, searchedFilesQuery.data?.results, scope, user?.id]);

  const sharedWithMe = sharedWithMeQuery.data?.results ?? [];

  const isLoading = rootFoldersQuery.isLoading || folderDetailQuery.isLoading || rootFilesQuery.isLoading;
  const isError = rootFoldersQuery.isError || folderDetailQuery.isError || rootFilesQuery.isError;
  const isGuest = user?.role === USER_ROLES.GUEST;
  const isAdmin = user?.role === USER_ROLES.COMPANY_ADMIN || user?.role === USER_ROLES.SUPERADMIN;

  const canManageFile = (file: StorageFile) => scope === 'personal' || file.owner === user?.id || isAdmin;
  const canManageFolder = (folder: StorageFolder) => scope === 'personal' || folder.owner === user?.id || isAdmin;

  const totalFilesCount = currentFolder === null && !isSearching
    ? (rootFilesQuery.data?.count ?? files.length)
    : files.length;

  // ── Storage panel numbers ──
  const usageData = storageUsageQuery.data;
  const usedBytes = (usageData?.personal?.used_bytes ?? 0) + (usageData?.company?.used_bytes ?? 0);
  const limitBytes = usageData?.company?.limit_bytes ?? usageData?.personal?.limit_bytes ?? 0;
  const fileCount = (usageData?.personal?.file_count ?? 0) + (usageData?.company?.file_count ?? 0);
  const gaugePct = limitBytes > 0 ? Math.max(0, Math.min(1, usedBytes / limitBytes)) : 0;
  const { arcUsed, arcAll } = buildGaugePaths(gaugePct);

  const breakdownFiles = useMemo<StorageFile[]>(() => {
    if (currentFolder !== null) return folderDetailQuery.data?.files ?? [];
    return allScopeFilesQuery.data?.results ?? [];
  }, [currentFolder, folderDetailQuery.data?.files, allScopeFilesQuery.data?.results]);

  const bytesCats = useMemo(() => categorizeBytes(breakdownFiles), [breakdownFiles]);
  const bytesTotal = Object.values(bytesCats).reduce((a, b) => a + b, 0);

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
    sourceCards,
    // storage panel
    usedBytes,
    limitBytes,
    fileCount,
    gaugePct,
    arcUsed,
    arcAll,
    bytesCats,
    bytesTotal,
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
    // shared-with-me query state
    sharedWithMeLoading: sharedWithMeQuery.isLoading,
    sharedWithMeError: sharedWithMeQuery.isError,
    // rename targets for modals
    renameFolderMutation,
    renameFileMutation,
    // sharing
    shareState,
  };
}

export type UseFileBrowserReturn = ReturnType<typeof useFileBrowser>;
