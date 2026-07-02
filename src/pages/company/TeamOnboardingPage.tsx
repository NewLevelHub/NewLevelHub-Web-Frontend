import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import {
  ListChecks,
  Settings2,
  Users,
  ClipboardList,
} from 'lucide-react';

import { useTeamOnboarding } from '@/pages/company/hooks/useTeamOnboarding';
import { useOnboardingAssignments } from '@/pages/company/hooks/useOnboardingAssignments';
import { useOnboardingTemplates } from '@/pages/company/hooks/useOnboardingTemplates';
import { AssignTemplateModal } from '@/pages/company/components/AssignTemplateModal';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

interface TeamOnboardingPageProps {
  hideNav?: boolean;
}

export default function TeamOnboardingPage({ hideNav = false }: TeamOnboardingPageProps) {
  const { t } = useTranslation();
  const {
    companyId,
    selectedUserId,
    members,
    detail,
    detailQuery,
    teamQuery,
    handleSelectUser,
  } = useTeamOnboarding();

  const { assignments, assignMutation, assignError } =
    useOnboardingAssignments(companyId || null);

  const { templates } = useOnboardingTemplates();

  const [assignModalUserId, setAssignModalUserId] = useState<number | null>(null);

  // Close modal on successful assignment
  useEffect(() => {
    if (assignMutation.isSuccess) {
      setAssignModalUserId(null);
    }
  }, [assignMutation.isSuccess]);

  const selectedMember =
    selectedUserId != null
      ? assignments.find((m) => Number(m.user) === selectedUserId) ?? null
      : null;

  const assignModalUser = assignModalUserId != null
    ? assignments.find((m) => Number(m.user) === assignModalUserId) ?? null
    : null;

  const handleAssign = (userId: number, templateId: number, note: string) => {
    assignMutation.mutate({ user_id: userId, template_id: templateId, note: note.trim() || undefined });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Page header */}
      {!hideNav && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <ListChecks
            style={{ width: 24, height: 24, color: 'var(--brand)' }}
            aria-hidden="true"
          />
          <h1
            style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}
          >
            {t('companies.teamOnboardingTitle')}
          </h1>
        </div>
      )}

      {/* Tab navigation */}
      {!hideNav && (
        <nav
          style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}
          aria-label={t('companies.onboardingTitle')}
        >
          <Link
            to={`/company/settings${companyId ? `?company=${companyId}` : ''}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              borderRadius: 9999,
              border: '1px solid var(--border)',
              padding: '6px 16px',
              fontSize: 14,
              color: 'var(--text-secondary)',
              textDecoration: 'none',
            }}
          >
            <Settings2 style={{ width: 14, height: 14 }} aria-hidden="true" />
            {t('companies.generalSettings')}
          </Link>
          <Link
            to={`/company/settings/members${companyId ? `?company=${companyId}` : ''}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              borderRadius: 9999,
              border: '1px solid var(--border)',
              padding: '6px 16px',
              fontSize: 14,
              color: 'var(--text-secondary)',
              textDecoration: 'none',
            }}
          >
            <Users style={{ width: 14, height: 14 }} aria-hidden="true" />
            {t('companies.membersTitle')}
          </Link>
          <Link
            to={`/company/settings/onboarding${companyId ? `?company=${companyId}` : ''}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              borderRadius: 9999,
              border: '1px solid var(--border)',
              padding: '6px 16px',
              fontSize: 14,
              color: 'var(--text-secondary)',
              textDecoration: 'none',
            }}
          >
            <ListChecks style={{ width: 14, height: 14 }} aria-hidden="true" />
            {t('companies.onboardingTemplatesLink')}
          </Link>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              borderRadius: 9999,
              background: 'var(--brand)',
              padding: '6px 16px',
              fontSize: 14,
              fontWeight: 500,
              color: '#fff',
            }}
            aria-current="page"
          >
            <Users style={{ width: 14, height: 14 }} aria-hidden="true" />
            {t('companies.teamOnboardingTab')}
          </span>
        </nav>
      )}

      {/* Main content — two-column grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 14, alignItems: 'start' }}>
        {/* Left: member list */}
        <section
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: 0,
            height: 'fit-content',
            overflow: 'hidden',
          }}
          aria-label={t('companies.teamOnboardingSubtitle')}
        >
          {/* Skeleton */}
          {teamQuery.isLoading && (
            <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 0',
                    animation: 'pulse 1.5s ease-in-out infinite',
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: 'var(--bg-raised)',
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div
                      style={{ height: 12, width: '55%', borderRadius: 4, background: 'var(--bg-raised)' }}
                    />
                    <div
                      style={{ height: 4, width: '100%', borderRadius: 2, background: 'var(--bg-raised)' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {teamQuery.isError && (
            <div style={{ padding: 16, fontSize: 13, color: 'var(--danger)' }}>
              {t('companies.teamOnboardingLoadError')}
            </div>
          )}

          {/* Empty state */}
          {!teamQuery.isLoading && !teamQuery.isError && members.length === 0 && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px 16px',
              }}
            >
              <ClipboardList
                style={{ width: 36, height: 36, color: 'var(--text-muted)', marginBottom: 10 }}
                aria-hidden="true"
              />
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
                {t('companies.teamOnboardingEmpty')}
              </p>
            </div>
          )}

          {/* Member rows */}
          {members.map((member) => {
            const name = `${member.first_name} ${member.last_name}`.trim();
            const isSelected = Number(selectedUserId) === Number(member.user);
            const assignment = assignments.find((a) => Number(a.user) === Number(member.user));
            const templateName = member.template_name ?? assignment?.template_name ?? null;
            const isDefaultTemplate = templateName !== null && (assignment?.assigned_at == null);
            const pct =
              member.total_steps > 0
                ? Math.round((member.completed_steps / member.total_steps) * 100)
                : 0;

            return (
              <div
                key={member.user}
                onClick={() => { if (member.user != null) handleSelectUser(member.user); }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && member.user != null) handleSelectUser(member.user);
                }}
                aria-label={t('companies.teamMemberAria', { name })}
                style={{
                  padding: '12px 14px',
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--border-faint)',
                  background: isSelected ? 'var(--bg-active)' : 'transparent',
                  borderLeft: isSelected
                    ? '2px solid var(--brand)'
                    : '2px solid transparent',
                  transition: 'background 0.1s',
                  outline: 'none',
                }}
              >
                {/* Top row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  {member.avatar ? (
                    <img
                      src={member.avatar}
                      alt=""
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        objectFit: 'cover',
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        flexShrink: 0,
                        background: 'var(--brand-subtle)',
                        color: 'var(--brand-text)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 10,
                        fontWeight: 700,
                      }}
                      aria-hidden="true"
                    >
                      {getInitials(member.first_name, member.last_name)}
                    </div>
                  )}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: 'var(--text-primary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {name}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{member.role}</div>
                  </div>
                  <span
                    style={{
                      marginLeft: 'auto',
                      fontSize: 12,
                      fontWeight: 700,
                      fontFamily: 'var(--font-mono)',
                      color: pct === 100 ? 'var(--success)' : 'var(--text-secondary)',
                      flexShrink: 0,
                    }}
                  >
                    {pct}%
                  </span>
                </div>

                {/* Template subtitle */}
                <div style={{ paddingLeft: 38, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                  {templateName && !isDefaultTemplate ? (
                    <>
                      <span style={{
                        width: 5, height: 5, borderRadius: '50%',
                        background: 'var(--brand)', display: 'inline-block', flexShrink: 0,
                      }} />
                      <span style={{ fontSize: 10, color: 'var(--brand-text, var(--brand))', fontWeight: 500 }}>
                        {templateName}
                      </span>
                    </>
                  ) : templateName && isDefaultTemplate ? (
                    <>
                      <span style={{
                        width: 5, height: 5, borderRadius: '50%',
                        background: 'var(--text-muted)', display: 'inline-block', flexShrink: 0,
                      }} />
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                        {templateName}
                      </span>
                    </>
                  ) : (
                    <span style={{ fontSize: 10, color: 'var(--text-subtle)', fontStyle: 'italic' }}>
                      {t('companies.noTemplateAssigned')}
                    </span>
                  )}
                </div>

                {/* Progress bar */}
                <div
                  style={{
                    height: 4,
                    borderRadius: 2,
                    background: 'var(--bg-raised)',
                    overflow: 'hidden',
                  }}
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${pct}%`,
                      borderRadius: 2,
                      background: pct === 100 ? 'var(--success)' : 'var(--brand)',
                      transition: 'width 0.3s',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </section>

        {/* Right: detail panel */}
        {selectedUserId != null ? (
          <section
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '16px 18px',
            }}
          >
            {/* Detail header */}
            {(() => {
              const firstName = selectedMember?.first_name ?? detail?.user?.first_name ?? '';
              const lastName = selectedMember?.last_name ?? detail?.user?.last_name ?? '';
              const detailName = `${firstName} ${lastName}`.trim();
              const done = detail?.completed_steps ?? selectedMember?.completed_steps ?? 0;
              const total = detail?.total_steps ?? selectedMember?.total_steps ?? 0;
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;

              return (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    paddingBottom: 14,
                    borderBottom: '1px solid var(--border-faint)',
                    marginBottom: 14,
                  }}
                >
                  <div>
                    <div
                      style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}
                    >
                      {detailName}
                    </div>
                    <div
                      style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}
                    >
                      {t('companies.stepsRatio', { completed: done, total })}
                      {' '}{t('companies.onboardingCompleted').toLowerCase()}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button
                      type="button"
                      onClick={() => setAssignModalUserId(selectedUserId)}
                      style={{
                        padding: '4px 10px', fontSize: 12, fontWeight: 500, borderRadius: 6,
                        border: '1px solid var(--border)', background: 'var(--bg-raised)',
                        color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      {(() => {
                        const curAssignment = assignments.find((a) => Number(a.user) === Number(selectedUserId));
                        const hasTemplate = selectedMember?.template_name ?? curAssignment?.template_name ?? null;
                        return hasTemplate ? t('companies.reassignTemplate') : t('companies.assignTemplate');
                      })()}
                    </button>
                    <span
                      style={{
                        fontSize: 20,
                        fontWeight: 800,
                        fontFamily: 'var(--font-mono)',
                        letterSpacing: '-0.025em',
                        color: pct === 100 ? 'var(--success)' : 'var(--text-primary)',
                      }}
                    >
                      {pct}%
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Detail loading */}
            {detailQuery.isLoading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 14px',
                      borderRadius: 8,
                      border: '1px solid var(--border-faint)',
                      background: 'var(--bg-surface)',
                      animation: 'pulse 1.5s ease-in-out infinite',
                    }}
                  >
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        background: 'var(--bg-raised)',
                        flexShrink: 0,
                      }}
                    />
                    <div
                      style={{ height: 13, flex: 1, borderRadius: 4, background: 'var(--bg-raised)' }}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Detail error */}
            {detailQuery.isError && (
              <div style={{ fontSize: 13, color: 'var(--danger)' }}>
                {t('companies.teamOnboardingLoadError')}
              </div>
            )}

            {/* Empty steps */}
            {detail && detail.steps.length === 0 && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '32px 16px',
                }}
              >
                <ClipboardList
                  style={{ width: 32, height: 32, color: 'var(--text-muted)', marginBottom: 8 }}
                  aria-hidden="true"
                />
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
                  {t('companies.onboardingNotStarted')}
                </p>
              </div>
            )}

            {/* Step cards */}
            {detail && detail.steps.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {detail.steps.map((step, stepIndex) => (
                  <div
                    key={step.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 14px',
                      borderRadius: 8,
                      border: '1px solid var(--border-faint)',
                      background: step.is_completed ? 'var(--bg-active)' : 'var(--bg-surface)',
                    }}
                  >
                    {/* Step indicator */}
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        flexShrink: 0,
                        background: step.is_completed ? 'var(--brand)' : 'var(--bg-raised)',
                        border: step.is_completed ? 'none' : '1.5px solid var(--border-strong)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      aria-hidden="true"
                    >
                      {step.is_completed ? (
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#fff"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M5 12l5 5L20 7" />
                        </svg>
                      ) : (
                        <span
                          style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}
                        >
                          {stepIndex + 1}
                        </span>
                      )}
                    </div>

                    {/* Step title */}
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: step.is_completed ? 500 : 400,
                        color: step.is_completed ? 'var(--text-primary)' : 'var(--text-secondary)',
                      }}
                    >
                      {step.title}
                    </span>

                    {/* Completed label */}
                    {step.is_completed && (
                      <span
                        style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-subtle)', whiteSpace: 'nowrap' }}
                      >
                        {step.completed_at ? formatDate(step.completed_at) : t('companies.stepDone')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : (
          <div />
        )}
      </div>

      {/* Assign Template Modal */}
      <AssignTemplateModal
        isOpen={assignModalUserId !== null}
        onClose={() => setAssignModalUserId(null)}
        userId={assignModalUserId ?? 0}
        userName={assignModalUser ? `${assignModalUser.first_name} ${assignModalUser.last_name}`.trim() : ''}
        templates={templates}
        isPending={assignMutation.isPending}
        error={assignError}
        onAssign={handleAssign}
      />
    </div>
  );
}
