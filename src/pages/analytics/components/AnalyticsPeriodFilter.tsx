import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/cn';

export type PeriodValue = '7d' | '30d' | '90d' | 'custom';

interface AnalyticsPeriodFilterProps {
  period: PeriodValue;
  onPeriodChange: (p: PeriodValue) => void;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
  customRangeError?: string | null;
}

export function AnalyticsPeriodFilter({
  period,
  onPeriodChange,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  customRangeError,
}: AnalyticsPeriodFilterProps) {
  const { t } = useTranslation();

  const options: [PeriodValue, string][] = [
    ['7d', t('analytics.period7d')],
    ['30d', t('analytics.period30d')],
    ['90d', t('analytics.period90d')],
    ['custom', t('analytics.periodCustom')],
  ];

  return (
    <>
      {/* Period chips row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, marginRight: 2 }}>
          {t('analytics.period')}:
        </span>
        {options.map(([v, l]) => (
          <button
            key={v}
            type="button"
            onClick={() => onPeriodChange(v)}
            className={cn(
              'inline-flex items-center h-7 px-3 rounded-full text-[12px] font-medium border transition-colors',
              period === v
                ? 'border-[color:var(--brand)] bg-[color:var(--brand-subtle)] text-[color:var(--brand-text,var(--brand))]'
                : 'border-[color:var(--border)] bg-[color:var(--bg-surface)] text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-hover)]',
            )}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Inline date inputs — only shown for custom */}
      {period === 'custom' && (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('analytics.dateFrom')}</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => onDateFromChange(e.target.value)}
              style={{
                height: 32,
                padding: '0 10px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                background: 'var(--bg-raised)',
                color: 'var(--text-primary)',
                fontSize: 13,
                fontFamily: 'inherit',
              }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('analytics.dateTo')}</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => onDateToChange(e.target.value)}
              style={{
                height: 32,
                padding: '0 10px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                background: 'var(--bg-raised)',
                color: 'var(--text-primary)',
                fontSize: 13,
                fontFamily: 'inherit',
              }}
            />
          </label>
          {customRangeError && (
            <span style={{ fontSize: 12, color: 'var(--warning)', alignSelf: 'flex-end', paddingBottom: 4 }}>
              {customRangeError}
            </span>
          )}
        </div>
      )}
    </>
  );
}
