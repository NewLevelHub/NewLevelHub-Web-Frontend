import { useTranslation } from 'react-i18next';
import { Mail, Smartphone } from 'lucide-react';

import type { NotificationPreferenceEntry, NotificationType } from '@/shared/types';
import { PreferenceGroupSection } from '@/features/notifications/preferences/PreferenceGroupSection';
import type { NotificationChannel, PreferenceGroup } from '@/features/notifications/preferences/types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface PreferencesTableProps {
  groupedData: PreferenceGroup[];
  prefs: Record<NotificationType, NotificationPreferenceEntry>;
  onToggle: (type: NotificationType, channel: NotificationChannel) => void;
  onGroupToggle: (groupId: string, channel: NotificationChannel, value: boolean) => void;
  onSave: () => void;
  isSaving: boolean;
  pushActive: number;
  emailActive: number;
  visibleTotal: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PreferencesTable({
  groupedData,
  prefs,
  onToggle,
  onGroupToggle,
  onSave,
  isSaving,
  pushActive,
  emailActive,
  visibleTotal,
}: PreferencesTableProps) {
  const { t } = useTranslation();

  const headerCellStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    color: 'var(--text-muted)',
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  };

  return (
    <div
      style={{
        borderRadius: 12,
        border: '1px solid var(--border)',
        background: 'var(--bg-surface)',
        overflow: 'hidden',
        marginTop: 16,
      }}
    >
      {/* Column header row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 90px 90px',
          background: 'var(--bg-raised)',
          borderBottom: '1px solid var(--border)',
          padding: '10px 16px',
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--text-muted)',
          }}
        >
          {t('notifications.typesHeading')}
        </span>
        <div style={headerCellStyle}>
          <Smartphone size={13} aria-hidden="true" />
          Push
        </div>
        <div style={headerCellStyle}>
          <Mail size={13} aria-hidden="true" />
          Email
        </div>
      </div>

      {/* Groups */}
      {groupedData.map((group) => (
        <PreferenceGroupSection
          key={group.id}
          group={group}
          prefs={prefs}
          onToggle={onToggle}
          onGroupToggle={onGroupToggle}
        />
      ))}

      {/* Footer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          background: 'var(--bg-raised)',
          borderTop: '1px solid var(--border)',
          padding: '12px 16px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {t('notifications.pushSummary', { count: pushActive, total: visibleTotal })}
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {t('notifications.emailSummary', { count: emailActive, total: visibleTotal })}
          </span>
        </div>

        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          style={{
            background: 'var(--brand)',
            color: 'var(--text-on-brand)',
            border: 'none',
            borderRadius: 8,
            padding: '7px 18px',
            fontSize: 13,
            fontWeight: 500,
            cursor: isSaving ? 'not-allowed' : 'pointer',
            opacity: isSaving ? 0.7 : 1,
            transition: 'opacity 0.15s',
          }}
        >
          {isSaving ? t('common.saving') : t('notifications.saveSettings')}
        </button>
      </div>
    </div>
  );
}
