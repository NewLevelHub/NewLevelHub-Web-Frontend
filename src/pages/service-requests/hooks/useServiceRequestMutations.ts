import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { SERVICE_REQUEST_STATUSES } from '@/shared/config/constants';
import type {
  ServiceRequest,
  ServiceRequestRatePayload,
} from '@/shared/types';

// ─── Error code → i18n key map ────────────────────────────────────────────────

const ERROR_CODES: Record<string, string> = {
  'services.invalid_status_transition':             'serviceRequests.errorInvalidTransition',
  'services.assignee_locked_in_progress':           'serviceRequests.errorAssigneeLocked',
  'services.service_manager_already_active':        'serviceRequests.errorManagerAlreadyActive',
  'services.service_manager_request_already_taken': 'serviceRequests.errorRequestAlreadyTaken',
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useServiceRequestMutations(
  id: number | null,
  onError?: (msg: string) => void,
  currentUserId?: number | null,
) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [actionPending, setActionPending] = useState(false);

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['service-requests'] });
    await queryClient.invalidateQueries({ queryKey: ['service-request', id] });
  };

  function resolveError(err: unknown): string {
    const data = (err as any)?.response?.data;
    if (data?.code && ERROR_CODES[data.code]) {
      return t(ERROR_CODES[data.code]);
    }
    if (data?.detail && typeof data.detail === 'string') {
      const mapped = ERROR_CODES[data.detail];
      return mapped ? t(mapped) : data.detail;
    }
    if (typeof data === 'string') return data;
    return t('common.errorGeneric');
  }

  const rateMutation = useMutation({
    mutationFn: ({ reqId, rating }: { reqId: number; rating: number }) =>
      apiClient
        .post<ServiceRequest>(API.serviceRequests.rate(String(reqId)), {
          rating,
        } satisfies ServiceRequestRatePayload)
        .then((r) => r.data),
    onSuccess: invalidate,
  });

  // ─── Individual action helpers ────────────────────────────────────────────

  async function withPending(fn: () => Promise<void>) {
    setActionPending(true);
    try {
      await fn();
    } catch (err) {
      onError?.(resolveError(err));
    } finally {
      setActionPending(false);
    }
  }

  /**
   * Superadmin assigns someone: PATCH { assigned_to: id }
   * Backend returns accepted (other) or in_progress (self) — status always read from response.
   */
  async function assignRequest(assignedToId: number) {
    if (id === null) return;
    await withPending(async () => {
      await apiClient.patch(
        API.serviceRequests.updateStatus(String(id)),
        { assigned_to: assignedToId },
      );
      await invalidate();
    });
  }

  /**
   * Service manager takes request from new: PATCH { assigned_to: currentUserId }
   */
  async function takeRequest() {
    if (id === null) return;
    await withPending(async () => {
      const payload: Record<string, unknown> = {};
      if (currentUserId) payload.assigned_to = currentUserId;
      await apiClient.patch(
        API.serviceRequests.updateStatus(String(id)),
        payload,
      );
      await invalidate();
    });
  }

  /**
   * Assigned user starts work (accepted → in_progress): PATCH { status: 'in_progress' }
   */
  async function startRequest() {
    if (id === null) return;
    await withPending(async () => {
      await apiClient.patch(
        API.serviceRequests.updateStatus(String(id)),
        { status: SERVICE_REQUEST_STATUSES.IN_PROGRESS },
      );
      await invalidate();
    });
  }

  /**
   * Assigned user completes work (in_progress → completed): PATCH { status: 'completed' }
   */
  async function completeRequest() {
    if (id === null) return;
    await withPending(async () => {
      await apiClient.patch(
        API.serviceRequests.updateStatus(String(id)),
        { status: SERVICE_REQUEST_STATUSES.COMPLETED },
      );
      await invalidate();
    });
  }

  return {
    rateMutation,
    assignRequest,
    takeRequest,
    startRequest,
    completeRequest,
    actionPending,
  };
}
