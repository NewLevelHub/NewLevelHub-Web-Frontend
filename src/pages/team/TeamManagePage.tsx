import { useState, useEffect, useCallback, memo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  User,
  CheckCircle2,
  XCircle,
  Activity,
  Calendar,
  ClipboardList,
  LogIn,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
  UserMinus,
} from 'lucide-react';
import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { USER_ROLES } from '@/shared/config/constants';
import { useAuth } from '@/shared/hooks/useAuth';
import { getApiErrorMessage } from '@/shared/lib/apiError';
import { cn } from '@/shared/lib/cn';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import { PromptModal } from '@/shared/ui/PromptModal';
import { resolveMediaUrl } from '@/shared/lib/mediaUrl';
import type {
  Company,
  CompanyMember,
  MemberActionResponse,
  MemberActivity,
  PaginatedResponse,
} from '@/shared/types';

// ---------------------------------------------------------------------------
// Styles (matching CompanyMembersPage dark theme)
// ---------------------------------------------------------------------------
const inputClass =
  'w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';

const selectClass =
  'rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type OrderingField = 'full_name' | 'date_joined' | 'last_login';
type OrderingDir = 'asc' | 'desc';

interface Filters {
  search: string;
  role: '' | 'employee' | 'company_admin';
  is_active: '' | 'true' | 'false';
  orderingField: OrderingField;
  orderingDir: OrderingDir;
  page: number;
}

const PAGE_SIZE = 20;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function buildOrdering(field: OrderingField, dir: OrderingDir): string {
  return dir === 'desc' ? `-${field}` : field;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getInitials(fullName: string): string {
  return fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface AvatarProps {
  src: string | null;
  fullName: string;
}

const Avatar = memo<AvatarProps>(({ src, fullName }) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  const avatarSrc = !hasError ? (resolveMediaUrl(src) ?? src) : null;
  if (avatarSrc) {
    return (
      <img
        src={avatarSrc}
        alt={fullName}
        className="h-9 w-9 rounded-full object-cover"
        onError={() => setHasError(true)}
      />
    );
  }
  return (
    <div
      className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white select-none"
      aria-hidden="true"
    >
      {getInitials(fullName)}
    </div>
  );
});

interface RoleBadgeProps {
  role: string;
}

const RoleBadge = memo<RoleBadgeProps>(({ role }) => {
  const label =
    role === USER_ROLES.COMPANY_ADMIN
      ? 'Админ'
      : role === USER_ROLES.EMPLOYEE
        ? 'Сотрудник'
        : role === USER_ROLES.SUPERADMIN
          ? 'Супер'
          : role;

  const colorClass =
    role === USER_ROLES.COMPANY_ADMIN
      ? 'bg-indigo-900/60 text-indigo-300'
      : role === USER_ROLES.SUPERADMIN
        ? 'bg-purple-900/60 text-purple-300'
        : 'bg-gray-700 text-gray-300';

  return (
    <span
      className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', colorClass)}
    >
      {label}
    </span>
  );
});

interface StatusBadgeProps {
  isActive: boolean;
}

const StatusBadge = memo<StatusBadgeProps>(({ isActive }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
      isActive ? 'bg-emerald-900/50 text-emerald-400' : 'bg-red-900/50 text-red-400',
    )}
    aria-label={isActive ? 'Активен' : 'Неактивен'}
  >
    {isActive ? (
      <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
    ) : (
      <XCircle className="h-3 w-3" aria-hidden="true" />
    )}
    {isActive ? 'Активен' : 'Неактивен'}
  </span>
));

// ---------------------------------------------------------------------------
// Activity panel
// ---------------------------------------------------------------------------

interface ActivityPanelProps {
  companyId: string;
  memberId: number;
}

const ActivityPanel = memo<ActivityPanelProps>(({ companyId, memberId }) => {
  const { data, isLoading, isError } = useQuery<MemberActivity>({
    queryKey: ['memberActivity', companyId, memberId],
    queryFn: () =>
      apiClient
        .get<MemberActivity>(API.companies.memberActivity(companyId, String(memberId)))
        .then((r) => r.data),
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-gray-400">
        <Activity className="h-4 w-4 animate-pulse" aria-hidden="true" />
        Загрузка активности…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <p className="py-3 text-sm text-red-400">Не удалось загрузить данные активности.</p>
    );
  }

  const stats: { icon: React.ReactNode; label: string; value: string | number }[] = [
    {
      icon: <LogIn className="h-4 w-4 text-indigo-400" aria-hidden="true" />,
      label: 'Последний вход',
      value: formatDate(data.last_login),
    },
    {
      icon: <ClipboardList className="h-4 w-4 text-amber-400" aria-hidden="true" />,
      label: 'Активные задачи',
      value: data.active_tasks_count,
    },
    {
      icon: <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-hidden="true" />,
      label: 'Завершённые задачи',
      value: data.completed_tasks_count,
    },
    {
      icon: <Calendar className="h-4 w-4 text-sky-400" aria-hidden="true" />,
      label: 'Брони за 30 дней',
      value: data.bookings_last_30_days,
    },
  ];

  return (
    <div
      className="grid grid-cols-2 gap-3 sm:grid-cols-4"
      role="region"
      aria-label="Активность сотрудника"
    >
      {stats.map((s) => (
        <div
          key={s.label}
          className="flex flex-col gap-1.5 rounded-lg bg-gray-900 px-4 py-3 border border-gray-700"
        >
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            {s.icon}
            {s.label}
          </div>
          <span className="text-base font-semibold text-white">{s.value}</span>
        </div>
      ))}
    </div>
  );
});

// ---------------------------------------------------------------------------
// Member row
// ---------------------------------------------------------------------------

interface MemberRowProps {
  member: CompanyMember;
  companyId: string;
  isExpanded: boolean;
  onToggle: (id: number) => void;
  canManageMembers: boolean;
  isUpdating: boolean;
  onDeactivate: (member: CompanyMember) => void;
  onActivate: (member: CompanyMember) => void;
  onRemove: (member: CompanyMember) => void;
}

const MemberRow = memo<MemberRowProps>(({
  member,
  companyId,
  isExpanded,
  onToggle,
  canManageMembers,
  isUpdating,
  onDeactivate,
  onActivate,
  onRemove,
}) => {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onToggle(member.id);
      }
    },
    [member.id, onToggle],
  );

  return (
    <>
      <tr
        className={cn(
          'cursor-pointer transition-colors',
          isExpanded ? 'bg-gray-700/60' : 'hover:bg-gray-700/40',
        )}
        onClick={() => onToggle(member.id)}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="row"
        aria-expanded={isExpanded}
        aria-label={`Сотрудник ${member.full_name}`}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <Avatar src={member.avatar} fullName={member.full_name} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{member.full_name}</p>
              <p className="truncate text-xs text-gray-400">{member.email}</p>
            </div>
          </div>
        </td>
        <td className="hidden px-4 py-3 sm:table-cell">
          <RoleBadge role={member.role} />
        </td>
        <td className="hidden px-4 py-3 text-sm text-gray-300 md:table-cell">
          {member.position || <span className="text-gray-600">—</span>}
        </td>
        <td className="hidden px-4 py-3 lg:table-cell">
          <StatusBadge isActive={member.is_active} />
        </td>
        <td className="hidden px-4 py-3 text-xs text-gray-400 xl:table-cell">
          {formatDate(member.date_joined)}
        </td>
        <td className="hidden px-4 py-3 text-xs text-gray-400 xl:table-cell">
          {formatDate(member.last_login)}
        </td>
        <td className="px-4 py-3 text-right">
          {isExpanded ? (
            <ChevronUp className="ml-auto h-4 w-4 text-gray-400" aria-hidden="true" />
          ) : (
            <ChevronDown className="ml-auto h-4 w-4 text-gray-400" aria-hidden="true" />
          )}
        </td>
      </tr>
      {isExpanded && (
        <tr role="row">
          <td colSpan={7} className="bg-gray-800/60 px-4 pb-4 pt-2">
            <div className="space-y-3">
              <ActivityPanel companyId={companyId} memberId={member.id} />
              {canManageMembers && (
                <div className="flex flex-wrap gap-2">
                  {member.is_active ? (
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => onDeactivate(member)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-amber-700 bg-amber-900/40 px-3 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-900/60 disabled:opacity-60"
                    >
                      <UserX className="h-3.5 w-3.5" aria-hidden="true" />
                      Деактивировать
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => onActivate(member)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-700 bg-emerald-900/30 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-900/50 disabled:opacity-60"
                    >
                      <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
                      Активировать
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => onRemove(member)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-800 bg-red-900/30 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-900/50 disabled:opacity-60"
                  >
                    <UserMinus className="h-3.5 w-3.5" aria-hidden="true" />
                    Удалить из компании
                  </button>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
});

// ---------------------------------------------------------------------------
// Ordering toggle button
// ---------------------------------------------------------------------------

interface OrderingButtonProps {
  field: OrderingField;
  label: string;
  current: { field: OrderingField; dir: OrderingDir };
  onChange: (field: OrderingField) => void;
}

const OrderingButton = memo<OrderingButtonProps>(({ field, label, current, onChange }) => {
  const isActive = current.field === field;
  const Icon = isActive
    ? current.dir === 'asc'
      ? ArrowUp
      : ArrowDown
    : ArrowUpDown;

  return (
    <button
      type="button"
      onClick={() => onChange(field)}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition-colors',
        isActive
          ? 'bg-indigo-600 text-white'
          : 'border border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700',
      )}
      aria-pressed={isActive}
      aria-label={`Сортировка по ${label}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </button>
  );
});

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

const DEBOUNCE_MS = 350;

export default function TeamManagePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isSuperadmin = user?.role === USER_ROLES.SUPERADMIN;

  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [filters, setFilters] = useState<Filters>({
    search: '',
    role: '',
    is_active: '',
    orderingField: 'full_name',
    orderingDir: 'asc',
    page: 1,
  });
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<CompanyMember | null>(null);
  const [activateTarget, setActivateTarget] = useState<CompanyMember | null>(null);
  const [removeConfirmTarget, setRemoveConfirmTarget] = useState<CompanyMember | null>(null);
  const [removeReassignTarget, setRemoveReassignTarget] = useState<CompanyMember | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search);
      setFilters((prev) => ({ ...prev, page: 1 }));
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [filters.search]);

  // Fetch companies list for superadmin
  const { data: companiesData } = useQuery<PaginatedResponse<Company>>({
    queryKey: ['companies', 'list'],
    queryFn: () =>
      apiClient.get<PaginatedResponse<Company>>(API.companies.list).then((r) => r.data),
    enabled: isSuperadmin,
    staleTime: 60_000,
  });

  // Determine companyId
  const companyId = isSuperadmin
    ? selectedCompanyId || null
    : user?.company_id != null
      ? String(user.company_id)
      : null;

  const queryParams = {
    search: debouncedSearch || undefined,
    role: filters.role || undefined,
    is_active: filters.is_active || undefined,
    ordering: buildOrdering(filters.orderingField, filters.orderingDir),
    page: filters.page,
    page_size: PAGE_SIZE,
  };

  const { data, isLoading, isError, isFetching } = useQuery<PaginatedResponse<CompanyMember>>({
    queryKey: ['teamMembers', companyId, queryParams],
    queryFn: () =>
      apiClient
        .get<PaginatedResponse<CompanyMember>>(API.companies.members(companyId!), {
          params: queryParams,
        })
        .then((r) => r.data),
    enabled: companyId !== null,
    staleTime: 15_000,
    placeholderData: (prev) => prev,
  });

  const refreshMemberQueries = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
    await queryClient.invalidateQueries({ queryKey: ['company-members'] });
  }, [queryClient]);

  const deactivateMemberMutation = useMutation({
    mutationFn: ({ currentCompanyId, memberId }: { currentCompanyId: string; memberId: number }) =>
      apiClient
        .post<MemberActionResponse>(API.companies.memberDeactivate(currentCompanyId, String(memberId)))
        .then((r) => r.data),
    onSuccess: async (payload) => {
      setActionError(null);
      setActionSuccess(payload.detail);
      await refreshMemberQueries();
    },
    onError: (error: unknown) => {
      setActionSuccess(null);
      setActionError(getApiErrorMessage(error, 'Не удалось деактивировать сотрудника.'));
    },
  });

  const activateMemberMutation = useMutation({
    mutationFn: ({ currentCompanyId, memberId }: { currentCompanyId: string; memberId: number }) =>
      apiClient
        .post<MemberActionResponse>(API.companies.memberActivate(currentCompanyId, String(memberId)))
        .then((r) => r.data),
    onSuccess: async (payload) => {
      setActionError(null);
      setActionSuccess(payload.detail);
      await refreshMemberQueries();
    },
    onError: (error: unknown) => {
      setActionSuccess(null);
      setActionError(getApiErrorMessage(error, 'Не удалось активировать сотрудника.'));
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: ({
      currentCompanyId,
      memberId,
      reassignTo,
    }: {
      currentCompanyId: string;
      memberId: number;
      reassignTo?: string;
    }) =>
      apiClient
        .delete<MemberActionResponse>(API.companies.memberRemove(currentCompanyId, String(memberId), reassignTo))
        .then((r) => r.data),
    onSuccess: async (payload) => {
      const suffix =
        typeof payload.tasks_reassigned === 'number'
          ? ` Переназначено задач: ${payload.tasks_reassigned}.`
          : '';
      setActionError(null);
      setActionSuccess(`${payload.detail}.${suffix}`.trim());
      await refreshMemberQueries();
    },
    onError: (error: unknown) => {
      setActionSuccess(null);
      setActionError(getApiErrorMessage(error, 'Не удалось удалить сотрудника из компании.'));
    },
  });

  const isMemberActionPending =
    deactivateMemberMutation.isPending ||
    activateMemberMutation.isPending ||
    removeMemberMutation.isPending;

  const handleToggleExpand = useCallback((id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const handleOrderingFieldChange = useCallback((field: OrderingField) => {
    setFilters((prev) => ({
      ...prev,
      orderingDir:
        prev.orderingField === field
          ? prev.orderingDir === 'asc'
            ? 'desc'
            : 'asc'
          : 'asc',
      orderingField: field,
      page: 1,
    }));
  }, []);

  const canManageMembers = user?.role === USER_ROLES.SUPERADMIN || user?.role === USER_ROLES.COMPANY_ADMIN;

  const handleDeactivate = useCallback((member: CompanyMember) => {
    if (!companyId) return;
    setDeactivateTarget(member);
  }, [companyId]);

  const handleActivate = useCallback((member: CompanyMember) => {
    if (!companyId) return;
    setActivateTarget(member);
  }, [companyId]);

  const handleRemove = useCallback((member: CompanyMember) => {
    if (!companyId) return;
    setRemoveConfirmTarget(member);
  }, [companyId]);

  const totalPages = data ? Math.ceil(data.count / PAGE_SIZE) : 0;

  if (!companyId && !isSuperadmin) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <User className="h-12 w-12 text-gray-600" aria-hidden="true" />
        <p className="text-sm text-gray-400">Компания не найдена.</p>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-6 p-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Управление сотрудниками</h1>
        <p className="mt-1 text-sm text-gray-400">
          {companyId && data ? `Всего: ${data.count} сотрудников` : isSuperadmin && !companyId ? 'Выберите компанию для просмотра сотрудников' : 'Загрузка…'}
        </p>
      </div>

      {/* Company selector — superadmin only */}
      {isSuperadmin && (
        <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
          <label
            htmlFor="company-select"
            className="mb-1 block text-xs font-medium text-gray-400"
          >
            Компания
          </label>
          <select
            id="company-select"
            value={selectedCompanyId}
            onChange={(e) => {
              setSelectedCompanyId(e.target.value);
              setFilters((prev) => ({ ...prev, page: 1 }));
              setExpandedId(null);
            }}
            className={cn(selectClass, 'w-full sm:w-80')}
            aria-label="Выберите компанию"
          >
            <option value="">Выберите компанию</option>
            {companiesData?.results.map((company) => (
              <option key={company.id} value={String(company.id)}>
                {company.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Filters, table and pagination — only shown once a company is available */}
      {companyId && <><div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
        {actionError && (
          <div className="mb-3 rounded-lg border border-red-800 bg-red-950/50 px-3 py-2 text-sm text-red-300">
            {actionError}
          </div>
        )}
        {actionSuccess && (
          <div className="mb-3 rounded-lg border border-emerald-800 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-300">
            {actionSuccess}
          </div>
        )}
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
          {/* Search */}
          <div className="flex-1 min-w-48">
            <label htmlFor="member-search" className="mb-1 block text-xs font-medium text-gray-400">
              Поиск
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
                aria-hidden="true"
              />
              <input
                id="member-search"
                type="search"
                value={filters.search}
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value, page: 1 }))}
                placeholder="Имя или email…"
                className={cn(inputClass, 'pl-9')}
                aria-label="Поиск сотрудников по имени или email"
              />
            </div>
          </div>

          {/* Role filter */}
          <div>
            <label htmlFor="role-filter" className="mb-1 block text-xs font-medium text-gray-400">
              Роль
            </label>
            <select
              id="role-filter"
              value={filters.role}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  role: e.target.value as Filters['role'],
                  page: 1,
                }))
              }
              className={selectClass}
              aria-label="Фильтр по роли"
            >
              <option value="">Все роли</option>
              <option value="employee">Сотрудник</option>
              <option value="company_admin">Админ компании</option>
            </select>
          </div>

          {/* Active status filter */}
          <div>
            <label htmlFor="status-filter" className="mb-1 block text-xs font-medium text-gray-400">
              Статус
            </label>
            <select
              id="status-filter"
              value={filters.is_active}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  is_active: e.target.value as Filters['is_active'],
                  page: 1,
                }))
              }
              className={selectClass}
              aria-label="Фильтр по статусу активности"
            >
              <option value="">Все</option>
              <option value="true">Активные</option>
              <option value="false">Неактивные</option>
            </select>
          </div>
        </div>

        {/* Ordering */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-gray-400">Сортировка:</span>
          <OrderingButton
            field="full_name"
            label="По имени"
            current={{ field: filters.orderingField, dir: filters.orderingDir }}
            onChange={handleOrderingFieldChange}
          />
          <OrderingButton
            field="date_joined"
            label="По дате вступления"
            current={{ field: filters.orderingField, dir: filters.orderingDir }}
            onChange={handleOrderingFieldChange}
          />
          <OrderingButton
            field="last_login"
            label="По последнему входу"
            current={{ field: filters.orderingField, dir: filters.orderingDir }}
            onChange={handleOrderingFieldChange}
          />
        </div>
      </div>

      {/* Table */}
      <div
        className={cn(
          'overflow-hidden rounded-xl border border-gray-700 bg-gray-800 transition-opacity',
          isFetching && 'opacity-70',
        )}
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-sm text-gray-400">
            <Activity className="mr-2 h-5 w-5 animate-pulse" aria-hidden="true" />
            Загрузка сотрудников…
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center py-16 text-sm text-red-400">
            Не удалось загрузить список сотрудников. Попробуйте снова.
          </div>
        ) : !data?.results.length ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-sm text-gray-400">
            <User className="h-10 w-10 text-gray-600" aria-hidden="true" />
            <p>Сотрудники не найдены.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left" role="table" aria-label="Список сотрудников">
              <thead>
                <tr className="border-b border-gray-700">
                  <th
                    scope="col"
                    className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400"
                  >
                    Сотрудник
                  </th>
                  <th
                    scope="col"
                    className="hidden px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 sm:table-cell"
                  >
                    Роль
                  </th>
                  <th
                    scope="col"
                    className="hidden px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 md:table-cell"
                  >
                    Должность
                  </th>
                  <th
                    scope="col"
                    className="hidden px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 lg:table-cell"
                  >
                    Статус
                  </th>
                  <th
                    scope="col"
                    className="hidden px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 xl:table-cell"
                  >
                    Дата вступления
                  </th>
                  <th
                    scope="col"
                    className="hidden px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 xl:table-cell"
                  >
                    Последний вход
                  </th>
                  <th scope="col" className="px-4 py-3">
                    <span className="sr-only">Действия</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {data.results.map((member) => (
                  <MemberRow
                    key={member.id}
                    member={member}
                    companyId={companyId!}
                    isExpanded={expandedId === member.id}
                    onToggle={handleToggleExpand}
                    canManageMembers={canManageMembers}
                    isUpdating={isMemberActionPending}
                    onDeactivate={handleDeactivate}
                    onActivate={handleActivate}
                    onRemove={handleRemove}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          className="flex items-center justify-between text-sm text-gray-400"
          role="navigation"
          aria-label="Пагинация"
        >
          <span>
            Страница {filters.page} из {totalPages} ({data?.count ?? 0} записей)
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={filters.page <= 1}
              onClick={() => setFilters((prev) => ({ ...prev, page: prev.page - 1 }))}
              className={cn(
                'inline-flex items-center gap-1 rounded-lg border border-gray-700 px-3 py-1.5 text-sm transition-colors',
                filters.page <= 1
                  ? 'cursor-not-allowed opacity-40'
                  : 'hover:bg-gray-700 text-white',
              )}
              aria-label="Предыдущая страница"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              Назад
            </button>
            <button
              type="button"
              disabled={filters.page >= totalPages}
              onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
              className={cn(
                'inline-flex items-center gap-1 rounded-lg border border-gray-700 px-3 py-1.5 text-sm transition-colors',
                filters.page >= totalPages
                  ? 'cursor-not-allowed opacity-40'
                  : 'hover:bg-gray-700 text-white',
              )}
              aria-label="Следующая страница"
            >
              Вперёд
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
      </>}

      <ConfirmModal
        isOpen={deactivateTarget !== null}
        onClose={() => !deactivateMemberMutation.isPending && setDeactivateTarget(null)}
        onConfirm={() => {
          if (!companyId || !deactivateTarget) return;
          setActionSuccess(null);
          setActionError(null);
          deactivateMemberMutation.mutate(
            { currentCompanyId: companyId, memberId: deactivateTarget.id },
            { onSettled: () => setDeactivateTarget(null) },
          );
        }}
        title="Деактивировать пользователя?"
        description={
          deactivateTarget
            ? `Пользователь ${deactivateTarget.full_name} потеряет доступ к системе до повторной активации.`
            : ''
        }
        variant="warning"
        confirmLabel="Деактивировать"
        isLoading={deactivateMemberMutation.isPending}
      />

      <ConfirmModal
        isOpen={activateTarget !== null}
        onClose={() => !activateMemberMutation.isPending && setActivateTarget(null)}
        onConfirm={() => {
          if (!companyId || !activateTarget) return;
          setActionSuccess(null);
          setActionError(null);
          activateMemberMutation.mutate(
            { currentCompanyId: companyId, memberId: activateTarget.id },
            { onSettled: () => setActivateTarget(null) },
          );
        }}
        title="Активировать пользователя?"
        description={
          activateTarget
            ? `Пользователь ${activateTarget.full_name} снова сможет входить в систему.`
            : ''
        }
        variant="warning"
        confirmLabel="Активировать"
        isLoading={activateMemberMutation.isPending}
      />

      <ConfirmModal
        isOpen={removeConfirmTarget !== null}
        onClose={() => setRemoveConfirmTarget(null)}
        onConfirm={() => {
          if (!removeConfirmTarget) return;
          setRemoveConfirmTarget(null);
          setRemoveReassignTarget(removeConfirmTarget);
        }}
        title="Удалить из компании?"
        description={
          removeConfirmTarget
            ? `Сотрудник ${removeConfirmTarget.full_name} будет удалён из компании. Далее можно указать ID другого сотрудника для переназначения CRM-задач.`
            : ''
        }
        variant="danger"
        confirmLabel="Продолжить"
      />

      <PromptModal
        isOpen={removeReassignTarget !== null}
        onClose={() => !removeMemberMutation.isPending && setRemoveReassignTarget(null)}
        onConfirm={(raw) => {
          if (!companyId || !removeReassignTarget) return;
          const reassignTo = raw.trim() ? raw.trim() : undefined;
          setActionSuccess(null);
          setActionError(null);
          removeMemberMutation.mutate(
            {
              currentCompanyId: companyId,
              memberId: removeReassignTarget.id,
              reassignTo,
            },
            { onSettled: () => setRemoveReassignTarget(null) },
          );
        }}
        title="Переназначение задач CRM"
        description="Укажите числовой ID сотрудника компании, которому передать задачи текущего пользователя. Оставьте поле пустым, чтобы снять исполнителя с задач."
        label="ID сотрудника (необязательно)"
        defaultValue=""
        placeholder="например, 42"
        confirmLabel="Удалить из компании"
        isLoading={removeMemberMutation.isPending}
      />
    </div>
  );
}
