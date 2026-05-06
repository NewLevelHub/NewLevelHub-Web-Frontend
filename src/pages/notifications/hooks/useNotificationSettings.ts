import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import type { NotificationPreferences, NotificationType } from '@/shared/types';

export function useNotificationSettings() {
  const queryClient = useQueryClient();
  const [pendingKeys, setPendingKeys] = useState<Set<string>>(new Set());

  function addPending(key: string) {
    setPendingKeys((prev) => new Set(prev).add(key));
  }

  function removePending(key: string) {
    setPendingKeys((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }

  const { data: preferences, isLoading, isError } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: () =>
      apiClient
        .get<NotificationPreferences>(API.notifications.preferences)
        .then((r) => r.data),
  });

  const mutation = useMutation({
    mutationFn: (payload: Partial<NotificationPreferences>) =>
      apiClient
        .patch<NotificationPreferences>(API.notifications.preferences, payload)
        .then((r) => r.data),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: ['notification-preferences'] });
      const previous = queryClient.getQueryData<NotificationPreferences>([
        'notification-preferences',
      ]);
      queryClient.setQueryData<NotificationPreferences>(
        ['notification-preferences'],
        (old) => (old ? { ...old, ...payload } : old),
      );
      return { previous };
    },
    onSuccess: (serverData) => {
      queryClient.setQueryData<NotificationPreferences>(
        ['notification-preferences'],
        (old) => (old ? { ...old, ...serverData } : serverData),
      );
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['notification-preferences'], context.previous);
      }
      void queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
    },
  });

  function handleToggle(
    type: NotificationType,
    field: 'in_app' | 'email',
    value: boolean,
  ) {
    const key = `${type}:${field}`;
    addPending(key);
    const currentEntry =
      queryClient.getQueryData<NotificationPreferences>(['notification-preferences'])?.[type] ??
      { in_app: false, email: false };
    mutation.mutate(
      { [type]: { ...currentEntry, [field]: value } } as Partial<NotificationPreferences>,
      { onSettled: () => removePending(key) },
    );
  }

  return {
    preferences,
    isLoading,
    isError,
    pendingKeys,
    handleToggle,
  };
}
