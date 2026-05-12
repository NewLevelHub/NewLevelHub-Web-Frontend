import { Search, LayoutDashboard, List } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

export interface BoardFilters {
  search: string;
  priority: string;
  deadline: string;
  ordering: string;
  view: 'kanban' | 'list';
}

export const DEFAULT_BOARD_FILTERS: BoardFilters = {
  search: '',
  priority: '',
  deadline: '',
  ordering: '',
  view: 'kanban',
};

export interface BoardFilterBarProps {
  filters: BoardFilters;
  onChange: (filters: BoardFilters) => void;
}

export function BoardFilterBar({ filters, onChange }: BoardFilterBarProps) {
  const hasActive =
    filters.search !== '' ||
    filters.priority !== '' ||
    filters.deadline !== '' ||
    filters.ordering !== '';

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-48">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
        />
        <input
          type="text"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          placeholder="Поиск по задачам..."
          className={cn(
            'w-full rounded-lg border border-default bg-raised pl-8 pr-3 py-2 text-sm text-primary placeholder-gray-500',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors',
          )}
          aria-label="Поиск задач"
        />
      </div>

      <select
        value={filters.priority}
        onChange={(e) => onChange({ ...filters, priority: e.target.value })}
        className={cn(
          'rounded-lg border border-default bg-raised px-3 py-2 text-sm text-primary',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors',
        )}
        aria-label="Фильтр по приоритету"
      >
        <option value="">Все приоритеты</option>
        <option value="low">Низкий</option>
        <option value="medium">Средний</option>
        <option value="high">Высокий</option>
        <option value="critical">Критический</option>
      </select>

      <select
        value={filters.deadline}
        onChange={(e) => onChange({ ...filters, deadline: e.target.value })}
        className={cn(
          'rounded-lg border border-default bg-raised px-3 py-2 text-sm text-primary',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors',
        )}
        aria-label="Фильтр по дедлайну"
      >
        <option value="">Все дедлайны</option>
        <option value="overdue">Просрочено</option>
        <option value="today">Сегодня</option>
        <option value="this_week">На этой неделе</option>
      </select>

      {hasActive && (
        <button
          type="button"
          onClick={() => onChange({ ...DEFAULT_BOARD_FILTERS, view: filters.view })}
          className={cn(
            'rounded-lg border border-default px-3 py-2 text-sm font-medium',
            'text-secondary hover:text-primary hover:border-gray-500 transition-colors',
          )}
        >
          Сбросить
        </button>
      )}

      <div className="ml-auto flex items-center rounded-lg border border-default bg-raised p-0.5 gap-0.5">
        <button
          type="button"
          onClick={() => onChange({ ...filters, view: 'kanban' })}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
            filters.view === 'kanban' ? 'bg-hover text-primary' : 'text-muted hover:text-secondary',
          )}
          aria-label="Вид канбан"
          aria-pressed={filters.view === 'kanban'}
        >
          <LayoutDashboard size={13} />
          Канбан
        </button>
        <button
          type="button"
          onClick={() => onChange({ ...filters, view: 'list' })}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
            filters.view === 'list' ? 'bg-hover text-primary' : 'text-muted hover:text-secondary',
          )}
          aria-label="Вид список"
          aria-pressed={filters.view === 'list'}
        >
          <List size={13} />
          Список
        </button>
      </div>
    </div>
  );
}
