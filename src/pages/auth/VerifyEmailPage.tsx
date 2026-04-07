import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { useAuthStore } from '@/shared/store/auth';
import { cn } from '@/shared/lib/cn';
import { getApiErrorMessage } from '@/shared/lib/apiError';

type Status = 'loading' | 'success' | 'error';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, fetchMe } = useAuthStore();

  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('Ссылка не содержит токен подтверждения.');
      return;
    }

    let cancelled = false;

    async function verify() {
      try {
        await apiClient.get(API.auth.verifyEmail, { params: { token } });
        if (cancelled) return;

        if (isAuthenticated) {
          await fetchMe();
        }
        setStatus('success');

        setTimeout(() => {
          navigate(isAuthenticated ? '/' : '/login', { replace: true });
        }, 3000);
      } catch (err: unknown) {
        if (cancelled) return;
        setStatus('error');

        setErrorMessage(getApiErrorMessage(err, 'Не удалось подтвердить email. Попробуйте позже.'));
      }
    }

    verify();

    return () => {
      cancelled = true;
    };
  }, [token, isAuthenticated, fetchMe, navigate]);

  return (
    <div className="text-center">
      {status === 'loading' && (
        <div className="space-y-4">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-gray-700 border-t-white" />
          <p className="text-gray-400">Подтверждаем ваш email...</p>
        </div>
      )}

      {status === 'success' && (
        <div className="space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-900/40">
            <svg className="h-8 w-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold">Email подтверждён</h2>
          <p className="text-gray-400">
            Сейчас вы будете перенаправлены{isAuthenticated ? ' на дашборд' : ' на страницу входа'}...
          </p>
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-900/40">
            <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold">Ошибка подтверждения</h2>
          <p className="text-gray-400">{errorMessage}</p>
          <button
            onClick={() => navigate(isAuthenticated ? '/' : '/login', { replace: true })}
            className={cn(
              'mt-4 rounded-lg px-6 py-2 text-sm font-medium',
              'bg-white text-gray-950 hover:bg-gray-200 transition-colors',
            )}
          >
            {isAuthenticated ? 'На дашборд' : 'Войти'}
          </button>
        </div>
      )}
    </div>
  );
}
