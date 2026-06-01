import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import type { PassValidationsResponse } from '@/shared/types';

export function usePassValidations(passId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['guest-pass-validations', passId],
    enabled: Boolean(passId) && enabled,
    queryFn: async () => {
      const response = await apiClient.get<PassValidationsResponse>(
        API.passes.validations(String(passId)),
      );
      return response.data;
    },
  });
}
