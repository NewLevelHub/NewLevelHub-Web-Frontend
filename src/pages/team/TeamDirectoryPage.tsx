import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { CalendarClock, CheckCircle2, Loader2, Mail, Phone, Search, User } from 'lucide-react';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { USER_ROLES } from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';
import { resolveMediaUrl } from '@/shared/lib/mediaUrl';
import { useAuth } from '@/shared/hooks/useAuth';
import i18n from '@/shared/lib/i18n';
import { dateLocaleTag } from '@/shared/lib/localeFormat';
import { companiesCacheRoot } from '@/shared/lib/companyQueryKeys';
import type {
  Company,
  CompanyDirectoryMember,
  CompanyDirectoryMemberProfile,
  PaginatedResponse,
} from '@/shared/types';

const inputClass =
  'w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary placeholder:text-muted focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20';

const selectClass =
  'rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20';

const PAGE_SIZE = 12;
const SEARCH_DEBOUNCE_MS = 350;

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(dateLocaleTag(i18n.language), {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getInitials(fullName: string) {
  return fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function roleLabel(role: string) {
  if (role === USER_ROLES.COMPANY_ADMIN) return i18n.t('team.roleCompanyAdmin');
  if (role === USER_ROLES.EMPLOYEE) return i18n.t('team.roleEmployee');
  if (role === USER_ROLES.SUPERADMIN) return i18n.t('team.roleSuperadmin');
  if (role === USER_ROLES.GUEST) return i18n.t('team.roleGuest');
  return role;
}

function roleBadgeClass(role: string) {
  if (role === USER_ROLES.COMPANY_ADMIN) return 'bg-brand-subtle text-brand';
  if (role === USER_ROLES.SUPERADMIN) return 'bg-purple-900/60 text-purple-300';
  if (role === USER_ROLES.GUEST) return 'bg-warning-subtle text-warning';
  return 'bg-hover text-secondary';
}

function MemberAvatar({ src, fullName }: { src: string | null; fullName: string }) {
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
        className="h-11 w-11 rounded-full object-cover"
        onError={() => setHasError(true)}
      />
    );
  }
  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">
      {getInitials(fullName)}
    </div>
  );
}

export default function TeamDirectoryPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isSuperadmin = user?.role === USER_ROLES.SUPERADMIN;

  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [position, setPosition] = useState('');
  const [role, setRole] = useState('');
  const [ordering, setOrdering] = useState<'full_name' | '-full_name' | 'date_joined' | '-date_joined'>(
    'full_name',
  );
  const [page, setPage] = useState(1);
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [search]);

  const companyId = isSuperadmin
    ? selectedCompanyId || null
    : user?.company_id != null
      ? String(user.company_id)
      : null;

  const { data: companiesData } = useQuery<PaginatedResponse<Company>>({
    queryKey: [...companiesCacheRoot(user?.id), 'directory-selector'],
    queryFn: () => apiClient.get<PaginatedResponse<Company>>(API.companies.list).then((r) => r.data),
    enabled: isSuperadmin,
    staleTime: 60_000,
  });

  const queryParams = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      position: position || undefined,
      role: role || undefined,
      ordering,
      page,
      page_size: PAGE_SIZE,
    }),
    [debouncedSearch, ordering, page, position, role],
  );

  const {
    data: directoryData,
    isLoading: isDirectoryLoading,
    isError: isDirectoryError,
    isFetching: isDirectoryFetching,
  } = useQuery<PaginatedResponse<CompanyDirectoryMember>>({
    queryKey: ['company-directory', companyId, queryParams],
    queryFn: () =>
      apiClient
        .get<PaginatedResponse<CompanyDirectoryMember>>(API.companies.directory(companyId!), {
          params: queryParams,
        })
        .then((r) => r.data),
    enabled: companyId !== null,
    placeholderData: (prev) => prev,
    staleTime: 15_000,
  });

  useEffect(() => {
    setSelectedMemberId(null);
  }, [companyId, debouncedSearch, position, role, ordering, page]);

  const {
    data: profileData,
    isLoading: isProfileLoading,
    isError: isProfileError,
  } = useQuery<CompanyDirectoryMemberProfile>({
    queryKey: ['company-directory-profile', companyId, selectedMemberId],
    queryFn: () =>
      apiClient
        .get<CompanyDirectoryMemberProfile>(
          API.companies.directoryProfile(companyId!, String(selectedMemberId!)),
        )
        .then((r) => r.data),
    enabled: companyId !== null && selectedMemberId !== null,
    staleTime: 30_000,
  });

  const members = directoryData?.results ?? [];
  const totalPages = directoryData ? Math.ceil(directoryData.count / PAGE_SIZE) : 0;

  if (!companyId && !isSuperadmin) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <User className="h-12 w-12 text-muted" aria-hidden="true" />
        <p className="text-sm text-secondary">{t('team.companyNotFound')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">{t('team.title')}</h1>
        <p className="mt-1 text-sm text-secondary">
          {t('team.directorySubtitle')}
        </p>
      </div>

      {isSuperadmin && (
        <div className="rounded-xl border border-default bg-raised p-4">
          <label htmlFor="company-select" className="mb-1 block text-xs font-medium text-secondary">{t('common.company')}</label>
          <select
            id="company-select"
            value={selectedCompanyId}
            onChange={(e) => {
              setSelectedCompanyId(e.target.value);
              setPage(1);
            }}
            className={cn(selectClass, 'w-full sm:w-80')}
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

      {companyId && (
        <>
          <div className="rounded-xl border border-default bg-raised p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-end">
              <div className="flex-1">
                <label htmlFor="directory-search" className="mb-1 block text-xs font-medium text-secondary">{t('common.search')}</label>
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                    aria-hidden="true"
                  />
                  <input
                    id="directory-search"
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t('common.nameOrEmail')}
                    className={cn(inputClass, 'pl-9')}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="directory-position" className="mb-1 block text-xs font-medium text-secondary">{t('team.position')}</label>
                <input
                  id="directory-position"
                  type="text"
                  value={position}
                  onChange={(e) => {
                    setPosition(e.target.value);
                    setPage(1);
                  }}
                  placeholder={t('common.positionPlaceholder')}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="directory-role" className="mb-1 block text-xs font-medium text-secondary">{t('common.role')}</label>
                <select
                  id="directory-role"
                  value={role}
                  onChange={(e) => {
                    setRole(e.target.value);
                    setPage(1);
                  }}
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
                <label htmlFor="directory-ordering" className="mb-1 block text-xs font-medium text-secondary">{t('common.sort')}</label>
                <select
                  id="directory-ordering"
                  value={ordering}
                  onChange={(e) => {
                    setOrdering(
                      e.target.value as 'full_name' | '-full_name' | 'date_joined' | '-date_joined',
                    );
                    setPage(1);
                  }}
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

          <div className={cn('transition-opacity', isDirectoryFetching && 'opacity-70')}>
            {isDirectoryLoading ? (
              <div className="flex items-center gap-2 rounded-xl border border-default bg-raised p-6 text-secondary">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Загрузка сотрудников...
              </div>
            ) : isDirectoryError ? (
              <div className="rounded-xl border border-red-200 dark:border-red-800 bg-danger-subtle p-6 text-sm text-danger">
                Не удалось загрузить справочник сотрудников.
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
                    onClick={() => setSelectedMemberId(member.id)}
                    className={cn(
                      'rounded-xl border bg-raised p-4 text-left transition-colors',
                      selectedMemberId === member.id
                        ? 'border-blue-500'
                        : 'border-default hover:border-gray-500',
                    )}
                  >
                    <div className="mb-3 flex items-start gap-3">
                      <MemberAvatar src={member.avatar} fullName={member.full_name} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-primary">{member.full_name}</p>
                        {member.position && (
                          <p className="truncate text-xs text-secondary">{member.position}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 text-xs text-secondary">
                      <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
                        <span className="truncate">{member.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
                        <span>{member.phone || '—'}</span>
                      </div>
                      <div className="flex items-center justify-between pt-2">
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-[11px] font-medium',
                            roleBadgeClass(member.role),
                          )}
                        >
                          {roleLabel(member.role)}
                        </span>
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-[11px] font-medium',
                            member.is_active
                              ? 'bg-success-subtle text-emerald-400'
                              : 'bg-danger-subtle text-red-400',
                          )}
                        >
                          {member.is_active ? 'Активен' : 'Неактивен'}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-secondary">
              <span>
                Страница {page} из {totalPages} ({directoryData?.count ?? 0} сотрудников)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className={cn(
                    'rounded-lg border border-default px-3 py-1.5',
                    page <= 1 ? 'cursor-not-allowed opacity-50' : 'hover:bg-hover text-primary',
                  )}
                >{t('common.back')}</button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className={cn(
                    'rounded-lg border border-default px-3 py-1.5',
                    page >= totalPages ? 'cursor-not-allowed opacity-50' : 'hover:bg-hover text-primary',
                  )}
                >
                  Вперед
                </button>
              </div>
            </div>
          )}

          {selectedMemberId && (
            <section className="rounded-xl border border-default bg-raised p-5">
              <h2 className="text-lg font-semibold text-primary">Профиль сотрудника</h2>
              {isProfileLoading ? (
                <div className="mt-3 flex items-center gap-2 text-sm text-secondary">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Загрузка профиля...
                </div>
              ) : isProfileError || !profileData ? (
                <p className="mt-3 text-sm text-danger">Не удалось загрузить профиль сотрудника.</p>
              ) : (
                <div className="mt-4 space-y-4">
                  <div className="flex items-start gap-3">
                    <MemberAvatar src={profileData.avatar} fullName={profileData.full_name} />
                    <div>
                      <p className="text-base font-semibold text-primary">{profileData.full_name}</p>
                      {profileData.position && (
                        <p className="text-sm text-secondary">{profileData.position}</p>
                      )}
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
                    {t('team.lastLogin')}: {formatDate(profileData.last_login)}
                  </div>
                  <div className="inline-flex items-center gap-1 text-xs text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    {profileData.is_active ? 'Профиль активен' : 'Профиль неактивен'}
                  </div>
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
