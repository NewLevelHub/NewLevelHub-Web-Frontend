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

// ── Chip colour maps — only semantic token classes ────────────────────

const BOOKING_STATUS_COLORS: Record<string, string> = {
  confirmed:  'bg-success-subtle text-success-badge',
  pending:    'bg-raised text-[color:var(--info)]',
  checked_in: 'bg-raised text-[color:var(--info)]',
  completed:  'bg-raised text-muted',
  cancelled:  'bg-danger-subtle text-danger-badge',
  no_show:    'bg-warning-subtle text-warning-badge',
};

const PASS_STATUS_COLORS: Record<string, string> = {
  active:  'bg-success-subtle text-success-badge',
  used:    'bg-raised text-muted',
  expired: 'bg-warning-subtle text-warning-badge',
  revoked: 'bg-danger-subtle text-danger-badge',
};

const TASK_PRIORITY_COLORS: Record<string, string> = {
  low:      'bg-raised text-[color:var(--info)]',
  medium:   'bg-warning-subtle text-warning-badge',
  high:     'bg-warning-subtle text-warning-badge',
  urgent:   'bg-danger-subtle text-danger-badge',
  critical: 'bg-danger-subtle text-danger-badge',
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
          <div className="h-3.5 flex-1 rounded bg-raised" />
          <div className="h-5 w-16 rounded-full bg-raised" />
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
    <div className="flex flex-col overflow-hidden rounded-2xl border border-default bg-surface shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-subtle text-brand">
          {icon}
        </span>
        <span className="text-sm font-semibold text-primary">{title}</span>
      </div>

      <div className="mx-4 h-px bg-[color:var(--border)]" />

      {/* Body */}
      <div className="flex-1 px-4">
        {isLoading ? (
          <RowSkeleton />
        ) : isEmpty ? (
          <p className="py-6 text-center text-sm text-muted">{emptyLabel}</p>
        ) : (
          <div className="divide-y divide-[color:var(--border-faint)]">{children}</div>
        )}
      </div>

      {/* Footer CTA */}
      <div className="mx-4 h-px bg-[color:var(--border)]" />
      <Link
        to={viewAllHref}
        className="flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-brand transition-colors hover:bg-brand-subtle"
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
  const colorClass = BOOKING_STATUS_COLORS[item.status] ?? 'bg-raised text-muted';
  return (
    <div className="flex items-start gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-primary">{item.resource_name}</p>
        <p className="mt-0.5 text-xs text-muted">{fmtDateTime(item.start_time)}</p>
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
  const colorClass = TASK_PRIORITY_COLORS[item.priority] ?? 'bg-raised text-muted';
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-primary">{item.title}</p>
        <p className="mt-0.5 truncate text-xs text-muted">{item.board_name}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <Chip
          label={t(`crm.priority.${item.priority}`, { defaultValue: item.priority })}
          colorClass={colorClass}
        />
        {item.deadline && (
          <span className="text-xs text-muted">{fmtDate(item.deadline)}</span>
        )}
      </div>
    </div>
  );
}

function PassRow({ item }: { item: PassActivity }) {
  const { t } = useTranslation();
  const colorClass = PASS_STATUS_COLORS[item.status] ?? 'bg-raised text-muted';
  return (
    <div className="flex items-start gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-primary">{item.guest_name}</p>
        <p className="mt-0.5 text-xs text-muted">{fmtDate(item.valid_until)}</p>
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
      <h2 className="mb-4 text-base font-semibold text-primary">
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
