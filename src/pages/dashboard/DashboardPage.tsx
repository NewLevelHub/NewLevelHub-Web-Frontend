import { useState } from 'react';
import { useAuthStore } from '@/shared/store/auth';
import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { getApiErrorMessage } from '@/shared/lib/apiError';
import { authPrimaryBtn } from '@/shared/ui/authFormStyles';
import { cn } from '@/shared/lib/cn';

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const fetchMe = useAuthStore((s) => s.fetchMe);

  const [resendMsg, setResendMsg] = useState('');
  const [resendErr, setResendErr] = useState('');
  const [resendLoading, setResendLoading] = useState(false);

  async function handleResend() {
    setResendMsg('');
    setResendErr('');
    setResendLoading(true);
    try {
      await apiClient.post(API.auth.resendVerification);
      setResendMsg('Письмо отправлено. Проверь почту или логи бэкенда.');
    } catch (e) {
      setResendErr(getApiErrorMessage(e, 'Не удалось отправить'));
    } finally {
      setResendLoading(false);
    }
  }

  async function handleRefreshProfile() {
    try {
      await fetchMe();
    } catch {
      /* RequireAuth уведёт на логин */
    }
  }

  if (!user) {
    return (
      <div className="text-gray-400">
        <p>Загрузка профиля…</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-white">Дашборд (тест API)</h1>
      <p className="mt-1 text-sm text-gray-500">Данные из Zustand после login/register или GET /auth/me/</p>

      <div className="mt-8 rounded-xl border border-gray-800 bg-gray-900/80 p-6">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-gray-500">Имя</dt>
            <dd className="font-medium text-white">{user.full_name}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Email</dt>
            <dd className="font-medium text-white">{user.email}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Роль</dt>
            <dd className="font-medium capitalize text-white">{user.role}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Email подтверждён</dt>
            <dd>
              <span
                className={cn(
                  'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
                  user.is_email_verified
                    ? 'bg-green-900/50 text-green-300'
                    : 'bg-amber-900/50 text-amber-200',
                )}
              >
                {user.is_email_verified ? 'Да' : 'Нет — проверь почту / ссылку из письма'}
              </span>
            </dd>
          </div>
          {user.company_name ? (
            <div className="sm:col-span-2">
              <dt className="text-gray-500">Компания</dt>
              <dd className="font-medium text-white">{user.company_name}</dd>
            </div>
          ) : null}
        </dl>

        {!user.is_email_verified ? (
          <div className="mt-6 border-t border-gray-800 pt-6">
            <p className="text-sm text-gray-400">
              Пока email не подтверждён, бронирования и CRM с бэка вернут 403. Открой ссылку из письма
              или отправь письмо снова.
            </p>
            {resendErr ? (
              <p className="mt-2 text-sm text-red-400">{resendErr}</p>
            ) : null}
            {resendMsg ? (
              <p className="mt-2 text-sm text-green-400">{resendMsg}</p>
            ) : null}
            <button
              type="button"
              disabled={resendLoading}
              onClick={handleResend}
              className={cn(authPrimaryBtn, 'mt-3 max-w-xs')}
            >
              {resendLoading ? 'Отправка…' : 'Отправить письмо повторно'}
            </button>
          </div>
        ) : null}

        <div className="mt-8 flex flex-wrap gap-3 border-t border-gray-800 pt-6">
          <button
            type="button"
            onClick={handleRefreshProfile}
            className="rounded-lg border border-gray-600 px-4 py-2 text-sm text-white hover:bg-gray-800"
          >
            Обновить профиль с сервера
          </button>
          <button
            type="button"
            onClick={() => void logout()}
            className="rounded-lg border border-red-900/60 bg-red-950/30 px-4 py-2 text-sm text-red-200 hover:bg-red-950/50"
          >
            Выйти
          </button>
        </div>
      </div>
    </div>
  );
}
