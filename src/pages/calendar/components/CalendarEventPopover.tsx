import { useEffect, useLayoutEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import {
  ArrowRight,
  Calendar,
  Clock,
  MapPin,
  Shield,
  User,
  X,
} from 'lucide-react';

import {
  CALENDAR_EVENT_TYPES,
  CALENDAR_EVENT_TYPE_LABEL_KEYS,
  LEAVE_TYPE_LABEL_KEYS,
  STAFF_UI_PREFIX,
  type LeaveType,
} from '@/shared/config/constants';
import i18n from '@/shared/lib/i18n';
import { fmtDate, fmtDateTime } from '@/shared/lib/formatDate';
import { cn } from '@/shared/lib/cn';
import type { CalendarEvent } from '@/shared/types';

import { CALENDAR_EVENT_POPOVER_CLASS } from '../calendarConstants';
import { daysBetweenInclusive, eventKey } from '../calendarUtils';

type Props = {
  event: CalendarEvent | null;
  anchorEl: HTMLElement | null;
  onClose: () => void;
};

function formatCalendarTitle(event: CalendarEvent) {
  if (event.type !== CALENDAR_EVENT_TYPES.LEAVE) {
    return event.title;
  }

  const [namePart, leaveTypeRaw] = event.title.split(' — ');
  if (!leaveTypeRaw) return event.title;

  const leaveType = leaveTypeRaw.trim().toLowerCase() as LeaveType;
  const labelKey = LEAVE_TYPE_LABEL_KEYS[leaveType];
  const translated = labelKey ? i18n.t(labelKey) : undefined;
  if (!translated) return event.title;

  return `${namePart} — ${translated}`;
}

function PopoverRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Calendar;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted" strokeWidth={1.8} />
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.03em] text-muted">{label}</div>
        <div className="text-[13.5px] font-medium text-primary">{value}</div>
      </div>
    </div>
  );
}

export function CalendarEventPopover({ event, anchorEl, onClose }: Props) {
  const { t } = useTranslation();
  const popRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!event || !anchorEl || !popRef.current) return;

    const pop = popRef.current;
    const isMobile = window.matchMedia('(max-width: 639px)').matches;

    if (isMobile) {
      pop.style.left = '12px';
      pop.style.right = '12px';
      pop.style.top = 'auto';
      pop.style.bottom = '12px';
      pop.style.width = 'auto';
      return;
    }

    const rect = anchorEl.getBoundingClientRect();
    const pw = pop.offsetWidth;
    const ph = pop.offsetHeight;

    let left = rect.right + 10;
    if (left + pw > window.innerWidth - 12) left = rect.left - pw - 10;
    if (left < 12) left = Math.min(rect.left, window.innerWidth - pw - 12);

    let top = rect.top;
    if (top + ph > window.innerHeight - 12) top = window.innerHeight - ph - 12;
    if (top < 12) top = 12;

    pop.style.left = `${left}px`;
    pop.style.top = `${top}px`;
    pop.style.right = 'auto';
    pop.style.bottom = 'auto';
    pop.style.width = '300px';
  }, [event, anchorEl]);

  useEffect(() => {
    if (!event) return undefined;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (popRef.current?.contains(target)) return;
      if (anchorEl?.contains(target)) return;
      onClose();
    };

    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onMouseDown);
    window.addEventListener('resize', onClose);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('resize', onClose);
    };
  }, [event, anchorEl, onClose]);

  if (!event) return null;

  const title = formatCalendarTitle(event);
  const typeLabel = t(CALENDAR_EVENT_TYPE_LABEL_KEYS[event.type]);
  const startDate = event.start.slice(0, 10);
  const endDate = event.end.slice(0, 10);

  let dateLine = '';
  if (event.type === CALENDAR_EVENT_TYPES.LEAVE) {
    const days = daysBetweenInclusive(startDate, endDate);
    dateLine = `${fmtDate(startDate, { day: '2-digit', month: 'short' })} – ${fmtDate(endDate, { day: '2-digit', month: 'short', year: 'numeric' })} · ${t('calendar.daysCount', { count: days })}`;
  } else if (event.type === CALENDAR_EVENT_TYPES.TASK_DEADLINE) {
    dateLine = fmtDateTime(event.start);
  } else {
    dateLine = `${fmtDateTime(event.start)} – ${fmtDateTime(event.end)}`;
  }

  const popoverTitle =
    event.type === CALENDAR_EVENT_TYPES.GUEST_VISIT
      ? `${t('calendar.guestPrefix')}: ${event.title}`
      : title;

  return (
    <div
      ref={popRef}
      className="fixed z-[80] w-[300px] max-w-[calc(100vw-24px)] overflow-hidden rounded-[14px] border border-default bg-surface opacity-100 shadow-[var(--shadow-pop)]"
      role="dialog"
      aria-label={popoverTitle}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-lg border-0 bg-raised text-secondary hover:bg-hover"
        aria-label={t('common.close')}
      >
        <X className="h-4 w-4" />
      </button>

      <div className="border-b border-default px-4 pt-[15px] pb-3">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-bold tracking-[0.02em] uppercase',
            CALENDAR_EVENT_POPOVER_CLASS[event.type],
          )}
        >
          {typeLabel}
        </span>
        <div className="mt-2.5 pr-8 text-base font-bold tracking-[-0.01em] text-primary">{popoverTitle}</div>
      </div>

      <div className="flex flex-col gap-2.5 px-4 py-3">
        {event.type === CALENDAR_EVENT_TYPES.BOOKING && (
          <>
            <PopoverRow icon={MapPin} label={t('calendar.popover.resource')} value={event.title} />
            <PopoverRow icon={Calendar} label={t('calendar.popover.dateTime')} value={dateLine} />
            <PopoverRow icon={User} label={t('team.roleEmployee')} value={event.user.full_name} />
          </>
        )}
        {event.type === CALENDAR_EVENT_TYPES.TASK_DEADLINE && (
          <>
            <PopoverRow icon={Clock} label={t('calendar.popover.task')} value={event.title} />
            <PopoverRow icon={Calendar} label={t('calendar.popover.deadline')} value={dateLine} />
            <PopoverRow icon={User} label={t('calendar.popover.assignee')} value={event.user.full_name} />
          </>
        )}
        {event.type === CALENDAR_EVENT_TYPES.GUEST_VISIT && (
          <>
            <PopoverRow icon={User} label={t('calendar.popover.guest')} value={event.title} />
            <PopoverRow icon={Calendar} label={t('calendar.popover.dateTime')} value={dateLine} />
            <PopoverRow icon={User} label={t('calendar.popover.invitedBy')} value={event.user.full_name} />
          </>
        )}
        {event.type === CALENDAR_EVENT_TYPES.LEAVE && (
          <>
            <PopoverRow icon={Shield} label={t('calendar.popover.type')} value={title} />
            <PopoverRow icon={Calendar} label={t('calendar.popover.period')} value={dateLine} />
            <PopoverRow icon={User} label={t('team.roleEmployee')} value={event.user.full_name} />
          </>
        )}
      </div>

      <div className="border-t border-default bg-raised px-4 py-3">
        {event.type === CALENDAR_EVENT_TYPES.LEAVE ? (
          <div className="py-0.5 text-center text-[12.5px] text-muted">{t('calendar.readOnlyApproved')}</div>
        ) : event.type === CALENDAR_EVENT_TYPES.BOOKING ? (
          <Link
            to={`${STAFF_UI_PREFIX}/bookings`}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-[10px] border border-brand bg-surface text-[13.5px] font-semibold text-brand-text no-underline hover:bg-brand-subtle"
            onClick={onClose}
          >
            {t('calendar.openBooking')}
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : (
          <button
            type="button"
            className="flex h-10 w-full items-center justify-center gap-2 rounded-[10px] border border-brand bg-surface text-[13.5px] font-semibold text-brand-text hover:bg-brand-subtle"
            onClick={onClose}
          >
            {event.type === CALENDAR_EVENT_TYPES.TASK_DEADLINE && t('calendar.openTask')}
            {event.type === CALENDAR_EVENT_TYPES.GUEST_VISIT && t('calendar.openPass')}
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
