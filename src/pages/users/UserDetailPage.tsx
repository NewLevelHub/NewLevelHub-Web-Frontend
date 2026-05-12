import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Mail,
  Phone,
  Building2,
  Briefcase,
  BadgeCheck,
  BadgeAlert,
  CalendarDays,
  LogIn,
  Bookmark,
  ListTodo,
  AlertTriangle,
  Shield,
} from 'lucide-react';
import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { SUPERADMIN_UI_PREFIX, USER_ROLES } from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';
import { mapApiUser } from '@/shared/lib/mapUser';
import { useAuth } from '@/shared/hooks/useAuth';
import { getApiErrorMessage } from '@/shared/lib/apiError';
import { resolveMediaUrl } from '@/shared/lib/mediaUrl';
import type { UserDetail } from '@/shared/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

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

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}.${month}.${year} ${hours}:${minutes}`;
}

function getInitials(firstName: string, lastName: string): string {
  const f = firstName.trim()[0] ?? '';
  const l = lastName.trim()[0] ?? '';
  return (f + l).toUpperCase() || '?';
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface LargeAvatarProps {
  src: string | null;
  firstName: string;
  lastName: string;
}

function LargeAvatar({ src, firstName, lastName }: LargeAvatarProps) {
  const initials = getInitials(firstName, lastName);
  const avatarSrc = resolveMediaUrl(src) ?? src;

  if (avatarSrc) {
    return (
      <img
        src={avatarSrc}
        alt={`${firstName} ${lastName}`}
        className="w-24 h-24 rounded-full object-cover ring-4 ring-white shadow-md shrink-0"
      />
    );
  }

  return (
    <div
      className="w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center ring-4 ring-white shadow-md shrink-0"
      aria-label={`Аватар: ${initials}`}
    >
      <span className="text-white font-bold text-3xl select-none">{initials}</span>
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
}

function StatCard({ icon, label, value }: StatCardProps) {
  return (
    <div className="bg-surface rounded-2xl border border-default shadow-sm p-5 flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 text-blue-600">
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-primary">{value}</p>
        <p className="text-sm text-muted">{label}</p>
      </div>
    </div>
  );
}

interface InfoRowProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}

function InfoRow({ icon, label, value }: InfoRowProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-secondary shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-muted mb-0.5">{label}</p>
        <p className="text-sm font-medium text-primary break-words">{value}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function DetailSkeleton() {
  return (
    <main className="px-3 py-4 sm:px-4 sm:py-6 md:py-8 max-w-4xl mx-auto space-y-6 animate-pulse">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 rounded-lg bg-gray-200" />
        <div className="w-40 h-4 rounded bg-gray-200" />
      </div>
      <div className="w-56 h-7 rounded bg-gray-200" />

      <div className="bg-surface rounded-2xl border border-default shadow-sm p-6">
        <div className="flex items-start gap-6">
          <div className="w-24 h-24 rounded-full bg-gray-200 shrink-0" />
          <div className="flex-1 space-y-3 pt-2">
            <div className="w-48 h-6 rounded bg-gray-200" />
            <div className="w-36 h-4 rounded bg-gray-200" />
            <div className="w-24 h-5 rounded-full bg-gray-200" />
          </div>
        </div>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-4 h-4 rounded bg-gray-200" />
              <div className="w-32 h-4 rounded bg-gray-200" />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="bg-surface rounded-2xl border border-default shadow-sm p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gray-200" />
              <div className="space-y-2">
                <div className="w-12 h-6 rounded bg-gray-200" />
                <div className="w-20 h-4 rounded bg-gray-200" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Impersonation panel
// ---------------------------------------------------------------------------

interface ImpersonatePanelProps {
  targetUser: UserDetail;
}

function ImpersonatePanel({ targetUser }: ImpersonatePanelProps) {
  const navigate = useNavigate();
  const { startImpersonation } = useAuth();
  const [showConfirm, setShowConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  interface ImpersonateResponse {
    access: string;
    refresh: string;
    user: Record<string, unknown>;
  }

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      apiClient
        .post<ImpersonateResponse>(API.users.impersonate(targetUser.id))
        .then((r) => r.data),
    onSuccess: (data) => {
      const mappedUser = mapApiUser(data.user);
      startImpersonation(mappedUser, data.access);
      navigate('/dashboard');
    },
    onError: (error: unknown) => {
      const axiosError = error as { response?: { status?: number } };
      if (axiosError?.response?.status === 400) {
        setErrorMessage('Нельзя войти от имени суперадмина');
      } else {
        setErrorMessage('Не удалось выполнить вход. Попробуйте ещё раз.');
      }
      setShowConfirm(false);
    },
  });

  function handleConfirm() {
    setErrorMessage(null);
    mutate();
  }

  return (
    <div>
      {errorMessage && (
        <div
          role="alert"
          className="mb-3 flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm"
        >
          <AlertTriangle size={15} className="shrink-0" aria-hidden="true" />
          {errorMessage}
        </div>
      )}

      {showConfirm ? (
        <div
          className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3"
          role="region"
          aria-label="Подтверждение входа от имени пользователя"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle
              size={16}
              className="text-amber-600 shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <p className="text-sm text-amber-900">
              Вы собираетесь войти от имени{' '}
              <strong>
                {targetUser.first_name} {targetUser.last_name}
              </strong>
              . Все ваши действия будут выполняться от его имени.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isPending}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500',
                isPending
                  ? 'bg-amber-300 text-amber-800 cursor-not-allowed'
                  : 'bg-amber-500 hover:bg-amber-600 text-white',
              )}
            >
              {isPending ? 'Вход...' : 'Подтвердить'}
            </button>
            <button
              type="button"
              onClick={() => setShowConfirm(false)}
              disabled={isPending}
              className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
            >
              Отмена
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setErrorMessage(null);
            setShowConfirm(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          aria-label={`Войти от имени ${targetUser.first_name} ${targetUser.last_name}`}
        >
          <LogIn size={15} aria-hidden="true" />
          Войти от имени
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user: currentUser, isImpersonating } = useAuth();
  const [statusError, setStatusError] = useState<string | null>(null);

  const { data: user, isLoading, isError } = useQuery<UserDetail>({
    queryKey: ['user', id],
    queryFn: () =>
      apiClient.get<UserDetail>(API.users.detail(Number(id))).then((r) => r.data),
    enabled: !!id,
  });

  const canImpersonate =
    !isImpersonating &&
    currentUser?.role === USER_ROLES.SUPERADMIN &&
    user?.role !== USER_ROLES.SUPERADMIN;
  const canToggleStatus =
    currentUser?.role === USER_ROLES.SUPERADMIN &&
    user?.role !== USER_ROLES.SUPERADMIN &&
    currentUser.id !== user?.id;

  const statusMutation = useMutation({
    mutationFn: (shouldBlock: boolean) => {
      if (!user) {
        throw new Error('User is not loaded');
      }
      return apiClient.post(shouldBlock ? API.users.block(user.id) : API.users.unblock(user.id));
    },
    onSuccess: async () => {
      setStatusError(null);
      await queryClient.invalidateQueries({ queryKey: ['user', id] });
      await queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error: unknown) => {
      setStatusError(getApiErrorMessage(error, 'Не удалось обновить статус пользователя.'));
    },
  });

  if (isLoading) {
    return <DetailSkeleton />;
  }

  if (isError || !user) {
    return (
      <main className="px-3 py-4 sm:px-4 sm:py-6 md:py-8 max-w-4xl mx-auto">
        <button
          type="button"
          onClick={() => navigate(`${SUPERADMIN_UI_PREFIX}/users`)}
          className="inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-primary mb-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Назад к списку
        </button>
        <p className="text-red-600 font-medium text-sm">
          Не удалось загрузить данные пользователя. Попробуйте перезагрузить страницу.
        </p>
      </main>
    );
  }

  const roleLabel = ROLE_LABELS[user.role] ?? user.role;
  const roleBadgeColor = ROLE_BADGE_COLORS[user.role] ?? 'bg-gray-100 text-gray-700';

  return (
    <main className="px-3 py-4 sm:px-4 sm:py-6 md:py-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <button
            type="button"
          onClick={() => navigate(`${SUPERADMIN_UI_PREFIX}/users`)}
            className="inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-primary mb-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
            aria-label="Назад к списку пользователей"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Назад к списку
          </button>
          <h1 className="text-2xl font-bold text-primary">
            {user.first_name} {user.last_name}
          </h1>
        </div>

        <div className="sm:pt-10 flex flex-col items-start gap-2">
          {canImpersonate && <ImpersonatePanel targetUser={user} />}
          {canToggleStatus && (
            <button
              type="button"
              onClick={() => {
                setStatusError(null);
                statusMutation.mutate(user.is_active);
              }}
              disabled={statusMutation.isPending}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2',
                user.is_active
                  ? 'bg-red-600 hover:bg-red-700 text-white focus-visible:ring-red-500'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white focus-visible:ring-emerald-500',
                statusMutation.isPending && 'opacity-60 cursor-not-allowed',
              )}
            >
              <Shield size={15} aria-hidden="true" />
              {statusMutation.isPending
                ? 'Обновление...'
                : user.is_active
                  ? 'Заблокировать'
                  : 'Разблокировать'}
            </button>
          )}
        </div>
      </div>

      {statusError && (
        <div
          role="alert"
          className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm"
        >
          <AlertTriangle size={15} className="shrink-0" aria-hidden="true" />
          {statusError}
        </div>
      )}

      {/* Profile card */}
      <section
        className="bg-surface rounded-2xl border border-default shadow-sm p-6 space-y-6"
        aria-label="Профиль пользователя"
      >
        {/* Avatar + name row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <LargeAvatar
            src={user.avatar}
            firstName={user.first_name}
            lastName={user.last_name}
          />
          <div className="space-y-2">
            <p className="text-xl font-semibold text-primary">
              {user.first_name} {user.last_name}
            </p>
            <p className="text-sm text-muted">{user.email}</p>
            <span
              className={cn(
                'inline-block text-xs font-medium px-2.5 py-0.5 rounded-full',
                roleBadgeColor,
              )}
            >
              {roleLabel}
            </span>
          </div>
        </div>

        {/* Status badges */}
        <div className="flex flex-wrap gap-2">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full',
              user.is_email_verified
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-amber-50 text-amber-700 border border-amber-200',
            )}
          >
            {user.is_email_verified ? (
              <BadgeCheck size={13} aria-hidden="true" />
            ) : (
              <BadgeAlert size={13} aria-hidden="true" />
            )}
            {user.is_email_verified ? 'Email подтверждён' : 'Email не подтверждён'}
          </span>

          <span
            className={cn(
              'inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full',
              user.is_active
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200',
            )}
          >
            {user.is_active ? 'Активен' : 'Неактивен'}
          </span>
        </div>

        {/* Info grid */}
        <dl
          className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-4"
          aria-label="Контактная информация"
        >
          <InfoRow
            icon={<Mail size={16} aria-hidden="true" />}
            label="Email"
            value={user.email}
          />

          {user.phone ? (
            <InfoRow
              icon={<Phone size={16} aria-hidden="true" />}
              label="Телефон"
              value={user.phone}
            />
          ) : (
            <InfoRow
              icon={<Phone size={16} aria-hidden="true" />}
              label="Телефон"
              value="—"
            />
          )}

          {user.company ? (
            <InfoRow
              icon={<Building2 size={16} aria-hidden="true" />}
              label="Компания"
              value={user.company.name}
            />
          ) : (
            <InfoRow
              icon={<Building2 size={16} aria-hidden="true" />}
              label="Компания"
              value="—"
            />
          )}

          <InfoRow
            icon={<Briefcase size={16} aria-hidden="true" />}
            label="Должность"
            value={user.position ?? '—'}
          />

          <InfoRow
            icon={<CalendarDays size={16} aria-hidden="true" />}
            label="Дата регистрации"
            value={formatDateTime(user.date_joined)}
          />

          <InfoRow
            icon={<LogIn size={16} aria-hidden="true" />}
            label="Последний вход"
            value={formatDateTime(user.last_login)}
          />
        </dl>
      </section>

      {/* Stats cards */}
      <section
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        aria-label="Статистика пользователя"
      >
        <StatCard
          icon={<Bookmark size={22} aria-hidden="true" />}
          label="Бронирований"
          value={user.bookings_count}
        />
        <StatCard
          icon={<ListTodo size={22} aria-hidden="true" />}
          label="Задач"
          value={user.tasks_count}
        />
      </section>

      {/* Date details */}
      <p className="text-xs text-secondary">
        Зарегистрирован: {formatDate(user.date_joined)} · Последний вход:{' '}
        {formatDate(user.last_login)}
      </p>
    </main>
  );
}
