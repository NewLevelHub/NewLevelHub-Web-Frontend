import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import {
  ChevronLeft,
  AlertCircle,
  Archive,
  Paperclip,
} from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { fmtDateLong } from '@/shared/lib/formatDate';
import type { CrmTask } from '@/shared/types';
import { CRM_PRIORITY_BADGE_CLASS, CRM_PRIORITY_LABEL_KEYS } from '@/pages/crm/utils/crm-display';
import { ChecklistSection } from '@/pages/crm/components/CrmTaskChecklistSection';
import { CommentSection } from '@/pages/crm/components/CrmTaskCommentSection';
import { HistorySection } from '@/pages/crm/components/CrmTaskHistorySection';
import { TaskLabelsSection } from '@/pages/crm/components/CrmTaskLabelsSection';
import { useTaskDetail } from '@/pages/crm/hooks/useTaskDetail';

export type TaskDetailViewProps = ReturnType<typeof useTaskDetail>;

export function TaskDetailView(props: TaskDetailViewProps) {
  const { t } = useTranslation();
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
          <span>{t('crm.taskNotFound')}</span>
        </div>
        <Link
          to="/crm"
          className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-primary"
        >
          <ChevronLeft size={16} />
          {t('common.backToBoards')}
        </Link>
      </main>
    );
  }

  const createdDate = fmtDateLong(task.created_at);

  return (
    <main className="px-3 py-4 sm:px-4 sm:py-6 md:py-8 max-w-4xl mx-auto space-y-6">
      {/* Back link */}
      <Link
        to={boardId ? `/crm/boards/${boardId}` : '/crm'}
        className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-primary"
      >
        <ChevronLeft size={16} />
        {boardId ? t('common.toBoard') : t('common.toBoards')}
      </Link>

      {/* Title card */}
      <div className="rounded-2xl border border-default bg-surface shadow-xl overflow-hidden">
        <div className="px-6 pt-5 pb-5">
          <p className="text-xs text-muted mb-1">{t('crm.taskIdLabel', { id: task.id })}</p>
          <input
            id="page-task-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={255}
            disabled={patchMutation.isPending}
            className={cn(
              'w-full bg-transparent text-2xl font-bold text-primary outline-none',
              'border-b-2 border-transparent focus:border-[color:var(--brand)] transition-colors py-1',
              'disabled:opacity-60',
            )}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <section className="rounded-2xl border border-default bg-surface shadow-xl overflow-hidden">
            <div className="px-6 pt-5 pb-4 border-b border-[color:var(--border-faint)]">
              <h2 className="text-base font-semibold text-primary tracking-[-0.015em]">
                {t('common.description')}
              </h2>
            </div>
            <div className="px-6 py-5">
              <textarea
                id="page-task-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                placeholder={t('common.addTaskDescription')}
                disabled={patchMutation.isPending}
                className={cn(
                  'w-full px-3 py-2 text-sm border border-default rounded-[var(--radius-sm)] bg-surface',
                  'focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)] resize-none transition-colors',
                  'placeholder:text-[color:var(--text-muted)] disabled:opacity-60',
                )}
              />
            </div>
          </section>

          {/* Checklist */}
          {boardId && (
            <section className="rounded-2xl border border-default bg-surface shadow-xl overflow-hidden">
              <div className="px-6 py-5">
                <ChecklistSection taskId={taskId} boardId={boardId} checklists={task.checklists ?? []} />
              </div>
            </section>
          )}

          {/* Comments */}
          <section className="rounded-2xl border border-default bg-surface shadow-xl overflow-hidden">
            <div className="px-6 py-5">
              <CommentSection taskId={taskId} boardId={boardId} />
            </div>
          </section>

          {/* History */}
          <section className="rounded-2xl border border-default bg-surface shadow-xl overflow-hidden">
            <div className="px-6 py-5">
              <HistorySection taskId={taskId} />
            </div>
          </section>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Details */}
          <section className="rounded-2xl border border-default bg-surface shadow-xl overflow-hidden">
            <div className="px-6 pt-5 pb-4 border-b border-[color:var(--border-faint)]">
              <h2 className="text-base font-semibold text-primary tracking-[-0.015em]">
                {t('crm.detailsLabel')}
              </h2>
            </div>
            <div className="px-6 py-5 space-y-4">
              {/* Priority */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="page-task-priority"
                  className="text-xs font-medium text-secondary"
                >
                  {t('crm.priorityLabel')}
                </label>
                <select
                  id="page-task-priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as CrmTask['priority'])}
                  disabled={patchMutation.isPending}
                  className={cn(
                    'w-full h-9 px-3 text-sm border border-default rounded-[var(--radius-sm)] bg-surface',
                    'focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)] transition-colors',
                    'disabled:opacity-60',
                  )}
                >
                  {(Object.keys(CRM_PRIORITY_LABEL_KEYS) as CrmTask['priority'][]).map((val) => (
                    <option key={val} value={val}>
                      {t(CRM_PRIORITY_LABEL_KEYS[val])}
                    </option>
                  ))}
                </select>
                <span
                  className={cn(
                    'inline-block rounded-full px-2.5 py-0.5 text-xs font-medium border',
                    CRM_PRIORITY_BADGE_CLASS[priority],
                  )}
                >
                  {t(CRM_PRIORITY_LABEL_KEYS[priority]) ?? priority}
                </span>
              </div>

              {/* Deadline */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="page-task-deadline"
                  className="text-xs font-medium text-secondary"
                >
                  {t('crm.deadlineLabel')}
                </label>
                <input
                  id="page-task-deadline"
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  disabled={patchMutation.isPending}
                  className={cn(
                    'w-full h-9 px-3 text-sm border border-default rounded-[var(--radius-sm)] bg-surface',
                    'focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)] transition-colors',
                    '[color-scheme:dark] disabled:opacity-60',
                  )}
                />
              </div>

              {/* Assignee */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="page-task-assignee"
                  className="text-xs font-medium text-secondary"
                >
                  {t('crm.assigneeLabel')}
                </label>
                <select
                  id="page-task-assignee"
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  disabled={patchMutation.isPending}
                  className={cn(
                    'w-full h-9 px-3 text-sm border border-default rounded-[var(--radius-sm)] bg-surface',
                    'focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)] transition-colors',
                    'disabled:opacity-60 disabled:cursor-not-allowed',
                  )}
                >
                  <option value="">— {t('common.notAssigned')} —</option>
                  {task.assignee && !members.some((m) => String(m.id) === String(task.assignee!.id)) ? (
                    <option value={String(task.assignee.id)}>
                      {`${task.assignee.first_name} ${task.assignee.last_name}`.trim()}
                    </option>
                  ) : null}
                  {members
                    .filter((m) => m.is_active)
                    .map((m) => (
                      <option key={m.id} value={String(m.id)}>
                        {m.full_name}
                      </option>
                    ))}
                </select>
              </div>

              {/* Created date */}
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-secondary">
                  {t('crm.createdLabel')}
                </span>
                <p className="text-sm text-secondary">{createdDate}</p>
              </div>

              {/* Attachments count */}
              {task.attachments_count > 0 && (
                <div className="flex items-center gap-1.5 text-sm text-muted pt-1 border-t border-[color:var(--border-faint)]">
                  <Paperclip size={14} />
                  {task.attachments_count}{' '}
                  {task.attachments_count === 1 ? t('common.file') : t('common.files')}
                </div>
              )}
            </div>
          </section>

          {/* Labels */}
          {boardId && (
            <section className="rounded-2xl border border-default bg-surface shadow-xl overflow-hidden">
              <div className="px-6 py-5">
                <TaskLabelsSection taskId={taskId} boardId={boardId} taskLabels={task.labels ?? []} />
              </div>
            </section>
          )}

          {/* Actions */}
          <section className="rounded-2xl border border-default bg-surface shadow-xl overflow-hidden">
            <div className="px-6 pt-5 pb-4 border-b border-[color:var(--border-faint)]">
              <h2 className="text-base font-semibold text-primary tracking-[-0.015em]">
                {t('crm.actionsLabel')}
              </h2>
            </div>
            <div className="flex flex-col gap-2 px-6 py-5">
              {/* Save */}
              <button
                type="button"
                onClick={handleSave}
                disabled={patchMutation.isPending}
                className={cn(
                  'inline-flex items-center justify-center gap-1.5 h-8 px-4 text-sm font-medium w-full',
                  'rounded-[var(--radius-sm)] text-white bg-[color:var(--brand)] hover:opacity-90 transition-opacity',
                  'disabled:opacity-60 disabled:cursor-not-allowed',
                )}
              >
                {patchMutation.isPending ? t('common.savingPlain') : t('common.save')}
              </button>

              {/* Cancel */}
              <button
                type="button"
                onClick={handleCancel}
                disabled={patchMutation.isPending}
                className={cn(
                  'h-8 px-4 text-sm font-medium w-full rounded-[var(--radius-sm)]',
                  'border border-default text-secondary hover:bg-hover transition-colors',
                  'disabled:opacity-60',
                )}
              >
                {t('common.cancel')}
              </button>

              {patchMutation.isError && (
                <p className="text-xs text-danger">{t('crm.failedToSave')}</p>
              )}

              {archiveMutation.isError && (
                <p className="text-xs text-danger">{t('crm.failedToArchive')}</p>
              )}
              {unarchiveMutation.isError && (
                <p className="text-xs text-danger">{t('crm.failedToUnarchive')}</p>
              )}

              {/* Archive / Unarchive */}
              {task.is_archived ? (
                <button
                  type="button"
                  onClick={() => unarchiveMutation.mutate()}
                  disabled={unarchiveMutation.isPending}
                  className={cn(
                    'inline-flex items-center justify-center gap-1.5 h-8 px-4 text-sm font-medium w-full',
                    'rounded-[var(--radius-sm)] border border-[color:var(--info)] text-[color:var(--info)]',
                    'hover:bg-hover transition-colors',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                  )}
                >
                  <Archive size={14} />
                  {unarchiveMutation.isPending ? t('common.unarchivingPlain') : t('common.unarchiveTask')}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => archiveMutation.mutate()}
                  disabled={archiveMutation.isPending}
                  className={cn(
                    'inline-flex items-center justify-center gap-1.5 h-8 px-4 text-sm font-medium w-full',
                    'rounded-[var(--radius-sm)] border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                  )}
                >
                  <Archive size={14} />
                  {archiveMutation.isPending ? t('common.archivingPlain') : t('common.archiveTask')}
                </button>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
