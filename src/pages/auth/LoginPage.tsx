import { useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router';
import { useAuthStore } from '@/shared/store/auth';
import { getApiErrorMessage } from '@/shared/lib/apiError';
import { authInput, authLabel, authPrimaryBtn, authLink } from '@/shared/ui/authFormStyles';
import { AuthPasswordField } from '@/shared/ui/AuthPasswordField';

export default function LoginPage() {
  const login = useAuthStore((s) => s.login);
  const location = useLocation();
  const notice = typeof location.state === 'object' && location.state !== null ? (location.state as { notice?: string }).notice : '';

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
      setError(getApiErrorMessage(err, 'Не удалось войти'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 className="mb-1 text-center text-xl font-semibold">Вход</h2>
      <p className="mb-6 text-center text-sm text-muted">NewLevelHub — тест с бэкендом</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {notice ? (
          <div className="rounded-lg border border-green-200 bg-success-subtle px-3 py-2 text-sm text-success dark:border-green-900/40">
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
            <label htmlFor="login-password" className={authLabel}>
              Пароль
            </label>
            <Link to="/forgot-password" className={authLink}>
              Забыли пароль?
            </Link>
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
          />
          Запомнить меня
        </label>

        <button type="submit" disabled={loading} className={authPrimaryBtn}>
          {loading ? 'Вход…' : 'Войти'}
        </button>
      </form>

      <p className="mt-6 text-center">
        <Link to="/register" className={authLink}>
          Нет аккаунта — регистрация
        </Link>
      </p>
    </div>
  );
}
