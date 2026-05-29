import { useTranslation } from 'react-i18next';
import type { GuestDashboardData } from '@/shared/types';
import { AnnouncementFeed } from '@/pages/dashboard/components/AnnouncementFeed';

export function GuestWidgets({ data }: { data: GuestDashboardData }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <AnnouncementFeed items={data.bc_announcements} title={t('dashboard.guest.bcAnnouncements')} />
    </div>
  );
}
