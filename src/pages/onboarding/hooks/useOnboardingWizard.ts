import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import type { OnboardingStatus } from '@/shared/types';

export function useOnboardingWizard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [visitedLinks, setVisitedLinks] = useState<Set<number>>(new Set());

  const { data, isPending, isError, refetch } = useQuery<OnboardingStatus>({
    queryKey: ['onboarding-progress'],
    queryFn: () => apiClient.get<OnboardingStatus>(API.onboarding.progress).then((r) => r.data),
    retry: false,
  });

  const completeStepMutation = useMutation({
    mutationFn: (stepId: number) =>
      apiClient.post(API.onboarding.completeStep(stepId)).then((r) => r.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['onboarding-progress'] });
    },
  });

  const isDone = Boolean(data?.completed && data.steps.length > 0);

  useEffect(() => {
    if (!isDone) return;
    const timer = setTimeout(() => {
      void navigate('/dashboard', { replace: true });
    }, 2500);
    return () => clearTimeout(timer);
  }, [isDone, navigate]);

  const markLinkVisited = (stepId: number) => {
    setVisitedLinks((prev) => new Set(prev).add(stepId));
  };

  const completedCount = data?.steps.filter((step) => step.is_completed).length ?? 0;
  const totalCount = data?.steps.length ?? 0;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const currentStepId = data?.steps.find((step) => !step.is_completed)?.id ?? null;

  return {
    data,
    isPending,
    isError,
    isDone,
    visitedLinks,
    completedCount,
    totalCount,
    progressPercent,
    currentStepId,
    completeStepMutation,
    refetch,
    markLinkVisited,
  };
}
