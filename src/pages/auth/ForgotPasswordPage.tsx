import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { getApiError } from '@/shared/lib/getApiError';
import { authInput, authLabel, authPrimaryBtn, authLink } from '@/shared/ui/authFormStyles';

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const mutation = useMutation({
    mutationFn: (email: string) =>
      apiClient.post(API.auth.forgotPassword, { email }),
    onSuccess: () => {
      setSubmitted(true);
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    mutation.mutate(email.trim());
  }

  if (submitted) {
    return (
      <div>
        <h2 className="mb-1 text-center text-xl font-semibold">{t('auth.forgot.sentTitle')}</h2>
        <p className="mb-6 text-center text-sm text-muted">{t('auth.forgot.sentSubtitle')}</p>
        <p className="text-center text-sm text-secondary">{t('auth.forgot.checkSpam')}</p>
        <p className="mt-6 text-center">
          <Link to="/login" className={authLink}>{t('auth.forgot.backToLogin')}</Link>
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-1 text-center text-xl font-semibold">{t('auth.forgot.title')}</h2>
      <p className="mb-6 text-center text-sm text-muted">{t('auth.forgot.subtitle')}</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mutation.isError ? (
          <div className="rounded-lg border border-red-200 bg-danger-subtle px-3 py-2 text-sm text-danger dark:border-red-900/40">
            {getApiError(mutation.error).message}
          </div>
        ) : null}

        <div>
          <label htmlFor="forgot-email" className={authLabel}>
            Email
          </label>
          <input
            id="forgot-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={authInput}
            placeholder="you@example.com"
          />
        </div>

        <button type="submit" disabled={mutation.isPending} className={authPrimaryBtn}>
          {mutation.isPending ? t('common.submitting') : t('auth.forgot.submit')}
        </button>
      </form>

      <p className="mt-6 text-center">
        <Link to="/login" className={authLink}>{t('auth.forgot.backToLogin')}</Link>
      </p>
    </div>
  );
}
