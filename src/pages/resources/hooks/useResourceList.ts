import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import {
  BOOKING_RESOURCE_CATALOG_STATUS,
  RESOURCE_TYPE_LABEL_KEYS,
  RESOURCE_TYPES,
  USER_ROLES,
  type ResourceType,
} from '@/shared/config/constants';
import { useAuth } from '@/shared/hooks/useAuth';
import type { BookingResourceListItem, PaginatedResponse } from '@/shared/types';

const PAGE_SIZE = 20;

// ─── Debounce hook (local) ────────────────────────────────────────────────────

function useDebouncedValue<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    setDebounced(value);
  }, [value]);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(flush, ms);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [value, ms, flush]);

  return debounced;
}

// ─── Operational status helper ────────────────────────────────────────────────

export function getOperationalStatus(resource: BookingResourceListItem): 'blocked' | 'active' | 'inactive' {
  if (resource.status === BOOKING_RESOURCE_CATALOG_STATUS.BLOCKED) return 'blocked';
  if (resource.is_active) return 'active';
  return 'inactive';
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useResourceList() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isSuperadmin = user?.role === USER_ROLES.SUPERADMIN;

  const successMessage =
    typeof location.state === 'object' && location.state && 'successMessage' in location.state
      ? String((location.state as { successMessage?: string }).successMessage ?? '')
      : null;

  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');
  const [floorFilter, setFloorFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebouncedValue(searchInput, 350);

  const typeOptions = useMemo(
    () =>
      Object.values(RESOURCE_TYPES).map((resourceType) => ({
        value: resourceType,
        labelKey: RESOURCE_TYPE_LABEL_KEYS[resourceType as ResourceType],
      })),
    [],
  );

  const queryParams: Record<string, string | number> = { page, page_size: PAGE_SIZE };
  if (typeFilter) queryParams.resource_type = typeFilter;
  if (floorFilter !== '' && !Number.isNaN(Number(floorFilter))) {
    queryParams.floor = Number(floorFilter);
  }
  if (activeFilter !== '') queryParams.is_active = activeFilter;
  if (debouncedSearch.trim()) queryParams.search = debouncedSearch.trim();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['booking-resources', queryParams],
    queryFn: async () => {
      const { data: res } = await apiClient.get<PaginatedResponse<BookingResourceListItem>>(
        API.bookings.resources.list,
        { params: queryParams },
      );
      return res;
    },
  });

  const totalCount = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const results = data?.results ?? [];
  const rangeStart = (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, totalCount);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [typeFilter, floorFilter, activeFilter, debouncedSearch]);

  // Clear success message from location state
  useEffect(() => {
    if (!successMessage) return;
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, navigate, successMessage]);

  return {
    // auth
    isSuperadmin,
    // filter state
    searchInput,
    setSearchInput,
    typeFilter,
    setTypeFilter,
    floorFilter,
    setFloorFilter,
    activeFilter,
    setActiveFilter,
    typeOptions,
    // pagination
    page,
    setPage,
    totalCount,
    totalPages,
    rangeStart,
    rangeEnd,
    // query
    results,
    isLoading,
    isError,
    // banners
    successMessage,
  };
}
