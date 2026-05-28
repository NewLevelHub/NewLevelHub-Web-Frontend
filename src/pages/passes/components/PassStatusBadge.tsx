import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/cn';
import { PASS_STATUS_LABEL_KEYS, type PassStatus } from '@/shared/config/constants';

const COLOR_MAP: Record<PassStatus, string> = {
  active: 'bg-success-subtle text-success border-emerald-700',
  expired: 'bg-hover/40 text-secondary border-default',
  revoked: 'bg-rose-900/40 text-rose-300 border-rose-700',
  used: 'bg-warning-subtle text-warning border-amber-700',
};

export function PassStatusBadge({ status }: { status: PassStatus }) {
  const { t } = useTranslation();
  const colorClass = COLOR_MAP[status] ?? 'bg-hover/40 text-secondary border-default';
  const label = t(PASS_STATUS_LABEL_KEYS[status] ?? status);

  return (
    <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', colorClass)}>
      {label}
    </span>
  );
}
