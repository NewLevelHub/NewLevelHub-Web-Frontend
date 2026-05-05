import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarClock, CheckCircle2, Loader2, Mail, Phone, Search, User } from 'lucide-react';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { USER_ROLES } from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';
import { resolveMediaUrl } from '@/shared/lib/mediaUrl';
import { useAuth } from '@/shared/hooks/useAuth';
import { companiesCacheRoot } from '@/shared/lib/companyQueryKeys';
import type {
  Company,
  CompanyDirectoryMember,
  CompanyDirectoryMemberProfile,
  PaginatedResponse,
} from '@/shared/types';

const inputClass =
  'w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';

const selectClass =
  'rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';

const PAGE_SIZE = 12;
const SEARCH_DEBOUNCE_MS = 350;

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('ru-RU', {
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
  if (role === USER_ROLES.COMPANY_ADMIN) return 'Админ компании';
  if (role === USER_ROLES.EMPLOYEE) return 'Сотрудник';
  if (role === USER_ROLES.SUPERADMIN) return 'Суперадмин';
  if (role === USER_ROLES.GUEST) return 'Гость';
  return role;
}

function roleBadgeClass(role: string) {
  if (role === USER_ROLES.COMPANY_ADMIN) return 'bg-indigo-900/60 text-indigo-300';
  if (role === USER_ROLES.SUPERADMIN) return 'bg-purple-900/60 text-purple-300';
  if (role === USER_ROLES.GUEST) return 'bg-amber-900/50 text-amber-300';
  return 'bg-gray-700 text-gray-300';
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
    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white">
      {getInitials(fullName)}
    </div>
  );
}

export default function TeamDirectoryPage() {
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
        <User className="h-12 w-12 text-gray-600" aria-hidden="true" />
        <p className="text-sm text-gray-400">Компания не найдена.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Команда</h1>
        <p className="mt-1 text-sm text-gray-400">
          Карточки сотрудников компании с быстрым переходом в профиль.
        </p>
      </div>

      {isSuperadmin && (
        <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
          <label htmlFor="company-select" className="mb-1 block text-xs font-medium text-gray-400">
            Компания
          </label>
          <select
            id="company-select"
            value={selectedCompanyId}
            onChange={(e) => {
              setSelectedCompanyId(e.target.value);
              setPage(1);
            }}
            className={cn(selectClass, 'w-full sm:w-80')}
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

      {companyId && (
        <>
          <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-end">
              <div className="flex-1">
                <label htmlFor="directory-search" className="mb-1 block text-xs font-medium text-gray-400">
                  Поиск
                </label>
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
                    aria-hidden="true"
                  />
                  <input
                    id="directory-search"
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Имя или email"
                    className={cn(inputClass, 'pl-9')}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="directory-position" className="mb-1 block text-xs font-medium text-gray-400">
                  Должность
                </label>
                <input
                  id="directory-position"
                  type="text"
                  value={position}
                  onChange={(e) => {
                    setPosition(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Например: Designer"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="directory-role" className="mb-1 block text-xs font-medium text-gray-400">
                  Роль
                </label>
                <select
                  id="directory-role"
                  value={role}
                  onChange={(e) => {
                    setRole(e.target.value);
                    setPage(1);
                  }}
                  className={selectClass}
                >
                  <option value="">Все роли</option>
                  <option value={USER_ROLES.EMPLOYEE}>Сотрудник</option>
                  <option value={USER_ROLES.COMPANY_ADMIN}>Админ компании</option>
                  <option value={USER_ROLES.SUPERADMIN}>Суперадмин</option>
                  <option value={USER_ROLES.GUEST}>Гость</option>
                </select>
              </div>

              <div>
                <label htmlFor="directory-ordering" className="mb-1 block text-xs font-medium text-gray-400">
                  Сортировка
                </label>
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
                  <option value="full_name">Имя (А-Я)</option>
                  <option value="-full_name">Имя (Я-А)</option>
                  <option value="-date_joined">Новые сначала</option>
                  <option value="date_joined">Старые сначала</option>
                </select>
              </div>
            </div>
          </div>

          <div className={cn('transition-opacity', isDirectoryFetching && 'opacity-70')}>
            {isDirectoryLoading ? (
              <div className="flex items-center gap-2 rounded-xl border border-gray-700 bg-gray-800 p-6 text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Загрузка сотрудников...
              </div>
            ) : isDirectoryError ? (
              <div className="rounded-xl border border-red-800 bg-red-950/30 p-6 text-sm text-red-300">
                Не удалось загрузить справочник сотрудников.
              </div>
            ) : members.length === 0 ? (
              <div className="rounded-xl border border-gray-700 bg-gray-800 p-6 text-sm text-gray-400">
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
                      'rounded-xl border bg-gray-800 p-4 text-left transition-colors',
                      selectedMemberId === member.id
                        ? 'border-indigo-500'
                        : 'border-gray-700 hover:border-gray-500',
                    )}
                  >
                    <div className="mb-3 flex items-start gap-3">
                      <MemberAvatar src={member.avatar} fullName={member.full_name} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{member.full_name}</p>
                        <p className="truncate text-xs text-gray-400">{member.position || 'Без должности'}</p>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs text-gray-300">
                      <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-gray-500" aria-hidden="true" />
                        <span className="truncate">{member.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-gray-500" aria-hidden="true" />
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
                              ? 'bg-emerald-900/50 text-emerald-400'
                              : 'bg-red-900/50 text-red-400',
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
            <div className="flex items-center justify-between text-sm text-gray-400">
              <span>
                Страница {page} из {totalPages} ({directoryData?.count ?? 0} сотрудников)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className={cn(
                    'rounded-lg border border-gray-700 px-3 py-1.5',
                    page <= 1 ? 'cursor-not-allowed opacity-50' : 'hover:bg-gray-700 text-white',
                  )}
                >
                  Назад
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className={cn(
                    'rounded-lg border border-gray-700 px-3 py-1.5',
                    page >= totalPages ? 'cursor-not-allowed opacity-50' : 'hover:bg-gray-700 text-white',
                  )}
                >
                  Вперед
                </button>
              </div>
            </div>
          )}

          {selectedMemberId && (
            <section className="rounded-xl border border-gray-700 bg-gray-800 p-5">
              <h2 className="text-lg font-semibold text-white">Профиль сотрудника</h2>
              {isProfileLoading ? (
                <div className="mt-3 flex items-center gap-2 text-sm text-gray-400">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Загрузка профиля...
                </div>
              ) : isProfileError || !profileData ? (
                <p className="mt-3 text-sm text-red-300">Не удалось загрузить профиль сотрудника.</p>
              ) : (
                <div className="mt-4 space-y-4">
                  <div className="flex items-start gap-3">
                    <MemberAvatar src={profileData.avatar} fullName={profileData.full_name} />
                    <div>
                      <p className="text-base font-semibold text-white">{profileData.full_name}</p>
                      <p className="text-sm text-gray-400">{profileData.position || 'Без должности'}</p>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-3">
                      <p className="mb-1 text-xs text-gray-500">Email</p>
                      <p className="text-sm text-gray-200">{profileData.email}</p>
                    </div>
                    <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-3">
                      <p className="mb-1 text-xs text-gray-500">Телефон</p>
                      <p className="text-sm text-gray-200">{profileData.phone || '—'}</p>
                    </div>
                    <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-3">
                      <p className="mb-1 text-xs text-gray-500">Задачи</p>
                      <p className="text-sm text-gray-200">{profileData.tasks_count}</p>
                    </div>
                    <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-3">
                      <p className="mb-1 text-xs text-gray-500">Бронирования за 30 дней</p>
                      <p className="text-sm text-gray-200">{profileData.bookings_last_30_days}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <CalendarClock className="h-4 w-4" aria-hidden="true" />
                    Последний вход: {formatDate(profileData.last_login)}
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
