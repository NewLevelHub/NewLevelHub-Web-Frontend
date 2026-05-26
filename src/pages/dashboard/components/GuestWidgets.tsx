import type { GuestDashboardData } from '@/shared/types';
import { AnnouncementFeed } from '@/pages/dashboard/components/AnnouncementFeed';

export function GuestWidgets({ data }: { data: GuestDashboardData }) {
  return (
    <div className="space-y-6">
      <AnnouncementFeed items={data.bc_announcements} title="Объявления бизнес-центра" />
    </div>
  );
}
