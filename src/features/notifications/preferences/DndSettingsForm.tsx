import React from 'react';
import { useTranslation } from 'react-i18next';
import { Toggle } from '@/pages/notifications/components/Toggle';
import type { DndSettings } from './types';

// ---------------------------------------------------------------------------
// Time options for From/To selects
// ---------------------------------------------------------------------------

const FROM_OPTIONS = ['18:00', '19:00', '20:00', '21:00', '22:00', '23:00'];
const TO_OPTIONS = ['05:00', '06:00', '07:00', '08:00', '09:00', '10:00'];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DndSettingsFormProps {
  settings: DndSettings;
  onChangeFrom: (v: string) => void;
  onChangeTo: (v: string) => void;
  onChangeWeekend: (v: boolean) => void;
  disabled?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const DndSettingsForm = React.memo(function DndSettingsForm({
  settings,
  onChangeFrom,
  onChangeTo,
  onChangeWeekend,
  disabled,
}: DndSettingsFormProps) {
  const { t } = useTranslation();

  const selectStyle: React.CSSProperties = {
    background: 'var(--bg-hover)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text-primary)',
    fontSize: 13,
    padding: '5px 10px',
    cursor: 'pointer',
    outline: 'none',
  };

  return (
    <div
      style={{
        marginTop: 12,
        padding: '12px 16px',
        background: 'var(--bg-raised)',
        borderRadius: 8,
        border: '1px solid var(--border-faint)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {/* Time row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)', minWidth: 20 }}>
          {t('notifications.dndFrom')}
        </span>
        <select
          value={settings.from}
          onChange={(e) => onChangeFrom(e.target.value)}
          disabled={disabled}
          style={selectStyle}
          aria-label={t('notifications.dndFrom')}
        >
          {FROM_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>

        <span style={{ fontSize: 13, color: 'var(--text-secondary)', minWidth: 20 }}>
          {t('notifications.dndTo')}
        </span>
        <select
          value={settings.to}
          onChange={(e) => onChangeTo(e.target.value)}
          disabled={disabled}
          style={selectStyle}
          aria-label={t('notifications.dndTo')}
        >
          {TO_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>

        {/* Weekend toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
          <Toggle
            checked={settings.weekend}
            onChange={onChangeWeekend}
            disabled={disabled}
          />
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {t('notifications.dndWeekends')}
          </span>
        </div>
      </div>

      {/* Note */}
      <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
        {t('notifications.dndNote')}
      </p>
    </div>
  );
});
