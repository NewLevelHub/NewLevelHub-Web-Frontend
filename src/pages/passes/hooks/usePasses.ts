import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { type PassStatus } from '@/shared/config/constants';
import type { GuestPass, PaginatedResponse } from '@/shared/types';
import { toLocalDateKey } from '@/pages/passes/utils/passUtils';

export function usePasses() {
  const [statusFilter, setStatusFilter] = useState<PassStatus | ''>('');
  const [companyNameFilter, setCompanyNameFilter] = useState('');
  const [createdByEmailFilter, setCreatedByEmailFilter] = useState('');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');

  const queryParams = useMemo(() => ({}), []);

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

  const filteredPasses = useMemo(() => {
    const companyNeedle = companyNameFilter.trim().toLowerCase();
    const emailNeedle = createdByEmailFilter.trim().toLowerCase();
    return (data?.results ?? []).filter((pass) => {
      const statusMatches = statusFilter ? pass.status === statusFilter : true;
      const companyMatches = companyNeedle
        ? (pass.created_by_company_name ?? '').toLowerCase().includes(companyNeedle)
        : true;
      const emailMatches = emailNeedle
        ? (pass.created_by_email ?? '').toLowerCase().includes(emailNeedle)
        : true;
      const validFromDate = toLocalDateKey(pass.valid_from);
      const fromMatches = dateFromFilter ? validFromDate >= dateFromFilter : true;
      const toMatches = dateToFilter ? validFromDate <= dateToFilter : true;
      return statusMatches && companyMatches && emailMatches && fromMatches && toMatches;
    });
  }, [data?.results, statusFilter, companyNameFilter, createdByEmailFilter, dateFromFilter, dateToFilter]);

  const resetFilters = () => {
    setStatusFilter('');
    setCompanyNameFilter('');
    setCreatedByEmailFilter('');
    setDateFromFilter('');
    setDateToFilter('');
  };

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
    passes: filteredPasses,
    totalCount: data?.results?.length ?? 0,
    isLoading,
    isError,
  };
}
