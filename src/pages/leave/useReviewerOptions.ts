import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { USER_ROLES } from '@/shared/config/constants';
import { useAuth } from '@/shared/hooks/useAuth';
import type { CompanyMember, PaginatedResponse } from '@/shared/types';

export interface ReviewerOption {
  id: number;
  full_name: string;
}

/**
 * Lists other active company_admins of the current user's company — i.e. the people
 * eligible to be set as `assigned_reviewer` on a leave request.
 *
 * Only enabled for company_admin authors; for other roles the field is optional
 * and the picker is not rendered, so we skip the network call.
 */
export function useReviewerOptions() {
  const { user } = useAuth();
  const isCompanyAdmin = user?.role === USER_ROLES.COMPANY_ADMIN;
  const companyId = user?.company?.id ?? null;

  const query = useQuery({
    queryKey: ['leave', 'reviewer-options', companyId],
    enabled: isCompanyAdmin && companyId != null,
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<CompanyMember> | CompanyMember[]>(
        API.companies.members(String(companyId)),
        { params: { role: USER_ROLES.COMPANY_ADMIN, is_active: true, page_size: 200 } },
      );
      const rows = Array.isArray(data) ? data : data.results ?? [];
      return rows
        .filter((m) => m.is_active && m.role === USER_ROLES.COMPANY_ADMIN && m.id !== user?.id)
        .map<ReviewerOption>((m) => ({ id: m.id, full_name: m.full_name }));
    },
  });

  return {
    isCompanyAdmin,
    options: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}
