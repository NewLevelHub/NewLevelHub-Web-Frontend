import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { Eye, EyeOff } from 'lucide-react';
import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { getApiError } from '@/shared/lib/getApiError';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/Button';

// ---------------------------------------------------------------------------
// Shared styles (mirrors personal data section in ProfilePage)
// ---------------------------------------------------------------------------

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  height: 36,
  padding: '0 36px 0 12px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border)',
  background: 'var(--bg-surface)',
  color: 'var(--text-primary)',
  fontSize: 14,
  outline: 'none',
  fontFamily: 'inherit',
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: 'var(--text-secondary)',
  display: 'block',
  marginBottom: 6,
};

// ---------------------------------------------------------------------------
// PasswordInput — native input with show/hide eye toggle
// ---------------------------------------------------------------------------

interface PasswordInputProps {
  id: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
}

function PasswordInput({ id, name, value, onChange, autoComplete, required, minLength }: PasswordInputProps) {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);

  return (
    <div style={{ position: 'relative' }}>
      <input
        id={id}
        name={name}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        style={inputStyle}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        style={{
          position: 'absolute',
          right: 10,
          top: '50%',
          transform: 'translateY(-50%)',
          color: 'var(--text-muted)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          display: 'flex',
        }}
        tabIndex={-1}
        aria-label={show ? t('common.hidePassword') : t('common.showPassword')}
      >
        {show ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Alert
// ---------------------------------------------------------------------------

interface AlertProps {
  type: 'success' | 'error';
  message: string;
}

function Alert({ type, message }: AlertProps) {
  return (
    <div
      role="alert"
      className="rounded-lg px-4 py-3 text-sm font-medium"
      style={
        type === 'success'
          ? { background: 'var(--success-bg)', color: 'var(--success-text)', border: '1px solid var(--success)' }
          : { background: 'var(--danger-bg)', color: 'var(--danger-text)', border: '1px solid var(--danger)' }
      }
    >
      {message}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Password strength meter
// ---------------------------------------------------------------------------

function getStrengthLevel(password: string): 0 | 1 | 2 | 3 {
  if (password.length === 0) return 0;
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;
  if (score <= 2) return 1;
  if (score <= 4) return 2;
  return 3;
}

interface StrengthMeterProps {
  password: string;
}

function PasswordStrengthMeter({ password }: StrengthMeterProps) {
  const { t } = useTranslation();
  const level = getStrengthLevel(password);

  const activeSegmentColor =
    level === 1 ? 'var(--danger)' : level === 2 ? '#f97316' : 'var(--success)';

  const segmentColor = (index: number): string => {
    if (level === 0 || level < index) return 'var(--border)';
    return activeSegmentColor;
  };

  const labelText =
    level === 0
      ? ''
      : level === 1
        ? t('profile.passwordStrengthLow')
        : level === 2
          ? t('profile.passwordStrengthMedium')
          : t('profile.passwordStrengthHigh');

  const labelColor =
    level === 1
      ? 'var(--danger-text)'
      : level === 2
        ? '#f97316'
        : level === 3
          ? 'var(--success-text)'
          : 'var(--text-muted)';

  return (
    <div className="mt-2 flex items-center gap-2">
      <div className="flex flex-1 gap-1">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full transition-colors duration-200"
            style={{ background: segmentColor(i) }}
          />
        ))}
      </div>
      {labelText && (
        <span className="shrink-0 text-xs font-medium" style={{ color: labelColor }}>
          {labelText}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section
// ---------------------------------------------------------------------------

const EMPTY_FORM = { current_password: '', new_password: '', confirm_password: '' };

export function ChangePasswordSection() {
  const { t } = useTranslation();

  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const mutation = useMutation({
    mutationFn: (payload: { current_password: string; new_password: string }) =>
      apiClient.post(API.auth.changePassword, payload),
    onSuccess: () => {
      setForm(EMPTY_FORM);
      setFieldErrors({});
      setIsOpen(false);
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

  function handleToggle() {
    if (isOpen) {
      setIsOpen(false);
      setForm(EMPTY_FORM);
      setFieldErrors({});
      setAlert(null);
    } else {
      setIsOpen(true);
      setAlert(null);
    }
  }

  return (
    <section
      className="bg-surface rounded-2xl shadow-sm border border-default p-6"
      aria-label={t('profile.changePasswordTitle')}
    >
      {/* Header row with collapsible toggle */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-primary">{t('profile.changePasswordTitle')}</h2>
        <button
          type="button"
          onClick={handleToggle}
          className={cn(
            'inline-flex items-center gap-1.5 h-8 px-3 text-sm font-medium rounded-[var(--radius-sm)] transition-colors',
            isOpen
              ? 'text-secondary hover:bg-raised'
              : 'text-brand hover:bg-brand-subtle',
          )}
        >
          {isOpen ? t('profile.changePasswordCollapse') : t('profile.changePasswordExpand')}
        </button>
      </div>

      {/* Success alert shown outside form (after collapse) */}
      {!isOpen && alert?.type === 'success' && (
        <div className="mt-4">
          <Alert type="success" message={alert.message} />
        </div>
      )}

      {/* Description shown when collapsed and no success alert */}
      {!isOpen && alert?.type !== 'success' && (
        <p style={{ fontSize: 12, color: 'var(--text-muted)', paddingTop: 8 }}>
          {t('profile.changePasswordDesc')}
        </p>
      )}

      {/* Collapsible form */}
      {isOpen && (
        <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-4">
          {alert && <Alert type={alert.type} message={alert.message} />}

          <div>
            <label htmlFor="current_password" style={labelStyle}>
              {t('profile.currentPassword')}
            </label>
            <PasswordInput
              id="current_password"
              name="current_password"
              value={form.current_password}
              onChange={handleChange}
              autoComplete="current-password"
              required
            />
            {fieldErrors.current_password && (
              <p className="mt-1 text-sm" style={{ color: 'var(--danger)' }}>
                {fieldErrors.current_password}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="new_password" style={labelStyle}>
              {t('profile.newPassword')}
            </label>
            <PasswordInput
              id="new_password"
              name="new_password"
              value={form.new_password}
              onChange={handleChange}
              autoComplete="new-password"
              required
              minLength={8}
            />
            <PasswordStrengthMeter password={form.new_password} />
            {fieldErrors.new_password && (
              <p className="mt-1 text-sm" style={{ color: 'var(--danger)' }}>
                {fieldErrors.new_password}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="confirm_password" style={labelStyle}>
              {t('profile.confirmPassword')}
            </label>
            <PasswordInput
              id="confirm_password"
              name="confirm_password"
              value={form.confirm_password}
              onChange={handleChange}
              autoComplete="new-password"
              required
              minLength={8}
            />
            {fieldErrors.confirm_password && (
              <p className="mt-1 text-sm" style={{ color: 'var(--danger)' }}>
                {fieldErrors.confirm_password}
              </p>
            )}
          </div>

          <Button
            type="submit"
            variant="primary"
            size="sm"
            loading={mutation.isPending}
          >
            {mutation.isPending ? t('profile.changingPassword') : t('profile.changePasswordBtn')}
          </Button>
        </form>
      )}
    </section>
  );
}
