import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/cn';
import type { DashboardTaskItem } from '@/shared/types';

const PRIORITY_STYLE: Record<string, string> = {
  urgent:   'bg-[color:var(--danger)]',
  critical: 'bg-[color:var(--danger)]',
  high:     'bg-[color:var(--warning)]',
  medium:   'bg-[#d4b300]',
  mid:      'bg-[#d4b300]',
  low:      'bg-subtle',
};

interface MyTasksWidgetProps {
  heading: string;
  linkLabel: string;
  tasks: DashboardTaskItem[];
}

export function MyTasksWidget({ heading, linkLabel, tasks }: MyTasksWidgetProps) {
  const { t } = useTranslation();
  const count = tasks.length;
  const boards = new Set(tasks.map((task) => task.board_name).filter(Boolean)).size;
  const tasksLabel = t('dashboard.tasksWidget.tasksCount', { count });
  const boardsLabel = t('dashboard.tasksWidget.boardsCount', { count: boards });
  const subheading = t('dashboard.tasksWidget.subheading', { tasksLabel, boardsLabel });
  return (
    <section className="rounded-xl border border-default bg-surface overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-default">
        <div>
          <h2 className="text-sm font-semibold text-primary">{heading}</h2>
          <p className="text-xs text-muted mt-0.5">{subheading}</p>
        </div>
        <Link to="/crm/my-tasks" className="text-xs text-brand hover:text-brand-hover transition-colors">
          {linkLabel}
        </Link>
      </div>

      <ul className="divide-y divide-[color:var(--border)]">
        {tasks.map((task) => {
          const dotClass = PRIORITY_STYLE[task.priority] ?? 'bg-subtle';
          return (
            <li key={task.id} className="flex items-start gap-3 px-5 py-3">
              <span
                className={cn('mt-0.5 shrink-0 rounded-sm', dotClass)}
                style={{ width: 6, height: 24, borderRadius: 2 }}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-primary leading-snug">{task.title}</p>
                {task.board_name && (
                  <p className="mt-0.5 text-xs text-muted">{task.board_name}</p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
