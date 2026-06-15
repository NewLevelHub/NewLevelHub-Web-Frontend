import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { USER_ROLES } from '@/shared/config/constants';
import { useUser } from '@/shared/hooks/useAuth';
import { companiesCacheRoot } from '@/shared/lib/companyQueryKeys';
import { getApiError } from '@/shared/lib/getApiError';
import type { AccessLogEntry, Company, GuestPass, PaginatedResponse } from '@/shared/types';

const PAGE_SIZE = 20;

export function useAccessLogs() {
  const user = useUser();
  const isSuperadmin = user?.role === USER_ROLES.SUPERADMIN;

  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [page, setPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const params = useMemo(() => {
    const query: Record<string, string | number> = {
      page,
      page_size: PAGE_SIZE,
      ordering: '-validated_at',
    };
    if (search.trim()) query.search = search.trim();
    if (dateFrom) query.date_from = dateFrom;
    if (dateTo) query.date_to = dateTo;
    if (isSuperadmin && companyId.trim()) query.company_id = companyId.trim();
    return query;
  }, [companyId, dateFrom, dateTo, isSuperadmin, page, search]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['access-logs', params],
    queryFn: () =>
      apiClient
        .get<PaginatedResponse<AccessLogEntry>>(API.accessLog.list, { params })
        .then((r) => r.data),
    placeholderData: (prev) => prev,
    refetchInterval: page === 1 ? 10_000 : false,
  });

  const guestPassIds = useMemo(() => {
    const ids = new Set<number>();
    for (const log of data?.results ?? []) {
      if (typeof log.guest_pass === 'number') ids.add(log.guest_pass);
    }
    return Array.from(ids);
  }, [data?.results]);

  const { data: guestPassMap } = useQuery({
    queryKey: ['access-log-guest-passes', guestPassIds],
    queryFn: async () => {
      const entries = await Promise.all(
        guestPassIds.map(async (passId) => {
          const r = await apiClient.get<GuestPass>(API.passes.detail(String(passId)));
          return [passId, r.data] as const;
        }),
      );
      return Object.fromEntries(entries) as Record<number, GuestPass>;
    },
    enabled: guestPassIds.length > 0,
  });

  const { data: companiesData, isLoading: isCompaniesLoading } = useQuery({
    queryKey: [...companiesCacheRoot(user?.id), 'access-log-companies'],
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
      const exportParams: Record<string, string> = { format: 'csv' };
      if (dateFrom) exportParams.date_from = dateFrom;
      if (dateTo) exportParams.date_to = dateTo;
      if (isSuperadmin && companyId.trim()) exportParams.company_id = companyId.trim();
      if (search.trim()) exportParams.search = search.trim();

      const response = await apiClient.get<Blob>(API.accessLog.export, {
        params: exportParams,
        responseType: 'blob',
        headers: { Accept: 'text/csv, */*;q=0.9' },
      });
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const stamp = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.setAttribute('download', `access_logs_${stamp}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setExportError(getApiError(e).message);
    } finally {
      setIsExporting(false);
    }
  }, [companyId, dateFrom, dateTo, isSuperadmin, search]);

  return {
    logs: data?.results ?? [],
    guestPassMap: guestPassMap ?? {},
    companiesData,
    isLoading,
    isError,
    error,
    isCompaniesLoading,
    isSuperadmin,
    search,
    setSearch,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    companyId,
    setCompanyId,
    page,
    setPage,
    totalCount,
    totalPages,
    handleExport,
    isExporting,
    exportError,
  };
}
