import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { getApiError } from '@/shared/lib/getApiError';
import { authInput, authLabel, authPrimaryBtn, authLink } from '@/shared/ui/authFormStyles';

interface ResetPasswordConfirmPayload {
  token: string;
  new_password: string;
}

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get('token') ?? '';

  const [newPassword, setNewPassword] = useState('');

  const mutation = useMutation({
    mutationFn: (payload: ResetPasswordConfirmPayload) =>
      apiClient.post(API.auth.resetPassword, payload),
    onSuccess: () => {
      navigate('/login', { replace: true });
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    mutation.mutate({ token, new_password: newPassword });
  }

  if (!token) {
    return (
      <div>
        <h2 className="mb-1 text-center text-xl font-semibold">Недействительная ссылка</h2>
        <p className="mb-6 text-center text-sm text-muted">
          Ссылка для сброса пароля повреждена или устарела. Запросите новую.
        </p>
        <p className="mt-4 text-center">
          <Link to="/forgot-password" className={authLink}>
            Запросить новую ссылку
          </Link>
        </p>
      </div>
    );
  }

  const errorMessage = mutation.isError ? getApiError(mutation.error).message : '';
  const showNewLinkPrompt = false;

  return (
    <div>
      <h2 className="mb-1 text-center text-xl font-semibold">Новый пароль</h2>
      <p className="mb-6 text-center text-sm text-muted">
        Придумайте новый пароль для вашего аккаунта
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage ? (
          <div className="rounded-lg border border-red-200 bg-danger-subtle px-3 py-2 text-sm text-danger dark:border-red-900/40">
            <p>{errorMessage}</p>
            {showNewLinkPrompt ? (
              <p className="mt-1">
                <Link to="/forgot-password" className={authLink}>
                  Запросить новую ссылку
                </Link>
              </p>
            ) : null}
          </div>
        ) : null}

        <div>
          <label htmlFor="reset-new-password" className={authLabel}>
            Новый пароль
          </label>
          <input
            id="reset-new-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={authInput}
          />
        </div>

        <button type="submit" disabled={mutation.isPending} className={authPrimaryBtn}>
          {mutation.isPending ? 'Сохранение…' : 'Сохранить новый пароль'}
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
