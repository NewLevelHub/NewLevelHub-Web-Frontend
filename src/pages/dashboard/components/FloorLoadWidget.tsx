import { cn } from '@/shared/lib/cn';
import { useTranslation } from 'react-i18next';

interface FloorRow {
  label: string;
  pct: number;
}

function FloorLoadBar({ pct }: { pct: number }) {
  const colorClass =
    pct > 70
      ? 'bg-danger'
      : pct >= 50
        ? 'bg-amber-500'
        : 'bg-emerald-500';
  return (
    <div className="h-1.5 w-[130px] shrink-0 overflow-hidden rounded-full bg-raised">
      <div
        className={cn('h-full rounded-full transition-all', colorClass)}
        style={{ width: `${pct}%` }}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  );
}

export interface FloorLoadWidgetProps {
  rows: FloorRow[];
}

export function FloorLoadWidget({ rows }: FloorLoadWidgetProps) {
  const { t } = useTranslation();

  if (rows.length === 0) {
    return (
      <section className="rounded-xl border border-default bg-surface p-5">
        <p className="text-xs text-muted">Нет данных по этажам</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-default bg-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-primary">{t('dashboard.floorLoad')}</h2>
        <span className="text-xs text-muted">{t('dashboard.now')}</span>
      </div>
      <ul className="space-y-3">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center gap-3">
            <span className="min-w-0 flex-1 truncate text-xs text-secondary">
              {row.label}
            </span>
            <FloorLoadBar pct={row.pct} />
            <span className="w-8 shrink-0 text-right font-mono text-xs text-muted">
              {row.pct}%
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
