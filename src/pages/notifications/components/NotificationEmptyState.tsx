import { Bell } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface NotificationEmptyStateProps {
  filter: 'all' | 'unread';
  typeFilter: string;
  onReset: () => void;
}

export function NotificationEmptyState({ filter, typeFilter, onReset }: NotificationEmptyStateProps) {
  const { t } = useTranslation();
  const hasActiveFilter = filter !== 'all' || Boolean(typeFilter);

  return (
    <div
      style={{
        padding: '64px 20px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 14,
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          background: 'var(--bg-raised)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Bell size={26} style={{ color: 'var(--text-muted)' }} strokeWidth={1.4} />
      </div>

      <div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--text-primary)',
            marginBottom: 5,
          }}
        >
          {filter === 'unread' ? t('notifications.emptyUnread') : t('notifications.emptyAll')}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {filter === 'unread'
            ? t('notifications.emptyUnreadHint')
            : t('notifications.emptyAllHint')}
        </div>
      </div>

      {hasActiveFilter && (
        <button
          type="button"
          onClick={onReset}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            height: 30,
            padding: '0 14px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
            background: 'transparent',
            color: 'var(--text-secondary)',
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {t('common.resetFilters')}
        </button>
      )}
    </div>
  );
}
