import { useState, useEffect, useRef, useCallback } from 'react';
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
import { COMPANY_TIERS, SUPERADMIN_UI_PREFIX, USER_ROLES } from '@/shared/config/constants';
import { useAuth } from '@/shared/hooks/useAuth';
import { cn } from '@/shared/lib/cn';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import type { Company, PaginatedResponse } from '@/shared/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

const PLAN_LABELS: Record<string, string> = {
  [COMPANY_TIERS.BASIC]: 'Базовый',
  [COMPANY_TIERS.STANDARD]: 'Стандарт',
  [COMPANY_TIERS.PREMIUM]: 'Премиум',
};

const PLAN_COLORS: Record<string, string> = {
  [COMPANY_TIERS.BASIC]: 'bg-gray-700 text-gray-200',
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

function modalConfig(action: ModalAction, companyName: string) {
  switch (action) {
    case 'deactivate':
      return {
        title: 'Деактивировать компанию',
        description: `Вы уверены, что хотите деактивировать «${companyName}»? Сотрудники компании потеряют доступ к платформе.`,
        confirmLabel: 'Деактивировать',
        variant: 'warning' as const,
      };
    case 'activate':
      return {
        title: 'Активировать компанию',
        description: `Вы уверены, что хотите активировать «${companyName}»? Сотрудники снова получат доступ к платформе.`,
        confirmLabel: 'Активировать',
        variant: 'warning' as const,
      };
    case 'delete':
      return {
        title: 'Удалить компанию',
        description: `Вы уверены, что хотите безвозвратно удалить «${companyName}»? Это действие нельзя отменить. Все данные компании будут потеряны.`,
        confirmLabel: 'Удалить',
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
  const { user } = useAuth();
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

  const { data, isLoading, isError } = useQuery<PaginatedResponse<Company>>({
    queryKey: ['companies', { search, planFilter, statusFilter, page }],
    queryFn: () =>
      apiClient
        .get<PaginatedResponse<Company>>(API.companies.list, { params: queryParams })
        .then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const companies = data?.results ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const rangeStart = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, totalCount);

  // For non-superadmin: redirect to their own company if only one result
  useEffect(() => {
    if (!isSuperadmin && !isLoading && companies.length === 1) {
      navigate(`/companies/${companies[0].id}`, { replace: true });
    }
  }, [isSuperadmin, isLoading, companies, navigate]);

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
      setMutationError('Не удалось деактивировать компанию. Попробуйте ещё раз.');
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
      setMutationError('Не удалось активировать компанию. Попробуйте ещё раз.');
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
      setMutationError('Не удалось удалить компанию. Попробуйте ещё раз.');
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

  if (isError) {
    return (
      <main className="px-3 py-4 sm:px-4 sm:py-6 md:py-8 max-w-7xl mx-auto">
        <div className="flex h-64 flex-col items-center justify-center gap-2 text-center">
          <p className="text-sm font-medium text-red-300">Ошибка загрузки компаний.</p>
          <p className="text-xs text-gray-400">Проверьте соединение и обновите страницу.</p>
        </div>
      </main>
    );
  }

  const currentModal = modal ? modalConfig(modal.action, modal.company.name) : null;

  return (
    <main className="px-3 py-4 sm:px-4 sm:py-6 md:py-8 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Компании-арендаторы</h1>
          {!isLoading && (
            <p className="mt-1 text-sm text-gray-400">
              Всего: {totalCount}
            </p>
          )}
        </div>
        {isSuperadmin && (
          <Link
            to={`${companiesBasePath}/new`}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Создать компанию
          </Link>
        )}
      </div>

      {/* Mutation error banner */}
      {mutationError && (
        <div
          role="alert"
          className="rounded-lg border border-red-800 bg-red-950/30 px-4 py-3 text-sm text-red-300"
        >
          {mutationError}
        </div>
      )}

      {/* Filters — superadmin only */}
      {isSuperadmin && (
        <section
          className="bg-gray-800 rounded-2xl border border-gray-700 p-4"
          aria-label="Фильтры компаний"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {/* Search */}
            <div className="relative w-full sm:flex-1 sm:min-w-52">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Поиск по названию..."
                aria-label="Поиск компаний"
                className="w-full rounded-lg border border-gray-700 bg-gray-900 py-2 pl-9 pr-3 text-sm text-white placeholder:text-gray-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Plan filter */}
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              aria-label="Фильтр по тарифу"
              className="w-full sm:w-auto rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Все тарифы</option>
              <option value={COMPANY_TIERS.BASIC}>Базовый</option>
              <option value={COMPANY_TIERS.STANDARD}>Стандарт</option>
              <option value={COMPANY_TIERS.PREMIUM}>Премиум</option>
            </select>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Фильтр по статусу"
              className="w-full sm:w-auto rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Все статусы</option>
              <option value="true">Активные</option>
              <option value="false">Неактивные</option>
            </select>
          </div>
        </section>
      )}

      {/* Table */}
      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table
            className="w-full min-w-[820px] text-sm"
            role="table"
            aria-label="Список компаний"
          >
            <thead>
              <tr className="border-b border-gray-700 bg-gray-900/60 text-left">
                <th
                  scope="col"
                  className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400"
                >
                  Компания
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400"
                >
                  Тариф
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400"
                >
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" aria-hidden="true" />
                    Сотрудники
                  </span>
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400"
                >
                  <span className="inline-flex items-center gap-1">
                    <HardDrive className="h-3.5 w-3.5" aria-hidden="true" />
                    Хранилище
                  </span>
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400"
                >
                  Статус
                </th>
                <th scope="col" className="px-4 py-3">
                  <span className="sr-only">Действия</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/60">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
              ) : companies.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Building2 className="h-8 w-8 text-gray-300" aria-hidden="true" />
                      <p className="text-sm text-gray-400">Компании не найдены</p>
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
      {!isLoading && totalCount > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-400">
            Показано{' '}
            <span className="font-medium text-white">
              {rangeStart}–{rangeEnd}
            </span>{' '}
            из{' '}
            <span className="font-medium text-white">{totalCount}</span> компаний
          </p>

          <nav aria-label="Пагинация" className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              aria-label="Предыдущая страница"
              className={cn(
                'rounded-lg border p-2 text-gray-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
                page === 1
                  ? 'cursor-not-allowed border-gray-800 text-gray-600'
                  : 'border-gray-700 hover:bg-gray-700',
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
                    className="px-2 text-gray-400 text-sm select-none"
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setPage(item)}
                    aria-label={`Страница ${item}`}
                    aria-current={item === page ? 'page' : undefined}
                    className={cn(
                      'h-9 w-9 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
                      item === page
                        ? 'bg-indigo-600 text-white'
                        : 'border border-gray-700 text-gray-300 hover:bg-gray-700',
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
              aria-label="Следующая страница"
              className={cn(
                'rounded-lg border p-2 text-gray-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
                page === totalPages
                  ? 'cursor-not-allowed border-gray-800 text-gray-600'
                  : 'border-gray-700 hover:bg-gray-700',
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
  return (
    <tr className="group transition-colors hover:bg-gray-700/40">
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
              <div className="mt-0.5 text-xs text-gray-500">
                {company.floor != null && `Этаж ${company.floor}`}
                {company.floor != null && company.office_number && ', '}
                {company.office_number && `офис ${company.office_number}`}
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
            PLAN_COLORS[company.plan] ?? 'bg-gray-700 text-gray-200',
          )}
        >
          {PLAN_LABELS[company.plan] ?? company.plan}
        </span>
      </td>

      {/* Max employees */}
      <td className="px-4 py-3 text-gray-300">{company.max_employees}</td>

      {/* Storage limit */}
      <td className="px-4 py-3 text-gray-300">{company.storage_limit_gb} ГБ</td>

      {/* Status */}
      <td className="px-4 py-3">
        {company.is_active ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            Активна
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-400">
            <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
            Неактивна
          </span>
        )}
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex flex-wrap items-center gap-1">
          <Link
            to={`${detailBasePath}/${company.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-300 bg-blue-900/30 hover:bg-blue-900/50 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label={`Открыть ${company.name}`}
          >
            <ExternalLink size={13} aria-hidden="true" />
            Открыть
          </Link>

          {isSuperadmin && (
            <>
              {company.is_active ? (
                <button
                  type="button"
                  onClick={onDeactivate}
                  title="Деактивировать"
                  className="rounded-lg p-1.5 text-amber-400 transition-colors hover:bg-amber-900/30 hover:text-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                >
                  <PowerOff className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only">Деактивировать {company.name}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onActivate}
                  title="Активировать"
                  className="rounded-lg p-1.5 text-emerald-400 transition-colors hover:bg-emerald-900/30 hover:text-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  <Power className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only">Активировать {company.name}</span>
                </button>
              )}

              <button
                type="button"
                onClick={onDelete}
                title="Удалить"
                className="rounded-lg p-1.5 text-red-400 transition-colors hover:bg-red-900/30 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">Удалить {company.name}</span>
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}
