import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { BookingResourceListItem } from '@/shared/types';
import { previewRecurringSeriesDates } from '@/shared/lib/recurringSeriesDates';
import { localTodayIso } from '@/shared/lib/recurringSeriesDates';

interface DayOption {
  value: number;
  label: string;
}

interface RecurringFormProps {
  resources: BookingResourceListItem[];
  resourcesLoading: boolean;
  dayOptions: DayOption[];
  allowedDayOptions: DayOption[];
  resourceId: string;
  setResourceId: (v: string) => void;
  dayOfWeek: string;
  setDayOfWeek: (v: string) => void;
  startTime: string;
  setStartTime: (v: string) => void;
  endTime: string;
  setEndTime: (v: string) => void;
  repeatUntil: string;
  setRepeatUntil: (v: string) => void;
  canCreate: boolean;
  isPending: boolean;
  onSubmit: () => void;
  onCancel: () => void;
  locale: string;
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 500,
  color: 'var(--text-secondary)',
  marginBottom: 5,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--bg-raised)',
  color: 'var(--text-primary)',
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
};

export function RecurringForm({
  resources,
  resourcesLoading,
  allowedDayOptions,
  resourceId,
  setResourceId,
  dayOfWeek,
  setDayOfWeek,
  startTime,
  setStartTime,
  endTime,
  setEndTime,
  repeatUntil,
  setRepeatUntil,
  canCreate,
  isPending,
  onSubmit,
  onCancel,
  locale,
}: RecurringFormProps) {
  const { t } = useTranslation();

  const previewEntries = useMemo(() => {
    if (!resourceId || !repeatUntil || !endTime) return [];
    return previewRecurringSeriesDates({
      dayOfWeek: Number(dayOfWeek),
      repeatUntil,
      endTime,
    });
  }, [resourceId, dayOfWeek, repeatUntil, endTime]);

  const willCreateCount = previewEntries.filter((e) => e.status === 'will_create').length;
  const skippedCount = previewEntries.filter((e) => e.status === 'skipped_past').length;

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
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) 380px',
        gap: 20,
      }}
      className="recurring-form-grid"
    >
      {/* Left: form card */}
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '20px 20px',
        }}
      >
        <h2 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
          {t('booking.recurring.createSection')}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Resource */}
          <div>
            <label style={labelStyle} htmlFor="rec-resource">
              {t('booking.recurring.resourceLabel')}
            </label>
            <select
              id="rec-resource"
              required
              value={resourceId}
              onChange={(e) => setResourceId(e.target.value)}
              style={inputStyle}
              disabled={resourcesLoading}
            >
              <option value="">{t('booking.recurring.selectResource')}</option>
              {resources.map((r) => (
                <option key={r.id} value={String(r.id)}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* Day of week */}
          <div>
            <label style={labelStyle} htmlFor="rec-day">
              {t('booking.recurring.dayOfWeekLabel')}
            </label>
            <select
              id="rec-day"
              required
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(e.target.value)}
              style={inputStyle}
              disabled={allowedDayOptions.length === 0}
            >
              {allowedDayOptions.map((opt) => (
                <option key={opt.value} value={String(opt.value)}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Time row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle} htmlFor="rec-start">
                {t('common.start')}
              </label>
              <input
                id="rec-start"
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                lang={locale}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle} htmlFor="rec-end">
                {t('common.end')}
              </label>
              <input
                id="rec-end"
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                lang={locale}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Repeat until */}
          <div>
            <label style={labelStyle} htmlFor="rec-until">
              {t('booking.recurring.repeatUntilLabel')}
            </label>
            <input
              id="rec-until"
              type="date"
              required
              min={localTodayIso()}
              value={repeatUntil}
              onChange={(e) => setRepeatUntil(e.target.value)}
              lang={locale}
              style={inputStyle}
            />
          </div>

          {/* Hint: no creatable dates */}
          {resourceId && !canCreate && (
            <p style={{ margin: 0, fontSize: 12, color: 'var(--danger)' }}>
              {t('booking.recurring.noCreatableDates')}
            </p>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button
              type="button"
              onClick={onSubmit}
              disabled={isPending || !resourceId || allowedDayOptions.length === 0 || !canCreate}
              style={{
                flex: 1,
                padding: '9px 0',
                borderRadius: 8,
                border: 'none',
                background: 'var(--brand)',
                color: 'var(--text-on-brand)',
                fontSize: 13,
                fontWeight: 600,
                cursor: (isPending || !resourceId || allowedDayOptions.length === 0 || !canCreate) ? 'not-allowed' : 'pointer',
                opacity: (isPending || !resourceId || allowedDayOptions.length === 0 || !canCreate) ? 0.5 : 1,
                transition: 'opacity 0.15s',
              }}
            >
              {isPending ? t('common.creating') : t('booking.recurring.createBtn')}
            </button>
            <button
              type="button"
              onClick={onCancel}
              style={{
                padding: '9px 16px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--bg-raised)',
                color: 'var(--text-secondary)',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      </div>

      {/* Right: live preview panel */}
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '20px',
          alignSelf: 'start',
          position: 'sticky',
          top: 20,
        }}
      >
        <h3 style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
          {t('recurring.previewHeader')}
        </h3>

        {previewEntries.length === 0 ? (
          <p style={{ margin: '12px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
            {t('recurring.previewEmpty')}
          </p>
        ) : (
          <>
            {/* Summary pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '10px 0 12px' }}>
              {willCreateCount > 0 && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    padding: '2px 8px',
                    borderRadius: 20,
                    background: 'var(--brand-subtle)',
                    color: 'var(--brand-text)',
                  }}
                >
                  {t('recurring.willCreateCount', { count: willCreateCount })}
                </span>
              )}
              {skippedCount > 0 && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    padding: '2px 8px',
                    borderRadius: 20,
                    background: 'var(--bg-raised)',
                    color: 'var(--text-muted)',
                  }}
                >
                  {t('recurring.skipped')}: {skippedCount}
                </span>
              )}
            </div>

            {/* Date list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 320, overflowY: 'auto' }}>
              {previewEntries.map((entry) => {
                const isCreate = entry.status === 'will_create';
                return (
                  <div
                    key={entry.iso}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 10px',
                      borderRadius: 7,
                      background: isCreate ? 'var(--brand-subtle)' : 'transparent',
                      opacity: isCreate ? 1 : 0.5,
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: isCreate ? 'var(--brand)' : 'var(--text-muted)',
                        flexShrink: 0,
                      }}
                      aria-hidden="true"
                    />
                    <span style={{ fontSize: 12, color: 'var(--text-primary)', flex: 1 }}>
                      {formatDate(entry.iso)}
                    </span>
                    <span style={{ fontSize: 11, color: isCreate ? 'var(--brand-text)' : 'var(--text-muted)' }}>
                      {isCreate ? t('recurring.willCreate') : t('recurring.skipped')}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Mobile: collapse preview to single column */}
      <style>{`
        @media (max-width: 720px) {
          .recurring-form-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
