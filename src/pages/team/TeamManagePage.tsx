import { useState, useEffect, useCallback, memo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
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
  Shield,
  X,
  Mail,
  Phone,
  CalendarClock,
  Loader2,
  LayoutGrid,
  List,
} from 'lucide-react';
import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { USER_ROLES } from '@/shared/config/constants';
import { useAuth } from '@/shared/hooks/useAuth';
import i18n from '@/shared/lib/i18n';
import { dateLocaleTag } from '@/shared/lib/localeFormat';
import { getApiError } from '@/shared/lib/getApiError';
import { mapApiUser } from '@/shared/lib/mapUser';
import { companiesCacheRoot } from '@/shared/lib/companyQueryKeys';
import { cn } from '@/shared/lib/cn';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import { resolveMediaUrl } from '@/shared/lib/mediaUrl';
import type {
  Company,
  CompanyMember,
  CompanyDirectoryMember,
  CompanyDirectoryMemberProfile,
  MemberActionResponse,
  MemberActivity,
  PaginatedResponse,
} from '@/shared/types';

// ---------------------------------------------------------------------------
// Styles (matching CompanyMembersPage dark theme)
// ---------------------------------------------------------------------------
const inputClass =
  'w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary placeholder:text-muted focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20';

const selectClass =
  'rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20';

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
      className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white select-none"
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
  const { t } = useTranslation();
  const label =
    role === USER_ROLES.COMPANY_ADMIN
      ? t('team.roleAdmin')
      : role === USER_ROLES.EMPLOYEE
        ? t('team.roleEmployee')
        : role === USER_ROLES.SUPERADMIN
          ? t('team.roleSuper')
          : role;

  const colorClass =
    role === USER_ROLES.COMPANY_ADMIN
      ? 'bg-brand-subtle text-brand'
      : role === USER_ROLES.SUPERADMIN
        ? 'bg-purple-900/60 text-purple-300'
        : 'bg-hover text-secondary';

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

const StatusBadge = memo<StatusBadgeProps>(({ isActive }) => {
  const { t } = useTranslation();
  return (
  <span
    className={cn(
      'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
      isActive ? 'bg-success-subtle text-emerald-400' : 'bg-danger-subtle text-red-400',
    )}
    aria-label={isActive ? t('common.active') : t('common.inactive')}
  >
    {isActive ? (
      <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
    ) : (
      <XCircle className="h-3 w-3" aria-hidden="true" />
    )}
    {isActive ? t('common.active') : t('common.inactive')}
  </span>
);});

interface EmailVerifiedBadgeProps {
  isVerified: boolean;
}

const EmailVerifiedBadge = memo<EmailVerifiedBadgeProps>(({ isVerified }) => {
  const { t } = useTranslation();
  return (
  <span
    className={cn(
      'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
      isVerified ? 'bg-success-subtle text-emerald-400' : 'bg-warning-subtle text-warning',
    )}
    aria-label={isVerified ? t('common.verified') : t('common.notVerified')}
  >
    {isVerified ? (
      <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
    ) : (
      <XCircle className="h-3 w-3" aria-hidden="true" />
    )}
    {isVerified ? t('common.verified') : t('common.notVerified')}
  </span>
);});

// ---------------------------------------------------------------------------
// Activity panel
// ---------------------------------------------------------------------------

interface ActivityPanelProps {
  companyId: string;
  memberId: number;
}

const ActivityPanel = memo<ActivityPanelProps>(({ companyId, memberId }) => {
  const { t } = useTranslation();
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
      <div className="flex items-center gap-2 py-4 text-sm text-secondary">
        <Activity className="h-4 w-4 animate-pulse" aria-hidden="true" />{t('common.loading')}</div>
    );
  }

  if (isError || !data) {
    return (
      <p className="py-3 text-sm text-red-400">{t('team.activityLoadError')}</p>
    );
  }

  const stats: { icon: React.ReactNode; label: string; value: string | number }[] = [
    {
      icon: <LogIn className="h-4 w-4 text-brand" aria-hidden="true" />,
      label: t('common.lastLogin'),
      value: formatDate(data.last_login),
    },
    {
      icon: <ClipboardList className="h-4 w-4 text-amber-400" aria-hidden="true" />,
      label: t('common.activeTasks'),
      value: data.active_tasks_count,
    },
    {
      icon: <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-hidden="true" />,
      label: t('common.completedTasks'),
      value: data.completed_tasks_count,
    },
    {
      icon: <Calendar className="h-4 w-4 text-sky-400" aria-hidden="true" />,
      label: t('common.bookingsLast30'),
      value: data.bookings_last_30_days,
    },
  ];

  return (
    <div
      className="grid grid-cols-2 gap-3 sm:grid-cols-4"
      role="region"
      aria-label={t('common.employeeActivity')}
    >
      {stats.map((s) => (
        <div
          key={s.label}
          className="flex flex-col gap-1.5 rounded-lg bg-surface px-4 py-3 border border-default"
        >
          <div className="flex items-center gap-1.5 text-xs text-secondary">
            {s.icon}
            {s.label}
          </div>
          <span className="text-base font-semibold text-primary">{s.value}</span>
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
  isSuperadmin: boolean;
  isImpersonating: boolean;
  onBlock: (member: CompanyMember) => void;
  onImpersonate: (member: CompanyMember) => void;
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
  isSuperadmin,
  isImpersonating,
  onBlock,
  onImpersonate,
}) => {
  const { t } = useTranslation();
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
          isExpanded ? 'bg-hover/60' : 'hover:bg-hover/40',
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
              <p className="truncate text-sm font-medium text-primary">{member.full_name}</p>
              <p className="truncate text-xs text-secondary">{member.email}</p>
            </div>
          </div>
        </td>
        <td className="hidden px-4 py-3 sm:table-cell">
          <RoleBadge role={member.role} />
        </td>
        <td className="hidden px-4 py-3 text-sm text-secondary md:table-cell">
          {member.position || <span className="text-muted">—</span>}
        </td>
        <td className="hidden px-4 py-3 lg:table-cell">
          <StatusBadge isActive={member.is_active} />
        </td>
        <td className="hidden px-4 py-3 lg:table-cell">
          <EmailVerifiedBadge isVerified={member.is_email_verified} />
        </td>
        <td className="hidden px-4 py-3 text-xs text-secondary xl:table-cell">
          {formatDate(member.date_joined)}
        </td>
        <td className="hidden px-4 py-3 text-xs text-secondary xl:table-cell">
          {formatDate(member.last_login)}
        </td>
        <td className="px-4 py-3 text-right">
          {isExpanded ? (
            <ChevronUp className="ml-auto h-4 w-4 text-secondary" aria-hidden="true" />
          ) : (
            <ChevronDown className="ml-auto h-4 w-4 text-secondary" aria-hidden="true" />
          )}
        </td>
      </tr>
      {isExpanded && (
        <tr role="row">
          <td colSpan={8} className="bg-raised px-4 pb-4 pt-2">
            <div className="space-y-3">
              <ActivityPanel companyId={companyId} memberId={member.id} />
              {canManageMembers && (
                <div className="flex flex-wrap gap-2">
                  {member.is_active ? (
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => onDeactivate(member)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-amber-700 bg-warning-subtle px-3 py-1.5 text-xs font-medium text-warning hover:bg-warning-subtle disabled:opacity-60"
                    >
                      <UserX className="h-3.5 w-3.5" aria-hidden="true" />{t('common.deactivate')}</button>
                  ) : (
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => onActivate(member)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-700 bg-success-subtle px-3 py-1.5 text-xs font-medium text-success hover:bg-success-subtle disabled:opacity-60"
                    >
                      <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />{t('common.activate')}</button>
                  )}
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => onRemove(member)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 dark:border-red-800 bg-danger-subtle px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger-subtle disabled:opacity-60"
                  >
                    <UserMinus className="h-3.5 w-3.5" aria-hidden="true" />{t('common.removeFromCompany')}</button>
                </div>
              )}
              {isSuperadmin && member.role !== USER_ROLES.SUPERADMIN && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => onBlock(member)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium disabled:opacity-60',
                      member.is_active
                        ? 'border-red-800 bg-danger-subtle text-danger hover:bg-danger-subtle'
                        : 'border-emerald-700 bg-success-subtle text-success hover:bg-success-subtle',
                    )}
                  >
                    <Shield className="h-3.5 w-3.5" aria-hidden="true" />
                    {member.is_active ? 'Заблокировать' : 'Разблокировать'}
                  </button>
                  {!isImpersonating && (
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => onImpersonate(member)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-amber-700 bg-warning-subtle px-3 py-1.5 text-xs font-medium text-warning hover:bg-warning-subtle disabled:opacity-60"
                    >
                      <LogIn className="h-3.5 w-3.5" aria-hidden="true" />{t('common.impersonate')}</button>
                  )}
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
          ? 'bg-brand text-white'
          : 'border border-default bg-raised text-secondary hover:bg-hover',
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
// Directory tab (card grid view)
// ---------------------------------------------------------------------------

const DIR_PAGE_SIZE = 12;
const DIR_DEBOUNCE_MS = 350;

function roleLabelDir(role: string): string {
  if (role === USER_ROLES.COMPANY_ADMIN) return i18n.t('team.roleCompanyAdmin');
  if (role === USER_ROLES.EMPLOYEE) return i18n.t('team.roleEmployee');
  if (role === USER_ROLES.SUPERADMIN) return i18n.t('team.roleSuperadmin');
  if (role === USER_ROLES.GUEST) return i18n.t('team.roleGuest');
  return role;
}

function roleBadgeClassDir(role: string): string {
  if (role === USER_ROLES.COMPANY_ADMIN) return 'bg-brand-subtle text-brand';
  if (role === USER_ROLES.SUPERADMIN) return 'bg-purple-900/60 text-purple-300';
  if (role === USER_ROLES.GUEST) return 'bg-warning-subtle text-warning';
  return 'bg-hover text-secondary';
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(dateLocaleTag(i18n.language), {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface DirectoryTabProps {
  companyId: string;
}

function DirectoryTab({ companyId }: DirectoryTabProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [position, setPosition] = useState('');
  const [role, setRole] = useState('');
  const [ordering, setOrdering] = useState<'full_name' | '-full_name' | 'date_joined' | '-date_joined'>('full_name');
  const [page, setPage] = useState(1);
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, DIR_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setSelectedMemberId(null);
  }, [debouncedSearch, position, role, ordering, page]);

  const queryParams = {
    search: debouncedSearch || undefined,
    position: position || undefined,
    role: role || undefined,
    ordering,
    page,
    page_size: DIR_PAGE_SIZE,
  };

  const {
    data: directoryData,
    isLoading,
    isError,
    isFetching,
  } = useQuery<PaginatedResponse<CompanyDirectoryMember>>({
    queryKey: ['company-directory', companyId, queryParams],
    queryFn: () =>
      apiClient
        .get<PaginatedResponse<CompanyDirectoryMember>>(API.companies.directory(companyId), {
          params: queryParams,
        })
        .then((r) => r.data),
    placeholderData: (prev) => prev,
    staleTime: 15_000,
  });

  const {
    data: profileData,
    isLoading: isProfileLoading,
    isError: isProfileError,
  } = useQuery<CompanyDirectoryMemberProfile>({
    queryKey: ['company-directory-profile', companyId, selectedMemberId],
    queryFn: () =>
      apiClient
        .get<CompanyDirectoryMemberProfile>(
          API.companies.directoryProfile(companyId, String(selectedMemberId!)),
        )
        .then((r) => r.data),
    enabled: selectedMemberId !== null,
    staleTime: 30_000,
  });

  const members = directoryData?.results ?? [];
  const totalPages = directoryData ? Math.ceil(directoryData.count / DIR_PAGE_SIZE) : 0;

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="rounded-xl border border-default bg-raised p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex-1">
            <label htmlFor="dir-search" className="mb-1 block text-xs font-medium text-secondary">{t('common.search')}</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
              <input
                id="dir-search"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('common.nameOrEmail')}
                className={cn(inputClass, 'pl-9')}
              />
            </div>
          </div>
          <div>
            <label htmlFor="dir-position" className="mb-1 block text-xs font-medium text-secondary">{t('team.position')}</label>
            <input
              id="dir-position"
              type="text"
              value={position}
              onChange={(e) => { setPosition(e.target.value); setPage(1); }}
              placeholder={t('common.positionPlaceholder')}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="dir-role" className="mb-1 block text-xs font-medium text-secondary">{t('common.role')}</label>
            <select
              id="dir-role"
              value={role}
              onChange={(e) => { setRole(e.target.value); setPage(1); }}
              className={selectClass}
            >
              <option value="">{t('common.allRoles')}</option>
              <option value={USER_ROLES.EMPLOYEE}>{t('team.roleEmployee')}</option>
              <option value={USER_ROLES.COMPANY_ADMIN}>{t('team.roleCompanyAdmin')}</option>
              <option value={USER_ROLES.SUPERADMIN}>{t('team.roleSuperadmin')}</option>
              <option value={USER_ROLES.GUEST}>{t('team.roleGuest')}</option>
            </select>
          </div>
          <div>
            <label htmlFor="dir-ordering" className="mb-1 block text-xs font-medium text-secondary">{t('common.sort')}</label>
            <select
              id="dir-ordering"
              value={ordering}
              onChange={(e) => { setOrdering(e.target.value as typeof ordering); setPage(1); }}
              className={selectClass}
            >
              <option value="full_name">{t('team.directory.nameAsc')}</option>
              <option value="-full_name">{t('team.directory.nameDesc')}</option>
              <option value="-date_joined">{t('team.directory.newest')}</option>
              <option value="date_joined">{t('team.directory.oldest')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Cards */}
      <div className={cn('transition-opacity', isFetching && 'opacity-70')}>
        {isLoading ? (
          <div className="flex items-center gap-2 rounded-xl border border-default bg-raised p-6 text-secondary">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Загрузка сотрудников…
          </div>
        ) : isError ? (
          <div className="rounded-xl border border-default bg-danger-subtle p-6 text-sm text-danger">
            Не удалось загрузить список сотрудников.
          </div>
        ) : members.length === 0 ? (
          <div className="rounded-xl border border-default bg-raised p-6 text-sm text-secondary">
            По текущим фильтрам сотрудники не найдены.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {members.map((member) => (
              <button
                key={member.id}
                type="button"
                onClick={() => setSelectedMemberId(selectedMemberId === member.id ? null : member.id)}
                className={cn(
                  'rounded-xl border bg-raised p-4 text-left transition-colors',
                  selectedMemberId === member.id
                    ? 'border-blue-500'
                    : 'border-default hover:border-gray-500',
                )}
              >
                <div className="mb-3 flex items-start gap-3">
                  <Avatar src={member.avatar} fullName={member.full_name} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-primary">{member.full_name}</p>
                    {member.position && (
                      <p className="truncate text-xs text-secondary">{member.position}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5 text-xs text-secondary">
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden="true" />
                    <span className="truncate">{member.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden="true" />
                    <span>{member.phone || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1.5">
                    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', roleBadgeClassDir(member.role))}>
                      {roleLabelDir(member.role)}
                    </span>
                    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', member.is_active ? 'bg-success-subtle text-emerald-400' : 'bg-danger-subtle text-red-400')}>
                      {member.is_active ? 'Активен' : 'Неактивен'}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-secondary">
          <span>Страница {page} из {totalPages} ({directoryData?.count ?? 0} сотрудников)</span>
          <div className="flex gap-2">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
              className={cn('rounded-lg border border-default px-3 py-1.5', page <= 1 ? 'cursor-not-allowed opacity-50' : 'hover:bg-hover text-primary')}>{t('common.back')}</button>
            <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
              className={cn('rounded-lg border border-default px-3 py-1.5', page >= totalPages ? 'cursor-not-allowed opacity-50' : 'hover:bg-hover text-primary')}>
              Вперёд
            </button>
          </div>
        </div>
      )}

      {/* Profile panel */}
      {selectedMemberId && (
        <section className="rounded-xl border border-default bg-raised p-5">
          <h2 className="text-base font-semibold text-primary">Профиль сотрудника</h2>
          {isProfileLoading ? (
            <div className="mt-3 flex items-center gap-2 text-sm text-secondary">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />{t('common.loading')}</div>
          ) : isProfileError || !profileData ? (
            <p className="mt-3 text-sm text-danger">Не удалось загрузить профиль.</p>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="flex items-start gap-3">
                <Avatar src={profileData.avatar} fullName={profileData.full_name} />
                <div>
                  <p className="text-sm font-semibold text-primary">{profileData.full_name}</p>
                  {profileData.position && <p className="text-xs text-secondary">{profileData.position}</p>}
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-default bg-surface/50 p-3">
                  <p className="mb-1 text-xs text-muted">Email</p>
                  <p className="text-sm text-secondary">{profileData.email}</p>
                </div>
                <div className="rounded-lg border border-default bg-surface/50 p-3">
                  <p className="mb-1 text-xs text-muted">Телефон</p>
                  <p className="text-sm text-secondary">{profileData.phone || '—'}</p>
                </div>
                <div className="rounded-lg border border-default bg-surface/50 p-3">
                  <p className="mb-1 text-xs text-muted">Задачи</p>
                  <p className="text-sm text-secondary">{profileData.tasks_count}</p>
                </div>
                <div className="rounded-lg border border-default bg-surface/50 p-3">
                  <p className="mb-1 text-xs text-muted">Бронирования за 30 дней</p>
                  <p className="text-sm text-secondary">{profileData.bookings_last_30_days}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-secondary">
                <CalendarClock className="h-4 w-4" aria-hidden="true" />
                Последний вход: {formatDateTime(profileData.last_login)}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reassign member modal
// ---------------------------------------------------------------------------

interface ReassignMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reassignToId: string | undefined) => void;
  companyId: string;
  excludeMemberId: number;
  isLoading: boolean;
}

function ReassignMemberModal({
  isOpen,
  onClose,
  onConfirm,
  companyId,
  excludeMemberId,
  isLoading,
}: ReassignMemberModalProps) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [selectedId, setSelectedId] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSelectedId('');
      setSearch('');
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, isLoading, onClose]);

  const { data, isLoading: isFetching } = useQuery<PaginatedResponse<CompanyMember>>({
    queryKey: ['reassignCandidates', companyId],
    queryFn: () =>
      apiClient
        .get<PaginatedResponse<CompanyMember>>(API.companies.members(companyId), {
          params: { is_active: 'true', page_size: 200 },
        })
        .then((r) => r.data),
    enabled: isOpen,
    staleTime: 30_000,
  });

  const members = (data?.results ?? []).filter((m) => m.id !== excludeMemberId);
  const q = search.toLowerCase();
  const filtered = q
    ? members.filter(
        (m) =>
          m.full_name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q),
      )
    : members;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reassign-modal-title"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        aria-hidden="true"
        onClick={!isLoading ? onClose : undefined}
      />
      <div
        ref={dialogRef}
        className="relative w-full max-w-md rounded-2xl bg-surface shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-3">
          <div>
            <h2 id="reassign-modal-title" className="text-base font-semibold text-primary">{t('common.crmReassignTitle')}</h2>
            <p className="mt-1 text-sm text-muted">{t('common.crmReassignDesc')}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="ml-3 shrink-0 rounded-lg p-1 text-secondary hover:bg-hover disabled:pointer-events-none disabled:opacity-50"
            aria-label={t('common.close')}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 pb-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input
              ref={searchRef}
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('common.searchByNameEmail')}
              className="w-full rounded-lg border border-default bg-raised py-2 pl-9 pr-3 text-sm text-primary placeholder:text-muted focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Member list */}
        <div className="mx-6 mb-4 max-h-56 overflow-y-auto rounded-lg border border-default">
          {isFetching ? (
            <p className="py-6 text-center text-sm text-muted">{t('common.loading')}</p>
          ) : filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">{t('common.employeesNotFound')}</p>
          ) : (
            <ul role="listbox" aria-label={t('common.selectEmployee')}>
              {filtered.map((m) => {
                const isSelected = selectedId === String(m.id);
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => setSelectedId(isSelected ? '' : String(m.id))}
                      disabled={isLoading}
                      className={cn(
                        'flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors',
                        isSelected
                          ? 'bg-brand-subtle text-brand'
                          : 'text-primary hover:bg-hover',
                      )}
                    >
                      <Avatar src={m.avatar} fullName={m.full_name} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{m.full_name}</p>
                        <p className="truncate text-xs text-muted">{m.email}</p>
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 pb-6">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-lg border border-default bg-surface px-4 py-2 text-sm font-medium text-secondary hover:bg-raised disabled:pointer-events-none disabled:opacity-50"
          >{t('common.cancel')}</button>
          <button
            type="button"
            disabled={isLoading}
            onClick={() => onConfirm(selectedId || undefined)}
            className="inline-flex items-center gap-2 rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:pointer-events-none disabled:opacity-50"
          >
            {isLoading && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true" />
            )}
            Удалить из компании
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

const DEBOUNCE_MS = 350;

type ViewTab = 'manage' | 'directory';

export default function TeamManagePage() {
  const { t } = useTranslation();
  const { user, isImpersonating, startImpersonation } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isSuperadmin = user?.role === USER_ROLES.SUPERADMIN;
  const isCompanyAdmin = user?.role === USER_ROLES.COMPANY_ADMIN;
  const showTabs = isCompanyAdmin;
  const [view, setView] = useState<ViewTab>('manage');

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
  const [blockTarget, setBlockTarget] = useState<CompanyMember | null>(null);
  const [impersonateTarget, setImpersonateTarget] = useState<CompanyMember | null>(null);

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
    queryKey: [...companiesCacheRoot(user?.id), 'list'],
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
    onSuccess: async () => {
      setActionError(null);
      setActionSuccess('Сотрудник деактивирован.');
      await refreshMemberQueries();
    },
    onError: (error: unknown) => {
      setActionSuccess(null);
      setActionError(getApiError(error).message);
    },
  });

  const activateMemberMutation = useMutation({
    mutationFn: ({ currentCompanyId, memberId }: { currentCompanyId: string; memberId: number }) =>
      apiClient
        .post<MemberActionResponse>(API.companies.memberActivate(currentCompanyId, String(memberId)))
        .then((r) => r.data),
    onSuccess: async () => {
      setActionError(null);
      setActionSuccess('Сотрудник активирован.');
      await refreshMemberQueries();
    },
    onError: (error: unknown) => {
      setActionSuccess(null);
      setActionError(getApiError(error).message);
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
      setActionSuccess(`Сотрудник удалён из компании.${suffix}`);
      await refreshMemberQueries();
    },
    onError: (error: unknown) => {
      setActionSuccess(null);
      setActionError(getApiError(error).message);
    },
  });

  const blockUserMutation = useMutation({
    mutationFn: ({ memberId, shouldBlock }: { memberId: number; shouldBlock: boolean }) =>
      apiClient
        .post(shouldBlock ? API.users.block(memberId) : API.users.unblock(memberId))
        .then((r) => r.data),
    onSuccess: async (_, { shouldBlock }) => {
      setActionError(null);
      setActionSuccess(shouldBlock ? 'Пользователь заблокирован.' : 'Пользователь разблокирован.');
      await refreshMemberQueries();
    },
    onError: (error: unknown) => {
      setActionSuccess(null);
      setActionError(getApiError(error).message);
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
      navigate('/dashboard');
    },
    onError: (error: unknown) => {
      setActionSuccess(null);
      setActionError(getApiError(error).message);
      setImpersonateTarget(null);
    },
  });

  const isMemberActionPending =
    deactivateMemberMutation.isPending ||
    activateMemberMutation.isPending ||
    removeMemberMutation.isPending ||
    blockUserMutation.isPending ||
    impersonateMutation.isPending;

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

  const handleBlock = useCallback((member: CompanyMember) => {
    setBlockTarget(member);
  }, []);

  const handleImpersonate = useCallback((member: CompanyMember) => {
    setImpersonateTarget(member);
  }, []);

  const totalPages = data ? Math.ceil(data.count / PAGE_SIZE) : 0;

  if (!companyId && !isSuperadmin) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <User className="h-12 w-12 text-muted" aria-hidden="true" />
        <p className="text-sm text-secondary">Компания не найдена.</p>
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
        <h1 className="text-2xl font-bold text-primary">Сотрудники</h1>
        <p className="mt-1 text-sm text-secondary">
          {companyId && data && view === 'manage'
            ? `Всего: ${data.count} сотрудников`
            : isSuperadmin && !companyId
              ? 'Выберите компанию для просмотра сотрудников'
              : ' '}
        </p>
      </div>

      {/* Tab bar — company admin only */}
      {showTabs && (
        <div className="flex gap-1 rounded-xl border border-default bg-raised p-1 w-fit">
          <button
            type="button"
            onClick={() => setView('manage')}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              view === 'manage'
                ? 'bg-surface text-primary shadow-sm'
                : 'text-secondary hover:text-primary',
            )}
          >
            <List className="h-4 w-4" aria-hidden="true" />
            Управление
          </button>
          <button
            type="button"
            onClick={() => setView('directory')}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              view === 'directory'
                ? 'bg-surface text-primary shadow-sm'
                : 'text-secondary hover:text-primary',
            )}
          >
            <LayoutGrid className="h-4 w-4" aria-hidden="true" />
            Карточки
          </button>
        </div>
      )}

      {/* Company selector — superadmin only */}
      {isSuperadmin && (
        <div className="rounded-xl border border-default bg-raised p-4">
          <label
            htmlFor="company-select"
            className="mb-1 block text-xs font-medium text-secondary"
          >{t('common.company')}</label>
          <select
            id="company-select"
            value={selectedCompanyId}
            onChange={(e) => {
              setSelectedCompanyId(e.target.value);
              setFilters((prev) => ({ ...prev, page: 1 }));
              setExpandedId(null);
            }}
            className={cn(selectClass, 'w-full sm:w-80')}
            aria-label={t('common.selectCompany')}
          >
            <option value="">{t('common.selectCompany')}</option>
            {companiesData?.results.map((company) => (
              <option key={company.id} value={String(company.id)}>
                {company.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Directory card view */}
      {view === 'directory' && companyId && <DirectoryTab companyId={companyId} />}

      {/* Filters, table and pagination — only shown once a company is available */}
      {view === 'manage' && companyId && <><div className="rounded-xl border border-default bg-raised p-4">
        {actionError && (
          <div className="mb-3 rounded-lg border border-red-200 dark:border-red-800 bg-danger-subtle px-3 py-2 text-sm text-danger">
            {actionError}
          </div>
        )}
        {actionSuccess && (
          <div className="mb-3 rounded-lg border border-emerald-800 bg-success-subtle px-3 py-2 text-sm text-success">
            {actionSuccess}
          </div>
        )}
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
          {/* Search */}
          <div className="flex-1 min-w-48">
            <label htmlFor="member-search" className="mb-1 block text-xs font-medium text-secondary">{t('common.search')}</label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
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
            <label htmlFor="role-filter" className="mb-1 block text-xs font-medium text-secondary">{t('common.role')}</label>
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
              <option value="">{t('common.allRoles')}</option>
              <option value="employee">{t('team.roleEmployee')}</option>
              <option value="company_admin">{t('team.roleCompanyAdmin')}</option>
            </select>
          </div>

          {/* Active status filter */}
          <div>
            <label htmlFor="status-filter" className="mb-1 block text-xs font-medium text-secondary">{t('common.status')}</label>
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
              <option value="true">{t('passes.filters.active')}</option>
              <option value="false">Неактивные</option>
            </select>
          </div>
        </div>

        {/* Ordering */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-secondary">Сортировка:</span>
          <OrderingButton
            field="full_name"
            label={t('common.byName')}
            current={{ field: filters.orderingField, dir: filters.orderingDir }}
            onChange={handleOrderingFieldChange}
          />
          <OrderingButton
            field="date_joined"
            label={t('common.joinedAt')}
            current={{ field: filters.orderingField, dir: filters.orderingDir }}
            onChange={handleOrderingFieldChange}
          />
          <OrderingButton
            field="last_login"
            label={t('common.byLastLogin')}
            current={{ field: filters.orderingField, dir: filters.orderingDir }}
            onChange={handleOrderingFieldChange}
          />
        </div>
      </div>

      {/* Table */}
      <div
        className={cn(
          'overflow-hidden rounded-xl border border-default bg-raised transition-opacity',
          isFetching && 'opacity-70',
        )}
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-sm text-secondary">
            <Activity className="mr-2 h-5 w-5 animate-pulse" aria-hidden="true" />
            Загрузка сотрудников…
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center py-16 text-sm text-red-400">
            Не удалось загрузить список сотрудников. Попробуйте снова.
          </div>
        ) : !data?.results.length ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-sm text-secondary">
            <User className="h-10 w-10 text-muted" aria-hidden="true" />
            <p>Сотрудники не найдены.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left" role="table" aria-label={t('common.employeeList')}>
              <thead>
                <tr className="border-b border-default">
                  <th
                    scope="col"
                    className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-secondary"
                  >{t('team.roleEmployee')}</th>
                  <th
                    scope="col"
                    className="hidden px-4 py-3 text-xs font-semibold uppercase tracking-wider text-secondary sm:table-cell"
                  >{t('common.role')}</th>
                  <th
                    scope="col"
                    className="hidden px-4 py-3 text-xs font-semibold uppercase tracking-wider text-secondary md:table-cell"
                  >{t('team.position')}</th>
                  <th
                    scope="col"
                    className="hidden px-4 py-3 text-xs font-semibold uppercase tracking-wider text-secondary lg:table-cell"
                  >{t('common.status')}</th>
                  <th
                    scope="col"
                    className="hidden px-4 py-3 text-xs font-semibold uppercase tracking-wider text-secondary lg:table-cell"
                  >
                    Email
                  </th>
                  <th
                    scope="col"
                    className="hidden px-4 py-3 text-xs font-semibold uppercase tracking-wider text-secondary xl:table-cell"
                  >
                    Дата вступления
                  </th>
                  <th
                    scope="col"
                    className="hidden px-4 py-3 text-xs font-semibold uppercase tracking-wider text-secondary xl:table-cell"
                  >{t('common.lastLogin')}</th>
                  <th scope="col" className="px-4 py-3">
                    <span className="sr-only">Действия</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--border)]/50">
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
                    isSuperadmin={isSuperadmin}
                    isImpersonating={isImpersonating}
                    onBlock={handleBlock}
                    onImpersonate={handleImpersonate}
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
          className="flex items-center justify-between text-sm text-secondary"
          role="navigation"
          aria-label={t('common.pagination')}
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
                'inline-flex items-center gap-1 rounded-lg border border-default px-3 py-1.5 text-sm transition-colors',
                filters.page <= 1
                  ? 'cursor-not-allowed opacity-40'
                  : 'hover:bg-hover text-primary',
              )}
              aria-label={t('common.previousPage')}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />{t('common.back')}</button>
            <button
              type="button"
              disabled={filters.page >= totalPages}
              onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
              className={cn(
                'inline-flex items-center gap-1 rounded-lg border border-default px-3 py-1.5 text-sm transition-colors',
                filters.page >= totalPages
                  ? 'cursor-not-allowed opacity-40'
                  : 'hover:bg-hover text-primary',
              )}
              aria-label={t('common.nextPage')}
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
        confirmLabel={t('common.deactivate')}
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
        confirmLabel={t('common.activate')}
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
            ? `Сотрудник ${removeConfirmTarget.full_name} будет удалён из компании. Далее можно выбрать сотрудника для переназначения CRM-задач.`
            : ''
        }
        variant="danger"
        confirmLabel={t('common.continue')}
      />

      <ReassignMemberModal
        isOpen={removeReassignTarget !== null}
        onClose={() => !removeMemberMutation.isPending && setRemoveReassignTarget(null)}
        onConfirm={(reassignTo) => {
          if (!companyId || !removeReassignTarget) return;
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
        companyId={companyId ?? ''}
        excludeMemberId={removeReassignTarget?.id ?? 0}
        isLoading={removeMemberMutation.isPending}
      />

      <ConfirmModal
        isOpen={blockTarget !== null}
        onClose={() => !blockUserMutation.isPending && setBlockTarget(null)}
        onConfirm={() => {
          if (!blockTarget) return;
          setActionSuccess(null);
          setActionError(null);
          blockUserMutation.mutate(
            { memberId: blockTarget.id, shouldBlock: blockTarget.is_active },
            { onSettled: () => setBlockTarget(null) },
          );
        }}
        title={blockTarget?.is_active ? 'Заблокировать пользователя?' : 'Разблокировать пользователя?'}
        description={
          blockTarget
            ? blockTarget.is_active
              ? `Пользователь ${blockTarget.full_name} потеряет доступ к платформе.`
              : `Пользователь ${blockTarget.full_name} снова получит доступ к платформе.`
            : ''
        }
        variant={blockTarget?.is_active ? 'danger' : 'warning'}
        confirmLabel={blockTarget?.is_active ? 'Заблокировать' : 'Разблокировать'}
        isLoading={blockUserMutation.isPending}
      />

      <ConfirmModal
        isOpen={impersonateTarget !== null}
        onClose={() => !impersonateMutation.isPending && setImpersonateTarget(null)}
        onConfirm={() => {
          if (!impersonateTarget) return;
          setActionSuccess(null);
          setActionError(null);
          impersonateMutation.mutate(impersonateTarget.id);
        }}
        title="Войти от имени пользователя?"
        description={
          impersonateTarget
            ? `Вы войдёте в систему от имени ${impersonateTarget.full_name}. Все действия будут выполняться от его имени.`
            : ''
        }
        variant="warning"
        confirmLabel={t('common.impersonate')}
        isLoading={impersonateMutation.isPending}
      />
    </div>
  );
}
