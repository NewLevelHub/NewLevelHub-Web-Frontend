import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { getApiError } from '@/shared/lib/getApiError';
import { AuthPasswordField } from '@/shared/ui/AuthPasswordField';
import { cn } from '@/shared/lib/cn';

interface AlertProps {
  type: 'success' | 'error';
  message: string;
}

function Alert({ type, message }: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        'rounded-lg px-4 py-3 text-sm font-medium',
        type === 'success' && 'bg-green-50 text-green-800 border border-green-200',
        type === 'error' && 'bg-red-50 text-red-800 border border-red-200',
      )}
    >
      {message}
    </div>
  );
}

const EMPTY_FORM = { current_password: '', new_password: '', confirm_password: '' };

export function ChangePasswordSection() {
  const { t } = useTranslation();

  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const mutation = useMutation({
    mutationFn: (payload: { current_password: string; new_password: string }) =>
      apiClient.post(API.auth.changePassword, payload),
    onSuccess: () => {
      setForm(EMPTY_FORM);
      setFieldErrors({});
      setAlert({ type: 'success', message: t('profile.changePasswordSuccess') });
    },
    onError: (err) => {
      const apiErr = getApiError(err);
      const fields: Record<string, string> = {};
      for (const [key, messages] of Object.entries(apiErr.fields)) {
        fields[key] = Array.isArray(messages) ? messages[0] : String(messages);
      }
      setFieldErrors(fields);
      if (Object.keys(fields).length === 0) {
        setAlert({ type: 'error', message: apiErr.message || t('profile.changePasswordError') });
      } else {
        setAlert(null);
      }
    },
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    setAlert(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.new_password !== form.confirm_password) {
      setFieldErrors({ confirm_password: t('profile.passwordsMismatch') });
      return;
    }
    setFieldErrors({});
    setAlert(null);
    mutation.mutate({ current_password: form.current_password, new_password: form.new_password });
  }

  return (
    <section
      className="bg-surface rounded-2xl shadow-sm border border-default p-6 space-y-4"
      aria-label={t('profile.changePasswordTitle')}
    >
      <h2 className="text-base font-semibold text-primary">{t('profile.changePasswordTitle')}</h2>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {alert && <Alert type={alert.type} message={alert.message} />}

        <div>
          <label htmlFor="current_password" className="block text-sm font-medium text-gray-700 mb-1">
            {t('profile.currentPassword')}
          </label>
          <AuthPasswordField
            id="current_password"
            name="current_password"
            value={form.current_password}
            onChange={handleChange}
            autoComplete="current-password"
            required
          />
          {fieldErrors.current_password && (
            <p className="mt-1 text-sm text-red-600">{fieldErrors.current_password}</p>
          )}
        </div>

        <div>
          <label htmlFor="new_password" className="block text-sm font-medium text-gray-700 mb-1">
            {t('profile.newPassword')}
          </label>
          <AuthPasswordField
            id="new_password"
            name="new_password"
            value={form.new_password}
            onChange={handleChange}
            autoComplete="new-password"
            required
            minLength={8}
          />
          {fieldErrors.new_password && (
            <p className="mt-1 text-sm text-red-600">{fieldErrors.new_password}</p>
          )}
        </div>

        <div>
          <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700 mb-1">
            {t('profile.confirmPassword')}
          </label>
          <AuthPasswordField
            id="confirm_password"
            name="confirm_password"
            value={form.confirm_password}
            onChange={handleChange}
            autoComplete="new-password"
            required
            minLength={8}
          />
          {fieldErrors.confirm_password && (
            <p className="mt-1 text-sm text-red-600">{fieldErrors.confirm_password}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={mutation.isPending}
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors',
            mutation.isPending && 'opacity-60 cursor-not-allowed',
          )}
        >
          {mutation.isPending ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
              {t('profile.changingPassword')}
            </>
          ) : (
            t('profile.changePasswordBtn')
          )}
        </button>
      </form>
    </section>
  );
}
