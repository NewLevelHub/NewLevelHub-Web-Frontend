import { useTranslation } from 'react-i18next';
import { useAuth } from '@/shared/hooks/useAuth';
import { USER_ROLE_LABEL_KEYS } from '@/shared/config/constants';
import { useNotificationPreferences } from '@/features/notifications/preferences/useNotificationPreferences';
import { DoNotDisturbCard } from '@/pages/notifications/components/DoNotDisturbCard';
import { PreferencesTable } from '@/pages/notifications/components/PreferencesTable';
import { PreferencesSkeleton } from '@/pages/notifications/components/PreferencesSkeleton';

// ---------------------------------------------------------------------------
// Button styles
// ---------------------------------------------------------------------------

const ghostBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--border)',
  color: 'var(--text-secondary)',
  borderRadius: 8,
  padding: '7px 14px',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'background 0.15s, color 0.15s',
};

const primaryBtnStyle: React.CSSProperties = {
  background: 'var(--brand)',
  border: 'none',
  color: 'var(--text-on-brand)',
  borderRadius: 8,
  padding: '7px 16px',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'opacity 0.15s',
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function NotificationPreferencesPage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const {
    isLoading,
    isError,
    localPrefs,
    toggle,
    groupToggle,
    disableAll,
    enableAll,
    allDisabled,
    save,
    isSaving,
    isSaved,
    total,
    activeCount,
    pushActive,
    emailActive,
    visibleTotal,
    groupedData,
    dndSettings,
    setDndEnabled,
    setDndFrom,
    setDndTo,
    setDndWeekend,
    saveDnd,
    isDndSaving,
    isDndSaved,
  } = useNotificationPreferences();

  const roleKey = user?.role ? USER_ROLE_LABEL_KEYS[user.role] : '';
  const roleLabel = roleKey ? t(roleKey) : '';

  return (
    <main style={{ padding: '24px 24px 48px', maxWidth: 860, margin: '0 auto' }}>
      {/* Page header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 20,
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            {t('notifications.settingsTitle')}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4, margin: '4px 0 0' }}>
            {t('notifications.activeCount', { total, active: activeCount })}
            {roleLabel ? ` · ${roleLabel}` : ''}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={allDisabled ? enableAll : disableAll}
            style={ghostBtnStyle}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            }}
          >
            {allDisabled ? t('notifications.enableAll') : t('notifications.disableAll')}
          </button>
          <button
            type="button"
            onClick={save}
            disabled={isSaving}
            style={{ ...primaryBtnStyle, opacity: isSaving ? 0.7 : 1, cursor: isSaving ? 'not-allowed' : 'pointer' }}
          >
            {isSaving ? t('common.saving') : t('notifications.saveSettings')}
          </button>
        </div>
      </div>

      {/* Saved feedback */}
      {isSaved && (
        <p style={{ fontSize: 13, color: 'var(--success)', marginBottom: 12 }} role="status">
          {t('notifications.saved')}
        </p>
      )}

      {/* Error feedback */}
      {isError && (
        <p style={{ fontSize: 13, color: 'var(--danger)', marginBottom: 12 }} role="alert">
          {t('notifications.loadError')}
        </p>
      )}

      {/* DND Card */}
      <DoNotDisturbCard
        settings={dndSettings}
        onToggle={setDndEnabled}
        onChangeFrom={setDndFrom}
        onChangeTo={setDndTo}
        onChangeWeekend={setDndWeekend}
        onSave={saveDnd}
        isSaving={isDndSaving}
        isSaved={isDndSaved}
      />

      {/* Preferences Table */}
      {isLoading ? (
        <PreferencesSkeleton />
      ) : (
        <PreferencesTable
          groupedData={groupedData}
          prefs={localPrefs}
          onToggle={toggle}
          onGroupToggle={groupToggle}
          onSave={save}
          isSaving={isSaving}
          pushActive={pushActive}
          emailActive={emailActive}
          visibleTotal={visibleTotal}
        />
      )}
    </main>
  );
}
