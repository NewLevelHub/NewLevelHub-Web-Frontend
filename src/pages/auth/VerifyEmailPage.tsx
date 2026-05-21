import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { cn } from '@/shared/lib/cn';
import { getApiError } from '@/shared/lib/getApiError';

type Status = 'loading' | 'success' | 'error';
type VerifyResult = { ok: true } | { ok: false; message: string };

// Keeps one verification request per token across StrictMode remounts.
const verifyRequests = new Map<string, Promise<VerifyResult>>();

function verifyTokenOnce(token: string): Promise<VerifyResult> {
  const cached = verifyRequests.get(token);
  if (cached) return cached;

  const request = apiClient
    .get(API.auth.verifyEmail, { params: { token } })
    .then((): VerifyResult => ({ ok: true }))
    .catch((err: unknown): VerifyResult => ({
      ok: false,
      message: getApiError(err).message,
    }));

  verifyRequests.set(token, request);
  return request;
}

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('Ссылка не содержит токен подтверждения.');
      return;
    }
    const verificationToken = token;
    let active = true;

    async function verify() {
      const result = await verifyTokenOnce(verificationToken);
      if (!active) return;
      if (!result.ok) {
        setStatus('error');
        setErrorMessage(result.message);
        return;
      }
      setStatus('success');

      setTimeout(() => {
        navigate('/login', {
          replace: true,
          state: { notice: 'Email confirmed, please sign in' },
        });
      }, 3000);
    }

    verify();

    return () => {
      active = false;
    };
  }, [token, navigate]);

  return (
    <div className="text-center">
      {status === 'loading' && (
        <div className="space-y-4">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-default border-t-brand" />
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
          <p className="text-gray-400">Сейчас вы будете перенаправлены на страницу входа...</p>
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
            onClick={() => navigate('/login', { replace: true })}
            className={cn(
              'mt-4 rounded-lg px-6 py-2 text-sm font-medium',
              'bg-surface text-primary hover:bg-gray-200 transition-colors',
            )}
          >
            Войти
          </button>
        </div>
      )}
    </div>
  );
}
