import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { USER_ROLES, type PassStatus } from '@/shared/config/constants';
import { useUser } from '@/shared/hooks/useAuth';
import { useDebounce } from '@/pages/crm/hooks/useDebounce';
import { companiesCacheRoot } from '@/shared/lib/companyQueryKeys';
import { getApiError } from '@/shared/lib/getApiError';
import type { Company, GuestPass, PaginatedResponse } from '@/shared/types';

const PAGE_SIZE = 20;
const DEBOUNCE_MS = 400;

export function useAccessLogs() {
  const user = useUser();
  const isSuperadmin = user?.role === USER_ROLES.SUPERADMIN;
  const isAdminView =
    user?.role === USER_ROLES.SUPERADMIN || user?.role === USER_ROLES.COMPANY_ADMIN;

  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [status, setStatus] = useState<PassStatus | ''>('');
  const [page, setPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const debouncedSearch = useDebounce(search.trim(), DEBOUNCE_MS);

  const params = useMemo(() => {
    const q: Record<string, string | number> = {
      page,
      page_size: PAGE_SIZE,
    };
    if (debouncedSearch) q.search = debouncedSearch;
    if (dateFrom) q.valid_from_after = dateFrom;
    if (dateTo) q.valid_from_before = dateTo;
    if (isSuperadmin && companyId.trim()) q.company_id = companyId.trim();
    if (status) q.status = status;
    return q;
  }, [companyId, dateFrom, dateTo, debouncedSearch, isSuperadmin, page, status]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['guest-passes', params],
    queryFn: () =>
      apiClient
        .get<PaginatedResponse<GuestPass>>(API.passes.list, { params })
        .then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const { data: companiesData, isLoading: isCompaniesLoading } = useQuery({
    queryKey: [...companiesCacheRoot(user?.id), 'passes-companies'],
    queryFn: () =>
      apiClient
        .get<PaginatedResponse<Company>>(API.companies.list, { params: { page_size: 200 } })
        .then((r) => r.data),
    enabled: isSuperadmin,
  });

  const totalCount = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const handleExport = useCallback(async () => {
    try {
      setIsExporting(true);
      setExportError(null);
      const exportParams: Record<string, string> = {};
      if (debouncedSearch) exportParams.search = debouncedSearch;
      if (dateFrom) exportParams.valid_from_after = dateFrom;
      if (dateTo) exportParams.valid_from_before = dateTo;
      if (isSuperadmin && companyId.trim()) exportParams.company_id = companyId.trim();
      if (status) exportParams.status = status;

      const response = await apiClient.get<Blob>(API.passes.export, {
        params: exportParams,
        responseType: 'blob',
        headers: { Accept: 'text/csv, */*;q=0.9' },
      });
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `passes_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setExportError(getApiError(e).message);
    } finally {
      setIsExporting(false);
    }
  }, [companyId, dateFrom, dateTo, debouncedSearch, isSuperadmin, status]);

  return {
    passes: data?.results ?? [],
    companiesData,
    isLoading,
    isError,
    error,
    isCompaniesLoading,
    isSuperadmin,
    isAdminView,
    search,
    setSearch,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    companyId,
    setCompanyId,
    status,
    setStatus,
    page,
    setPage,
    totalCount,
    totalPages,
    handleExport,
    isExporting,
    exportError,
  };
}
