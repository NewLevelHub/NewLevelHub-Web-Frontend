import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { API } from '@/shared/api/endpoints';
import { apiClient } from '@/shared/api/client';
import { useAuth } from '@/shared/hooks/useAuth';
import { USER_ROLES } from '@/shared/config/constants';
import type { CrmBoard } from '@/shared/types';

export function useBoardList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [boardToArchive, setBoardToArchive] = useState<CrmBoard | null>(null);
  const [boardToUnarchive, setBoardToUnarchive] = useState<CrmBoard | null>(null);
  const [unarchiveError, setUnarchiveError] = useState<string | null>(null);

  const canManage =
    user?.role === USER_ROLES.COMPANY_ADMIN || user?.role === USER_ROLES.SUPERADMIN;

  const { data: boards, isLoading, isError } = useQuery({
    queryKey: ['crm', 'boards', showArchived],
    queryFn: async () => {
      const url = showArchived ? `${API.crm.boards}?include_archived=true` : API.crm.boards;
      const { data } = await apiClient.get<CrmBoard[] | { results: CrmBoard[] }>(url);
      return Array.isArray(data) ? data : data.results;
    },
  });

  const visibleBoards = useMemo(() => {
    if (!boards?.length) return [];
    return showArchived ? boards.filter((b) => b.is_archived) : boards.filter((b) => !b.is_archived);
  }, [boards, showArchived]);

  const archiveMutation = useMutation({
    mutationFn: async (boardId: number) => {
      const { data } = await apiClient.post(API.crm.boardArchive(String(boardId)));
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['crm', 'boards'] });
      void queryClient.invalidateQueries({ queryKey: ['analytics', 'company-dashboard'] });
      setBoardToArchive(null);
    },
  });

  const unarchiveMutation = useMutation({
    mutationFn: async (boardId: number) => {
      const { data } = await apiClient.post<CrmBoard>(API.crm.boardUnarchive(String(boardId)));
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['crm', 'boards'] });
      void queryClient.invalidateQueries({ queryKey: ['analytics', 'company-dashboard'] });
      setBoardToUnarchive(null);
      setUnarchiveError(null);
    },
    onError: (error: unknown) => {
      const axiosError = error as {
        response?: { status?: number; data?: { detail?: string; non_field_errors?: string[] } };
      };
      if (axiosError.response?.status === 400) {
        const responseData = axiosError.response.data;
        const message =
          responseData?.detail ??
          responseData?.non_field_errors?.[0] ??
          'Невозможно разархивировать: достигнут лимит досок для вашего тарифа';
        setUnarchiveError(message);
      }
    },
  });

  const handleBoardClick = (board: CrmBoard) => {
    void navigate(`/crm/boards/${board.id}`);
  };

  const handleOpenUnarchive = (board: CrmBoard) => {
    setUnarchiveError(null);
    setBoardToUnarchive(board);
  };

  return {
    user,
    canManage,
    boards,
    visibleBoards,
    isLoading,
    isError,
    showArchived,
    setShowArchived,
    showCreateModal,
    setShowCreateModal,
    boardToArchive,
    setBoardToArchive,
    boardToUnarchive,
    setBoardToUnarchive,
    unarchiveError,
    setUnarchiveError,
    archiveMutation,
    unarchiveMutation,
    handleBoardClick,
    handleOpenUnarchive,
  };
}
