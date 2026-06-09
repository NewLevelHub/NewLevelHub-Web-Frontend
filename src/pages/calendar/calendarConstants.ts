import { CALENDAR_EVENT_TYPES, type CalendarEventType } from '@/shared/config/constants';

export const CALENDAR_START_HOUR = 8;
export const CALENDAR_END_HOUR = 22;
export const CALENDAR_HOUR_HEIGHT_PX = 54;

export const CALENDAR_EVENT_LEGEND: { type: CalendarEventType; color: string }[] = [
  { type: CALENDAR_EVENT_TYPES.BOOKING, color: '#3B82F6' },
  { type: CALENDAR_EVENT_TYPES.TASK_DEADLINE, color: '#F59E0B' },
  { type: CALENDAR_EVENT_TYPES.LEAVE, color: '#8B5CF6' },
  { type: CALENDAR_EVENT_TYPES.GUEST_VISIT, color: '#10A072' },
];

/** Shared layout for time-grid event cards (colors come from CALENDAR_EVENT_BLOCK_CLASS). */
export const CALENDAR_GRID_EVENT_LAYOUT_CLASS =
  'overflow-hidden rounded-lg border border-l-[3px] px-1.5 py-1 text-left shadow-sm';

/** Minimum card height to always show icon + title + time range. */
export const CALENDAR_CARD_MIN_HEIGHT_PX = 44;

export const CALENDAR_EVENT_BLOCK_CLASS: Record<CalendarEventType, string> = {
  [CALENDAR_EVENT_TYPES.BOOKING]:
    'border-[#c4d8fb] bg-[#eaf1fe] text-[#1e54b7] border-l-[#3B82F6]',
  [CALENDAR_EVENT_TYPES.TASK_DEADLINE]:
    'border-[#f5d49a] bg-[#fef3e0] text-[#a96710] border-l-[#F59E0B]',
  [CALENDAR_EVENT_TYPES.LEAVE]:
    'border-[#d7c8fa] bg-[#efeafd] text-[#6a3fd0] border-l-[#8B5CF6]',
  [CALENDAR_EVENT_TYPES.GUEST_VISIT]:
    'border-[#bce3d2] bg-[#e3f4ec] text-[#0a7553] border-l-[#10A072]',
};

export const CALENDAR_EVENT_POPOVER_CLASS: Record<CalendarEventType, string> = {
  [CALENDAR_EVENT_TYPES.BOOKING]: 'bg-[#eaf1fe] text-[#1e54b7]',
  [CALENDAR_EVENT_TYPES.TASK_DEADLINE]: 'bg-[#fef3e0] text-[#a96710]',
  [CALENDAR_EVENT_TYPES.LEAVE]: 'bg-[#efeafd] text-[#6a3fd0]',
  [CALENDAR_EVENT_TYPES.GUEST_VISIT]: 'bg-[#e3f4ec] text-[#0a7553]',
};
