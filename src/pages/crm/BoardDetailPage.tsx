import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DragCancelEvent,
  type DragOverEvent,
  DragOverlay,
  closestCenter,
  pointerWithin,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ChevronLeft,
  LayoutGrid,
  AlertCircle,
  Inbox,
  GripVertical,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  X,
  Check,
  MessageSquare,
  Paperclip,
  Calendar,
  User,
  Archive,
  Send,
} from 'lucide-react';
import { API } from '@/shared/api/endpoints';
import { apiClient } from '@/shared/api/client';
import { cn } from '@/shared/lib/cn';
import { useAuth } from '@/shared/hooks/useAuth';
import { USER_ROLES } from '@/shared/config/constants';
import type { CrmBoard, CrmColumn, CrmTask, CrmComment, CompanyMember, PaginatedResponse } from '@/shared/types';

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

// ─── Assignee Avatar ──────────────────────────────────────────────────────────

interface AssigneeAvatarProps {
  assignee: NonNullable<CrmTask['assignee']>;
  size?: 'sm' | 'md';
}

function AssigneeAvatar({ assignee, size = 'sm' }: AssigneeAvatarProps) {
  const initials = `${assignee.first_name[0] ?? ''}${assignee.last_name[0] ?? ''}`.toUpperCase();
  const sizeClass = size === 'sm' ? 'w-6 h-6 text-xs' : 'w-8 h-8 text-sm';

  if (assignee.avatar) {
    return (
      <img
        src={assignee.avatar}
        alt={`${assignee.first_name} ${assignee.last_name}`}
        className={cn('rounded-full object-cover shrink-0', sizeClass)}
      />
    );
  }

  return (
    <span
      className={cn(
        'rounded-full bg-blue-600 text-white font-medium flex items-center justify-center shrink-0',
        sizeClass,
      )}
      aria-label={`${assignee.first_name} ${assignee.last_name}`}
    >
      {initials}
    </span>
  );
}

// ─── Task Card ────────────────────────────────────────────────────────────────

interface TaskCardProps {
  task: CrmTask;
  onClick: () => void;
}

function TaskCard({ task, onClick }: TaskCardProps) {
  const overdue = task.deadline ? isOverdue(task.deadline) : false;

  return (
    <div
      aria-label={`Задача: ${task.title}`}
      className={cn(
        'group relative rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5',
        'hover:border-gray-600 hover:bg-gray-750 transition-colors',
        'space-y-2',
      )}
    >
      {/* Edit button — visible on hover */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className={cn(
          'absolute top-2 right-2 z-10',
          'p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity',
          'text-gray-500 hover:text-gray-200 hover:bg-gray-700',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:opacity-100',
        )}
        aria-label={`Редактировать задачу: ${task.title}`}
      >
        <Pencil size={12} />
      </button>

      {/* Title */}
      <p className="text-sm text-white leading-snug line-clamp-2 pr-6">{task.title}</p>

      {/* Priority badge */}
      <span
        className={cn(
          'inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium',
          PRIORITY_BADGE_CLASS[task.priority],
        )}
      >
        {PRIORITY_LABELS[task.priority]}
      </span>

      {/* Footer row: deadline + assignee + counts */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {task.deadline && (
            <span
              className={cn(
                'flex items-center gap-1 text-xs',
                overdue ? 'text-red-400' : 'text-gray-400',
              )}
              title={overdue ? 'Просрочено' : undefined}
            >
              <Calendar size={11} className="shrink-0" />
              {formatDeadline(task.deadline)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {task.comments_count > 0 && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <MessageSquare size={11} />
              {task.comments_count}
            </span>
          )}
          {task.attachments_count > 0 && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Paperclip size={11} />
              {task.attachments_count}
            </span>
          )}
          {task.assignee && (
            <AssigneeAvatar assignee={task.assignee} size="sm" />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sortable Task Card ───────────────────────────────────────────────────────

interface SortableTaskCardProps {
  task: CrmTask;
  onTaskClick: (taskId: number) => void;
}

function SortableTaskCard({ task, onTaskClick }: SortableTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `task-${task.id}`,
    data: { type: 'task', task },
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        isDragging && 'opacity-40',
        'cursor-grab active:cursor-grabbing',
      )}
    >
      <TaskCard task={task} onClick={() => onTaskClick(task.id)} />
    </div>
  );
}

// ─── Create Task Modal ────────────────────────────────────────────────────────

interface CreateTaskModalProps {
  boardId: string;
  columnId: number;
  onClose: () => void;
}

function CreateTaskModal({ boardId, columnId, onClose }: CreateTaskModalProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const titleRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriorityValue>('medium');
  const [deadline, setDeadline] = useState('');
  const [assigneeId, setAssigneeId] = useState('');

  const companyId = user?.company_id != null ? String(user.company_id) : null;

  const { data: membersData } = useQuery({
    queryKey: ['company-members', companyId],
    enabled: Boolean(companyId),
    queryFn: () =>
      apiClient
        .get<PaginatedResponse<CompanyMember>>(API.companies.members(companyId!))
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
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || mutation.isPending) return;

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
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-task-title"
    >
      <div className="w-full max-w-md rounded-xl bg-gray-900 border border-gray-800 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 id="create-task-title" className="text-lg font-semibold text-white">
            Новая задача
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors rounded-md p-1 hover:bg-gray-800"
            aria-label="Закрыть"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <label htmlFor="new-task-title" className="block text-sm font-medium text-gray-300">
              Название <span className="text-red-400">*</span>
            </label>
            <input
              ref={titleRef}
              id="new-task-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Введите название задачи"
              required
              maxLength={255}
              className={cn(
                'w-full rounded-lg border bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors',
                'border-gray-700 focus:border-blue-500',
              )}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label htmlFor="new-task-description" className="block text-sm font-medium text-gray-300">
              Описание{' '}
              <span className="text-gray-500 font-normal">(необязательно)</span>
            </label>
            <textarea
              id="new-task-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Добавьте описание..."
              rows={3}
              className={cn(
                'w-full rounded-lg border bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors',
                'border-gray-700 focus:border-blue-500 resize-none',
              )}
            />
          </div>

          {/* Priority + Deadline */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="new-task-priority" className="block text-sm font-medium text-gray-300">
                Приоритет <span className="text-red-400">*</span>
              </label>
              <select
                id="new-task-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriorityValue)}
                className={cn(
                  'w-full rounded-lg border bg-gray-800 px-3 py-2 text-sm text-white',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors',
                  'border-gray-700 focus:border-blue-500',
                )}
              >
                <option value="low">Низкий</option>
                <option value="medium">Средний</option>
                <option value="high">Высокий</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="new-task-deadline" className="block text-sm font-medium text-gray-300">
                Дедлайн{' '}
                <span className="text-gray-500 font-normal">(необяз.)</span>
              </label>
              <div className="relative">
                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                <input
                  id="new-task-deadline"
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className={cn(
                    'w-full rounded-lg border bg-gray-800 pl-8 pr-3 py-2 text-sm text-white',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors',
                    'border-gray-700 focus:border-blue-500 [color-scheme:dark]',
                  )}
                />
              </div>
            </div>
          </div>

          {/* Assignee */}
          <div className="space-y-1.5">
            <label htmlFor="new-task-assignee" className="block text-sm font-medium text-gray-300">
              Исполнитель{' '}
              <span className="text-gray-500 font-normal">(необязательно)</span>
            </label>
            <div className="relative">
              <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
              <select
                id="new-task-assignee"
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className={cn(
                  'w-full rounded-lg border bg-gray-800 pl-8 pr-3 py-2 text-sm text-white',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors',
                  'border-gray-700 focus:border-blue-500',
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

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={!title.trim() || mutation.isPending}
              className={cn(
                'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                'bg-blue-600 text-white hover:bg-blue-500',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              {mutation.isPending ? 'Создание...' : 'Создать задачу'}
            </button>
          </div>

          {/* Error */}
          {mutation.isError && (
            <p className="text-sm text-red-400">Превышен WIP-лимит колонки.</p>
          )}
        </form>
      </div>
    </div>
  );
}

// ─── Comment helpers ──────────────────────────────────────────────────────────

function formatCommentDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── Comment Item ─────────────────────────────────────────────────────────────

interface CommentItemProps {
  comment: CrmComment;
  currentUserId: number;
  currentUserRole: string;
  onUpdate: (commentId: number, text: string) => void;
  onDelete: (commentId: number) => void;
  isUpdating: boolean;
  isDeleting: boolean;
}

function CommentItem({
  comment,
  currentUserId,
  currentUserRole,
  onUpdate,
  onDelete,
  isUpdating,
  isDeleting,
}: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isAuthor = comment.author.id === currentUserId;
  const canEdit = isAuthor;
  const canDelete = isAuthor || currentUserRole === USER_ROLES.COMPANY_ADMIN;

  const initials = comment.author.full_name
    .split(' ')
    .map((n) => n[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handleEditStart = () => {
    setEditText(comment.text);
    setIsEditing(true);
  };

  const handleEditCancel = () => {
    setEditText(comment.text);
    setIsEditing(false);
  };

  const handleEditSave = () => {
    const trimmed = editText.trim();
    if (!trimmed || trimmed === comment.text) {
      setIsEditing(false);
      return;
    }
    onUpdate(comment.id, trimmed);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') handleEditCancel();
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleEditSave();
  };

  useEffect(() => {
    if (isEditing) textareaRef.current?.focus();
  }, [isEditing]);

  return (
    <div className="flex gap-3">
      {/* Avatar */}
      {comment.author.avatar ? (
        <img
          src={comment.author.avatar}
          alt={comment.author.full_name}
          className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5"
        />
      ) : (
        <span
          className="w-7 h-7 rounded-full bg-gray-700 text-gray-300 text-xs font-medium flex items-center justify-center shrink-0 mt-0.5"
          aria-label={comment.author.full_name}
        >
          {initials}
        </span>
      )}

      <div className="flex-1 min-w-0 space-y-1">
        {/* Author + date row */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-gray-300">{comment.author.full_name}</span>
          <span className="text-xs text-gray-600">{formatCommentDate(comment.created_at)}</span>
        </div>

        {/* Text or edit form */}
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              ref={textareaRef}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={3}
              className={cn(
                'w-full rounded-lg border bg-gray-800 px-3 py-2 text-sm text-white',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors',
                'border-gray-700 resize-none',
              )}
              aria-label="Редактировать комментарий"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleEditSave}
                disabled={!editText.trim() || isUpdating}
                className={cn(
                  'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                  'bg-blue-600 text-white hover:bg-blue-500',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                )}
              >
                {isUpdating ? 'Сохранение...' : 'Сохранить'}
              </button>
              <button
                type="button"
                onClick={handleEditCancel}
                className="rounded-md px-3 py-1 text-xs font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-300 whitespace-pre-wrap break-words">{comment.text}</p>
        )}

        {/* Actions */}
        {!isEditing && (canEdit || canDelete) && (
          <div className="flex items-center gap-3 pt-0.5">
            {canEdit && (
              <button
                type="button"
                onClick={handleEditStart}
                className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
              >
                Редактировать
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={() => onDelete(comment.id)}
                disabled={isDeleting}
                className="text-xs text-red-600 hover:text-red-400 transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Удаление...' : 'Удалить'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Comment Section ──────────────────────────────────────────────────────────

interface CommentSectionProps {
  taskId: number;
}

function CommentSection({ taskId }: CommentSectionProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [newText, setNewText] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const commentsQueryKey = ['crm', 'task', taskId, 'comments'] as const;

  const { data: comments, isLoading, isError } = useQuery({
    queryKey: commentsQueryKey,
    queryFn: async () => {
      const { data } = await apiClient.get<CrmComment[] | { results: CrmComment[] }>(
        API.crm.taskComments(taskId),
      );
      return Array.isArray(data) ? data : data.results;
    },
  });

  const createMutation = useMutation({
    mutationFn: (text: string) =>
      apiClient.post<CrmComment>(API.crm.taskComments(taskId), { text }).then((r) => r.data),
    onSuccess: () => {
      setNewText('');
      void queryClient.invalidateQueries({ queryKey: commentsQueryKey });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ commentId, text }: { commentId: number; text: string }) =>
      apiClient
        .patch<CrmComment>(API.crm.taskCommentDetail(taskId, commentId), { text })
        .then((r) => r.data),
    onMutate: ({ commentId }) => setUpdatingId(commentId),
    onSettled: () => setUpdatingId(null),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: commentsQueryKey });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (commentId: number) =>
      apiClient.delete(API.crm.taskCommentDetail(taskId, commentId)),
    onMutate: (commentId) => setDeletingId(commentId),
    onSettled: () => setDeletingId(null),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: commentsQueryKey });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newText.trim();
    if (!trimmed || createMutation.isPending) return;
    createMutation.mutate(trimmed);
  };

  const handleNewTextKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      const trimmed = newText.trim();
      if (trimmed && !createMutation.isPending) {
        createMutation.mutate(trimmed);
      }
    }
  };

  return (
    <div className="space-y-4 pt-2 border-t border-gray-800">
      {/* Section heading */}
      <div className="flex items-center gap-2">
        <MessageSquare size={14} className="text-gray-500 shrink-0" />
        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Комментарии</h3>
      </div>

      {/* Comment list */}
      {isLoading && (
        <div className="space-y-3 animate-pulse">
          {[1, 2].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-gray-700 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-24 rounded bg-gray-700" />
                <div className="h-4 w-full rounded bg-gray-700" />
              </div>
            </div>
          ))}
        </div>
      )}

      {isError && (
        <p className="text-xs text-red-400">Не удалось загрузить комментарии.</p>
      )}

      {!isLoading && !isError && comments && comments.length === 0 && (
        <p className="text-xs text-gray-600">Комментариев пока нет.</p>
      )}

      {!isLoading && !isError && comments && comments.length > 0 && (
        <div className="space-y-4">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUserId={user?.id ?? -1}
              currentUserRole={user?.role ?? ''}
              onUpdate={(commentId, text) => updateMutation.mutate({ commentId, text })}
              onDelete={(commentId) => deleteMutation.mutate(commentId)}
              isUpdating={updatingId === comment.id && updateMutation.isPending}
              isDeleting={deletingId === comment.id && deleteMutation.isPending}
            />
          ))}
        </div>
      )}

      {/* New comment form */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <textarea
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={handleNewTextKeyDown}
          placeholder="Написать комментарий..."
          rows={3}
          className={cn(
            'w-full rounded-lg border bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-600',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors',
            'border-gray-700 resize-none',
          )}
          aria-label="Текст нового комментария"
        />
        <div className="flex items-center justify-between">
          {createMutation.isError && (
            <p className="text-xs text-red-400">Не удалось отправить комментарий.</p>
          )}
          <div className="ml-auto">
            <button
              type="submit"
              disabled={!newText.trim() || createMutation.isPending}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                'bg-blue-600 text-white hover:bg-blue-500',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              <Send size={13} />
              {createMutation.isPending ? 'Отправка...' : 'Отправить'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

// ─── Task Detail Modal ────────────────────────────────────────────────────────

interface TaskDetailModalProps {
  taskId: number;
  boardId: string;
  onClose: () => void;
}

function TaskDetailModal({ taskId, boardId, onClose }: TaskDetailModalProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const companyId = user?.company_id != null ? String(user.company_id) : null;

  const { data: task, isLoading, isError } = useQuery({
    queryKey: ['crm', 'task', taskId],
    queryFn: async () => {
      const { data } = await apiClient.get<CrmTask>(API.crm.taskDetail(taskId));
      return data;
    },
  });

  const { data: membersData } = useQuery({
    queryKey: ['company-members', companyId],
    enabled: Boolean(companyId),
    queryFn: () =>
      apiClient
        .get<PaginatedResponse<CompanyMember>>(API.companies.members(companyId!))
        .then((r) => r.data),
  });

  const members = membersData?.results ?? [];

  // Local state for editable fields (initialised from fetched task)
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriorityValue>('medium');
  const [deadline, setDeadline] = useState('');
  const [assigneeId, setAssigneeId] = useState('');

  // Sync local state when task loads
  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setDescription(task.description ?? '');
    setPriority(task.priority);
    setDeadline(task.deadline ? task.deadline.slice(0, 10) : '');
    setAssigneeId(task.assignee ? String(task.assignee.id) : '');
  }, [task]);

  const patchMutation = useMutation({
    mutationFn: async (payload: Partial<Pick<CrmTask, 'title' | 'description' | 'priority' | 'deadline'>>) => {
      const { data } = await apiClient.patch<CrmTask>(API.crm.taskDetail(taskId), payload);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['crm', 'tasks', boardId] });
      void queryClient.invalidateQueries({ queryKey: ['crm', 'task', taskId] });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post(API.crm.taskArchive(taskId));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['crm', 'tasks', boardId] });
      onClose();
    },
  });

  const handleArchive = () => {
    archiveMutation.mutate();
  };

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

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 pt-16 overflow-y-auto"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-detail-title"
    >
      <div className="w-full max-w-xl rounded-xl border border-gray-700 bg-gray-900 shadow-2xl mb-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 id="task-detail-title" className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
            Задача
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors rounded-md p-1 hover:bg-gray-800"
            aria-label="Закрыть"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-5">
          {isLoading && (
            <div className="animate-pulse space-y-4">
              <div className="h-6 w-3/4 rounded bg-gray-700" />
              <div className="h-4 w-1/2 rounded bg-gray-700" />
              <div className="h-4 w-2/3 rounded bg-gray-700" />
              <div className="h-20 w-full rounded bg-gray-700" />
              <div className="h-4 w-1/3 rounded bg-gray-700" />
            </div>
          )}

          {isError && (
            <div className="flex items-center gap-2 rounded-lg border border-red-800 bg-red-900/30 px-4 py-3 text-sm text-red-300">
              <AlertCircle size={16} className="shrink-0" />
              <span>Не удалось загрузить задачу.</span>
            </div>
          )}

          {task && !isLoading && (
            <>
              {/* Title */}
              <div className="space-y-1.5">
                <label htmlFor="task-title" className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Название
                </label>
                <input
                  id="task-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={(e) => handleFieldBlur('title', e.target.value.trim())}
                  maxLength={255}
                  className={cn(
                    'w-full rounded-lg border bg-gray-800 px-3 py-2 text-base font-medium text-white',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors border-gray-700',
                  )}
                />
              </div>

              {/* Priority + Deadline row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="task-priority" className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Приоритет
                  </label>
                  <select
                    id="task-priority"
                    value={priority}
                    onChange={(e) => handlePriorityChange(e.target.value as TaskPriorityValue)}
                    className={cn(
                      'w-full rounded-lg border bg-gray-800 px-3 py-2 text-sm text-white',
                      'focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors border-gray-700',
                    )}
                  >
                    <option value="low">Низкий</option>
                    <option value="medium">Средний</option>
                    <option value="high">Высокий</option>
                    <option value="critical">Критический</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="task-deadline" className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Дедлайн
                  </label>
                  <input
                    id="task-deadline"
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    onBlur={(e) => handleFieldBlur('deadline', e.target.value)}
                    className={cn(
                      'w-full rounded-lg border bg-gray-800 px-3 py-2 text-sm text-white',
                      'focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors border-gray-700',
                      '[color-scheme:dark]',
                    )}
                  />
                </div>
              </div>

              {/* Assignee */}
              <div className="space-y-1.5">
                <label
                  htmlFor="task-assignee"
                  className="block text-xs font-medium text-gray-500 uppercase tracking-wide"
                >
                  Исполнитель
                </label>
                <div className="relative">
                  <User
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
                  />
                  <select
                    id="task-assignee"
                    value={assigneeId}
                    onChange={(e) => handleAssigneeChange(e.target.value)}
                    disabled={assigneeMutation.isPending}
                    className={cn(
                      'w-full rounded-lg border bg-gray-800 pl-8 pr-3 py-2 text-sm text-white',
                      'focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors border-gray-700',
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
                {assigneeMutation.isError && (
                  <p className="text-xs text-red-400">Не удалось изменить исполнителя.</p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label htmlFor="task-description" className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Описание
                </label>
                <textarea
                  id="task-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={(e) => handleFieldBlur('description', e.target.value)}
                  rows={4}
                  placeholder="Добавьте описание..."
                  className={cn(
                    'w-full rounded-lg border bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-600',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors border-gray-700 resize-none',
                  )}
                />
              </div>

              {task.attachments_count > 0 && (
                <div className="flex items-center gap-4 pt-1 border-t border-gray-800">
                  <span className="flex items-center gap-1.5 text-sm text-gray-400">
                    <Paperclip size={14} />
                    {task.attachments_count} {task.attachments_count === 1 ? 'файл' : 'файлов'}
                  </span>
                </div>
              )}

              {patchMutation.isError && (
                <p className="text-xs text-red-400">Не удалось сохранить изменения.</p>
              )}

              {/* Comments */}
              <CommentSection taskId={taskId} />

              {/* Archive */}
              <div className="pt-2 border-t border-gray-800">
                {archiveMutation.isError && (
                  <p className="text-xs text-red-400 mb-2">Не удалось архивировать задачу.</p>
                )}
                <button
                  type="button"
                  onClick={handleArchive}
                  disabled={archiveMutation.isPending}
                  className={cn(
                    'flex items-center gap-1.5 text-sm transition-colors',
                    'text-red-400 hover:text-red-300',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                  )}
                >
                  <Archive size={14} />
                  {archiveMutation.isPending ? 'Архивирование...' : 'Архивировать'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Create Column Modal ───────────────────────────────────────────────────────

interface CreateColumnModalProps {
  boardId: string;
  onClose: () => void;
}

function CreateColumnModal({ boardId, onClose }: CreateColumnModalProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [wipLimit, setWipLimit] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const mutation = useMutation({
    mutationFn: async (payload: { name: string; wip_limit?: number | null }) => {
      const { data } = await apiClient.post<CrmColumn>(API.crm.columns(boardId), payload);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['crm', 'columns', boardId] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const trimmed = wipLimit.trim();
    const resolvedWipLimit: number | null = trimmed === '' ? null : Number(trimmed);
    mutation.mutate({
      name: name.trim(),
      wip_limit: resolvedWipLimit,
    });
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-column-title"
    >
      <div className="w-full max-w-md rounded-xl bg-gray-900 border border-gray-800 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 id="create-column-title" className="text-lg font-semibold text-white">
            Добавить колонку
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors rounded-md p-1 hover:bg-gray-800"
            aria-label="Закрыть"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="column-name" className="block text-sm font-medium text-gray-300">
              Название <span className="text-red-400">*</span>
            </label>
            <input
              ref={nameRef}
              id="column-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например: В работе"
              required
              maxLength={100}
              className={cn(
                'w-full rounded-lg border bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors',
                'border-gray-700 focus:border-blue-500',
              )}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="column-wip" className="block text-sm font-medium text-gray-300">
              Лимит WIP{' '}
              <span className="text-gray-500 font-normal">(необязательно)</span>
            </label>
            <input
              id="column-wip"
              type="number"
              min={0}
              value={wipLimit}
              onChange={(e) => setWipLimit(e.target.value)}
              placeholder="Максимум задач в колонке"
              className={cn(
                'w-full rounded-lg border bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors',
                'border-gray-700 focus:border-blue-500',
              )}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={!name.trim() || mutation.isPending}
              className={cn(
                'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                'bg-blue-600 text-white hover:bg-blue-500',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              {mutation.isPending ? 'Создание...' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Edit Column Modal ─────────────────────────────────────────────────────────

interface EditColumnModalProps {
  boardId: string;
  column: CrmColumn;
  onClose: () => void;
}

function EditColumnModal({ boardId, column, onClose }: EditColumnModalProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(column.name);
  const [wipLimit, setWipLimit] = useState(column.wip_limit !== null ? String(column.wip_limit) : '');
  const [position, setPosition] = useState(String(column.order));
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const mutation = useMutation({
    mutationFn: async (payload: { name?: string; wip_limit?: number | null; position?: number }) => {
      const { data } = await apiClient.patch<CrmColumn>(
        API.crm.column(boardId, column.id),
        payload,
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['crm', 'columns', boardId] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const trimmed = wipLimit.trim();
    const resolvedWipLimit: number | null = trimmed === '' ? null : Number(trimmed);
    const resolvedPosition = Number(position);

    const payload: { name: string; wip_limit: number | null; position?: number } = {
      name: name.trim(),
      wip_limit: resolvedWipLimit,
    };
    if (resolvedPosition !== column.order) {
      payload.position = resolvedPosition;
    }

    mutation.mutate(payload);
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-column-title"
    >
      <div className="w-full max-w-md rounded-xl bg-gray-900 border border-gray-800 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 id="edit-column-title" className="text-lg font-semibold text-white">
            Редактировать колонку
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors rounded-md p-1 hover:bg-gray-800"
            aria-label="Закрыть"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="edit-column-name" className="block text-sm font-medium text-gray-300">
              Название <span className="text-red-400">*</span>
            </label>
            <input
              ref={nameRef}
              id="edit-column-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
              className={cn(
                'w-full rounded-lg border bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors',
                'border-gray-700 focus:border-blue-500',
              )}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="edit-column-wip" className="block text-sm font-medium text-gray-300">
              Лимит WIP{' '}
              <span className="text-gray-500 font-normal">(необязательно)</span>
            </label>
            <input
              id="edit-column-wip"
              type="number"
              min={0}
              value={wipLimit}
              onChange={(e) => setWipLimit(e.target.value)}
              placeholder="Без ограничений"
              className={cn(
                'w-full rounded-lg border bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors',
                'border-gray-700 focus:border-blue-500',
              )}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="edit-column-position" className="block text-sm font-medium text-gray-300">
              Позиция
            </label>
            <input
              id="edit-column-position"
              type="number"
              min={1}
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className={cn(
                'w-full rounded-lg border bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors',
                'border-gray-700 focus:border-blue-500',
              )}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={!name.trim() || mutation.isPending}
              className={cn(
                'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                'bg-blue-600 text-white hover:bg-blue-500',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              {mutation.isPending ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delete Column Dialog ──────────────────────────────────────────────────────

interface DeleteColumnDialogProps {
  boardId: string;
  column: CrmColumn;
  otherColumns: CrmColumn[];
  onClose: () => void;
}

function DeleteColumnDialog({ boardId, column, otherColumns, onClose }: DeleteColumnDialogProps) {
  const queryClient = useQueryClient();
  const [moveToId, setMoveToId] = useState<string>(
    otherColumns.length > 0 ? String(otherColumns[0].id) : '',
  );

  const mutation = useMutation({
    mutationFn: async (targetId: string) => {
      await apiClient.delete(
        `${API.crm.column(boardId, column.id)}?move_to=${targetId}`,
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['crm', 'columns', boardId] });
      onClose();
    },
  });

  const handleConfirm = () => {
    if (!moveToId) return;
    mutation.mutate(moveToId);
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-column-title"
    >
      <div className="w-full max-w-sm rounded-xl bg-gray-900 border border-gray-800 shadow-2xl px-6 py-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-red-900/40 p-2">
            <Trash2 size={18} className="text-red-400" />
          </div>
          <h2 id="delete-column-title" className="text-base font-semibold text-white">
            Удалить колонку?
          </h2>
        </div>

        <p className="text-sm text-gray-400">
          Колонка{' '}
          <span className="font-medium text-gray-200">«{column.name}»</span> будет удалена.
          {otherColumns.length > 0
            ? ' Выберите колонку, в которую переместятся задачи.'
            : ' В этой доске нет других колонок — удаление недоступно.'}
        </p>

        {otherColumns.length > 0 ? (
          <div className="space-y-1.5">
            <label
              htmlFor="move-to-select"
              className="block text-sm font-medium text-gray-300"
            >
              Переместить задачи в:
            </label>
            <select
              id="move-to-select"
              value={moveToId}
              onChange={(e) => setMoveToId(e.target.value)}
              className={cn(
                'w-full rounded-lg border bg-gray-800 px-3 py-2 text-sm text-white',
                'focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors',
                'border-gray-700 focus:border-red-500',
              )}
            >
              {otherColumns.map((col) => (
                <option key={col.id} value={col.id}>
                  {col.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {mutation.isError && (
          <div className="flex items-start gap-2 rounded-lg bg-red-900/30 border border-red-800 px-4 py-3 text-sm text-red-300">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>Не удалось удалить колонку. Попробуйте снова.</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!moveToId || mutation.isPending || otherColumns.length === 0}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              'bg-red-600 text-white hover:bg-red-500',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            {mutation.isPending ? 'Удаление...' : 'Удалить'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Column Header Menu ────────────────────────────────────────────────────────

interface ColumnHeaderMenuProps {
  column: CrmColumn;
  onEdit: () => void;
  onDelete: () => void;
}

function ColumnHeaderMenu({ column, onEdit, onDelete }: ColumnHeaderMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="p-1 rounded text-gray-600 hover:text-gray-400 hover:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-600 transition-colors"
        aria-label={`Действия с колонкой ${column.name}`}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <MoreHorizontal size={14} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 w-40 rounded-lg border border-gray-700 bg-gray-900 shadow-xl z-20 py-1"
          role="menu"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => { setOpen(false); onEdit(); }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <Pencil size={13} />
            Редактировать
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => { setOpen(false); onDelete(); }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-900/20 transition-colors"
          >
            <Trash2 size={13} />
            Удалить
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Kanban Column ────────────────────────────────────────────────────────────

interface KanbanColumnProps {
  column: CrmColumn;
  allColumns: CrmColumn[];
  boardId: string;
  tasks: CrmTask[];
  onTaskClick: (taskId: number) => void;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  isDragOverlay?: boolean;
}

function KanbanColumn({
  column,
  allColumns,
  boardId,
  tasks,
  onTaskClick,
  dragHandleProps,
  isDragOverlay,
}: KanbanColumnProps) {
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);

  const otherColumns = allColumns.filter((c) => c.id !== column.id);

  return (
    <>
      <div className="group flex flex-col rounded-xl border border-gray-800 bg-gray-900 w-72 shrink-0">
        {/* Column header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="text-sm font-semibold text-white truncate">{column.name}</h3>
            {tasks.length > 0 && (
              <span className="shrink-0 inline-flex items-center rounded-md bg-gray-800 border border-gray-700 px-1.5 py-0.5 text-xs text-gray-400">
                {tasks.length}
              </span>
            )}
            {column.wip_limit !== null && (
              <span
                className={cn(
                  'shrink-0 inline-flex items-center rounded-md border px-1.5 py-0.5 text-xs',
                  tasks.length >= column.wip_limit
                    ? 'bg-red-900/40 border-red-700 text-red-400'
                    : 'bg-gray-800 border-gray-700 text-gray-400',
                )}
                title={`WIP-лимит: ${column.wip_limit}`}
              >
                /{column.wip_limit}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {!isDragOverlay && (
              <ColumnHeaderMenu
                column={column}
                onEdit={() => setShowEdit(true)}
                onDelete={() => setShowDelete(true)}
              />
            )}
            <button
              {...dragHandleProps}
              tabIndex={0}
              className={cn(
                'p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity',
                'text-gray-400 group-hover:text-gray-600',
                'cursor-grab active:cursor-grabbing',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:opacity-100',
              )}
              aria-label="Перетащить колонку"
            >
              <GripVertical size={14} />
            </button>
          </div>
        </div>

        {/* Tasks area */}
        <SortableContext
          items={tasks.map(t => `task-${t.id}`)}
          strategy={verticalListSortingStrategy}
        >
          <div
            className="flex flex-col flex-1 px-3 py-3 gap-2 min-h-[200px]"
            data-column-id={column.id}
          >
            {tasks.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center">
                <Inbox size={20} className="text-gray-600" />
                <p className="text-xs text-gray-600">Нет задач</p>
              </div>
            ) : (
              tasks.map((task) => (
                <SortableTaskCard
                  key={task.id}
                  task={task}
                  onTaskClick={onTaskClick}
                />
              ))
            )}
          </div>
        </SortableContext>

        {/* Add task button */}
        {!isDragOverlay && (
          <div className="px-3 pb-3">
            <button
              type="button"
              onClick={() => setShowAddTask(true)}
              className={cn(
                'flex w-full items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium',
                'text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
              )}
            >
              <Plus size={13} />
              Добавить задачу
            </button>
          </div>
        )}
      </div>

      {showAddTask && (
        <CreateTaskModal
          boardId={boardId}
          columnId={column.id}
          onClose={() => setShowAddTask(false)}
        />
      )}

      {showEdit && (
        <EditColumnModal
          boardId={boardId}
          column={column}
          onClose={() => setShowEdit(false)}
        />
      )}

      {showDelete && (
        <DeleteColumnDialog
          boardId={boardId}
          column={column}
          otherColumns={otherColumns}
          onClose={() => setShowDelete(false)}
        />
      )}
    </>
  );
}

// ─── Sortable Column ──────────────────────────────────────────────────────────

interface SortableColumnProps {
  column: CrmColumn;
  allColumns: CrmColumn[];
  boardId: string;
  tasks: CrmTask[];
  onTaskClick: (taskId: number) => void;
}

function SortableColumn({ column, allColumns, boardId, tasks, onTaskClick }: SortableColumnProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: column.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && 'opacity-40')}>
      <KanbanColumn
        column={column}
        allColumns={allColumns}
        boardId={boardId}
        tasks={tasks}
        onTaskClick={onTaskClick}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

// ─── Add Column Button ────────────────────────────────────────────────────────

interface AddColumnButtonProps {
  onClick: () => void;
}

function AddColumnButton({ onClick }: AddColumnButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 w-72 shrink-0 rounded-xl border border-dashed border-gray-700',
        'px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-300 hover:border-gray-500',
        'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
        'min-h-[200px] justify-center flex-col',
      )}
      aria-label="Добавить колонку"
    >
      <Plus size={20} />
      <span>Добавить колонку</span>
    </button>
  );
}

// ─── Inline Add Column ────────────────────────────────────────────────────────

interface InlineAddColumnProps {
  boardId: string;
  onDone: () => void;
}

function InlineAddColumn({ boardId, onDone }: InlineAddColumnProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const mutation = useMutation({
    mutationFn: async (columnName: string) => {
      const { data } = await apiClient.post<CrmColumn>(API.crm.columns(boardId), { name: columnName });
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['crm', 'columns', boardId] });
      onDone();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || mutation.isPending) return;
    mutation.mutate(name.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onDone();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col rounded-xl border border-blue-600/50 bg-gray-900 w-72 shrink-0 px-4 py-3 gap-2"
      aria-label="Создание новой колонки"
    >
      <input
        ref={inputRef}
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Название колонки..."
        maxLength={100}
        required
        className={cn(
          'w-full rounded-lg border bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors border-gray-700',
        )}
      />
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={!name.trim() || mutation.isPending}
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
            'bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        >
          <Check size={13} />
          {mutation.isPending ? 'Создание...' : 'Создать'}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors"
          aria-label="Отмена"
        >
          <X size={15} />
        </button>
      </div>
    </form>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function BoardDetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-4 w-28 rounded bg-gray-800" />
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-gray-800" />
        <div className="h-7 w-48 rounded-lg bg-gray-800" />
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="w-72 shrink-0 h-64 rounded-xl bg-gray-800" />
        ))}
      </div>
    </div>
  );
}

// ─── BoardDetailPage ──────────────────────────────────────────────────────────

export default function BoardDetailPage() {
  const { id } = useParams<{ id: string }>();
  const boardId = id ?? '';

  const { user } = useAuth();

  const queryClient = useQueryClient();
  const [localColumns, setLocalColumns] = useState<CrmColumn[]>([]);
  const [localTasksByColumn, setLocalTasksByColumn] = useState<Record<number, CrmTask[]>>({});
  const [activeColumn, setActiveColumn] = useState<CrmColumn | null>(null);
  const [activeTask, setActiveTask] = useState<CrmTask | null>(null);
  const [activeDragType, setActiveDragType] = useState<'column' | 'task' | null>(null);
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [reorderError, setReorderError] = useState(false);
  const [taskMoveError, setTaskMoveError] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const reorderErrorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const taskMoveErrorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const snapshotRef = useRef<CrmColumn[]>([]);
  const taskSnapshotRef = useRef<Record<number, CrmTask[]>>({});
  // Refs to avoid stale closures in DnD event handlers
  const activeDragTypeRef = useRef<'column' | 'task' | null>(null);
  const localTasksByColumnRef = useRef<Record<number, CrmTask[]>>({});

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const {
    data: board,
    isLoading: isBoardLoading,
    isError: isBoardError,
    error: boardError,
  } = useQuery({
    queryKey: ['crm', 'board', boardId],
    queryFn: async () => {
      const { data } = await apiClient.get<CrmBoard>(API.crm.board(boardId));
      return data;
    },
    enabled: Boolean(boardId),
  });

  const {
    data: columns,
    isLoading: isColumnsLoading,
    isError: isColumnsError,
  } = useQuery({
    queryKey: ['crm', 'columns', boardId],
    queryFn: async () => {
      const { data } = await apiClient.get<CrmColumn[] | { results: CrmColumn[] }>(
        API.crm.columns(boardId),
      );
      return Array.isArray(data) ? data : data.results;
    },
    enabled: Boolean(boardId),
  });

  const {
    data: tasksData,
    isLoading: isTasksLoading,
  } = useQuery({
    queryKey: ['crm', 'tasks', boardId],
    queryFn: async () => {
      const { data } = await apiClient.get<CrmTask[] | { results: CrmTask[] }>(
        API.crm.tasksList,
        { params: { board_id: boardId } },
      );
      return Array.isArray(data) ? data : data.results;
    },
    enabled: Boolean(boardId),
  });

  const tasks = tasksData ?? [];

  useEffect(() => {
    if (columns) setLocalColumns([...columns].sort((a, b) => a.order - b.order));
  }, [columns]);

  useEffect(() => {
    if (!tasksData) return;
    const grouped = tasksData.reduce<Record<number, CrmTask[]>>((acc, task) => {
      const col = task.column_id;
      if (!acc[col]) acc[col] = [];
      acc[col].push(task);
      return acc;
    }, {});
    for (const col of Object.keys(grouped)) {
      grouped[Number(col)].sort((a, b) => a.position - b.position || a.id - b.id);
    }
    localTasksByColumnRef.current = grouped;
    setLocalTasksByColumn(grouped);
  }, [tasksData]);

  const reorderMutation = useMutation({
    mutationFn: (columnIds: number[]) =>
      apiClient.post(API.crm.columnsReorder(boardId), { column_ids: columnIds }),
    onError: () => {
      setLocalColumns(snapshotRef.current);
      queryClient.setQueryData<CrmColumn[]>(['crm', 'columns', boardId], snapshotRef.current);
      setReorderError(true);
      if (reorderErrorTimerRef.current) clearTimeout(reorderErrorTimerRef.current);
      reorderErrorTimerRef.current = setTimeout(() => setReorderError(false), 3000);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['crm', 'columns', boardId] });
    },
  });

  const taskMoveMutation = useMutation({
    mutationFn: ({ taskId, columnId, position }: { taskId: number; columnId: number; position: number }) =>
      apiClient.post(API.crm.taskMove(taskId), { column_id: columnId, position }),
    onError: (error: unknown) => {
      // Rollback optimistic update
      localTasksByColumnRef.current = taskSnapshotRef.current;
      setLocalTasksByColumn(taskSnapshotRef.current);
      // Check for WIP limit error (HTTP 400)
      let message = 'Не удалось переместить задачу.';
      const axiosError = error as { response?: { status?: number; data?: unknown } };
      if (axiosError.response?.status === 400) {
        const data = axiosError.response.data as Record<string, unknown> | undefined;
        const raw = data?.detail ?? (data?.non_field_errors as unknown[])?.[0];
        const detail = typeof raw === 'string' ? raw : JSON.stringify(raw ?? '');
        if (detail.toLowerCase().includes('wip')) {
          message = 'Превышен WIP-лимит колонки.';
        }
      }
      setTaskMoveError(message);
      if (taskMoveErrorTimerRef.current) clearTimeout(taskMoveErrorTimerRef.current);
      taskMoveErrorTimerRef.current = setTimeout(() => setTaskMoveError(null), 4000);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['crm', 'tasks', boardId] });
    },
  });

  const handleDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id);
    if (id.startsWith('task-')) {
      const taskId = Number(id.replace('task-', ''));
      const task = tasks.find(t => t.id === taskId) ?? null;
      setActiveTask(task);
      setActiveDragType('task');
      activeDragTypeRef.current = 'task';
      taskSnapshotRef.current = structuredClone(localTasksByColumnRef.current);
    } else {
      const col = localColumns.find(c => c.id === event.active.id);
      setActiveColumn(col ?? null);
      setActiveDragType('column');
      activeDragTypeRef.current = 'column';
      snapshotRef.current = [...localColumns];
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    if (activeDragTypeRef.current !== 'task') return;

    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = over.id;

    if (!activeId.startsWith('task-')) return;

    const activeTaskId = Number(activeId.replace('task-', ''));

    // Always read from the ref — it is updated synchronously below so
    // consecutive onDragOver calls within the same React render cycle see the
    // correct intermediate state.
    const currentTasksByColumn = localTasksByColumnRef.current;

    // Find which column the task currently lives in (after optimistic moves)
    let sourceColId: number | undefined;
    for (const [colId, colTasks] of Object.entries(currentTasksByColumn)) {
      if (colTasks.some(t => t.id === activeTaskId)) {
        sourceColId = Number(colId);
        break;
      }
    }
    if (sourceColId === undefined) return;

    // Determine the target column id.
    // over.id may be a task id (string "task-X") or a column id (number).
    let targetColId: number;
    if (typeof overId === 'string' && overId.startsWith('task-')) {
      const overTaskId = Number(overId.replace('task-', ''));
      let overTaskColId: number | undefined;
      for (const [colId, colTasks] of Object.entries(currentTasksByColumn)) {
        if (colTasks.some(t => t.id === overTaskId)) {
          overTaskColId = Number(colId);
          break;
        }
      }
      targetColId = overTaskColId ?? sourceColId;
    } else if (typeof overId === 'number') {
      // Dragged over a column's empty area directly.
      targetColId = overId;
    } else {
      return;
    }

    if (sourceColId === targetColId) {
      // Same-column reorder: apply optimistic arrayMove so the list reflects
      // the in-progress position during the drag.
      if (typeof overId === 'string' && overId.startsWith('task-')) {
        const overTaskId = Number(overId.replace('task-', ''));
        const list = [...(currentTasksByColumn[sourceColId] ?? [])];
        const fromIdx = list.findIndex(t => t.id === activeTaskId);
        const toIdx = list.findIndex(t => t.id === overTaskId);
        if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return;
        const reordered = arrayMove(list, fromIdx, toIdx);
        // Update ref synchronously so the next onDragOver call reads the
        // already-moved position rather than the stale one.
        localTasksByColumnRef.current = {
          ...currentTasksByColumn,
          [sourceColId]: reordered,
        };
        setLocalTasksByColumn(localTasksByColumnRef.current);
      }
      return;
    }

    // Move task between columns optimistically.
    const sourceList = [...(currentTasksByColumn[sourceColId] ?? [])];
    const targetList = [...(currentTasksByColumn[targetColId] ?? [])];
    const taskIndex = sourceList.findIndex(t => t.id === activeTaskId);
    if (taskIndex === -1) return;
    const [movedTask] = sourceList.splice(taskIndex, 1);
    const updatedTask = { ...movedTask, column_id: targetColId };

    // Insert at the position of the over-task inside the target column, or
    // append to the end when dropping on the column container itself.
    if (typeof overId === 'string' && overId.startsWith('task-')) {
      const overTaskId = Number(overId.replace('task-', ''));
      const overIdx = targetList.findIndex(t => t.id === overTaskId);
      if (overIdx !== -1) {
        targetList.splice(overIdx, 0, updatedTask);
      } else {
        targetList.push(updatedTask);
      }
    } else {
      targetList.push(updatedTask);
    }

    // Update ref synchronously before scheduling the state update.
    localTasksByColumnRef.current = {
      ...currentTasksByColumn,
      [sourceColId]: sourceList,
      [targetColId]: targetList,
    };
    setLocalTasksByColumn(localTasksByColumnRef.current);
  };

  const handleDragCancel = (_event: DragCancelEvent) => {
    const dragType = activeDragTypeRef.current;
    setActiveColumn(null);
    setActiveTask(null);
    setActiveDragType(null);
    activeDragTypeRef.current = null;
    if (dragType === 'column') {
      setLocalColumns(snapshotRef.current);
    } else if (dragType === 'task') {
      localTasksByColumnRef.current = taskSnapshotRef.current;
      setLocalTasksByColumn(taskSnapshotRef.current);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    // Read the type from the ref before clearing — state may still be the
    // pre-update value due to async setState batching.
    const dragType = activeDragTypeRef.current;
    setActiveColumn(null);
    setActiveTask(null);
    setActiveDragType(null);
    activeDragTypeRef.current = null;

    if (dragType === 'column') {
      if (!over) {
        setLocalColumns(snapshotRef.current);
        return;
      }
      if (active.id === over.id) return;

      const oldIndex = localColumns.findIndex(c => c.id === active.id);
      const newIndex = localColumns.findIndex(c => c.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(localColumns, oldIndex, newIndex).map((col, idx) => ({
        ...col,
        order: idx + 1,
      }));
      setLocalColumns(reordered);
      reorderMutation.mutate(reordered.map(c => c.id));
      return;
    }

    if (dragType === 'task') {
      if (!over) {
        setLocalTasksByColumn(taskSnapshotRef.current);
        return;
      }

      const activeId = active.id as string;

      if (!activeId.startsWith('task-')) return;

      const activeTaskId = Number(activeId.replace('task-', ''));

      // The ref is always kept in sync synchronously inside handleDragOver,
      // so it reflects the final optimistic position at drop time.
      const finalTasksByColumn = localTasksByColumnRef.current;

      // Find the task's final column and 1-based index after all optimistic moves.
      let targetColId: number | null = null;
      let taskOrderInTarget = 1;

      for (const [colIdStr, colTasks] of Object.entries(finalTasksByColumn)) {
        const idx = colTasks.findIndex(t => t.id === activeTaskId);
        if (idx !== -1) {
          targetColId = Number(colIdStr);
          taskOrderInTarget = idx + 1;
          break;
        }
      }

      if (targetColId === null) {
        setLocalTasksByColumn(taskSnapshotRef.current);
        return;
      }

      // Find the original column and visual index from the snapshot.
      // We compare visual indices (not the backend `position` field) because
      // local task objects keep their stale backend position until the next
      // query invalidation; comparing against that value produces false
      // "no-change" results after any prior move.
      let originalColId: number | null = null;
      let originalVisualIndex = -1;
      for (const [colIdStr, colTasks] of Object.entries(taskSnapshotRef.current)) {
        const idx = colTasks.findIndex(t => t.id === activeTaskId);
        if (idx !== -1) {
          originalColId = Number(colIdStr);
          originalVisualIndex = idx;
          break;
        }
      }

      const hasColumnChanged = originalColId !== targetColId;
      // taskOrderInTarget is 1-based; originalVisualIndex is 0-based.
      const hasPositionChanged = originalVisualIndex !== taskOrderInTarget - 1;

      if (!hasColumnChanged && !hasPositionChanged) return;

      taskMoveMutation.mutate({
        taskId: activeTaskId,
        columnId: targetColId,
        position: taskOrderInTarget,
      });
    }
  };

  const isLoading = isBoardLoading || isColumnsLoading;
  const isError = isBoardError || isColumnsError;

  if (isLoading) return <BoardDetailSkeleton />;

  if (isError || !board) {
    return (
      <div className="space-y-4">
        <Link
          to="/crm"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ChevronLeft size={16} />
          Назад к доскам
        </Link>
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <AlertCircle size={40} className="text-red-400" />
          <p className="text-gray-400">
            Не удалось загрузить доску. Попробуйте обновить страницу.
          </p>
          {isBoardError && (
            <p className="text-xs text-gray-600 mt-1">
              {(boardError as { message?: string })?.message}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back navigation */}
      <Link
        to="/crm"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
      >
        <ChevronLeft size={16} />
        Назад к доскам
      </Link>

      {/* Board title */}
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-blue-600/20 p-2 shrink-0">
          <LayoutGrid size={20} className="text-blue-400" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-white">{board.name}</h1>
          {board.description && (
            <p className="text-sm text-gray-500 mt-0.5">{board.description}</p>
          )}
        </div>
      </div>

      {/* Reorder error banner */}
      {reorderError && (
        <div
          className="flex items-center gap-2 rounded-lg border border-red-800 bg-red-900/30 px-4 py-3 text-sm text-red-300"
          role="alert"
          aria-live="assertive"
        >
          <AlertCircle size={16} className="shrink-0" />
          <span>Не удалось сохранить порядок колонок. Порядок восстановлен.</span>
        </div>
      )}

      {/* Task move error banner */}
      {taskMoveError && (
        <div
          className="flex items-center gap-2 rounded-lg border border-orange-800 bg-orange-900/30 px-4 py-3 text-sm text-orange-300"
          role="alert"
          aria-live="assertive"
        >
          <AlertCircle size={16} className="shrink-0" />
          <span>{taskMoveError}</span>
        </div>
      )}

      {/* Kanban board */}
      {localColumns.length === 0 && !showAddColumn ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Inbox size={32} className="text-gray-600" />
          <p className="text-gray-500 text-sm">В этой доске нет колонок</p>
          <button
            type="button"
            onClick={() => setShowAddColumn(true)}
            className={cn(
              'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              'bg-blue-600 text-white hover:bg-blue-500',
            )}
          >
            <Plus size={16} />
            Добавить колонку
          </button>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={pointerWithin}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext
            items={localColumns.map(c => c.id)}
            strategy={horizontalListSortingStrategy}
          >
            <div
              className="flex gap-4 overflow-x-auto pb-6"
              role="main"
              aria-label={`Канбан-доска: ${board.name}`}
            >
              {localColumns.map(column => (
                <SortableColumn
                  key={column.id}
                  column={column}
                  allColumns={localColumns}
                  boardId={boardId}
                  tasks={isTasksLoading ? [] : (localTasksByColumn[column.id] ?? [])}
                  onTaskClick={(taskId) => setSelectedTaskId(taskId)}
                />
              ))}

              {/* Inline add column form or add button */}
              {showAddColumn ? (
                <InlineAddColumn
                  boardId={boardId}
                  onDone={() => setShowAddColumn(false)}
                />
              ) : (
                <AddColumnButton onClick={() => setShowAddColumn(true)} />
              )}
            </div>
          </SortableContext>
          <DragOverlay>
            {activeDragType === 'column' && activeColumn ? (
              <KanbanColumn
                column={activeColumn}
                allColumns={localColumns}
                boardId={boardId}
                tasks={localTasksByColumn[activeColumn.id] ?? []}
                onTaskClick={() => undefined}
                isDragOverlay
              />
            ) : activeDragType === 'task' && activeTask ? (
              <div className="rotate-2 opacity-90 shadow-2xl">
                <TaskCard task={activeTask} onClick={() => undefined} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Task detail modal */}
      {selectedTaskId !== null && (
        <TaskDetailModal
          taskId={selectedTaskId}
          boardId={boardId}
          onClose={() => setSelectedTaskId(null)}
        />
      )}
    </div>
  );
}
