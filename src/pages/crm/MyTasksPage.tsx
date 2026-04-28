import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Calendar,
  AlertCircle,
  Inbox,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { API } from '@/shared/api/endpoints';
import { apiClient } from '@/shared/api/client';
import { cn } from '@/shared/lib/cn';
import type { CrmTask, PaginatedResponse } from '@/shared/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MyTask extends CrmTask {
  board_title: string;
}

interface MyTaskFilters {
  search: string;
  priority: string;
  deadline: string;
  ordering: string;
}

// ─── Priority helpers ─────────────────────────────────────────────────────────

type TaskPriorityValue = CrmTask['priority'];

const PRIORITY_LABELS: Record<TaskPriorityValue, string> = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
  critical: 'Критический',
};

const PRIORITY_BADGE_CLASS: Record<TaskPriorityValue, string> = {
  low: 'bg-gray-700 text-gray-300 border-gray-600',
  medium: 'bg-blue-900/60 text-blue-300 border-blue-700',
  high: 'bg-orange-900/60 text-orange-300 border-orange-700',
  critical: 'bg-red-900/60 text-red-300 border-red-700',
};

// ─── Date helpers ─────────────────────────────────────────────────────────────

function formatDeadline(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function isOverdue(iso: string): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return iso.slice(0, 10) < today;
}

// ─── Debounce hook ────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function MyTasksSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-14 rounded-lg bg-gray-800" />
      ))}
    </div>
  );
}

// ─── MyTasksPage ──────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

export default function MyTasksPage() {
  const [filters, setFilters] = useState<MyTaskFilters>({
    search: '',
    priority: '',
    deadline: '',
    ordering: '-created_at',
  });
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(filters.search, 300);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters.priority, filters.deadline, filters.ordering]);

  const params: Record<string, string | number> = {
    page,
    page_size: PAGE_SIZE,
    ordering: filters.ordering,
  };
  if (debouncedSearch) params.search = debouncedSearch;
  if (filters.priority) params.priority = filters.priority;
  if (filters.deadline) params.deadline = filters.deadline;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['crm', 'my-tasks', params],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<MyTask>>(API.crm.myTasks, { params });
      return data;
    },
  });

  const tasks = data?.results ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const hasActiveFilters =
    filters.search !== '' ||
    filters.priority !== '' ||
    filters.deadline !== '' ||
    filters.ordering !== '-created_at';

  const handleReset = () => {
    setFilters({ search: '', priority: '', deadline: '', ordering: '-created_at' });
    setPage(1);
    searchInputRef.current?.focus();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-white">Мои задачи</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Задачи назначенные на вас со всех досок
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-52">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
          />
          <input
            ref={searchInputRef}
            type="text"
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            placeholder="Поиск по названию..."
            className={cn(
              'w-full rounded-lg border border-gray-700 bg-gray-800 pl-8 pr-3 py-2 text-sm text-white placeholder-gray-500',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors',
            )}
            aria-label="Поиск задач"
          />
        </div>

        {/* Priority */}
        <select
          value={filters.priority}
          onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value }))}
          className={cn(
            'rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white',
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

        {/* Deadline */}
        <select
          value={filters.deadline}
          onChange={(e) => setFilters((f) => ({ ...f, deadline: e.target.value }))}
          className={cn(
            'rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors',
          )}
          aria-label="Фильтр по дедлайну"
        >
          <option value="">Все дедлайны</option>
          <option value="overdue">Просрочено</option>
          <option value="today">Сегодня</option>
          <option value="this_week">На этой неделе</option>
        </select>

        {/* Ordering */}
        <select
          value={filters.ordering}
          onChange={(e) => setFilters((f) => ({ ...f, ordering: e.target.value }))}
          className={cn(
            'rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors',
          )}
          aria-label="Сортировка"
        >
          <option value="-created_at">Новые сначала</option>
          <option value="created_at">Старые сначала</option>
          <option value="deadline">Дедлайн (ближайший)</option>
          <option value="-deadline">Дедлайн (поздний)</option>
          <option value="priority">Приоритет (низкий)</option>
          <option value="-priority">Приоритет (высокий)</option>
        </select>

        {/* Reset */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleReset}
            className={cn(
              'rounded-lg border border-gray-700 px-3 py-2 text-sm font-medium',
              'text-gray-400 hover:text-white hover:border-gray-500 transition-colors',
            )}
          >
            Сбросить
          </button>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <MyTasksSkeleton />
      ) : isError ? (
        <div
          className="flex items-center gap-2 rounded-lg border border-red-800 bg-red-900/30 px-4 py-3 text-sm text-red-300"
          role="alert"
        >
          <AlertCircle size={16} className="shrink-0" />
          <span>Не удалось загрузить задачи. Попробуйте обновить страницу.</span>
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Inbox size={32} className="text-gray-600" />
          <p className="text-gray-500 text-sm">
            {hasActiveFilters ? 'Задачи не найдены по текущим фильтрам' : 'У вас нет назначенных задач'}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleReset}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              Сбросить фильтры
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Count */}
          <p className="text-xs text-gray-500">
            {totalCount} {totalCount === 1 ? 'задача' : 'задач'}
          </p>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-gray-800">
            <table className="w-full text-sm" role="table" aria-label="Мои задачи">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-900/60">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Название
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Доска
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Приоритет
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Дедлайн
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {tasks.map((task) => {
                  const overdue = task.deadline ? isOverdue(task.deadline) : false;
                  return (
                    <tr
                      key={task.id}
                      className="bg-gray-900 hover:bg-gray-800/60 transition-colors"
                    >
                      {/* Title */}
                      <td className="px-4 py-3">
                        <Link
                          to={`/crm/boards/${task.board.id}`}
                          className="group inline-flex items-center gap-1.5 text-white hover:text-blue-400 transition-colors font-medium"
                          title={`Открыть доску: ${task.board_title}`}
                        >
                          <span className="line-clamp-1">{task.title}</span>
                          <ExternalLink
                            size={11}
                            className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          />
                        </Link>
                      </td>

                      {/* Board */}
                      <td className="px-4 py-3">
                        <Link
                          to={`/crm/boards/${task.board.id}`}
                          className="text-gray-400 hover:text-gray-200 transition-colors text-xs"
                        >
                          {task.board_title}
                        </Link>
                      </td>

                      {/* Priority */}
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium',
                            PRIORITY_BADGE_CLASS[task.priority],
                          )}
                        >
                          {PRIORITY_LABELS[task.priority]}
                        </span>
                      </td>

                      {/* Deadline */}
                      <td className="px-4 py-3">
                        {task.deadline ? (
                          <span
                            className={cn(
                              'flex items-center gap-1 text-xs',
                              overdue ? 'text-red-400' : 'text-gray-400',
                            )}
                          >
                            <Calendar size={11} className="shrink-0" />
                            {formatDeadline(task.deadline)}
                            {overdue && (
                              <span className="text-red-500 font-medium">(просрочено)</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-600">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">
                Стр. {page} из {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg border border-gray-700 px-3 py-1.5 text-sm',
                    'text-gray-400 hover:text-white hover:border-gray-500 transition-colors',
                    'disabled:opacity-40 disabled:cursor-not-allowed',
                  )}
                  aria-label="Предыдущая страница"
                >
                  <ChevronLeft size={14} />
                  Назад
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg border border-gray-700 px-3 py-1.5 text-sm',
                    'text-gray-400 hover:text-white hover:border-gray-500 transition-colors',
                    'disabled:opacity-40 disabled:cursor-not-allowed',
                  )}
                  aria-label="Следующая страница"
                >
                  Вперёд
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
