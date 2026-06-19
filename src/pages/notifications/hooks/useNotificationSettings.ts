/**
 * Re-export from the canonical feature hook location.
 * The NotificationPreferencesPage now imports directly from the feature folder,
 * but this file is kept so any future references to the old path continue to work.
 */
export { useNotificationPreferences as useNotificationSettings } from '@/features/notifications/preferences/useNotificationPreferences';
