import { useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MailPlus, RefreshCw, Ban, Users, Settings2, ListChecks, AlertCircle, UserX, ChevronLeft, ChevronRight } from 'lucide-react';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { USER_ROLES, USER_ROLE_LABEL_KEYS, type UserRole } from '@/shared/config/constants';
import { getApiError } from '@/shared/lib/getApiError';
import { companiesCacheRoot } from '@/shared/lib/companyQueryKeys';
import { cn } from '@/shared/lib/cn';
import { fmtDateTime } from '@/shared/lib/formatDate';
import { useAuth } from '@/shared/hooks/useAuth';
import type { Company, CompanyInvitation, CompanyMember, PaginatedResponse } from '@/shared/types';

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?';
  return ((parts[0][0] ?? '') + (parts[parts.length - 1][0] ?? '')).toUpperCase();
}

const inputClass =
  'mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand';
const labelClass = 'block text-sm font-medium text-secondary';
const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50';
const btnGhost =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-default px-3 py-1.5 text-xs font-medium text-secondary hover:bg-hover disabled:opacity-50';

export default function CompanyMembersPage() {
  const { t } = useTranslation();
  const inviteRoles = useMemo(
    () => [
      { value: USER_ROLES.EMPLOYEE, label: t(USER_ROLE_LABEL_KEYS[USER_ROLES.EMPLOYEE]) },
      { value: USER_ROLES.COMPANY_ADMIN, label: t(USER_ROLE_LABEL_KEYS[USER_ROLES.COMPANY_ADMIN]) },
    ],
    [t],
  );
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const isSuperadmin = user?.role === USER_ROLES.SUPERADMIN;
  const initialCompanyId = searchParams.get('company') ?? '';
  const [selectedCompanyId, setSelectedCompanyId] = useState(initialCompanyId);
  const companyId = isSuperadmin
    ? selectedCompanyId || null
    : user?.company_id != null
      ? String(user.company_id)
      : null;

  const INV_PAGE_SIZE = 10;

  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>(USER_ROLES.EMPLOYEE);
  const [formError, setFormError] = useState('');
  const [filterUsed, setFilterUsed] = useState<boolean | undefined>(undefined);
  const [filterExpired, setFilterExpired] = useState<boolean | undefined>(undefined);
  const [invPage, setInvPage] = useState(1);

  const { data: companiesData } = useQuery({
    queryKey: [...companiesCacheRoot(user?.id), 'list'],
    enabled: isSuperadmin,
    queryFn: () =>
      apiClient
        .get<PaginatedResponse<Company>>(API.companies.list)
        .then((r) => r.data),
  });
  const selectedCompanyName =
    companiesData?.results.find((company) => String(company.id) === companyId)?.name ?? null;

  const { data: membersData, isLoading: membersLoading } = useQuery({
    queryKey: ['company-members', companyId],
    enabled: Boolean(companyId),
    queryFn: () =>
      apiClient
        .get<PaginatedResponse<CompanyMember>>(API.companies.members(companyId!))
        .then((r) => r.data),
  });

  const invitationsQuery = useQuery({
    queryKey: ['company-invitations', companyId, filterUsed, filterExpired, invPage],
    enabled: Boolean(companyId),
    queryFn: () =>
      apiClient
        .get<PaginatedResponse<CompanyInvitation>>(API.companies.invitations(companyId!), {
          params: {
            ...(filterUsed !== undefined ? { is_used: filterUsed } : {}),
            ...(filterExpired !== undefined ? { is_expired: filterExpired } : {}),
            page: invPage,
            page_size: INV_PAGE_SIZE,
          },
        })
        .then((r) => r.data),
  });

  const createInvite = useMutation({
    mutationFn: (body: { email: string; role: string }) =>
      apiClient.post(API.companies.invitations(companyId!), body),
    onSuccess: () => {
      setEmail('');
      setRole(USER_ROLES.EMPLOYEE);
      setInviteOpen(false);
      setFormError('');
      void queryClient.invalidateQueries({ queryKey: ['company-invitations', companyId] });
    },
    onError: (err) => {
      setFormError(getApiError(err).message);
    },
  });

  const revokeInvite = useMutation({
    mutationFn: (invitationId: number) =>
      apiClient.post(API.companies.invitationRevoke(companyId!, String(invitationId))),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['company-invitations', companyId] });
    },
  });

  const resendInvite = useMutation({
    mutationFn: (invitationId: number) =>
      apiClient.post(API.companies.invitationResend(companyId!, String(invitationId))),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['company-invitations', companyId] });
    },
  });

  const canOfferCompanyAdmin = user?.role === USER_ROLES.SUPERADMIN;
  const roleOptions = inviteRoles.filter(
    (o) => o.value !== USER_ROLES.COMPANY_ADMIN || canOfferCompanyAdmin,
  );

  async function onInviteSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    createInvite.mutate({ email: email.trim().toLowerCase(), role });
  }

  const invitations = invitationsQuery.data?.results ?? [];
  const members = membersData?.results ?? [];

  if (!companyId && !isSuperadmin) {
    return (
      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-brand" aria-hidden="true" />
            <h1 className="text-2xl font-semibold text-primary">{t('companies.membersTitle')}</h1>
          </div>
          <p className="mt-1 text-sm text-secondary">{t('companies.membersNoCompany')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-brand" aria-hidden="true" />
            <h1 className="text-2xl font-semibold text-primary">{t('companies.membersTitle')}</h1>
          </div>
          <p className="mt-1 text-sm text-muted">
            {isSuperadmin && !companyId
              ? t('companies.selectCompanyHint')
              : t('companies.membersSubtitle')}
          </p>
        </div>
        <button
          type="button"
          disabled={!companyId}
          title={!companyId ? t('companies.selectCompanyFirst') : undefined}
          onClick={() => {
            setInviteOpen((v) => !v);
            setFormError('');
          }}
          className={btnPrimary}
        >
          <MailPlus className="h-4 w-4" aria-hidden="true" />
          {t('companies.invite')}
        </button>
      </div>

      {/* Tab navigation */}
      <nav className="flex flex-wrap gap-2" aria-label={t('companies.membersTitle')}>
        <Link
          to={`/company/settings${companyId ? `?company=${companyId}` : ''}`}
          className="inline-flex items-center gap-1.5 rounded-full border border-default px-4 py-1.5 text-sm text-secondary hover:bg-hover"
        >
          <Settings2 className="h-3.5 w-3.5" aria-hidden="true" />
          {t('companies.generalSettings')}
        </Link>
        <span
          className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-1.5 text-sm font-medium text-white"
          aria-current="page"
        >
          <Users className="h-3.5 w-3.5" aria-hidden="true" />
          {t('companies.membersTitle')}
        </span>
        <Link
          to={`/company/settings/onboarding${companyId ? `?company=${companyId}` : ''}`}
          className="inline-flex items-center gap-1.5 rounded-full border border-default px-4 py-1.5 text-sm text-secondary hover:bg-hover"
        >
          <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />
          {t('companies.onboardingTemplatesLink')}
        </Link>
        <Link
          to={`/company/settings/onboarding/team${companyId ? `?company=${companyId}` : ''}`}
          className="inline-flex items-center gap-1.5 rounded-full border border-default px-4 py-1.5 text-sm text-secondary hover:bg-hover"
        >
          <Users className="h-3.5 w-3.5" aria-hidden="true" />
          {t('companies.teamOnboardingTab')}
        </Link>
      </nav>

      {/* Superadmin company selector */}
      {isSuperadmin ? (
        <section className="rounded-xl border border-default bg-surface p-4">
          <label className={labelClass} htmlFor="company-select">
            {t('common.company')}
          </label>
          <select
            id="company-select"
            value={selectedCompanyId}
            onChange={(e) => {
              setSelectedCompanyId(e.target.value);
              setFilterUsed(undefined);
              setFilterExpired(undefined);
            }}
            className={inputClass}
          >
            <option value="">{t('common.selectCompany')}</option>
            {(companiesData?.results ?? []).map((company) => (
              <option key={company.id} value={String(company.id)}>
                {company.name}
              </option>
            ))}
          </select>
        </section>
      ) : null}

      {/* Empty state — no company selected yet */}
      {!companyId ? (
        <section className="rounded-xl border border-default bg-surface p-6">
          <p className="text-sm text-secondary">{t('companies.selectCompanyToView')}</p>
        </section>
      ) : null}

      {/* Invite form */}
      {inviteOpen && companyId ? (
        <section className="rounded-xl border border-default bg-surface p-6 shadow-sm shadow-black/10">
          <h2 className="text-base font-semibold text-primary">{t('companies.newInvitation')}</h2>
          <form onSubmit={onInviteSubmit} className="mt-4 max-w-md space-y-4">
            {formError ? (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-default bg-danger-subtle px-3 py-2 text-sm text-danger"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{formError}</span>
              </div>
            ) : null}
            <div>
              <label htmlFor="invite-email" className={labelClass}>
                {t('common.email')}
              </label>
              <input
                id="invite-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder={t('companies.inviteEmailPlaceholder')}
                autoComplete="off"
              />
            </div>
            <div>
              <label htmlFor="invite-role" className={labelClass}>
                {t('common.role')}
              </label>
              <select
                id="invite-role"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className={inputClass}
              >
                {roleOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={createInvite.isPending} className={btnPrimary}>
                {createInvite.isPending ? t('common.submitting') : t('companies.sendInvitation')}
              </button>
              <button
                type="button"
                onClick={() => setInviteOpen(false)}
                className="rounded-lg border border-default px-4 py-2 text-sm text-secondary hover:bg-hover"
              >
                {t('common.cancel')}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {/* Members list */}
      {companyId ? (
        <section>
          <h2 className="text-base font-semibold text-primary">
            {t('companies.membersTitle')}
            {!membersLoading && members.length > 0 ? (
              <span className="ml-2 inline-flex items-center rounded-full bg-raised px-2 py-0.5 text-xs font-medium text-secondary">
                {members.length}
              </span>
            ) : null}
          </h2>
          {membersLoading ? (
            <p className="mt-3 text-sm text-muted">{t('common.loading')}</p>
          ) : !members.length ? (
            <div className="mt-3 flex flex-col items-center justify-center rounded-xl border border-default bg-surface py-12">
              <UserX className="mb-3 h-10 w-10 text-muted" aria-hidden="true" />
              <p className="text-sm font-medium text-secondary">{t('companies.noMembers')}</p>
            </div>
          ) : (
            <ul className="mt-3 divide-y divide-[color:var(--border)] rounded-xl border border-default overflow-hidden">
              {members.map((m) => (
                <li
                  key={m.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-hover"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="h-8 w-8 rounded-full bg-raised flex items-center justify-center text-xs font-semibold text-secondary shrink-0"
                      aria-hidden="true"
                    >
                      {getInitials(m.full_name)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-primary">{m.full_name}</p>
                      <p className="truncate text-sm text-secondary">{m.email}</p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-raised px-2.5 py-0.5 text-xs font-medium text-secondary">
                    {t(USER_ROLE_LABEL_KEYS[m.role as UserRole]) ?? m.role}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {/* Invitations list */}
      {companyId ? (
        <section>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-base font-semibold text-primary">
              {t('companies.invitationsTitle')}
              {!invitationsQuery.isLoading && invitations.length > 0 ? (
                <span className="ml-2 inline-flex items-center rounded-full bg-raised px-2 py-0.5 text-xs font-medium text-secondary">
                  {invitations.length}
                </span>
              ) : null}
            </h2>
            <div className="flex flex-wrap gap-3 text-sm">
              <label className="flex items-center gap-2 text-secondary">
                <span>{t('companies.filterUsed')}</span>
                <select
                  value={filterUsed === undefined ? '' : filterUsed ? 'true' : 'false'}
                  onChange={(e) => {
                    const v = e.target.value;
                    setFilterUsed(v === '' ? undefined : v === 'true');
                    setInvPage(1);
                  }}
                  className="rounded-md border border-default bg-surface px-2 py-1 text-sm text-primary focus:outline-none"
                >
                  <option value="">{t('companies.allOption')}</option>
                  <option value="true">{t('companies.yesOption')}</option>
                  <option value="false">{t('companies.noOption')}</option>
                </select>
              </label>
              <label className="flex items-center gap-2 text-secondary">
                <span>{t('common.overdue')}</span>
                <select
                  value={filterExpired === undefined ? '' : filterExpired ? 'true' : 'false'}
                  onChange={(e) => {
                    const v = e.target.value;
                    setFilterExpired(v === '' ? undefined : v === 'true');
                    setInvPage(1);
                  }}
                  className="rounded-md border border-default bg-surface px-2 py-1 text-sm text-primary focus:outline-none"
                >
                  <option value="">{t('companies.allOption')}</option>
                  <option value="true">{t('companies.yesOption')}</option>
                  <option value="false">{t('companies.noOption')}</option>
                </select>
              </label>
              {(filterUsed !== undefined || filterExpired !== undefined) ? (
                <button
                  type="button"
                  onClick={() => {
                    setFilterUsed(undefined);
                    setFilterExpired(undefined);
                    setInvPage(1);
                  }}
                  className="rounded-md border border-default px-3 py-1 text-sm text-secondary hover:bg-hover"
                >
                  {t('common.resetFilters')}
                </button>
              ) : null}
            </div>
          </div>

          {invitationsQuery.isLoading ? (
            <p className="mt-3 text-sm text-muted">{t('common.loading')}</p>
          ) : (
            <ul className="mt-3 divide-y divide-[color:var(--border)] rounded-xl border border-default overflow-hidden">
              {invitations.map((inv) => (
                <li key={inv.id} className="px-4 py-3 hover:bg-hover">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <span
                        className={cn(
                          'mt-1.5 w-2 h-2 rounded-full shrink-0',
                          inv.is_expired
                            ? 'bg-danger'
                            : inv.is_used
                              ? 'bg-raised'
                              : 'bg-success',
                        )}
                        aria-hidden="true"
                      />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-primary">{inv.email}</p>
                        <p className="mt-0.5 text-xs text-muted">
                          {t(USER_ROLE_LABEL_KEYS[inv.role as UserRole]) ?? inv.role}
                          {' · '}
                          {t('common.end')}: {fmtDateTime(inv.expires_at)}
                          {inv.is_expired
                            ? ` · ${t('companies.expiredSuffix')}`
                            : inv.is_used
                              ? ` · ${t('companies.usedSuffix')}`
                              : ''}
                        </p>
                        {isSuperadmin && selectedCompanyName ? (
                          <p className="mt-0.5 text-xs text-muted">
                            {t('companies.companyLabel', { name: selectedCompanyName })}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      {inv.is_expired ? (
                        <span className="rounded-full bg-danger-subtle px-2.5 py-0.5 text-xs text-danger">
                          {t('companies.expiredSuffix')}
                        </span>
                      ) : inv.is_used ? (
                        <span className="rounded-full bg-raised px-2.5 py-0.5 text-xs text-muted">
                          {t('companies.usedSuffix')}
                        </span>
                      ) : null}
                      <button
                        type="button"
                        disabled={inv.is_used || resendInvite.isPending}
                        onClick={() => resendInvite.mutate(inv.id)}
                        className={btnGhost}
                        title={t('companies.resendTitle')}
                      >
                        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                        {t('companies.resend')}
                      </button>
                      <button
                        type="button"
                        disabled={inv.is_used || revokeInvite.isPending}
                        onClick={() => revokeInvite.mutate(inv.id)}
                        className={cn(
                          btnGhost,
                          'border-default text-danger hover:bg-danger-subtle hover:border-danger/30',
                        )}
                      >
                        <Ban className="h-3.5 w-3.5" aria-hidden="true" />
                        {t('companies.revoke')}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
              {!invitations.length ? (
                <li className="px-4 py-8 text-center text-sm text-muted">
                  {t('companies.noInvitations')}
                </li>
              ) : null}
            </ul>
          )}

          {/* Pagination */}
          {(() => {
            const total = invitationsQuery.data?.count ?? 0;
            const totalPages = Math.ceil(total / INV_PAGE_SIZE);
            if (totalPages <= 1) return null;
            return (
              <div className="flex items-center justify-between pt-2 text-sm text-secondary">
                <span>
                  {t('companies.invitationsPageOf', {
                    page: invPage,
                    total: totalPages,
                    count: total,
                  })}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={invPage <= 1}
                    onClick={() => setInvPage((p) => p - 1)}
                    className="inline-flex items-center gap-1 rounded-lg border border-default px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 hover:bg-hover text-primary"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    {t('common.back')}
                  </button>
                  <button
                    type="button"
                    disabled={invPage >= totalPages}
                    onClick={() => setInvPage((p) => p + 1)}
                    className="inline-flex items-center gap-1 rounded-lg border border-default px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 hover:bg-hover text-primary"
                  >
                    {t('common.next')}
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            );
          })()}
        </section>
      ) : null}
    </div>
  );
}
