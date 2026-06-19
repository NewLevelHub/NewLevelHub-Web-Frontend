import { useTranslation } from 'react-i18next';

interface RecurringBadgeProps {
  idx?: number;
  total?: number;
  onClick?: () => void;
}

export function RecurringBadge({ idx, total, onClick }: RecurringBadgeProps) {
  const { t } = useTranslation();

  return (
    <span
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '2px 8px',
        borderRadius: 20,
        background: 'var(--brand-subtle)',
        color: 'var(--brand-text)',
        fontSize: 12,
        fontWeight: 500,
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none',
      }}
    >
      {/* Recurring icon — two circular arrows */}
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        style={{ flexShrink: 0 }}
      >
        <path d="M17 2l4 4-4 4" />
        <path d="M3 11V9a4 4 0 0 1 4-4h14" />
        <path d="M7 22l-4-4 4-4" />
        <path d="M21 13v2a4 4 0 0 1-4 4H3" />
      </svg>
      {idx !== undefined && total !== undefined
        ? `${t('recurring.series')} · ${idx}/${total}`
        : t('recurring.series')}
    </span>
  );
}
