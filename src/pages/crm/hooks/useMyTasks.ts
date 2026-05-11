import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { API } from '@/shared/api/endpoints';
import { apiClient } from '@/shared/api/client';
import type { CrmTask, PaginatedResponse } from '@/shared/types';
import { useDebounce } from '@/pages/crm/hooks/useDebounce';

export interface MyTaskFilters {
  search: string;
  priority: string;
  deadline: string;
  ordering: string;
}

const PAGE_SIZE = 20;

export function useMyTasks() {
  const [filters, setFilters] = useState<MyTaskFilters>({
    search: '',
    priority: '',
    deadline: '',
    ordering: '-created_at',
  });
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(filters.search, 300);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters.priority, filters.deadline, filters.ordering]);

  const params: Record<string, string | number> = {
    page,
    page_size: PAGE_SIZE,
    ordering: filters.ordering,
  };
  if (debouncedSearch) params.search = debouncedSearch;
  if (filters.priority) params.priority = filters.priority;
  if (filters.deadline) params.deadline = filters.deadline;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['crm', 'my-tasks', params],
    queryFn: async () => {
      const { data: res } = await apiClient.get<PaginatedResponse<CrmTask>>(API.crm.myTasks, { params });
      return res;
    },
  });

  const tasks = data?.results ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const hasActiveFilters =
    filters.search !== '' ||
    filters.priority !== '' ||
    filters.deadline !== '' ||
    filters.ordering !== '-created_at';

  const handleReset = () => {
    setFilters({ search: '', priority: '', deadline: '', ordering: '-created_at' });
    setPage(1);
    searchInputRef.current?.focus();
  };

  return {
    filters,
    setFilters,
    page,
    setPage,
    debouncedSearch,
    searchInputRef,
    tasks,
    totalCount,
    totalPages,
    isLoading,
    isError,
    hasActiveFilters,
    handleReset,
  };
}
