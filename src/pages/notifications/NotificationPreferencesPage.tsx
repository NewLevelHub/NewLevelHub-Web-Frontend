import { useQueryClient } from '@tanstack/react-query';

import { useNotificationSettings } from '@/pages/notifications/hooks/useNotificationSettings';
import { DoNotDisturbCard } from '@/pages/notifications/components/DoNotDisturbCard';
import { PreferencesTable } from '@/pages/notifications/components/PreferencesTable';
import { PreferencesSkeleton } from '@/pages/notifications/components/PreferencesSkeleton';

export default function NotificationPreferencesPage() {
  const queryClient = useQueryClient();
  const { preferences, isLoading, isError, pendingKeys, handleToggle } = useNotificationSettings();

  return (
    <div className="min-h-screen bg-surface px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-primary">Настройки уведомлений</h1>
          <p className="mt-1 text-sm text-secondary">
            Управляйте тем, какие уведомления вы получаете и по каким каналам.
          </p>
        </div>
        {isLoading && (
          <div
            className="h-24 rounded-xl bg-raised animate-pulse"
            aria-busy="true"
            aria-label="Загрузка настроек режима «Не беспокоить»"
          />
        )}
        {preferences && (
          <DoNotDisturbCard
            initialEnabled={preferences.dnd_enabled}
            initialUntil={preferences.dnd_until}
            onSaved={() => queryClient.invalidateQueries({ queryKey: ['notification-preferences'] })}
          />
        )}
        <section
          className="rounded-xl border border-default bg-raised p-6"
          aria-labelledby="prefs-heading"
        >
          <h2 id="prefs-heading" className="text-base font-semibold text-primary mb-6">
            Типы уведомлений
          </h2>
          {isLoading && <PreferencesSkeleton />}
          {isError && (
            <p className="text-sm text-red-400" role="alert">
              Не удалось загрузить настройки уведомлений. Попробуйте обновить страницу.
            </p>
          )}
          {preferences && (
            <PreferencesTable
              preferences={preferences}
              pendingKeys={pendingKeys}
              onToggle={handleToggle}
            />
          )}
        </section>
      </div>
    </div>
  );
}
