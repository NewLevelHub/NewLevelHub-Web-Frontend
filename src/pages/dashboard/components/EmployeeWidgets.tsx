import { Link } from 'react-router';
import { DoorOpen, ExternalLink, Megaphone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/cn';
import { dateLocaleTag } from '@/shared/lib/localeFormat';
import type { EmployeeDashboardData } from '@/shared/types';

const PRIORITY_STYLE: Record<string, string> = {
  urgent:   'bg-[color:var(--danger)]',
  critical: 'bg-[color:var(--danger)]',
  high:     'bg-[color:var(--warning)]',
  medium:   'bg-[#d4b300]',
  mid:      'bg-[#d4b300]',
  low:      'bg-subtle',
};

export function EmployeeWidgets({
  data,
}: {
  data: EmployeeDashboardData;
}) {
  const { t, i18n } = useTranslation();
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

  const upcomingBookings = data.my_upcoming_bookings ?? [];
  const tasks = data.my_tasks ?? [];
  const uniqueBoards = data.my_tasks_boards_count ?? 0;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section
        className="relative overflow-hidden rounded-2xl p-6"
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
          {t('dashboard.employee.greeting', { name: userName })}
        </h2>
        <p className="mt-1 text-sm text-white/70">
          {t('dashboard.employee.subtitle', {
            date: dateStr,
            bookings: data.my_bookings_today,
            tasks: data.my_tasks_today,
          })}
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            to="/catalog"
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 transition-colors"
          >
            {t('dashboard.employee.bookResource')}
          </Link>
          <Link
            to="/passes"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/30 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition-colors"
          >
            {t('dashboard.employee.inviteGuest')}
          </Link>
        </div>
      </section>

      {/* KPI grid — 3 cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link
          to="/bookings/my"
          className="rounded-xl border border-default bg-surface p-5 flex flex-col gap-1 hover:bg-hover transition-colors"
        >
          <p className="text-xs text-muted">{t('dashboard.employee.kpi.myBookings')}</p>
          <p className="text-3xl font-bold text-primary leading-none tracking-tight">
            {data.my_bookings_today}
          </p>
        </Link>

        <Link
          to="/crm/my-tasks"
          className="rounded-xl border border-default bg-surface p-5 flex flex-col gap-1 hover:bg-hover transition-colors"
        >
          <p className="text-xs text-muted">{t('dashboard.employee.kpi.myTasks')}</p>
          <p className="text-3xl font-bold text-primary leading-none tracking-tight">
            {data.my_tasks_today}
          </p>
        </Link>

        <Link
          to="/notifications"
          className="rounded-xl border border-default bg-surface p-5 flex flex-col gap-1 hover:bg-hover transition-colors"
        >
          <p className="text-xs text-muted">{t('dashboard.employee.kpi.unread')}</p>
          <p className="text-3xl font-bold text-primary leading-none tracking-tight">
            {data.unread_notifications_count}
          </p>
        </Link>
      </div>

      {/* 4-col grid — 3:1 */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left — My upcoming bookings */}
        <section className="lg:col-span-2 rounded-xl border border-default bg-surface overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-default">
            <h2 className="text-sm font-semibold text-primary">
              {t('dashboard.employee.upcomingBookings')}
            </h2>
            <Link
              to="/bookings/my"
              className="inline-flex items-center gap-1 text-xs text-brand hover:text-brand-hover transition-colors"
            >
              {t('dashboard.employee.allMyBookings')}
              <ExternalLink size={11} />
            </Link>
          </div>

          {upcomingBookings.length === 0 ? (
            <p className="px-5 py-4 text-xs text-muted">
              {t('dashboard.employee.noBookings')}
            </p>
          ) : (
            <ul className="divide-y divide-[color:var(--border)]">
              {upcomingBookings.map((booking) => {
                const timeStr = `${fmtTime(booking.start_time)} — ${fmtTime(booking.end_time)}`;
                const desc =
                  booking.resource_type === 'meeting_room'
                    ? t('dashboard.employee.meetingRoomCapacity', {
                        count: booking.resource_capacity ?? '?',
                      })
                    : t('dashboard.employee.deskResource');
                return (
                  <li
                    key={booking.id}
                    className="flex items-center gap-3 px-5 py-4"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-subtle">
                      <DoorOpen size={20} className="text-brand" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-primary truncate">
                        {booking.resource_name}
                      </p>
                      <p className="text-xs text-muted truncate">{desc}</p>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="font-mono text-xs text-secondary whitespace-nowrap">
                        {timeStr}
                      </span>
                      <span className="rounded-full bg-success-subtle px-2.5 py-0.5 text-xs font-medium text-success-badge whitespace-nowrap">
                        {t('dashboard.employee.bookingConfirmed')}
                      </span>
                    </div>

                    <Link
                      to="/bookings/my"
                      className="ml-1 shrink-0 rounded-lg border border-default px-3 py-1.5 text-xs font-medium text-secondary hover:bg-hover hover:text-primary transition-colors"
                    >
                      {t('dashboard.employee.openBooking')}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Right column */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          {/* My tasks */}
          <section className="rounded-xl border border-default bg-surface overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-default">
              <div>
                <h2 className="text-sm font-semibold text-primary">
                  {t('dashboard.employee.myTasks')}
                </h2>
                <p className="text-xs text-muted mt-0.5">
                  {t('dashboard.employee.tasksFromBoards', {
                    count: data.my_tasks_today,
                    boards: uniqueBoards,
                  })}
                </p>
              </div>
              <Link
                to="/crm/my-tasks"
                className="text-xs text-brand hover:text-brand-hover transition-colors"
              >
                {t('dashboard.employee.allTasks')}
              </Link>
            </div>

            <ul className="divide-y divide-[color:var(--border)]">
              {tasks.map((task) => {
                const dotClass =
                  PRIORITY_STYLE[task.priority] ?? 'bg-subtle';
                return (
                  <li key={task.id} className="flex items-start gap-3 px-5 py-3">
                    {/* Priority indicator: 6px wide, 24px high */}
                    <span
                      className={cn('mt-0.5 shrink-0 rounded-sm', dotClass)}
                      style={{ width: 6, height: 24, borderRadius: 2 }}
                      aria-hidden="true"
                    />

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-primary leading-snug">{task.title}</p>
                      <p className="mt-0.5 text-xs text-muted">{task.board_name}</p>
                    </div>

                    <span
                      className={cn(
                        'shrink-0 font-mono text-xs whitespace-nowrap',
                        task.is_overdue ? 'font-bold text-danger' : 'text-muted',
                      )}
                    >
                      {task.due_date}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Announcements widget */}
          <section className="rounded-xl border border-default bg-surface overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-default">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-primary">
                <Megaphone size={14} className="text-amber-500" />
                {t('dashboard.employee.newAnnouncements')}
              </h2>
              <Link
                to="/announcements"
                className="text-xs text-brand hover:text-brand-hover transition-colors"
              >
                {t('dashboard.employee.allAnnouncements')}
              </Link>
            </div>

            <div className="p-5">
              {data.announcement_feed.length === 0 ? (
                <p className="text-xs text-muted">{t('dashboard.employee.noAnnouncements')}</p>
              ) : (
                <ul className="space-y-3">
                  {data.announcement_feed.map((a) => {
                    const createdDate = new Date(a.created_at);
                    const metaStr = createdDate.toLocaleDateString('ru-RU', {
                      day: 'numeric',
                      month: 'short',
                    });
                    const metaTime = createdDate.toLocaleTimeString('ru-RU', {
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
