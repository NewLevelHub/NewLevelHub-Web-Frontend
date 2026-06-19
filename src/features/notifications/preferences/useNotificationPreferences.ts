import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { USER_ROLES } from '@/shared/config/constants';
import { useAuth } from '@/shared/hooks/useAuth';
import type { NotificationPreferenceEntry, NotificationPreferences, NotificationType } from '@/shared/types';

import type { DndSettings, NotificationChannel, PreferenceGroup } from './types';

// ---------------------------------------------------------------------------
// Group definitions (filtered per role at render time)
// ---------------------------------------------------------------------------

const ALL_ROLES = [
  USER_ROLES.SUPERADMIN,
  USER_ROLES.COMPANY_ADMIN,
  USER_ROLES.EMPLOYEE,
  USER_ROLES.GUEST,
];
const ADMIN_ROLES = [USER_ROLES.SUPERADMIN, USER_ROLES.COMPANY_ADMIN];
const NON_GUEST = [USER_ROLES.SUPERADMIN, USER_ROLES.COMPANY_ADMIN, USER_ROLES.EMPLOYEE];

export const PREFERENCE_GROUPS: PreferenceGroup[] = [
  {
    id: 'booking',
    labelKey: 'notifications.groups.booking',
    iconName: 'Calendar',
    types: [
      { id: 'booking_confirmed', labelKey: 'notifications.typeLabels.booking_confirmed', roles: ALL_ROLES },
      { id: 'booking_cancelled', labelKey: 'notifications.typeLabels.booking_cancelled', roles: ALL_ROLES },
      { id: 'booking_reminder', labelKey: 'notifications.typeLabels.booking_reminder', roles: ALL_ROLES },
      { id: 'booking_completed', labelKey: 'notifications.typeLabels.booking_completed', roles: ALL_ROLES },
    ],
  },
  {
    id: 'tasks',
    labelKey: 'notifications.groups.tasks',
    iconName: 'LayoutGrid',
    types: [
      { id: 'task_assigned', labelKey: 'notifications.typeLabels.task_assigned', roles: ALL_ROLES },
      { id: 'task_deadline', labelKey: 'notifications.typeLabels.task_deadline', roles: ALL_ROLES },
      { id: 'task_comment', labelKey: 'notifications.typeLabels.task_comment', roles: ALL_ROLES },
      { id: 'task_moved', labelKey: 'notifications.typeLabels.task_moved', roles: ALL_ROLES },
    ],
  },
  {
    id: 'announce',
    labelKey: 'notifications.groups.announce',
    iconName: 'Megaphone',
    types: [
      { id: 'announcement', labelKey: 'notifications.typeLabels.announcement', roles: ALL_ROLES },
    ],
  },
  {
    id: 'service',
    labelKey: 'notifications.groups.service',
    iconName: 'Sparkles',
    types: [
      { id: 'service_request_update', labelKey: 'notifications.typeLabels.service_request_update', roles: NON_GUEST },
    ],
  },
  {
    id: 'guests',
    labelKey: 'notifications.groups.guests',
    iconName: 'Ticket',
    types: [
      { id: 'guest_pass_expiring', labelKey: 'notifications.typeLabels.guest_pass_expiring', roles: ALL_ROLES },
      { id: 'guest_validated', labelKey: 'notifications.typeLabels.guest_validated', roles: ALL_ROLES },
    ],
  },
  {
    id: 'hr',
    labelKey: 'notifications.groups.hr',
    iconName: 'Users',
    types: [
      { id: 'new_employee', labelKey: 'notifications.typeLabels.new_employee', roles: ADMIN_ROLES },
      { id: 'leave_review', labelKey: 'notifications.typeLabels.leave_review', roles: ADMIN_ROLES },
      { id: 'leave_approved', labelKey: 'notifications.typeLabels.leave_approved', roles: ALL_ROLES },
      { id: 'leave_rejected', labelKey: 'notifications.typeLabels.leave_rejected', roles: ALL_ROLES },
    ],
  },
  {
    id: 'system',
    labelKey: 'notifications.groups.system',
    iconName: 'Settings',
    types: [
      { id: 'system', labelKey: 'notifications.typeLabels.system', roles: ALL_ROLES },
      { id: 'invitation', labelKey: 'notifications.typeLabels.invitation', roles: ALL_ROLES },
    ],
  },
];

// ---------------------------------------------------------------------------
// Default entry factory
// ---------------------------------------------------------------------------

function defaultEntry(): NotificationPreferenceEntry {
  return { in_app: false, email: false };
}

function buildDefaultPrefs(): Record<NotificationType, NotificationPreferenceEntry> {
  const allTypes: NotificationType[] = [
    'booking_confirmed', 'booking_reminder', 'booking_cancelled', 'booking_completed',
    'task_assigned', 'task_moved', 'task_comment', 'task_deadline',
    'guest_validated', 'guest_pass_expiring', 'service_request_update',
    'announcement', 'invitation', 'leave_review', 'leave_approved', 'leave_rejected',
    'new_employee', 'system',
  ];
  return Object.fromEntries(allTypes.map((t) => [t, defaultEntry()])) as Record<NotificationType, NotificationPreferenceEntry>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useNotificationPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Server fetch
  const { data: serverPrefs, isLoading, isError } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: () =>
      apiClient.get<NotificationPreferences>(API.notifications.preferences).then((r) => r.data),
  });

  // Local prefs state (save-on-button-click pattern)
  const [localPrefs, setLocalPrefs] = useState<Record<NotificationType, NotificationPreferenceEntry>>(
    buildDefaultPrefs,
  );

  // Sync from server when data arrives
  useEffect(() => {
    if (!serverPrefs) return;
    const defaulted = buildDefaultPrefs();
    const keys = Object.keys(defaulted) as NotificationType[];
    const synced = Object.fromEntries(
      keys.map((k) => [k, serverPrefs[k] ?? defaultEntry()]),
    ) as Record<NotificationType, NotificationPreferenceEntry>;
    setLocalPrefs(synced);
  }, [serverPrefs]);

  // DND local state
  const [dndEnabled, setDndEnabled] = useState(false);
  const [dndFrom, setDndFrom] = useState('20:00');
  const [dndTo, setDndTo] = useState('08:00');
  const [dndWeekend, setDndWeekend] = useState(false);

  // Sync DND from server
  useEffect(() => {
    if (!serverPrefs) return;
    setDndEnabled(serverPrefs.dnd_enabled);
    if (serverPrefs.dnd_until) {
      // Parse time from ISO string if available, otherwise keep defaults
      try {
        const d = new Date(serverPrefs.dnd_until);
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        setDndTo(`${hh}:${mm}`);
      } catch {
        // ignore
      }
    }
  }, [serverPrefs]);

  // Grouped data filtered by user role
  const groupedData = useMemo<PreferenceGroup[]>(() => {
    const role = user?.role ?? '';
    return PREFERENCE_GROUPS.map((group) => ({
      ...group,
      types: group.types.filter((item) => item.roles.includes(role)),
    })).filter((group) => group.types.length > 0);
  }, [user?.role]);

  // Toggle single type/channel
  const toggle = useCallback((type: NotificationType, channel: NotificationChannel) => {
    setLocalPrefs((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        [channel]: !prev[type][channel],
      },
    }));
  }, []);

  // Toggle all types in a group for a specific channel
  const groupToggle = useCallback(
    (groupId: string, channel: NotificationChannel, value: boolean) => {
      const group = groupedData.find((g) => g.id === groupId);
      if (!group) return;
      setLocalPrefs((prev) => {
        const next = { ...prev };
        for (const item of group.types) {
          next[item.id] = { ...next[item.id], [channel]: value };
        }
        return next;
      });
    },
    [groupedData],
  );

  // Disable all
  const disableAll = useCallback(() => {
    setLocalPrefs((prev) => {
      const next = { ...prev };
      (Object.keys(next) as NotificationType[]).forEach((k) => {
        next[k] = { in_app: false, email: false };
      });
      return next;
    });
  }, []);

  // Enable all
  const enableAll = useCallback(() => {
    setLocalPrefs((prev) => {
      const next = { ...prev };
      (Object.keys(next) as NotificationType[]).forEach((k) => {
        next[k] = { in_app: true, email: true };
      });
      return next;
    });
  }, []);

  // allDisabled — true when every visible type has in_app: false AND email: false
  const allDisabled = useMemo(() => {
    const role = user?.role ?? '';
    const visibleTypes = PREFERENCE_GROUPS.flatMap((g) =>
      g.types.filter((item) => item.roles.includes(role)),
    );
    return visibleTypes.every((item) => !localPrefs[item.id]?.in_app && !localPrefs[item.id]?.email);
  }, [localPrefs, user?.role]);

  // isDirty — compare with server prefs
  const isDirty = useMemo(() => {
    if (!serverPrefs) return false;
    return (Object.keys(localPrefs) as NotificationType[]).some((k) => {
      const local = localPrefs[k];
      const server = serverPrefs[k];
      if (!server) return local.in_app || local.email;
      return local.in_app !== server.in_app || local.email !== server.email;
    });
  }, [localPrefs, serverPrefs]);

  // Computed counts
  const { total, activeCount } = useMemo(() => {
    const role = user?.role ?? '';
    const visibleTypes = PREFERENCE_GROUPS.flatMap((g) =>
      g.types.filter((t) => t.roles.includes(role)),
    );
    const active = visibleTypes.filter(
      (t) => localPrefs[t.id]?.in_app || localPrefs[t.id]?.email,
    ).length;
    return { total: visibleTypes.length, activeCount: active };
  }, [localPrefs, user?.role]);

  // Push/email summary counts (for footer)
  const { pushActive, emailActive, visibleTotal } = useMemo(() => {
    const role = user?.role ?? '';
    const visibleTypes = PREFERENCE_GROUPS.flatMap((g) =>
      g.types.filter((t) => t.roles.includes(role)),
    );
    const push = visibleTypes.filter((t) => localPrefs[t.id]?.in_app).length;
    const email = visibleTypes.filter((t) => localPrefs[t.id]?.email).length;
    return { pushActive: push, emailActive: email, visibleTotal: visibleTypes.length };
  }, [localPrefs, user?.role]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: (payload: Partial<NotificationPreferences>) =>
      apiClient.patch<NotificationPreferences>(API.notifications.preferences, payload).then((r) => r.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
    },
  });

  const save = useCallback(() => {
    saveMutation.mutate(localPrefs as unknown as Partial<NotificationPreferences>);
  }, [localPrefs, saveMutation]);

  // DND save mutation
  const dndMutation = useMutation({
    mutationFn: (payload: { enabled: boolean; from?: string; to?: string; weekend?: boolean }) =>
      apiClient.post(API.notifications.doNotDisturb, payload).then((r) => r.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
    },
  });

  const saveDnd = useCallback(() => {
    const payload: { enabled: boolean; from?: string; to?: string; weekend?: boolean } = {
      enabled: dndEnabled,
    };
    if (dndEnabled) {
      payload.from = dndFrom;
      payload.to = dndTo;
      payload.weekend = dndWeekend;
    }
    dndMutation.mutate(payload);
  }, [dndEnabled, dndFrom, dndTo, dndWeekend, dndMutation]);

  const dndSettings: DndSettings = { enabled: dndEnabled, from: dndFrom, to: dndTo, weekend: dndWeekend };

  return {
    // Loading / error
    isLoading,
    isError,
    // Local prefs
    localPrefs,
    toggle,
    groupToggle,
    disableAll,
    enableAll,
    allDisabled,
    isDirty,
    // Save
    save,
    isSaving: saveMutation.isPending,
    isSaved: saveMutation.isSuccess,
    saveError: saveMutation.isError,
    // Counts
    total,
    activeCount,
    pushActive,
    emailActive,
    visibleTotal,
    // Grouped data
    groupedData,
    // DND
    dndSettings,
    setDndEnabled,
    setDndFrom,
    setDndTo,
    setDndWeekend,
    saveDnd,
    isDndSaving: dndMutation.isPending,
    isDndSaved: dndMutation.isSuccess,
  };
}
