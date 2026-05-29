import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  Building2,
  Users,
  HardDrive,
  CheckCircle2,
  XCircle,
  Trash2,
  PowerOff,
  Power,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { COMPANY_TIERS, COMPANY_TIER_LABEL_KEYS, SUPERADMIN_UI_PREFIX, USER_ROLES } from '@/shared/config/constants';
import { useAuth } from '@/shared/hooks/useAuth';
import { isCompanyNotAssignedError } from '@/shared/lib/apiError';
import { companiesCacheRoot } from '@/shared/lib/companyQueryKeys';
import { cn } from '@/shared/lib/cn';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import type { Company, PaginatedResponse } from '@/shared/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

const PLAN_COLORS: Record<string, string> = {
  [COMPANY_TIERS.BASIC]: 'bg-hover text-secondary',
  [COMPANY_TIERS.STANDARD]: 'bg-blue-900/60 text-blue-300',
  [COMPANY_TIERS.PREMIUM]: 'bg-purple-900/60 text-purple-300',
};

// ─── Types ────────────────────────────────────────────────────────────────────

type ModalAction = 'deactivate' | 'activate' | 'delete';

interface ModalState {
  action: ModalAction;
  company: Company;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  return (
    <tr className="animate-pulse">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gray-200 shrink-0" />
          <div className="space-y-1.5">
            <div className="w-36 h-4 rounded bg-gray-200" />
            <div className="w-24 h-3 rounded bg-gray-200" />
          </div>
        </div>
      </td>
      <td className="px-4 py-3"><div className="w-20 h-5 rounded-full bg-gray-200" /></td>
      <td className="px-4 py-3"><div className="w-12 h-4 rounded bg-gray-200" /></td>
      <td className="px-4 py-3"><div className="w-16 h-4 rounded bg-gray-200" /></td>
      <td className="px-4 py-3"><div className="w-16 h-5 rounded-full bg-gray-200" /></td>
      <td className="px-4 py-3"><div className="w-20 h-8 rounded-lg bg-gray-200" /></td>
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
      <main className="px-3 py-4 sm:px-4 sm:py-6 md:py-8 max-w-7xl mx-auto">
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-2xl border border-amber-900/50 bg-warning-subtle px-6 py-12 text-center">
          <Building2 className="h-12 w-12 text-amber-400/90" aria-hidden="true" />
          <h1 className="text-lg font-semibold text-primary">{t('companies.notAssignedTitle')}</h1>
          <p className="max-w-md text-sm text-secondary">
            {t('companies.notAssignedDesc')}
          </p>
        </div>
      </main>
    );
  }

  if (isError) {
    return (
      <main className="px-3 py-4 sm:px-4 sm:py-6 md:py-8 max-w-7xl mx-auto">
        <div className="flex h-64 flex-col items-center justify-center gap-2 text-center">
          <p className="text-sm font-medium text-danger">{t('companies.loadError')}</p>
          <p className="text-xs text-secondary">{t('companies.loadErrorHint')}</p>
        </div>
      </main>
    );
  }

  const currentModal = modal ? modalConfig(modal.action, modal.company.name, t) : null;

  return (
    <main className="px-3 py-4 sm:px-4 sm:py-6 md:py-8 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">{t('companies.tenantsTitle')}</h1>
          {!showLoading && (
            <p className="mt-1 text-sm text-secondary">
              {t('companies.tenantsTotal', { count: totalCount })}
            </p>
          )}
        </div>
        {isSuperadmin && (
          <Link
            to={`${companiesBasePath}/new`}
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t('companies.createCompany')}
          </Link>
        )}
      </div>

      {/* Mutation error banner */}
      {mutationError && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 dark:border-red-800 bg-danger-subtle px-4 py-3 text-sm text-danger"
        >
          {mutationError}
        </div>
      )}

      {/* Filters — superadmin only */}
      {isSuperadmin && (
        <section
          className="bg-raised rounded-2xl border border-default p-4"
          aria-label={t('companies.filterLabel')}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {/* Search */}
            <div className="relative w-full sm:flex-1 sm:min-w-52">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder={t('common.searchByNameEmail')}
                aria-label={t('companies.searchCompanies')}
                className="w-full rounded-lg border border-default bg-surface py-2 pl-9 pr-3 text-sm text-primary placeholder:text-muted focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Plan filter */}
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              aria-label={t('companies.filterLabel')}
              className="w-full sm:w-auto rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">{t('companies.allPlans')}</option>
              <option value={COMPANY_TIERS.BASIC}>{t('companies.planBasic')}</option>
              <option value={COMPANY_TIERS.STANDARD}>{t('companies.planStandard')}</option>
              <option value={COMPANY_TIERS.PREMIUM}>{t('companies.planPremium')}</option>
            </select>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label={t('common.status')}
              className="w-full sm:w-auto rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">{t('common.allStatuses')}</option>
              <option value="true">{t('passes.filters.active')}</option>
              <option value="false">{t('companies.inactive')}</option>
            </select>
          </div>
        </section>
      )}

      {/* Table */}
      <div className="bg-raised rounded-2xl border border-default overflow-hidden">
        <div className="overflow-x-auto">
          <table
            className="w-full min-w-[820px] text-sm"
            role="table"
            aria-label={t('companies.tableList')}
          >
            <thead>
              <tr className="border-b border-default bg-surface/60 text-left">
                <th
                  scope="col"
                  className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-secondary"
                >{t('common.company')}</th>
                <th
                  scope="col"
                  className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-secondary"
                >
                  {t('companies.tablePlan')}
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-secondary"
                >
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('companies.tableEmployees')}
                  </span>
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-secondary"
                >
                  <span className="inline-flex items-center gap-1">
                    <HardDrive className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('companies.tableStorage')}
                  </span>
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-secondary"
                >{t('common.status')}</th>
                <th scope="col" className="px-4 py-3">
                  <span className="sr-only">{t('companies.tableActions')}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--border)]/60">
              {showLoading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
              ) : companies.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Building2 className="h-8 w-8 text-secondary" aria-hidden="true" />
                      <p className="text-sm text-secondary">{t('companies.notFound')}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                companies.map((company) => (
                  <CompanyRow
                    key={company.id}
                    company={company}
                    detailBasePath={companiesBasePath}
                    isSuperadmin={isSuperadmin}
                    onDeactivate={() => openModal('deactivate', company)}
                    onActivate={() => openModal('activate', company)}
                    onDelete={() => openModal('delete', company)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {!showLoading && totalCount > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-secondary">
            {t('companies.paginationRange', { start: rangeStart, end: rangeEnd, total: totalCount })}
          </p>

          <nav aria-label={t('common.pagination')} className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              aria-label={t('common.previousPage')}
              className={cn(
                'rounded-lg border p-2 text-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
                page === 1
                  ? 'cursor-not-allowed border-default text-muted'
                  : 'border-default hover:bg-hover',
              )}
            >
              <ChevronLeft size={16} aria-hidden="true" />
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
                    className="px-2 text-secondary text-sm select-none"
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
                      'h-9 w-9 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
                      item === page
                        ? 'bg-brand text-white'
                        : 'border border-default text-secondary hover:bg-hover',
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
              className={cn(
                'rounded-lg border p-2 text-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
                page === totalPages
                  ? 'cursor-not-allowed border-default text-muted'
                  : 'border-default hover:bg-hover',
              )}
            >
              <ChevronRight size={16} aria-hidden="true" />
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
    </main>
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
  return (
    <tr className="group transition-colors hover:bg-hover/40">
      {/* Logo + Name + office */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          {company.logo ? (
            <img
              src={company.logo}
              alt={company.name}
              className="w-8 h-8 rounded-lg object-cover shrink-0"
            />
          ) : (
            <div
              className="w-8 h-8 rounded-lg bg-blue-900/40 flex items-center justify-center shrink-0"
              aria-hidden="true"
            >
              <Building2 className="w-4 h-4 text-blue-300" />
            </div>
          )}
          <div>
            <Link
              to={`${detailBasePath}/${company.id}`}
              className="font-medium text-blue-300 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
            >
              {company.name}
            </Link>
            {(company.floor != null || company.office_number) && (
              <div className="mt-0.5 text-xs text-muted">
                {company.floor != null && t('companies.floorOffice', { floor: company.floor })}
                {company.floor != null && company.office_number && ', '}
                {company.office_number && t('companies.officeNumber', { number: company.office_number })}
              </div>
            )}
          </div>
        </div>
      </td>

      {/* Plan badge */}
      <td className="px-4 py-3">
        <span
          className={cn(
            'inline-block rounded-full px-2.5 py-0.5 text-xs font-medium',
            PLAN_COLORS[company.plan] ?? 'bg-hover text-secondary',
          )}
        >
          {t(COMPANY_TIER_LABEL_KEYS[company.plan as keyof typeof COMPANY_TIER_LABEL_KEYS] ?? company.plan)}
        </span>
      </td>

      {/* Max employees */}
      <td className="px-4 py-3 text-secondary">{company.max_employees}</td>

      {/* Storage limit */}
      <td className="px-4 py-3 text-secondary">{t('companies.storageGb', { value: company.storage_limit_gb })}</td>

      {/* Status */}
      <td className="px-4 py-3">
        {company.is_active ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            {t('companies.companyActive')}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-secondary">
            <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
            {t('companies.companyInactive')}
          </span>
        )}
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex flex-wrap items-center gap-1">
          <Link
            to={`${detailBasePath}/${company.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-300 bg-blue-900/30 hover:bg-blue-900/50 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label={t('companies.openCompany', { name: company.name })}
          >
            <ExternalLink size={13} aria-hidden="true" />
            {t('companies.open')}
          </Link>

          {isSuperadmin && (
            <>
              {company.is_active ? (
                <button
                  type="button"
                  onClick={onDeactivate}
                  title={t('common.deactivate')}
                  className="rounded-lg p-1.5 text-amber-400 transition-colors hover:bg-warning-subtle hover:text-warning focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                >
                  <PowerOff className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only">{t('companies.deactivateCompany', { name: company.name })}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onActivate}
                  title={t('common.activate')}
                  className="rounded-lg p-1.5 text-emerald-400 transition-colors hover:bg-success-subtle hover:text-success focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  <Power className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only">{t('companies.activateCompany', { name: company.name })}</span>
                </button>
              )}

              <button
                type="button"
                onClick={onDelete}
                title={t('common.delete')}
                className="rounded-lg p-1.5 text-red-400 transition-colors hover:bg-danger-subtle hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">{t('companies.deleteCompany', { name: company.name })}</span>
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}
