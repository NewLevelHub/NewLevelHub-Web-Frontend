import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import {
  Search,
  Calendar,
  AlertCircle,
  Inbox,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { CRM_PRIORITY_BADGE_CLASS, CRM_PRIORITY_LABEL_KEYS, formatDeadline, isOverdue } from '@/pages/crm/utils/crm-display';
import { useMyTasks } from '@/pages/crm/hooks/useMyTasks';

export type MyTasksViewProps = ReturnType<typeof useMyTasks>;

function MyTasksSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <div className="h-5 w-48 rounded bg-raised" />
          {Array.from({ length: 3 }).map((_, j) => (
            <div key={j} className="h-12 rounded-lg bg-raised" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function MyTasksView(props: MyTasksViewProps) {
  const { t } = useTranslation();
  const {
    filters,
    setFilters,
    searchInputRef,
    groups,
    isLoading,
    isError,
    hasActiveFilters,
    handleReset,
    loadMoreForBoard,
    loadingMoreBoard,
  } = props;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-primary">Мои задачи</h1>
        <p className="text-sm text-muted mt-0.5">Задачи назначенные на вас со всех досок</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-52">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
          />
          <input
            ref={searchInputRef}
            type="text"
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            placeholder={t('common.searchByTitle')}
            className={cn(
              'w-full rounded-lg border border-default bg-raised pl-8 pr-3 py-2 text-sm text-primary placeholder-gray-500',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors',
            )}
            aria-label={t('common.searchTasks')}
          />
        </div>

        <select
          value={filters.priority}
          onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value }))}
          className={cn(
            'rounded-lg border border-default bg-raised px-3 py-2 text-sm text-primary',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors',
          )}
          aria-label={t('common.filterPriority')}
        >
          <option value="">Все приоритеты</option>
          <option value="low">{t('crm.priority.low')}</option>
          <option value="medium">{t('crm.priority.medium')}</option>
          <option value="high">{t('crm.priority.high')}</option>
          <option value="critical">{t('crm.priority.critical')}</option>
        </select>

        <select
          value={filters.deadline}
          onChange={(e) => setFilters((f) => ({ ...f, deadline: e.target.value }))}
          className={cn(
            'rounded-lg border border-default bg-raised px-3 py-2 text-sm text-primary',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors',
          )}
          aria-label={t('common.filterDeadline')}
        >
          <option value="">Все дедлайны</option>
          <option value="overdue">{t('common.overdue')}</option>
          <option value="today">{t('common.today')}</option>
          <option value="this_week">На этой неделе</option>
        </select>

        <select
          value={filters.ordering}
          onChange={(e) => setFilters((f) => ({ ...f, ordering: e.target.value }))}
          className={cn(
            'rounded-lg border border-default bg-raised px-3 py-2 text-sm text-primary',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors',
          )}
          aria-label={t('common.sort')}
        >
          <option value="-created_at">{t('team.directory.newest')}</option>
          <option value="created_at">{t('team.directory.oldest')}</option>
          <option value="deadline">Дедлайн (ближайший)</option>
          <option value="-deadline">Дедлайн (поздний)</option>
          <option value="priority">Приоритет (низкий)</option>
          <option value="-priority">Приоритет (высокий)</option>
        </select>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleReset}
            className={cn(
              'rounded-lg border border-default px-3 py-2 text-sm font-medium',
              'text-secondary hover:text-primary hover:border-gray-500 transition-colors',
            )}
          >{t('common.reset')}</button>
        )}
      </div>

      {isLoading ? (
        <MyTasksSkeleton />
      ) : isError ? (
        <div
          className="flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-800 bg-danger-subtle px-4 py-3 text-sm text-danger"
          role="alert"
        >
          <AlertCircle size={16} className="shrink-0" />
          <span>Не удалось загрузить задачи. Попробуйте обновить страницу.</span>
        </div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Inbox size={32} className="text-muted" />
          <p className="text-muted text-sm">
            {hasActiveFilters ? 'Задачи не найдены по текущим фильтрам' : 'У вас нет назначенных задач'}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleReset}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >{t('common.resetFilters')}</button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.board_id}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Link
                    to={`/crm/boards/${group.board_id}`}
                    className="text-sm font-semibold text-primary hover:text-blue-400 transition-colors"
                  >
                    {group.board_name}
                  </Link>
                  <span className="text-xs text-muted">({group.total})</span>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-default">
                <table
                  className="w-full text-sm"
                  role="table"
                  aria-label={`Задачи: ${group.board_name}`}
                >
                  <thead>
                    <tr className="border-b border-default bg-surface/60">
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wide">
                        Название
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wide">
                        Приоритет
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wide">
                        Дедлайн
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[color:var(--border)]">
                    {group.tasks.map((task) => {
                      const overdue = task.deadline ? isOverdue(task.deadline) : false;
                      return (
                        <tr
                          key={task.id}
                          className="bg-surface hover:bg-hover transition-colors"
                        >
                          <td className="px-4 py-3">
                            <Link
                              to={`/crm/tasks/${task.id}`}
                              className="group inline-flex items-center gap-1.5 text-primary hover:text-blue-400 transition-colors font-medium"
                              title={t('common.openTask')}
                            >
                              <span className="line-clamp-1">{task.title}</span>
                              <ExternalLink
                                size={11}
                                className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              />
                            </Link>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                'inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium',
                                CRM_PRIORITY_BADGE_CLASS[task.priority],
                              )}
                            >
                              {t(CRM_PRIORITY_LABEL_KEYS[task.priority])}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {task.deadline ? (
                              <span
                                className={cn(
                                  'flex items-center gap-1 text-xs',
                                  overdue ? 'text-red-400' : 'text-secondary',
                                )}
                              >
                                <Calendar size={11} className="shrink-0" />
                                {formatDeadline(task.deadline)}
                                {overdue && (
                                  <span className="text-red-500 font-medium">(просрочено)</span>
                                )}
                              </span>
                            ) : (
                              <span className="text-xs text-muted">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {group.has_more && group.tasks.length < group.total && (
                <button
                  type="button"
                  onClick={() => loadMoreForBoard(group.board_id, group.board_name)}
                  disabled={loadingMoreBoard === group.board_id}
                  className={cn(
                    'mt-2 w-full rounded-lg border border-default py-2 text-xs text-secondary',
                    'hover:text-primary hover:border-gray-500 transition-colors',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                  )}
                >
                  {loadingMoreBoard === group.board_id
                    ? t('common.loading')
                    : `Показать ещё (${group.total - group.tasks.length})`}
                </button>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
