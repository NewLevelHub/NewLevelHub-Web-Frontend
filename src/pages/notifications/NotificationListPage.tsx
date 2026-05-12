import { useNotifications } from '@/pages/notifications/hooks/useNotifications';
import { NotificationItem } from '@/pages/notifications/components/NotificationItem';
import { NotificationEmptyState } from '@/pages/notifications/components/NotificationEmptyState';
import { NotificationFilters } from '@/pages/notifications/components/NotificationFilters';

export default function NotificationListPage() {
  const {
    rows,
    isLoading,
    hasUnread,
    unreadFilter,
    setUnreadFilter,
    typeFilter,
    setTypeFilter,
    handleNotificationClick,
    handleDelete,
    markAllReadMutation,
    deleteMutation,
  } = useNotifications();

  return (
    <main className="px-3 py-4 sm:px-4 sm:py-6 md:py-8 max-w-2xl mx-auto space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-primary">Уведомления</h1>
        {hasUnread && (
          <button
            type="button"
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
            className="text-sm text-blue-600 hover:underline disabled:opacity-50"
          >
            Прочитать все
          </button>
        )}
      </div>
      <NotificationFilters
        unreadFilter={unreadFilter}
        typeFilter={typeFilter}
        onUnreadFilterChange={setUnreadFilter}
        onTypeFilterChange={setTypeFilter}
      />
      {rows.length === 0 || isLoading ? (
        <NotificationEmptyState isLoading={isLoading} />
      ) : (
        <ul className="space-y-2">
          {rows.map(n => (
            <NotificationItem
              key={n.id}
              notification={n}
              onClick={handleNotificationClick}
              onDelete={handleDelete}
              isDeleting={deleteMutation.isPending}
            />
          ))}
        </ul>
      )}
    </main>
  );
}
