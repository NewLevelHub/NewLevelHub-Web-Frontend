import { Link } from 'react-router';
import {
  ChevronLeft,
  AlertCircle,
  User,
  Archive,
  Paperclip,
  Calendar,
  Flag,
  Clock,
} from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import type { CrmTask } from '@/shared/types';
import { CRM_PRIORITY_BADGE_CLASS, CRM_PRIORITY_LABELS } from '@/pages/crm/utils/crm-display';
import { ChecklistSection } from '@/pages/crm/components/CrmTaskChecklistSection';
import { CommentSection } from '@/pages/crm/components/CrmTaskCommentSection';
import { HistorySection } from '@/pages/crm/components/CrmTaskHistorySection';
import { TaskLabelsSection } from '@/pages/crm/components/CrmTaskLabelsSection';
import { useTaskDetail } from '@/pages/crm/hooks/useTaskDetail';

export type TaskDetailViewProps = ReturnType<typeof useTaskDetail>;

export function TaskDetailView(props: TaskDetailViewProps) {
  const {
    taskId,
    task,
    isLoading,
    isError,
    boardId,
    members,
    title,
    setTitle,
    description,
    setDescription,
    priority,
    setPriority,
    deadline,
    setDeadline,
    assigneeId,
    setAssigneeId,
    patchMutation,
    archiveMutation,
    unarchiveMutation,
    handleSave,
    handleCancel,
  } = props;

  if (isLoading) {
    return (
      <main className="px-3 py-4 sm:px-4 sm:py-6 md:py-8 max-w-4xl mx-auto space-y-6">
        <div className="h-4 w-28 rounded bg-hover animate-pulse" />
        <div className="animate-pulse space-y-5">
          <div className="h-8 w-2/3 rounded bg-hover" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="h-32 rounded-xl bg-raised" />
              <div className="h-48 rounded-xl bg-raised" />
            </div>
            <div className="space-y-4">
              <div className="h-40 rounded-xl bg-raised" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (isError || !task) {
    return (
      <main className="px-3 py-4 sm:px-4 sm:py-6 md:py-8 max-w-4xl mx-auto space-y-4">
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 dark:border-amber-800 bg-warning-subtle px-4 py-3 text-sm text-warning">
          <AlertCircle size={16} className="shrink-0" />
          <span>Задача не найдена или была архивирована.</span>
        </div>
        <Link
          to="/crm"
          className="inline-flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300"
        >
          <ChevronLeft size={16} />
          Вернуться к доскам
        </Link>
      </main>
    );
  }

  const createdDate = new Date(task.created_at).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <main className="px-3 py-4 sm:px-4 sm:py-6 md:py-8 max-w-4xl mx-auto space-y-6">
      <Link
        to={boardId ? `/crm/boards/${boardId}` : '/crm'}
        className="inline-flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 transition-colors"
      >
        <ChevronLeft size={16} />
        {boardId ? 'К доске' : 'К доскам'}
      </Link>

      <div className="space-y-1">
        <p className="text-xs text-muted uppercase tracking-wide font-medium">Задача #{task.id}</p>
        <input
          id="page-task-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={255}
          disabled={patchMutation.isPending}
          className={cn(
            'w-full bg-transparent text-2xl font-bold text-primary outline-none',
            'border-b-2 border-transparent focus:border-blue-500 transition-colors py-1',
            'disabled:opacity-60',
          )}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="rounded-2xl border border-default bg-surface p-5 space-y-2">
            <label htmlFor="page-task-description" className="block text-sm font-semibold text-secondary">
              Описание
            </label>
            <textarea
              id="page-task-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              placeholder="Добавьте описание задачи..."
              disabled={patchMutation.isPending}
              className={cn(
                'w-full rounded-lg border border-default bg-raised px-3 py-2.5 text-sm text-primary',
                'placeholder-gray-600 resize-none',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors',
                'disabled:opacity-60',
              )}
            />
          </section>

          {boardId && (
            <section className="rounded-2xl border border-default bg-surface p-5">
              <ChecklistSection taskId={taskId} boardId={boardId} checklists={task.checklists ?? []} />
            </section>
          )}

          <section className="rounded-2xl border border-default bg-surface p-5">
            <CommentSection taskId={taskId} boardId={boardId} />
          </section>

          <section className="rounded-2xl border border-default bg-surface p-5">
            <HistorySection taskId={taskId} />
          </section>
        </div>

        <div className="space-y-5">
          <section className="rounded-2xl border border-default bg-surface p-5 space-y-4">
            <h2 className="text-sm font-semibold text-secondary">Детали</h2>

            <div className="space-y-1.5">
              <label
                htmlFor="page-task-priority"
                className="flex items-center gap-1.5 text-xs font-medium text-muted uppercase tracking-wide"
              >
                <Flag size={12} />
                Приоритет
              </label>
              <select
                id="page-task-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as CrmTask['priority'])}
                disabled={patchMutation.isPending}
                className={cn(
                  'w-full rounded-lg border border-default bg-raised px-3 py-2 text-sm text-primary',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors',
                  'disabled:opacity-60',
                )}
              >
                {(Object.keys(CRM_PRIORITY_LABELS) as CrmTask['priority'][]).map((val) => (
                  <option key={val} value={val}>
                    {CRM_PRIORITY_LABELS[val]}
                  </option>
                ))}
              </select>
              <span
                className={cn(
                  'inline-block rounded-full px-2.5 py-0.5 text-xs font-medium border',
                  CRM_PRIORITY_BADGE_CLASS[priority],
                )}
              >
                {CRM_PRIORITY_LABELS[priority] ?? priority}
              </span>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="page-task-deadline"
                className="flex items-center gap-1.5 text-xs font-medium text-muted uppercase tracking-wide"
              >
                <Calendar size={12} />
                Дедлайн
              </label>
              <input
                id="page-task-deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                disabled={patchMutation.isPending}
                className={cn(
                  'w-full rounded-lg border border-default bg-raised px-3 py-2 text-sm text-primary [color-scheme:dark]',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors',
                  'disabled:opacity-60',
                )}
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="page-task-assignee"
                className="flex items-center gap-1.5 text-xs font-medium text-muted uppercase tracking-wide"
              >
                <User size={12} />
                Исполнитель
              </label>
              <select
                id="page-task-assignee"
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                disabled={patchMutation.isPending}
                className={cn(
                  'w-full rounded-lg border border-default bg-raised px-3 py-2 text-sm text-primary',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors',
                  'disabled:opacity-60 disabled:cursor-not-allowed',
                )}
              >
                <option value="">— Не назначен —</option>
                {members
                  .filter((m) => m.is_active)
                  .map((m) => (
                    <option key={m.id} value={String(m.id)}>
                      {m.full_name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="space-y-1">
              <span className="flex items-center gap-1.5 text-xs font-medium text-muted uppercase tracking-wide">
                <Clock size={12} />
                Создана
              </span>
              <p className="text-sm text-secondary">{createdDate}</p>
            </div>

            {task.attachments_count > 0 && (
              <div className="flex items-center gap-1.5 text-sm text-muted pt-1 border-t border-default">
                <Paperclip size={14} />
                {task.attachments_count} {task.attachments_count === 1 ? 'файл' : 'файлов'}
              </div>
            )}
          </section>

          {boardId && (
            <section className="rounded-2xl border border-default bg-surface p-5">
              <TaskLabelsSection taskId={taskId} boardId={boardId} taskLabels={task.labels ?? []} />
            </section>
          )}

          <section className="rounded-2xl border border-default bg-surface p-5 space-y-3">
            <h2 className="text-sm font-semibold text-secondary">Действия</h2>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={patchMutation.isPending}
                className={cn(
                  'flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                  'bg-blue-600 text-white hover:bg-blue-500',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                )}
              >
                {patchMutation.isPending ? 'Сохранение...' : 'Сохранить'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={patchMutation.isPending}
                className={cn(
                  'flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                  'border border-default text-secondary hover:text-primary hover:bg-hover',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                )}
              >
                Отменить
              </button>
            </div>

            {patchMutation.isError && <p className="text-xs text-red-400">Не удалось сохранить изменения.</p>}

            {archiveMutation.isError && <p className="text-xs text-red-400">Не удалось архивировать задачу.</p>}
            {unarchiveMutation.isError && (
              <p className="text-xs text-red-400">Не удалось разархивировать задачу.</p>
            )}

            {task.is_archived ? (
              <button
                type="button"
                onClick={() => unarchiveMutation.mutate()}
                disabled={unarchiveMutation.isPending}
                className={cn(
                  'flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                  'border border-blue-800 text-blue-400 bg-blue-900/30 hover:bg-blue-900/50',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                )}
              >
                <Archive size={14} />
                {unarchiveMutation.isPending ? 'Восстановление...' : 'Разархивировать задачу'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => archiveMutation.mutate()}
                disabled={archiveMutation.isPending}
                className={cn(
                  'flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                  'border border-red-200 dark:border-red-800 text-red-400 bg-danger-subtle hover:bg-danger-subtle',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                )}
              >
                <Archive size={14} />
                {archiveMutation.isPending ? 'Архивирование...' : 'Архивировать задачу'}
              </button>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
