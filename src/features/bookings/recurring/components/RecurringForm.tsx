import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { BookingResourceListItem } from '@/shared/types';
import { localTodayIso } from '@/shared/lib/recurringSeriesDates';

const DAYS_RU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

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
  freq: 'weekly' | 'daily';
  setFreq: (v: 'weekly' | 'daily') => void;
  startDate: string;
  setStartDate: (v: string) => void;
  endDate: string;
  setEndDate: (v: string) => void;
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
  padding: '9px 12px',
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--bg-raised)',
  color: 'var(--text-primary)',
  fontSize: 13,
  fontFamily: 'inherit',
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
  freq,
  setFreq,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  canCreate,
  isPending,
  onSubmit,
  onCancel,
  locale,
}: RecurringFormProps) {
  const { t } = useTranslation();

  const allowedDayLabels = useMemo(
    () => allowedDayOptions.map((opt) => DAYS_RU[opt.value] ?? ''),
    [allowedDayOptions],
  );

  const [selectedDayLabel, setSelectedDayLabelState] = useState<string>(
    () => DAYS_RU[allowedDayOptions[0]?.value ?? 0] ?? 'Пн',
  );

  const handleFreqChange = (nextFreq: 'weekly' | 'daily') => {
    setFreq(nextFreq);
    if (nextFreq === 'daily') {
      setDayOfWeek('0');
    } else {
      // restore the selected chip day
      const idx = DAYS_RU.indexOf(selectedDayLabel);
      setDayOfWeek(String(idx >= 0 ? idx : 0));
    }
  };

  const handleDayChipClick = (dayLabel: string) => {
    setSelectedDayLabelState(dayLabel);
    const idx = DAYS_RU.indexOf(dayLabel);
    setDayOfWeek(String(idx >= 0 ? idx : 0));
  };

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '20px',
      }}
    >
      {/* DS: form card title 14px bold */}
      <h2 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
        {t('recurring.createNewSeries')}
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* 1. Resource */}
        <div>
          <label style={labelStyle} htmlFor="rec-resource">
            {t('booking.recurring.resourceLabel')}
          </label>
          <select
            id="rec-resource"
            required
            value={resourceId}
            onChange={(e) => setResourceId(e.target.value)}
            style={{
              ...inputStyle,
              color: resourceId ? 'var(--text-primary)' : 'var(--text-muted)',
            }}
            disabled={resourcesLoading}
          >
            <option value="" style={{ color: 'var(--text-muted)' }}>{t('booking.recurring.selectResource')}</option>
            {resources.map((r) => (
              <option key={r.id} value={String(r.id)} style={{ color: 'var(--text-primary)' }}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        {/* 2. Frequency segmented toggle */}
        <div>
          <label style={labelStyle}>{t('recurring.freqLabel')}</label>
          <div
            style={{
              display: 'flex',
              background: 'var(--bg-raised)',
              borderRadius: 8,
              padding: 3,
              border: '1px solid var(--border)',
            }}
          >
            {([['weekly', t('recurring.freqWeekly')], ['daily', t('recurring.freqDaily')]] as const).map(([v, l]) => (
              <button
                key={v}
                type="button"
                onClick={() => handleFreqChange(v)}
                style={{
                  flex: 1,
                  padding: '7px',
                  borderRadius: 6,
                  border: 'none',
                  background: freq === v ? 'var(--bg-surface)' : 'transparent',
                  boxShadow: freq === v ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  color: freq === v ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontSize: 12,
                  fontWeight: freq === v ? 600 : 400,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.15s',
                }}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Day chips — only when weekly */}
        {freq === 'weekly' && (
          <div>
            <label style={labelStyle}>
              {t('recurring.daysLabel')}
              {resourceId && allowedDayLabels.length > 0 && (
                <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 4 }}>
                  {t('recurring.availDaysHint', { days: allowedDayLabels.join(', ') })}
                </span>
              )}
            </label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {DAYS_RU.map((d) => {
                const avail = allowedDayLabels.includes(d);
                const sel = selectedDayLabel === d;
                return (
                  <button
                    key={d}
                    type="button"
                    disabled={!avail}
                    onClick={() => handleDayChipClick(d)}
                    style={{
                      width: 40,
                      height: 36,
                      borderRadius: 8,
                      border: '1.5px solid',
                      borderColor: sel ? 'var(--brand)' : avail ? 'var(--border)' : 'var(--border-faint)',
                      background: sel ? 'var(--brand-subtle)' : 'var(--bg-surface)',
                      color: sel ? 'var(--brand-text, var(--brand))' : avail ? 'var(--text-secondary)' : 'var(--text-subtle)',
                      fontSize: 12,
                      fontWeight: sel ? 700 : 400,
                      cursor: avail ? 'pointer' : 'not-allowed',
                      fontFamily: 'inherit',
                      opacity: avail ? 1 : 0.4,
                      transition: 'all 0.15s',
                    }}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. Time row */}
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

        {/* 5. Date range: Начало серии + Конец серии */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={labelStyle} htmlFor="rec-date-from">
              {t('recurring.dateFromLabel')}
            </label>
            <input
              id="rec-date-from"
              type="date"
              required
              min={localTodayIso()}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              lang={locale}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle} htmlFor="rec-until">
              {t('recurring.dateToLabel')}
            </label>
            <input
              id="rec-until"
              type="date"
              required
              min={localTodayIso()}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              lang={locale}
              style={inputStyle}
            />
          </div>
        </div>

        {/* 6. Hint: no creatable dates */}
        {resourceId && !canCreate && (
          <p style={{ margin: 0, fontSize: 12, color: 'var(--danger)' }}>
            {t('booking.recurring.noCreatableDates')}
          </p>
        )}

        {/* 7. Actions — DS: ghost cancel, then primary create */}
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button
            type="button"
            onClick={onCancel}
            className="nlh-btn"
            style={{
              padding: '9px 16px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text-secondary)',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={isPending || !resourceId || (freq === 'weekly' && allowedDayOptions.length === 0) || !canCreate}
            style={{
              flex: 1,
              padding: '9px 0',
              borderRadius: 8,
              border: 'none',
              background: 'var(--brand)',
              color: 'var(--text-on-brand)',
              fontSize: 13,
              fontWeight: 600,
              fontFamily: 'inherit',
              cursor: (isPending || !resourceId || (freq === 'weekly' && allowedDayOptions.length === 0) || !canCreate) ? 'not-allowed' : 'pointer',
              opacity: (isPending || !resourceId || (freq === 'weekly' && allowedDayOptions.length === 0) || !canCreate) ? 0.5 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            {isPending ? t('common.creating') : t('booking.recurring.createBtn')}
          </button>
        </div>
      </div>
    </div>
  );
}
