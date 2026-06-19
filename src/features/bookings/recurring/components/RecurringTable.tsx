import React, { Fragment, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import type { RecurringBooking } from '@/shared/types';
import { recurringSeriesDateEntries } from '@/shared/lib/recurringSeriesDates';

interface RecurringTableProps {
  rows: RecurringBooking[];
  resourceNameById: Map<number, string>;
  dayLabels: string[];
  isSuperadmin: boolean;
  isLoading: boolean;
  onCancelSeries: (id: number) => void;
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
        padding: '12px 16px',
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

function RecurringTableInner({
  rows,
  resourceNameById,
  dayLabels,
  isSuperadmin,
  isLoading,
  onCancelSeries,
  canCancel,
  isCancelling,
  locale,
}: RecurringTableProps) {
  const { t } = useTranslation();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      }),
    [locale],
  );

  const formatDate = (iso: string) => dateFormatter.format(new Date(`${iso}T12:00:00`));

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
          padding: '10px 16px',
          background: 'var(--bg-raised)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <span role="columnheader" style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {t('dashboard.table.resource')}
        </span>
        <span role="columnheader" style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {t('booking.recurring.periodLabel')}
        </span>
        <span role="columnheader" style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {t('booking.recurring.statusLabel')}
        </span>
        <span role="columnheader" style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {t('booking.recurring.doneLabel')}
        </span>
        <span role="columnheader" style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {t('booking.recurring.nextLabel')}
        </span>
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
        <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          {t('booking.recurring.noSeries')}
        </div>
      )}

      {/* Rows */}
      {!isLoading && rows.map((row) => {
        const isExpanded = expandedId === row.id;
        const isHovered = hoveredId === row.id;
        const resourceName = resourceNameById.get(row.resource_id)
          ?? t('booking.recurring.resourcePrefix', { id: row.resource_id });
        const dayLabel = dayLabels[row.day_of_week] ?? String(row.day_of_week);
        const seriesEntries = recurringSeriesDateEntries({
          dayOfWeek: row.day_of_week,
          validFrom: row.valid_from,
          repeatUntil: row.valid_until,
          endTime: row.end_time,
        });
        const nextEntry = seriesEntries.find((e) => e.status === 'will_create');
        const completedCount = seriesEntries.filter((e) => e.status === 'skipped_past').length;
        const isActive = row.is_active && nextEntry !== undefined;

        return (
          <Fragment key={row.id}>
            {/* Main row */}
            <div
              role="row"
              style={{
                display: 'grid',
                gridTemplateColumns: GRID,
                gap: 8,
                padding: '12px 16px',
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
              {/* Resource / Schedule */}
              <div role="cell" style={{ minWidth: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {resourceName}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                  {dayLabel} · {row.start_time.slice(0, 5)}–{row.end_time.slice(0, 5)}
                </span>
                {isSuperadmin && row.user_name && (
                  <span style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                    {row.user_name}
                  </span>
                )}
              </div>

              {/* Period */}
              <div role="cell" style={{ fontSize: 12, color: 'var(--text-secondary)', minWidth: 0 }}>
                <span style={{ display: 'block' }}>{row.valid_from}</span>
                {row.valid_until && (
                  <span style={{ color: 'var(--text-muted)' }}>– {row.valid_until}</span>
                )}
              </div>

              {/* Status */}
              <div role="cell">
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    fontSize: 12,
                    fontWeight: 500,
                    padding: '2px 9px',
                    borderRadius: 20,
                    background: isActive ? 'rgba(52,211,153,0.12)' : 'var(--bg-raised)',
                    color: isActive ? 'var(--success)' : 'var(--text-muted)',
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: 'currentColor',
                      flexShrink: 0,
                    }}
                    aria-hidden="true"
                  />
                  {isActive ? t('booking.recurring.activeLabel') : t('booking.recurring.completedLabel')}
                </span>
              </div>

              {/* Done count */}
              <div role="cell" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {completedCount > 0 ? completedCount : '—'}
              </div>

              {/* Next date */}
              <div role="cell" style={{ fontSize: 12, color: 'var(--text-secondary)', minWidth: 0 }}>
                {nextEntry ? (
                  <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {formatDate(nextEntry.iso)}
                  </span>
                ) : (
                  <span style={{ color: 'var(--text-muted)' }}>—</span>
                )}
              </div>

              {/* Actions */}
              <div
                role="cell"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}
                onClick={(e) => e.stopPropagation()}
              >
                {canCancel(row) && (
                  <button
                    type="button"
                    disabled={isCancelling}
                    onClick={() => onCancelSeries(row.id)}
                    aria-label={t('booking.recurring.cancelSeries')}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      border: '1px solid var(--danger)',
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
                    <Trash2 style={{ width: 13, height: 13 }} aria-hidden="true" />
                  </button>
                )}
                <button
                  type="button"
                  aria-label={isExpanded ? t('common.collapse') : t('common.expand')}
                  onClick={(e) => { e.stopPropagation(); setExpandedId((cur) => (cur === row.id ? null : row.id)); }}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    background: 'var(--bg-raised)',
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

            {/* Expanded detail panel */}
            {isExpanded && (
              <div
                style={{
                  background: 'var(--bg-raised)',
                  borderBottom: '1px solid var(--border-faint)',
                  padding: '12px 16px 16px',
                }}
              >
                <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {t('recurring.seriesLabel')}
                </p>
                {seriesEntries.length === 0 ? (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                    {t('booking.recurring.previewNoDates')}
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {seriesEntries.map((entry) => {
                      const isCreate = entry.status === 'will_create';
                      return (
                        <div
                          key={entry.iso}
                          style={{
                            minWidth: 120,
                            padding: '8px 12px',
                            borderRadius: 8,
                            border: isCreate ? '1px solid var(--brand)' : '1px solid var(--border-faint)',
                            background: isCreate ? 'var(--brand-subtle)' : 'var(--bg-surface)',
                            opacity: isCreate ? 1 : 0.65,
                          }}
                        >
                          <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                            {formatDate(entry.iso)}
                          </p>
                          <p style={{ margin: '2px 0 0', fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                            {row.start_time.slice(0, 5)}–{row.end_time.slice(0, 5)}
                          </p>
                          <p
                            style={{
                              margin: '3px 0 0',
                              fontSize: 11,
                              fontWeight: 500,
                              color: isCreate ? 'var(--brand-text)' : 'var(--text-muted)',
                            }}
                          >
                            {isCreate ? t('booking.recurring.dateWillCreate') : t('booking.recurring.dateSkippedPast')}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

export const RecurringTable = React.memo(RecurringTableInner);
