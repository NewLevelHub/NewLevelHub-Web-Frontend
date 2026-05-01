import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { useAuthStore } from '@/shared/store/auth';
import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { USER_ROLES } from '@/shared/config/constants';
import { getApiErrorMessage } from '@/shared/lib/apiError';
import { authPrimaryBtn } from '@/shared/ui/authFormStyles';
import { cn } from '@/shared/lib/cn';
import type { OnboardingStatus, ServiceRequest, ServiceRequestCleaningPayload } from '@/shared/types';

export default function DashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const fetchMe = useAuthStore((s) => s.fetchMe);

  const requiresOnboarding =
    user?.role === USER_ROLES.COMPANY_ADMIN || user?.role === USER_ROLES.EMPLOYEE;

  const { data: onboardingProgress } = useQuery<OnboardingStatus>({
    queryKey: ['onboarding-progress'],
    queryFn: () => apiClient.get<OnboardingStatus>(API.onboarding.progress).then((r) => r.data),
    enabled: Boolean(user) && requiresOnboarding,
    retry: false,
  });

  // Redirect company_admin or employee with unfinished onboarding to wizard.
  useEffect(() => {
    if (requiresOnboarding && onboardingProgress && onboardingProgress.completed === false) {
      void navigate('/onboarding', { replace: true });
    }
  }, [requiresOnboarding, onboardingProgress, navigate]);

  const [resendMsg, setResendMsg] = useState('');
  const [resendErr, setResendErr] = useState('');
  const [resendLoading, setResendLoading] = useState(false);

  const [cleaningSuccess, setCleaningSuccess] = useState(false);
  const [cleaningError, setCleaningError] = useState('');

  const cleaningMutation = useMutation({
    mutationFn: (payload: ServiceRequestCleaningPayload) =>
      apiClient.post<ServiceRequest>(API.serviceRequests.quickCleaning, payload).then((r) => r.data),
    onSuccess: async () => {
      setCleaningSuccess(true);
      setCleaningError('');
      await queryClient.invalidateQueries({ queryKey: ['service-requests'] });
    },
    onError: (err: unknown) => {
      setCleaningError(getApiErrorMessage(err, 'Не удалось создать заявку на уборку.'));
      setCleaningSuccess(false);
    },
  });

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

  const isEmployee = user?.role === USER_ROLES.EMPLOYEE;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-white">Дашборд (тест API)</h1>
      <p className="mt-1 text-sm text-gray-500">Данные из Zustand после login/register или GET /auth/me/</p>

      {/* Quick cleaning action for employees */}
      {isEmployee ? (
        <div className="mt-6 rounded-xl border border-gray-700 bg-gray-800 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-900/40">
              <Sparkles className="h-5 w-5 text-sky-400" aria-hidden="true" />
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-semibold text-white">Нужна уборка?</h2>
              <p className="mt-0.5 text-xs text-gray-400">
                Этаж определится автоматически по последнему подтверждённому бронированию.
              </p>

              {cleaningSuccess ? (
                <p className="mt-2 text-sm text-emerald-400">
                  Заявка на уборку отправлена. Мы займёмся этим в ближайшее время.
                </p>
              ) : null}

              {cleaningError ? (
                <p className="mt-2 text-sm text-rose-400">{cleaningError}</p>
              ) : null}

              <button
                type="button"
                disabled={cleaningMutation.isPending || cleaningSuccess}
                onClick={() => {
                  setCleaningSuccess(false);
                  setCleaningError('');
                  cleaningMutation.mutate({});
                }}
                className={cn(
                  'mt-3 inline-flex items-center rounded-lg border border-sky-700 bg-sky-900/30 px-4 py-2 text-sm font-medium text-sky-300 hover:bg-sky-900/50 disabled:opacity-50',
                )}
              >
                {cleaningMutation.isPending ? 'Отправляем...' : 'Вызвать уборку'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
