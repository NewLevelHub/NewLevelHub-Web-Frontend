import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MailPlus, RefreshCw, Ban } from 'lucide-react';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { USER_ROLES, type UserRole } from '@/shared/config/constants';
import { getApiError } from '@/shared/lib/getApiError';
import { companiesCacheRoot } from '@/shared/lib/companyQueryKeys';
import { cn } from '@/shared/lib/cn';
import { useAuth } from '@/shared/hooks/useAuth';
import type { Company, CompanyInvitation, CompanyMember, PaginatedResponse } from '@/shared/types';

const inputClass =
  'mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary placeholder:text-muted focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20';
const labelClass = 'block text-sm font-medium text-secondary';
const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50';
const btnGhost =
  'inline-flex items-center justify-center gap-1 rounded-lg border border-default px-3 py-1.5 text-xs font-medium text-secondary hover:bg-hover disabled:opacity-50';

const INVITE_ROLES: { value: UserRole; label: string }[] = [
  { value: USER_ROLES.EMPLOYEE, label: 'Сотрудник' },
  { value: USER_ROLES.COMPANY_ADMIN, label: 'Администратор компании' },
];

export default function CompanyMembersPage() {
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

  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>(USER_ROLES.EMPLOYEE);
  const [formError, setFormError] = useState('');
  const [filterUsed, setFilterUsed] = useState<boolean | undefined>(undefined);
  const [filterExpired, setFilterExpired] = useState<boolean | undefined>(undefined);

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
    queryKey: ['company-invitations', companyId, filterUsed, filterExpired],
    enabled: Boolean(companyId),
    queryFn: () =>
      apiClient
        .get<PaginatedResponse<CompanyInvitation>>(API.companies.invitations(companyId!), {
          params: {
            ...(filterUsed !== undefined ? { is_used: filterUsed } : {}),
            ...(filterExpired !== undefined ? { is_expired: filterExpired } : {}),
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

  if (!companyId && !isSuperadmin) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-2xl font-semibold text-primary">Участники</h1>
        <p className="mt-2 text-secondary">К компании не привязан профиль.</p>
      </div>
    );
  }

  const canOfferCompanyAdmin = user?.role === USER_ROLES.SUPERADMIN;
  const roleOptions = INVITE_ROLES.filter(
    (o) => o.value !== USER_ROLES.COMPANY_ADMIN || canOfferCompanyAdmin,
  );

  async function onInviteSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    createInvite.mutate({ email: email.trim().toLowerCase(), role });
  }

  const invitations = invitationsQuery.data?.results ?? [];
  const members = membersData?.results ?? [];

  return (
    <div className="max-w-4xl space-y-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Участники</h1>
          <p className="mt-1 text-sm text-secondary">
            {isSuperadmin && !companyId
              ? 'Выберите компанию ниже, чтобы просматривать участников и отправлять приглашения.'
              : (
                  <>
                    Сотрудники компании и приглашения по email.{' '}
                    <Link to="/company/settings" className="text-brand hover:text-brand">
                      Общие настройки
                    </Link>
                  </>
                )}
          </p>
        </div>
        <button
          type="button"
          disabled={!companyId}
          title={!companyId ? 'Сначала выберите компанию' : undefined}
          onClick={() => {
            setInviteOpen((v) => !v);
            setFormError('');
          }}
          className={btnPrimary}
        >
          <MailPlus className="h-4 w-4" />
          Пригласить
        </button>
      </div>

      {isSuperadmin ? (
        <section className="rounded-xl border border-default bg-surface/50 p-4">
          <label className={labelClass} htmlFor="company-select">
            Компания
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
            <option value="">Выберите компанию</option>
            {(companiesData?.results ?? []).map((company) => (
              <option key={company.id} value={String(company.id)}>
                {company.name}
              </option>
            ))}
          </select>
        </section>
      ) : null}

      {!companyId ? (
        <section className="rounded-xl border border-default bg-surface/50 p-6">
          <p className="text-sm text-secondary">Выберите компанию, чтобы просмотреть участников и инвайты.</p>
        </section>
      ) : null}

      {inviteOpen && companyId ? (
        <section
          className={cn(
            'rounded-xl border border-default bg-surface/50 p-6',
            'shadow-sm shadow-black/20',
          )}
        >
          <h2 className="text-lg font-medium text-primary">Новое приглашение</h2>
          <form onSubmit={onInviteSubmit} className="mt-4 max-w-md space-y-4">
            {formError ? (
              <div className="rounded-lg border border-red-200 dark:border-red-900/40 bg-danger-subtle px-3 py-2 text-sm text-danger">
                {formError}
              </div>
            ) : null}
            <div>
              <label htmlFor="invite-email" className={labelClass}>
                Email
              </label>
              <input
                id="invite-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder="colleague@company.com"
                autoComplete="off"
              />
            </div>
            <div>
              <label htmlFor="invite-role" className={labelClass}>
                Роль
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
                {createInvite.isPending ? 'Отправка…' : 'Отправить приглашение'}
              </button>
              <button
                type="button"
                onClick={() => setInviteOpen(false)}
                className="rounded-lg border border-default px-4 py-2 text-sm text-secondary hover:bg-hover"
              >
                Отмена
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {companyId ? (
      <section>
        <h2 className="text-lg font-medium text-primary">Сотрудники</h2>
        {membersLoading ? (
          <p className="mt-3 text-sm text-muted">Загрузка…</p>
        ) : (
          <ul className="mt-4 divide-y divide-[color:var(--border)] rounded-xl border border-default">
            {members.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <div>
                  <p className="font-medium text-primary">{m.full_name}</p>
                  <p className="text-sm text-secondary">{m.email}</p>
                </div>
                <span className="rounded-full bg-raised px-2.5 py-0.5 text-xs text-secondary">
                  {m.role}
                </span>
              </li>
            ))}
            {!members.length ? (
              <li className="px-4 py-6 text-center text-sm text-muted">Пока нет сотрудников</li>
            ) : null}
          </ul>
        )}
      </section>
      ) : null}

      {companyId ? (
      <section>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-lg font-medium text-primary">Приглашения</h2>
          <div className="flex flex-wrap gap-3 text-sm">
            <label className="flex items-center gap-2 text-secondary">
              <span>Использовано</span>
              <select
                value={filterUsed === undefined ? '' : filterUsed ? 'true' : 'false'}
                onChange={(e) => {
                  const v = e.target.value;
                  setFilterUsed(v === '' ? undefined : v === 'true');
                }}
                className="rounded-md border border-default bg-surface px-2 py-1 text-primary"
              >
                <option value="">Все</option>
                <option value="true">Да</option>
                <option value="false">Нет</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-secondary">
              <span>Просрочено</span>
              <select
                value={filterExpired === undefined ? '' : filterExpired ? 'true' : 'false'}
                onChange={(e) => {
                  const v = e.target.value;
                  setFilterExpired(v === '' ? undefined : v === 'true');
                }}
                className="rounded-md border border-default bg-surface px-2 py-1 text-primary"
              >
                <option value="">Все</option>
                <option value="true">Да</option>
                <option value="false">Нет</option>
              </select>
            </label>
            {(filterUsed !== undefined || filterExpired !== undefined) ? (
              <button
                type="button"
                onClick={() => {
                  setFilterUsed(undefined);
                  setFilterExpired(undefined);
                }}
                className="rounded-md border border-default px-3 py-1 text-secondary hover:bg-hover"
              >
                Сбросить фильтры
              </button>
            ) : null}
          </div>
        </div>

        {invitationsQuery.isLoading ? (
          <p className="mt-3 text-sm text-muted">Загрузка…</p>
        ) : (
          <ul className="mt-4 divide-y divide-[color:var(--border)] rounded-xl border border-default">
            {invitations.map((inv) => (
              <li key={inv.id} className="px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-primary">{inv.email}</p>
                    <p className="text-xs text-muted">
                      {inv.role} · до {new Date(inv.expires_at).toLocaleString()}
                      {inv.is_expired ? ' · просрочено' : inv.is_used ? ' · использовано' : ''}
                    </p>
                    {isSuperadmin && selectedCompanyName ? (
                      <p className="text-xs text-muted">Компания: {selectedCompanyName}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={inv.is_used || resendInvite.isPending}
                      onClick={() => resendInvite.mutate(inv.id)}
                      className={btnGhost}
                      title="Новая ссылка будет отправлена на email"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Отправить снова
                    </button>
                    <button
                      type="button"
                      disabled={inv.is_used || revokeInvite.isPending}
                      onClick={() => revokeInvite.mutate(inv.id)}
                      className={btnGhost}
                    >
                      <Ban className="h-3.5 w-3.5" />
                      Отозвать
                    </button>
                  </div>
                </div>
              </li>
            ))}
            {!invitations.length ? (
              <li className="px-4 py-6 text-center text-sm text-muted">Нет приглашений</li>
            ) : null}
          </ul>
        )}
      </section>
      ) : null}
    </div>
  );
}
