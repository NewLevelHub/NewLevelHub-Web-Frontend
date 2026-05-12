import { cn } from '@/shared/lib/cn';
import { type PassStatus } from '@/shared/config/constants';

const COLOR_MAP: Record<PassStatus, string> = {
  active: 'bg-success-subtle text-success border-emerald-700',
  expired: 'bg-hover/40 text-secondary border-default',
  revoked: 'bg-rose-900/40 text-rose-300 border-rose-700',
  used: 'bg-warning-subtle text-warning border-amber-700',
};

const LABEL_MAP: Record<PassStatus, string> = {
  active: 'Активный',
  expired: 'Истёк',
  revoked: 'Отозван',
  used: 'Использован',
};

export function PassStatusBadge({ status }: { status: PassStatus }) {
  const colorClass = COLOR_MAP[status] ?? 'bg-hover/40 text-secondary border-default';
  const label = LABEL_MAP[status] ?? status;

  return (
    <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', colorClass)}>
      {label}
    </span>
  );
}
