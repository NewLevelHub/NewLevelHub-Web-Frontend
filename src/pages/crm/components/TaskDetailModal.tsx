import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, User, Archive, AlertCircle } from 'lucide-react';
import { API } from '@/shared/api/endpoints';
import { apiClient } from '@/shared/api/client';
import { cn } from '@/shared/lib/cn';
import type { CrmTask, CompanyMember, PaginatedResponse } from '@/shared/types';
import { ChecklistSection } from '@/pages/crm/components/CrmTaskChecklistSection';
import { CommentSection } from '@/pages/crm/components/CrmTaskCommentSection';
import { HistorySection } from '@/pages/crm/components/CrmTaskHistorySection';
import { TaskLabelsSection } from '@/pages/crm/components/CrmTaskLabelsSection';
import { AttachmentsSection } from '@/pages/crm/components/CrmTaskAttachmentsSection';

type TaskPriorityValue = CrmTask['priority'];

export interface TaskDetailModalProps {
  taskId: number;
  boardId: string;
  boardCompanyId: number;
  onClose: () => void;
}

export function TaskDetailModal({ taskId, boardId, boardCompanyId, onClose }: TaskDetailModalProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: task, isLoading, isError } = useQuery({
    queryKey: ['crm', 'task', taskId],
    queryFn: async () => {
      const { data } = await apiClient.get<CrmTask>(API.crm.taskDetail(taskId));
      return data;
    },
  });

  // Use the company resolved from the task itself so the list is always scoped
  // to the board's company, including when the viewer is a superadmin.
  const companyId = task?.board.company != null ? String(task.board.company) : String(boardCompanyId);

  const { data: membersData } = useQuery({
    queryKey: ['company-members', companyId, 'assignee-picker'],
    queryFn: () =>
      apiClient
        .get<PaginatedResponse<CompanyMember>>(API.companies.members(companyId), {
          params: { page_size: 100, is_active: 'true' },
        })
        .then((r) => r.data),
  });

  const members = membersData?.results ?? [];

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriorityValue>('medium');
  const [deadline, setDeadline] = useState('');
  const [assigneeId, setAssigneeId] = useState('');

  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setDescription(task.description ?? '');
    setPriority(task.priority);
    setDeadline(task.deadline ? task.deadline.slice(0, 10) : '');
    setAssigneeId(task.assignee ? String(task.assignee.id) : '');
  }, [task?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const patchMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await apiClient.patch<CrmTask>(API.crm.taskDetail(taskId), payload);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['crm', 'tasks', boardId] });
      void queryClient.invalidateQueries({ queryKey: ['crm', 'task', taskId] });
      void queryClient.invalidateQueries({ queryKey: ['crm', 'my-tasks'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications-recent'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: () => apiClient.post(API.crm.taskArchive(taskId)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['crm', 'tasks', boardId] });
      void queryClient.invalidateQueries({ queryKey: ['crm', 'tasks', boardId, 'archived'] });
      void queryClient.invalidateQueries({ queryKey: ['crm', 'my-tasks'] });
      onClose();
    },
  });

  const unarchiveFromDetailMutation = useMutation({
    mutationFn: () => apiClient.post(API.crm.taskUnarchive(taskId)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['crm', 'tasks', boardId] });
      void queryClient.invalidateQueries({ queryKey: ['crm', 'tasks', boardId, 'archived'] });
      void queryClient.invalidateQueries({ queryKey: ['crm', 'task', taskId] });
      void queryClient.invalidateQueries({ queryKey: ['crm', 'my-tasks'] });
    },
  });

  const handleArchive = () => {
    archiveMutation.mutate();
  };

  const handleSave = () => {
    if (!task || patchMutation.isPending) return;

    const payload: Record<string, unknown> = {};

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setTitle(task.title);
      return;
    }
    if (trimmedTitle !== task.title) payload.title = trimmedTitle;
    if (description !== (task.description ?? '')) payload.description = description || null;
    if (priority !== task.priority) payload.priority = priority;

    const originalDeadline = task.deadline ? task.deadline.slice(0, 10) : '';
    if (deadline !== originalDeadline) payload.deadline = deadline || null;

    const originalAssigneeId = task.assignee ? String(task.assignee.id) : '';
    if (assigneeId !== originalAssigneeId) {
      payload.assignee_id = assigneeId ? parseInt(assigneeId, 10) : null;
    }

    if (Object.keys(payload).length === 0) return;

    patchMutation.mutate(payload);
  };

  const handleCancel = () => {
    if (!task) return;
    setTitle(task.title);
    setDescription(task.description ?? '');
    setPriority(task.priority);
    setDeadline(task.deadline ? task.deadline.slice(0, 10) : '');
    setAssigneeId(task.assignee ? String(task.assignee.id) : '');
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 pt-16 overflow-y-auto"
      onMouseDown={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-detail-title"
    >
      <div className="w-full max-w-xl rounded-xl border border-default bg-surface shadow-2xl mb-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-default">
          <h2 id="task-detail-title" className="text-sm font-semibold text-secondary uppercase tracking-wide">
            Задача
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-secondary hover:text-primary transition-colors rounded-md p-1 hover:bg-hover"
            aria-label={t('common.close')}
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {isLoading && (
            <div className="animate-pulse space-y-4">
              <div className="h-6 w-3/4 rounded bg-hover" />
              <div className="h-4 w-1/2 rounded bg-hover" />
              <div className="h-4 w-2/3 rounded bg-hover" />
              <div className="h-20 w-full rounded bg-hover" />
              <div className="h-4 w-1/3 rounded bg-hover" />
            </div>
          )}

          {isError && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-800 bg-danger-subtle px-4 py-3 text-sm text-danger">
              <AlertCircle size={16} className="shrink-0" />
              <span>Не удалось загрузить задачу. Возможно, она архивирована или была удалена.</span>
            </div>
          )}

          {task && !isLoading && (
            <>
              <div className="space-y-1.5">
                <label htmlFor="task-title" className="block text-xs font-medium text-muted uppercase tracking-wide">
                  Название
                </label>
                <input
                  id="task-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={255}
                  disabled={patchMutation.isPending}
                  className={cn(
                    'w-full rounded-lg border bg-raised px-3 py-2 text-base font-medium text-primary',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors border-default',
                    'disabled:opacity-60',
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="task-priority" className="block text-xs font-medium text-muted uppercase tracking-wide">
                    Приоритет
                  </label>
                  <select
                    id="task-priority"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriorityValue)}
                    disabled={patchMutation.isPending}
                    className={cn(
                      'w-full rounded-lg border bg-raised px-3 py-2 text-sm text-primary',
                      'focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors border-default',
                      'disabled:opacity-60',
                    )}
                  >
                    <option value="low">{t('crm.priority.low')}</option>
                    <option value="medium">{t('crm.priority.medium')}</option>
                    <option value="high">{t('crm.priority.high')}</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="task-deadline" className="block text-xs font-medium text-muted uppercase tracking-wide">
                    Дедлайн
                  </label>
                  <input
                    id="task-deadline"
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    disabled={patchMutation.isPending}
                    className={cn(
                      'w-full rounded-lg border bg-raised px-3 py-2 text-sm text-primary',
                      'focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors border-default',
                      '[color-scheme:dark] disabled:opacity-60',
                    )}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="task-assignee"
                  className="block text-xs font-medium text-muted uppercase tracking-wide"
                >
                  Исполнитель
                </label>
                <div className="relative">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                  <select
                    id="task-assignee"
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(e.target.value)}
                    disabled={patchMutation.isPending}
                    className={cn(
                      'w-full rounded-lg border bg-raised pl-8 pr-3 py-2 text-sm text-primary',
                      'focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors border-default',
                      'disabled:opacity-60 disabled:cursor-not-allowed',
                    )}
                  >
                    <option value="">— Не назначен —</option>
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
              </div>

              <TaskLabelsSection taskId={taskId} boardId={boardId} taskLabels={task.labels ?? []} />

              <div className="space-y-1.5">
                <label htmlFor="task-description" className="block text-xs font-medium text-muted uppercase tracking-wide">
                  Описание
                </label>
                <textarea
                  id="task-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder={t('common.addDescription')}
                  disabled={patchMutation.isPending}
                  className={cn(
                    'w-full rounded-lg border bg-raised px-3 py-2 text-sm text-primary placeholder-gray-600',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors border-default resize-none',
                    'disabled:opacity-60',
                  )}
                />
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={patchMutation.isPending}
                  className={cn(
                    'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                    'bg-blue-600 text-white hover:bg-blue-500',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                  )}
                >
                  {patchMutation.isPending ? t('common.savingPlain') : t('common.save')}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={patchMutation.isPending}
                  className={cn(
                    'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                    'text-secondary hover:text-primary hover:bg-hover',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                  )}
                >
                  Отменить
                </button>
                {patchMutation.isError && <p className="text-xs text-red-400">Не удалось сохранить изменения.</p>}
              </div>

              <ChecklistSection taskId={taskId} boardId={boardId} checklists={task.checklists ?? []} />

              <AttachmentsSection taskId={taskId} boardId={boardId} />

              <CommentSection taskId={taskId} boardId={boardId} />

              <HistorySection taskId={taskId} />

              <div className="pt-2 border-t border-default">
                {archiveMutation.isError && (
                  <p className="text-xs text-red-400 mb-2">Не удалось архивировать задачу.</p>
                )}
                {unarchiveFromDetailMutation.isError && (
                  <p className="text-xs text-red-400 mb-2">Не удалось разархивировать задачу.</p>
                )}
                {task.is_archived ? (
                  <button
                    type="button"
                    onClick={() => unarchiveFromDetailMutation.mutate()}
                    disabled={unarchiveFromDetailMutation.isPending}
                    className={cn(
                      'flex items-center gap-1.5 text-sm transition-colors',
                      'text-blue-400 hover:text-blue-300',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                    )}
                  >
                    <Archive size={14} />
                    {unarchiveFromDetailMutation.isPending ? t('common.unarchivingPlain') : t('common.unarchive')}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleArchive}
                    disabled={archiveMutation.isPending}
                    className={cn(
                      'flex items-center gap-1.5 text-sm transition-colors',
                      'text-red-400 hover:text-danger',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                    )}
                  >
                    <Archive size={14} />
                    {archiveMutation.isPending ? t('common.archivingPlain') : t('common.archive')}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
