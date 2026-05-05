import { cn } from '@/shared/lib/cn';
import { type PassStatus } from '@/shared/config/constants';

const COLOR_MAP: Record<PassStatus, string> = {
  active: 'bg-emerald-900/40 text-emerald-300 border-emerald-700',
  expired: 'bg-gray-700/40 text-gray-400 border-gray-600',
  revoked: 'bg-rose-900/40 text-rose-300 border-rose-700',
  used: 'bg-amber-900/40 text-amber-300 border-amber-700',
};

const LABEL_MAP: Record<PassStatus, string> = {
  active: 'Активный',
  expired: 'Истёк',
  revoked: 'Отозван',
  used: 'Использован',
};

export function PassStatusBadge({ status }: { status: PassStatus }) {
  const colorClass = COLOR_MAP[status] ?? 'bg-gray-700/40 text-gray-300 border-gray-600';
  const label = LABEL_MAP[status] ?? status;

  return (
    <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', colorClass)}>
      {label}
    </span>
  );
}
