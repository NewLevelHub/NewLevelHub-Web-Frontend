import { useTranslation } from 'react-i18next';
import { CheckCheck } from 'lucide-react';

import { useNotifications } from '@/pages/notifications/hooks/useNotifications';
import { NotificationItem } from '@/pages/notifications/components/NotificationItem';
import { NotificationEmptyState } from '@/pages/notifications/components/NotificationEmptyState';
import { NotificationFilters } from '@/pages/notifications/components/NotificationFilters';
import { NotificationSkeletonList } from '@/pages/notifications/components/NotificationSkeleton';

export default function NotificationListPage() {
  const { t } = useTranslation();
  const {
    rows,
    isLoading,
    hasUnread,
    unreadCount,
    unreadFilter,
    setUnreadFilter,
    typeFilter,
    setTypeFilter,
    groups,
    hasMore,
    handleNotificationClick,
    handleDelete,
    resetFilters,
    loadMore,
    markAllReadMutation,
    deleteMutation,
  } = useNotifications();

  return (
    <div>
      {/* Page header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          marginBottom: 18,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                fontSize: 22,
                fontWeight: 600,
                letterSpacing: '-0.025em',
                color: 'var(--text-primary)',
              }}
            >
              {t('notifications.title')}
            </div>
            {unreadCount > 0 && (
              <span
                style={{
                  background: 'var(--brand)',
                  color: '#fff',
                  fontSize: 11,
                  padding: '2px 8px',
                  borderRadius: 20,
                  fontWeight: 700,
                }}
              >
                {unreadCount}
              </span>
            )}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
            {t('notifications.subtitle', {
              total: rows.length,
              unread: unreadCount,
            })}
          </div>
        </div>

        {hasUnread && (
          <button
            type="button"
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              height: 32,
              padding: '0 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text-secondary)',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'inherit',
              opacity: markAllReadMutation.isPending ? 0.6 : 1,
            }}
          >
            <CheckCheck size={13} />
            {t('notifications.markAllRead')}
          </button>
        )}
      </div>

      {/* Filters */}
      <NotificationFilters
        unreadFilter={unreadFilter}
        typeFilter={typeFilter}
        onUnreadFilterChange={setUnreadFilter}
        onTypeFilterChange={setTypeFilter}
        totalCount={rows.length}
      />

      {/* Card */}
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-card)',
          overflow: 'hidden',
        }}
      >
        {isLoading && <NotificationSkeletonList count={5} />}

        {!isLoading && groups.length === 0 && (
          <NotificationEmptyState
            filter={unreadFilter}
            typeFilter={typeFilter}
            onReset={resetFilters}
          />
        )}

        {!isLoading &&
          groups.map(([label, items]) => (
            <div key={label}>
              {/* Date group header */}
              <div
                style={{
                  padding: '8px 20px',
                  background: 'var(--bg-raised)',
                  borderBottom: '1px solid var(--border-faint)',
                  borderTop: '1px solid var(--border-faint)',
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <div
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    background: 'var(--brand)',
                    flexShrink: 0,
                  }}
                />
                {label}
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 500,
                    color: 'var(--text-subtle)',
                    marginLeft: 4,
                  }}
                >
                  {items.length}
                </span>
              </div>

              {items.map(n => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onClick={handleNotificationClick}
                  onDelete={handleDelete}
                  isDeleting={deleteMutation.isPending}
                />
              ))}
            </div>
          ))}

        {/* Load more */}
        {!isLoading && hasMore && (
          <div
            style={{
              padding: '12px 20px',
              borderTop: '1px solid var(--border-faint)',
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <button
              type="button"
              onClick={loadMore}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                height: 32,
                padding: '0 16px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--text-secondary)',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {t('notifications.loadMore')} · {rows.length - groups.reduce((s, [, its]) => s + its.length, 0)}{' '}
              {t('notifications.remaining')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
