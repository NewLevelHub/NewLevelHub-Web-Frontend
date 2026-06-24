import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Calendar, User } from 'lucide-react';
import { API } from '@/shared/api/endpoints';
import { apiClient } from '@/shared/api/client';
import { cn } from '@/shared/lib/cn';
import type { CrmTask, CompanyMember, PaginatedResponse } from '@/shared/types';
import { WIP_LIMIT_VIOLATION_MESSAGE_KEY } from '@/pages/crm/hooks/useWipLimitToast';
import { Button } from '@/shared/ui/Button';

type TaskPriorityValue = CrmTask['priority'];

export interface CreateTaskModalProps {
  boardId: string;
  boardCompanyId: number;
  columnId: number;
  onClose: () => void;
  wipBlocked?: boolean;
}

export function CreateTaskModal({ boardId, boardCompanyId, columnId, onClose, wipBlocked }: CreateTaskModalProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const titleRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriorityValue>('medium');
  const [deadline, setDeadline] = useState('');
  const [assigneeId, setAssigneeId] = useState('');

  const companyId = String(boardCompanyId);

  const { data: membersData } = useQuery({
    queryKey: ['company-members', companyId],
    queryFn: () =>
      apiClient
        .get<PaginatedResponse<CompanyMember>>(API.companies.members(companyId))
        .then((r) => r.data),
  });

  const members = membersData?.results ?? [];

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const mutation = useMutation({
    mutationFn: async (payload: {
      board_id: number;
      column_id: number;
      title: string;
      priority: TaskPriorityValue;
      description?: string;
      deadline?: string;
      assignee_id?: number;
    }) => {
      const { data } = await apiClient.post<CrmTask>(API.crm.tasksList, payload);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['crm', 'tasks', boardId] });
      void queryClient.invalidateQueries({ queryKey: ['crm', 'my-tasks'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications-recent'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || mutation.isPending || wipBlocked) return;

    const payload: Parameters<typeof mutation.mutate>[0] = {
      board_id: Number(boardId),
      column_id: columnId,
      title: title.trim(),
      priority,
    };

    if (description.trim()) payload.description = description.trim();
    if (deadline) payload.deadline = deadline;
    const parsedAssignee = assigneeId.trim() ? parseInt(assigneeId.trim(), 10) : NaN;
    if (!isNaN(parsedAssignee)) payload.assignee_id = parsedAssignee;

    mutation.mutate(payload);
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onMouseDown={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-task-title"
    >
      <div className="w-full max-w-md rounded-xl bg-surface border border-default shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-default">
          <h2 id="create-task-title" className="text-lg font-semibold text-primary">
            Новая задача
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

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="new-task-title" className="block text-sm font-medium text-secondary">
              Название <span className="text-red-400">*</span>
            </label>
            <input
              ref={titleRef}
              id="new-task-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('common.enterTaskTitle')}
              required
              maxLength={255}
              className={cn(
                'w-full rounded-lg border bg-raised px-3 py-2 text-sm text-primary placeholder-gray-500',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors',
                'border-default focus:border-blue-500',
              )}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="new-task-description" className="block text-sm font-medium text-secondary">
              Описание <span className="text-muted font-normal">{t('common.optional')}</span>
            </label>
            <textarea
              id="new-task-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('common.addDescription')}
              rows={3}
              className={cn(
                'w-full rounded-lg border bg-raised px-3 py-2 text-sm text-primary placeholder-gray-500',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors',
                'border-default focus:border-blue-500 resize-none',
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="new-task-priority" className="block text-sm font-medium text-secondary">
                Приоритет <span className="text-red-400">*</span>
              </label>
              <select
                id="new-task-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriorityValue)}
                className={cn(
                  'w-full rounded-lg border bg-raised px-3 py-2 text-sm text-primary',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors',
                  'border-default focus:border-blue-500',
                )}
              >
                <option value="low">{t('crm.priority.low')}</option>
                <option value="medium">{t('crm.priority.medium')}</option>
                <option value="high">{t('crm.priority.high')}</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="new-task-deadline" className="block text-sm font-medium text-secondary">
                Дедлайн <span className="text-muted font-normal">(необяз.)</span>
              </label>
              <div className="relative">
                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                <input
                  id="new-task-deadline"
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className={cn(
                    'w-full rounded-lg border bg-raised pl-8 pr-3 py-2 text-sm text-primary',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors',
                    'border-default focus:border-blue-500 [color-scheme:dark]',
                  )}
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="new-task-assignee" className="block text-sm font-medium text-secondary">
              Исполнитель <span className="text-muted font-normal">{t('common.optional')}</span>
            </label>
            <div className="relative">
              <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              <select
                id="new-task-assignee"
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className={cn(
                  'w-full rounded-lg border bg-raised pl-8 pr-3 py-2 text-sm text-primary',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors',
                  'border-default focus:border-blue-500',
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
          </div>

          <div className="flex items-center justify-end gap-3 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
            >{t('common.cancel')}</Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={!title.trim() || mutation.isPending || wipBlocked}
              loading={mutation.isPending}
            >
              {mutation.isPending ? t('common.creatingPlain') : t('common.createTask')}
            </Button>
          </div>

          {mutation.isError && (
            <p className="text-sm text-red-400">{t(WIP_LIMIT_VIOLATION_MESSAGE_KEY)}</p>
          )}
        </form>
      </div>
    </div>
  );
}
