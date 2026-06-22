import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LogIn, AlertTriangle, Clock } from 'lucide-react';
import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { BOOKING_STATUSES, RESOURCE_TYPES } from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';
import type { Booking } from '@/shared/types';

/** How many minutes after start before no_show kicks in. Must match backend. */
const NO_SHOW_WINDOW_MINUTES = 15;

export type CheckInUrgency = 'none' | 'warning' | 'expired';

/** Pure helper — determines urgency state for a booking. Returns 'none' when
 *  the check-in window is not open or check-in is already done.  */
export function getCheckInUrgency(booking: Booking, now: Date): CheckInUrgency {
  if (
    booking.status !== BOOKING_STATUSES.CONFIRMED ||
    booking.resource_type !== RESOURCE_TYPES.MEETING_ROOM ||
    booking.checked_in_at
  ) {
    return 'none';
  }

  const start = new Date(booking.start_time);
  const end = new Date(booking.end_time);

  if (now < start || now > end) return 'none';

  const minutesSinceStart = (now.getTime() - start.getTime()) / 60_000;

  if (minutesSinceStart >= NO_SHOW_WINDOW_MINUTES) return 'expired';
  return 'warning';
}

/** Returns true when the check-in button should be rendered. */
export function canCheckIn(booking: Booking, now: Date): boolean {
  if (
    booking.status !== BOOKING_STATUSES.CONFIRMED ||
    booking.resource_type !== RESOURCE_TYPES.MEETING_ROOM ||
    booking.checked_in_at
  ) {
    return false;
  }

  const start = new Date(booking.start_time);
  const end = new Date(booking.end_time);
  return now >= start && now <= end;
}

interface CheckInUrgencyBadgeProps {
  urgency: CheckInUrgency;
  className?: string;
}

/** Small inline badge that shows the urgency hint text only (no button). */
export function CheckInUrgencyBadge({ urgency, className }: CheckInUrgencyBadgeProps) {
  const { t } = useTranslation();

  if (urgency === 'none') return null;

  if (urgency === 'expired') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
          className,
        )}
        style={{
          background: 'var(--danger-bg)',
          color: 'var(--danger-text, var(--danger))',
        }}
        role="status"
        aria-label={t('booking.checkIn.expiredHint')}
      >
        <AlertTriangle style={{ width: 10, height: 10 }} aria-hidden="true" />
        {t('booking.checkIn.expiredHint')}
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
        className,
      )}
      style={{
        background: 'var(--warning-bg)',
        color: 'var(--warning-text, var(--warning))',
      }}
      role="status"
      aria-label={t('booking.checkIn.urgentHint')}
    >
      <Clock style={{ width: 10, height: 10 }} aria-hidden="true" />
      {t('booking.checkIn.urgentHint')}
    </span>
  );
}

interface CheckInButtonProps {
  booking: Booking;
  /** Called after a successful check-in (optional, for local UI refresh). */
  onSuccess?: () => void;
  /** Additional class names for the button wrapper. */
  className?: string;
  /** Visual variant — 'row' is compact (fits in a table row), 'full' is wide. */
  variant?: 'row' | 'full';
}

/**
 * Self-contained check-in button.
 *
 * Renders nothing when the booking does not satisfy check-in conditions:
 *  - status must be 'confirmed'
 *  - resource_type must be 'meeting_room'
 *  - current time must be within [start_time, end_time]
 *  - checked_in_at must be null
 *
 * Handles the POST /bookings/reservations/{id}/check-in/ mutation internally
 * and invalidates 'my-bookings', 'booking-reservation', 'admin-bookings', and
 * 'recurring-series-bookings' query keys on success.
 */
function CheckInButtonInner({
  booking,
  onSuccess,
  className,
  variant = 'row',
}: CheckInButtonProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const now = useMemo(() => new Date(), []);
  const shouldShow = canCheckIn(booking, now);
  const urgency = getCheckInUrgency(booking, now);

  const mutation = useMutation({
    mutationFn: async () => {
      await apiClient.post(API.bookings.reservations.checkIn(String(booking.id)));
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['my-bookings'] }),
        queryClient.invalidateQueries({ queryKey: ['booking-reservation'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-bookings'] }),
        queryClient.invalidateQueries({ queryKey: ['recurring-series-bookings', booking.recurring_booking_id] }),
      ]);
      onSuccess?.();
    },
  });

  if (!shouldShow) return null;

  if (variant === 'full') {
    return (
      <div className={cn('flex flex-col gap-1.5', className)}>
        {urgency !== 'none' && <CheckInUrgencyBadge urgency={urgency} />}
        <button
          type="button"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate()}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
          aria-label={t('booking.checkIn.btn')}
        >
          <LogIn className="h-4 w-4" aria-hidden="true" />
          {mutation.isPending ? t('booking.checkIn.pending') : t('booking.checkIn.btn')}
        </button>
      </div>
    );
  }

  // variant === 'row' — compact inline button
  return (
    <button
      type="button"
      disabled={mutation.isPending}
      onClick={(e) => {
        e.stopPropagation();
        mutation.mutate();
      }}
      className={cn(
        'inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium text-white transition-opacity disabled:opacity-50',
        className,
      )}
      style={{
        background: urgency === 'expired' ? 'var(--danger)' : 'var(--brand)',
      }}
      aria-label={t('booking.checkIn.btn')}
      title={urgency === 'expired' ? t('booking.checkIn.expiredHint') : t('booking.checkIn.urgentHint')}
    >
      <LogIn style={{ width: 10, height: 10 }} aria-hidden="true" />
      {mutation.isPending ? '…' : t('booking.checkIn.btn')}
    </button>
  );
}

export const CheckInButton = React.memo(CheckInButtonInner);
