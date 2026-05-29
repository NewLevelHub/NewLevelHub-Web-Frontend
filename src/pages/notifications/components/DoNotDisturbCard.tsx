import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { Bell, BellOff } from 'lucide-react';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { cn } from '@/shared/lib/cn';
import { Toggle } from '@/pages/notifications/components/Toggle';

export interface DndPayload {
  enabled: boolean;
  until?: string;
}

export interface DoNotDisturbCardProps {
  initialEnabled: boolean;
  initialUntil: string | null;
  onSaved: () => void;
}

export function DoNotDisturbCard({ initialEnabled, initialUntil, onSaved }: DoNotDisturbCardProps) {
  const { t } = useTranslation();
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
      className="rounded-xl border border-default bg-raised p-6"
      aria-labelledby="dnd-heading"
    >
      <div className="flex items-center gap-3 mb-4">
        {enabled ? (
          <BellOff className="h-5 w-5 text-blue-400" aria-hidden="true" />
        ) : (
          <Bell className="h-5 w-5 text-secondary" aria-hidden="true" />
        )}
        <h2 id="dnd-heading" className="text-base font-semibold text-primary">
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
        <span className="text-sm text-secondary">
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
            className="block text-sm text-secondary mb-1"
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
                    'rounded-lg border bg-hover px-3 py-2 text-sm text-primary [color-scheme:dark]',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50',
                    fieldError ? 'border-red-500' : 'border-default',
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
          {mutation.isPending ? t('common.saving') : t('common.save')}
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
