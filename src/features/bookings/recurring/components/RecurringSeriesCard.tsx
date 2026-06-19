import React from 'react';
import { useTranslation } from 'react-i18next';
import type { RecurringBooking } from '@/shared/types';
import { recurringSeriesDateEntries } from '@/shared/lib/recurringSeriesDates';

interface RecurringSeriesCardProps {
  series: RecurringBooking;
  resourceName: string;
  dayLabel: string;
  onCancel?: () => void;
}

function RecurringSeriesCardInner({ series, resourceName, dayLabel, onCancel }: RecurringSeriesCardProps) {
  const { t } = useTranslation();

  const entries = recurringSeriesDateEntries({
    dayOfWeek: series.day_of_week,
    validFrom: series.valid_from,
    repeatUntil: series.valid_until,
    endTime: series.end_time,
  });

  const nextEntry = entries.find((e) => e.status === 'will_create');

  const isActive = series.is_active && nextEntry !== undefined;
  const statusLabel = isActive ? t('booking.recurring.activeLabel') : t('booking.recurring.completedLabel');

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {/* Icon */}
        <span
          style={{
            flexShrink: 0,
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'var(--brand-subtle)',
            color: 'var(--brand-text)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-hidden="true"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M17 2l4 4-4 4" />
            <path d="M3 11V9a4 4 0 0 1 4-4h14" />
            <path d="M7 22l-4-4 4-4" />
            <path d="M21 13v2a4 4 0 0 1-4 4H3" />
          </svg>
        </span>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
              {resourceName}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                padding: '1px 7px',
                borderRadius: 20,
                background: isActive ? 'rgba(52,211,153,0.12)' : 'var(--bg-raised)',
                color: isActive ? 'var(--success)' : 'var(--text-muted)',
              }}
            >
              {statusLabel}
            </span>
          </div>
          {/* Frequency label */}
          <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
            {dayLabel} · {series.start_time.slice(0, 5)}–{series.end_time.slice(0, 5)}
          </p>
        </div>
      </div>

      {/* Period row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 12 }}>
        <div>
          <span style={{ color: 'var(--text-muted)' }}>{t('booking.recurring.periodLabel')}: </span>
          <span style={{ color: 'var(--text-secondary)' }}>
            {series.valid_from}
            {series.valid_until ? ` – ${series.valid_until}` : ''}
          </span>
        </div>
        {nextEntry && (
          <div>
            <span style={{ color: 'var(--text-muted)' }}>{t('booking.recurring.nextLabel')}: </span>
            <span style={{ color: 'var(--text-secondary)' }}>{nextEntry.iso}</span>
          </div>
        )}
      </div>

      {/* Cancel button */}
      {onCancel && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '5px 14px',
              borderRadius: 8,
              border: '1px solid var(--danger)',
              background: 'transparent',
              color: 'var(--danger)',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {t('booking.recurring.cancelSeries')}
          </button>
        </div>
      )}
    </div>
  );
}

export const RecurringSeriesCard = React.memo(RecurringSeriesCardInner);
