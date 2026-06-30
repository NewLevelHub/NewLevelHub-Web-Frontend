import React, { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, ChevronLeft, ChevronRight, RefreshCw, Ban } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { USER_ROLES } from '@/shared/config/constants';
import { getApiError } from '@/shared/lib/getApiError';
import { cn } from '@/shared/lib/cn';
import { fmtDateTime } from '@/shared/lib/formatDate';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import type { CompanyInvitation, PaginatedResponse } from '@/shared/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const INV_PAGE_SIZE = 10;

const btnGhost =
  'inline-flex items-center justify-center w-7 h-7 rounded-[var(--radius-sm)] text-[color:var(--text-muted)] hover:bg-[color:var(--bg-hover)] disabled:opacity-40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand)]/50';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type InviteFilter = 'all' | 'pending' | 'accepted' | 'expired' | 'revoked';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function InviteStatusBadge({ inv }: { inv: CompanyInvitation }) {
  const { t } = useTranslation();

  const dot = (
    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', flexShrink: 0, opacity: 0.85 }} />
  );

  const base: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
    whiteSpace: 'nowrap',
  };

  switch (inv.status) {
    case 'pending':
      return (
        <span style={{ ...base, background: 'rgba(245,158,11,0.12)', color: '#d97706' }}>
          {dot}
          {t('invites.statusPending')}
        </span>
      );
    case 'accepted':
      return (
        <span style={{ ...base, background: 'var(--brand-subtle)', color: 'var(--brand-text)' }}>
          {dot}
          {t('invites.statusAccepted')}
        </span>
      );
    case 'expired':
      return (
        <span style={{ ...base, background: 'var(--status-na-bg)', color: 'var(--status-na-text)' }}>
          {t('invites.statusExpired')}
        </span>
      );
    case 'revoked':
      return (
        <span style={{ ...base, background: 'var(--danger-bg)', color: 'var(--danger)' }}>
          {t('invites.statusRevoked')}
        </span>
      );
    default:
      return (
        <span style={{ ...base, background: 'var(--bg-raised)', color: 'var(--text-muted)' }}>
          {inv.status}
        </span>
      );
  }
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
  const [invPage, setInvPage] = useState(1);
  const [revokeTarget, setRevokeTarget] = useState<CompanyInvitation | null>(null);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<string>(USER_ROLES.EMPLOYEE);
  const [formError, setFormError] = useState('');

  function handleFilterChange(f: InviteFilter) {
    setFilter(f);
    setInvPage(1);
  }

  const filterParam = filter !== 'all' ? { status: filter } : {};

  const { data: invitesData, isLoading } = useQuery({
    queryKey: ['company-invitations', companyId, filter, invPage],
    enabled: Boolean(companyId),
    placeholderData: (prev) => prev,
    queryFn: () =>
      apiClient
        .get<PaginatedResponse<CompanyInvitation>>(API.companies.invitations(companyId), {
          params: { ...filterParam, page: invPage, page_size: INV_PAGE_SIZE },
        })
        .then((r) => r.data),
  });

  const total = invitesData?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / INV_PAGE_SIZE));
  const rangeStart = (invPage - 1) * INV_PAGE_SIZE + 1;
  const rangeEnd = Math.min(invPage * INV_PAGE_SIZE, total);

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

  const filters: InviteFilter[] = ['all', 'pending', 'accepted', 'expired', 'revoked'];

  function filterLabel(f: InviteFilter): string {
    if (f === 'all')      return t('invites.filterAll');
    if (f === 'pending')  return t('invites.filterPending');
    if (f === 'accepted') return t('invites.filterAccepted');
    if (f === 'expired')  return t('invites.filterExpired');
    if (f === 'revoked')  return t('invites.filterRevoked');
    return f;
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
                onClick={() => handleFilterChange(f)}
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
            {total > 0 && (
              <div className="ml-auto flex items-center gap-1.5 text-[12px] text-[color:var(--text-muted)]">
                <span>{rangeStart}–{rangeEnd} {t('common.of')} {total}</span>
                <button
                  type="button"
                  disabled={invPage <= 1}
                  onClick={() => setInvPage((p) => Math.max(1, p - 1))}
                  aria-label={t('common.previousPage')}
                  className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-sm)] text-[color:var(--text-muted)] hover:bg-[color:var(--bg-hover)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={invPage >= totalPages}
                  onClick={() => setInvPage((p) => Math.min(totalPages, p + 1))}
                  aria-label={t('common.nextPage')}
                  className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-sm)] text-[color:var(--text-muted)] hover:bg-[color:var(--bg-hover)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
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
                    <td className="px-3 py-2.5 align-middle">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={inv.status !== 'pending' || resendInvite.isPending}
                          onClick={() => resendInvite.mutate(inv.id)}
                          title={t('invites.resend')}
                          className={cn(btnGhost, 'hover:text-[color:var(--brand)]')}
                        >
                          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                          <span className="sr-only">{t('invites.resend')}</span>
                        </button>
                        <button
                          type="button"
                          disabled={inv.status !== 'pending' || revokeInvite.isPending}
                          onClick={() => setRevokeTarget(inv)}
                          title={t('invites.revoke')}
                          className={cn(btnGhost, 'hover:text-[color:var(--danger)] hover:bg-[color:var(--status-busy-bg)]')}
                        >
                          <Ban className="h-3.5 w-3.5" aria-hidden="true" />
                          <span className="sr-only">{t('invites.revoke')}</span>
                        </button>
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
