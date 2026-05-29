import { cn } from '@/shared/lib/cn';
import { toPolylinePoints } from '@/pages/dashboard/constants';

export interface KpiCardProps {
  label: string;
  value: string;
  trend: string;
  trendDir: 'up' | 'down' | 'neutral';
  sparklineData: number[];
}

export function KpiCard({ label, value, trend, trendDir, sparklineData }: KpiCardProps) {
  const trendClass =
    trendDir === 'up'
      ? 'text-emerald-600 dark:text-emerald-400'
      : trendDir === 'down'
        ? 'text-rose-500 dark:text-rose-400'
        : 'text-muted';

  return (
    <div className="rounded-xl border border-default bg-surface p-5 flex flex-col gap-3">
      <p className="text-xs text-muted leading-tight">{label}</p>
      <p className="text-2xl sm:text-3xl font-bold text-primary leading-none tracking-tight">{value}</p>
      <div className="flex items-end justify-between gap-2">
        <p className={cn('text-xs font-medium leading-tight', trendClass)}>{trend}</p>
        <div className="w-16 shrink-0">
          <svg
            viewBox="0 0 60 30"
            className="w-full h-8"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <polyline
              points={toPolylinePoints(sparklineData)}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-brand"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
