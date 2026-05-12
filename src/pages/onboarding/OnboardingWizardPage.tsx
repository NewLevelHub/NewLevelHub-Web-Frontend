import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2 } from 'lucide-react';
import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { cn } from '@/shared/lib/cn';
import type { OnboardingStatus } from '@/shared/types';

export default function OnboardingWizardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isPending, isError, refetch } = useQuery<OnboardingStatus>({
    queryKey: ['onboarding-progress'],
    queryFn: () => apiClient.get<OnboardingStatus>(API.onboarding.progress).then((r) => r.data),
    retry: false,
  });

  const completeStepMutation = useMutation({
    mutationFn: (stepId: number) => apiClient.post(API.onboarding.completeStep(stepId)).then((r) => r.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['onboarding-progress'] });
    },
  });

  useEffect(() => {
    if (data?.completed) {
      void navigate('/dashboard', { replace: true });
    }
  }, [data, navigate]);

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page">
        <p className="text-secondary">Загрузка онбординга...</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page">
        <div className="text-center">
          <p className="text-red-400">Не удалось загрузить онбординг.</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-4 rounded-lg border border-default px-5 py-2.5 text-sm text-secondary transition-colors hover:border-gray-500 hover:text-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  const completedCount = data.steps.filter((step) => step.is_completed).length;
  const totalCount = data.steps.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const currentStepId = data.steps.find((step) => !step.is_completed)?.id ?? null;

  return (
    <div className="min-h-screen bg-page px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-primary">Добро пожаловать в NewLevelHub</h1>
          <p className="mt-2 text-secondary">Завершите шаги адаптации, чтобы начать работу</p>
        </div>

        <div className="mb-8 rounded-xl border border-default bg-surface p-5">
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="font-medium text-secondary">
              {completedCount} из {totalCount} шагов выполнено
            </span>
            <span className="text-muted">{progressPercent}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-raised">
            <div
              className="h-full rounded-full bg-brand transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
              role="progressbar"
              aria-valuenow={progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Прогресс онбординга"
            />
          </div>
        </div>

        <div className="space-y-4">
          {data.steps.map((step, index) => {
            const isCurrent = currentStepId === step.id;
            return (
              <div
                key={step.id}
                className={cn(
                  'flex items-start gap-4 rounded-xl border p-5 transition-colors',
                  step.is_completed
                    ? 'border-green-800/50 bg-success-subtle'
                    : isCurrent
                      ? 'border-blue-500/60 bg-surface'
                      : 'border-default bg-surface',
                )}
              >
                <div className="mt-0.5 shrink-0">
                  {step.is_completed ? (
                    <CheckCircle2 className="h-7 w-7 text-green-400" aria-label="Шаг выполнен" />
                  ) : (
                    <div
                      className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-default text-sm font-semibold text-secondary"
                      aria-label={`Шаг ${index + 1}`}
                    >
                      {index + 1}
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      'font-medium',
                      step.is_completed ? 'text-success line-through' : 'text-white',
                    )}
                  >
                    {step.title}
                  </p>
                </div>

                {!step.is_completed && isCurrent && (
                  <button
                    type="button"
                    disabled={completeStepMutation.isPending}
                    onClick={() => completeStepMutation.mutate(step.id)}
                    className="ml-2 shrink-0 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                    aria-label={`Отметить шаг выполненным: ${step.title}`}
                  >
                    {completeStepMutation.isPending ? 'Сохранение...' : 'Выполнено'}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {completeStepMutation.isError && (
          <p className="mt-3 text-center text-sm text-red-400">
            Не удалось сохранить шаг. Попробуйте снова.
          </p>
        )}
      </div>
    </div>
  );
}
