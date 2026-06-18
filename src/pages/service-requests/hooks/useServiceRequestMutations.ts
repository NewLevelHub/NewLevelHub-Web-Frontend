import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { SERVICE_REQUEST_STATUSES } from '@/shared/config/constants';
import { getApiError } from '@/shared/lib/getApiError';
import type {
  ServiceRequest,
  ServiceRequestRatePayload,
  ServiceRequestUpdateStatusPayload,
} from '@/shared/types';

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useServiceRequestMutations(id: number | null) {
  const queryClient = useQueryClient();

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['service-requests'] });
    await queryClient.invalidateQueries({ queryKey: ['service-request', id] });
  };

  const updateStatusMutation = useMutation({
    mutationFn: ({ reqId, ...payload }: { reqId: number } & ServiceRequestUpdateStatusPayload) =>
      apiClient
        .patch<ServiceRequest>(
          API.serviceRequests.updateStatus(String(reqId)),
          payload satisfies ServiceRequestUpdateStatusPayload,
        )
        .then((r) => r.data),
    onSuccess: invalidate,
  });

  const rateMutation = useMutation({
    mutationFn: ({ reqId, rating }: { reqId: number; rating: number }) =>
      apiClient
        .post<ServiceRequest>(API.serviceRequests.rate(String(reqId)), {
          rating,
        } satisfies ServiceRequestRatePayload)
        .then((r) => r.data),
    onSuccess: invalidate,
  });

  /**
   * Two-step "take into progress" action used by service managers:
   * new → accepted → in_progress (or accepted → in_progress directly).
   * Returns an error message string on failure, null on success.
   */
  async function takeInProgress(reqId: number, currentStatus: string): Promise<string | null> {
    try {
      if (currentStatus === SERVICE_REQUEST_STATUSES.NEW) {
        await apiClient.patch(API.serviceRequests.updateStatus(String(reqId)), {
          status: SERVICE_REQUEST_STATUSES.ACCEPTED,
        });
      }
      await apiClient.patch(API.serviceRequests.updateStatus(String(reqId)), {
        status: SERVICE_REQUEST_STATUSES.IN_PROGRESS,
      });
      await invalidate();
      return null;
    } catch (err) {
      return getApiError(err).message;
    }
  }

  return {
    updateStatusMutation,
    rateMutation,
    takeInProgress,
  };
}
