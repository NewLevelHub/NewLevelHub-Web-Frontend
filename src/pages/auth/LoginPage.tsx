import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router';
import { useAuthStore } from '@/shared/store/auth';
import { getApiError } from '@/shared/lib/getApiError';
import { clearSessionExpiredState, consumeLoginNoticeKey } from '@/shared/lib/sessionManager';
import { authInput, authLabel, authPrimaryBtn, authLink } from '@/shared/ui/authFormStyles';
import { AuthPasswordField } from '@/shared/ui/AuthPasswordField';

type LoginLocationState = {
  notice?: string;
  noticeKey?: string;
};

export default function LoginPage() {
  const { t } = useTranslation();
  const login = useAuthStore((s) => s.login);
  const location = useLocation();
  const [loginNotice] = useState(() => {
    const locationState =
      typeof location.state === 'object' && location.state !== null
        ? (location.state as LoginLocationState)
        : {};
    const key = locationState.noticeKey ?? consumeLoginNoticeKey();
    return {
      text: key ? '' : (locationState.notice ?? ''),
      key,
    };
  });
  const notice = loginNotice.key ? t(loginNotice.key) : loginNotice.text;
  const isSessionNotice =
    loginNotice.key === 'session.expired' || loginNotice.key === 'session.absoluteExpired';

  useEffect(() => {
    clearSessionExpiredState();
  }, []);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password, rememberMe);
    } catch (err) {
      setError(getApiError(err).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 className="mb-1 text-center text-xl font-semibold">{t('auth.login.title')}</h2>
      <p className="mb-6 text-center text-sm text-muted">{t('auth.login.subtitle')}</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {notice ? (
          <div
            className={
              isSessionNotice
                ? 'rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100'
                : 'rounded-lg border border-green-200 bg-success-subtle px-3 py-2 text-sm text-success dark:border-green-900/40'
            }
          >
            {notice}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-lg border border-red-200 bg-danger-subtle px-3 py-2 text-sm text-danger dark:border-red-900/40">
            {error}
          </div>
        ) : null}

        <div>
          <label htmlFor="login-email" className={authLabel}>
            Email
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={authInput}
            placeholder="you@example.com"
          />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label htmlFor="login-password" className={authLabel}>{t('common.password')}</label>
            <Link to="/forgot-password" className={authLink}>{t('auth.login.forgotPassword')}</Link>
          </div>
          <AuthPasswordField
            id="login-password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-300">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="h-4 w-4 rounded border-default"
          />{t('common.rememberMe')}</label>

        <button type="submit" disabled={loading} className={authPrimaryBtn}>
          {loading ? t('common.signInLoading') : t('common.signIn')}
        </button>
      </form>

      <p className="mt-6 text-center">
        <Link to="/register" className={authLink}>{t('auth.login.noAccount')}</Link>
      </p>
    </div>
  );
}
