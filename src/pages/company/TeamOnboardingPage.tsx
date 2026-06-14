import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import {
  ListChecks,
  Settings2,
  Users,
  Lock,
  CheckCircle2,
  Circle,
  X,
  UserCircle,
  ClipboardList,
} from 'lucide-react';

import { cn } from '@/shared/lib/cn';
import { useTeamOnboarding } from '@/pages/company/hooks/useTeamOnboarding';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-raised"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn('h-full rounded-full transition-all', pct === 100 ? 'bg-success' : 'bg-brand')}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function TeamOnboardingPage() {
  const { t } = useTranslation();
  const {
    companyId,
    selectedUserId,
    members,
    selectedMember,
    detail,
    teamQuery,
    detailQuery,
    handleSelectUser,
    handleDeselectUser,
  } = useTeamOnboarding();

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <ListChecks className="h-6 w-6 text-brand" aria-hidden="true" />
        <h1 className="text-2xl font-semibold text-primary">{t('companies.teamOnboardingTitle')}</h1>
      </div>

      {/* Tab navigation */}
      <nav className="flex flex-wrap gap-2" aria-label={t('companies.onboardingTitle')}>
        <Link
          to={`/company/settings${companyId ? `?company=${companyId}` : ''}`}
          className="inline-flex items-center gap-1.5 rounded-full border border-default px-4 py-1.5 text-sm text-secondary hover:bg-hover"
        >
          <Settings2 className="h-3.5 w-3.5" aria-hidden="true" />
          {t('companies.generalSettings')}
        </Link>
        <Link
          to={`/company/settings/members${companyId ? `?company=${companyId}` : ''}`}
          className="inline-flex items-center gap-1.5 rounded-full border border-default px-4 py-1.5 text-sm text-secondary hover:bg-hover"
        >
          <Users className="h-3.5 w-3.5" aria-hidden="true" />
          {t('companies.membersTitle')}
        </Link>
        <Link
          to={`/company/settings/onboarding${companyId ? `?company=${companyId}` : ''}`}
          className="inline-flex items-center gap-1.5 rounded-full border border-default px-4 py-1.5 text-sm text-secondary hover:bg-hover"
        >
          <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />
          {t('companies.onboardingTemplatesLink')}
        </Link>
        <span
          className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-1.5 text-sm font-medium text-white"
          aria-current="page"
        >
          <Users className="h-3.5 w-3.5" aria-hidden="true" />
          {t('companies.teamOnboardingTab')}
        </span>
      </nav>

      {/* Main content */}
      <div className="flex gap-4">
        {/* Member list */}
        <section
          className={cn(
            'rounded-xl border border-default bg-surface',
            selectedUserId !== null ? 'hidden md:block md:w-1/2' : 'w-full',
          )}
        >
          <div className="border-b border-default px-6 py-4">
            <h2 className="text-base font-semibold text-primary">
              {t('companies.teamOnboardingSubtitle')}
            </h2>
          </div>

          {teamQuery.isLoading && (
            <div className="space-y-3 p-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse rounded-lg border border-default p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-raised" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-1/3 rounded bg-raised" />
                      <div className="h-3 w-1/4 rounded bg-raised" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {teamQuery.isError && (
            <div className="p-6 text-sm text-danger">{t('companies.teamOnboardingLoadError')}</div>
          )}

          {!teamQuery.isLoading && members.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16">
              <ClipboardList className="mb-3 h-10 w-10 text-muted" aria-hidden="true" />
              <p className="text-sm font-medium text-secondary">
                {t('companies.teamOnboardingEmpty')}
              </p>
            </div>
          )}

          <ul className="divide-y divide-default">
            {members.map((member) => {
              const name = `${member.first_name} ${member.last_name}`.trim();
              const isSelected = selectedUserId === member.user;
              const isDone =
                member.total_steps > 0 && member.completed_steps === member.total_steps;
              return (
                <li key={member.user}>
                  <button
                    type="button"
                    onClick={() => handleSelectUser(member.user)}
                    className={cn(
                      'flex w-full items-center gap-4 px-6 py-4 text-left transition-colors hover:bg-hover focus:outline-none focus-visible:bg-hover',
                      isSelected && 'bg-brand-subtle',
                      isDone && 'opacity-50',
                    )}
                    aria-pressed={isSelected}
                    aria-label={t('companies.teamMemberAria', { name })}
                  >
                    {member.avatar ? (
                      <img
                        src={member.avatar}
                        alt=""
                        className="h-10 w-10 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-raised">
                        <UserCircle className="h-6 w-6 text-muted" aria-hidden="true" />
                      </span>
                    )}
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <p className="truncate text-sm font-medium text-primary">{name}</p>
                      {isDone ? (
                        <span className="text-xs font-medium text-success">
                          {t('companies.onboardingCompleted')}
                        </span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <ProgressBar value={member.completed_steps} max={member.total_steps} />
                          <span className="shrink-0 text-xs text-secondary">
                            {t('companies.stepsRatio', {
                              completed: member.completed_steps,
                              total: member.total_steps,
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Detail panel */}
        {selectedUserId !== null && (
          <section className="w-full rounded-xl border border-default bg-surface md:w-1/2">
            <div className="flex items-center justify-between border-b border-default px-6 py-4">
              <div className="flex items-center gap-3">
                {selectedMember?.avatar ? (
                  <img
                    src={selectedMember.avatar}
                    alt=""
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-raised">
                    <UserCircle className="h-5 w-5 text-muted" aria-hidden="true" />
                  </span>
                )}
                <h2 className="text-base font-semibold text-primary">
                  {selectedMember
                    ? `${selectedMember.first_name} ${selectedMember.last_name}`.trim()
                    : ''}
                </h2>
              </div>
              <button
                type="button"
                onClick={handleDeselectUser}
                className="rounded-lg p-1.5 text-muted hover:bg-hover"
                aria-label={t('common.close')}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {detail && (
              <div className="px-6 py-4 border-b border-default">
                {detail.total_steps > 0 && detail.completed_steps === detail.total_steps ? (
                  <span className="text-sm font-medium text-success">
                    {t('companies.onboardingCompleted')}
                  </span>
                ) : (
                  <div className="flex items-center gap-3">
                    <ProgressBar value={detail.completed_steps} max={detail.total_steps} />
                    <span className="shrink-0 text-sm font-medium text-secondary">
                      {t('companies.stepsRatio', {
                        completed: detail.completed_steps,
                        total: detail.total_steps,
                      })}
                    </span>
                  </div>
                )}
              </div>
            )}

            {detailQuery.isLoading && (
              <div className="space-y-3 p-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse flex items-center gap-3 py-2">
                    <div className="h-5 w-5 rounded-full bg-raised" />
                    <div className="h-4 flex-1 rounded bg-raised" />
                  </div>
                ))}
              </div>
            )}

            {detailQuery.isError && (
              <div className="p-6 text-sm text-danger">
                {t('companies.teamOnboardingLoadError')}
              </div>
            )}

            {detail && detail.steps.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12">
                <ClipboardList className="mb-3 h-8 w-8 text-muted" aria-hidden="true" />
                <p className="text-sm text-secondary">{t('companies.onboardingNotStarted')}</p>
              </div>
            )}

            {detail && detail.steps.length > 0 && (
              <ul className="divide-y divide-default">
                {detail.steps.map((step) => (
                  <li
                    key={step.id}
                    className={cn(
                      'flex items-start gap-3 px-6 py-4',
                      !step.is_completed && 'opacity-60',
                    )}
                  >
                    {step.is_completed ? (
                      <CheckCircle2
                        className="mt-0.5 h-5 w-5 shrink-0 text-success"
                        aria-hidden="true"
                      />
                    ) : (
                      <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted" aria-hidden="true" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="text-sm font-medium text-primary">{step.title}</p>
                        {step.is_system && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-muted/20 px-1.5 py-0.5 text-xs text-muted">
                            <Lock className="h-3 w-3" aria-hidden="true" />
                            {t('companies.systemStep')}
                          </span>
                        )}
                      </div>
                      {step.completed_at && (
                        <p className="mt-0.5 text-xs text-muted">
                          {t('companies.completedAt', { date: formatDate(step.completed_at) })}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
