import { useState } from 'react';
import { Link } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Building2, Users, HardDrive, CheckCircle2, XCircle, Trash2, PowerOff, Power } from 'lucide-react';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { USER_ROLES, COMPANY_TIERS } from '@/shared/config/constants';
import { useAuth } from '@/shared/hooks/useAuth';
import { cn } from '@/shared/lib/cn';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import type { Company, PaginatedResponse } from '@/shared/types';

// ─── Types ───────────────────────────────────────────────────────────────────

type ModalAction = 'deactivate' | 'activate' | 'delete';

interface ModalState {
  action: ModalAction;
  company: Company;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TIER_LABELS: Record<string, string> = {
  [COMPANY_TIERS.BASIC]: 'Базовый',
  [COMPANY_TIERS.STANDARD]: 'Стандарт',
  [COMPANY_TIERS.PREMIUM]: 'Премиум',
};

const TIER_COLORS: Record<string, string> = {
  [COMPANY_TIERS.BASIC]: 'bg-gray-100 text-gray-700',
  [COMPANY_TIERS.STANDARD]: 'bg-blue-100 text-blue-700',
  [COMPANY_TIERS.PREMIUM]: 'bg-purple-100 text-purple-700',
};

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

// ─── Component ───────────────────────────────────────────────────────────────

export default function CompanyListPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const isSuperadmin = user?.role === USER_ROLES.SUPERADMIN;

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [tierFilter, setTierFilter] = useState<'all' | string>('all');

  const [modal, setModal] = useState<ModalState | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const {
    data,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['companies'],
    queryFn: () =>
      apiClient.get<PaginatedResponse<Company>>(API.companies.list).then((r) => r.data),
  });

  const companies = data?.results ?? [];

  // ── Mutations ──────────────────────────────────────────────────────────────

  const deactivateMutation = useMutation({
    mutationFn: (id: number) =>
      apiClient.post(API.companies.deactivate(String(id))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      setMutationError(null);
    },
    onError: () => {
      setMutationError('Не удалось деактивировать компанию. Попробуйте ещё раз.');
    },
    onSettled: () => {
      setModal(null);
    },
  });

  const activateMutation = useMutation({
    mutationFn: (id: number) =>
      apiClient.post(API.companies.activate(String(id))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      setMutationError(null);
    },
    onError: () => {
      setMutationError('Не удалось активировать компанию. Попробуйте ещё раз.');
    },
    onSettled: () => {
      setModal(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiClient.delete(API.companies.delete(String(id))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      setMutationError(null);
    },
    onError: () => {
      setMutationError('Не удалось удалить компанию. Попробуйте ещё раз.');
    },
    onSettled: () => {
      setModal(null);
    },
  });

  const isPending =
    deactivateMutation.isPending ||
    activateMutation.isPending ||
    deleteMutation.isPending;

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

  // ── Filtering ──────────────────────────────────────────────────────────────

  const filtered = companies.filter((c) => {
    const matchesSearch =
      search.trim() === '' ||
      c.name.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && c.is_active) ||
      (statusFilter === 'inactive' && !c.is_active);

    const matchesTier = tierFilter === 'all' || c.tier === tierFilter;

    return matchesSearch && matchesStatus && matchesTier;
  });

  // ── Render ─────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 text-center">
        <p className="text-sm font-medium text-red-600">Ошибка загрузки компаний.</p>
        <p className="text-xs text-gray-500">Проверьте соединение и обновите страницу.</p>
      </div>
    );
  }

  const currentModal = modal
    ? modalConfig(modal.action, modal.company.name)
    : null;

  return (
    <div className="space-y-6 p-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Компании-арендаторы</h1>
          <p className="mt-1 text-sm text-gray-500">
            Всего: {companies.length}, активных:{' '}
            {companies.filter((c) => c.is_active).length}
          </p>
        </div>
        {isSuperadmin && (
          <Link
            to="/companies/new"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
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
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {mutationError}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            aria-hidden="true"
          />
          <input
            type="search"
            placeholder="Поиск по названию..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="all">Все статусы</option>
          <option value="active">Активные</option>
          <option value="inactive">Неактивные</option>
        </select>

        {/* Tier filter */}
        <select
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="all">Все тарифы</option>
          <option value={COMPANY_TIERS.BASIC}>Базовый</option>
          <option value={COMPANY_TIERS.STANDARD}>Стандарт</option>
          <option value={COMPANY_TIERS.PREMIUM}>Премиум</option>
        </select>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-200 text-center">
          <Building2 className="h-8 w-8 text-gray-300" aria-hidden="true" />
          <p className="text-sm text-gray-500">Компании не найдены</p>
        </div>
      )}

      {/* Table */}
      {filtered.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left">
                <th className="px-4 py-3 font-medium text-gray-600">Компания</th>
                <th className="px-4 py-3 font-medium text-gray-600">Тариф</th>
                <th className="px-4 py-3 font-medium text-gray-600">
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" aria-hidden="true" />
                    Сотрудники
                  </span>
                </th>
                <th className="px-4 py-3 font-medium text-gray-600">
                  <span className="inline-flex items-center gap-1">
                    <HardDrive className="h-3.5 w-3.5" aria-hidden="true" />
                    Хранилище
                  </span>
                </th>
                <th className="px-4 py-3 font-medium text-gray-600">Статус</th>
                {isSuperadmin && (
                  <th className="px-4 py-3 font-medium text-gray-600">Действия</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((company) => (
                <CompanyRow
                  key={company.id}
                  company={company}
                  isSuperadmin={isSuperadmin}
                  onDeactivate={() => openModal('deactivate', company)}
                  onActivate={() => openModal('activate', company)}
                  onDelete={() => openModal('delete', company)}
                />
              ))}
            </tbody>
          </table>
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
  isSuperadmin: boolean;
  onDeactivate: () => void;
  onActivate: () => void;
  onDelete: () => void;
}

function CompanyRow({
  company,
  isSuperadmin,
  onDeactivate,
  onActivate,
  onDelete,
}: CompanyRowProps) {
  return (
    <tr className="group transition-colors hover:bg-gray-50">
      {/* Name + office */}
      <td className="px-4 py-3">
        <Link
          to={`/companies/${company.id}`}
          className="font-medium text-blue-600 hover:underline"
        >
          {company.name}
        </Link>
        <div className="mt-0.5 text-xs text-gray-400">
          Этаж {company.floor}, офис {company.office_number}
        </div>
      </td>

      {/* Tier */}
      <td className="px-4 py-3">
        <span
          className={cn(
            'inline-block rounded-full px-2.5 py-0.5 text-xs font-medium',
            TIER_COLORS[company.tier] ?? 'bg-gray-100 text-gray-700',
          )}
        >
          {TIER_LABELS[company.tier] ?? company.tier}
        </span>
      </td>

      {/* Employees limit */}
      <td className="px-4 py-3 text-gray-700">{company.max_employees}</td>

      {/* Storage quota */}
      <td className="px-4 py-3 text-gray-700">{company.storage_quota_gb} ГБ</td>

      {/* Status */}
      <td className="px-4 py-3">
        {company.is_active ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
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

      {/* Actions (superadmin only) */}
      {isSuperadmin && (
        <td className="px-4 py-3">
          <div className="flex items-center gap-1">
            {company.is_active ? (
              <button
                type="button"
                onClick={onDeactivate}
                title="Деактивировать"
                className="rounded-lg p-1.5 text-amber-500 transition-colors hover:bg-amber-50 hover:text-amber-700"
              >
                <PowerOff className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">Деактивировать {company.name}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onActivate}
                title="Активировать"
                className="rounded-lg p-1.5 text-emerald-500 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
              >
                <Power className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">Активировать {company.name}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onDelete}
              title="Удалить"
              className="rounded-lg p-1.5 text-red-400 transition-colors hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Удалить {company.name}</span>
            </button>
          </div>
        </td>
      )}
    </tr>
  );
}
