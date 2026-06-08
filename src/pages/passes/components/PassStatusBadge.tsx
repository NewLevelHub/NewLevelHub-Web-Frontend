import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/cn';
import { PASS_STATUS_LABEL_KEYS, type PassStatus } from '@/shared/config/constants';

const COLOR_MAP: Record<PassStatus, string> = {
  active: 'bg-[color:var(--status-free-bg)] text-[color:var(--status-free-text)]',
  expired: 'bg-[color:var(--status-na-bg)] text-[color:var(--status-na-text)]',
  used: 'bg-[color:var(--status-soon-bg)] text-[color:var(--status-soon-text)]',
  revoked: 'bg-[color:var(--status-busy-bg)] text-[color:var(--status-busy-text)]',
};

export function PassStatusBadge({ status }: { status: PassStatus }) {
  const { t } = useTranslation();
  const colorClass = COLOR_MAP[status] ?? 'bg-[color:var(--status-na-bg)] text-[color:var(--status-na-text)]';
  const label = t(PASS_STATUS_LABEL_KEYS[status] ?? status);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap',
        colorClass,
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current flex-shrink-0" />
      {label}
    </span>
  );
}
