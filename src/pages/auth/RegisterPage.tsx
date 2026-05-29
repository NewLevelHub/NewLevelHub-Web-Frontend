import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useAuthStore } from '@/shared/store/auth';
import { getApiError } from '@/shared/lib/getApiError';
import { authInput, authLabel, authPrimaryBtn, authLink } from '@/shared/ui/authFormStyles';
import { AuthPasswordField } from '@/shared/ui/AuthPasswordField';

export default function RegisterPage() {
  const { t } = useTranslation();
  const register = useAuthStore((s) => s.register);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== passwordConfirm) {
      setError(t('auth.register.passwordsMismatch'));
      return;
    }
    if (password.length < 8) {
      setError(t('auth.register.passwordMin'));
      return;
    }
    const tld = email.trim().split('@')[1]?.split('.').pop() ?? '';
    if (!/^[a-zA-Z]{2,}$/.test(tld)) {
      setError(t('auth.register.invalidEmail'));
      return;
    }
    setLoading(true);
    try {
      await register({
        email: email.trim(),
        password,
        password_confirm: passwordConfirm,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
      });
    } catch (err) {
      setError(getApiError(err).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 className="mb-1 text-center text-xl font-semibold">{t('auth.register.title')}</h2>
      <p className="mb-6 text-center text-sm text-muted">{t('auth.register.subtitle')}</p>

      <form onSubmit={handleSubmit} className="space-y-3">
        {error ? (
          <div className="rounded-lg border border-red-200 bg-danger-subtle px-3 py-2 text-sm text-danger dark:border-red-900/40">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="reg-first" className={authLabel}>{t('common.firstName')}</label>
            <input
              id="reg-first"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={authInput}
            />
          </div>
          <div>
            <label htmlFor="reg-last" className={authLabel}>{t('common.lastName')}</label>
            <input
              id="reg-last"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={authInput}
            />
          </div>
        </div>

        <div>
          <label htmlFor="reg-email" className={authLabel}>
            Email
          </label>
          <input
            id="reg-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={authInput}
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="reg-phone" className={authLabel}>
            Телефон <span className="text-gray-600">{t('common.optional')}</span>
          </label>
          <input
            id="reg-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={authInput}
          />
        </div>

        <div>
          <label htmlFor="reg-pass" className={authLabel}>{t('common.password')}</label>
          <AuthPasswordField
            id="reg-pass"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="reg-pass2" className={authLabel}>{t('auth.register.passwordAgain')}</label>
          <AuthPasswordField
            id="reg-pass2"
            required
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            autoComplete="new-password"
          />
        </div>

        <p className="text-xs text-muted">
          После регистрации на почту уйдёт ссылка для подтверждения (локально смотри логи бэкенда при
          console email).
        </p>

        <button type="submit" disabled={loading} className={authPrimaryBtn}>
          {loading ? t('auth.register.submitting') : t('auth.register.submit')}
        </button>
      </form>

      <p className="mt-6 text-center">
        <Link to="/login" className={authLink}>{t('auth.register.hasAccount')}</Link>
      </p>
    </div>
  );
}
