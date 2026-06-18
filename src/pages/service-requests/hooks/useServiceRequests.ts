import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import type { ServiceRequestStatus, ServiceRequestType } from '@/shared/config/constants';
import type { PaginatedResponse, ServiceRequest } from '@/shared/types';

// ─── Filters type ─────────────────────────────────────────────────────────────

export interface ServiceRequestFilters {
  type: ServiceRequestType | '';
  status: ServiceRequestStatus | '';
  urgency: 'normal' | 'urgent' | '';
  floorId: string;
  company: string;
  page: number;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

export function useServiceRequests(filters: ServiceRequestFilters, isSA: boolean) {
  const { type, status, urgency, floorId, company, page } = filters;

  const queryParams: Record<string, string | number> = { page, page_size: PAGE_SIZE };
  if (type)            queryParams.type    = type;
  if (status)          queryParams.status  = status;
  if (urgency)         queryParams.urgency = urgency;
  if (floorId)         queryParams.floor   = floorId;
  if (company && isSA) queryParams.company = company;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['service-requests', { type, status, urgent: urgency, floor: floorId, company, page }],
    queryFn: () =>
      apiClient
        .get<PaginatedResponse<ServiceRequest>>(API.serviceRequests.list, { params: queryParams })
        .then((r) => r.data),
  });

  return {
    requests: data?.results ?? [],
    total: data?.count ?? 0,
    isLoading,
    isError,
    pageSize: PAGE_SIZE,
  };
}
