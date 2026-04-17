import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { useAuthStore } from '@/shared/store/auth';
import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { cn } from '@/shared/lib/cn';
import type { OnboardingStatus, OnboardingStep } from '@/shared/types';

const STEP_HINTS: Record<OnboardingStep['key'], string> = {
  upload_logo: 'Загрузите логотип вашей компании',
  fill_description: 'Добавьте описание компании',
  create_first_board: 'Создайте первую CRM-доску для вашей команды',
  invite_first_employee: 'Пригласите первого сотрудника в компанию',
};

const STEP_LINKS: Record<OnboardingStep['key'], string> = {
  upload_logo: '/company/settings',
  fill_description: '/company/settings',
  create_first_board: '/crm',
  invite_first_employee: '/company/settings/members',
};

export default function OnboardingWizardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const fetchMe = useAuthStore((s) => s.fetchMe);

  const companyId = user?.company?.id ? String(user.company.id) : null;

  const { data, isPending, isError, refetch } = useQuery<OnboardingStatus>({
    queryKey: ['onboarding-status', companyId],
    queryFn: () =>
      apiClient
        .get<OnboardingStatus>(API.companies.onboardingStatus(companyId!))
        .then((r) => r.data),
    enabled: companyId !== null,
    retry: false,
  });

  const skipMutation = useMutation({
    mutationFn: () =>
      apiClient.post(API.companies.onboardingSkip(companyId!)).then((r) => r.data),
    onSuccess: async () => {
      void queryClient.invalidateQueries({ queryKey: ['onboarding-status', companyId] });
      await fetchMe();
      void navigate('/', { replace: true });
    },
  });

  useEffect(() => {
    if (data?.completed) {
      void navigate('/', { replace: true });
    }
  }, [data, navigate]);

  if (!companyId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <p className="text-gray-400">Компания не найдена.</p>
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <p className="text-gray-400">Загрузка онбординга…</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <div className="text-center">
          <p className="text-red-400">Не удалось загрузить онбординг.</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-4 rounded-lg border border-gray-700 px-5 py-2.5 text-sm text-gray-400 transition-colors hover:border-gray-500 hover:text-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  const completedCount = data.steps.filter((s) => s.completed).length;
  const totalCount = data.steps.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-12">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-white">Добро пожаловать в NewLevelHub</h1>
          <p className="mt-2 text-gray-400">
            Завершите настройку компании, чтобы начать работу
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8 rounded-xl border border-gray-800 bg-gray-900 p-5">
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="text-gray-300 font-medium">
              {completedCount} из {totalCount} шагов выполнено
            </span>
            <span className="text-gray-500">{progressPercent}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-800">
            <div
              className="h-full rounded-full bg-indigo-600 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
              role="progressbar"
              aria-valuenow={progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Прогресс онбординга"
            />
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-4">
          {data.steps.map((step, index) => {
            const hint = STEP_HINTS[step.key];
            const link = STEP_LINKS[step.key];

            return (
              <div
                key={step.key}
                className={cn(
                  'flex items-start gap-4 rounded-xl border p-5 transition-colors',
                  step.completed
                    ? 'border-green-800/50 bg-green-950/20'
                    : 'border-gray-800 bg-gray-900',
                )}
              >
                {/* Step indicator */}
                <div className="mt-0.5 shrink-0">
                  {step.completed ? (
                    <CheckCircle2
                      className="h-7 w-7 text-green-400"
                      aria-label="Шаг выполнен"
                    />
                  ) : (
                    <div
                      className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-gray-600 text-sm font-semibold text-gray-400"
                      aria-label={`Шаг ${index + 1}`}
                    >
                      {index + 1}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      'font-medium',
                      step.completed ? 'text-green-300 line-through' : 'text-white',
                    )}
                  >
                    {step.title}
                  </p>
                  {hint && (
                    <p className="mt-0.5 text-sm text-gray-400">{hint}</p>
                  )}
                </div>

                {/* Action */}
                {!step.completed && (
                  <button
                    type="button"
                    onClick={() => void navigate(link)}
                    className="ml-2 flex shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                    aria-label={`Перейти к шагу: ${step.title}`}
                  >
                    Перейти
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Skip button */}
        <div className="mt-10 flex justify-center">
          <button
            type="button"
            disabled={skipMutation.isPending}
            onClick={() => skipMutation.mutate()}
            className="rounded-lg border border-gray-700 px-5 py-2.5 text-sm text-gray-400 transition-colors hover:border-gray-500 hover:text-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {skipMutation.isPending ? 'Пропуск…' : 'Пропустить онбординг'}
          </button>
        </div>

        {skipMutation.isError && (
          <p className="mt-3 text-center text-sm text-red-400">
            Не удалось пропустить. Попробуйте снова.
          </p>
        )}
      </div>
    </div>
  );
}
