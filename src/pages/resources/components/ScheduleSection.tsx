import { useTranslation } from 'react-i18next';

import { cn } from '@/shared/lib/cn';
import { ResourceDayTimeline } from '@/pages/bookings/components/ResourceDayTimeline';
import type { ResourceScheduleSlot } from '@/shared/types';

export type ScheduleSectionProps = {
  scheduleDay: string;
  weekAnchors: string[];
  scheduleSlots: ResourceScheduleSlot[];
  scheduleLoading: boolean;
  onDayChange: (day: string) => void;
};

export function ScheduleSection({
  scheduleDay,
  weekAnchors,
  scheduleSlots,
  scheduleLoading,
  onDayChange,
}: ScheduleSectionProps) {
  const { t } = useTranslation();

  return (
    <section className="space-y-5 rounded-xl border border-default bg-surface p-6 shadow-sm space-y-3">
      <h2 className="text-base font-semibold text-primary">
        {t('resources.detail.scheduleSection')}
      </h2>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="date"
          value={scheduleDay}
          onChange={(e) => onDayChange(e.target.value)}
          className="rounded-lg border border-default bg-raised px-2 py-1.5 text-sm text-primary"
        />
        <div className="flex flex-wrap gap-1">
          {weekAnchors.map((iso) => {
            const [, mm, dd] = iso.split('-');
            const active = iso === scheduleDay;
            return (
              <button
                key={iso}
                type="button"
                onClick={() => onDayChange(iso)}
                className={cn(
                  'rounded px-2 py-0.5 text-xs font-medium border',
                  active
                    ? 'border-blue-500 bg-blue-600 text-white'
                    : 'border-default text-secondary hover:bg-hover',
                )}
              >
                {dd}.{mm}
              </button>
            );
          })}
        </div>
      </div>
      {scheduleLoading ? (
        <p className="text-sm text-secondary">{t('resources.detail.loadingSchedule')}</p>
      ) : (
        <ResourceDayTimeline dayDate={scheduleDay} slots={scheduleSlots} />
      )}
    </section>
  );
}
