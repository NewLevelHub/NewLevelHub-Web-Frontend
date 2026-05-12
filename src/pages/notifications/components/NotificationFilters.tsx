import { cn } from '@/shared/lib/cn';
import { NOTIFICATION_TYPE_LABELS } from '@/pages/notifications/components/NotificationItem';

interface NotificationFiltersProps {
  unreadFilter: 'all' | 'unread';
  typeFilter: string;
  onUnreadFilterChange: (v: 'all' | 'unread') => void;
  onTypeFilterChange: (v: string) => void;
}

export function NotificationFilters({
  unreadFilter,
  typeFilter,
  onUnreadFilterChange,
  onTypeFilterChange,
}: NotificationFiltersProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="flex w-full sm:w-auto rounded-lg border border-default overflow-hidden text-sm">
        <button
          type="button"
          onClick={() => onUnreadFilterChange('all')}
          className={cn(
            'px-3 py-1.5 transition-colors',
            unreadFilter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-surface text-muted hover:bg-raised',
          )}
        >
          Все
        </button>
        <button
          type="button"
          onClick={() => onUnreadFilterChange('unread')}
          className={cn(
            'px-3 py-1.5 border-l border-default transition-colors',
            unreadFilter === 'unread'
              ? 'bg-blue-600 text-white'
              : 'bg-surface text-muted hover:bg-raised',
          )}
        >
          Непрочитанные
        </button>
      </div>

      <select
        value={typeFilter}
        onChange={e => onTypeFilterChange(e.target.value)}
        className="w-full sm:w-auto text-sm rounded-lg border border-default px-3 py-1.5 bg-surface text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Фильтр по типу"
      >
        <option value="">Все типы</option>
        {Object.entries(NOTIFICATION_TYPE_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}
