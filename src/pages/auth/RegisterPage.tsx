import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useAuthStore } from '@/shared/store/auth';
import { getApiError } from '@/shared/lib/getApiError';
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

const passwordInputStyle: React.CSSProperties = {
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
};

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

  const [firstNameFocused, setFirstNameFocused] = useState(false);
  const [lastNameFocused, setLastNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [phoneFocused, setPhoneFocused] = useState(false);

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
          {t('auth.register.title')}
        </h2>
        <p style={{ fontSize: 13, color: C.textMut }}>{t('auth.register.subtitle')}</p>
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
        <Link
          to="/login"
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
          {t('common.signIn')}
        </Link>
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
          {t('auth.register.title')}
        </div>
      </div>

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
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* First + Last name row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label htmlFor="reg-first" style={lbl}>
              {t('common.firstName')}
            </label>
            <input
              id="reg-first"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              onFocus={() => setFirstNameFocused(true)}
              onBlur={() => setFirstNameFocused(false)}
              style={darkInput(firstNameFocused)}
            />
          </div>
          <div>
            <label htmlFor="reg-last" style={lbl}>
              {t('common.lastName')}
            </label>
            <input
              id="reg-last"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              onFocus={() => setLastNameFocused(true)}
              onBlur={() => setLastNameFocused(false)}
              style={darkInput(lastNameFocused)}
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label htmlFor="reg-email" style={lbl}>
            Email
          </label>
          <input
            id="reg-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={() => setEmailFocused(true)}
            onBlur={() => setEmailFocused(false)}
            placeholder="you@example.com"
            style={darkInput(emailFocused)}
          />
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="reg-phone" style={lbl}>
            {t('common.phone')}{' '}
            <span style={{ color: C.textMut }}>{t('common.optional')}</span>
          </label>
          <input
            id="reg-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onFocus={() => setPhoneFocused(true)}
            onBlur={() => setPhoneFocused(false)}
            style={darkInput(phoneFocused)}
          />
        </div>

        {/* Password */}
        <div>
          <label htmlFor="reg-pass" style={lbl}>
            {t('common.password')}
          </label>
          <AuthPasswordField
            id="reg-pass"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={passwordInputStyle}
          />
        </div>

        {/* Password confirm */}
        <div>
          <label htmlFor="reg-pass2" style={lbl}>
            {t('auth.register.passwordAgain')}
          </label>
          <AuthPasswordField
            id="reg-pass2"
            required
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            autoComplete="new-password"
            style={passwordInputStyle}
          />
        </div>

        {/* After-register note */}
        <p style={{ fontSize: 11, color: C.textMut, lineHeight: 1.6 }}>
          {t('auth.register.afterRegister')}
        </p>

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
          {loading ? t('auth.register.submitting') : t('auth.register.submit')}
        </button>
      </form>
    </div>
  );
}
