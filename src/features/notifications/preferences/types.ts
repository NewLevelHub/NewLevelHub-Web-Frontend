import type { NotificationType } from '@/shared/types';

export type NotificationChannel = 'in_app' | 'email';

export interface PreferenceItem {
  id: NotificationType;
  labelKey: string;
  roles: string[];
}

export interface PreferenceGroup {
  id: string;
  labelKey: string;
  iconName: string;
  types: PreferenceItem[];
}

export interface DndSettings {
  enabled: boolean;
  from: string;
  to: string;
  weekend: boolean;
}
