import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { type PassStatus } from '@/shared/config/constants';
import type { GuestPass, PaginatedResponse } from '@/shared/types';
import { useDebounce } from '@/pages/crm/hooks/useDebounce';

const PAGE_SIZE = 20;
const TEXT_FILTER_DEBOUNCE_MS = 400;

export function usePasses() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilterRaw] = useState<PassStatus | ''>('');
  const [companyNameFilter, setCompanyNameFilterRaw] = useState('');
  const [createdByEmailFilter, setCreatedByEmailFilterRaw] = useState('');
  const [dateFromFilter, setDateFromFilterRaw] = useState('');
  const [dateToFilter, setDateToFilterRaw] = useState('');

  const setStatusFilter = useCallback((value: PassStatus | '') => {
    setPage(1);
    setStatusFilterRaw(value);
  }, []);
  const setCompanyNameFilter = useCallback((value: string) => {
    setPage(1);
    setCompanyNameFilterRaw(value);
  }, []);
  const setCreatedByEmailFilter = useCallback((value: string) => {
    setPage(1);
    setCreatedByEmailFilterRaw(value);
  }, []);
  const setDateFromFilter = useCallback((value: string) => {
    setPage(1);
    setDateFromFilterRaw(value);
  }, []);
  const setDateToFilter = useCallback((value: string) => {
    setPage(1);
    setDateToFilterRaw(value);
  }, []);

  const debouncedCompanyName = useDebounce(companyNameFilter.trim(), TEXT_FILTER_DEBOUNCE_MS);
  const debouncedCreatedByEmail = useDebounce(createdByEmailFilter.trim(), TEXT_FILTER_DEBOUNCE_MS);

  const queryParams = useMemo(() => {
    const params: Record<string, string | number> = { page, page_size: PAGE_SIZE };
    if (statusFilter) params.status = statusFilter;
    if (debouncedCompanyName) params.company_name = debouncedCompanyName;
    if (debouncedCreatedByEmail) params.created_by_email = debouncedCreatedByEmail;
    if (dateFromFilter) params.valid_from_after = dateFromFilter;
    if (dateToFilter) params.valid_from_before = dateToFilter;
    return params;
  }, [page, statusFilter, debouncedCompanyName, debouncedCreatedByEmail, dateFromFilter, dateToFilter]);

  const hasActiveFilters = Boolean(
    statusFilter || companyNameFilter.trim() || createdByEmailFilter.trim() || dateFromFilter || dateToFilter,
  );

  const { data, isLoading, isError } = useQuery({
    queryKey: ['guest-passes', queryParams],
    queryFn: async () => {
      const response = await apiClient.get<PaginatedResponse<GuestPass>>(API.passes.list, { params: queryParams });
      return response.data;
    },
  });

  const resetFilters = useCallback(() => {
    setPage(1);
    setStatusFilterRaw('');
    setCompanyNameFilterRaw('');
    setCreatedByEmailFilterRaw('');
    setDateFromFilterRaw('');
    setDateToFilterRaw('');
  }, []);

  const totalCount = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return {
    statusFilter,
    setStatusFilter,
    companyNameFilter,
    setCompanyNameFilter,
    createdByEmailFilter,
    setCreatedByEmailFilter,
    dateFromFilter,
    setDateFromFilter,
    dateToFilter,
    setDateToFilter,
    hasActiveFilters,
    resetFilters,
    passes: data?.results ?? [],
    totalCount,
    totalPages,
    page,
    setPage,
    pageSize: PAGE_SIZE,
    isLoading,
    isError,
  };
}