import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Users,
  CalendarCheck,
  ClipboardList,
  Bell,
  Megaphone,
  CheckSquare,
  BookOpen,
  Sparkles,
  ArrowRight,
  Clock,
  Armchair,
  LayoutGrid,
  UserCheck,
  FileText,
} from 'lucide-react';
import { useAuthStore } from '@/shared/store/auth';
import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { USER_ROLES } from '@/shared/config/constants';
import { getApiErrorMessage } from '@/shared/lib/apiError';
import { authPrimaryBtn } from '@/shared/ui/authFormStyles';
import { cn } from '@/shared/lib/cn';
import type {
  DashboardData,
  SuperadminDashboardData,
  CompanyAdminDashboardData,
  EmployeeDashboardData,
  GuestDashboardData,
  DashboardAnnouncementItem,
  OnboardingStatus,
  ServiceRequest,
  ServiceRequestCleaningPayload,
} from '@/shared/types';

// ─────────────────────────────────────────────────────────────────────────────
// Reusable primitives
// ─────────────────────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ComponentType<{ className?: string; size?: number }>;
  label: string;
  value: number | string;
  iconClass?: string;
  to?: string;
}

function StatCard({ icon: Icon, label, value, iconClass = 'text-indigo-400', to }: StatCardProps) {
  const inner = (
    <div className="flex items-center gap-4 rounded-xl border border-gray-800 bg-gray-900 p-5 transition-colors hover:border-gray-700">
      <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gray-800', iconClass.replace('text-', 'text-').replace('400', '900/40'))}>
        <Icon size={20} className={iconClass} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
      </div>
      {to && <ArrowRight size={14} className="ml-auto shrink-0 text-gray-600" />}
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : <>{inner}</>;
}

interface AnnouncementFeedProps {
  items: DashboardAnnouncementItem[];
  title?: string;
}

function AnnouncementFeed({ items, title = 'Объявления' }: AnnouncementFeedProps) {
  if (items.length === 0) return null;
  return (
    <section className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
          <Megaphone size={15} className="text-amber-400" />
          {title}
        </h2>
        <Link to="/announcements" className="text-xs text-indigo-400 hover:text-indigo-300">
          Все →
        </Link>
      </div>
      <ul className="space-y-3">
        {items.map((a) => (
          <li key={a.id} className="border-b border-gray-800 pb-3 last:border-0 last:pb-0">
            <p className="text-sm font-medium text-white">{a.title}</p>
            <p className="mt-0.5 line-clamp-2 text-xs text-gray-400">{a.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Role widgets
// ─────────────────────────────────────────────────────────────────────────────

const QUICK_ACTION_CONFIG: Record<string, { label: string; to: string }> = {
  invite_user: { label: 'Пригласить пользователя', to: '/companies' },
  create_announcement: { label: 'Создать объявление', to: '/announcements' },
  manage_bookings: { label: 'Управление бронями', to: '/bookings' },
  view_analytics: { label: 'Аналитика', to: '/admin/analytics' },
  manage_companies: { label: 'Компании', to: '/companies' },
};

function SuperadminWidgets({ data }: { data: SuperadminDashboardData }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={Building2}
          label="Компании"
          value={data.total_companies}
          iconClass="text-violet-400"
          to="/companies"
        />
        <StatCard
          icon={Users}
          label="Пользователи"
          value={data.total_users}
          iconClass="text-sky-400"
          to="/companies"
        />
        <StatCard
          icon={CalendarCheck}
          label="Брони сегодня"
          value={data.bookings_today}
          iconClass="text-emerald-400"
          to="/bookings"
        />
      </div>

      {/* Quick actions */}
      <section className="rounded-xl border border-gray-800 bg-gray-900 p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
          <LayoutGrid size={15} className="text-indigo-400" />
          Быстрые действия
        </h2>
        <div className="flex flex-wrap gap-2">
          {data.quick_actions.map((action) => {
            const cfg = QUICK_ACTION_CONFIG[action];
            if (!cfg) return null;
            return (
              <Link
                key={action}
                to={cfg.to}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-300 hover:border-indigo-700 hover:bg-indigo-900/20 hover:text-indigo-300"
              >
                {cfg.label}
              </Link>
            );
          })}
        </div>
      </section>

      {/* Recent events */}
      {data.recent_events.length > 0 && (
        <section className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
            <Clock size={15} className="text-gray-400" />
            Последние события
          </h2>
          <ul className="space-y-2">
            {data.recent_events.map((ev) => (
              <li key={ev.id} className="flex items-center justify-between gap-3 rounded-lg bg-gray-800/50 px-3 py-2.5">
                <span className="truncate text-sm text-gray-200">{ev.title}</span>
                <span className={cn(
                  'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
                  ev.status === 'confirmed' ? 'bg-emerald-900/40 text-emerald-300' : 'bg-gray-700 text-gray-400',
                )}>
                  {ev.status}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function CompanyAdminWidgets({ data }: { data: CompanyAdminDashboardData }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={Users}
          label="Сотрудники"
          value={data.employee_count}
          iconClass="text-sky-400"
          to="/team"
        />
        <StatCard
          icon={CheckSquare}
          label="Активные задачи"
          value={data.active_tasks}
          iconClass="text-violet-400"
          to="/crm"
        />
        <StatCard
          icon={CalendarCheck}
          label="Брони сегодня"
          value={data.bookings_today}
          iconClass="text-emerald-400"
          to="/bookings"
        />
      </div>

      {/* Pending approvals */}
      <section className="rounded-xl border border-gray-800 bg-gray-900 p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
          <UserCheck size={15} className="text-amber-400" />
          Ожидают подтверждения
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            to="/leave"
            className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 hover:border-amber-700/50"
          >
            <div className="flex items-center gap-3">
              <FileText size={16} className="text-amber-400" />
              <span className="text-sm text-gray-300">Заявки на отпуск</span>
            </div>
            <span className={cn(
              'rounded-full px-2.5 py-0.5 text-xs font-bold',
              data.pending_approvals.leaves > 0
                ? 'bg-amber-900/50 text-amber-200'
                : 'bg-gray-700 text-gray-400',
            )}>
              {data.pending_approvals.leaves}
            </span>
          </Link>
          <Link
            to="/passes"
            className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 hover:border-sky-700/50"
          >
            <div className="flex items-center gap-3">
              <BookOpen size={16} className="text-sky-400" />
              <span className="text-sm text-gray-300">Гостевые пропуска</span>
            </div>
            <span className={cn(
              'rounded-full px-2.5 py-0.5 text-xs font-bold',
              data.pending_approvals.guest_passes > 0
                ? 'bg-sky-900/50 text-sky-200'
                : 'bg-gray-700 text-gray-400',
            )}>
              {data.pending_approvals.guest_passes}
            </span>
          </Link>
        </div>
      </section>

      <AnnouncementFeed items={data.announcement_feed} />
    </div>
  );
}

function EmployeeWidgets({
  data,
  cleaningSection,
}: {
  data: EmployeeDashboardData;
  cleaningSection: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={ClipboardList}
          label="Задачи на сегодня"
          value={data.my_tasks_today}
          iconClass="text-violet-400"
          to="/crm"
        />
        <StatCard
          icon={CalendarCheck}
          label="Мои брони сегодня"
          value={data.my_bookings_today}
          iconClass="text-emerald-400"
          to="/bookings"
        />
        <StatCard
          icon={Bell}
          label="Непрочитанных уведомлений"
          value={data.unread_notifications_count}
          iconClass="text-amber-400"
          to="/notifications"
        />
      </div>

      {cleaningSection}

      <AnnouncementFeed items={data.announcement_feed} />
    </div>
  );
}

function GuestWidgets({ data }: { data: GuestDashboardData }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={CalendarCheck}
          label="Мои брони сегодня"
          value={data.my_bookings_today}
          iconClass="text-emerald-400"
          to="/bookings"
        />
        <StatCard
          icon={Armchair}
          label="Свободных столов"
          value={data.quick_booking.available_desks}
          iconClass="text-sky-400"
          to="/bookings"
        />
        <StatCard
          icon={LayoutGrid}
          label="Свободных переговорок"
          value={data.quick_booking.available_rooms}
          iconClass="text-violet-400"
          to="/bookings"
        />
      </div>

      <AnnouncementFeed items={data.bc_announcements} title="Объявления бизнес-центра" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const fetchMe = useAuthStore((s) => s.fetchMe);

  const requiresOnboarding =
    user?.role === USER_ROLES.COMPANY_ADMIN || user?.role === USER_ROLES.EMPLOYEE;

  const { data: onboardingProgress } = useQuery<OnboardingStatus>({
    queryKey: ['onboarding-progress'],
    queryFn: () => apiClient.get<OnboardingStatus>(API.onboarding.progress).then((r) => r.data),
    enabled: Boolean(user) && requiresOnboarding,
    retry: false,
  });

  useEffect(() => {
    if (requiresOnboarding && onboardingProgress && onboardingProgress.completed === false) {
      void navigate('/onboarding', { replace: true });
    }
  }, [requiresOnboarding, onboardingProgress, navigate]);

  const { data: dashboard, isLoading: dashLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: () => apiClient.get<DashboardData>(API.dashboard).then((r) => r.data),
    enabled: Boolean(user),
    staleTime: 60_000,
  });

  const [resendMsg, setResendMsg] = useState('');
  const [resendErr, setResendErr] = useState('');
  const [resendLoading, setResendLoading] = useState(false);

  const [cleaningSuccess, setCleaningSuccess] = useState(false);
  const [cleaningError, setCleaningError] = useState('');

  const cleaningMutation = useMutation({
    mutationFn: (payload: ServiceRequestCleaningPayload) =>
      apiClient.post<ServiceRequest>(API.serviceRequests.quickCleaning, payload).then((r) => r.data),
    onSuccess: async () => {
      setCleaningSuccess(true);
      setCleaningError('');
      await queryClient.invalidateQueries({ queryKey: ['service-requests'] });
    },
    onError: (err: unknown) => {
      setCleaningError(getApiErrorMessage(err, 'Не удалось создать заявку на уборку.'));
      setCleaningSuccess(false);
    },
  });

  async function handleResend() {
    setResendMsg('');
    setResendErr('');
    setResendLoading(true);
    try {
      await apiClient.post(API.auth.resendVerification);
      setResendMsg('Письмо отправлено. Проверь почту или логи бэкенда.');
    } catch (e) {
      setResendErr(getApiErrorMessage(e, 'Не удалось отправить'));
    } finally {
      setResendLoading(false);
    }
  }

  async function handleRefreshProfile() {
    try {
      await fetchMe();
    } catch {
      /* RequireAuth уведёт на логин */
    }
  }

  if (!user) {
    return <div className="text-gray-400">Загрузка профиля…</div>;
  }

  const isEmployee = user.role === USER_ROLES.EMPLOYEE;

  const cleaningSection = isEmployee ? (
    <div className="rounded-xl border border-gray-700 bg-gray-800 p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-900/40">
          <Sparkles className="h-5 w-5 text-sky-400" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-white">Нужна уборка?</h2>
          <p className="mt-0.5 text-xs text-gray-400">
            Этаж определится автоматически по последнему подтверждённому бронированию.
          </p>
          {cleaningSuccess && (
            <p className="mt-2 text-sm text-emerald-400">
              Заявка на уборку отправлена. Мы займёмся этим в ближайшее время.
            </p>
          )}
          {cleaningError && <p className="mt-2 text-sm text-rose-400">{cleaningError}</p>}
          <button
            type="button"
            disabled={cleaningMutation.isPending || cleaningSuccess}
            onClick={() => {
              setCleaningSuccess(false);
              setCleaningError('');
              cleaningMutation.mutate({});
            }}
            className="mt-3 inline-flex items-center rounded-lg border border-sky-700 bg-sky-900/30 px-4 py-2 text-sm font-medium text-sky-300 hover:bg-sky-900/50 disabled:opacity-50"
          >
            {cleaningMutation.isPending ? 'Отправляем...' : 'Вызвать уборку'}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  const roleLabel: Record<string, string> = {
    superadmin: 'Супер-администратор',
    company_admin: 'Администратор компании',
    employee: 'Сотрудник',
    reception: 'Ресепшен',
    guest: 'Гость',
  };

  return (
    <div className="max-w-4xl space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          Привет, {user.full_name.split(' ')[0]} 👋
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {roleLabel[user.role] ?? user.role}
          {user.company_name ? ` · ${user.company_name}` : ''}
        </p>
      </div>

      {/* Email verification banner */}
      {!user.is_email_verified && (
        <div className="rounded-xl border border-amber-800/50 bg-amber-950/20 p-5">
          <p className="text-sm font-medium text-amber-300">
            Email не подтверждён — часть функций недоступна
          </p>
          <p className="mt-1 text-xs text-amber-400/70">
            Открой ссылку из письма или отправь его снова.
          </p>
          {resendErr && <p className="mt-2 text-xs text-red-400">{resendErr}</p>}
          {resendMsg && <p className="mt-2 text-xs text-emerald-400">{resendMsg}</p>}
          <button
            type="button"
            disabled={resendLoading}
            onClick={handleResend}
            className={cn(authPrimaryBtn, 'mt-3 max-w-xs')}
          >
            {resendLoading ? 'Отправка…' : 'Отправить письмо повторно'}
          </button>
        </div>
      )}

      {/* Role-specific widgets */}
      {dashLoading && (
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl border border-gray-800 bg-gray-900" />
          ))}
        </div>
      )}

      {dashboard && (
        <>
          {dashboard.role === 'superadmin' && <SuperadminWidgets data={dashboard} />}
          {dashboard.role === 'company_admin' && <CompanyAdminWidgets data={dashboard} />}
          {dashboard.role === 'employee' && (
            <EmployeeWidgets data={dashboard} cleaningSection={cleaningSection} />
          )}
          {dashboard.role === 'guest' && <GuestWidgets data={dashboard} />}
        </>
      )}

      {/* Profile card + actions */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/80 p-6">
        <h2 className="mb-4 text-sm font-semibold text-gray-400">Профиль</h2>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-gray-500">Имя</dt>
            <dd className="font-medium text-white">{user.full_name}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Email</dt>
            <dd className="font-medium text-white">{user.email}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Роль</dt>
            <dd className="font-medium capitalize text-white">{roleLabel[user.role] ?? user.role}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Email подтверждён</dt>
            <dd>
              <span
                className={cn(
                  'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
                  user.is_email_verified
                    ? 'bg-green-900/50 text-green-300'
                    : 'bg-amber-900/50 text-amber-200',
                )}
              >
                {user.is_email_verified ? 'Да' : 'Нет'}
              </span>
            </dd>
          </div>
          {user.company_name && (
            <div className="sm:col-span-2">
              <dt className="text-gray-500">Компания</dt>
              <dd className="font-medium text-white">{user.company_name}</dd>
            </div>
          )}
        </dl>

        <div className="mt-6 flex flex-wrap gap-3 border-t border-gray-800 pt-6">
          <button
            type="button"
            onClick={handleRefreshProfile}
            className="rounded-lg border border-gray-600 px-4 py-2 text-sm text-white hover:bg-gray-800"
          >
            Обновить профиль
          </button>
          <button
            type="button"
            onClick={() => void logout()}
            className="rounded-lg border border-red-900/60 bg-red-950/30 px-4 py-2 text-sm text-red-200 hover:bg-red-950/50"
          >
            Выйти
          </button>
        </div>
      </div>
    </div>
  );
}
