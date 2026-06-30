import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { getApiError } from '@/shared/lib/getApiError';
import type { OnboardingAssignment, OnboardingAssignmentCreatePayload } from '@/shared/types';

export function useOnboardingAssignments(companyId: string | null) {
  const queryClient = useQueryClient();

  const url = companyId
    ? `${API.onboarding.assignments}?company_id=${companyId}`
    : API.onboarding.assignments;

  const assignmentsQuery = useQuery({
    queryKey: ['onboarding-assignments', companyId],
    enabled: true,
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
