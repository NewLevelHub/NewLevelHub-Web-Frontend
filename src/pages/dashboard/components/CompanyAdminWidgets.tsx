import { useState } from 'react';
import { Link } from 'react-router';
import { ExternalLink, Megaphone, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CleaningModal } from '@/pages/service-requests/components/CleaningModal';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/shared/lib/cn';
import i18n from '@/shared/lib/i18n';
import { dateLocaleTag } from '@/shared/lib/localeFormat';
import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { LEAVE_TYPE_LABEL_KEYS } from '@/shared/config/constants';
import type { CompanyAdminDashboardData } from '@/shared/types';
import { MyTasksWidget } from '@/pages/dashboard/components/MyTasksWidget';
import { useMyTasksFlat } from '@/pages/dashboard/hooks/useMyTasksFlat';

const STATUS_BADGE: Record<string, string> = {
  confirmed: 'bg-success-subtle text-success-badge',
};

export function CompanyAdminWidgets({ data }: { data: CompanyAdminDashboardData }) {
  const [showCleaning, setShowCleaning] = useState(false);
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

  const { data: unreadData } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: () =>
      apiClient.get<{ count: number }>(API.notifications.unreadCount).then((r) => r.data),
    refetchInterval: 30_000,
  });
  const unreadCount = unreadData?.count ?? 0;

  const teamBookings = data.team_bookings_today ?? [];
  const { tasks, totalCount: tasksTotalCount } = useMyTasksFlat();

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section
        className="relative overflow-hidden rounded-2xl px-4 py-6 sm:px-6 sm:py-8"
        style={{ background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-gradient-end) 100%)' }}
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
            to="/bookings/catalog"
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
          <button
            type="button"
            onClick={() => setShowCleaning(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/30 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition-colors"
          >
            <Sparkles size={15} />
            {t('dashboard.callCleaning')}
          </button>
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
            {tasksTotalCount}
          </p>
        </Link>

        <Link
          to="/notifications"
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

      {/* Pending Approvals */}
      {data.pending_approvals && (() => {
        const getInitials = (name: string) =>
          name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');

        const fmtDay = (iso: string) =>
          new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short' });

        return (
          <>
            {/* Card 1 — Leaves */}
            <section className="bg-[color:var(--bg-surface)] border border-[color:var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-card)] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[color:var(--border)]">
                <h2 className="text-[13px] font-semibold text-[color:var(--text-primary)] tracking-[-0.01em]">
                  {t('dashboard.pendingLeaves')}
                </h2>
                <Link
                  to="/leave"
                  className="inline-flex items-center gap-1 text-xs text-brand hover:text-brand-hover transition-colors"
                >
                  {t('dashboard.companyAdmin.openAll')}
                  <ExternalLink size={11} />
                </Link>
              </div>

              <table className="min-w-full border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-[color:var(--border)]">
                    <th className="px-3 py-2 text-left text-[11px] font-medium text-[color:var(--text-muted)] whitespace-nowrap">
                      {t('dashboard.employeeName')}
                    </th>
                    <th className="px-3 py-2 text-left text-[11px] font-medium text-[color:var(--text-muted)] whitespace-nowrap">
                      {t('dashboard.leaveType')}
                    </th>
                    <th className="px-3 py-2 text-left text-[11px] font-medium text-[color:var(--text-muted)] whitespace-nowrap">
                      {t('dashboard.period')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.pending_approvals.leaves.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-3 py-10 text-[13px] text-[color:var(--text-muted)] text-center">
                        {t('dashboard.noRequests')}
                      </td>
                    </tr>
                  ) : (
                    data.pending_approvals.leaves.map((leave) => (
                      <tr key={leave.id} className="border-b border-[color:var(--border)] hover:bg-[color:var(--bg-hover)] transition-colors">
                        <td className="px-3 py-2.5 align-middle">
                          <div className="flex items-center gap-1.5">
                            {leave.employee.avatar ? (
                              <img
                                src={leave.employee.avatar}
                                alt={leave.employee.full_name}
                                className="h-7 w-7 rounded-full object-cover shrink-0"
                              />
                            ) : (
                              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-white">
                                {getInitials(leave.employee.full_name)}
                              </span>
                            )}
                            <span className="text-[color:var(--text-primary)]">{leave.employee.full_name}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 align-middle text-[13px] text-[color:var(--text-muted)] whitespace-nowrap">
                          {t(LEAVE_TYPE_LABEL_KEYS[leave.leave_type as keyof typeof LEAVE_TYPE_LABEL_KEYS] ?? leave.leave_type)}
                        </td>
                        <td className="px-3 py-2.5 align-middle font-mono text-[color:var(--text-primary)] whitespace-nowrap">
                          {fmtDay(leave.start_date)} — {fmtDay(leave.end_date)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </section>

            {/* Card 2 — Guest Passes */}
            <section className="bg-[color:var(--bg-surface)] border border-[color:var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-card)] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[color:var(--border)]">
                <h2 className="text-[13px] font-semibold text-[color:var(--text-primary)] tracking-[-0.01em]">
                  {t('dashboard.pendingGuestPasses')}
                </h2>
                <Link
                  to="/passes"
                  className="inline-flex items-center gap-1 text-xs text-brand hover:text-brand-hover transition-colors"
                >
                  {t('dashboard.companyAdmin.openAll')}
                  <ExternalLink size={11} />
                </Link>
              </div>

              <table className="min-w-full border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-[color:var(--border)]">
                    <th className="px-3 py-2 text-left text-[11px] font-medium text-[color:var(--text-muted)] whitespace-nowrap">
                      {t('dashboard.guestName')}
                    </th>
                    <th className="px-3 py-2 text-left text-[11px] font-medium text-[color:var(--text-muted)] whitespace-nowrap">
                      {t('dashboard.hostName')}
                    </th>
                    <th className="px-3 py-2 text-left text-[11px] font-medium text-[color:var(--text-muted)] whitespace-nowrap">
                      {t('dashboard.period')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.pending_approvals.guest_passes.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-3 py-10 text-[13px] text-[color:var(--text-muted)] text-center">
                        {t('dashboard.noRequests')}
                      </td>
                    </tr>
                  ) : (
                    data.pending_approvals.guest_passes.map((pass) => (
                      <tr key={pass.id} className="border-b border-[color:var(--border)] hover:bg-[color:var(--bg-hover)] transition-colors">
                        <td className="px-3 py-2.5 align-middle">
                          <div className="flex items-center gap-1.5">
                            <span
                              aria-hidden="true"
                              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-white select-none"
                            >
                              {getInitials(pass.guest_name)}
                            </span>
                            <div>
                              <div className="font-medium text-[color:var(--text-primary)]">{pass.guest_name}</div>
                              <div className="text-[11px] text-[color:var(--text-muted)]">{pass.guest_email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 align-middle">
                          <div className="flex items-center gap-1.5">
                            {pass.host.avatar ? (
                              <img
                                src={pass.host.avatar}
                                alt={pass.host.full_name}
                                className="h-7 w-7 rounded-full object-cover shrink-0"
                              />
                            ) : (
                              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-white select-none">
                                {getInitials(pass.host.full_name)}
                              </span>
                            )}
                            <span className="text-[color:var(--text-primary)]">{pass.host.full_name}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 align-middle font-mono text-[color:var(--text-primary)] whitespace-nowrap">
                          {fmtDay(pass.valid_from)} — {fmtDay(pass.valid_until)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </section>
          </>
        );
      })()}

      <CleaningModal
        isOpen={showCleaning}
        onClose={() => setShowCleaning(false)}
      />
    </div>
  );
}
