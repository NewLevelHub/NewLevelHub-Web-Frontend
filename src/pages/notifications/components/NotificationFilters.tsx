import { useTranslation } from 'react-i18next';
import { NOTIFICATION_TYPE_LABEL_KEYS } from '@/pages/notifications/constants';

const selStyle: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: 'var(--radius-sm)',
  fontSize: 12,
  border: '1px solid var(--border)',
  background: 'var(--bg-surface)',
  color: 'var(--text-primary)',
  fontFamily: 'inherit',
  outline: 'none',
  cursor: 'pointer',
};

interface NotificationFiltersProps {
  unreadFilter: 'all' | 'unread';
  typeFilter: string;
  onUnreadFilterChange: (v: 'all' | 'unread') => void;
  onTypeFilterChange: (v: string) => void;
  totalCount: number;
}

export function NotificationFilters({
  unreadFilter,
  typeFilter,
  onUnreadFilterChange,
  onTypeFilterChange,
  totalCount,
}: NotificationFiltersProps) {
  const { t } = useTranslation();

  const tabBase: React.CSSProperties = {
    height: 28,
    padding: '0 12px',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 500,
    border: 'none',
    cursor: 'pointer',
  };

  const activeTab: React.CSSProperties = {
    ...tabBase,
    background: 'var(--brand)',
    color: '#fff',
  };

  const inactiveTab: React.CSSProperties = {
    ...tabBase,
    background: 'var(--bg-raised)',
    color: 'var(--text-secondary)',
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
      <button
        type="button"
        style={unreadFilter === 'all' ? activeTab : inactiveTab}
        onClick={() => onUnreadFilterChange('all')}
        aria-pressed={unreadFilter === 'all'}
      >
        {t('notifications.filterAll')}
      </button>

      <button
        type="button"
        style={unreadFilter === 'unread' ? activeTab : inactiveTab}
        onClick={() => onUnreadFilterChange('unread')}
        aria-pressed={unreadFilter === 'unread'}
      >
        {t('notifications.filterUnread')}
      </button>

      <select
        value={typeFilter}
        onChange={e => onTypeFilterChange(e.target.value)}
        style={selStyle}
        aria-label={t('notifications.filters.typeAria')}
      >
        <option value="">{t('notifications.filterAll')}</option>
        {Object.entries(NOTIFICATION_TYPE_LABEL_KEYS).map(([value, labelKey]) => (
          <option key={value} value={value}>
            {t(labelKey)}
          </option>
        ))}
      </select>

      <span
        style={{
          marginLeft: 'auto',
          fontSize: 12,
          color: 'var(--text-subtle)',
        }}
      >
        {t('notifications.resultCount', { count: totalCount })}
      </span>
    </div>
  );
}
