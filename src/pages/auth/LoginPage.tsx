import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router';
import { useAuthStore } from '@/shared/store/auth';
import { getApiError } from '@/shared/lib/getApiError';
import { clearSessionExpiredState, consumeLoginNoticeKey } from '@/shared/lib/sessionManager';
import { AuthPasswordField } from '@/shared/ui/AuthPasswordField';

const C = {
  brand: '#059669',
  brandL: '#34d399',
  border: 'rgba(5,150,105,0.18)',
  borderFocus: '#059669',
  text: '#e8f5ee',
  textSub: '#8bbfa0',
  textMut: '#4d7a60',
} as const;

const lbl: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: C.textSub,
  display: 'block',
  marginBottom: 6,
};

function darkInput(focused: boolean): React.CSSProperties {
  return {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 9,
    border: `1px solid ${focused ? C.borderFocus : C.border}`,
    background: 'rgba(255,255,255,0.04)',
    color: C.text,
    fontSize: 14,
    fontFamily: 'inherit',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxShadow: focused ? '0 0 0 3px rgba(5,150,105,0.15)' : 'none',
    boxSizing: 'border-box',
  };
}

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
  const [emailFocused, setEmailFocused] = useState(false);

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
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h2
          style={{
            fontSize: 24,
            fontWeight: 800,
            color: '#fff',
            letterSpacing: '-0.025em',
            marginBottom: 6,
          }}
        >
          {t('auth.login.title')}
        </h2>
        <p style={{ fontSize: 13, color: C.textMut }}>{t('auth.login.subtitle')}</p>
      </div>

      {/* Tab switcher */}
      <div
        style={{
          display: 'flex',
          background: 'rgba(255,255,255,0.04)',
          borderRadius: 9,
          padding: 3,
          marginBottom: 28,
          border: `1px solid ${C.border}`,
        }}
      >
        <div
          style={{
            flex: 1,
            padding: '8px',
            borderRadius: 7,
            textAlign: 'center',
            background: C.brand,
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {t('common.signIn')}
        </div>
        <Link
          to="/register"
          style={{
            flex: 1,
            padding: '8px',
            borderRadius: 7,
            textAlign: 'center',
            color: C.textMut,
            fontSize: 13,
            textDecoration: 'none',
            display: 'block',
          }}
        >
          {t('auth.register.title')}
        </Link>
      </div>

      {/* Notice banner */}
      {notice ? (
        <div
          style={{
            marginBottom: 16,
            padding: '10px 14px',
            borderRadius: 9,
            background: isSessionNotice ? 'rgba(251,191,36,0.08)' : 'rgba(52,211,153,0.08)',
            border: `1px solid ${isSessionNotice ? 'rgba(251,191,36,0.3)' : 'rgba(52,211,153,0.3)'}`,
            fontSize: 13,
            color: isSessionNotice ? '#fbbf24' : C.brandL,
          }}
        >
          {notice}
        </div>
      ) : null}

      {/* Error banner */}
      {error ? (
        <div
          style={{
            marginBottom: 16,
            padding: '10px 14px',
            borderRadius: 9,
            background: 'rgba(248,113,113,0.08)',
            border: '1px solid rgba(248,113,113,0.3)',
            fontSize: 13,
            color: '#f87171',
          }}
        >
          {error}
        </div>
      ) : null}

      {/* Form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Email */}
        <div>
          <label htmlFor="login-email" style={lbl}>
            Email
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={() => setEmailFocused(true)}
            onBlur={() => setEmailFocused(false)}
            placeholder="you@example.com"
            style={darkInput(emailFocused)}
          />
        </div>

        {/* Password */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <label htmlFor="login-password" style={{ ...lbl, marginBottom: 0 }}>
              {t('common.password')}
            </label>
            <Link
              to="/forgot-password"
              style={{ fontSize: 11, color: C.brand, textDecoration: 'none' }}
            >
              {t('auth.login.forgotPassword')}
            </Link>
          </div>
          <AuthPasswordField
            id="login-password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(5,150,105,0.18)',
              color: '#e8f5ee',
              borderRadius: 9,
              padding: '12px 40px 12px 14px',
              fontSize: 14,
              outline: 'none',
              width: '100%',
              boxSizing: 'border-box',
              fontFamily: 'inherit',
            }}
            inputClassName="focus:border-[#059669] focus:ring-[rgba(5,150,105,0.15)]"
          />
        </div>

        {/* Remember me */}
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 13,
            color: C.textSub,
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            style={{ width: 14, height: 14 }}
          />
          {t('common.rememberMe')}
        </label>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: 13,
            borderRadius: 9,
            border: 'none',
            background: loading
              ? 'rgba(5,150,105,0.5)'
              : 'linear-gradient(135deg,#059669,#10b981)',
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            cursor: loading ? 'wait' : 'pointer',
            fontFamily: 'inherit',
            boxShadow: '0 6px 20px rgba(5,150,105,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          {loading ? t('common.signInLoading') : t('common.signIn')}
        </button>
      </form>

    </div>
  );
}
