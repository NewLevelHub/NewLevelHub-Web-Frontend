import { Link } from 'react-router';
import { ExternalLink, Megaphone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/cn';
import i18n from '@/shared/lib/i18n';
import { dateLocaleTag } from '@/shared/lib/localeFormat';
import type { CompanyAdminDashboardData } from '@/shared/types';
import { MyTasksWidget } from '@/pages/dashboard/components/MyTasksWidget';

const STATUS_BADGE: Record<string, string> = {
  confirmed: 'bg-success-subtle text-success-badge',
};

export function CompanyAdminWidgets({ data }: { data: CompanyAdminDashboardData }) {
  const { t } = useTranslation();
  const locale = dateLocaleTag(i18n.language);

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });

  const today = new Date();
  const dateStr = today.toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const userName = data.user?.full_name?.split(' ')[0] ?? '';

  const unreadCount = data.pending_approvals.leaves + data.pending_approvals.guest_passes;

  const teamBookings = data.team_bookings_today ?? [];
  const tasks = data.my_tasks ?? [];

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section
        className="relative overflow-hidden rounded-2xl px-4 py-6 sm:px-6 sm:py-8"
        style={{ background: 'linear-gradient(135deg, var(--brand) 0%, #7c3aed 100%)' }}
      >
        <div
          className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full opacity-10"
          style={{ background: 'rgba(255,255,255,0.6)' }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-8 right-24 h-32 w-32 rounded-full opacity-10"
          style={{ background: 'rgba(255,255,255,0.4)' }}
          aria-hidden="true"
        />

        <h2 className="text-xl font-bold text-white">
          {t('dashboard.companyAdmin.greeting', { name: userName })}
        </h2>
        <p className="mt-1 text-sm text-white/70">
          {t('dashboard.companyAdmin.subtitle', {
            date: dateStr,
            count: data.bookings_today,
            total: data.employee_count,
          })}
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            to="/catalog"
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 transition-colors"
          >
            {t('dashboard.companyAdmin.bookResource')}
          </Link>
          <Link
            to="/service-requests"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/30 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition-colors"
          >
            {t('dashboard.companyAdmin.submitRequest')}
          </Link>
        </div>
      </section>

      {/* KPI grid — 4 cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-default bg-surface p-5 flex flex-col gap-1">
          <p className="text-xs text-muted">{t('dashboard.companyAdmin.kpi.teamBookings')}</p>
          <p className="text-2xl sm:text-3xl font-bold text-primary leading-none tracking-tight">
            {data.bookings_today}
          </p>
        </div>

        <div className="rounded-xl border border-default bg-surface p-5 flex flex-col gap-1">
          <p className="text-xs text-muted">{t('dashboard.companyAdmin.kpi.freeNow')}</p>
          <p className="text-2xl sm:text-3xl font-bold text-primary leading-none tracking-tight">
            {String(data.free_resources_now ?? '—')}
          </p>
        </div>

        <Link
          to="/crm/my-tasks"
          className="rounded-xl border border-default bg-surface p-5 flex flex-col gap-1 hover:bg-hover transition-colors"
        >
          <p className="text-xs text-muted">{t('dashboard.companyAdmin.kpi.openTasks')}</p>
          <p className="text-2xl sm:text-3xl font-bold text-primary leading-none tracking-tight">
            {tasks.length}
          </p>
        </Link>

        <Link
          to="/leave"
          className="rounded-xl border border-default bg-surface p-5 flex flex-col gap-1 hover:bg-hover transition-colors"
        >
          <p className="text-xs text-muted">{t('dashboard.companyAdmin.kpi.unread')}</p>
          <p className="text-2xl sm:text-3xl font-bold text-primary leading-none tracking-tight">
            {unreadCount}
          </p>
        </Link>
      </div>

      {/* 2-col section: lg:grid-cols-4 — left=col-span-3, right=col-span-1 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        {/* Left — Team bookings today */}
        <section className="lg:col-span-3 rounded-xl border border-default bg-surface overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-default">
            <div>
              <h2 className="text-sm font-semibold text-primary">
                {t('dashboard.companyAdmin.teamBookingsTitle')}
              </h2>
              <p className="text-xs text-muted mt-0.5">
                {t('dashboard.companyAdmin.teamBookingsSubtitle', { count: data.bookings_today })}
              </p>
            </div>
            <Link
              to="/staff/bookings"
              className="inline-flex items-center gap-1 text-xs text-brand hover:text-brand-hover transition-colors"
            >
              {t('dashboard.companyAdmin.openAll')}
              <ExternalLink size={11} />
            </Link>
          </div>

          <ul className="divide-y divide-[color:var(--border)]">
            {teamBookings.map((b, idx) => {
              const timeStr = `${fmtTime(b.start_time)} — ${fmtTime(b.end_time)}`;
              const badgeClass = b.status === 'confirmed'
                ? STATUS_BADGE.confirmed
                : 'bg-warning-subtle text-warning-badge';
              return (
                <li
                  key={`${b.user_initials}-${idx}`}
                  className="flex flex-wrap items-center gap-3 px-5 py-3 hover:bg-hover transition-colors"
                >
                  <span
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-white"
                    aria-hidden="true"
                  >
                    {b.user_initials}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-primary truncate">{b.user_full_name}</p>
                    <p className="text-xs text-muted truncate">{b.resource_name}</p>
                  </div>

                  <span className="font-mono text-xs text-secondary whitespace-nowrap">
                    {timeStr}
                  </span>

                  <span
                    className={cn(
                      'rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
                      badgeClass,
                    )}
                  >
                    {b.status === 'confirmed'
                      ? t('dashboard.companyAdmin.statusConfirmed')
                      : t('dashboard.companyAdmin.statusSoon')}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Right column */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          {/* My tasks widget */}
          <MyTasksWidget
            heading={t('dashboard.companyAdmin.myTasks')}
            linkLabel={t('dashboard.companyAdmin.allTasks')}
            tasks={tasks}
          />

          {/* Announcements */}
          <section className="rounded-xl border border-default bg-surface overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-default">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-primary">
                <Megaphone size={14} className="text-amber-500" />
                {t('dashboard.companyAdmin.newAnnouncements')}
              </h2>
              <Link
                to="/announcements"
                className="text-xs text-brand hover:text-brand-hover transition-colors"
              >
                {t('dashboard.companyAdmin.allAnnouncements')}
              </Link>
            </div>

            <div className="p-5">
              {data.announcement_feed.length === 0 ? (
                <p className="text-xs text-muted">{t('dashboard.companyAdmin.noAnnouncements')}</p>
              ) : (
                <ul className="space-y-3">
                  {data.announcement_feed.map((a) => {
                    const createdDate = new Date(a.created_at);
                    const metaStr = createdDate.toLocaleDateString(locale, {
                      day: 'numeric',
                      month: 'short',
                    });
                    const metaTime = createdDate.toLocaleTimeString(locale, {
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                    return (
                      <li
                        key={a.id}
                        className="border-b border-default pb-3 last:border-0 last:pb-0"
                      >
                        <p className="text-[13px] font-semibold text-primary leading-tight">
                          {a.title}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted">
                          {metaStr} · {metaTime}
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs text-secondary">{a.body}</p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
