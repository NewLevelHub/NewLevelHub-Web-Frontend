import { memo } from 'react';
import { Inbox, Calendar } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import type { CrmColumn, CrmTask } from '@/shared/types';
import { CRM_PRIORITY_BADGE_CLASS, CRM_PRIORITY_LABELS, formatDeadline, isOverdue } from '@/pages/crm/utils/crm-display';
import { CrmAssigneeAvatar } from '@/pages/crm/components/CrmAssigneeAvatar';

export interface BoardTaskListViewProps {
  tasks: CrmTask[];
  columns: CrmColumn[];
  isLoading: boolean;
  onTaskClick: (taskId: number) => void;
}

const ListTaskRow = memo(function ListTaskRow({
  task,
  columnName,
  onTaskClick,
}: {
  task: CrmTask;
  columnName: string;
  onTaskClick: (taskId: number) => void;
}) {
  const overdue = task.deadline ? isOverdue(task.deadline) : false;
  return (
    <tr
      className="bg-surface hover:bg-hover transition-colors cursor-pointer"
      onClick={() => onTaskClick(task.id)}
      role="row"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onTaskClick(task.id);
        }
      }}
      aria-label={`Задача: ${task.title}`}
    >
      <td className="px-4 py-3">
        <span className="font-medium text-primary line-clamp-1">{task.title}</span>
      </td>
      <td className="px-4 py-3">
        <span
          className={cn(
            'inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium',
            CRM_PRIORITY_BADGE_CLASS[task.priority],
          )}
        >
          {CRM_PRIORITY_LABELS[task.priority]}
        </span>
      </td>
      <td className="px-4 py-3">
        {task.deadline ? (
          <span
            className={cn('flex items-center gap-1 text-xs', overdue ? 'text-red-400' : 'text-secondary')}
          >
            <Calendar size={11} className="shrink-0" />
            {formatDeadline(task.deadline)}
          </span>
        ) : (
          <span className="text-xs text-muted">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        {task.assignee ? (
          <div className="flex items-center gap-2">
            <CrmAssigneeAvatar assignee={task.assignee} size="sm" />
            <span className="text-xs text-secondary">
              {task.assignee.first_name} {task.assignee.last_name}
            </span>
          </div>
        ) : (
          <span className="text-xs text-muted">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        <span className="text-xs text-secondary">{columnName}</span>
      </td>
    </tr>
  );
});

export function BoardTaskListView({ tasks, columns, isLoading, onTaskClick }: BoardTaskListViewProps) {
  const columnMap = new Map(columns.map((c) => [c.id, c.name]));

  if (isLoading) {
    return (
      <div className="space-y-2 animate-pulse">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 rounded-lg bg-raised" />
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Inbox size={32} className="text-muted" />
        <p className="text-muted text-sm">Задачи не найдены</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-default">
      <table className="w-full text-sm" role="table" aria-label="Задачи доски">
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
            <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wide">
              Исполнитель
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wide">
              Колонка
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[color:var(--border)]">
          {tasks.map((task) => (
            <ListTaskRow
              key={task.id}
              task={task}
              columnName={columnMap.get(task.column_id) ?? '—'}
              onTaskClick={onTaskClick}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
