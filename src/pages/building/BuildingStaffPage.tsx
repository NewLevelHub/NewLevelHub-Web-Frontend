import { useState, useEffect, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  MailPlus,
  RefreshCw,
  Ban,
  Shield,
  LogIn,
  Trash2,
  Search,
  Users,
  Check,
  Minus,
  X,
} from 'lucide-react';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { USER_ROLES, USER_ROLE_LABEL_KEYS, type UserRole } from '@/shared/config/constants';
import { getApiError } from '@/shared/lib/getApiError';
import { mapApiUser } from '@/shared/lib/mapUser';
import { cn } from '@/shared/lib/cn';
import { fmtDate, fmtDateTime } from '@/shared/lib/formatDate';
import { useAuth } from '@/shared/hooks/useAuth';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import type { CompanyInvitation, CompanyMember, PaginatedResponse } from '@/shared/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  '#10b981', '#6366f1', '#f59e0b', '#84cc16', '#0ea5e9',
  '#ec4899', '#475569', '#7c3aed', '#0e7490', '#dc2626',
];

const inputClass =
  'mt-1 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--bg-surface)] px-3 py-2 text-sm text-[color:var(--text-primary)] placeholder:text-[color:var(--text-muted)] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20';
const labelClass = 'block text-sm font-medium text-[color:var(--text-secondary)]';
const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-[color:var(--brand)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity';
const btnGhost =
  'inline-flex items-center justify-center w-7 h-7 rounded-[var(--radius-sm)] text-[color:var(--text-muted)] hover:bg-[color:var(--bg-hover)] disabled:opacity-40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand)]/50';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return name.slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function getAvatarColor(name: string): string {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StaffSkeletonRow({ isSuperadmin }: { isSuperadmin: boolean }) {
  const cell = 'bg-[color:var(--bg-raised)] animate-pulse rounded-[var(--radius-sm)]';
  return (
    <tr className="border-b border-[color:var(--border)]">
      {isSuperadmin && <td className="px-3 py-2.5 w-9" />}
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className={cn('w-8 h-8 rounded-full shrink-0', cell)} />
          <div className={cn('w-32 h-3', cell)} />
        </div>
      </td>
      <td className="px-3 py-2.5"><div className={cn('w-40 h-3', cell)} /></td>
      <td className="px-3 py-2.5"><div className={cn('w-24 h-5 rounded-full', cell)} /></td>
      <td className="px-3 py-2.5"><div className={cn('w-16 h-5 rounded-full', cell)} /></td>
      <td className="px-3 py-2.5"><div className={cn('w-20 h-3', cell)} /></td>
      {isSuperadmin && <td className="px-3 py-2.5 w-24" />}
    </tr>
  );
}

function InviteSkeletonRow() {
  const cell = 'bg-[color:var(--bg-raised)] animate-pulse rounded-[var(--radius-sm)]';
  return (
    <tr className="border-b border-[color:var(--border)]">
      <td className="px-3 py-2.5"><div className={cn('w-40 h-3', cell)} /></td>
      <td className="px-3 py-2.5"><div className={cn('w-24 h-5 rounded-full', cell)} /></td>
      <td className="px-3 py-2.5"><div className={cn('w-16 h-5 rounded-full', cell)} /></td>
      <td className="px-3 py-2.5"><div className={cn('w-28 h-3', cell)} /></td>
      <td className="px-3 py-2.5"><div className="flex items-center gap-1"><div className={cn('w-7 h-7 rounded', cell)} /><div className={cn('w-7 h-7 rounded', cell)} /></div></td>
    </tr>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BuildingStaffPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user, isImpersonating, startImpersonation } = useAuth();
  const isSuperadmin = user?.role === USER_ROLES.SUPERADMIN;

  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('');
  const [search, setSearch] = useState('');

  // ── Per-row action targets ─────────────────────────────────────────────────
  const [blockTarget, setBlockTarget] = useState<CompanyMember | null>(null);
  const [impersonateTarget, setImpersonateTarget] = useState<CompanyMember | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CompanyMember | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // ── Bulk selection state ──────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [confirmBulkBlock, setConfirmBulkBlock] = useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [bulkActionPending, setBulkActionPending] = useState(false);

  // ── Invite form state ──────────────────────────────────────────────────────
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>(USER_ROLES.SERVICE_MANAGER);
  const [formError, setFormError] = useState('');

  // ── Queries ────────────────────────────────────────────────────────────────

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

  const invitesQuery = useQuery({
    queryKey: ['building-invitations'],
    queryFn: () =>
      apiClient
        .get<PaginatedResponse<CompanyInvitation>>(API.companies.buildingInvitations)
        .then((r) => r.data),
  });

  const staff = staffQuery.data?.results ?? [];
  const invites = invitesQuery.data?.results ?? [];

  // Reset selection when staff list changes (filter / search change)
  useEffect(() => {
    setSelectedIds(new Set());
  }, [staff]);

  const allSelected = staff.length > 0 && selectedIds.size === staff.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < staff.length;

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(staff.map((m) => m.id)));
    }
  }

  function toggleSelectRow(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // ── Mutations ──────────────────────────────────────────────────────────────

  const createInvite = useMutation({
    mutationFn: (body: { email: string; role: string }) =>
      apiClient.post(API.companies.buildingInvitations, body),
    onSuccess: () => {
      setEmail('');
      setInviteRole(USER_ROLES.SERVICE_MANAGER);
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
    mutationFn: (memberId: number) => apiClient.delete(API.users.detail(memberId)),
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
    blockUserMutation.isPending || impersonateMutation.isPending || deleteUserMutation.isPending;

  // ── Bulk handlers ──────────────────────────────────────────────────────────

  async function handleBulkBlock() {
    setBulkActionPending(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) => {
          const member = staff.find((m) => m.id === id);
          return member
            ? apiClient.post(member.is_active ? API.users.block(id) : API.users.unblock(id))
            : Promise.resolve();
        }),
      );
      setSelectedIds(new Set());
      setConfirmBulkBlock(false);
      await queryClient.invalidateQueries({ queryKey: ['building-staff'] });
    } catch (err) {
      setActionError(getApiError(err).message);
    } finally {
      setBulkActionPending(false);
    }
  }

  async function handleBulkDelete() {
    setBulkActionPending(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) => apiClient.delete(API.users.detail(id))),
      );
      setSelectedIds(new Set());
      setConfirmBulkDelete(false);
      await queryClient.invalidateQueries({ queryKey: ['building-staff'] });
    } catch (err) {
      setActionError(getApiError(err).message);
    } finally {
      setBulkActionPending(false);
    }
  }

  function onInviteSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    createInvite.mutate({ email: email.trim().toLowerCase(), role: inviteRole });
  }

  // ── Role filter chips ──────────────────────────────────────────────────────

  const roleChips: { value: UserRole | ''; labelKey: string }[] = [
    { value: '', labelKey: 'buildingStaff.roleAll' },
    { value: USER_ROLES.RECEPTION, labelKey: USER_ROLE_LABEL_KEYS[USER_ROLES.RECEPTION] },
    { value: USER_ROLES.SERVICE_MANAGER, labelKey: USER_ROLE_LABEL_KEYS[USER_ROLES.SERVICE_MANAGER] },
  ];

  const buildingInviteRoles: { value: UserRole; labelKey: string }[] = [
    { value: USER_ROLES.RECEPTION, labelKey: USER_ROLE_LABEL_KEYS[USER_ROLES.RECEPTION] },
    { value: USER_ROLES.SERVICE_MANAGER, labelKey: USER_ROLE_LABEL_KEYS[USER_ROLES.SERVICE_MANAGER] },
  ];

  // ── Columns count for colSpan ──────────────────────────────────────────────
  const staffColCount = isSuperadmin ? 7 : 6;
  const inviteColCount = 5;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-5xl space-y-8 p-6">

      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-[color:var(--text-primary)] leading-tight">
            {t('buildingStaff.title')}
          </h1>
          <p className="mt-1 text-[13px] text-[color:var(--text-secondary)]">
            {t('buildingStaff.subtitle')}
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
          <MailPlus className="h-4 w-4" aria-hidden="true" />
          {t('buildingStaff.invite')}
        </button>
      </div>

      {/* Invite form */}
      {inviteOpen && (
        <section className="rounded-xl border border-[color:var(--border)] bg-[color:var(--bg-surface)] p-6 shadow-[var(--shadow-card)]">
          <h2 className="text-base font-semibold text-[color:var(--text-primary)]">
            {t('buildingStaff.newInvite')}
          </h2>
          <form onSubmit={onInviteSubmit} className="mt-4 max-w-md space-y-4">
            {formError && (
              <div className="rounded-lg border border-red-200 dark:border-red-900/40 bg-[color:var(--status-busy-bg)] px-3 py-2 text-sm text-[color:var(--danger)]">
                {formError}
              </div>
            )}
            <div>
              <label htmlFor="bs-email" className={labelClass}>
                {t('buildingStaff.colEmail')}
              </label>
              <input
                id="bs-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder={t('buildingStaff.emailPlaceholder')}
                autoComplete="off"
              />
            </div>
            <div>
              <label htmlFor="bs-role" className={labelClass}>
                {t('buildingStaff.colRole')}
              </label>
              <select
                id="bs-role"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as UserRole)}
                className={inputClass}
              >
                {buildingInviteRoles.map((o) => (
                  <option key={o.value} value={o.value}>
                    {t(o.labelKey)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={createInvite.isPending} className={btnPrimary}>
                {createInvite.isPending ? t('buildingStaff.sending') : t('buildingStaff.sendInvite')}
              </button>
              <button
                type="button"
                onClick={() => setInviteOpen(false)}
                className="rounded-lg border border-[color:var(--border)] px-4 py-2 text-sm text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-hover)] transition-colors"
              >
                {t('common.cancel')}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Action error banner */}
      {actionError && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 dark:border-red-900/40 bg-[color:var(--status-busy-bg)] px-4 py-3 text-sm text-[color:var(--danger)]"
        >
          {actionError}
        </div>
      )}

      {/* ── Staff section ──────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-base font-semibold text-[color:var(--text-primary)]">
          {t('buildingStaff.staffSection')}
        </h2>

        <div className="bg-[color:var(--bg-surface)] border border-[color:var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-card)] overflow-hidden">

          {/* Filter bar */}
          <div className="flex items-center gap-1.5 flex-wrap px-4 py-3 border-b border-[color:var(--border)]">
            {/* Search */}
            <div className="relative flex items-center">
              <Search
                className="w-3.5 h-3.5 text-[color:var(--text-muted)] absolute left-2.5 pointer-events-none flex-shrink-0"
                aria-hidden="true"
              />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('buildingStaff.searchPlaceholder')}
                aria-label={t('buildingStaff.searchPlaceholder')}
                className="h-[30px] pl-7 pr-2.5 text-[12px] border border-[color:var(--border)] bg-[color:var(--bg-surface)] rounded-[var(--radius-sm)] text-[color:var(--text-primary)] focus:outline-none placeholder:text-[color:var(--text-muted)] w-48 min-w-0"
              />
            </div>

            {/* Divider */}
            <span className="self-stretch w-px bg-[color:var(--border)] flex-shrink-0 my-0.5" aria-hidden="true" />

            {/* Role chips */}
            <div role="group" aria-label={t('buildingStaff.filterRole')} className="flex items-center gap-1 flex-wrap">
              {roleChips.map((chip) => (
                <button
                  key={chip.value || 'all'}
                  type="button"
                  onClick={() => setRoleFilter(chip.value)}
                  className={cn(
                    'inline-flex items-center px-2.5 py-1 text-[12px] rounded-full transition-colors cursor-pointer',
                    roleFilter === chip.value
                      ? 'border-transparent bg-[color:var(--brand-subtle)] text-[color:var(--brand-text)]'
                      : 'border border-[color:var(--border)] text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-hover)]',
                  )}
                >
                  {t(chip.labelKey)}
                </button>
              ))}
            </div>

            {/* Pagination / count (right) */}
            {!staffQuery.isLoading && (staffQuery.data?.count ?? 0) > 0 && (
              <div className="ml-auto text-[12px] text-[color:var(--text-muted)]">
                {staffQuery.data?.count ?? 0}
              </div>
            )}
          </div>

          {/* Bulk action bar */}
          {isSuperadmin && selectedIds.size > 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-[var(--brand)] bg-brand-subtle px-4 py-2.5 mx-4 my-2 text-sm">
              <span className="font-medium text-[color:var(--brand-text)]">
                {t('buildingStaff.bulk.selectedCount', { count: selectedIds.size })}
              </span>
              <div className="ml-auto flex items-center gap-2">
                {/* Deselect all */}
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="inline-flex items-center gap-1.5 h-7 px-3 rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-[color:var(--bg-surface)] text-[12px] font-medium text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-hover)] transition-colors"
                >
                  <X size={12} aria-hidden="true" />
                  {t('buildingStaff.bulk.deselectAll')}
                </button>
                {/* Block selected */}
                <button
                  type="button"
                  onClick={() => setConfirmBulkBlock(true)}
                  disabled={bulkActionPending}
                  className="inline-flex items-center gap-1.5 h-7 px-3 rounded-[var(--radius-sm)] bg-[color:var(--status-busy-bg)] border border-[var(--danger)] text-[12px] font-medium text-[color:var(--danger)] hover:bg-[var(--danger)] hover:text-white disabled:opacity-50 transition-colors"
                >
                  <Shield size={12} aria-hidden="true" />
                  {t('buildingStaff.bulk.blockSelected')}
                </button>
                {/* Delete selected */}
                <button
                  type="button"
                  onClick={() => setConfirmBulkDelete(true)}
                  disabled={bulkActionPending}
                  className="inline-flex items-center gap-1.5 h-7 px-3 rounded-[var(--radius-sm)] bg-[color:var(--status-busy-bg)] border border-[var(--danger)] text-[12px] font-medium text-[color:var(--danger)] hover:bg-[var(--danger)] hover:text-white disabled:opacity-50 transition-colors"
                >
                  <Trash2 size={12} aria-hidden="true" />
                  {t('buildingStaff.bulk.deleteSelected')}
                </button>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto">
            <table
              className="w-full min-w-[700px] border-collapse text-[13px]"
              role="table"
              aria-label={t('buildingStaff.staffSection')}
            >
              <thead>
                <tr className="border-b border-[color:var(--border)]">
                  {/* Checkbox header */}
                  {isSuperadmin && (
                    <th className="w-9 px-3 py-2 text-left">
                      <button
                        type="button"
                        onClick={toggleSelectAll}
                        aria-label={allSelected ? t('common.deselectAll') : t('common.selectAll')}
                        className={cn(
                          'w-3.5 h-3.5 rounded-[3px] border-[1.5px] transition-colors flex items-center justify-center',
                          allSelected || someSelected
                            ? 'bg-[var(--brand)] border-[var(--brand)]'
                            : 'border-[var(--border-strong)] hover:border-[var(--brand)]',
                        )}
                      >
                        {allSelected && <Check size={10} strokeWidth={3} className="text-white" />}
                        {someSelected && <Minus size={10} strokeWidth={3} className="text-white" />}
                      </button>
                    </th>
                  )}
                  <th scope="col" className="px-3 py-2 text-left text-[11px] font-medium text-[color:var(--text-muted)] whitespace-nowrap">
                    {t('buildingStaff.colEmployee')}
                  </th>
                  <th scope="col" className="px-3 py-2 text-left text-[11px] font-medium text-[color:var(--text-muted)] whitespace-nowrap">
                    {t('buildingStaff.colEmail')}
                  </th>
                  <th scope="col" className="px-3 py-2 text-left text-[11px] font-medium text-[color:var(--text-muted)] whitespace-nowrap">
                    {t('buildingStaff.colRole')}
                  </th>
                  <th scope="col" className="px-3 py-2 text-left text-[11px] font-medium text-[color:var(--text-muted)] whitespace-nowrap">
                    {t('buildingStaff.colStatus')}
                  </th>
                  <th scope="col" className="px-3 py-2 text-left text-[11px] font-medium text-[color:var(--text-muted)] whitespace-nowrap">
                    {t('buildingStaff.colJoined')}
                  </th>
                  {isSuperadmin && (
                    <th scope="col" className="px-3 py-2 w-24">
                      <span className="sr-only">{t('common.actions')}</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {staffQuery.isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <StaffSkeletonRow key={i} isSuperadmin={isSuperadmin} />
                  ))
                ) : staff.length === 0 ? (
                  <tr>
                    <td colSpan={staffColCount} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Users className="h-8 w-8 text-[color:var(--text-muted)]" aria-hidden="true" />
                        <p className="text-[13px] text-[color:var(--text-secondary)]">
                          {t('buildingStaff.noStaff')}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  staff.map((m) => {
                    const isSelected = selectedIds.has(m.id);
                    const displayName = m.full_name || m.email;
                    const roleLabelKey = USER_ROLE_LABEL_KEYS[m.role as UserRole];

                    return (
                      <tr
                        key={m.id}
                        className={cn(
                          'group border-b border-[color:var(--border)] transition-colors',
                          isSelected
                            ? 'bg-[color-mix(in_srgb,var(--brand)_7%,transparent)]'
                            : 'hover:bg-[color:var(--bg-hover)]',
                        )}
                      >
                        {/* Checkbox */}
                        {isSuperadmin && (
                          <td className="px-3 py-2.5 align-middle">
                            <button
                              type="button"
                              onClick={() => toggleSelectRow(m.id)}
                              aria-label={`${t('common.select')} ${displayName}`}
                              className={cn(
                                'w-3.5 h-3.5 rounded-[3px] border-[1.5px] transition-colors flex items-center justify-center',
                                isSelected
                                  ? 'bg-[var(--brand)] border-[var(--brand)]'
                                  : 'border-[var(--border-strong)] hover:border-[var(--brand)]',
                              )}
                            >
                              {isSelected && <Check size={10} strokeWidth={3} className="text-white" />}
                            </button>
                          </td>
                        )}

                        {/* Employee: avatar + name */}
                        <td className="px-3 py-2.5 align-middle">
                          <div className="flex items-center gap-2.5">
                            {m.avatar ? (
                              <img
                                src={m.avatar}
                                alt=""
                                className="w-8 h-8 rounded-full object-cover shrink-0"
                              />
                            ) : (
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white text-[11px] font-bold leading-none"
                                style={{ backgroundColor: getAvatarColor(displayName) }}
                                aria-hidden="true"
                              >
                                {getInitials(displayName)}
                              </div>
                            )}
                            <span className="font-medium text-[color:var(--text-primary)] whitespace-nowrap">
                              {displayName}
                            </span>
                          </div>
                        </td>

                        {/* Email */}
                        <td className="px-3 py-2.5 align-middle text-[12px] text-[color:var(--text-muted)]">
                          {m.email}
                        </td>

                        {/* Role badge */}
                        <td className="px-3 py-2.5 align-middle">
                          <RoleBadge role={m.role as UserRole} labelKey={roleLabelKey} />
                        </td>

                        {/* Status badge */}
                        <td className="px-3 py-2.5 align-middle">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium',
                              m.is_active
                                ? 'bg-[color:var(--status-free-bg)] text-[color:var(--status-free-text)]'
                                : 'bg-[color:var(--status-na-bg)] text-[color:var(--status-na-text)]',
                            )}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-current flex-shrink-0" aria-hidden="true" />
                            {m.is_active ? t('buildingStaff.statusActive') : t('buildingStaff.statusBlocked')}
                          </span>
                        </td>

                        {/* Date joined */}
                        <td className="px-3 py-2.5 align-middle text-[12px] text-[color:var(--text-muted)]">
                          {fmtDate(m.date_joined)}
                        </td>

                        {/* Actions (superadmin only, group-hover) */}
                        {isSuperadmin && (
                          <td className="px-3 py-2.5 align-middle">
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {/* Block / Unblock */}
                              <button
                                type="button"
                                disabled={isActionPending}
                                onClick={() => setBlockTarget(m)}
                                title={m.is_active ? t('buildingStaff.block') : t('buildingStaff.unblock')}
                                className={cn(
                                  btnGhost,
                                  m.is_active
                                    ? 'hover:text-[color:var(--danger)] hover:bg-[color:var(--status-busy-bg)]'
                                    : 'hover:text-[color:var(--status-free-text)] hover:bg-[color:var(--status-free-bg)]',
                                )}
                              >
                                <Shield className="h-3.5 w-3.5" aria-hidden="true" />
                                <span className="sr-only">
                                  {m.is_active ? t('buildingStaff.block') : t('buildingStaff.unblock')} {displayName}
                                </span>
                              </button>

                              {/* Impersonate */}
                              {!isImpersonating && (
                                <button
                                  type="button"
                                  disabled={isActionPending}
                                  onClick={() => setImpersonateTarget(m)}
                                  title={t('buildingStaff.impersonate')}
                                  className={cn(
                                    btnGhost,
                                    'hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20',
                                  )}
                                >
                                  <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
                                  <span className="sr-only">{t('buildingStaff.impersonate')} {displayName}</span>
                                </button>
                              )}

                              {/* Delete */}
                              <button
                                type="button"
                                disabled={isActionPending}
                                onClick={() => setDeleteTarget(m)}
                                title={t('buildingStaff.deleteTitle')}
                                className={cn(
                                  btnGhost,
                                  'hover:text-[color:var(--danger)] hover:bg-[color:var(--status-busy-bg)]',
                                )}
                              >
                                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                <span className="sr-only">{t('buildingStaff.deleteTitle')} {displayName}</span>
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Invites section ────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-base font-semibold text-[color:var(--text-primary)]">
          {t('buildingStaff.invitesSection')}
        </h2>

        <div className="bg-[color:var(--bg-surface)] border border-[color:var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-card)] overflow-hidden">
          <div className="overflow-x-auto">
            <table
              className="w-full min-w-[600px] border-collapse text-[13px]"
              role="table"
              aria-label={t('buildingStaff.invitesSection')}
            >
              <thead>
                <tr className="border-b border-[color:var(--border)]">
                  <th scope="col" className="px-3 py-2 text-left text-[11px] font-medium text-[color:var(--text-muted)] whitespace-nowrap">
                    {t('buildingStaff.colEmail')}
                  </th>
                  <th scope="col" className="px-3 py-2 text-left text-[11px] font-medium text-[color:var(--text-muted)] whitespace-nowrap">
                    {t('buildingStaff.colRole')}
                  </th>
                  <th scope="col" className="px-3 py-2 text-left text-[11px] font-medium text-[color:var(--text-muted)] whitespace-nowrap">
                    {t('buildingStaff.colInviteStatus')}
                  </th>
                  <th scope="col" className="px-3 py-2 text-left text-[11px] font-medium text-[color:var(--text-muted)] whitespace-nowrap">
                    {t('buildingStaff.colExpires')}
                  </th>
                  <th scope="col" className="px-3 py-2 w-20">
                    <span className="sr-only">{t('common.actions')}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {invitesQuery.isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => <InviteSkeletonRow key={i} />)
                ) : invites.length === 0 ? (
                  <tr>
                    <td colSpan={inviteColCount} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <MailPlus className="h-8 w-8 text-[color:var(--text-muted)]" aria-hidden="true" />
                        <p className="text-[13px] text-[color:var(--text-secondary)]">
                          {t('buildingStaff.noInvites')}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  invites.map((inv) => {
                    const roleLabelKey = USER_ROLE_LABEL_KEYS[inv.role as UserRole];
                    return (
                      <tr
                        key={inv.id}
                        className="border-b border-[color:var(--border)] hover:bg-[color:var(--bg-hover)] transition-colors"
                      >
                        {/* Email */}
                        <td className="px-3 py-2.5 align-middle font-medium text-[color:var(--text-primary)]">
                          {inv.email}
                        </td>

                        {/* Role badge */}
                        <td className="px-3 py-2.5 align-middle">
                          <RoleBadge role={inv.role as UserRole} labelKey={roleLabelKey} />
                        </td>

                        {/* Invite status badge */}
                        <td className="px-3 py-2.5 align-middle">
                          <InviteStatusBadge invite={inv} />
                        </td>

                        {/* Expires at */}
                        <td className="px-3 py-2.5 align-middle text-[12px] text-[color:var(--text-muted)]">
                          {fmtDateTime(inv.expires_at)}
                        </td>

                        {/* Actions */}
                        <td className="px-3 py-2.5 align-middle">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={inv.is_used || resendInvite.isPending}
                              onClick={() => resendInvite.mutate(inv.id)}
                              title={t('buildingStaff.resendInvite')}
                              className={btnGhost}
                            >
                              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                              <span className="sr-only">{t('buildingStaff.resendInvite')}</span>
                            </button>
                            <button
                              type="button"
                              disabled={inv.is_used || revokeInvite.isPending}
                              onClick={() => revokeInvite.mutate(inv.id)}
                              title={t('buildingStaff.revokeInvite')}
                              className={cn(
                                btnGhost,
                                'hover:text-[color:var(--danger)] hover:bg-[color:var(--status-busy-bg)]',
                              )}
                            >
                              <Ban className="h-3.5 w-3.5" aria-hidden="true" />
                              <span className="sr-only">{t('buildingStaff.revokeInvite')}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Confirm modals ─────────────────────────────────────────────── */}

      {/* Block / Unblock single */}
      <ConfirmModal
        isOpen={blockTarget !== null}
        onClose={() => !blockUserMutation.isPending && setBlockTarget(null)}
        onConfirm={() => {
          if (!blockTarget) return;
          blockUserMutation.mutate({ memberId: blockTarget.id, shouldBlock: blockTarget.is_active });
        }}
        title={
          blockTarget?.is_active
            ? t('buildingStaff.blockTitle')
            : t('buildingStaff.unblockTitle')
        }
        description={
          blockTarget?.is_active
            ? t('buildingStaff.blockDesc', { name: blockTarget?.full_name || blockTarget?.email })
            : t('buildingStaff.unblockDesc', { name: blockTarget?.full_name || blockTarget?.email })
        }
        confirmLabel={blockTarget?.is_active ? t('buildingStaff.block') : t('buildingStaff.unblock')}
        variant={blockTarget?.is_active ? 'danger' : 'warning'}
        isLoading={blockUserMutation.isPending}
      />

      {/* Impersonate single */}
      <ConfirmModal
        isOpen={impersonateTarget !== null}
        onClose={() => !impersonateMutation.isPending && setImpersonateTarget(null)}
        onConfirm={() => {
          if (!impersonateTarget) return;
          impersonateMutation.mutate(impersonateTarget.id);
        }}
        title={t('buildingStaff.impersonateTitle')}
        description={t('buildingStaff.impersonateDesc', {
          name: impersonateTarget?.full_name || impersonateTarget?.email,
        })}
        confirmLabel={t('buildingStaff.impersonateConfirm')}
        variant="warning"
        isLoading={impersonateMutation.isPending}
      />

      {/* Delete single */}
      <ConfirmModal
        isOpen={deleteTarget !== null}
        onClose={() => !deleteUserMutation.isPending && setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteUserMutation.mutate(deleteTarget.id);
        }}
        title={t('buildingStaff.deleteTitle')}
        description={t('buildingStaff.deleteDesc', {
          name: deleteTarget?.full_name || deleteTarget?.email,
        })}
        confirmLabel={t('common.delete')}
        variant="danger"
        isLoading={deleteUserMutation.isPending}
      />

      {/* Bulk block */}
      <ConfirmModal
        isOpen={confirmBulkBlock}
        onClose={() => !bulkActionPending && setConfirmBulkBlock(false)}
        onConfirm={() => void handleBulkBlock()}
        title={t('buildingStaff.bulk.confirmBlockTitle')}
        description={t('buildingStaff.bulk.confirmBlockBody', { count: selectedIds.size })}
        confirmLabel={t('buildingStaff.bulk.blockSelected')}
        variant="danger"
        isLoading={bulkActionPending}
      />

      {/* Bulk delete */}
      <ConfirmModal
        isOpen={confirmBulkDelete}
        onClose={() => !bulkActionPending && setConfirmBulkDelete(false)}
        onConfirm={() => void handleBulkDelete()}
        title={t('buildingStaff.bulk.confirmDeleteTitle')}
        description={t('buildingStaff.bulk.confirmDeleteBody', { count: selectedIds.size })}
        confirmLabel={t('buildingStaff.bulk.deleteSelected')}
        variant="danger"
        isLoading={bulkActionPending}
      />
    </div>
  );
}

// ─── Helper components ────────────────────────────────────────────────────────

const ROLE_BADGE_CLASS: Partial<Record<UserRole, string>> = {
  [USER_ROLES.RECEPTION]: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  [USER_ROLES.SERVICE_MANAGER]: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
};

function RoleBadge({ role, labelKey }: { role: UserRole; labelKey?: string }) {
  const { t } = useTranslation();
  const cls = ROLE_BADGE_CLASS[role] ?? 'bg-[color:var(--bg-raised)] text-[color:var(--text-secondary)]';
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium', cls)}>
      {labelKey ? t(labelKey) : role}
    </span>
  );
}

function InviteStatusBadge({ invite }: { invite: CompanyInvitation }) {
  const { t } = useTranslation();

  if (invite.is_used) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[color:var(--status-na-bg)] text-[color:var(--status-na-text)]">
        <span className="w-1.5 h-1.5 rounded-full bg-current flex-shrink-0" aria-hidden="true" />
        {t('buildingStaff.statusUsed')}
      </span>
    );
  }
  if (invite.is_expired) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[color:var(--status-busy-bg)] text-[color:var(--status-busy-text)]">
        <span className="w-1.5 h-1.5 rounded-full bg-current flex-shrink-0" aria-hidden="true" />
        {t('buildingStaff.statusExpired')}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[color:var(--status-free-bg)] text-[color:var(--status-free-text)]">
      <span className="w-1.5 h-1.5 rounded-full bg-current flex-shrink-0" aria-hidden="true" />
      {t('buildingStaff.statusValid')}
    </span>
  );
}
