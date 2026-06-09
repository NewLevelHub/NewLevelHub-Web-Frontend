import { useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Map, Sparkles } from 'lucide-react';
import { CleaningModal } from '@/pages/service-requests/components/CleaningModal';
import { dateLocaleTag } from '@/shared/lib/localeFormat';
import type { GuestDashboardData } from '@/shared/types';
import { AnnouncementFeed } from '@/pages/dashboard/components/AnnouncementFeed';

export function GuestWidgets({ data }: { data: GuestDashboardData }) {
  const [showCleaning, setShowCleaning] = useState(false);
  const { t, i18n } = useTranslation();
  const locale = dateLocaleTag(i18n.language);

  const today = new Date();
  const dateStr = today.toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const userName = data.user?.full_name?.split(' ')[0] ?? '';

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
          {t('dashboard.guest.greeting', { name: userName })}
        </h2>
        <p className="mt-1 text-sm text-white/70">
          {t('dashboard.guest.subtitle', { date: dateStr, bookings: data.my_bookings_today })}
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            to="/bookings/catalog"
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 transition-colors"
          >
            {t('dashboard.guest.bookResource')}
          </Link>
          <Link
            to="/service-requests/new"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/30 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition-colors"
          >
            {t('dashboard.guest.serviceRequest')}
          </Link>
          <Link
            to="/passes/new"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/30 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition-colors"
          >
            {t('dashboard.guest.inviteGuest')}
          </Link>
          <Link
            to="/building/map"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/30 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition-colors"
          >
            <Map size={15} />
            {t('dashboard.guest.buildingMap')}
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

      {/* KPI grid */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link
          to="/bookings/my"
          className="rounded-xl border border-default bg-surface p-5 flex flex-col gap-1 hover:bg-hover transition-colors"
        >
          <p className="text-xs text-muted">{t('dashboard.guest.kpi.myBookings')}</p>
          <p className="text-3xl font-bold text-primary leading-none tracking-tight">
            {data.my_bookings_today}
          </p>
        </Link>

        <Link
          to="/bookings/catalog"
          className="rounded-xl border border-default bg-surface p-5 flex flex-col gap-1 hover:bg-hover transition-colors"
        >
          <p className="text-xs text-muted">{t('dashboard.guest.kpi.availableDesks')}</p>
          <p className="text-3xl font-bold text-primary leading-none tracking-tight">
            {data.quick_booking.available_desks}
          </p>
        </Link>

        <Link
          to="/bookings/catalog"
          className="rounded-xl border border-default bg-surface p-5 flex flex-col gap-1 hover:bg-hover transition-colors"
        >
          <p className="text-xs text-muted">{t('dashboard.guest.kpi.availableRooms')}</p>
          <p className="text-3xl font-bold text-primary leading-none tracking-tight">
            {data.quick_booking.available_rooms}
          </p>
        </Link>
      </div>

      {/* Building Map mini-widget */}
      <Link
        to="/building/map"
        className="group flex items-center gap-4 rounded-xl border border-default bg-surface p-5 hover:bg-hover transition-colors"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/10">
          <Map size={20} className="text-brand" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-primary">{t('dashboard.guest.buildingMap')}</p>
          <p className="text-xs text-muted mt-0.5">{t('dashboard.guest.buildingMapHint')}</p>
        </div>
        <ChevronRight size={16} className="text-muted group-hover:text-secondary transition-colors shrink-0" />
      </Link>

      {/* Building announcements (shown only when not empty) */}
      <AnnouncementFeed items={data.bc_announcements} title={t('dashboard.guest.bcAnnouncements')} />

      <CleaningModal
        isOpen={showCleaning}
        onClose={() => setShowCleaning(false)}
      />
    </div>
  );
}
