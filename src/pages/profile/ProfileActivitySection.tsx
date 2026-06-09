import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Calendar, CheckSquare, Key, ArrowRight } from 'lucide-react';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { useUser } from '@/shared/hooks/useAuth';
import { USER_ROLES } from '@/shared/config/constants';
import { fmtDateTime, fmtDate } from '@/shared/lib/formatDate';
import { cn } from '@/shared/lib/cn';
import type { UserActivityResponse, BookingActivity, TaskActivity, PassActivity } from '@/shared/types';

// ── Colour maps ───────────────────────────────────────────────────────

const BOOKING_STATUS_COLORS: Record<string, string> = {
  confirmed:  'bg-emerald-100 text-emerald-700',
  pending:    'bg-sky-100 text-sky-700',
  checked_in: 'bg-blue-100 text-blue-700',
  completed:  'bg-gray-100 text-gray-500',
  cancelled:  'bg-red-100 text-red-700',
  no_show:    'bg-orange-100 text-orange-700',
};

const PASS_STATUS_COLORS: Record<string, string> = {
  active:  'bg-emerald-100 text-emerald-700',
  used:    'bg-gray-100 text-gray-500',
  expired: 'bg-yellow-100 text-yellow-700',
  revoked: 'bg-red-100 text-red-700',
};

const TASK_PRIORITY_COLORS: Record<string, string> = {
  low:      'bg-sky-100 text-sky-700',
  medium:   'bg-yellow-100 text-yellow-700',
  high:     'bg-orange-100 text-orange-700',
  urgent:   'bg-red-100 text-red-700',
  critical: 'bg-red-100 text-red-700',
};

// ── Chip ──────────────────────────────────────────────────────────────

function Chip({ label, colorClass }: { label: string; colorClass: string }) {
  return (
    <span className={cn('inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium', colorClass)}>
      {label}
    </span>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────

function RowSkeleton() {
  return (
    <div className="animate-pulse space-y-3 py-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-3.5 w-3.5 shrink-0 rounded-full bg-gray-100" />
          <div className="h-3.5 flex-1 rounded bg-gray-100" />
          <div className="h-5 w-16 rounded-full bg-gray-100" />
        </div>
      ))}
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────────────

interface MiniCardProps {
  icon: React.ReactNode;
  title: string;
  viewAllHref: string;
  viewAllLabel: string;
  isLoading: boolean;
  isEmpty: boolean;
  emptyLabel: string;
  children: React.ReactNode;
}

function MiniCard({
  icon,
  title,
  viewAllHref,
  viewAllLabel,
  isLoading,
  isEmpty,
  emptyLabel,
  children,
}: MiniCardProps) {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500">
          {icon}
        </span>
        <span className="text-sm font-semibold text-gray-800">{title}</span>
      </div>

      <div className="mx-4 h-px bg-gray-100" />

      {/* Body */}
      <div className="flex-1 px-4">
        {isLoading ? (
          <RowSkeleton />
        ) : isEmpty ? (
          <p className="py-6 text-center text-sm text-gray-400">{emptyLabel}</p>
        ) : (
          <div className="divide-y divide-gray-50">{children}</div>
        )}
      </div>

      {/* Footer CTA */}
      <div className="mx-4 h-px bg-gray-100" />
      <Link
        to={viewAllHref}
        className="flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-indigo-600 transition-colors hover:bg-indigo-50 hover:text-indigo-800"
      >
        {viewAllLabel}
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

// ── Rows ──────────────────────────────────────────────────────────────

function BookingRow({ item }: { item: BookingActivity }) {
  const { t } = useTranslation();
  const colorClass = BOOKING_STATUS_COLORS[item.status] ?? 'bg-gray-100 text-gray-500';
  return (
    <div className="flex items-start gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-800">{item.resource_name}</p>
        <p className="mt-0.5 text-xs text-gray-400">{fmtDateTime(item.start_time)}</p>
      </div>
      <Chip
        label={t(`dashboard.status.${item.status}`, { defaultValue: item.status })}
        colorClass={colorClass}
      />
    </div>
  );
}

function TaskRow({ item }: { item: TaskActivity }) {
  const { t } = useTranslation();
  const colorClass = TASK_PRIORITY_COLORS[item.priority] ?? 'bg-gray-100 text-gray-500';
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-800">{item.title}</p>
        <p className="mt-0.5 truncate text-xs text-gray-400">{item.board_name}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <Chip
          label={t(`crm.priority.${item.priority}`, { defaultValue: item.priority })}
          colorClass={colorClass}
        />
        {item.deadline && (
          <span className="text-xs text-gray-400">{fmtDate(item.deadline)}</span>
        )}
      </div>
    </div>
  );
}

function PassRow({ item }: { item: PassActivity }) {
  const { t } = useTranslation();
  const colorClass = PASS_STATUS_COLORS[item.status] ?? 'bg-gray-100 text-gray-500';
  return (
    <div className="flex items-start gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-800">{item.guest_name}</p>
        <p className="mt-0.5 text-xs text-gray-400">{fmtDate(item.valid_until)}</p>
      </div>
      <Chip
        label={t(`passes.status.${item.status}`, { defaultValue: item.status })}
        colorClass={colorClass}
      />
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────

export default function ProfileActivitySection() {
  const { t } = useTranslation();
  const user = useUser();

  const { data, isLoading } = useQuery<UserActivityResponse>({
    queryKey: ['profile-activity'],
    queryFn: () => apiClient.get<UserActivityResponse>(API.profile.activity).then((r) => r.data),
    staleTime: 60_000,
  });

  const showTasks =
    user?.role !== USER_ROLES.GUEST &&
    user?.role !== USER_ROLES.RECEPTION &&
    user?.role !== USER_ROLES.SERVICE_MANAGER;

  const showPasses =
    user?.role !== USER_ROLES.RECEPTION &&
    user?.role !== USER_ROLES.SERVICE_MANAGER;

  return (
    <section aria-label={t('profile.activity.title')} className="mt-8">
      <h2 className="mb-4 text-base font-semibold text-gray-900">
        {t('profile.activity.title')}
      </h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MiniCard
          icon={<Calendar className="h-4 w-4" />}
          title={t('profile.activity.bookings')}
          viewAllHref="/bookings/my"
          viewAllLabel={t('profile.activity.viewAll')}
          isLoading={isLoading}
          isEmpty={(data?.bookings.length ?? 0) === 0}
          emptyLabel={t('profile.activity.noBookings')}
        >
          {data?.bookings.map((b) => <BookingRow key={b.id} item={b} />)}
        </MiniCard>

        {showTasks && (
          <MiniCard
            icon={<CheckSquare className="h-4 w-4" />}
            title={t('profile.activity.tasks')}
            viewAllHref="/crm/my-tasks"
            viewAllLabel={t('profile.activity.viewAll')}
            isLoading={isLoading}
            isEmpty={(data?.tasks.length ?? 0) === 0}
            emptyLabel={t('profile.activity.noTasks')}
          >
            {data?.tasks.map((task) => <TaskRow key={task.id} item={task} />)}
          </MiniCard>
        )}

        {showPasses && (
          <MiniCard
            icon={<Key className="h-4 w-4" />}
            title={t('profile.activity.passes')}
            viewAllHref="/passes"
            viewAllLabel={t('profile.activity.viewAll')}
            isLoading={isLoading}
            isEmpty={(data?.passes.length ?? 0) === 0}
            emptyLabel={t('profile.activity.noPasses')}
          >
            {data?.passes.map((p) => <PassRow key={p.id} item={p} />)}
          </MiniCard>
        )}
      </div>
    </section>
  );
}
