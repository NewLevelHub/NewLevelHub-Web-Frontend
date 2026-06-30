import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Send } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { USER_ROLES } from '@/shared/config/constants';
import { getApiError } from '@/shared/lib/getApiError';
import { fmtDateTime } from '@/shared/lib/formatDate';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import type { CompanyInvitation, PaginatedResponse } from '@/shared/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type InviteFilter = 'all' | 'pending' | 'expired';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function InviteStatusBadge({ inv }: { inv: CompanyInvitation }) {
  const { t } = useTranslation();
  if (inv.is_used) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 11,
          fontWeight: 600,
          padding: '2px 8px',
          borderRadius: 20,
          background: 'var(--success-bg)',
          color: 'var(--success-text)',
        }}
      >
        {t('invites.statusUsed')}
      </span>
    );
  }
  if (inv.is_expired) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 11,
          fontWeight: 600,
          padding: '2px 8px',
          borderRadius: 20,
          background: 'var(--bg-raised)',
          color: 'var(--text-muted)',
        }}
      >
        {t('invites.statusExpired')}
      </span>
    );
  }
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 11,
        fontWeight: 600,
        padding: '2px 8px',
        borderRadius: 20,
        background: 'rgba(245,158,11,0.12)',
        color: '#d97706',
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: '#d97706',
          flexShrink: 0,
        }}
      />
      {t('invites.statusPending')}
    </span>
  );
}

function InviteRoleBadge({ role }: { role: string }) {
  const { t } = useTranslation();
  const isAdmin = role === USER_ROLES.COMPANY_ADMIN;
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: '2px 8px',
        borderRadius: 4,
        background: isAdmin ? 'var(--brand-subtle)' : 'var(--bg-raised)',
        color: isAdmin ? 'var(--brand-text)' : 'var(--text-secondary)',
      }}
    >
      {isAdmin ? t('team.roleCompanyAdmin') : t('team.roleEmployee')}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface InvitesPanelProps {
  companyId: string;
}

export default function InvitesPanel({ companyId }: InvitesPanelProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState<InviteFilter>('all');
  const [revokeTarget, setRevokeTarget] = useState<CompanyInvitation | null>(null);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<string>(USER_ROLES.EMPLOYEE);
  const [formError, setFormError] = useState('');

  const queryParams = (
    {
      all: {},
      pending: { is_used: 'false', is_expired: 'false' },
      expired: { is_expired: 'true' },
    } as const
  )[filter];

  const { data: invitesData, isLoading } = useQuery({
    queryKey: ['company-invitations', companyId, filter],
    enabled: Boolean(companyId),
    queryFn: () =>
      apiClient
        .get<PaginatedResponse<CompanyInvitation>>(API.companies.invitations(companyId), {
          params: queryParams,
        })
        .then((r) => r.data),
  });

  const invitations = invitesData?.results ?? [];

  const createInvite = useMutation({
    mutationFn: (body: { email: string; role: string }) =>
      apiClient.post(API.companies.invitations(companyId), body),
    onSuccess: () => {
      setEmail('');
      setRole(USER_ROLES.EMPLOYEE);
      setFormError('');
      void queryClient.invalidateQueries({ queryKey: ['company-invitations', companyId] });
    },
    onError: (err) => {
      setFormError(getApiError(err).message);
    },
  });

  const revokeInvite = useMutation({
    mutationFn: (invitationId: number) =>
      apiClient.post(API.companies.invitationRevoke(companyId, String(invitationId))),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['company-invitations', companyId] });
    },
  });

  const resendInvite = useMutation({
    mutationFn: (invitationId: number) =>
      apiClient.post(API.companies.invitationResend(companyId, String(invitationId))),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['company-invitations', companyId] });
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    createInvite.mutate({ email: email.trim().toLowerCase(), role });
  }

  const filters: InviteFilter[] = ['all', 'pending', 'expired'];

  function filterLabel(f: InviteFilter): string {
    if (f === 'all') return t('invites.filterAll');
    if (f === 'pending') return t('invites.filterPending');
    return t('invites.filterExpired');
  }

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 18, alignItems: 'start' }}>
        {/* Left: invite form card */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '18px 20px',
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--text-primary)',
              marginBottom: 16,
            }}
          >
            {t('invites.formTitle')}
          </div>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {formError && (
              <p style={{ fontSize: 12, color: 'var(--danger)', marginBottom: 4 }}>{formError}</p>
            )}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 500,
                  color: 'var(--text-secondary)',
                  marginBottom: 5,
                }}
              >
                {t('common.email')}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('companies.inviteEmailPlaceholder')}
                style={{
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-raised)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  fontFamily: 'inherit',
                  outline: 'none',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 500,
                  color: 'var(--text-secondary)',
                  marginBottom: 5,
                }}
              >
                {t('common.role')}
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={{
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-raised)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  fontFamily: 'inherit',
                  width: '100%',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              >
                <option value={USER_ROLES.EMPLOYEE}>{t('team.roleEmployee')}</option>
                <option value={USER_ROLES.COMPANY_ADMIN}>{t('team.roleCompanyAdmin')}</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={createInvite.isPending}
              className="inline-flex items-center justify-center gap-1.5 h-[34px] px-3 text-[13px] font-medium bg-[color:var(--brand)] text-white rounded-[var(--radius-sm)] hover:opacity-90 transition-opacity disabled:opacity-50 w-full"
            >
              <Send size={13} aria-hidden="true" />
              {createInvite.isPending ? t('common.submitting') : t('invites.sendBtn')}
            </button>
          </form>
        </div>

        {/* Right: invites table */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
          }}
        >
          {/* Toolbar: filter chips */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 14px',
              borderBottom: '1px solid var(--border-faint)',
            }}
          >
            {filters.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                style={{
                  padding: '3px 10px',
                  borderRadius: 20,
                  border: '1px solid',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  borderColor: filter === f ? 'var(--brand)' : 'var(--border)',
                  background:
                    filter === f
                      ? 'color-mix(in oklab, var(--brand) 10%, var(--bg-surface))'
                      : 'var(--bg-raised)',
                  color: filter === f ? 'var(--brand-text)' : 'var(--text-secondary)',
                }}
              >
                {filterLabel(f)}
              </button>
            ))}
          </div>

          {/* Table */}
          {isLoading ? (
            <p style={{ padding: '24px 16px', fontSize: 13, color: 'var(--text-muted)' }}>
              {t('common.loading')}
            </p>
          ) : invitations.length === 0 ? (
            <p
              style={{
                padding: '32px 16px',
                fontSize: 13,
                color: 'var(--text-muted)',
                textAlign: 'center',
              }}
            >
              {t('invites.empty')}
            </p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-faint)' }}>
                  {[
                    t('invites.colEmail'),
                    t('invites.colRole'),
                    t('invites.colSent'),
                    t('invites.colStatus'),
                    '',
                  ].map((h, i) => (
                    <th
                      key={i}
                      style={{
                        padding: '9px 14px',
                        textAlign: i === 4 ? 'right' : 'left',
                        fontSize: 11,
                        fontWeight: 600,
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invitations.map((inv) => (
                  <tr key={inv.id} style={{ borderBottom: '1px solid var(--border-faint)' }}>
                    <td
                      style={{
                        padding: '10px 14px',
                        fontFamily: 'var(--font-mono, monospace)',
                        fontSize: 12,
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {inv.email}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <InviteRoleBadge role={inv.role} />
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-muted)' }}>
                      {fmtDateTime(inv.expires_at)}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <InviteStatusBadge inv={inv} />
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        {!inv.is_used && (
                          <button
                            type="button"
                            disabled={resendInvite.isPending}
                            onClick={() => resendInvite.mutate(inv.id)}
                            style={{
                              padding: '4px 10px',
                              fontSize: 12,
                              fontWeight: 500,
                              borderRadius: 6,
                              border: '1px solid var(--border)',
                              background: 'var(--bg-raised)',
                              color: 'var(--text-secondary)',
                              cursor: 'pointer',
                              fontFamily: 'inherit',
                            }}
                          >
                            {t('invites.resend')}
                          </button>
                        )}
                        {!inv.is_used && (
                          <button
                            type="button"
                            disabled={revokeInvite.isPending}
                            onClick={() => setRevokeTarget(inv)}
                            style={{
                              padding: '4px 10px',
                              fontSize: 12,
                              fontWeight: 500,
                              borderRadius: 6,
                              border: '1px solid var(--border)',
                              background: 'transparent',
                              color: 'var(--danger)',
                              cursor: 'pointer',
                              fontFamily: 'inherit',
                            }}
                          >
                            {t('invites.revoke')}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Revoke confirm modal */}
      <ConfirmModal
        isOpen={revokeTarget !== null}
        onClose={() => !revokeInvite.isPending && setRevokeTarget(null)}
        onConfirm={() => {
          if (!revokeTarget) return;
          revokeInvite.mutate(revokeTarget.id, {
            onSettled: () => setRevokeTarget(null),
          });
        }}
        title={t('invites.revokeTitle')}
        description={t('invites.revokeDesc', { email: revokeTarget?.email ?? '' })}
        confirmLabel={t('invites.revoke')}
        variant="danger"
        isLoading={revokeInvite.isPending}
      />
    </>
  );
}
