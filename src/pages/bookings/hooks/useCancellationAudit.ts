import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { useUser } from '@/shared/hooks/useAuth';
import type { CancellationAuditEntry, PaginatedResponse } from '@/shared/types';

const PAGE_SIZE = 20;

export function useCancellationAudit() {
  const currentUser = useUser();

  const [page, setPage] = useState(1);
  const [bookingId, setBookingIdRaw] = useState('');
  const [cancelledBySearch, setCancelledBySearchRaw] = useState('');
  const [dateFrom, setDateFromRaw] = useState('');
  const [dateTo, setDateToRaw] = useState('');

  const setBookingId = useCallback((v: string) => { setBookingIdRaw(v); }, []);
  const setCancelledBySearch = useCallback((v: string) => { setCancelledBySearchRaw(v); }, []);
  const setDateFrom = useCallback((v: string) => { setPage(1); setDateFromRaw(v); }, []);
  const setDateTo = useCallback((v: string) => { setPage(1); setDateToRaw(v); }, []);

  const queryParams = useMemo(() => {
    const params: Record<string, string | number> = {
      page,
      page_size: PAGE_SIZE,
      ordering: '-cancelled_at',
    };
    if (dateFrom) params.cancelled_at_after = dateFrom;
    if (dateTo) params.cancelled_at_before = dateTo;
    return params;
  }, [page, dateFrom, dateTo]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['cancellation-audit', queryParams],
    queryFn: () =>
      apiClient
        .get<PaginatedResponse<CancellationAuditEntry>>(API.bookings.cancellationAudit, { params: queryParams })
        .then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const allEntries = data?.results ?? [];

  const entries = useMemo(() => {
    const bookingFilter = bookingId.replace(/^#/, '').trim();
    const nameFilter = cancelledBySearch.trim().toLowerCase();
    return allEntries
      .filter((e) => !bookingFilter || String(e.booking_id).includes(bookingFilter))
      .filter((e) => !nameFilter || (e.cancelled_by?.full_name ?? '').toLowerCase().includes(nameFilter));
  }, [allEntries, bookingId, cancelledBySearch]);

  const totalCount = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return {
    entries,
    totalCount,
    totalPages,
    page,
    setPage,
    pageSize: PAGE_SIZE,
    isLoading,
    isError,
    bookingId,
    setBookingId,
    cancelledBySearch,
    setCancelledBySearch,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
  };
}
