import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { useAuth } from '@/shared/hooks/useAuth';
import { getApiError } from '@/shared/lib/getApiError';
import type { CompanyDirectoryMember, PaginatedResponse, StorageFileShare } from '@/shared/types';

interface UseFileShareOptions {
  onNeedRefresh: () => void;
  onRequestRevokeConfirm: (shareId: number) => void;
}

export function useFileShare({ onNeedRefresh, onRequestRevokeConfirm }: UseFileShareOptions) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [inlineShareFileId, setInlineShareFileId] = useState<number | null>(null);
  const [shareSearch, setShareSearch] = useState('');
  const [shareError, setShareError] = useState<string | null>(null);

  const openShare = (fileId: number | null) => {
    setInlineShareFileId(fileId);
    setShareSearch('');
    setShareError(null);
  };

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

  const fileSharesQuery = useQuery({
    queryKey: ['storage', 'shares', 'file', inlineShareFileId],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<StorageFileShare>>(
        API.storage.fileShares(String(inlineShareFileId)),
      );
      return data;
    },
    enabled: inlineShareFileId !== null,
  });

  const createShareMutation = useMutation({
    mutationFn: async ({ fileId, userId }: { fileId: number; userId: number }) => {
      await apiClient.post(API.storage.shares, {
        file_id: fileId,
        shared_with_user_id: userId,
        permission: 'download',
      });
    },
    onSuccess: () => {
      setShareError(null);
      if (inlineShareFileId !== null) {
        queryClient.invalidateQueries({ queryKey: ['storage', 'shares', 'file', inlineShareFileId] });
      }
      onNeedRefresh();
    },
    onError: (error) => {
      const message = getApiError(error).message;
      const isDuplicate = /уникальн/i.test(message) || /unique/i.test(message);
      setShareError(isDuplicate ? t('files.duplicateShare') : message);
    },
  });

  const revokeShareMutation = useMutation({
    mutationFn: async (shareId: number) => {
      await apiClient.delete(API.storage.share(String(shareId)));
    },
    onSuccess: () => { onNeedRefresh(); },
  });

  const companyMembers = companyMembersQuery.data?.results ?? [];
  const recipientOptions = companyMembers.filter((m) => m.id !== user?.id);

  const filteredShareMembers = useMemo<CompanyDirectoryMember[]>(() => {
    const q = shareSearch.trim().toLowerCase();
    if (!q) return recipientOptions;
    return recipientOptions.filter(
      (m) => m.full_name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q),
    );
  }, [recipientOptions, shareSearch]);

  const fileShares = fileSharesQuery.data?.results ?? [];

  return {
    inlineShareFileId,
    openShare,
    shareSearch,
    setShareSearch,
    shareError,
    setShareError,
    filteredShareMembers,
    fileShares,
    isLoadingShares: fileSharesQuery.isLoading,
    createShareMutation,
    revokeShareMutation,
    onRequestRevokeConfirm,
  };
}

export type UseFileShareReturn = ReturnType<typeof useFileShare>;
