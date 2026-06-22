import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/cn';
import {
  BOOKING_STATUSES,
  BOOKING_STATUS_LABEL_KEYS,
  type BookingStatus,
} from '@/shared/config/constants';

interface BookingStatusBadgeProps {
  status: string;
  className?: string;
}

export function BookingStatusBadge({ status, className }: BookingStatusBadgeProps) {
  const { t } = useTranslation();

  const colorClass = useMemo(() => {
    switch (status) {
      case BOOKING_STATUSES.CONFIRMED:
      case BOOKING_STATUSES.CHECKED_IN:
        return 'bg-[color:var(--status-free-bg)] text-[color:var(--status-free-text)]';
      case 'pending':
        return 'bg-[color:var(--status-soon-bg)] text-[color:var(--status-soon-text)]';
      case BOOKING_STATUSES.CANCELLED:
      case BOOKING_STATUSES.NO_SHOW:
        return 'bg-[color:var(--status-busy-bg)] text-[color:var(--status-busy-text)]';
      case BOOKING_STATUSES.COMPLETED:
        return 'bg-[color:var(--status-na-bg)] text-[color:var(--status-na-text)]';
      default:
        return 'bg-[color:var(--status-na-bg)] text-[color:var(--status-na-text)]';
    }
  }, [status]);

  const label = BOOKING_STATUS_LABEL_KEYS[status as BookingStatus]
    ? t(BOOKING_STATUS_LABEL_KEYS[status as BookingStatus])
    : status;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium',
        colorClass,
        className,
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current flex-shrink-0" aria-hidden="true" />
      {label}
    </span>
  );
}
