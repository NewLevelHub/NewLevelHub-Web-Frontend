import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '@/shared/store/auth';
import { getApiErrorMessage } from '@/shared/lib/apiError';
import { authInput, authLabel, authPrimaryBtn, authLink } from '@/shared/ui/authFormStyles';

export default function RegisterPage() {
  const register = useAuthStore((s) => s.register);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== passwordConfirm) {
      setError('Пароли не совпадают');
      return;
    }
    if (password.length < 8) {
      setError('Пароль не короче 8 символов');
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
      setError(getApiErrorMessage(err, 'Не удалось зарегистрироваться'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 className="mb-1 text-center text-xl font-semibold">Регистрация</h2>
      <p className="mb-6 text-center text-sm text-gray-500">Гостевой аккаунт (роль guest)</p>

      <form onSubmit={handleSubmit} className="space-y-3">
        {error ? (
          <div className="rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="reg-first" className={authLabel}>
              Имя
            </label>
            <input
              id="reg-first"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={authInput}
            />
          </div>
          <div>
            <label htmlFor="reg-last" className={authLabel}>
              Фамилия
            </label>
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
            Телефон <span className="text-gray-600">(необязательно)</span>
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
          <label htmlFor="reg-pass" className={authLabel}>
            Пароль
          </label>
          <div className="relative">
            <input
              id="reg-pass"
              type={showPassword ? 'text' : 'password'}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${authInput} pr-10`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
              aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="reg-pass2" className={authLabel}>
            Пароль ещё раз
          </label>
          <div className="relative">
            <input
              id="reg-pass2"
              type={showPasswordConfirm ? 'text' : 'password'}
              required
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              className={`${authInput} pr-10`}
            />
            <button
              type="button"
              onClick={() => setShowPasswordConfirm((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
              aria-label={showPasswordConfirm ? 'Скрыть пароль' : 'Показать пароль'}
            >
              {showPasswordConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <p className="text-xs text-gray-500">
          После регистрации на почту уйдёт ссылка для подтверждения (локально смотри логи бэкенда при
          console email).
        </p>

        <button type="submit" disabled={loading} className={authPrimaryBtn}>
          {loading ? 'Регистрация…' : 'Зарегистрироваться'}
        </button>
      </form>

      <p className="mt-6 text-center">
        <Link to="/login" className={authLink}>
          Уже есть аккаунт — войти
        </Link>
      </p>
    </div>
  );
}
