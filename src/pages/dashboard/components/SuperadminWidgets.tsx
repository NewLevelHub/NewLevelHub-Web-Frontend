import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Megaphone, PlusCircle, ExternalLink } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import i18n from '@/shared/lib/i18n';
import { dateLocaleTag } from '@/shared/lib/localeFormat';
import type { SuperadminDashboardData } from '@/shared/types';
import { KpiCard, type KpiCardProps } from '@/pages/dashboard/components/KpiCard';
import { FloorLoadWidget } from '@/pages/dashboard/components/FloorLoadWidget';
import { BOOKING_STATUS_BADGE } from '@/pages/dashboard/constants';

export function SuperadminWidgets({ data }: { data: SuperadminDashboardData }) {
  const { t } = useTranslation();
  const locale = dateLocaleTag(i18n.language);

  const today = new Date();
  const dateStr = today.toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const bookings = data.bookings_recent ?? [];
  const announcements = data.announcements_recent ?? [];

  const kpiCards: KpiCardProps[] = [
    {
      label: t('dashboard.kpi.activeBookings'),
      value: String(data.bookings_today),
      trend: t('dashboard.kpi.trendWeekDelta', { count: data.bookings_week_delta }),
      trendDir: data.bookings_week_delta >= 0 ? 'up' : 'down',
    },
    {
      label: t('dashboard.kpi.spaceLoad'),
      value: `${data.space_load_pct}%`,
    },
    {
      label: t('dashboard.kpi.openRequests'),
      value: String(data.open_service_requests),
      trend: t('dashboard.kpi.trendClosedToday', { count: data.service_requests_closed_today }),
      trendDir: 'neutral',
    },
    {
      label: t('dashboard.kpi.activeTenants'),
      value: String(data.total_companies),
      trend: t('dashboard.kpi.trendNewWeek', { count: data.new_companies_last_7d }),
      trendDir: data.new_companies_last_7d > 0 ? 'up' : 'neutral',
    },
  ];

  const floorRows = (data.floor_load ?? [])
    .map(f => ({
      label: f.floor_name,
      pct: f.occupancy_pct,
      occupied: f.occupied,
      total: f.total,
    }));

  const userName = data.user?.full_name?.split(' ')[0] ?? '';

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section
        className="relative overflow-hidden rounded-2xl px-4 py-6 sm:px-6 sm:py-8"
        style={{ background: 'linear-gradient(135deg, var(--brand) 0%, #7c3aed 100%)' }}
      >
        {/* Decorative circle */}
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
          {t('dashboard.greeting', { name: userName })}
        </h2>
        <p className="mt-1 text-sm text-white/70">
          {t('dashboard.subtitle', { date: dateStr, count: data.total_users, load: data.space_load_pct })}
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            to="/announcements/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 transition-colors"
          >
            <PlusCircle size={15} />
            {t('dashboard.createAnnouncement')}
          </Link>
          <Link
            to="/resources/new"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/30 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition-colors"
          >
            {t('dashboard.addResource')}
          </Link>
        </div>
      </section>

      {/* KPI grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((card) => (
          <KpiCard key={card.label} {...card} />
        ))}
      </div>

      {/* 2-col section */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        {/* Upcoming bookings table */}
        <section className="lg:col-span-3 rounded-xl border border-default bg-surface overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-default">
            <div>
              <h2 className="text-sm font-semibold text-primary">
                {t('dashboard.upcomingBookings')}
              </h2>
              <p className="text-xs text-muted mt-0.5">{t('dashboard.acrossAllCompanies')}</p>
            </div>
            <Link
              to="/staff/bookings"
              className="inline-flex items-center gap-1 text-xs text-brand hover:text-brand-hover transition-colors"
            >
              {t('dashboard.openAll')}
              <ExternalLink size={11} />
            </Link>
          </div>

          {bookings.length === 0 ? (
            <p className="px-5 py-8 text-sm text-muted text-center">
              {t('dashboard.noBookings')}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-sm">
                <thead>
                  <tr className="border-b border-default bg-raised">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted">
                      {t('dashboard.table.resource')}
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted">
                      {t('dashboard.table.company')}
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted">
                      {t('dashboard.table.user')}
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted">
                      {t('dashboard.table.time')}
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted">
                      {t('dashboard.table.status')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--border)]">
                  {bookings.map((b) => {
                    const badge =
                      BOOKING_STATUS_BADGE[b.status] ?? BOOKING_STATUS_BADGE['pending'];
                    const start = new Date(b.start_time);
                    const end = new Date(b.end_time);
                    const timeStr = `${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')} – ${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}`;
                    return (
                      <tr key={b.id} className="border-b border-[color:var(--border)] hover:bg-[color:var(--bg-hover)] transition-colors">
                        <td className="px-4 py-3 font-medium text-primary whitespace-nowrap">
                          {b.resource_name}
                        </td>
                        <td className="px-4 py-3 text-muted whitespace-nowrap">
                          {b.company_name ?? '—'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-white">
                              {b.user_name?.[0]?.toUpperCase() ?? '?'}
                            </span>
                            <span className="text-secondary">{b.user_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-secondary whitespace-nowrap">
                          {timeStr}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={cn(
                              'rounded-full px-2.5 py-0.5 text-xs font-medium',
                              badge.className,
                            )}
                          >
                            {t(badge.label)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Right column */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          {/* Announcements widget */}
          <section className="rounded-xl border border-default bg-surface overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-default">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-primary">
                <Megaphone size={14} className="text-amber-500" />
                {t('dashboard.announcements')}
              </h2>
              <Link
                to="/announcements"
                className="text-xs text-brand hover:text-brand-hover transition-colors"
              >
                {t('dashboard.all')} →
              </Link>
            </div>

            <div className="p-5">
              {announcements.length === 0 ? (
                <p className="text-xs text-muted">{t('dashboard.noAnnouncements')}</p>
              ) : (
                <ul className="space-y-3">
                  {announcements.map((a) => {
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
                        <p className="mt-1 line-clamp-2 text-xs text-secondary">{a.text}</p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          <FloorLoadWidget rows={floorRows} />
        </div>
      </div>
    </div>
  );
}
