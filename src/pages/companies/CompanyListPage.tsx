import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  Building2,
  ChevronDown,
  Trash2,
  PowerOff,
  Power,
  ChevronLeft,
  ChevronRight,
  Sparkle,
} from 'lucide-react';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { COMPANY_TIERS, COMPANY_TIER_LABEL_KEYS, SUPERADMIN_UI_PREFIX, USER_ROLES } from '@/shared/config/constants';
import { useAuth } from '@/shared/hooks/useAuth';
import { isCompanyNotAssignedError } from '@/shared/lib/apiError';
import { companiesCacheRoot } from '@/shared/lib/companyQueryKeys';
import { cn } from '@/shared/lib/cn';
import { fmtDate } from '@/shared/lib/formatDate';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import type { Company, PaginatedResponse } from '@/shared/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

const TIER_BADGE: Record<string, string> = {
  [COMPANY_TIERS.PREMIUM]: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  [COMPANY_TIERS.STANDARD]: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  [COMPANY_TIERS.BASIC]: 'bg-[color:var(--bg-raised)] text-[color:var(--text-secondary)]',
};

const CATEGORY_COLORS: Record<string, string> = {
  Tech: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  B2B: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  SaaS: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  AI: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  Дизайн: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  Медиа: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  Ритейл: 'bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-300',
};
const DEFAULT_CAT_COLOR = 'bg-[color:var(--bg-raised)] text-[color:var(--text-secondary)]';

const AVATAR_COLORS = [
  '#10b981', '#6366f1', '#f59e0b', '#84cc16', '#0ea5e9',
  '#ec4899', '#475569', '#7c3aed', '#0e7490', '#dc2626',
];

// ─── Types ────────────────────────────────────────────────────────────────────

type ModalAction = 'deactivate' | 'activate' | 'delete';

interface ModalState {
  action: ModalAction;
  company: Company;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCompanyInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return name.slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function getCompanyColor(name: string): string {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function modalConfig(action: ModalAction, companyName: string, t: (k: string, opts?: Record<string, unknown>) => string) {
  switch (action) {
    case 'deactivate':
      return {
        title: t('companies.deactivateTitle'),
        description: t('companies.deactivateDesc', { name: companyName }),
        confirmLabel: t('common.deactivate'),
        variant: 'warning' as const,
      };
    case 'activate':
      return {
        title: t('companies.activateTitle'),
        description: t('companies.activateDesc', { name: companyName }),
        confirmLabel: t('common.activate'),
        variant: 'warning' as const,
      };
    case 'delete':
      return {
        title: t('companies.deleteTitle'),
        description: t('companies.deleteDesc', { name: companyName }),
        confirmLabel: t('common.delete'),
        variant: 'danger' as const,
      };
  }
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  const cell = 'bg-[color:var(--bg-raised)] animate-pulse rounded-[var(--radius-sm)]';
  return (
    <tr className="border-b border-[color:var(--border)]">
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className={cn('w-6 h-6 rounded-md shrink-0', cell)} />
          <div className="space-y-1.5">
            <div className={cn('w-36 h-3', cell)} />
            <div className={cn('w-20 h-2.5', cell)} />
          </div>
        </div>
      </td>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-1">
          <div className={cn('w-12 h-5 rounded-full', cell)} />
          <div className={cn('w-10 h-5 rounded-full', cell)} />
        </div>
      </td>
      <td className="px-3 py-2.5"><div className={cn('w-16 h-5 rounded-full', cell)} /></td>
      <td className="px-3 py-2.5"><div className={cn('w-8 h-3 ml-auto', cell)} /></td>
      <td className="px-3 py-2.5"><div className={cn('w-28 h-3', cell)} /></td>
      <td className="px-3 py-2.5"><div className={cn('w-14 h-4 rounded-full', cell)} /></td>
      <td className="px-3 py-2.5"><div className={cn('w-16 h-3', cell)} /></td>
      <td className="px-3 py-2.5" />
    </tr>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CompanyListPage() {
  const { t } = useTranslation();
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const isSuperadmin = user?.role === USER_ROLES.SUPERADMIN;
  const companiesBasePath = isSuperadmin ? `${SUPERADMIN_UI_PREFIX}/companies` : '/companies';

  // ── Filter state ────────────────────────────────────────────────────────────

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setSearch(value);
      setPage(1);
    }, 400);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [planFilter, statusFilter]);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const queryParams: Record<string, string | number> = {
    page,
    page_size: PAGE_SIZE,
  };
  if (search) queryParams.search = search;
  if (planFilter) queryParams.plan = planFilter;
  if (statusFilter !== '') queryParams.is_active = statusFilter;

  const { data, isLoading, isError, error } = useQuery<PaginatedResponse<Company>>({
    queryKey: [...companiesCacheRoot(user?.id), { search, planFilter, statusFilter, page }],
    queryFn: () =>
      apiClient
        .get<PaginatedResponse<Company>>(API.companies.list, { params: queryParams })
        .then((r) => r.data),
    enabled: Boolean(user) && !authLoading,
    staleTime: 0,
  });

  const companies = data?.results ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const rangeStart = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, totalCount);

  const showLoading = authLoading || isLoading;

  // For non-superadmin: redirect to their own company if only one result
  useEffect(() => {
    if (!isSuperadmin && !authLoading && !isLoading && companies.length === 1) {
      navigate(`/companies/${companies[0].id}`, { replace: true });
    }
  }, [isSuperadmin, authLoading, isLoading, companies, navigate]);

  // ── Mutations ──────────────────────────────────────────────────────────────

  const [modal, setModal] = useState<ModalState | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const deactivateMutation = useMutation({
    mutationFn: (id: number) => apiClient.post(API.companies.deactivate(String(id))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      setMutationError(null);
    },
    onError: () => {
      setMutationError(t('companies.deactivateError'));
    },
    onSettled: () => setModal(null),
  });

  const activateMutation = useMutation({
    mutationFn: (id: number) => apiClient.post(API.companies.activate(String(id))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      setMutationError(null);
    },
    onError: () => {
      setMutationError(t('companies.activateError'));
    },
    onSettled: () => setModal(null),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(API.companies.delete(String(id))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      setMutationError(null);
    },
    onError: () => {
      setMutationError(t('companies.deleteError'));
    },
    onSettled: () => setModal(null),
  });

  const isPending =
    deactivateMutation.isPending || activateMutation.isPending || deleteMutation.isPending;

  // ── Handlers ───────────────────────────────────────────────────────────────

  function openModal(action: ModalAction, company: Company) {
    setMutationError(null);
    setModal({ action, company });
  }

  function handleCloseModal() {
    if (isPending) return;
    setModal(null);
    setMutationError(null);
  }

  function handleConfirm() {
    if (!modal) return;
    const id = modal.company.id;
    if (modal.action === 'deactivate') deactivateMutation.mutate(id);
    else if (modal.action === 'activate') activateMutation.mutate(id);
    else deleteMutation.mutate(id);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (isError && isCompanyNotAssignedError(error)) {
    return (
      <div className="space-y-4">
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] border border-[color:var(--status-soon-bg)] bg-[color:var(--status-soon-bg)] px-6 py-12 text-center">
          <Building2 className="h-12 w-12 text-[color:var(--status-soon-text)]" aria-hidden="true" />
          <h1 className="text-[22px] font-bold text-[color:var(--text-primary)]">{t('companies.notAssignedTitle')}</h1>
          <p className="max-w-md text-[13px] text-[color:var(--text-secondary)]">
            {t('companies.notAssignedDesc')}
          </p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-4">
        <div className="flex h-64 flex-col items-center justify-center gap-2 text-center">
          <p className="text-[13px] font-medium text-[color:var(--danger)]">{t('companies.loadError')}</p>
          <p className="text-[12px] text-[color:var(--text-secondary)]">{t('companies.loadErrorHint')}</p>
        </div>
      </div>
    );
  }

  const currentModal = modal ? modalConfig(modal.action, modal.company.name, t) : null;

  const planChips = [
    { value: '', label: t('common.all') },
    { value: COMPANY_TIERS.PREMIUM, label: t('companies.planPremium') },
    { value: COMPANY_TIERS.STANDARD, label: t('companies.planStandard') },
    { value: COMPANY_TIERS.BASIC, label: t('companies.planBasic') },
  ];

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-[color:var(--text-primary)] leading-tight">
            {t('companies.tenantsTitle')}
          </h1>
          {!showLoading && (
            <p className="text-[13px] text-[color:var(--text-muted)] mt-0.5">
              {t('companies.tenantsTotal', { count: totalCount })}
            </p>
          )}
        </div>
        {isSuperadmin && (
          <Link
            to={`${companiesBasePath}/new`}
            className="inline-flex items-center gap-1.5 h-[34px] px-3 text-[13px] font-medium bg-[color:var(--brand)] text-white rounded-[var(--radius-sm)] hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand)]/50 flex-shrink-0 self-start"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            {t('companies.createCompany')}
          </Link>
        )}
      </div>

      {/* Mutation error banner */}
      {mutationError && (
        <div
          role="alert"
          className="rounded-[var(--radius-sm)] border border-[color:var(--status-busy-bg)] bg-[color:var(--status-busy-bg)] px-4 py-3 text-[13px] text-[color:var(--status-busy-text)]"
        >
          {mutationError}
        </div>
      )}

      {/* Table card */}
      <div className="bg-[color:var(--bg-surface)] border border-[color:var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-card)] overflow-hidden">
        {/* Inline toolbar */}
        {isSuperadmin && (
          <div className="flex items-center gap-1.5 flex-wrap px-4 py-3 border-b border-[color:var(--border)]">
            {/* Search input */}
            <div className="relative flex items-center">
              <Search
                className="w-3.5 h-3.5 text-[color:var(--text-muted)] flex-shrink-0 absolute left-2.5 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder={t('common.searchByNameEmail')}
                aria-label={t('companies.searchCompanies')}
                className="h-[30px] pl-7 pr-2.5 text-[12px] border border-[color:var(--border)] bg-[color:var(--bg-surface)] rounded-[var(--radius-sm)] text-[color:var(--text-primary)] focus:outline-none placeholder:text-[color:var(--text-muted)] w-44 min-w-0"
              />
            </div>

            {/* Divider */}
            <span className="self-stretch w-px bg-[color:var(--border)] flex-shrink-0 my-0.5" aria-hidden="true" />

            {/* Plan filter chips */}
            <div role="group" aria-label={t('companies.filterLabel')} className="flex items-center gap-1 flex-wrap">
              {planChips.map((chip) => (
                <button
                  key={chip.value}
                  type="button"
                  onClick={() => { setPlanFilter(chip.value); setPage(1); }}
                  className={cn(
                    'inline-flex items-center px-2.5 py-1 text-[12px] rounded-full transition-colors',
                    planFilter === chip.value
                      ? 'border-transparent bg-[color:var(--brand-subtle)] text-[color:var(--brand-text)] cursor-pointer'
                      : 'border border-[color:var(--border)] text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-hover)] cursor-pointer',
                  )}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Active only toggle */}
            <button
              type="button"
              onClick={() => { setStatusFilter(statusFilter === 'true' ? '' : 'true'); setPage(1); }}
              className={cn(
                'inline-flex items-center px-2.5 py-1 text-[12px] rounded-full transition-colors',
                statusFilter === 'true'
                  ? 'border-transparent bg-[color:var(--brand-subtle)] text-[color:var(--brand-text)] cursor-pointer'
                  : 'border border-[color:var(--border)] text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-hover)] cursor-pointer',
              )}
            >
              {t('common.active')}
            </button>

            {/* Right: count */}
            {!showLoading && totalCount > 0 && (
              <div className="ml-auto flex items-center gap-1.5 text-[12px] text-[color:var(--text-muted)]">
                {t('companies.paginationRange', { start: rangeStart, end: rangeEnd, total: totalCount })}
              </div>
            )}
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table
            className="w-full min-w-[900px] border-collapse text-[13px]"
            role="table"
            aria-label={t('companies.tableList')}
          >
            <thead>
              <tr className="border-b border-[color:var(--border)]">
                <th
                  scope="col"
                  className="px-3 py-2 text-left text-[11px] font-medium text-[color:var(--text-muted)] whitespace-nowrap"
                >
                  {t('common.company')}
                </th>
                <th
                  scope="col"
                  className="px-3 py-2 text-left text-[11px] font-medium text-[color:var(--text-muted)] whitespace-nowrap"
                >
                  <span className="inline-flex items-center gap-1">
                    <Sparkle className="h-3 w-3 text-brand/60" aria-hidden="true" />
                    {t('companies.categoriesCol')}
                  </span>
                </th>
                <th
                  scope="col"
                  className="px-3 py-2 text-left text-[11px] font-medium text-[color:var(--text-muted)] whitespace-nowrap"
                >
                  {t('companies.tablePlan')}
                </th>
                <th
                  scope="col"
                  className="px-3 py-2 text-right text-[11px] font-medium text-[color:var(--text-muted)] whitespace-nowrap"
                >
                  {t('companies.tableEmployees')}
                </th>
                <th
                  scope="col"
                  className="px-3 py-2 text-left text-[11px] font-medium text-[color:var(--text-muted)] whitespace-nowrap"
                >
                  {t('companies.adminContact')}
                </th>
                <th
                  scope="col"
                  className="px-3 py-2 text-left text-[11px] font-medium text-[color:var(--text-muted)] whitespace-nowrap"
                >
                  {t('common.status')}
                </th>
                <th
                  scope="col"
                  className="px-3 py-2 text-left text-[11px] font-medium text-[color:var(--text-muted)] whitespace-nowrap"
                >
                  {t('companies.createdLabel')}
                </th>
                <th scope="col" className="px-3 py-2 w-10">
                  <span className="sr-only">{t('companies.tableActions')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {showLoading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
              ) : companies.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Building2 className="h-8 w-8 text-[color:var(--text-muted)]" aria-hidden="true" />
                      <p className="text-[13px] text-[color:var(--text-secondary)]">{t('companies.notFound')}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                <>
                  {companies.map((company) => (
                    <CompanyRow
                      key={company.id}
                      company={company}
                      detailBasePath={companiesBasePath}
                      isSuperadmin={isSuperadmin}
                      onDeactivate={() => openModal('deactivate', company)}
                      onActivate={() => openModal('activate', company)}
                      onDelete={() => openModal('delete', company)}
                    />
                  ))}
                  <tr className="bg-[color:var(--bg-raised)]/40 border-t border-[color:var(--border)]">
                    <td className="px-3 py-2 text-[11px] font-medium text-[color:var(--text-muted)]">
                      {companies.length} {t('companies.footerCount')}
                    </td>
                    <td className="px-3 py-2" />
                    <td className="px-3 py-2" />
                    <td className="px-3 py-2 text-right font-mono text-[11px] text-[color:var(--text-muted)]">
                      {companies.reduce((s, c) => s + c.max_employees, 0)} {t('companies.footerSum')}
                    </td>
                    <td className="px-3 py-2" />
                    <td className="px-3 py-2" />
                    <td className="px-3 py-2" />
                    <td className="px-3 py-2" />
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {!showLoading && totalCount > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] text-[color:var(--text-secondary)]">
            {t('companies.paginationRange', { start: rangeStart, end: rangeEnd, total: totalCount })}
          </p>

          <nav aria-label={t('common.pagination')} className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              aria-label={t('common.previousPage')}
              className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-sm)] text-[color:var(--text-muted)] hover:bg-[color:var(--bg-hover)] disabled:opacity-40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand)]/50"
            >
              <ChevronLeft size={14} aria-hidden="true" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
              .reduce<(number | 'ellipsis')[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('ellipsis');
                acc.push(p);
                return acc;
              }, [])
              .map((item, idx) =>
                item === 'ellipsis' ? (
                  <span
                    key={`ellipsis-${idx}`}
                    className="px-1 text-[color:var(--text-muted)] text-[12px] select-none"
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setPage(item)}
                    aria-label={t('companies.pageButton', { item })}
                    aria-current={item === page ? 'page' : undefined}
                    className={cn(
                      'w-7 h-7 flex items-center justify-center rounded-[var(--radius-sm)] text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand)]/50',
                      item === page
                        ? 'bg-[color:var(--brand)] text-white'
                        : 'text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-hover)]',
                    )}
                  >
                    {item}
                  </button>
                ),
              )}

            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              aria-label={t('common.nextPage')}
              className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-sm)] text-[color:var(--text-muted)] hover:bg-[color:var(--bg-hover)] disabled:opacity-40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand)]/50"
            >
              <ChevronRight size={14} aria-hidden="true" />
            </button>
          </nav>
        </div>
      )}

      {/* Confirmation modal */}
      {modal && currentModal && (
        <ConfirmModal
          isOpen={true}
          onClose={handleCloseModal}
          onConfirm={handleConfirm}
          title={currentModal.title}
          description={currentModal.description}
          confirmLabel={currentModal.confirmLabel}
          variant={currentModal.variant}
          isLoading={isPending}
        />
      )}
    </div>
  );
}

// ─── CompanyRow ───────────────────────────────────────────────────────────────

interface CompanyRowProps {
  company: Company;
  detailBasePath: string;
  isSuperadmin: boolean;
  onDeactivate: () => void;
  onActivate: () => void;
  onDelete: () => void;
}

function CompanyRow({
  company,
  detailBasePath,
  isSuperadmin,
  onDeactivate,
  onActivate,
  onDelete,
}: CompanyRowProps) {
  const { t } = useTranslation();

  const tierLabelKey = COMPANY_TIER_LABEL_KEYS[company.plan as keyof typeof COMPANY_TIER_LABEL_KEYS];
  const tierClass = TIER_BADGE[company.plan] ?? 'bg-raised text-secondary';

  const createdDate = fmtDate(company.created_at, { month: 'short', year: 'numeric' });

  return (
    <tr className="group border-b border-[color:var(--border)] hover:bg-[color:var(--bg-hover)] transition-colors">
      {/* Company column: avatar + name + floor/office */}
      <td className="px-3 py-2.5 align-middle font-medium text-[color:var(--text-primary)]">
        <div className="flex items-center gap-2.5">
          {company.logo ? (
            <img
              src={company.logo}
              alt=""
              className="w-6 h-6 rounded-md object-cover shrink-0"
            />
          ) : (
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-white text-[10px] font-bold leading-none"
              style={{ backgroundColor: getCompanyColor(company.name) }}
              aria-hidden="true"
            >
              {getCompanyInitials(company.name)}
            </div>
          )}
          <div>
            <Link
              to={`${detailBasePath}/${company.id}`}
              className="hover:text-[color:var(--brand)] transition-colors"
            >
              {company.name}
            </Link>
            {(company.floor_id != null || company.office_number) && (
              <div className="mt-0.5 text-[11px] text-[color:var(--text-muted)] font-mono">
                {company.floor_id != null && t('companies.floorOffice', { floor: company.floor_number ?? company.floor_id })}
                {company.floor_id != null && company.office_number && ', '}
                {company.office_number && t('companies.officeNumber', { number: company.office_number })}
              </div>
            )}
          </div>
        </div>
      </td>

      {/* Categories */}
      <td className="px-3 py-2.5 align-middle">
        {company.categories.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1">
            {company.categories.slice(0, 3).map((cat) => (
              <span
                key={cat}
                className={cn(
                  'inline-flex items-center h-5 px-2 rounded text-[11px] font-medium',
                  CATEGORY_COLORS[cat] ?? DEFAULT_CAT_COLOR,
                )}
              >
                {cat}
              </span>
            ))}
            {company.categories.length > 3 && (
              <span className={cn('inline-flex items-center h-5 px-2 rounded text-[11px] font-medium', DEFAULT_CAT_COLOR)}>
                +{company.categories.length - 3}
              </span>
            )}
          </div>
        ) : (
          <span className="text-[color:var(--text-muted)] text-[12px]">—</span>
        )}
      </td>

      {/* Tier badge */}
      <td className="px-3 py-2.5 align-middle">
        <span className={cn('inline-block rounded-full px-2.5 py-0.5 text-xs font-medium', tierClass)}>
          {tierLabelKey ? t(tierLabelKey) : company.plan}
        </span>
      </td>

      {/* Employees */}
      <td className="px-3 py-2.5 align-middle text-right font-mono text-[13px] text-[color:var(--text-secondary)]">
        {company.max_employees}
      </td>

      {/* Contact / company admin */}
      <td className="px-3 py-2.5 align-middle">
        {company.company_admin ? (
          <div className="flex items-center gap-1.5">
            {company.company_admin.avatar ? (
              <img
                src={company.company_admin.avatar}
                alt=""
                className="w-6 h-6 rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-[color:var(--bg-raised)] flex items-center justify-center text-[10px] font-semibold text-[color:var(--text-secondary)] shrink-0">
                {getCompanyInitials(company.company_admin.full_name)}
              </div>
            )}
            <span className="text-[12px] text-[color:var(--text-muted)] truncate max-w-[140px]">{company.company_admin.full_name}</span>
          </div>
        ) : company.contact_email ? (
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full bg-[color:var(--bg-raised)] flex items-center justify-center text-[10px] font-semibold text-[color:var(--text-secondary)] shrink-0">
              {(company.contact_email.split('@')[0][0] ?? '?').toUpperCase()}
            </div>
            <span className="text-[12px] text-[color:var(--text-muted)] truncate max-w-[140px]">{company.contact_email}</span>
          </div>
        ) : (
          <span className="text-[color:var(--text-muted)] text-[12px]">—</span>
        )}
      </td>

      {/* Status */}
      <td className="px-3 py-2.5 align-middle">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium',
            company.is_active
              ? 'bg-[color:var(--status-free-bg)] text-[color:var(--status-free-text)]'
              : 'bg-[color:var(--status-na-bg)] text-[color:var(--status-na-text)]',
          )}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current flex-shrink-0" aria-hidden="true" />
          {company.is_active ? t('companies.companyActive') : t('companies.companyInactive')}
        </span>
      </td>

      {/* Created date */}
      <td className="px-3 py-2.5 align-middle text-[12px] text-[color:var(--text-muted)]">
        {createdDate}
      </td>

      {/* Actions */}
      <td className="px-3 py-2.5 align-middle">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {isSuperadmin && (
            <>
              {company.is_active ? (
                <button
                  type="button"
                  onClick={onDeactivate}
                  title={t('common.deactivate')}
                  className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-sm)] text-[color:var(--text-muted)] hover:text-[color:var(--status-busy-text)] hover:bg-[color:var(--status-busy-bg)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50"
                >
                  <PowerOff className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="sr-only">{t('companies.deactivateCompany', { name: company.name })}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onActivate}
                  title={t('common.activate')}
                  className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-sm)] text-[color:var(--text-muted)] hover:text-[color:var(--status-free-text)] hover:bg-[color:var(--status-free-bg)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
                >
                  <Power className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="sr-only">{t('companies.activateCompany', { name: company.name })}</span>
                </button>
              )}

              <button
                type="button"
                onClick={onDelete}
                title={t('common.delete')}
                className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-sm)] text-[color:var(--text-muted)] hover:text-[color:var(--danger)] hover:bg-[color:var(--status-busy-bg)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="sr-only">{t('companies.deleteCompany', { name: company.name })}</span>
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}
