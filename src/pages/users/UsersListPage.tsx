import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { Search, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { USER_ROLES } from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';
import { resolveMediaUrl } from '@/shared/lib/mediaUrl';
import type { Company, UserListItem, PaginatedResponse } from '@/shared/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 20;

const ROLE_LABELS: Record<string, string> = {
  [USER_ROLES.SUPERADMIN]: 'Суперадмин',
  [USER_ROLES.COMPANY_ADMIN]: 'Администратор компании',
  [USER_ROLES.EMPLOYEE]: 'Сотрудник',
  [USER_ROLES.GUEST]: 'Гость',
};

const ROLE_BADGE_COLORS: Record<string, string> = {
  [USER_ROLES.SUPERADMIN]: 'bg-purple-100 text-purple-800',
  [USER_ROLES.COMPANY_ADMIN]: 'bg-blue-100 text-blue-800',
  [USER_ROLES.EMPLOYEE]: 'bg-green-100 text-green-800',
  [USER_ROLES.GUEST]: 'bg-gray-100 text-gray-700',
};

const ROLE_FILTER_OPTIONS = [
  { value: '', label: 'Все роли' },
  { value: USER_ROLES.SUPERADMIN, label: 'Суперадмин' },
  { value: USER_ROLES.COMPANY_ADMIN, label: 'Администратор компании' },
  { value: USER_ROLES.EMPLOYEE, label: 'Сотрудник' },
  { value: USER_ROLES.GUEST, label: 'Гость' },
];

const ACTIVE_FILTER_OPTIONS = [
  { value: '', label: 'Любой статус' },
  { value: 'true', label: 'Активные' },
  { value: 'false', label: 'Неактивные' },
];

const ORDERING_OPTIONS = [
  { value: '-date_joined', label: 'По дате регистрации ↓' },
  { value: 'date_joined', label: 'По дате регистрации ↑' },
  { value: '-last_login', label: 'По последнему входу ↓' },
  { value: 'last_login', label: 'По последнему входу ↑' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

function getInitials(firstName: string, lastName: string): string {
  const f = firstName.trim()[0] ?? '';
  const l = lastName.trim()[0] ?? '';
  return (f + l).toUpperCase() || '?';
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface UserAvatarProps {
  src: string | null;
  firstName: string;
  lastName: string;
}

function UserAvatar({ src, firstName, lastName }: UserAvatarProps) {
  const initials = getInitials(firstName, lastName);
  const avatarSrc = resolveMediaUrl(src) ?? src;

  if (avatarSrc) {
    return (
      <img
        src={avatarSrc}
        alt={`${firstName} ${lastName}`}
        className="w-10 h-10 rounded-full object-cover shrink-0"
      />
    );
  }

  return (
    <div
      className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center shrink-0"
      aria-label={`Аватар: ${initials}`}
    >
      <span className="text-white font-semibold text-sm select-none">{initials}</span>
    </div>
  );
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0" />
          <div className="w-32 h-4 rounded bg-gray-200" />
        </div>
      </td>
      <td className="px-4 py-3"><div className="w-44 h-4 rounded bg-gray-200" /></td>
      <td className="px-4 py-3"><div className="w-24 h-5 rounded-full bg-gray-200" /></td>
      <td className="px-4 py-3"><div className="w-28 h-4 rounded bg-gray-200" /></td>
      <td className="px-4 py-3"><div className="w-16 h-5 rounded-full bg-gray-200" /></td>
      <td className="px-4 py-3"><div className="w-24 h-4 rounded bg-gray-200" /></td>
      <td className="px-4 py-3"><div className="w-24 h-4 rounded bg-gray-200" /></td>
      <td className="px-4 py-3"><div className="w-12 h-8 rounded-lg bg-gray-200" /></td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function UsersListPage() {
  const navigate = useNavigate();

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [isActive, setIsActive] = useState('');
  const [ordering, setOrdering] = useState('-date_joined');
  const [page, setPage] = useState(1);

  // Debounce search input — 400ms
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setSearch(value);
      setPage(1);
    }, 400);
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [role, companyId, isActive, ordering]);

  const queryParams: Record<string, string | number> = {
    page,
    page_size: PAGE_SIZE,
    ordering,
  };
  if (search) queryParams.search = search;
  if (role) queryParams.role = role;
  if (companyId) queryParams.company_id = companyId;
  if (isActive !== '') queryParams.is_active = isActive;

  const { data: companies } = useQuery<Company[]>({
    queryKey: ['companies'],
    queryFn: () =>
      apiClient
        .get<Company[] | { results: Company[] }>(API.companies.list)
        .then((r) => (Array.isArray(r.data) ? r.data : r.data.results)),
  });

  const { data, isLoading, isError } = useQuery<PaginatedResponse<UserListItem>>({
    queryKey: ['users', { search, role, companyId, isActive, ordering, page }],
    queryFn: () =>
      apiClient
        .get<PaginatedResponse<UserListItem>>(API.users.list, { params: queryParams })
        .then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const totalCount = data?.count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const rangeStart = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, totalCount);

  function handleRowClick(id: number) {
    navigate(`/admin/users/${id}`);
  }

  function handleRowKeyDown(e: React.KeyboardEvent, id: number) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      navigate(`/admin/users/${id}`);
    }
  }

  return (
    <main className="px-3 py-4 sm:px-4 sm:py-6 md:py-8 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Пользователи</h1>

      {/* ---- Filters ---- */}
      <section
        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4"
        aria-label="Фильтры пользователей"
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
              placeholder="Поиск по имени или email..."
              aria-label="Поиск пользователей"
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Role filter */}
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            aria-label="Фильтр по роли"
            className="w-full sm:w-auto px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {ROLE_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Company filter */}
          <select
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            aria-label="Фильтр по компании"
            className="w-full sm:w-48 px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Все компании</option>
            {companies?.map((company) => (
              <option key={company.id} value={String(company.id)}>
                {company.name}
              </option>
            ))}
          </select>

          {/* Active status filter */}
          <select
            value={isActive}
            onChange={(e) => setIsActive(e.target.value)}
            aria-label="Фильтр по статусу"
            className="w-full sm:w-auto px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {ACTIVE_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Ordering */}
          <select
            value={ordering}
            onChange={(e) => setOrdering(e.target.value)}
            aria-label="Сортировка"
            className="w-full sm:w-auto px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {ORDERING_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* ---- Table ---- */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isError ? (
          <div className="flex items-center justify-center py-16 px-4">
            <p className="text-red-600 font-medium text-sm">
              Не удалось загрузить список пользователей. Попробуйте перезагрузить страницу.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm" role="table" aria-label="Список пользователей">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide"
                  >
                    Пользователь
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide"
                  >
                    Email
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide"
                  >
                    Роль
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide"
                  >
                    Компания
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide"
                  >
                    Статус
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide"
                  >
                    Дата регистрации
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide"
                  >
                    Последний вход
                  </th>
                  <th scope="col" className="px-4 py-3">
                    <span className="sr-only">Действия</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
                ) : data?.results.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-gray-400 text-sm">
                      Пользователи не найдены
                    </td>
                  </tr>
                ) : (
                  data?.results.map((user) => (
                    <tr
                      key={user.id}
                      onClick={() => handleRowClick(user.id)}
                      onKeyDown={(e) => handleRowKeyDown(e, user.id)}
                      tabIndex={0}
                      role="row"
                      aria-label={`Пользователь ${user.first_name} ${user.last_name}`}
                      className="hover:bg-gray-50 cursor-pointer transition-colors focus-visible:outline-none focus-visible:bg-blue-50"
                    >
                      {/* Avatar + Name */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            src={user.avatar}
                            firstName={user.first_name}
                            lastName={user.last_name}
                          />
                          <span className="font-medium text-gray-900 whitespace-nowrap">
                            {user.first_name} {user.last_name}
                          </span>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{user.email}</td>

                      {/* Role badge */}
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-block text-xs font-medium px-2.5 py-0.5 rounded-full whitespace-nowrap',
                            ROLE_BADGE_COLORS[user.role] ?? 'bg-gray-100 text-gray-700',
                          )}
                        >
                          {ROLE_LABELS[user.role] ?? user.role}
                        </span>
                      </td>

                      {/* Company */}
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {user.company?.name ?? '—'}
                      </td>

                      {/* Active badge */}
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-block text-xs font-medium px-2.5 py-0.5 rounded-full whitespace-nowrap',
                            user.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-700',
                          )}
                        >
                          {user.is_active ? 'Активен' : 'Неактивен'}
                        </span>
                      </td>

                      {/* Date joined */}
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {formatDate(user.date_joined)}
                      </td>

                      {/* Last login */}
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {formatDate(user.last_login)}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/admin/users/${user.id}`);
                          }}
                          aria-label={`Открыть профиль ${user.first_name} ${user.last_name}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        >
                          <ExternalLink size={13} aria-hidden="true" />
                          Открыть
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ---- Pagination ---- */}
      {!isLoading && !isError && totalCount > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-500">
            Показано{' '}
            <span className="font-medium text-gray-900">
              {rangeStart}–{rangeEnd}
            </span>{' '}
            из{' '}
            <span className="font-medium text-gray-900">{totalCount}</span> пользователей
          </p>

          <nav aria-label="Пагинация" className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              aria-label="Предыдущая страница"
              className={cn(
                'p-2 rounded-lg border text-gray-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                page === 1
                  ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                  : 'border-gray-300 hover:bg-gray-50',
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
                  <span key={`ellipsis-${idx}`} className="px-2 text-gray-400 text-sm select-none">
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
                      'w-9 h-9 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                      item === page
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 hover:bg-gray-100 border border-gray-300',
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
                'p-2 rounded-lg border text-gray-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                page === totalPages
                  ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                  : 'border-gray-300 hover:bg-gray-50',
              )}
            >
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </nav>
        </div>
      )}
    </main>
  );
}
