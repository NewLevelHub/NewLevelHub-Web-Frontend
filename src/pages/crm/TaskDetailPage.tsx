import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

import { API } from '@/shared/api/endpoints';
import { apiClient } from '@/shared/api/client';
import { cn } from '@/shared/lib/cn';
import { useAuth } from '@/shared/hooks/useAuth';
import type {
  CrmTask,
  CompanyMember,
  PaginatedResponse,
} from '@/shared/types';

import {
  CommentSection,
  ChecklistSection,
  HistorySection,
  TaskLabelsSection,
} from '@/pages/crm/BoardDetailPage';

type TaskPriorityValue = CrmTask['priority'];

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
  urgent: 'Срочный',
};

const PRIORITY_BADGE: Record<string, string> = {
  low: 'bg-gray-700 text-gray-300',
  medium: 'bg-amber-900/60 text-amber-300',
  high: 'bg-orange-900/60 text-orange-300',
  urgent: 'bg-red-900/60 text-red-300',
};

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const taskId = Number(id);
  const companyId = user?.company_id != null ? String(user.company_id) : null;

  const {
    data: task,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['crm', 'task', taskId],
    enabled: !isNaN(taskId),
    queryFn: async () => {
      const { data } = await apiClient.get<CrmTask>(API.crm.taskDetail(taskId));
      return data;
    },
  });

  const boardId = task?.board?.id != null ? String(task.board.id) : '';

  const { data: membersData } = useQuery({
    queryKey: ['company-members', companyId],
    enabled: Boolean(companyId),
    queryFn: () =>
      apiClient
        .get<PaginatedResponse<CompanyMember>>(API.companies.members(companyId!))
        .then((r) => r.data),
  });

  const members = membersData?.results ?? [];

  // ─── Editable fields ─────────────────────────────────────────────
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
  }, [task]);

  // ─── Mutations ────────────────────────────────────────────────────
  const patchMutation = useMutation({
    mutationFn: async (
      payload: Partial<Pick<CrmTask, 'title' | 'description' | 'priority' | 'deadline'>>,
    ) => {
      const { data } = await apiClient.patch<CrmTask>(API.crm.taskDetail(taskId), payload);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['crm', 'tasks', boardId] });
      void queryClient.invalidateQueries({ queryKey: ['crm', 'task', taskId] });
      void queryClient.invalidateQueries({ queryKey: ['notifications-recent'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post(API.crm.taskArchive(taskId));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['crm', 'tasks', boardId] });
      queryClient.removeQueries({ queryKey: ['crm', 'task', taskId] });
      navigate(boardId ? `/crm/boards/${boardId}` : '/crm', { replace: true });
    },
  });

  const assigneeMutation = useMutation({
    mutationFn: async (newAssigneeId: number | null) => {
      const { data } = await apiClient.patch<CrmTask>(API.crm.taskDetail(taskId), {
        assignee_id: newAssigneeId,
      });
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['crm', 'tasks', boardId] });
      void queryClient.invalidateQueries({ queryKey: ['crm', 'task', taskId] });
      void queryClient.invalidateQueries({ queryKey: ['notifications-recent'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  const handleAssigneeChange = (value: string) => {
    setAssigneeId(value);
    const parsed = value ? parseInt(value, 10) : null;
    assigneeMutation.mutate(parsed);
  };

  const handleFieldBlur = useCallback(
    (field: 'title' | 'description' | 'priority' | 'deadline', value: string) => {
      if (!task) return;
      if (field === 'title' && !value.trim()) {
        setTitle(task.title);
        return;
      }
      if (field === 'deadline') {
        const cur = task.deadline ? String(task.deadline).slice(0, 10) : '';
        const next = value.trim().slice(0, 10);
        if (cur === next) return;
        patchMutation.mutate({ deadline: next || null });
        return;
      }
      const current = task[field] ?? '';
      if (String(current) === value) return;
      patchMutation.mutate({ [field]: value || null });
    },
    [task, patchMutation],
  );

  const handlePriorityChange = (val: TaskPriorityValue) => {
    setPriority(val);
    if (task && val !== task.priority) {
      patchMutation.mutate({ priority: val });
    }
  };

  // ─── Loading / Error states ───────────────────────────────────────
  if (isLoading) {
    return (
      <main className="px-3 py-4 sm:px-4 sm:py-6 md:py-8 max-w-4xl mx-auto space-y-6">
        <div className="h-4 w-28 rounded bg-gray-700 animate-pulse" />
        <div className="animate-pulse space-y-5">
          <div className="h-8 w-2/3 rounded bg-gray-700" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="h-32 rounded-xl bg-gray-800" />
              <div className="h-48 rounded-xl bg-gray-800" />
            </div>
            <div className="space-y-4">
              <div className="h-40 rounded-xl bg-gray-800" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (isError || !task) {
    return (
      <main className="px-3 py-4 sm:px-4 sm:py-6 md:py-8 max-w-4xl mx-auto space-y-4">
        <div className="flex items-center gap-2 rounded-lg border border-amber-800 bg-amber-900/30 px-4 py-3 text-sm text-amber-300">
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

  // ─── Main render ──────────────────────────────────────────────────
  return (
    <main className="px-3 py-4 sm:px-4 sm:py-6 md:py-8 max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <Link
        to={boardId ? `/crm/boards/${boardId}` : '/crm'}
        className="inline-flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 transition-colors"
      >
        <ChevronLeft size={16} />
        {boardId ? 'К доске' : 'К доскам'}
      </Link>

      {/* Page title area */}
      <div className="space-y-1">
        <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">
          Задача #{task.id}
        </p>
        <input
          id="page-task-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={(e) => handleFieldBlur('title', e.target.value.trim())}
          maxLength={255}
          className={cn(
            'w-full bg-transparent text-2xl font-bold text-white outline-none',
            'border-b-2 border-transparent focus:border-blue-500 transition-colors py-1',
          )}
        />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── Main content (left) ─────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <section className="rounded-2xl border border-gray-700 bg-gray-900 p-5 space-y-2">
            <label
              htmlFor="page-task-description"
              className="block text-sm font-semibold text-gray-300"
            >
              Описание
            </label>
            <textarea
              id="page-task-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={(e) => handleFieldBlur('description', e.target.value)}
              rows={6}
              placeholder="Добавьте описание задачи..."
              className={cn(
                'w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-white',
                'placeholder-gray-600 resize-none',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors',
              )}
            />
          </section>

          {/* Checklists */}
          {boardId && (
            <section className="rounded-2xl border border-gray-700 bg-gray-900 p-5">
              <ChecklistSection
                taskId={taskId}
                boardId={boardId}
                checklists={task.checklists ?? []}
              />
            </section>
          )}

          {/* Comments */}
          <section className="rounded-2xl border border-gray-700 bg-gray-900 p-5">
            <CommentSection taskId={taskId} />
          </section>

          {/* History */}
          <section className="rounded-2xl border border-gray-700 bg-gray-900 p-5">
            <HistorySection taskId={taskId} />
          </section>
        </div>

        {/* ─── Sidebar (right) ─────────────────────────────────── */}
        <div className="space-y-5">
          {/* Meta details card */}
          <section className="rounded-2xl border border-gray-700 bg-gray-900 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-300">Детали</h2>

            {/* Priority */}
            <div className="space-y-1.5">
              <label
                htmlFor="page-task-priority"
                className="flex items-center gap-1.5 text-xs font-medium text-gray-500 uppercase tracking-wide"
              >
                <Flag size={12} />
                Приоритет
              </label>
              <select
                id="page-task-priority"
                value={priority}
                onChange={(e) =>
                  handlePriorityChange(e.target.value as TaskPriorityValue)
                }
                className={cn(
                  'w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors',
                )}
              >
                {Object.entries(PRIORITY_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
              <span
                className={cn(
                  'inline-block rounded-full px-2.5 py-0.5 text-xs font-medium',
                  PRIORITY_BADGE[priority] ?? 'bg-gray-100 text-gray-600',
                )}
              >
                {PRIORITY_LABELS[priority] ?? priority}
              </span>
            </div>

            {/* Deadline */}
            <div className="space-y-1.5">
              <label
                htmlFor="page-task-deadline"
                className="flex items-center gap-1.5 text-xs font-medium text-gray-500 uppercase tracking-wide"
              >
                <Calendar size={12} />
                Дедлайн
              </label>
              <input
                id="page-task-deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                onBlur={(e) => handleFieldBlur('deadline', e.target.value)}
                className={cn(
                  'w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white [color-scheme:dark]',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors',
                )}
              />
            </div>

            {/* Assignee */}
            <div className="space-y-1.5">
              <label
                htmlFor="page-task-assignee"
                className="flex items-center gap-1.5 text-xs font-medium text-gray-500 uppercase tracking-wide"
              >
                <User size={12} />
                Исполнитель
              </label>
              <select
                id="page-task-assignee"
                value={assigneeId}
                onChange={(e) => handleAssigneeChange(e.target.value)}
                disabled={assigneeMutation.isPending}
                className={cn(
                  'w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white',
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
              {assigneeMutation.isError && (
                <p className="text-xs text-red-400">Не удалось изменить исполнителя.</p>
              )}
            </div>

            {/* Created at */}
            <div className="space-y-1">
              <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500 uppercase tracking-wide">
                <Clock size={12} />
                Создана
              </span>
              <p className="text-sm text-gray-400">{createdDate}</p>
            </div>

            {/* Attachments counter */}
            {task.attachments_count > 0 && (
              <div className="flex items-center gap-1.5 text-sm text-gray-500 pt-1 border-t border-gray-700">
                <Paperclip size={14} />
                {task.attachments_count} {task.attachments_count === 1 ? 'файл' : 'файлов'}
              </div>
            )}
          </section>

          {/* Labels card */}
          {boardId && (
            <section className="rounded-2xl border border-gray-700 bg-gray-900 p-5">
              <TaskLabelsSection
                taskId={taskId}
                boardId={boardId}
                taskLabels={task.labels ?? []}
              />
            </section>
          )}

          {/* Actions card */}
          <section className="rounded-2xl border border-gray-700 bg-gray-900 p-5 space-y-3">
            <h2 className="text-sm font-semibold text-gray-300">Действия</h2>

            {patchMutation.isError && (
              <p className="text-xs text-red-400">Не удалось сохранить изменения.</p>
            )}
            {archiveMutation.isError && (
              <p className="text-xs text-red-400">Не удалось архивировать задачу.</p>
            )}

            <button
              type="button"
              onClick={() => archiveMutation.mutate()}
              disabled={archiveMutation.isPending}
              className={cn(
                'flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                'border border-red-800 text-red-400 bg-red-900/30 hover:bg-red-900/50',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              <Archive size={14} />
              {archiveMutation.isPending ? 'Архивирование...' : 'Архивировать задачу'}
            </button>
          </section>
        </div>
      </div>
    </main>
  );
}
