import { useTranslation } from 'react-i18next';
import { Bell } from 'lucide-react';

import { Toggle } from '@/pages/notifications/components/Toggle';
import { DndSettingsForm } from '@/features/notifications/preferences/DndSettingsForm';
import type { DndSettings } from '@/features/notifications/preferences/types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface DoNotDisturbCardProps {
  settings: DndSettings;
  onToggle: (v: boolean) => void;
  onChangeFrom: (v: string) => void;
  onChangeTo: (v: string) => void;
  onChangeWeekend: (v: boolean) => void;
  onSave: () => void;
  isSaving: boolean;
  isSaved: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DoNotDisturbCard({
  settings,
  onToggle,
  onChangeFrom,
  onChangeTo,
  onChangeWeekend,
  onSave,
  isSaving,
  isSaved,
}: DoNotDisturbCardProps) {
  const { t } = useTranslation();

  const statusText = settings.enabled
    ? t('notifications.dndActiveRange', { from: settings.from, to: settings.to })
    : t('notifications.dndInactive');

  return (
    <div
      style={{
        borderRadius: 12,
        border: '1px solid var(--border)',
        background: 'var(--bg-surface)',
        padding: '16px 20px',
      }}
    >
      {/* Main row: icon + title + status + toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: settings.enabled ? 'var(--warning-bg)' : 'var(--bg-raised)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Bell
            size={18}
            aria-hidden="true"
            style={{ color: settings.enabled ? 'var(--warning)' : 'var(--text-muted)' }}
          />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
            {t('notifications.dndTitle')}
          </p>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {statusText}
          </p>
        </div>

        <Toggle checked={settings.enabled} onChange={onToggle} disabled={isSaving} />
      </div>

      {/* Expanded form when enabled */}
      {settings.enabled && (
        <DndSettingsForm
          settings={settings}
          onChangeFrom={onChangeFrom}
          onChangeTo={onChangeTo}
          onChangeWeekend={onChangeWeekend}
          disabled={isSaving}
        />
      )}

      {/* Save row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          style={{
            background: 'var(--brand)',
            color: 'var(--text-on-brand)',
            border: 'none',
            borderRadius: 8,
            padding: '7px 16px',
            fontSize: 13,
            fontWeight: 500,
            cursor: isSaving ? 'not-allowed' : 'pointer',
            opacity: isSaving ? 0.7 : 1,
            transition: 'opacity 0.15s',
          }}
        >
          {isSaving ? t('common.saving') : t('common.save')}
        </button>

        {isSaved && (
          <span style={{ fontSize: 12, color: 'var(--success)' }} role="status">
            {t('notifications.saved')}
          </span>
        )}
      </div>
    </div>
  );
}
