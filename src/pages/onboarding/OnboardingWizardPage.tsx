import { useTranslation } from 'react-i18next';
import { CheckCircle2, PartyPopper, ExternalLink } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { useOnboardingWizard } from '@/pages/onboarding/hooks/useOnboardingWizard';

export default function OnboardingWizardPage() {
  const { t } = useTranslation();
  const {
    data,
    isPending,
    isError,
    isDone,
    visitedLinks,
    completedCount,
    totalCount,
    progressPercent,
    currentStepId,
    completeStepMutation,
    refetch,
    markLinkVisited,
  } = useOnboardingWizard();

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page">
        <p className="text-secondary">{t('onboarding.loading')}</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page">
        <div className="text-center">
          <p className="text-danger">{t('onboarding.loadError')}</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-4 rounded-lg border border-default px-5 py-2.5 text-sm text-secondary transition-colors hover:border-gray-500 hover:text-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
          >
            {t('common.retry')}
          </button>
        </div>
      </div>
    );
  }

  if (isDone) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-page px-4 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-success-subtle">
          <PartyPopper className="h-10 w-10 text-success" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-primary">{t('onboarding.completed')}</h1>
          <p className="mt-2 text-secondary">{t('onboarding.completedDesc')}</p>
        </div>
        <p className="text-sm text-muted">{t('onboarding.redirecting')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-page px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-primary">{t('onboarding.welcome')}</h1>
          <p className="mt-2 text-secondary">{t('onboarding.subtitle')}</p>
        </div>

        <div className="mb-8 rounded-xl border border-default bg-surface p-5">
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="font-medium text-secondary">
              {t('onboarding.stepsProgress', { completed: completedCount, total: totalCount })}
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
              aria-label={t('onboarding.progressAria')}
            />
          </div>
        </div>

        <div className="space-y-4">
          {data.steps.map((step, index) => {
            const isCurrent = currentStepId === step.id;
            const hasLink = Boolean(step.url) && !step.is_completed;
            const linkVisited = visitedLinks.has(step.id);

            return (
              <div
                key={step.id}
                className={cn(
                  'rounded-xl border p-5 transition-colors',
                  step.is_completed
                    ? 'border-green-800/50 bg-success-subtle'
                    : isCurrent
                      ? 'border-blue-500/60 bg-surface'
                      : 'border-default bg-surface opacity-60',
                )}
              >
                {/* No-link layout: icon + title + Done button on the right */}
                {!hasLink && (
                  <div className="flex items-start gap-4">
                    <div className="mt-0.5 shrink-0">
                      {step.is_completed ? (
                        <CheckCircle2
                          className="h-7 w-7 text-green-400"
                          aria-label={t('onboarding.stepCompleted')}
                        />
                      ) : (
                        <div
                          className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-default text-sm font-semibold text-secondary"
                          aria-label={t('onboarding.stepN', { n: index + 1 })}
                        >
                          {index + 1}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          'font-medium',
                          step.is_completed ? 'text-success line-through' : 'text-primary',
                        )}
                      >
                        {step.title}
                      </p>
                    </div>
                    {isCurrent && (
                      <button
                        type="button"
                        disabled={completeStepMutation.isPending}
                        onClick={() => completeStepMutation.mutate(step.id)}
                        className="ml-2 shrink-0 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                        aria-label={t('onboarding.markDoneAria', { title: step.title })}
                      >
                        {completeStepMutation.isPending
                          ? t('common.savingPlain')
                          : t('onboarding.markDone')}
                      </button>
                    )}
                  </div>
                )}

                {/* Link layout: icon + title, then link → Done buttons below */}
                {hasLink && (
                  <div className="flex items-start gap-4">
                    <div className="mt-0.5 shrink-0">
                      <div
                        className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-default text-sm font-semibold text-secondary"
                        aria-label={t('onboarding.stepN', { n: index + 1 })}
                      >
                        {index + 1}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-primary">{step.title}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <a
                          href={step.url!}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => markLinkVisited(step.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90"
                        >
                          <ExternalLink className="h-4 w-4" aria-hidden="true" />
                          {t('onboarding.goToLink')}
                        </a>
                        <button
                          type="button"
                          disabled={!linkVisited || completeStepMutation.isPending}
                          onClick={() => completeStepMutation.mutate(step.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-default px-4 py-2 text-sm font-medium text-secondary transition-colors hover:bg-hover disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                          aria-label={t('onboarding.markDoneAria', { title: step.title })}
                        >
                          {completeStepMutation.isPending
                            ? t('common.savingPlain')
                            : t('onboarding.markDone')}
                        </button>
                      </div>
                      {!linkVisited && (
                        <p className="mt-2 text-xs text-muted">{t('onboarding.visitLinkFirst')}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {completeStepMutation.isError && (
          <p className="mt-3 text-center text-sm text-danger">{t('onboarding.saveError')}</p>
        )}
      </div>
    </div>
  );
}
