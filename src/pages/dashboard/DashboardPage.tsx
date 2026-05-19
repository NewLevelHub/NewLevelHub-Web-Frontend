import { useEffect, useState, type ChangeEvent } from 'react';
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
import { STAFF_UI_PREFIX, SUPERADMIN_UI_PREFIX, USER_ROLES } from '@/shared/config/constants';
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

interface CompanyOnboardingStep {
  key: string;
  title: string;
  completed: boolean;
}

interface CompanyOnboardingStatus {
  completed: boolean;
  steps: CompanyOnboardingStep[];
}

const LOGO_MAX_BYTES = 10 * 1024 * 1024;

/** Локализация ключей шагов онбординга (приходят из бэкенда на английском). */
const ONBOARDING_STEP_LABELS: Record<string, string> = {
  upload_logo: 'Загрузить логотип компании',
  fill_description: 'Заполнить описание компании',
  create_first_board: 'Создать первую CRM-доску',
  invite_first_employee: 'Пригласить первого сотрудника',
};

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

function StatCard({ icon: Icon, label, value, iconClass = 'text-brand', to }: StatCardProps) {
  const inner = (
    <div className="flex items-center gap-4 rounded-xl border border-default bg-surface p-5 transition-colors hover:bg-hover">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-raised">
        <Icon size={20} className={iconClass} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs text-muted">{label}</p>
        <p className="text-2xl font-bold text-primary">{value}</p>
      </div>
      {to && <ArrowRight size={14} className="ml-auto shrink-0 text-subtle" />}
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
    <section className="rounded-xl border border-default bg-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-primary">
          <Megaphone size={15} className="text-amber-500" />
          {title}
        </h2>
        <Link to="/announcements" className="text-xs text-brand hover:text-brand-hover transition-colors">
          Все →
        </Link>
      </div>
      <ul className="space-y-3">
        {items.map((a) => (
          <li key={a.id} className="border-b border-default pb-3 last:border-0 last:pb-0">
            <p className="text-sm font-medium text-primary">{a.title}</p>
            <p className="mt-0.5 line-clamp-2 text-xs text-secondary">{a.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Role widgets
// ─────────────────────────────────────────────────────────────────────────────

const BOOKING_STATUS_LABEL: Record<string, string> = {
  confirmed: 'Подтверждено',
  checked_in: 'Заезд',
  completed: 'Завершено',
  cancelled: 'Отменено',
  no_show: 'Неявка',
};

const BOOKING_STATUS_CLASS: Record<string, string> = {
  confirmed: 'bg-success-subtle text-success-badge',
  checked_in: 'bg-blue-900/60 text-blue-300',
  completed: 'bg-blue-900/60 text-blue-300',
  cancelled: 'bg-rose-900/60 text-rose-300',
  no_show: 'bg-warning-subtle text-warning',
};

const QUICK_ACTION_CONFIG: Record<string, { label: string; to: string }> = {
  invite_user: { label: 'Пригласить пользователя', to: '/companies' },
  create_announcement: { label: 'Создать объявление', to: '/announcements' },
  manage_bookings: { label: 'Управление бронями', to: `${STAFF_UI_PREFIX}/bookings` },
  view_analytics: { label: 'Аналитика', to: `${SUPERADMIN_UI_PREFIX}/analytics` },
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
      <section className="rounded-xl border border-default bg-surface p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-primary">
          <LayoutGrid size={15} className="text-brand" />
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
                className="inline-flex items-center gap-1.5 rounded-lg border border-default bg-raised px-3 py-1.5 text-xs font-medium text-secondary hover:border-blue-300 hover:bg-brand-subtle hover:text-brand transition-colors"
              >
                {cfg.label}
              </Link>
            );
          })}
        </div>
      </section>

      {/* Recent events */}
      {data.recent_events.length > 0 && (
        <section className="rounded-xl border border-default bg-surface p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-primary">
            <Clock size={15} className="text-muted" />
            Последние события
          </h2>
          <ul className="space-y-2">
            {data.recent_events.map((ev) => (
              <li key={ev.id} className="flex items-center justify-between gap-3 rounded-lg bg-raised px-3 py-2.5">
                <span className="truncate text-sm text-primary">{ev.title}</span>
                <span className={cn(
                  'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
                  BOOKING_STATUS_CLASS[ev.status] ?? 'bg-hover text-muted',
                )}>
                  {BOOKING_STATUS_LABEL[ev.status] ?? ev.status}
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
      <section className="rounded-xl border border-default bg-surface p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-primary">
          <UserCheck size={15} className="text-amber-500" />
          Ожидают подтверждения
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            to="/leave"
            className="flex items-center justify-between rounded-lg border border-default bg-raised px-4 py-3 hover:bg-hover transition-colors"
          >
            <div className="flex items-center gap-3">
              <FileText size={16} className="text-amber-500" />
              <span className="text-sm text-secondary">Заявки на отпуск</span>
            </div>
            <span className={cn(
              'rounded-full px-2.5 py-0.5 text-xs font-bold',
              data.pending_approvals.leaves > 0
                ? 'bg-warning-subtle text-warning-badge'
                : 'bg-hover text-muted',
            )}>
              {data.pending_approvals.leaves}
            </span>
          </Link>
          <Link
            to="/passes"
            className="flex items-center justify-between rounded-lg border border-default bg-raised px-4 py-3 hover:bg-hover transition-colors"
          >
            <div className="flex items-center gap-3">
              <BookOpen size={16} className="text-blue-500" />
              <span className="text-sm text-secondary">Гостевые пропуска</span>
            </div>
            <span className={cn(
              'rounded-full px-2.5 py-0.5 text-xs font-bold',
              data.pending_approvals.guest_passes > 0
                ? 'bg-brand-subtle text-brand'
                : 'bg-hover text-muted',
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
          to="/crm/my-tasks"
        />
        <StatCard
          icon={CalendarCheck}
          label="Мои брони сегодня"
          value={data.my_bookings_today}
          iconClass="text-emerald-400"
          to="/bookings/my"
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

  const isCompanyAdmin = user?.role === USER_ROLES.COMPANY_ADMIN;
  const isEmployee = user?.role === USER_ROLES.EMPLOYEE;
  const companyId = user?.company_id != null ? String(user.company_id) : null;
  const requiresHrOnboarding = isEmployee;

  const { data: onboardingProgress } = useQuery<OnboardingStatus>({
    queryKey: ['hr-onboarding-progress'],
    queryFn: () => apiClient.get<OnboardingStatus>(API.onboarding.progress).then((r) => r.data),
    enabled: Boolean(user) && requiresHrOnboarding,
    retry: false,
  });

  const { data: companyOnboarding } = useQuery<CompanyOnboardingStatus>({
    queryKey: ['company-onboarding', companyId],
    queryFn: () =>
      apiClient
        .get<CompanyOnboardingStatus>(API.companies.onboardingStatus(companyId!))
        .then((r) => r.data),
    enabled: Boolean(user) && isCompanyAdmin && Boolean(companyId),
    retry: false,
  });

  useEffect(() => {
    if (requiresHrOnboarding && onboardingProgress && onboardingProgress.completed === false) {
      void navigate('/onboarding', { replace: true });
    }
  }, [requiresHrOnboarding, onboardingProgress, navigate]);

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
  const [logoUploadError, setLogoUploadError] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);

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

  const uploadLogoMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('logo', file);
      return apiClient.patch(API.companies.detail(companyId!), formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: async () => {
      setLogoUploadError('');
      setLogoFile(null);
      await queryClient.invalidateQueries({ queryKey: ['company-onboarding', companyId] });
      await queryClient.invalidateQueries({ queryKey: ['company', companyId] });
      await queryClient.invalidateQueries({ queryKey: ['companies'] });
      await fetchMe();
    },
    onError: (err: unknown) => {
      setLogoUploadError(getApiErrorMessage(err, 'Не удалось загрузить логотип компании.'));
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

  const uploadLogoStepPending = Boolean(
    isCompanyAdmin &&
    companyOnboarding?.steps.find((step) => step.key === 'upload_logo' && !step.completed),
  );

  function handleLogoSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploadError('');
    if (!file.type.startsWith('image/')) {
      setLogoFile(null);
      setLogoUploadError('Можно загрузить только изображение.');
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      setLogoFile(null);
      setLogoUploadError('Файл слишком большой. Максимум 10 МБ.');
      return;
    }
    setLogoFile(file);
  }

  if (!user) {
    return <div className="text-muted">Загрузка профиля…</div>;
  }

  const cleaningSection = isEmployee ? (
    <div className="rounded-xl border border-default bg-surface p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-raised">
          <Sparkles className="h-5 w-5 text-brand" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-primary">Нужна уборка?</h2>
          <p className="mt-0.5 text-xs text-secondary">
            Этаж определится автоматически по последнему подтверждённому бронированию.
          </p>
          {cleaningSuccess && (
            <p className="mt-2 text-sm text-success">
              Заявка на уборку отправлена. Мы займёмся этим в ближайшее время.
            </p>
          )}
          {cleaningError && <p className="mt-2 text-sm text-danger">{cleaningError}</p>}
          <button
            type="button"
            disabled={cleaningMutation.isPending || cleaningSuccess}
            onClick={() => {
              setCleaningSuccess(false);
              setCleaningError('');
              cleaningMutation.mutate({});
            }}
            className="mt-3 inline-flex items-center rounded-lg border border-default px-4 py-2 text-sm font-medium text-secondary hover:bg-hover hover:text-primary transition-colors disabled:opacity-50"
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
        <h1 className="text-2xl font-bold text-primary">
          Привет, {user.full_name.split(' ')[0]} 👋
        </h1>
        <p className="mt-1 text-sm text-muted">
          {roleLabel[user.role] ?? user.role}
          {user.company_name ? ` · ${user.company_name}` : ''}
        </p>
      </div>

      {/* Email verification banner */}
      {!user.is_email_verified && (
        <div className="rounded-xl border border-amber-200 bg-warning-subtle p-5 dark:border-amber-900/40">
          <p className="text-sm font-medium text-warning">
            Email не подтверждён — часть функций недоступна
          </p>
          <p className="mt-1 text-xs text-warning">
            Открой ссылку из письма или отправь его снова.
          </p>
          {resendErr && <p className="mt-2 text-xs text-danger">{resendErr}</p>}
          {resendMsg && <p className="mt-2 text-xs text-success">{resendMsg}</p>}
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

      {isCompanyAdmin && companyOnboarding && (
        companyOnboarding.completed ? (
          /* ── Компания уже полностью настроена ── */
          <section className="rounded-xl border border-green-200 bg-success-subtle p-5 dark:border-green-900/40">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success-subtle">
                <span className="text-lg leading-none text-success">✓</span>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold text-success">Компания полностью настроена</h2>
                <p className="mt-1 text-xs text-success">
                  Все обязательные шаги онбординга выполнены — можно работать.
                </p>
                <ul className="mt-3 space-y-1.5">
                  {companyOnboarding.steps.map((step) => (
                    <li key={step.key} className="flex items-center gap-2 text-xs text-success">
                      <span className="shrink-0 text-success">✓</span>
                      {ONBOARDING_STEP_LABELS[step.key] ?? step.title}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        ) : (
          /* ── Онбординг ещё не завершён — показываем шаги ── */
          <section className="rounded-xl border border-blue-200 bg-brand-subtle p-5 dark:border-blue-900/40">
            <h2 className="text-sm font-semibold text-brand">Онбординг компании не завершён</h2>
            <p className="mt-1 text-xs text-brand">
              Завершите обязательные шаги, чтобы закрыть стартовый онбординг.
            </p>
            <ul className="mt-3 space-y-1.5 text-sm">
              {companyOnboarding.steps.map((step) => (
                <li key={step.key} className={cn('flex items-center gap-2', step.completed ? 'text-success' : 'text-secondary')}>
                  <span className={cn('shrink-0 text-base leading-none', step.completed ? 'text-success' : 'text-muted')}>
                    {step.completed ? '✓' : '•'}
                  </span>
                  {ONBOARDING_STEP_LABELS[step.key] ?? step.title}
                </li>
              ))}
            </ul>
            {uploadLogoStepPending && (
              <div className="mt-4 rounded-lg border border-default bg-raised p-3">
                <p className="text-xs text-secondary">
                  Загрузите логотип компании прямо сейчас:
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <input
                    id="onboarding-logo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoSelect}
                    className="text-xs text-secondary file:mr-3 file:rounded-md file:border-0 file:bg-brand file:px-2.5 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-brand-hover"
                  />
                  <button
                    type="button"
                    disabled={!logoFile || uploadLogoMutation.isPending}
                    onClick={() => {
                      if (!logoFile) return;
                      uploadLogoMutation.mutate(logoFile);
                    }}
                    className="rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-hover disabled:opacity-50"
                  >
                    {uploadLogoMutation.isPending ? 'Загрузка...' : 'Загрузить логотип'}
                  </button>
                </div>
                {logoUploadError && <p className="mt-2 text-xs text-danger">{logoUploadError}</p>}
              </div>
            )}
            <div className="mt-4 flex gap-2">
              <Link
                to="/crm"
                className="rounded-lg bg-brand px-3 py-2 text-xs font-medium text-white hover:bg-brand-hover transition-colors"
              >
                Перейти в CRM
              </Link>
              <Link
                to="/company/settings/members"
                className="rounded-lg border border-default px-3 py-2 text-xs text-secondary hover:bg-hover hover:text-primary transition-colors"
              >
                Перейти к инвайтам
              </Link>
            </div>
          </section>
        )
      )}

      {/* Role-specific widgets */}
      {dashLoading && (
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl border border-default bg-raised" />
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
      <div className="rounded-xl border border-default bg-surface p-6">
        <h2 className="mb-4 text-sm font-semibold text-muted">Профиль</h2>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">Имя</dt>
            <dd className="font-medium text-primary">{user.full_name}</dd>
          </div>
          <div>
            <dt className="text-muted">Email</dt>
            <dd className="font-medium text-primary">{user.email}</dd>
          </div>
          <div>
            <dt className="text-muted">Роль</dt>
            <dd className="font-medium capitalize text-primary">{roleLabel[user.role] ?? user.role}</dd>
          </div>
          <div>
            <dt className="text-muted">Email подтверждён</dt>
            <dd>
              <span
                className={cn(
                  'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
                  user.is_email_verified
                    ? 'bg-success-subtle text-success-badge'
                    : 'bg-warning-subtle text-warning-badge',
                )}
              >
                {user.is_email_verified ? 'Да' : 'Нет'}
              </span>
            </dd>
          </div>
          {user.company_name && (
            <div className="sm:col-span-2">
              <dt className="text-muted">Компания</dt>
              <dd className="font-medium text-primary">{user.company_name}</dd>
            </div>
          )}
        </dl>

        <div className="mt-6 flex flex-wrap gap-3 border-t border-default pt-6">
          <button
            type="button"
            onClick={handleRefreshProfile}
            className="rounded-lg border border-default px-4 py-2 text-sm text-secondary hover:bg-hover hover:text-primary transition-colors"
          >
            Обновить профиль
          </button>
          <button
            type="button"
            onClick={() => void logout()}
            className="rounded-lg border border-red-200 bg-danger-subtle px-4 py-2 text-sm text-danger-badge hover:bg-red-100 transition-colors dark:border-red-200 dark:border-red-900/40"
          >
            Выйти
          </button>
        </div>
      </div>
    </div>
  );
}
