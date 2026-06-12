import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { useAuth } from '@/shared/hooks/useAuth';
import { getApiError } from '@/shared/lib/getApiError';
import type {
  CompanyDirectoryMember,
  FolderPermission,
  FolderPermissionLevel,
  PaginatedResponse,
} from '@/shared/types';

interface UseFolderPermissionsOptions {
  onNeedRefresh: () => void;
}

export function useFolderPermissions({ onNeedRefresh }: UseFolderPermissionsOptions) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [openPermFolderId, setOpenPermFolderId] = useState<number | null>(null);
  const [permError, setPermError] = useState<string | null>(null);
  const [permSearch, setPermSearch] = useState('');

  const openPanel = (folderId: number | null) => {
    setOpenPermFolderId(folderId);
    setPermError(null);
    setPermSearch('');
  };

  const folderPermissionsQuery = useQuery({
    queryKey: ['storage', 'folder-permissions', openPermFolderId],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<FolderPermission> | FolderPermission[]>(
        API.storage.folderPermissions(String(openPermFolderId)),
      );
      // Handle both plain array and paginated response formats
      if (Array.isArray(data)) {
        return { count: data.length, results: data, next: null, previous: null } as PaginatedResponse<FolderPermission>;
      }
      return data;
    },
    enabled: openPermFolderId !== null,
  });

  const companyMembersQuery = useQuery({
    queryKey: ['company-directory', user?.company_id],
    queryFn: async () => {
      if (!user?.company_id) return null;
      const { data } = await apiClient.get<PaginatedResponse<CompanyDirectoryMember>>(
        API.companies.directory(String(user.company_id)),
        { params: { page_size: 200, ordering: 'full_name' } },
      );
      return data;
    },
    enabled: Boolean(user?.company_id),
  });

  const addPermissionMutation = useMutation({
    mutationFn: async ({
      folderId,
      userId,
      permission,
    }: {
      folderId: number;
      userId: number;
      permission: FolderPermissionLevel;
    }) => {
      await apiClient.post(API.storage.folderPermissions(String(folderId)), {
        user_id: userId,
        permission,
      });
    },
    onSuccess: () => {
      setPermError(null);
      if (openPermFolderId !== null) {
        queryClient.invalidateQueries({ queryKey: ['storage', 'folder-permissions', openPermFolderId] });
      }
      onNeedRefresh();
    },
    onError: (error) => {
      const message = getApiError(error).message;
      const isDuplicate = /уникальн/i.test(message) || /unique/i.test(message) || /already/i.test(message);
      setPermError(isDuplicate ? t('files.duplicateFolderPerm') : message);
    },
  });

  const updatePermissionMutation = useMutation({
    mutationFn: async ({
      permId,
      permission,
    }: {
      permId: number;
      permission: FolderPermissionLevel;
    }) => {
      await apiClient.patch(API.storage.folderPermission(String(permId)), { permission });
    },
    onSuccess: () => {
      if (openPermFolderId !== null) {
        queryClient.invalidateQueries({ queryKey: ['storage', 'folder-permissions', openPermFolderId] });
      }
      onNeedRefresh();
    },
    onError: (error) => {
      setPermError(getApiError(error).message);
    },
  });

  const removePermissionMutation = useMutation({
    mutationFn: async (permId: number) => {
      await apiClient.delete(API.storage.folderPermission(String(permId)));
    },
    onSuccess: () => {
      if (openPermFolderId !== null) {
        queryClient.invalidateQueries({ queryKey: ['storage', 'folder-permissions', openPermFolderId] });
      }
      onNeedRefresh();
    },
    onError: (error) => {
      setPermError(getApiError(error).message);
    },
  });

  const folderPermissions = folderPermissionsQuery.data?.results ?? [];
  const companyMembers = companyMembersQuery.data?.results ?? [];

  const grantableMembers = useMemo<CompanyDirectoryMember[]>(() => {
    const alreadyGranted = new Set(folderPermissions.map((p) => p.user));
    return companyMembers.filter((m) => m.id !== user?.id && !alreadyGranted.has(m.id));
  }, [companyMembers, folderPermissions, user?.id]);

  const filteredPermMembers = useMemo<CompanyDirectoryMember[]>(() => {
    const q = permSearch.trim().toLowerCase();
    if (!q) return grantableMembers;
    return grantableMembers.filter(
      (m) => m.full_name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q),
    );
  }, [grantableMembers, permSearch]);

  return {
    openPermFolderId,
    openPanel,
    folderPermissions,
    isLoadingPermissions: folderPermissionsQuery.isLoading,
    permError,
    setPermError,
    permSearch,
    setPermSearch,
    filteredPermMembers,
    addPermissionMutation,
    updatePermissionMutation,
    removePermissionMutation,
  };
}

export type UseFolderPermissionsReturn = ReturnType<typeof useFolderPermissions>;
