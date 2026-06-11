import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { USER_ROLES } from '@/shared/config/constants';
import { useAuth } from '@/shared/hooks/useAuth';
import type { TeamMemberProgress, TeamMemberProgressDetail } from '@/shared/types';

export function useTeamOnboarding() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const isSuperadmin = user?.role === USER_ROLES.SUPERADMIN;
  const companyId = isSuperadmin ? searchParams.get('company') ?? '' : '';

  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  const teamQuery = useQuery({
    queryKey: ['onboarding-team-progress'],
    queryFn: () =>
      apiClient.get<TeamMemberProgress[]>(API.onboarding.teamProgress).then((r) => r.data),
  });

  const detailQuery = useQuery({
    queryKey: ['onboarding-team-progress-detail', selectedUserId],
    enabled: selectedUserId !== null,
    queryFn: () =>
      apiClient
        .get<TeamMemberProgressDetail>(API.onboarding.teamProgressDetail(selectedUserId!))
        .then((r) => r.data),
  });

  const members = [...(teamQuery.data ?? [])].sort((a, b) => {
    const aDone = a.total_steps > 0 && a.completed_steps === a.total_steps ? 1 : 0;
    const bDone = b.total_steps > 0 && b.completed_steps === b.total_steps ? 1 : 0;
    return aDone - bDone;
  });

  const selectedMember =
    selectedUserId !== null ? members.find((m) => m.user === selectedUserId) ?? null : null;

  const detail = detailQuery.data ?? null;

  const handleSelectUser = (userId: number) => {
    setSelectedUserId((prev) => (prev === userId ? null : userId));
  };

  const handleDeselectUser = () => {
    setSelectedUserId(null);
  };

  return {
    companyId,
    selectedUserId,
    members,
    selectedMember,
    detail,
    teamQuery,
    detailQuery,
    handleSelectUser,
    handleDeselectUser,
  };
}
