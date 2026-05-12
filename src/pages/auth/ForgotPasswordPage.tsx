import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { useMutation } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { getApiErrorMessage } from '@/shared/lib/apiError';
import { authInput, authLabel, authPrimaryBtn, authLink } from '@/shared/ui/authFormStyles';

function getForgotPasswordError(error: unknown): string {
  const axiosErr = error as AxiosError;
  if (axiosErr.response?.status === 429) {
    return 'Слишком много попыток. Попробуйте через 15 минут.';
  }
  return getApiErrorMessage(error, 'Не удалось отправить письмо');
}

export default function ForgotPasswordPage() {
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
        <h2 className="mb-1 text-center text-xl font-semibold">Письмо отправлено</h2>
        <p className="mb-6 text-center text-sm text-muted">
          Если аккаунт с таким email существует, мы отправили ссылку для сброса пароля.
        </p>
        <p className="text-center text-sm text-secondary">
          Проверьте папку «Входящие» и «Спам».
        </p>
        <p className="mt-6 text-center">
          <Link to="/login" className={authLink}>
            Вернуться к входу
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-1 text-center text-xl font-semibold">Восстановление пароля</h2>
      <p className="mb-6 text-center text-sm text-muted">
        Введите email — мы отправим ссылку для сброса пароля
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mutation.isError ? (
          <div className="rounded-lg border border-red-200 bg-danger-subtle px-3 py-2 text-sm text-danger dark:border-red-900/40">
            {getForgotPasswordError(mutation.error)}
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
          {mutation.isPending ? 'Отправка…' : 'Отправить ссылку'}
        </button>
      </form>

      <p className="mt-6 text-center">
        <Link to="/login" className={authLink}>
          Вернуться к входу
        </Link>
      </p>
    </div>
  );
}
