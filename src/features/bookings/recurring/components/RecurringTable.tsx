import React, { Fragment, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, XCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import type { Booking, PaginatedResponse, RecurringBooking } from '@/shared/types';
import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { recurringSeriesDateEntries } from '@/shared/lib/recurringSeriesDates';
import { RecurringBadge } from '@/features/bookings/recurring/components/RecurringBadge';
import { BookingStatusBadge } from '@/pages/bookings/components/BookingStatusBadge';
import { CheckInButton, CheckInUrgencyBadge, canCheckIn as isCheckInAllowed, getCheckInUrgency } from '@/features/bookings/components/CheckInButton';

interface RecurringTableProps {
  rows: RecurringBooking[];
  resourceNameById: Map<number, string>;
  dayLabels: string[];
  isSuperadmin: boolean;
  isLoading: boolean;
  onCancelSeries: (id: number) => void;
  onCancelBooking: (bookingId: number, label: string) => void;
  canCancel: (row: RecurringBooking) => boolean;
  isCancelling: boolean;
  locale: string;
}

const GRID = '2.5fr 1.5fr 1.5fr 1fr 80px 80px';

function SkeletonRow() {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: GRID,
        gap: 8,
        padding: '12px 20px',
        borderBottom: '1px solid var(--border-faint)',
      }}
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          style={{
            height: 16,
            borderRadius: 6,
            background: 'var(--bg-raised)',
            animation: 'pulse 1.5s ease-in-out infinite',
            opacity: i > 3 ? 0.5 : 1,
          }}
        />
      ))}
    </div>
  );
}

interface SeriesBookingsPanelProps {
  row: RecurringBooking;
  locale: string;
  canCancel: (row: RecurringBooking) => boolean;
  onCancelBooking: (bookingId: number, label: string) => void;
  isCancelling: boolean;
}

// NOTE: The expanded panel fetches bookings via ?recurring_booking_id={id}.
// This requires the backend to expose `recurring_booking_id` as a filterable
// query param on GET /bookings/reservations/. If the backend does not support
// this filter, the fetch will return all bookings unfiltered and the fallback
// (computed dates) will be shown instead.
function SeriesBookingsPanel({ row, locale, canCancel, onCancelBooking, isCancelling }: SeriesBookingsPanelProps) {
  const { t } = useTranslation();

  const entryDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }),
    [locale],
  );

  const { data: seriesBookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ['recurring-series-bookings', row.id],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<Booking> | Booking[]>(
        API.bookings.reservations.list,
        { params: { recurring_booking_id: row.id, ordering: 'start_time', page_size: 50 } },
      );
      return Array.isArray(data) ? data : data.results;
    },
    enabled: true,
  });

  // Fallback: computed dates (no booking IDs, no cancel buttons)
  const fallbackEntries = useMemo(
    () =>
      recurringSeriesDateEntries({
        dayOfWeek: row.day_of_week,
        validFrom: row.valid_from,
        repeatUntil: row.valid_until,
        endTime: row.end_time,
        recurrenceType: row.recurrence_type ?? 'weekly',
      }),
    [row],
  );

  // Use real bookings if we got a non-empty result, otherwise fall back
  const useRealBookings = !bookingsLoading && seriesBookings !== undefined && seriesBookings.length > 0;

  if (bookingsLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            style={{
              height: 36,
              borderRadius: 8,
              background: 'var(--bg-raised)',
              animation: 'pulse 1.5s ease-in-out infinite',
              opacity: 1 - i * 0.2,
            }}
          />
        ))}
      </div>
    );
  }

  if (useRealBookings) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {seriesBookings!.map((booking) => {
          const startDate = new Date(booking.start_time);
          const endDate = new Date(booking.end_time);
          const formattedDate = entryDateFormatter.format(startDate);
          const endTime = endDate.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
          const label = `${booking.resource_name} · ${formattedDate}–${endTime}`;

          const isConfirmed = booking.status === 'confirmed';
          const isCancelled = booking.status === 'cancelled';
          const bookingNotStarted = new Date(booking.start_time) > new Date();
          const panelNow = new Date();
          const checkInAllowed = isCheckInAllowed(booking, panelNow);
          const urgency = getCheckInUrgency(booking, panelNow);

          return (
            <div
              key={booking.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '8px 12px',
                borderRadius: 8,
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-faint)',
                opacity: isCancelled ? 0.6 : 1,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {formattedDate}–{endTime}
                </span>
                {urgency !== 'none' && (
                  <div style={{ marginTop: 3 }}>
                    <CheckInUrgencyBadge urgency={urgency} />
                  </div>
                )}
              </div>
              <BookingStatusBadge status={booking.status} />
              {checkInAllowed && (
                <CheckInButton booking={booking} variant="row" />
              )}
              {isConfirmed && row.is_active && canCancel(row) && bookingNotStarted && (
                <button
                  type="button"
                  disabled={isCancelling}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: isCancelling ? 'not-allowed' : 'pointer',
                    fontSize: 11,
                    color: 'var(--danger)',
                    padding: '2px 6px',
                    borderRadius: 4,
                    flexShrink: 0,
                    opacity: isCancelling ? 0.5 : 1,
                  }}
                  onClick={(e) => { e.stopPropagation(); onCancelBooking(booking.id, label); }}
                >
                  {t('recurring.cancelEntry')}
                </button>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Fallback: computed dates without real IDs
  if (fallbackEntries.length === 0) {
    return (
      <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
        {t('booking.recurring.previewNoDates')}
      </p>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {fallbackEntries.map((entry) => {
        const entryStatus = entry.status === 'will_create' ? 'confirmed' : 'completed';
        const entryFmt = new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short' });
        const formattedDate = entryFmt.format(new Date(`${entry.iso}T12:00:00`));
        return (
          <div
            key={entry.iso}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '8px 12px',
              borderRadius: 8,
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-faint)',
            }}
          >
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1 }}>
              {formattedDate} · {row.start_time.slice(0, 5)}–{row.end_time.slice(0, 5)}
            </span>
            <BookingStatusBadge status={entryStatus} />
          </div>
        );
      })}
    </div>
  );
}

function RecurringTableInner({
  rows,
  resourceNameById,
  dayLabels,
  isSuperadmin,
  isLoading,
  onCancelSeries,
  onCancelBooking,
  canCancel,
  isCancelling,
  locale,
}: RecurringTableProps) {
  const { t } = useTranslation();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  // DS: "Следующее" cell — day + month only, no weekday, no year
  const nextDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        day: 'numeric',
        month: 'short',
      }),
    [locale],
  );

  const formatNextDate = (iso: string) => nextDateFormatter.format(new Date(`${iso}T12:00:00`));

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        overflow: 'hidden',
      }}
      role="table"
      aria-label={t('booking.recurring.seriesTab')}
    >
      {/* Header row */}
      <div
        role="row"
        style={{
          display: 'grid',
          gridTemplateColumns: GRID,
          gap: 8,
          padding: '10px 20px',
          background: 'var(--bg-raised)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        {(['booking.recurring.resourceScheduleLabel', 'booking.recurring.periodLabel', 'booking.recurring.statusLabel', 'booking.recurring.doneLabel', 'booking.recurring.nextLabel'] as const).map((key) => (
          <span
            key={key}
            role="columnheader"
            style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}
          >
            {t(key)}
          </span>
        ))}
        <span role="columnheader" aria-label={t('booking.manage.actions')} />
      </div>

      {/* Loading state */}
      {isLoading && (
        <>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </>
      )}

      {/* Empty state */}
      {!isLoading && rows.length === 0 && (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          {t('booking.recurring.noSeries')}
        </div>
      )}

      {/* Rows */}
      {!isLoading && rows.map((row) => {
        const isExpanded = expandedId === row.id;
        const isHovered = hoveredId === row.id;
        const resourceName = resourceNameById.get(row.resource_id)
          ?? t('booking.recurring.resourcePrefix', { id: row.resource_id });
        const seriesEntries = recurringSeriesDateEntries({
          dayOfWeek: row.day_of_week,
          validFrom: row.valid_from,
          repeatUntil: row.valid_until,
          endTime: row.end_time,
          recurrenceType: row.recurrence_type ?? 'weekly',
        });
        const nextEntry = seriesEntries.find((e) => e.status === 'will_create');
        const completedCount = seriesEntries.filter((e) => e.status === 'skipped_past').length;
        const totalCount = seriesEntries.length;
        const activeCount = seriesEntries.filter((e) => e.status === 'will_create').length;
        const isActive = row.is_active && nextEntry !== undefined;
        const completedRatio = totalCount > 0 ? completedCount / totalCount : 0;

        return (
          <Fragment key={row.id}>
            {/* Main row */}
            <div
              role="row"
              style={{
                display: 'grid',
                gridTemplateColumns: GRID,
                gap: 8,
                padding: '12px 20px',
                borderBottom: isExpanded ? 'none' : '1px solid var(--border-faint)',
                background: isExpanded || isHovered ? 'var(--bg-hover)' : 'transparent',
                cursor: 'pointer',
                transition: 'background 0.12s',
                alignItems: 'center',
              }}
              onMouseEnter={() => setHoveredId(row.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => setExpandedId((cur) => (cur === row.id ? null : row.id))}
              aria-expanded={isExpanded}
            >
              {/* Resource / Schedule cell */}
              <div role="cell" style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {resourceName}
                  </span>
                  <RecurringBadge idx={activeCount} total={totalCount} />
                </div>
                <span style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  {row.recurrence_type === 'daily' ? t('recurring.freqDaily') : t('recurring.freqWeekly')} · {row.start_time.slice(0, 5)}–{row.end_time.slice(0, 5)}
                </span>
                {isSuperadmin && row.user_name && (
                  <span style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>
                    {row.user_name}
                  </span>
                )}
              </div>

              {/* Period cell */}
              <div role="cell" style={{ fontSize: 12, color: 'var(--text-secondary)', minWidth: 0 }}>
                <span style={{ display: 'block' }}>{row.valid_from}</span>
                <span style={{ color: 'var(--text-muted)' }}>
                  {t('booking.recurring.periodUntilPrefix')} {row.valid_until ?? '—'}
                </span>
              </div>

              {/* Status cell */}
              <div role="cell">
                <BookingStatusBadge status={isActive ? 'confirmed' : 'completed'} />
                {isSuperadmin && row.user_name && (
                  <span style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>
                    {row.user_name}
                  </span>
                )}
              </div>

              {/* Done (Выполнено) cell — count + progress bar */}
              <div role="cell">
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                  {completedCount}/{totalCount}
                </div>
                <div
                  style={{
                    height: 4,
                    background: 'var(--border)',
                    borderRadius: 2,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      background: 'var(--brand)',
                      width: `${completedRatio * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* Next date cell */}
              <div
                role="cell"
                style={{
                  fontSize: 11,
                  color: nextEntry ? 'var(--brand-text, var(--brand))' : 'var(--text-subtle)',
                  textAlign: 'center',
                }}
              >
                {nextEntry ? formatNextDate(nextEntry.iso) : '—'}
              </div>

              {/* Actions cell */}
              <div
                role="cell"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Cancel button — only when series is active, canCancel, and next occurrence hasn't started */}
                {row.is_active && canCancel(row) && nextEntry !== undefined && new Date(`${nextEntry.iso}T${row.start_time}`) > new Date() && (
                  <button
                    type="button"
                    disabled={isCancelling}
                    onClick={() => onCancelSeries(row.id)}
                    aria-label={t('booking.recurring.cancelSeries')}
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--danger)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: isCancelling ? 'not-allowed' : 'pointer',
                      opacity: isCancelling ? 0.5 : 1,
                      flexShrink: 0,
                    }}
                  >
                    <XCircle style={{ width: 14, height: 14 }} aria-hidden="true" />
                  </button>
                )}
                {/* Expand chevron button */}
                <button
                  type="button"
                  aria-label={isExpanded ? t('common.collapse') : t('common.expand')}
                  onClick={(e) => { e.stopPropagation(); setExpandedId((cur) => (cur === row.id ? null : row.id)); }}
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    background: 'transparent',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  {isExpanded
                    ? <ChevronUp style={{ width: 13, height: 13 }} aria-hidden="true" />
                    : <ChevronDown style={{ width: 13, height: 13 }} aria-hidden="true" />}
                </button>
              </div>
            </div>

            {/* Expanded detail panel — real API bookings */}
            {isExpanded && (
              <div
                style={{
                  background: 'var(--bg-raised)',
                  borderBottom: '1px solid var(--border)',
                  padding: '12px 20px 12px 48px',
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    marginBottom: 10,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  {t('recurring.seriesLabel')}
                </div>
                <SeriesBookingsPanel
                  row={row}
                  locale={locale}
                  canCancel={canCancel}
                  onCancelBooking={onCancelBooking}
                  isCancelling={isCancelling}
                />
              </div>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

export const RecurringTable = React.memo(RecurringTableInner);
