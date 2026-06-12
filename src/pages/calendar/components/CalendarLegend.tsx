import { useTranslation } from 'react-i18next';

import { CALENDAR_EVENT_TYPE_LABEL_KEYS } from '@/shared/config/constants';

import { CALENDAR_EVENT_LEGEND } from '../calendarConstants';

export function CalendarLegend() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center gap-x-[18px] gap-y-2 px-1 pb-4">
      {CALENDAR_EVENT_LEGEND.map(({ type, color }) => (
        <div key={type} className="flex items-center gap-2 text-[12.5px] font-semibold text-secondary">
          <span className="h-[13px] w-[13px] rounded-[4px]" style={{ backgroundColor: color }} />
          {t(CALENDAR_EVENT_TYPE_LABEL_KEYS[type])}
        </div>
      ))}
    </div>
  );
}
