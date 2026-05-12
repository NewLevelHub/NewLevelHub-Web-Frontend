import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { API } from '@/shared/api/endpoints';
import { apiClient } from '@/shared/api/client';
import type { CrmTask, MyTaskGroup, MyTasksGroupedResponse, PaginatedResponse } from '@/shared/types';
import { useDebounce } from '@/pages/crm/hooks/useDebounce';

export interface MyTaskFilters {
  search: string;
  priority: string;
  deadline: string;
  ordering: string;
}

export function useMyTasks() {
  const [filters, setFilters] = useState<MyTaskFilters>({
    search: '',
    priority: '',
    deadline: '',
    ordering: '-created_at',
  });
  const debouncedSearch = useDebounce(filters.search, 300);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [extraTasksByBoard, setExtraTasksByBoard] = useState<Record<number, CrmTask[]>>({});
  const [loadingMoreBoard, setLoadingMoreBoard] = useState<number | null>(null);
  const [exhaustedBoards, setExhaustedBoards] = useState<Set<number>>(new Set());

  const params: Record<string, string> = {
    ordering: filters.ordering,
  };
  if (debouncedSearch) params.search = debouncedSearch;
  if (filters.priority) params.priority = filters.priority;
  if (filters.deadline) params.deadline = filters.deadline;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['crm', 'my-tasks', params],
    queryFn: async () => {
      const { data: res } = await apiClient.get<MyTasksGroupedResponse>(API.crm.myTasks, { params });
      return res;
    },
  });

  const groups: MyTaskGroup[] = (data?.groups ?? []).map((group) => ({
    ...group,
    tasks: [...group.tasks, ...(extraTasksByBoard[group.board_id] ?? [])],
  }));

  const hasActiveFilters =
    filters.search !== '' ||
    filters.priority !== '' ||
    filters.deadline !== '' ||
    filters.ordering !== '-created_at';

  const handleReset = () => {
    setFilters({ search: '', priority: '', deadline: '', ordering: '-created_at' });
    searchInputRef.current?.focus();
  };

  async function loadMoreForBoard(boardId: number, _boardName: string) {
    if (loadingMoreBoard !== null || exhaustedBoards.has(boardId)) return;
    setLoadingMoreBoard(boardId);
    try {
      const { data: res } = await apiClient.get<PaginatedResponse<CrmTask>>(API.crm.tasksList, {
        params: { board_id: boardId, page: 2, page_size: 50 },
      });
      setExtraTasksByBoard((prev) => ({
        ...prev,
        [boardId]: [...(prev[boardId] ?? []), ...res.results],
      }));
      if (!res.next) {
        setExhaustedBoards((prev) => new Set(prev).add(boardId));
      }
    } finally {
      setLoadingMoreBoard(null);
    }
  }

  return {
    filters,
    setFilters,
    debouncedSearch,
    searchInputRef,
    groups,
    isLoading,
    isError,
    hasActiveFilters,
    handleReset,
    loadMoreForBoard,
    loadingMoreBoard,
  };
}
