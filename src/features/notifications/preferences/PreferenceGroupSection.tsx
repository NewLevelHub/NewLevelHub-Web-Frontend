import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Calendar,
  LayoutGrid,
  Megaphone,
  Sparkles,
  Ticket,
  Users,
  Settings,
} from 'lucide-react';

import type { NotificationPreferenceEntry, NotificationType } from '@/shared/types';
import { Toggle } from '@/pages/notifications/components/Toggle';

import type { NotificationChannel, PreferenceGroup } from './types';

// ---------------------------------------------------------------------------
// Icon map
// ---------------------------------------------------------------------------

const ICON_MAP: Record<string, React.ElementType> = {
  Calendar,
  LayoutGrid,
  Megaphone,
  Sparkles,
  Ticket,
  Users,
  Settings,
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PreferenceGroupSectionProps {
  group: PreferenceGroup;
  prefs: Record<NotificationType, NotificationPreferenceEntry>;
  onToggle: (type: NotificationType, channel: NotificationChannel) => void;
  onGroupToggle: (groupId: string, channel: NotificationChannel, value: boolean) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const PreferenceGroupSection = React.memo(function PreferenceGroupSection({
  group,
  prefs,
  onToggle,
  onGroupToggle,
}: PreferenceGroupSectionProps) {
  const { t } = useTranslation();

  const Icon = ICON_MAP[group.iconName] ?? Settings;

  // Derive master toggle states per channel
  const allPushOn = group.types.every((item) => prefs[item.id]?.in_app);
  const allEmailOn = group.types.every((item) => prefs[item.id]?.email);
  const somePushOn = group.types.some((item) => prefs[item.id]?.in_app);
  const someEmailOn = group.types.some((item) => prefs[item.id]?.email);

  return (
    <>
      {/* Group header row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 90px 90px',
          background: 'var(--bg-raised)',
          borderBottom: '1px solid var(--border-faint)',
          padding: '10px 16px',
          alignItems: 'center',
        }}
      >
        {/* Left: icon + name + count */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon
            size={16}
            aria-hidden="true"
            style={{ color: 'var(--text-secondary)', flexShrink: 0 }}
          />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
            {t(group.labelKey)}
          </span>
          <span
            style={{
              fontSize: 11,
              color: 'var(--text-muted)',
              background: 'var(--bg-hover)',
              borderRadius: 10,
              padding: '1px 7px',
              lineHeight: '18px',
            }}
          >
            {t('notifications.groupCount_other', { count: group.types.length })}
          </span>
        </div>

        {/* Push master toggle */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Toggle
            checked={allPushOn || somePushOn}
            onChange={(v) => onGroupToggle(group.id, 'in_app', v)}
          />
        </div>

        {/* Email master toggle */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Toggle
            checked={allEmailOn || someEmailOn}
            onChange={(v) => onGroupToggle(group.id, 'email', v)}
          />
        </div>
      </div>

      {/* Type rows */}
      {group.types.map((item) => {
        const entry = prefs[item.id] ?? { in_app: false, email: false };
        return (
          <div
            key={item.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 90px 90px',
              padding: '9px 16px',
              paddingLeft: 50,
              borderBottom: '1px solid var(--border-faint)',
              alignItems: 'center',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-hover)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.background = '';
            }}
          >
            {/* Label with bullet */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'var(--border-strong)',
                  flexShrink: 0,
                }}
                aria-hidden="true"
              />
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {t(item.labelKey)}
              </span>
            </div>

            {/* Push toggle */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <Toggle
                checked={entry.in_app}
                onChange={() => onToggle(item.id, 'in_app')}
              />
            </div>

            {/* Email toggle */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <Toggle
                checked={entry.email}
                onChange={() => onToggle(item.id, 'email')}
              />
            </div>
          </div>
        );
      })}
    </>
  );
});
