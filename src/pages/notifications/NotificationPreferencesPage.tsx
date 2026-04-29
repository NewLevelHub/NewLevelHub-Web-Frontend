import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, BellOff } from 'lucide-react';
import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { cn } from '@/shared/lib/cn';
import type { NotificationPreferences, NotificationType } from '@/shared/types';

// ── Label map ────────────────────────────────────────────────────────────────

const NOTIFICATION_LABELS: Record<NotificationType, string> = {
  booking_confirmed: 'Бронирование подтверждено',
  booking_reminder: 'Напоминание о бронировании',
  booking_cancelled: 'Бронирование отменено',
  task_assigned: 'Задача назначена',
  task_moved: 'Задача перемещена',
  task_comment: 'Комментарий к задаче',
  task_deadline: 'Дедлайн задачи',
  guest_validated: 'Гость подтверждён',
  guest_pass_expiring: 'Пропуск гостя истекает',
  service_request_update: 'Обновление заявки',
  announcement: 'Объявление',
  invitation: 'Приглашение',
  leave_review: 'Проверка отпуска',
  system: 'Системное',
};

const ALL_TYPES = Object.keys(NOTIFICATION_LABELS) as NotificationType[];

// ── Toggle ────────────────────────────────────────────────────────────────────

interface ToggleProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

function Toggle({ checked, onChange, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
        'disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-blue-600' : 'bg-gray-600',
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition-transform',
          checked ? 'translate-x-4' : 'translate-x-0',
        )}
      />
    </button>
  );
}

// ── DND Section ───────────────────────────────────────────────────────────────

interface DndPayload {
  enabled: boolean;
  until?: string;
}

interface DoNotDisturbCardProps {
  initialEnabled: boolean;
  initialUntil: string | null;
  onSaved: () => void;
}

function DoNotDisturbCard({ initialEnabled, initialUntil, onSaved }: DoNotDisturbCardProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [until, setUntil] = useState(() => {
    if (initialUntil) {
      return new Date(initialUntil).toLocaleString('sv').slice(0, 16);
    }
    return '';
  });
  const [success, setSuccess] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (payload: DndPayload) =>
      apiClient.post(API.notifications.doNotDisturb, payload).then((r) => r.data),
    onSuccess: () => {
      setSuccess(true);
      setFieldError(null);
      setGeneralError(null);
      onSaved();
    },
    onError: (error: unknown) => {
      setSuccess(false);
      const detail = (error as { response?: { data?: { detail?: Record<string, string[]> } } })
        ?.response?.data?.detail;
      if (detail?.dnd_until?.length) {
        setFieldError('Укажите дату и время в будущем.');
        setGeneralError(null);
      } else {
        setFieldError(null);
        setGeneralError('Не удалось сохранить настройки. Попробуйте снова.');
      }
    },
  });

  function handleSave() {
    setSuccess(false);
    setFieldError(null);
    setGeneralError(null);
    const payload: DndPayload = { enabled };
    if (enabled && until) {
      payload.until = new Date(until).toISOString();
    }
    mutation.mutate(payload);
  }

  return (
    <section
      className="rounded-xl border border-gray-700 bg-gray-800 p-6"
      aria-labelledby="dnd-heading"
    >
      <div className="flex items-center gap-3 mb-4">
        {enabled ? (
          <BellOff className="h-5 w-5 text-blue-400" aria-hidden="true" />
        ) : (
          <Bell className="h-5 w-5 text-gray-400" aria-hidden="true" />
        )}
        <h2 id="dnd-heading" className="text-base font-semibold text-white">
          Режим «Не беспокоить»
        </h2>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <Toggle
          checked={enabled}
          onChange={(v) => {
            setEnabled(v);
            setFieldError(null);
            setGeneralError(null);
            setSuccess(false);
          }}
          disabled={mutation.isPending}
        />
        <span className="text-sm text-gray-300">
          {enabled ? 'Включён' : 'Выключен'}
        </span>
      </div>

      {initialEnabled && (
        <p className="text-sm text-amber-400 mb-4">
          {initialUntil
            ? `Активен до: ${new Date(initialUntil).toLocaleString('ru')}`
            : 'Активен без ограничения по времени'}
        </p>
      )}

      {enabled && (
        <div className="mb-4">
          <label
            htmlFor="dnd-until"
            className="block text-sm text-gray-400 mb-1"
          >
            До (необязательно)
          </label>
          {(() => {
            const nowLocal = new Date(Date.now() + 60_000).toLocaleString('sv').slice(0, 16);
            return (
              <>
                <input
                  id="dnd-until"
                  type="datetime-local"
                  value={until}
                  min={nowLocal}
                  onChange={(e) => { setUntil(e.target.value); setFieldError(null); }}
                  className={cn(
                    'rounded-lg border bg-gray-700 px-3 py-2 text-sm text-white [color-scheme:dark]',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50',
                    fieldError ? 'border-red-500' : 'border-gray-600',
                  )}
                  disabled={mutation.isPending}
                />
                {fieldError && (
                  <p className="mt-1 text-xs text-red-400" role="alert">{fieldError}</p>
                )}
              </>
            );
          })()}
        </div>
      )}

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={mutation.isPending}
          className={cn(
            'rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white',
            'hover:bg-blue-500 transition-colors',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
          )}
        >
          {mutation.isPending ? 'Сохранение…' : 'Сохранить'}
        </button>

        {success && (
          <span className="text-sm text-green-400" role="status">Настройки сохранены</span>
        )}
        {generalError && (
          <span className="text-sm text-red-400" role="alert">{generalError}</span>
        )}
      </div>
    </section>
  );
}

// ── Preferences Table ─────────────────────────────────────────────────────────

function PreferencesSkeleton() {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Загрузка настроек">
      {Array.from({ length: 14 }).map((_, i) => (
        <div key={i} className="h-10 rounded bg-gray-800 animate-pulse" />
      ))}
    </div>
  );
}

interface PreferencesTableProps {
  preferences: NotificationPreferences;
  pendingKeys: Set<string>;
  onToggle: (type: NotificationType, field: 'in_app' | 'email', value: boolean) => void;
}

function PreferencesTable({ preferences, pendingKeys, onToggle }: PreferencesTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" role="table" aria-label="Настройки уведомлений">
        <thead>
          <tr className="border-b border-gray-700">
            <th
              scope="col"
              className="py-3 pr-6 text-left text-xs font-medium uppercase tracking-wider text-gray-400"
            >
              Тип уведомления
            </th>
            <th
              scope="col"
              className="py-3 px-6 text-center text-xs font-medium uppercase tracking-wider text-gray-400"
            >
              В приложении
            </th>
            <th
              scope="col"
              className="py-3 pl-6 text-center text-xs font-medium uppercase tracking-wider text-gray-400"
            >
              Email
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700/50">
          {ALL_TYPES.map((type) => {
            const entry = preferences[type];
            const inAppKey = `${type}:in_app`;
            const emailKey = `${type}:email`;
            return (
              <tr key={type} className="hover:bg-gray-700/30 transition-colors">
                <td className="py-3 pr-6 text-gray-300">
                  {NOTIFICATION_LABELS[type]}
                </td>
                <td className="py-3 px-6 text-center">
                  <div className="flex justify-center">
                    <Toggle
                      checked={entry?.in_app ?? false}
                      onChange={(v) => onToggle(type, 'in_app', v)}
                      disabled={pendingKeys.has(inAppKey)}
                    />
                  </div>
                </td>
                <td className="py-3 pl-6 text-center">
                  <div className="flex justify-center">
                    <Toggle
                      checked={entry?.email ?? false}
                      onChange={(v) => onToggle(type, 'email', v)}
                      disabled={pendingKeys.has(emailKey)}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function NotificationPreferencesPage() {
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
    console.log('Toggling', key, 'to', value);
    addPending(key);
    const currentEntry =
      queryClient.getQueryData<NotificationPreferences>(['notification-preferences'])?.[type] ??
      { in_app: false, email: false };
    mutation.mutate(
      { [type]: { ...currentEntry, [field]: value } } as Partial<NotificationPreferences>,
      { onSettled: () => removePending(key) },
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-8">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Настройки уведомлений</h1>
          <p className="mt-1 text-sm text-gray-400">
            Управляйте тем, какие уведомления вы получаете и по каким каналам.
          </p>
        </div>

        {/* Do Not Disturb */}
        {isLoading && (
          <div className="h-24 rounded-xl bg-gray-800 animate-pulse" aria-busy="true" aria-label="Загрузка настроек режима «Не беспокоить»" />
        )}
        {preferences && (
          <DoNotDisturbCard
            initialEnabled={preferences.dnd_enabled}
            initialUntil={preferences.dnd_until}
            onSaved={() => queryClient.invalidateQueries({ queryKey: ['notification-preferences'] })}
          />
        )}

        {/* Preferences table */}
        <section
          className="rounded-xl border border-gray-700 bg-gray-800 p-6"
          aria-labelledby="prefs-heading"
        >
          <h2 id="prefs-heading" className="text-base font-semibold text-white mb-6">
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
