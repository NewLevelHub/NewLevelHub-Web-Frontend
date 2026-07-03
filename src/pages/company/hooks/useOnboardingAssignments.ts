import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { USER_ROLES } from '@/shared/config/constants';
import { useAuth } from '@/shared/hooks/useAuth';
import { getApiError } from '@/shared/lib/getApiError';
import type { OnboardingAssignment, OnboardingAssignmentCreatePayload } from '@/shared/types';

export function useOnboardingAssignments(companyId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const isSuperadmin = user?.role === USER_ROLES.SUPERADMIN;

  // Superadmins must scope requests to a specific company via ?company_id=.
  // Without a companyId the backend has no context, so we skip the request.
  // Company admins are auto-scoped by the backend based on their session.
  const enabled = isSuperadmin ? Boolean(companyId) : true;

  const url = companyId
    ? `${API.onboarding.assignments}?company_id=${companyId}`
    : API.onboarding.assignments;

  const assignmentsQuery = useQuery({
    queryKey: ['onboarding-assignments', companyId],
    enabled,
    queryFn: () => apiClient.get<OnboardingAssignment[]>(url).then((r) => r.data),
  });

  const assignMutation = useMutation({
    mutationFn: (payload: OnboardingAssignmentCreatePayload) =>
      apiClient.post<OnboardingAssignment>(API.onboarding.assignments, payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['onboarding-team-progress'] });
      queryClient.invalidateQueries({ queryKey: ['onboarding-team-progress-detail'] });
    },
  });

  return {
    assignments: assignmentsQuery.data ?? [],
    assignmentsQuery,
    assignMutation,
    assignError: assignMutation.error ? getApiError(assignMutation.error).message : null,
  };
}
