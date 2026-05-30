import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MailPlus, RefreshCw, Ban, Shield, LogIn, Trash2 } from 'lucide-react';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { USER_ROLES, USER_ROLE_LABELS, type UserRole } from '@/shared/config/constants';
import { getApiError } from '@/shared/lib/getApiError';
import { mapApiUser } from '@/shared/lib/mapUser';
import { cn } from '@/shared/lib/cn';
import { useAuth } from '@/shared/hooks/useAuth';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import type { CompanyInvitation, CompanyMember, PaginatedResponse } from '@/shared/types';

const inputClass =
  'mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary placeholder:text-muted focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20';
const labelClass = 'block text-sm font-medium text-secondary';
const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50';
const btnGhost =
  'inline-flex items-center justify-center gap-1 rounded-lg border border-default px-3 py-1.5 text-xs font-medium text-secondary hover:bg-hover disabled:opacity-50';

// Building-staff roles — not tied to a company; invited via /companies/building-invites/.
const BUILDING_INVITE_ROLES: { value: UserRole; label: string }[] = [
  { value: USER_ROLES.RECEPTION, label: USER_ROLE_LABELS[USER_ROLES.RECEPTION] },
  { value: USER_ROLES.SERVICE_MANAGER, label: USER_ROLE_LABELS[USER_ROLES.SERVICE_MANAGER] },
];

const ROLE_FILTERS: { value: UserRole | ''; label: string }[] = [
  { value: '', label: 'Все роли' },
  ...BUILDING_INVITE_ROLES,
];

export default function BuildingStaffPage() {
  const queryClient = useQueryClient();
  const { user, isImpersonating, startImpersonation } = useAuth();
  const isSuperadmin = user?.role === USER_ROLES.SUPERADMIN;

  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('');
  const [search, setSearch] = useState('');

  // Action targets
  const [blockTarget, setBlockTarget] = useState<CompanyMember | null>(null);
  const [impersonateTarget, setImpersonateTarget] = useState<CompanyMember | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CompanyMember | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const staffQuery = useQuery({
    queryKey: ['building-staff', { role: roleFilter, search }],
    queryFn: () =>
      apiClient
        .get<PaginatedResponse<CompanyMember>>(API.companies.buildingStaff, {
          params: {
            ...(roleFilter ? { role: roleFilter } : {}),
            ...(search.trim() ? { search: search.trim() } : {}),
          },
        })
        .then((r) => r.data),
  });

  // ── Invites ─────────────────────────────────────────────────────────
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>(USER_ROLES.SERVICE_MANAGER);
  const [formError, setFormError] = useState('');

  const invitesQuery = useQuery({
    queryKey: ['building-invitations'],
    queryFn: () =>
      apiClient
        .get<PaginatedResponse<CompanyInvitation>>(API.companies.buildingInvitations)
        .then((r) => r.data),
  });

  const createInvite = useMutation({
    mutationFn: (body: { email: string; role: string }) =>
      apiClient.post(API.companies.buildingInvitations, body),
    onSuccess: () => {
      setEmail('');
      setRole(USER_ROLES.SERVICE_MANAGER);
      setInviteOpen(false);
      setFormError('');
      void queryClient.invalidateQueries({ queryKey: ['building-invitations'] });
    },
    onError: (err) => {
      setFormError(getApiError(err).message);
    },
  });

  const revokeInvite = useMutation({
    mutationFn: (invitationId: number) =>
      apiClient.post(API.companies.buildingInvitationRevoke(String(invitationId))),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['building-invitations'] });
    },
  });

  const resendInvite = useMutation({
    mutationFn: (invitationId: number) =>
      apiClient.post(API.companies.buildingInvitationResend(String(invitationId))),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['building-invitations'] });
    },
  });

  const blockUserMutation = useMutation({
    mutationFn: ({ memberId, shouldBlock }: { memberId: number; shouldBlock: boolean }) =>
      apiClient.post(shouldBlock ? API.users.block(memberId) : API.users.unblock(memberId)),
    onSuccess: async () => {
      setActionError(null);
      setBlockTarget(null);
      await queryClient.invalidateQueries({ queryKey: ['building-staff'] });
      void queryClient.invalidateQueries({ queryKey: ['company-members'] });
      void queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
    },
    onError: (err) => {
      setActionError(getApiError(err).message);
    },
  });

  const impersonateMutation = useMutation({
    mutationFn: (memberId: number) =>
      apiClient
        .post<{ access: string; refresh: string; user: Record<string, unknown> }>(
          API.users.impersonate(memberId),
        )
        .then((r) => r.data),
    onSuccess: (data) => {
      const mappedUser = mapApiUser(data.user);
      startImpersonation(mappedUser, data.access);
    },
    onError: (err) => {
      setActionError(getApiError(err).message);
      setImpersonateTarget(null);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (memberId: number) =>
      apiClient.delete(API.users.detail(memberId)),
    onSuccess: async () => {
      setActionError(null);
      setDeleteTarget(null);
      await queryClient.invalidateQueries({ queryKey: ['building-staff'] });
    },
    onError: (err) => {
      setActionError(getApiError(err).message);
    },
  });

  const isActionPending =
    blockUserMutation.isPending ||
    impersonateMutation.isPending ||
    deleteUserMutation.isPending;

  function onInviteSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    createInvite.mutate({ email: email.trim().toLowerCase(), role });
  }

  const staff = staffQuery.data?.results ?? [];
  const invites = invitesQuery.data?.results ?? [];

  return (
    <div className="max-w-5xl space-y-10 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Сотрудники здания</h1>
          <p className="mt-1 text-sm text-secondary">
            Ресепшн и сервис-менеджеры — общедомовой персонал, не привязанный к конкретной компании.
          </p>
        </div>
        <button
          type="button"
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

      {/* Invite form */}
      {inviteOpen ? (
        <section className="rounded-xl border border-default bg-surface/50 p-6">
          <h2 className="text-lg font-medium text-primary">Новое приглашение</h2>
          <form onSubmit={onInviteSubmit} className="mt-4 max-w-md space-y-4">
            {formError ? (
              <div className="rounded-lg border border-red-200 dark:border-red-900/40 bg-danger-subtle px-3 py-2 text-sm text-danger">
                {formError}
              </div>
            ) : null}
            <div>
              <label htmlFor="bs-email" className={labelClass}>Email</label>
              <input
                id="bs-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder="staff@building.com"
                autoComplete="off"
              />
            </div>
            <div>
              <label htmlFor="bs-role" className={labelClass}>Роль</label>
              <select
                id="bs-role"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className={inputClass}
              >
                {BUILDING_INVITE_ROLES.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
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

      {/* Staff list */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-medium text-primary">Сотрудники</h2>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <label className="flex items-center gap-2 text-secondary">
              <span>Роль</span>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as UserRole | '')}
                className="rounded-md border border-default bg-surface px-2 py-1 text-primary"
              >
                {ROLE_FILTERS.map((o) => (
                  <option key={o.value || 'all'} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
            <input
              type="search"
              placeholder="Поиск по email или имени"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64 rounded-md border border-default bg-surface px-3 py-1.5 text-sm text-primary placeholder:text-muted"
            />
          </div>
        </div>

        {staffQuery.isLoading ? (
          <p className="mt-3 text-sm text-muted">Загрузка…</p>
        ) : staffQuery.error ? (
          <p className="mt-3 text-sm text-danger">{getApiError(staffQuery.error).message}</p>
        ) : (
          <ul className="mt-4 divide-y divide-[color:var(--border)] rounded-xl border border-default">
            {staff.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="font-medium text-primary">
                    {m.full_name || m.email}
                    {!m.is_active ? (
                      <span className="ml-2 rounded-full bg-raised px-2 py-0.5 text-xs text-muted">
                        деактивирован
                      </span>
                    ) : null}
                  </p>
                  <p className="text-sm text-secondary">{m.email}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn('rounded-full bg-raised px-2.5 py-0.5 text-xs text-secondary')}>
                    {USER_ROLE_LABELS[m.role as UserRole] ?? m.role}
                  </span>
                  {isSuperadmin ? (
                    <>
                      <button
                        type="button"
                        disabled={isActionPending}
                        onClick={() => setBlockTarget(m)}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium disabled:opacity-60',
                          m.is_active
                            ? 'border-red-800 bg-danger-subtle text-danger hover:bg-danger-subtle'
                            : 'border-emerald-700 bg-success-subtle text-success hover:bg-success-subtle',
                        )}
                      >
                        <Shield className="h-3.5 w-3.5" />
                        {m.is_active ? 'Заблокировать' : 'Разблокировать'}
                      </button>
                      {!isImpersonating ? (
                        <button
                          type="button"
                          disabled={isActionPending}
                          onClick={() => setImpersonateTarget(m)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-amber-700 bg-warning-subtle px-2.5 py-1 text-xs font-medium text-warning hover:bg-warning-subtle disabled:opacity-60"
                        >
                          <LogIn className="h-3.5 w-3.5" />
                          Войти от имени
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={isActionPending}
                        onClick={() => setDeleteTarget(m)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-800 bg-danger-subtle px-2.5 py-1 text-xs font-medium text-danger hover:bg-danger-subtle disabled:opacity-60"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Удалить
                      </button>
                    </>
                  ) : null}
                </div>
              </li>
            ))}
            {!staff.length ? (
              <li className="px-4 py-6 text-center text-sm text-muted">
                Пока нет сотрудников здания
              </li>
            ) : null}
          </ul>
        )}
      </section>

      {/* Invites list */}
      <section>
        <h2 className="text-lg font-medium text-primary">Приглашения</h2>
        {invitesQuery.isLoading ? (
          <p className="mt-3 text-sm text-muted">Загрузка…</p>
        ) : (
          <ul className="mt-4 divide-y divide-[color:var(--border)] rounded-xl border border-default">
            {invites.map((inv) => (
              <li key={inv.id} className="px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-primary">{inv.email}</p>
                    <p className="text-xs text-muted">
                      {USER_ROLE_LABELS[inv.role as UserRole] ?? inv.role} · до{' '}
                      {new Date(inv.expires_at).toLocaleString('ru-RU')}
                      {inv.is_expired ? ' · просрочено' : inv.is_used ? ' · использовано' : ''}
                    </p>
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
            {!invites.length ? (
              <li className="px-4 py-6 text-center text-sm text-muted">
                Приглашений сотрудников здания пока нет.
              </li>
            ) : null}
          </ul>
        )}
      </section>

      {/* Action error */}
      {actionError ? (
        <div className="rounded-lg border border-red-200 dark:border-red-900/40 bg-danger-subtle px-4 py-3 text-sm text-danger">
          {actionError}
        </div>
      ) : null}

      {/* Block / unblock confirm */}
      <ConfirmModal
        isOpen={blockTarget !== null}
        onClose={() => !blockUserMutation.isPending && setBlockTarget(null)}
        onConfirm={() => {
          if (!blockTarget) return;
          blockUserMutation.mutate({ memberId: blockTarget.id, shouldBlock: blockTarget.is_active });
        }}
        title={blockTarget?.is_active ? 'Заблокировать пользователя' : 'Разблокировать пользователя'}
        description={
          blockTarget?.is_active
            ? `Заблокировать ${blockTarget?.full_name || blockTarget?.email}? Пользователь не сможет войти в систему.`
            : `Разблокировать ${blockTarget?.full_name || blockTarget?.email}?`
        }
        confirmLabel={blockTarget?.is_active ? 'Заблокировать' : 'Разблокировать'}
        variant={blockTarget?.is_active ? 'danger' : 'warning'}
        isLoading={blockUserMutation.isPending}
      />

      {/* Impersonate confirm */}
      <ConfirmModal
        isOpen={impersonateTarget !== null}
        onClose={() => !impersonateMutation.isPending && setImpersonateTarget(null)}
        onConfirm={() => {
          if (!impersonateTarget) return;
          impersonateMutation.mutate(impersonateTarget.id);
        }}
        title="Войти от имени пользователя"
        description={`Вы войдёте в систему от имени ${impersonateTarget?.full_name || impersonateTarget?.email}. Вернуться можно из шапки.`}
        confirmLabel="Войти"
        variant="warning"
        isLoading={impersonateMutation.isPending}
      />

      {/* Delete confirm */}
      <ConfirmModal
        isOpen={deleteTarget !== null}
        onClose={() => !deleteUserMutation.isPending && setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteUserMutation.mutate(deleteTarget.id);
        }}
        title="Удалить пользователя"
        description={`Удалить ${deleteTarget?.full_name || deleteTarget?.email}? Это действие нельзя отменить.`}
        confirmLabel="Удалить"
        variant="danger"
        isLoading={deleteUserMutation.isPending}
      />
    </div>
  );
}
