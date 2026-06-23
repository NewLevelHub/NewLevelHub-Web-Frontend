import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Calendar, CheckSquare, Key, ChevronRight } from 'lucide-react';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { useUser } from '@/shared/hooks/useAuth';
import { USER_ROLES } from '@/shared/config/constants';
import { fmtDateTime, fmtDate } from '@/shared/lib/formatDate';
import { cn } from '@/shared/lib/cn';
import type { UserActivityResponse } from '@/shared/types';

// ── Skeleton ──────────────────────────────────────────────────────────────────

function ActivityCardSkeleton() {
  return (
    <div
      className="animate-pulse rounded-2xl border border-default bg-surface shadow-sm"
      style={{ padding: '12px 16px' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 9, flexShrink: 0, background: 'var(--bg-raised)' }} />
        <div style={{ flex: 1 }}>
          <div className="h-5 w-10 rounded bg-raised" />
          <div className="mt-1.5 h-3 w-24 rounded bg-raised" />
          <div className="mt-1.5 h-3 w-16 rounded bg-raised" />
        </div>
        <div style={{ width: 14, height: 14, borderRadius: 2, background: 'var(--bg-raised)', flexShrink: 0 }} />
      </div>
      <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border-faint)' }}>
        <div className="h-3 w-48 rounded bg-raised" />
      </div>
    </div>
  );
}

// ── Count Card ────────────────────────────────────────────────────────────────

interface ActivityCountCardProps {
  icon: React.ReactNode;
  count: number;
  subtitle: string;
  label: string;
  detail: string;
  href: string;
  isLoading: boolean;
}

function ActivityCountCard({
  icon,
  count,
  subtitle,
  label,
  detail,
  href,
  isLoading,
}: ActivityCountCardProps) {
  if (isLoading) {
    return <ActivityCardSkeleton />;
  }

  return (
    <Link
      to={href}
      className={cn(
        'block rounded-2xl border border-default bg-surface shadow-sm',
        'cursor-pointer transition-colors hover:bg-hover',
      )}
      style={{ padding: '12px 16px' }}
    >
      {/* Top row: icon + number/subtitle/label + chevron */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Icon container */}
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 9,
            flexShrink: 0,
            background: 'var(--bg-raised)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </div>

        {/* Number + subtitle + label */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                letterSpacing: '-0.025em',
              }}
            >
              {count}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{subtitle}</span>
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>
            {label}
          </div>
        </div>

        {/* Chevron */}
        <ChevronRight size={14} style={{ color: 'var(--text-subtle)', flexShrink: 0 }} />
      </div>

      {/* Separator + detail */}
      <div
        style={{
          fontSize: 11,
          color: 'var(--text-muted)',
          marginTop: 8,
          paddingTop: 8,
          borderTop: '1px solid var(--border-faint)',
        }}
      >
        {detail}
      </div>
    </Link>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

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

  // Derive booking detail
  const lastBooking = data?.bookings[data.bookings.length - 1];
  const bookingDetail = lastBooking
    ? `${lastBooking.resource_name} · ${fmtDateTime(lastBooking.start_time)}`
    : t('profile.activity.noBookings');

  // Derive task detail
  const firstTask = data?.tasks[0];
  const taskDetail = firstTask ? firstTask.title : t('profile.activity.noTasks');

  // Derive pass detail
  const firstPass = data?.passes[0];
  const passDetail = firstPass
    ? `${firstPass.guest_name} · ${fmtDate(firstPass.valid_until)}`
    : t('profile.activity.noPasses');

  return (
    <section aria-label={t('profile.activity.title')} className="flex flex-col gap-3">
      <ActivityCountCard
        icon={<Calendar size={16} style={{ color: 'var(--text-secondary)' }} />}
        count={data?.bookings.length ?? 0}
        subtitle={t('profile.activity.lastMonth')}
        label={t('profile.activity.bookings')}
        detail={bookingDetail}
        href="/bookings/my"
        isLoading={isLoading}
      />

      {showTasks && (
        <ActivityCountCard
          icon={<CheckSquare size={16} style={{ color: 'var(--text-secondary)' }} />}
          count={data?.tasks.length ?? 0}
          subtitle={t('profile.activity.activeTasks')}
          label={t('profile.activity.tasks')}
          detail={taskDetail}
          href="/crm/my-tasks"
          isLoading={isLoading}
        />
      )}

      {showPasses && (
        <ActivityCountCard
          icon={<Key size={16} style={{ color: 'var(--text-secondary)' }} />}
          count={data?.passes.length ?? 0}
          subtitle={t('profile.activity.myPasses')}
          label={t('profile.activity.passes')}
          detail={passDetail}
          href="/passes"
          isLoading={isLoading}
        />
      )}
    </section>
  );
}
