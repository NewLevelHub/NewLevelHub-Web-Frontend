import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useSearchParams } from 'react-router';
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
  Search,
  List,
  LayoutDashboard,
  ChevronDown,
  ChevronRight,
  ListChecks,
  Send,
  Clock,
  Tag,
  Settings,
  FileText,
  FileSpreadsheet,
  Image,
  File,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { API } from '@/shared/api/endpoints';
import { apiClient } from '@/shared/api/client';
import { cn } from '@/shared/lib/cn';
import { checkWipLimit } from '@/shared/lib/crm-wip-limit';
import { useWipLimitToast, WIP_LIMIT_VIOLATION_MESSAGE } from '@/pages/crm/useWipLimitToast';
import { useAuth } from '@/shared/hooks/useAuth';
import { USER_ROLES } from '@/shared/config/constants';
import type { CrmBoard, CrmColumn, CrmTask, CrmLabel, CrmComment, CrmChecklist, CrmChecklistItem, CrmTaskHistory, CrmAttachment, CompanyMember, PaginatedResponse } from '@/shared/types';

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
  onArchive?: () => void;
}

function TaskCard({ task, onClick, onArchive }: TaskCardProps) {
  const overdue = task.deadline ? isOverdue(task.deadline) : false;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  return (
    <div
      aria-label={`Задача: ${task.title}`}
      className={cn(
        'group relative rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5',
        'hover:border-gray-600 hover:bg-gray-750 transition-colors',
        'space-y-2',
      )}
    >
      {/* Actions dropdown — visible on hover */}
      <div ref={menuRef} className="absolute top-2 right-2 z-10">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((v) => !v);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className={cn(
            'p-1 rounded transition-opacity',
            menuOpen ? 'opacity-100 text-gray-200 bg-gray-700' : 'opacity-0 group-hover:opacity-100 text-gray-500 hover:text-gray-200 hover:bg-gray-700',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:opacity-100',
          )}
          aria-label={`Действия для задачи: ${task.title}`}
          aria-haspopup="true"
          aria-expanded={menuOpen}
        >
          <MoreHorizontal size={14} />
        </button>

        {menuOpen && (
          <div
            className="absolute right-0 top-full mt-1 w-44 rounded-lg border border-gray-700 bg-gray-900 shadow-xl py-1"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <Link
              to={`/crm/tasks/${task.id}`}
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
              }}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            >
              <ExternalLink size={13} />
              Открыть задачу
            </Link>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
                onClick();
              }}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            >
              <Pencil size={13} />
              Редактировать
            </button>
            {onArchive && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  onArchive();
                }}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-red-400 hover:bg-gray-800 hover:text-red-300 transition-colors"
                title="Архивировать"
              >
                <Archive size={13} />
                Архивировать
              </button>
            )}
          </div>
        )}
      </div>

      {/* Label strips */}
      {task.labels && task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 pr-6">
          {task.labels.map((label) => (
            <span
              key={label.id}
              title={label.name}
              className="h-1.5 w-8 rounded-full shrink-0"
              style={{ backgroundColor: label.color }}
              aria-label={label.name}
            />
          ))}
        </div>
      )}

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
  onArchive?: (taskId: number) => void;
}

function SortableTaskCard({ task, onTaskClick, onArchive }: SortableTaskCardProps) {
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
      <TaskCard task={task} onClick={() => onTaskClick(task.id)} onArchive={onArchive ? () => onArchive(task.id) : undefined} />
    </div>
  );
}

// ─── Create Task Modal ────────────────────────────────────────────────────────

interface CreateTaskModalProps {
  boardId: string;
  columnId: number;
  onClose: () => void;
  /** True when column already at WIP — block create */
  wipBlocked?: boolean;
}

function CreateTaskModal({ boardId, columnId, onClose, wipBlocked }: CreateTaskModalProps) {
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
              disabled={!title.trim() || mutation.isPending || wipBlocked}
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
            <p className="text-sm text-red-400">{WIP_LIMIT_VIOLATION_MESSAGE}</p>
          )}
        </form>
      </div>
    </div>
  );
}

// ─── Checklist Components ─────────────────────────────────────────────────────

interface ChecklistItemRowProps {
  item: CrmChecklistItem;
  onToggle: (itemId: number, isCompleted: boolean) => void;
  onDelete: (itemId: number) => void;
  onUpdateText: (itemId: number, text: string) => void;
  isPending: boolean;
}

function ChecklistItemRow({ item, onToggle, onDelete, onUpdateText, isPending }: ChecklistItemRowProps) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(item.text);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commitEdit = () => {
    const trimmed = editText.trim();
    if (!trimmed) {
      setEditText(item.text);
    } else if (trimmed !== item.text) {
      onUpdateText(item.id, trimmed);
    }
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') commitEdit();
    if (e.key === 'Escape') {
      setEditText(item.text);
      setEditing(false);
    }
  };

  return (
    <div className="flex items-center gap-2 group/item py-1">
      <input
        type="checkbox"
        checked={item.is_completed}
        onChange={(e) => onToggle(item.id, e.target.checked)}
        disabled={isPending}
        aria-label={`Отметить: ${item.text}`}
        className="w-4 h-4 shrink-0 accent-green-500 cursor-pointer disabled:opacity-50"
      />
      {editing ? (
        <input
          ref={inputRef}
          type="text"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={handleKeyDown}
          className={cn(
            'flex-1 rounded border bg-gray-700 px-2 py-0.5 text-sm text-white',
            'focus:outline-none focus:ring-1 focus:ring-blue-500 border-gray-600',
          )}
          maxLength={500}
        />
      ) : (
        <span
          onDoubleClick={() => setEditing(true)}
          className={cn(
            'flex-1 text-sm cursor-default select-none break-all',
            item.is_completed ? 'line-through text-gray-500' : 'text-gray-200',
          )}
          title="Двойной клик для редактирования"
        >
          {item.text}
        </span>
      )}
      <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity shrink-0">
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="p-0.5 rounded text-gray-500 hover:text-gray-300 hover:bg-gray-700 transition-colors"
            aria-label="Редактировать пункт"
          >
            <Pencil size={11} />
          </button>
        )}
        <button
          type="button"
          onClick={() => onDelete(item.id)}
          disabled={isPending}
          className="p-0.5 rounded text-gray-500 hover:text-red-400 hover:bg-gray-700 transition-colors disabled:opacity-50"
          aria-label="Удалить пункт"
        >
          <X size={11} />
        </button>
      </div>
    </div>
  );
}

interface ChecklistBlockProps {
  checklist: CrmChecklist;
  taskId: number;
  boardId: string;
}

function ChecklistBlock({ checklist, taskId, boardId }: ChecklistBlockProps) {
  const queryClient = useQueryClient();
  const [collapsed, setCollapsed] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(checklist.title);
  const [addingItem, setAddingItem] = useState(false);
  const [newItemText, setNewItemText] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);
  const newItemRef = useRef<HTMLInputElement>(null);

  const { total, completed } = checklist.checklist_progress;
  const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;

  useEffect(() => {
    if (editingTitle) titleInputRef.current?.focus();
  }, [editingTitle]);

  useEffect(() => {
    if (addingItem) newItemRef.current?.focus();
  }, [addingItem]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['crm', 'task', taskId] });
    void queryClient.invalidateQueries({ queryKey: ['crm', 'tasks', boardId] });
  };

  const deleteMutation = useMutation({
    mutationFn: () => apiClient.delete(API.crm.checklistDetail(checklist.id)),
    onSuccess: invalidate,
  });

  const updateTitleMutation = useMutation({
    mutationFn: (title: string) =>
      apiClient.patch(API.crm.checklistDetail(checklist.id), { title }),
    onSuccess: invalidate,
  });

  const createItemMutation = useMutation({
    mutationFn: (text: string) =>
      apiClient.post(API.crm.checklistItems(checklist.id), { text }),
    onSuccess: () => {
      setNewItemText('');
      setAddingItem(false);
      invalidate();
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ itemId, payload }: { itemId: number; payload: Partial<CrmChecklistItem> }) =>
      apiClient.patch(API.crm.checklistItemDetail(itemId), payload),
    onSuccess: invalidate,
  });

  const deleteItemMutation = useMutation({
    mutationFn: (itemId: number) => apiClient.delete(API.crm.checklistItemDetail(itemId)),
    onSuccess: invalidate,
  });

  const commitTitleEdit = () => {
    const trimmed = titleValue.trim();
    if (!trimmed) {
      setTitleValue(checklist.title);
    } else if (trimmed !== checklist.title) {
      updateTitleMutation.mutate(trimmed);
    }
    setEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') commitTitleEdit();
    if (e.key === 'Escape') {
      setTitleValue(checklist.title);
      setEditingTitle(false);
    }
  };

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newItemText.trim();
    if (!trimmed || createItemMutation.isPending) return;
    createItemMutation.mutate(trimmed);
  };

  const handleToggleItem = (itemId: number, isCompleted: boolean) => {
    updateItemMutation.mutate({ itemId, payload: { is_completed: isCompleted } });
  };

  const handleDeleteItem = (itemId: number) => {
    deleteItemMutation.mutate(itemId);
  };

  const handleUpdateItemText = (itemId: number, text: string) => {
    updateItemMutation.mutate({ itemId, payload: { text } });
  };

  const anyItemPending = updateItemMutation.isPending || deleteItemMutation.isPending;

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800/50">
      {/* Checklist header */}
      <div className="flex items-center gap-2 px-3 py-2.5 group/header">
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="flex items-center gap-2 flex-1 min-w-0 text-left focus:outline-none"
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Развернуть чеклист' : 'Свернуть чеклист'}
        >
          {collapsed
            ? <ChevronRight size={14} className="text-gray-500 shrink-0" />
            : <ChevronDown size={14} className="text-gray-500 shrink-0" />
          }
          {editingTitle ? (
            <input
              ref={titleInputRef}
              type="text"
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={commitTitleEdit}
              onKeyDown={handleTitleKeyDown}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                'flex-1 rounded border bg-gray-700 px-2 py-0.5 text-sm font-medium text-white',
                'focus:outline-none focus:ring-1 focus:ring-blue-500 border-gray-600',
              )}
              maxLength={200}
            />
          ) : (
            <span className="text-sm font-medium text-white truncate">{checklist.title}</span>
          )}
        </button>

        <div className="flex items-center gap-1 shrink-0">
          <span className="text-xs text-gray-500 tabular-nums">
            {completed}/{total}
          </span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setEditingTitle(true); }}
            className="p-1 rounded text-gray-600 hover:text-gray-300 hover:bg-gray-700 transition-colors opacity-0 group-hover/header:opacity-100"
            aria-label="Переименовать чеклист"
          >
            <Pencil size={12} />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleDelete(); }}
            disabled={deleteMutation.isPending}
            className="p-1 rounded text-gray-600 hover:text-red-400 hover:bg-gray-700 transition-colors opacity-0 group-hover/header:opacity-100 disabled:opacity-30"
            aria-label="Удалить чеклист"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="px-3 pb-2">
          <div
            className="h-1.5 w-full rounded-full bg-gray-700 overflow-hidden"
            role="progressbar"
            aria-valuenow={progressPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Прогресс: ${completed} из ${total}`}
          >
            <div
              className="h-full rounded-full bg-green-500 transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Items */}
      {!collapsed && (
        <div className="px-3 pb-2 space-y-0">
          {checklist.items
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((item) => (
              <ChecklistItemRow
                key={item.id}
                item={item}
                onToggle={handleToggleItem}
                onDelete={handleDeleteItem}
                onUpdateText={handleUpdateItemText}
                isPending={anyItemPending}
              />
            ))}

          {/* Add item form */}
          {addingItem ? (
            <form onSubmit={handleAddItem} className="flex items-center gap-2 pt-1">
              <input
                ref={newItemRef}
                type="text"
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Escape') { setAddingItem(false); setNewItemText(''); } }}
                placeholder="Новый пункт..."
                maxLength={500}
                className={cn(
                  'flex-1 rounded border bg-gray-700 px-2 py-1 text-sm text-white placeholder-gray-500',
                  'focus:outline-none focus:ring-1 focus:ring-blue-500 border-gray-600',
                )}
              />
              <button
                type="submit"
                disabled={!newItemText.trim() || createItemMutation.isPending}
                className={cn(
                  'shrink-0 rounded px-2.5 py-1 text-xs font-medium transition-colors',
                  'bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed',
                )}
              >
                <Check size={12} />
              </button>
              <button
                type="button"
                onClick={() => { setAddingItem(false); setNewItemText(''); }}
                className="shrink-0 rounded p-1 text-gray-500 hover:text-gray-300 hover:bg-gray-700 transition-colors"
                aria-label="Отмена"
              >
                <X size={12} />
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setAddingItem(true)}
              className="flex items-center gap-1.5 mt-1 text-xs text-gray-500 hover:text-gray-300 transition-colors rounded px-1 py-0.5 hover:bg-gray-700"
            >
              <Plus size={12} />
              Добавить пункт
            </button>
          )}
        </div>
      )}

      {(deleteMutation.isError || updateTitleMutation.isError) && (
        <p className="px-3 pb-2 text-xs text-red-400">Не удалось выполнить операцию.</p>
      )}
    </div>
  );
}

interface ChecklistSectionProps {
  taskId: number;
  boardId: string;
  checklists: CrmChecklist[];
}

export function ChecklistSection({ taskId, boardId, checklists }: ChecklistSectionProps) {
  const queryClient = useQueryClient();
  const [addingChecklist, setAddingChecklist] = useState(false);
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const addInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (addingChecklist) addInputRef.current?.focus();
  }, [addingChecklist]);

  const createChecklistMutation = useMutation({
    mutationFn: (title: string) =>
      apiClient.post(API.crm.taskChecklists(taskId), { title }),
    onSuccess: () => {
      setNewChecklistTitle('');
      setAddingChecklist(false);
      void queryClient.invalidateQueries({ queryKey: ['crm', 'task', taskId] });
      void queryClient.invalidateQueries({ queryKey: ['crm', 'tasks', boardId] });
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newChecklistTitle.trim();
    if (!trimmed || createChecklistMutation.isPending) return;
    createChecklistMutation.mutate(trimmed);
  };

  return (
    <div className="space-y-2">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500 uppercase tracking-wide">
          <ListChecks size={13} />
          Чеклисты
        </span>
        {!addingChecklist && (
          <button
            type="button"
            onClick={() => setAddingChecklist(true)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors rounded px-1.5 py-0.5 hover:bg-gray-800"
          >
            <Plus size={12} />
            Добавить чеклист
          </button>
        )}
      </div>

      {/* Existing checklists */}
      {checklists.map((cl) => (
        <ChecklistBlock
          key={cl.id}
          checklist={cl}
          taskId={taskId}
          boardId={boardId}
        />
      ))}

      {/* New checklist form */}
      {addingChecklist && (
        <form
          onSubmit={handleCreate}
          className="flex items-center gap-2 rounded-lg border border-blue-600/40 bg-gray-800/50 px-3 py-2"
        >
          <input
            ref={addInputRef}
            type="text"
            value={newChecklistTitle}
            onChange={(e) => setNewChecklistTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setAddingChecklist(false);
                setNewChecklistTitle('');
              }
            }}
            placeholder="Название чеклиста..."
            maxLength={200}
            className={cn(
              'flex-1 rounded border bg-gray-700 px-2 py-1 text-sm text-white placeholder-gray-500',
              'focus:outline-none focus:ring-1 focus:ring-blue-500 border-gray-600',
            )}
          />
          <button
            type="submit"
            disabled={!newChecklistTitle.trim() || createChecklistMutation.isPending}
            className={cn(
              'shrink-0 rounded px-3 py-1 text-xs font-medium transition-colors',
              'bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            {createChecklistMutation.isPending ? '...' : 'Создать'}
          </button>
          <button
            type="button"
            onClick={() => { setAddingChecklist(false); setNewChecklistTitle(''); }}
            className="shrink-0 rounded p-1 text-gray-500 hover:text-gray-300 hover:bg-gray-700 transition-colors"
            aria-label="Отмена"
          >
            <X size={13} />
          </button>
        </form>
      )}

      {createChecklistMutation.isError && (
        <p className="text-xs text-red-400">Не удалось создать чеклист.</p>
      )}
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

// ─── Attachments Section ─────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
  }
  return `${(bytes / 1024).toFixed(1)} КБ`;
}

function getFileIcon(mimeType: string) {
  if (mimeType === 'application/pdf' || mimeType.includes('word')) {
    return FileText;
  }
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('xls')) {
    return FileSpreadsheet;
  }
  if (mimeType.startsWith('image/')) {
    return Image;
  }
  return File;
}

function extractUploadError(error: unknown): string {
  if (!error || typeof error !== 'object') return 'Ошибка загрузки файла';
  const e = error as { response?: { data?: { detail?: unknown; message?: string } } };
  const detail = e.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (detail && typeof detail === 'object') {
    const firstKey = Object.values(detail as Record<string, unknown>)[0];
    if (Array.isArray(firstKey) && typeof firstKey[0] === 'string') return firstKey[0];
    if (typeof firstKey === 'string') return firstKey;
  }
  return e.response?.data?.message ?? 'Ошибка загрузки файла';
}

interface AttachmentsSectionProps {
  taskId: number;
  boardId: string;
}

function AttachmentsSection({ taskId, boardId }: AttachmentsSectionProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const attachmentsQueryKey = ['crm', 'task', taskId, 'attachments'] as const;
  const taskQueryKey = ['crm', 'task', taskId] as const;

  const { data: attachments, isLoading, isError } = useQuery({
    queryKey: attachmentsQueryKey,
    queryFn: async () => {
      const { data } = await apiClient.get<CrmAttachment[] | { results: CrmAttachment[] }>(
        API.crm.taskAttachments(taskId),
      );
      return Array.isArray(data) ? data : data.results;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: globalThis.File) => {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await apiClient.post<CrmAttachment>(
        API.crm.taskAttachments(taskId),
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return data;
    },
    onSuccess: () => {
      setUploadError(null);
      void queryClient.invalidateQueries({ queryKey: attachmentsQueryKey });
      void queryClient.invalidateQueries({ queryKey: taskQueryKey });
      void queryClient.invalidateQueries({ queryKey: ['crm', 'tasks', boardId] });
    },
    onError: (error: unknown) => {
      setUploadError(extractUploadError(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (attachmentId: number) =>
      apiClient.delete(API.crm.taskAttachmentDetail(taskId, attachmentId)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: attachmentsQueryKey });
      void queryClient.invalidateQueries({ queryKey: taskQueryKey });
      void queryClient.invalidateQueries({ queryKey: ['crm', 'tasks', boardId] });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    uploadMutation.mutate(file);
    // Reset input so the same file can be re-selected after an error
    e.target.value = '';
  };

  const handleDeleteClick = (attachmentId: number) => {
    if (!window.confirm('Удалить вложение?')) return;
    deleteMutation.mutate(attachmentId);
  };

  const canDelete = (uploadedById: number) => {
    if (!user) return false;
    return user.id === uploadedById || user.role === USER_ROLES.COMPANY_ADMIN;
  };

  return (
    <div className="space-y-3 pt-2 border-t border-gray-800">
      {/* Section heading */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Paperclip size={14} className="text-gray-500 shrink-0" />
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Вложения</h3>
        </div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadMutation.isPending}
          aria-label="Прикрепить файл"
          className={cn(
            'flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        >
          {uploadMutation.isPending ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Paperclip size={13} />
          )}
          {uploadMutation.isPending ? 'Загрузка...' : 'Прикрепить файл'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {uploadError && (
        <p className="text-xs text-red-400">{uploadError}</p>
      )}

      {isLoading && (
        <div className="space-y-2 animate-pulse">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-gray-800/40">
              <div className="w-7 h-7 rounded bg-gray-700 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-40 rounded bg-gray-700" />
                <div className="h-3 w-24 rounded bg-gray-700" />
              </div>
            </div>
          ))}
        </div>
      )}

      {isError && (
        <p className="text-xs text-red-400">Не удалось загрузить вложения.</p>
      )}

      {!isLoading && !isError && attachments && attachments.length === 0 && (
        <p className="text-xs text-gray-600">Нет вложений.</p>
      )}

      {!isLoading && !isError && attachments && attachments.length > 0 && (
        <ul className="space-y-1.5" role="list" aria-label="Список вложений">
          {attachments.map((attachment) => {
            const IconComponent = getFileIcon(attachment.mime_type);
            const formattedDate = new Date(attachment.created_at).toLocaleDateString('ru-RU', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            });
            const isDeleting = deleteMutation.isPending && deleteMutation.variables === attachment.id;

            return (
              <li
                key={attachment.id}
                className="flex items-center gap-3 p-2 rounded-lg bg-gray-800/40 hover:bg-gray-800/70 transition-colors group"
              >
                <IconComponent size={18} className="text-gray-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <a
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-200 hover:text-white truncate block max-w-full"
                  >
                    {attachment.filename}
                  </a>
                  <p className="text-xs text-gray-500 truncate">
                    {formatFileSize(attachment.size)} · {attachment.uploaded_by.full_name} · {formattedDate}
                  </p>
                </div>
                {canDelete(attachment.uploaded_by.id) && (
                  <button
                    type="button"
                    onClick={() => handleDeleteClick(attachment.id)}
                    disabled={isDeleting}
                    aria-label={`Удалить ${attachment.filename}`}
                    className={cn(
                      'shrink-0 p-1 rounded text-gray-600 hover:text-red-400 transition-colors',
                      'opacity-0 group-hover:opacity-100 focus:opacity-100',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                    )}
                  >
                    {isDeleting ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ─── Comment Section ──────────────────────────────────────────────────────────

interface CommentSectionProps {
  taskId: number;
  boardId: string;
}

export function CommentSection({ taskId, boardId }: CommentSectionProps) {
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
      void queryClient.invalidateQueries({ queryKey: ['crm', 'task', taskId] });
      if (boardId) {
        void queryClient.invalidateQueries({ queryKey: ['crm', 'tasks', boardId] });
      }
      void queryClient.invalidateQueries({ queryKey: ['notifications-recent'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
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

// ─── History Section ──────────────────────────────────────────────────────────

const ACTION_LABELS: Record<string, string> = {
  updated_title: 'изменил(а) название',
  updated_description: 'обновил(а) описание задачи',
  updated_priority: 'изменил(а) приоритет',
  updated_deadline: 'изменил(а) дедлайн',
  updated_assignee: 'изменил(а) исполнителя',
  updated_column: 'переместил(а) задачу',
  label_added: 'добавил(а) метку',
  label_removed: 'удалил(а) метку',
  archived: 'архивировал(а) задачу',
  moved: 'переместил(а) задачу',
};

const HISTORY_PRIORITY_BADGE: Record<string, string> = {
  low: 'bg-gray-700 text-gray-300 border-gray-600',
  medium: 'bg-amber-900/60 text-amber-300 border-amber-700',
  high: 'bg-orange-900/60 text-orange-300 border-orange-700',
};

const HISTORY_PRIORITY_LABELS: Record<string, string> = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
};

function formatHistoryDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatHistoryDeadline(value: string | null): string {
  if (!value || value === 'null') return 'не задан';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + '…' : text;
}

function PriorityBadge({ value }: { value: string }) {
  const label = HISTORY_PRIORITY_LABELS[value] ?? value;
  const cls = HISTORY_PRIORITY_BADGE[value] ?? 'bg-gray-700 text-gray-300 border-gray-600';
  return (
    <span className={cn('inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium', cls)}>
      {label}
    </span>
  );
}

function HistoryValueChange({ entry }: { entry: CrmTaskHistory }) {
  const { action, old_value, new_value } = entry;

  if (action === 'updated_description') {
    return null;
  }

  if (action === 'archived') {
    return null;
  }

  if (action === 'updated_priority') {
    return (
      <div className="flex items-center gap-1.5 mt-1">
        {old_value && old_value !== 'null' && <PriorityBadge value={old_value} />}
        {old_value && old_value !== 'null' && new_value && new_value !== 'null' && (
          <span className="text-gray-600 text-xs">→</span>
        )}
        {new_value && new_value !== 'null' && <PriorityBadge value={new_value} />}
      </div>
    );
  }

  if (action === 'updated_deadline') {
    const oldLabel = formatHistoryDeadline(old_value);
    const newLabel = formatHistoryDeadline(new_value);
    return (
      <p className="text-xs text-gray-500 mt-1">
        <span className={cn(old_value && old_value !== 'null' ? 'line-through text-gray-600' : 'text-gray-600')}>
          {oldLabel}
        </span>
        <span className="text-gray-600 mx-1.5">→</span>
        <span className="text-gray-300">{newLabel}</span>
      </p>
    );
  }

  if (action === 'updated_assignee') {
    const oldName = !old_value || old_value === 'null' ? 'не назначен' : old_value;
    const newName = !new_value || new_value === 'null' ? 'не назначен' : new_value;
    return (
      <p className="text-xs text-gray-500 mt-1">
        <span className="text-gray-600">{oldName}</span>
        <span className="text-gray-600 mx-1.5">→</span>
        <span className="text-gray-300">{newName}</span>
      </p>
    );
  }

  if (action === 'updated_title') {
    const oldTitle = old_value ? truncate(old_value, 40) : null;
    const newTitle = new_value ? truncate(new_value, 40) : null;
    return (
      <p className="text-xs text-gray-500 mt-1 italic">
        {oldTitle && <span className="text-gray-600">«{oldTitle}»</span>}
        {oldTitle && newTitle && <span className="text-gray-600 mx-1.5">→</span>}
        {newTitle && <span className="text-gray-300">«{newTitle}»</span>}
      </p>
    );
  }

  if (action === 'updated_column') {
    const oldCol = old_value && old_value !== 'null' ? old_value : null;
    const newCol = new_value && new_value !== 'null' ? new_value : null;
    return (
      <p className="text-xs text-gray-500 mt-1">
        {oldCol && (
          <>
            <span>из </span>
            <span className="font-semibold text-gray-300">"{oldCol}"</span>
          </>
        )}
        {newCol && (
          <>
            <span className="mx-1.5">→</span>
            <span>в </span>
            <span className="font-semibold text-gray-300">"{newCol}"</span>
          </>
        )}
      </p>
    );
  }

  if (action === 'label_added' || action === 'label_removed') {
    const rawValue = new_value ?? old_value;
    if (!rawValue || rawValue === 'null') return null;

    let parsedLabel: { name: string; color: string } | null = null;
    try {
      const parsed = JSON.parse(rawValue);
      if (parsed && typeof parsed.name === 'string' && typeof parsed.color === 'string') {
        parsedLabel = parsed as { name: string; color: string };
      }
    } catch {
      // old format — plain string, fall through to legacy render
    }

    if (parsedLabel) {
      const hex = parsedLabel.color ?? '#6b7280';
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return (
        <div className="mt-1">
          <span
            className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium"
            style={{
              backgroundColor: `rgba(${r},${g},${b},0.12)`,
              borderColor: hex,
              color: hex,
            }}
          >
            {parsedLabel.name}
          </span>
        </div>
      );
    }

    return (
      <div className="mt-1">
        <span className="inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium bg-indigo-900/60 text-indigo-300 border-indigo-700">
          {rawValue}
        </span>
      </div>
    );
  }

  if (action === 'moved') {
    if (!new_value || new_value === 'null') return null;
    return (
      <p className="text-xs text-gray-500 mt-1">
        <span className="text-gray-400">{new_value}</span>
      </p>
    );
  }

  // Generic fallback
  if (old_value && new_value) {
    return (
      <p className="text-xs text-gray-500 mt-1">
        <span className="text-gray-600">«{old_value}»</span>
        <span className="text-gray-600 mx-1.5">→</span>
        <span className="text-gray-300">«{new_value}»</span>
      </p>
    );
  }
  if (!old_value && new_value) {
    return <p className="text-xs text-gray-500 mt-1">«{new_value}»</p>;
  }
  return null;
}

interface HistorySectionProps {
  taskId: number;
}

export function HistorySection({ taskId }: HistorySectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  const { data: history, isLoading, isError } = useQuery({
    queryKey: ['crm', 'task', taskId, 'history'],
    queryFn: async () => {
      const { data } = await apiClient.get<CrmTaskHistory[] | { results: CrmTaskHistory[] }>(
        API.crm.taskHistory(taskId),
      );
      return Array.isArray(data) ? data : data.results;
    },
    enabled: isOpen,
  });

  return (
    <div className="space-y-3 pt-2 border-t border-gray-800">
      {/* Collapsible header */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          'flex items-center gap-2 w-full text-left',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded',
        )}
        aria-expanded={isOpen}
      >
        <Clock size={14} className="text-gray-500 shrink-0" />
        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide flex-1">
          История изменений
        </h3>
        {isOpen ? (
          <ChevronDown size={14} className="text-gray-500 shrink-0" />
        ) : (
          <ChevronRight size={14} className="text-gray-500 shrink-0" />
        )}
      </button>

      {isOpen && (
        <div>
          {/* Loading skeleton */}
          {isLoading && (
            <div className="space-y-4 animate-pulse pl-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-gray-700 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-48 rounded bg-gray-700" />
                    <div className="h-3 w-32 rounded bg-gray-700" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {isError && (
            <p className="text-xs text-red-400 pl-3">Не удалось загрузить историю изменений.</p>
          )}

          {!isLoading && !isError && history && history.length === 0 && (
            <p className="text-xs text-gray-600 pl-3">История изменений пуста.</p>
          )}

          {!isLoading && !isError && history && history.length > 0 && (
            <ol className="relative border-l border-gray-700 ml-3 space-y-4">
              {history.map((entry) => {
                const actionLabel = ACTION_LABELS[entry.action] ?? entry.action;
                const initials = entry.user.full_name
                  .split(' ')
                  .slice(0, 2)
                  .map((w) => w[0] ?? '')
                  .join('')
                  .toUpperCase();

                return (
                  <li key={entry.id} className="pl-4 relative">
                    {/* Timeline dot */}
                    <span
                      className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-gray-600 border border-gray-500 shrink-0"
                      aria-hidden="true"
                    />

                    <div className="flex items-start gap-2">
                      {/* User avatar */}
                      {entry.user.avatar ? (
                        <img
                          src={entry.user.avatar}
                          alt={entry.user.full_name}
                          className="w-6 h-6 rounded-full object-cover shrink-0 mt-0.5"
                        />
                      ) : (
                        <span
                          className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-medium flex items-center justify-center shrink-0 mt-0.5"
                          aria-label={entry.user.full_name}
                        >
                          {initials}
                        </span>
                      )}

                      <div className="min-w-0 flex-1">
                        {/* Action line */}
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-xs text-gray-300 leading-snug">
                            <span className="font-medium text-gray-200">{entry.user.full_name}</span>
                            {' '}
                            <span className="text-gray-400">{actionLabel}</span>
                            {entry.action === 'archived' && (
                              <Archive size={11} className="inline ml-1 text-gray-500 align-middle" aria-hidden="true" />
                            )}
                          </p>
                          <span className="text-xs text-gray-600 shrink-0 whitespace-nowrap">
                            {formatHistoryDate(entry.created_at)}
                          </span>
                        </div>

                        {/* Value visualisation */}
                        <HistoryValueChange entry={entry} />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Labels Manager Modal ─────────────────────────────────────────────────────

interface LabelsManagerModalProps {
  onClose: () => void;
}

function LabelsManagerModal({ onClose }: LabelsManagerModalProps) {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#6366f1');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  const { data: labels, isLoading } = useQuery({
    queryKey: ['crm', 'labels'],
    queryFn: () =>
      apiClient.get<CrmLabel[]>(API.crm.labels).then((r) => {
        const data = r.data;
        return Array.isArray(data) ? data : (data as { results: CrmLabel[] }).results;
      }),
  });

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['crm', 'labels'] });

  const createMutation = useMutation({
    mutationFn: (payload: { name: string; color: string }) =>
      apiClient.post<CrmLabel>(API.crm.labels, payload).then((r) => r.data),
    onSuccess: () => {
      setNewName('');
      setNewColor('#6366f1');
      invalidate();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: { name: string; color: string } }) =>
      apiClient.patch<CrmLabel>(API.crm.labelDetail(id), payload).then((r) => r.data),
    onSuccess: () => {
      setEditingId(null);
      invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(API.crm.labelDetail(id)),
    onSuccess: invalidate,
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed || createMutation.isPending) return;
    createMutation.mutate({ name: trimmed, color: newColor });
  };

  const startEdit = (label: CrmLabel) => {
    setEditingId(label.id);
    setEditName(label.name);
    setEditColor(label.color);
  };

  const cancelEdit = () => setEditingId(null);

  const handleSaveEdit = () => {
    const trimmed = editName.trim();
    if (!trimmed || updateMutation.isPending) return;
    updateMutation.mutate({ id: editingId!, payload: { name: trimmed, color: editColor } });
  };

  const handleDelete = (id: number) => {
    if (!window.confirm('Удалить метку? Она будет снята со всех задач.')) return;
    deleteMutation.mutate(id);
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="labels-manager-title"
    >
      <div className="w-full max-w-md rounded-xl border border-gray-700 bg-gray-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 id="labels-manager-title" className="text-base font-semibold text-white flex items-center gap-2">
            <Tag size={16} />
            Управление метками
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

        {/* Body */}
        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Existing labels */}
          {isLoading && (
            <div className="space-y-2 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-9 rounded-lg bg-gray-800" />
              ))}
            </div>
          )}

          {!isLoading && labels && labels.length === 0 && (
            <p className="text-sm text-gray-500">Меток пока нет. Создайте первую.</p>
          )}

          {!isLoading && labels && labels.length > 0 && (
            <ul className="space-y-1.5" aria-label="Список меток">
              {labels.map((label) => (
                <li key={label.id}>
                  {editingId === label.id ? (
                    <div className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2">
                      <input
                        type="color"
                        value={editColor}
                        onChange={(e) => setEditColor(e.target.value)}
                        className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent p-0"
                        aria-label="Цвет метки"
                      />
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        maxLength={50}
                        className={cn(
                          'flex-1 rounded border bg-gray-700 px-2 py-1 text-sm text-white',
                          'focus:outline-none focus:ring-1 focus:ring-blue-500 border-gray-600',
                        )}
                        aria-label="Название метки"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit();
                          if (e.key === 'Escape') cancelEdit();
                        }}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleSaveEdit}
                        disabled={!editName.trim() || updateMutation.isPending}
                        className={cn(
                          'rounded px-2.5 py-1 text-xs font-medium transition-colors',
                          'bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed',
                        )}
                      >
                        {updateMutation.isPending ? '...' : 'Сохранить'}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="rounded p-1 text-gray-500 hover:text-gray-300 hover:bg-gray-700 transition-colors"
                        aria-label="Отмена"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="group flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2">
                      <span
                        className="w-4 h-4 rounded shrink-0"
                        style={{ backgroundColor: label.color }}
                        aria-hidden="true"
                      />
                      <span className="flex-1 text-sm text-gray-200 truncate">{label.name}</span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => startEdit(label)}
                          className="rounded p-1 text-gray-500 hover:text-gray-300 hover:bg-gray-700 transition-colors"
                          aria-label={`Редактировать метку ${label.name}`}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(label.id)}
                          disabled={deleteMutation.isPending}
                          className="rounded p-1 text-gray-500 hover:text-red-400 hover:bg-gray-700 transition-colors disabled:opacity-50"
                          aria-label={`Удалить метку ${label.name}`}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          {/* Create new label */}
          <div className="border-t border-gray-800 pt-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Новая метка</p>
            <form onSubmit={handleCreate} className="flex items-center gap-2">
              <input
                type="color"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                className="w-9 h-9 rounded cursor-pointer border border-gray-700 bg-gray-800 p-0.5"
                aria-label="Выбрать цвет"
              />
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Название метки"
                maxLength={50}
                className={cn(
                  'flex-1 rounded-lg border bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors border-gray-700',
                )}
                aria-label="Название новой метки"
              />
              <button
                type="submit"
                disabled={!newName.trim() || createMutation.isPending}
                className={cn(
                  'rounded-lg px-3 py-2 text-sm font-medium transition-colors shrink-0',
                  'bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed',
                )}
              >
                {createMutation.isPending ? '...' : 'Создать'}
              </button>
            </form>
            {createMutation.isError && (
              <p className="mt-2 text-xs text-red-400">Не удалось создать метку.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Task Labels Section ───────────────────────────────────────────────────────

interface TaskLabelsSectionProps {
  taskId: number;
  boardId: string;
  taskLabels: CrmLabel[];
}

export function TaskLabelsSection({ taskId, boardId, taskLabels }: TaskLabelsSectionProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [managerOpen, setManagerOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const isAdmin = user?.role === USER_ROLES.COMPANY_ADMIN;

  const { data: allLabels } = useQuery({
    queryKey: ['crm', 'labels'],
    queryFn: () =>
      apiClient.get<CrmLabel[]>(API.crm.labels).then((r) => {
        const data = r.data;
        return Array.isArray(data) ? data : (data as { results: CrmLabel[] }).results;
      }),
  });

  const updateLabelsMutation = useMutation({
    mutationFn: (labelIds: number[]) =>
      apiClient.patch<CrmTask>(API.crm.taskDetail(taskId), { label_ids: labelIds }).then((r) => r.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['crm', 'task', taskId] });
      void queryClient.invalidateQueries({ queryKey: ['crm', 'tasks', boardId] });
    },
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropdownOpen]);

  // Focus search when dropdown opens
  useEffect(() => {
    if (dropdownOpen) searchRef.current?.focus();
  }, [dropdownOpen]);

  const toggleLabel = (labelId: number) => {
    const currentIds = taskLabels.map((l) => l.id);
    const updated = currentIds.includes(labelId)
      ? currentIds.filter((id) => id !== labelId)
      : [...currentIds, labelId];
    updateLabelsMutation.mutate(updated);
  };

  const removeLabel = (labelId: number) => {
    const updated = taskLabels.map((l) => l.id).filter((id) => id !== labelId);
    updateLabelsMutation.mutate(updated);
  };

  const filteredLabels = (allLabels ?? []).filter((l) =>
    l.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-2">
      <span className="block text-xs font-medium text-gray-500 uppercase tracking-wide">Метки</span>

      {/* Current labels */}
      <div className="flex flex-wrap gap-1.5">
        {taskLabels.map((label) => {
          // Parse hex to rgba for transparent background
          const hex = label.color ?? '#6b7280';
          const r = parseInt(hex.slice(1, 3), 16);
          const g = parseInt(hex.slice(3, 5), 16);
          const b = parseInt(hex.slice(5, 7), 16);
          return (
            <span
              key={label.id}
              className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium"
              style={{
                backgroundColor: `rgba(${r},${g},${b},0.12)`,
                borderColor: hex,
                color: hex,
              }}
            >
              {label.name}
              <button
                type="button"
                onClick={() => removeLabel(label.id)}
                disabled={updateLabelsMutation.isPending}
                className="rounded-full hover:opacity-70 transition-opacity disabled:opacity-40"
                aria-label={`Снять метку ${label.name}`}
              >
                <X size={10} />
              </button>
            </span>
          );
        })}

        {/* Add label button */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((v) => !v)}
            className={cn(
              'inline-flex items-center gap-1 rounded-full border border-dashed border-gray-600',
              'px-2.5 py-0.5 text-xs text-gray-500 hover:text-gray-300 hover:border-gray-400 transition-colors',
            )}
            aria-haspopup="listbox"
            aria-expanded={dropdownOpen}
          >
            <Plus size={11} />
            Добавить метку
          </button>

          {dropdownOpen && (
            <div
              className={cn(
                'absolute left-0 top-full mt-1 z-10',
                'w-56 rounded-lg border border-gray-700 bg-gray-900 shadow-xl',
              )}
              role="listbox"
              aria-label="Выбор меток"
            >
              {/* Search */}
              <div className="p-2 border-b border-gray-800">
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                  <input
                    ref={searchRef}
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Найти метку..."
                    className={cn(
                      'w-full rounded-md border bg-gray-800 pl-7 pr-2 py-1.5 text-xs text-white placeholder-gray-500',
                      'focus:outline-none focus:ring-1 focus:ring-blue-500 border-gray-700',
                    )}
                    aria-label="Поиск меток"
                  />
                </div>
              </div>

              {/* Label list */}
              <ul className="max-h-48 overflow-y-auto py-1">
                {filteredLabels.length === 0 && (
                  <li className="px-3 py-2 text-xs text-gray-500">Метки не найдены</li>
                )}
                {filteredLabels.map((label) => {
                  const checked = taskLabels.some((l) => l.id === label.id);
                  return (
                    <li key={label.id}>
                      <button
                        type="button"
                        onClick={() => toggleLabel(label.id)}
                        role="option"
                        aria-selected={checked}
                        className={cn(
                          'flex items-center gap-2.5 w-full px-3 py-1.5 text-xs text-left',
                          'hover:bg-gray-800 transition-colors',
                        )}
                      >
                        <span
                          className="w-3 h-3 rounded-sm border shrink-0 flex items-center justify-center"
                          style={{
                            backgroundColor: checked ? label.color : 'transparent',
                            borderColor: label.color,
                          }}
                        >
                          {checked && <Check size={8} className="text-white" />}
                        </span>
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: label.color }}
                          aria-hidden="true"
                        />
                        <span className="flex-1 text-gray-200 truncate">{label.name}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              {/* Manage labels (company_admin only) */}
              {isAdmin && (
                <div className="border-t border-gray-800 p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false);
                      setManagerOpen(true);
                    }}
                    className={cn(
                      'flex items-center gap-2 w-full rounded-md px-3 py-1.5 text-xs',
                      'text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors',
                    )}
                  >
                    <Settings size={12} />
                    Управление метками
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {updateLabelsMutation.isError && (
        <p className="text-xs text-red-400">Не удалось обновить метки.</p>
      )}

      {/* Labels manager modal */}
      {managerOpen && <LabelsManagerModal onClose={() => setManagerOpen(false)} />}
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

  // Local draft state for editable fields (initialised from fetched task)
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriorityValue>('medium');
  const [deadline, setDeadline] = useState('');
  const [assigneeId, setAssigneeId] = useState('');

  // Sync local state when task loads for the first time
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
      void queryClient.invalidateQueries({ queryKey: ['notifications-recent'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: () =>
      apiClient.patch<CrmTask>(API.crm.taskDetail(taskId), { is_archived: true }).then((r) => r.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['crm', 'tasks', boardId] });
      void queryClient.invalidateQueries({ queryKey: ['crm', 'tasks', boardId, 'archived'] });
      onClose();
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
                  maxLength={255}
                  disabled={patchMutation.isPending}
                  className={cn(
                    'w-full rounded-lg border bg-gray-800 px-3 py-2 text-base font-medium text-white',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors border-gray-700',
                    'disabled:opacity-60',
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
                    onChange={(e) => setPriority(e.target.value as TaskPriorityValue)}
                    disabled={patchMutation.isPending}
                    className={cn(
                      'w-full rounded-lg border bg-gray-800 px-3 py-2 text-sm text-white',
                      'focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors border-gray-700',
                      'disabled:opacity-60',
                    )}
                  >
                    <option value="low">Низкий</option>
                    <option value="medium">Средний</option>
                    <option value="high">Высокий</option>
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
                    disabled={patchMutation.isPending}
                    className={cn(
                      'w-full rounded-lg border bg-gray-800 px-3 py-2 text-sm text-white',
                      'focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors border-gray-700',
                      '[color-scheme:dark] disabled:opacity-60',
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
                    onChange={(e) => setAssigneeId(e.target.value)}
                    disabled={patchMutation.isPending}
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
              </div>

              {/* Labels */}
              <TaskLabelsSection
                taskId={taskId}
                boardId={boardId}
                taskLabels={task.labels ?? []}
              />

              {/* Description */}
              <div className="space-y-1.5">
                <label htmlFor="task-description" className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Описание
                </label>
                <textarea
                  id="task-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Добавьте описание..."
                  disabled={patchMutation.isPending}
                  className={cn(
                    'w-full rounded-lg border bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-600',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors border-gray-700 resize-none',
                    'disabled:opacity-60',
                  )}
                />
              </div>

              {/* Save / Cancel */}
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
                  {patchMutation.isPending ? 'Сохранение...' : 'Сохранить'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={patchMutation.isPending}
                  className={cn(
                    'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                    'text-gray-400 hover:text-white hover:bg-gray-800',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                  )}
                >
                  Отменить
                </button>
                {patchMutation.isError && (
                  <p className="text-xs text-red-400">Не удалось сохранить изменения.</p>
                )}
              </div>

              {/* Checklists */}
              <ChecklistSection taskId={taskId} boardId={boardId} checklists={task.checklists ?? []} />

              {/* Attachments */}
              <AttachmentsSection taskId={taskId} boardId={boardId} />

              {/* Comments */}
              <CommentSection taskId={taskId} boardId={boardId} />

              {/* History */}
              <HistorySection taskId={taskId} />

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
  taskCount: number;
  onClose: () => void;
}

function EditColumnModal({ boardId, column, taskCount, onClose }: EditColumnModalProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(column.name);
  const [wipLimit, setWipLimit] = useState(column.wip_limit !== null ? String(column.wip_limit) : '');
  const [position, setPosition] = useState(String(column.order));
  const nameRef = useRef<HTMLInputElement>(null);

  const wipLimitNum = wipLimit.trim() === '' ? null : Number(wipLimit.trim());
  const wipLimitError =
    wipLimitNum !== null && wipLimitNum < taskCount
      ? `Лимит не может быть меньше текущего количества задач: ${taskCount}`
      : null;

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
    if (resolvedWipLimit !== null && resolvedWipLimit < taskCount) return;
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
              aria-describedby={wipLimitError ? 'edit-column-wip-error' : undefined}
              aria-invalid={wipLimitError ? true : undefined}
              className={cn(
                'w-full rounded-lg border bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500',
                'focus:outline-none focus:ring-2 transition-colors',
                wipLimitError
                  ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                  : 'border-gray-700 focus:ring-blue-500 focus:border-blue-500',
              )}
            />
            {wipLimitError && (
              <p id="edit-column-wip-error" className="text-xs text-red-400 mt-1">
                {wipLimitError}
              </p>
            )}
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
              disabled={!name.trim() || !!wipLimitError || mutation.isPending}
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
  taskCountByColumnId: Record<number, number>;
  onClose: () => void;
}

function DeleteColumnDialog({ boardId, column, otherColumns, taskCountByColumnId, onClose }: DeleteColumnDialogProps) {
  const queryClient = useQueryClient();
  const [moveToId, setMoveToId] = useState<string>(
    otherColumns.length > 0 ? String(otherColumns[0].id) : '',
  );

  const tasksToMove = taskCountByColumnId[column.id] ?? 0;

  const selectedColumn = moveToId
    ? otherColumns.find((c) => String(c.id) === moveToId) ?? null
    : null;

  const wipCheck =
    selectedColumn && tasksToMove > 0
      ? checkWipLimit({
          columns: [selectedColumn],
          taskCountByColumnId,
          targetColumnId: selectedColumn.id,
          tasksToAddCount: tasksToMove,
        })
      : { ok: true as const };

  const wipViolation = !wipCheck.ok;

  const wipWarning = (() => {
    if (!wipViolation || !selectedColumn || wipCheck.ok) return null;
    const limit = wipCheck.limit ?? selectedColumn.wip_limit ?? 0;
    const targetCount = wipCheck.current ?? taskCountByColumnId[selectedColumn.id] ?? 0;
    return `Недостаточно места в целевой колонке (WIP-лимит: ${limit}). Сейчас там ${targetCount} задач, переносится ${tasksToMove}. Выберите другую колонку или освободите место.`;
  })();

  const mutation = useMutation({
    mutationFn: async (targetId: string) => {
      await apiClient.delete(
        `${API.crm.column(boardId, column.id)}?move_to=${targetId}`,
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['crm', 'columns', boardId] });
      void queryClient.invalidateQueries({ queryKey: ['crm', 'tasks', boardId] });
      void queryClient.invalidateQueries({ queryKey: ['crm', 'board', boardId] });
      onClose();
    },
  });

  const handleConfirm = () => {
    if (!moveToId || wipViolation) return;
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
                wipViolation ? 'border-orange-600 focus:border-orange-500' : 'border-gray-700 focus:border-red-500',
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

        {wipWarning && (
          <div className="flex items-start gap-2 rounded-lg bg-orange-900/30 border border-orange-700 px-4 py-3 text-sm text-orange-300">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{wipWarning}</span>
          </div>
        )}

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
            disabled={!moveToId || mutation.isPending || otherColumns.length === 0 || wipViolation}
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
  taskCountByColumnId: Record<number, number>;
  onTaskClick: (taskId: number) => void;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  isDragOverlay?: boolean;
}

function KanbanColumn({
  column,
  allColumns,
  boardId,
  tasks,
  taskCountByColumnId,
  onTaskClick,
  dragHandleProps,
  isDragOverlay,
}: KanbanColumnProps) {
  const queryClient = useQueryClient();
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);

  const otherColumns = allColumns.filter((c) => c.id !== column.id);
  const atWipLimit = column.wip_limit !== null && tasks.length >= column.wip_limit;

  const archiveTaskMutation = useMutation({
    mutationFn: (taskId: number) =>
      apiClient.patch<CrmTask>(API.crm.taskDetail(taskId), { is_archived: true }).then((r) => r.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['crm', 'tasks', boardId] });
      void queryClient.invalidateQueries({ queryKey: ['crm', 'tasks', boardId, 'archived'] });
    },
  });

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
                  onArchive={archiveTaskMutation.mutate}
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
              disabled={atWipLimit}
              title={
                atWipLimit
                  ? 'Достигнут WIP-лимит колонки. Освободите место, чтобы добавить задачу.'
                  : undefined
              }
              className={cn(
                'flex w-full items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium',
                'text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                atWipLimit && 'opacity-50 cursor-not-allowed hover:bg-transparent hover:text-gray-500',
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
          wipBlocked={atWipLimit}
          onClose={() => setShowAddTask(false)}
        />
      )}

      {showEdit && (
        <EditColumnModal
          boardId={boardId}
          column={column}
          taskCount={tasks.length}
          onClose={() => setShowEdit(false)}
        />
      )}

      {showDelete && (
        <DeleteColumnDialog
          boardId={boardId}
          column={column}
          otherColumns={otherColumns}
          taskCountByColumnId={taskCountByColumnId}
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
  taskCountByColumnId: Record<number, number>;
  onTaskClick: (taskId: number) => void;
}

function SortableColumn({ column, allColumns, boardId, tasks, taskCountByColumnId, onTaskClick }: SortableColumnProps) {
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
        taskCountByColumnId={taskCountByColumnId}
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

// ─── Board Filters ────────────────────────────────────────────────────────────

interface BoardFilters {
  search: string;
  priority: string;
  deadline: string;
  ordering: string;
  view: 'kanban' | 'list';
}

const DEFAULT_FILTERS: BoardFilters = {
  search: '',
  priority: '',
  deadline: '',
  ordering: '',
  view: 'kanban',
};

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

interface FilterBarProps {
  filters: BoardFilters;
  onChange: (filters: BoardFilters) => void;
}

function FilterBar({ filters, onChange }: FilterBarProps) {
  const hasActive =
    filters.search !== '' ||
    filters.priority !== '' ||
    filters.deadline !== '' ||
    filters.ordering !== '';

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative flex-1 min-w-48">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
        />
        <input
          type="text"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          placeholder="Поиск по задачам..."
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
        onChange={(e) => onChange({ ...filters, priority: e.target.value })}
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
        onChange={(e) => onChange({ ...filters, deadline: e.target.value })}
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

      {/* Reset */}
      {hasActive && (
        <button
          type="button"
          onClick={() => onChange({ ...DEFAULT_FILTERS, view: filters.view })}
          className={cn(
            'rounded-lg border border-gray-700 px-3 py-2 text-sm font-medium',
            'text-gray-400 hover:text-white hover:border-gray-500 transition-colors',
          )}
        >
          Сбросить
        </button>
      )}

      {/* View toggle — pushed to the right */}
      <div className="ml-auto flex items-center rounded-lg border border-gray-700 bg-gray-800 p-0.5 gap-0.5">
        <button
          type="button"
          onClick={() => onChange({ ...filters, view: 'kanban' })}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
            filters.view === 'kanban'
              ? 'bg-gray-700 text-white'
              : 'text-gray-500 hover:text-gray-300',
          )}
          aria-label="Вид канбан"
          aria-pressed={filters.view === 'kanban'}
        >
          <LayoutDashboard size={13} />
          Канбан
        </button>
        <button
          type="button"
          onClick={() => onChange({ ...filters, view: 'list' })}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
            filters.view === 'list'
              ? 'bg-gray-700 text-white'
              : 'text-gray-500 hover:text-gray-300',
          )}
          aria-label="Вид список"
          aria-pressed={filters.view === 'list'}
        >
          <List size={13} />
          Список
        </button>
      </div>
    </div>
  );
}

// ─── List View ────────────────────────────────────────────────────────────────

interface ListViewProps {
  tasks: CrmTask[];
  columns: CrmColumn[];
  isLoading: boolean;
  onTaskClick: (taskId: number) => void;
}

function ListView({ tasks, columns, isLoading, onTaskClick }: ListViewProps) {
  const columnMap = new Map(columns.map((c) => [c.id, c.name]));

  if (isLoading) {
    return (
      <div className="space-y-2 animate-pulse">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 rounded-lg bg-gray-800" />
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Inbox size={32} className="text-gray-600" />
        <p className="text-gray-500 text-sm">Задачи не найдены</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-800">
      <table className="w-full text-sm" role="table" aria-label="Задачи доски">
        <thead>
          <tr className="border-b border-gray-800 bg-gray-900/60">
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
              Название
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
              Приоритет
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
              Дедлайн
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
              Исполнитель
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
              Колонка
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {tasks.map((task) => {
            const overdue = task.deadline ? isOverdue(task.deadline) : false;
            return (
              <tr
                key={task.id}
                className="bg-gray-900 hover:bg-gray-800/60 transition-colors cursor-pointer"
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
                  <span className="font-medium text-white line-clamp-1">{task.title}</span>
                </td>
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
                    </span>
                  ) : (
                    <span className="text-xs text-gray-600">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {task.assignee ? (
                    <div className="flex items-center gap-2">
                      <AssigneeAvatar assignee={task.assignee} size="sm" />
                      <span className="text-xs text-gray-400">
                        {task.assignee.first_name} {task.assignee.last_name}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-600">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-gray-400">
                    {columnMap.get(task.column_id) ?? '—'}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Archive Panel ────────────────────────────────────────────────────────────

interface ArchivePanelProps {
  boardId: string;
  columns: CrmColumn[];
  taskCountByColumnId: Record<number, number>;
  onClose: () => void;
  /** Called when user tries to restore while the task's column is at WIP limit */
  onRestoreWipBlocked?: () => void;
}

function ArchivePanel({
  boardId,
  columns,
  taskCountByColumnId,
  onClose,
  onRestoreWipBlocked,
}: ArchivePanelProps) {
  const queryClient = useQueryClient();
  const columnMap = new Map(columns.map((c) => [c.id, c.name]));

  const { data: archivedTasks = [], isLoading: archiveLoading } = useQuery({
    queryKey: ['crm', 'tasks', boardId, 'archived'],
    queryFn: async () => {
      const { data } = await apiClient.get<CrmTask[] | { results: CrmTask[] }>(
        API.crm.tasksList,
        { params: { board_id: boardId, is_archived: true } },
      );
      const list = Array.isArray(data) ? data : data.results;
      return list.filter((t) => t.is_archived);
    },
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const unarchiveMutation = useMutation({
    mutationFn: (taskId: number) =>
      apiClient.patch<CrmTask>(API.crm.taskDetail(taskId), { is_archived: false }).then((r) => r.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['crm', 'tasks', boardId] });
      void queryClient.invalidateQueries({ queryKey: ['crm', 'tasks', boardId, 'archived'] });
    },
  });

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/50"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="Архив задач"
    >
      <div className="flex flex-col w-full max-w-md bg-gray-900 border-l border-gray-800 shadow-2xl h-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 shrink-0">
          <div className="flex items-center gap-2">
            <Archive size={16} className="text-gray-400" />
            <h2 className="text-base font-semibold text-white">Архив задач</h2>
            {archivedTasks.length > 0 && (
              <span className="inline-flex items-center rounded-md bg-gray-800 border border-gray-700 px-1.5 py-0.5 text-xs text-gray-400">
                {archivedTasks.length}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors rounded-md p-1 hover:bg-gray-800"
            aria-label="Закрыть архив"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {archiveLoading ? (
            <div className="flex items-center justify-center h-full py-16">
              <p className="text-sm text-gray-500">Загрузка...</p>
            </div>
          ) : archivedTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 py-16 text-center">
              <Archive size={36} className="text-gray-700" />
              <p className="text-sm text-gray-500">Здесь пока нет архивных задач</p>
            </div>
          ) : (
            <ul className="space-y-2" role="list" aria-label="Архивные задачи">
              {archivedTasks.map((task) => {
                const restoreCheck = checkWipLimit({
                  columns,
                  taskCountByColumnId,
                  targetColumnId: task.column_id,
                  tasksToAddCount: 1,
                });
                const restoreBlocked = !restoreCheck.ok;

                return (
                <li
                  key={task.id}
                  className="flex items-start gap-3 rounded-lg border border-gray-700 bg-gray-800 px-3 py-3"
                >
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <p className="text-sm text-white leading-snug break-words">{task.title}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-gray-500">
                        {columnMap.get(task.column_id) ?? '—'}
                      </span>
                      <span
                        className={cn(
                          'inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium',
                          PRIORITY_BADGE_CLASS[task.priority],
                        )}
                      >
                        {PRIORITY_LABELS[task.priority]}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (restoreBlocked) {
                        onRestoreWipBlocked?.();
                        return;
                      }
                      unarchiveMutation.mutate(task.id);
                    }}
                    disabled={
                      unarchiveMutation.isPending && unarchiveMutation.variables === task.id
                    }
                    aria-disabled={restoreBlocked || undefined}
                    title={
                      restoreBlocked
                        ? 'Нельзя восстановить: превышен WIP-лимит этой колонки. Освободите место.'
                        : undefined
                    }
                    className={cn(
                      'shrink-0 rounded-md border border-gray-600 px-2.5 py-1.5 text-xs font-medium transition-colors',
                      'text-gray-300 hover:text-white hover:border-gray-400 hover:bg-gray-700',
                      restoreBlocked && 'opacity-50 cursor-not-allowed hover:bg-transparent hover:text-gray-500 hover:border-gray-600',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                    )}
                    aria-label={`Восстановить задачу: ${task.title}`}
                  >
                    {unarchiveMutation.isPending && unarchiveMutation.variables === task.id
                      ? '...'
                      : 'Восстановить'}
                  </button>
                </li>
                );
              })}
            </ul>
          )}
        </div>

        {unarchiveMutation.isError && (
          <div className="px-5 py-3 border-t border-gray-800 shrink-0">
            <p className="text-xs text-red-400">Не удалось восстановить задачу. Попробуйте снова.</p>
          </div>
        )}
      </div>
    </div>
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
  const [searchParams, setSearchParams] = useSearchParams();

  const { user } = useAuth();

  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<BoardFilters>(DEFAULT_FILTERS);
  const debouncedSearch = useDebounce(filters.search, 300);
  const [localColumns, setLocalColumns] = useState<CrmColumn[]>([]);
  const [localTasksByColumn, setLocalTasksByColumn] = useState<Record<number, CrmTask[]>>({});
  const [activeColumn, setActiveColumn] = useState<CrmColumn | null>(null);
  const [activeTask, setActiveTask] = useState<CrmTask | null>(null);
  const [activeDragType, setActiveDragType] = useState<'column' | 'task' | null>(null);
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [archivePanelOpen, setArchivePanelOpen] = useState(false);
  const [reorderError, setReorderError] = useState(false);
  const [taskMoveError, setTaskMoveError] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(() => {
    const taskParam = searchParams.get('task');
    return taskParam ? Number(taskParam) : null;
  });
  const reorderErrorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const taskMoveErrorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const snapshotRef = useRef<CrmColumn[]>([]);
  const taskSnapshotRef = useRef<Record<number, CrmTask[]>>({});
  /** One toast per task-drag when user hits a WIP-full column in handleDragOver */
  const wipDragBlockedToastShownRef = useRef(false);
  // Refs to avoid stale closures in DnD event handlers
  const activeDragTypeRef = useRef<'column' | 'task' | null>(null);
  const localTasksByColumnRef = useRef<Record<number, CrmTask[]>>({});

  const { showWipLimitToast, WipLimitToast } = useWipLimitToast();

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

  // Build params for the tasks query
  const taskQueryParams: Record<string, string | number> = { board_id: boardId };
  if (debouncedSearch) taskQueryParams.search = debouncedSearch;
  if (filters.priority) taskQueryParams.priority = filters.priority;
  if (filters.deadline) taskQueryParams.deadline = filters.deadline;
  if (filters.ordering) taskQueryParams.ordering = filters.ordering;
  if (filters.view === 'list') taskQueryParams.view = 'list';

  const {
    data: tasksData,
    isLoading: isTasksLoading,
  } = useQuery({
    queryKey: ['crm', 'tasks', boardId, taskQueryParams],
    queryFn: async () => {
      const { data } = await apiClient.get<
        CrmTask[] | { results: CrmTask[]; count?: number }
      >(API.crm.tasksList, { params: taskQueryParams });
      return Array.isArray(data) ? data : data.results;
    },
    enabled: Boolean(boardId),
  });

  const tasks = (tasksData ?? []).filter((t) => !t.is_archived);

  useEffect(() => {
    if (columns) setLocalColumns([...columns].sort((a, b) => a.order - b.order));
  }, [columns]);

  useEffect(() => {
    if (!tasksData) return;
    const grouped = tasksData.reduce<Record<number, CrmTask[]>>((acc, task) => {
      if (task.is_archived) return acc;
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
          message = WIP_LIMIT_VIOLATION_MESSAGE;
        }
      }
      setTaskMoveError(message);
      if (taskMoveErrorTimerRef.current) clearTimeout(taskMoveErrorTimerRef.current);
      taskMoveErrorTimerRef.current = setTimeout(() => setTaskMoveError(null), 4000);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['crm', 'tasks', boardId] });
      void queryClient.invalidateQueries({ queryKey: ['notifications-recent'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
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
      wipDragBlockedToastShownRef.current = false;
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

    const taskCountByColumnIdForWip = Object.fromEntries(
      Object.entries(currentTasksByColumn).map(([k, v]) => [Number(k), v.length]),
    );
    const wipCross = checkWipLimit({
      columns: localColumns,
      taskCountByColumnId: taskCountByColumnIdForWip,
      targetColumnId: targetColId,
      tasksToAddCount: 1,
      sourceColumnId: sourceColId,
    });
    if (!wipCross.ok) {
      if (!wipDragBlockedToastShownRef.current) {
        wipDragBlockedToastShownRef.current = true;
        showWipLimitToast();
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

      if (hasColumnChanged) {
        const snapshotCounts = Object.fromEntries(
          Object.entries(taskSnapshotRef.current).map(([k, v]) => [Number(k), v.length]),
        );
        const wipBeforeMove = checkWipLimit({
          columns: localColumns,
          taskCountByColumnId: snapshotCounts,
          targetColumnId: targetColId,
          tasksToAddCount: 1,
          sourceColumnId: originalColId ?? undefined,
        });
        if (!wipBeforeMove.ok) {
          localTasksByColumnRef.current = taskSnapshotRef.current;
          setLocalTasksByColumn(taskSnapshotRef.current);
          showWipLimitToast();
          return;
        }
      }

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
      {WipLimitToast}
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
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold text-white">{board.name}</h1>
          {board.description && (
            <p className="text-sm text-gray-500 mt-0.5">{board.description}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setArchivePanelOpen(true)}
          className={cn(
            'flex items-center gap-2 rounded-lg border border-gray-700 px-3 py-2 text-sm font-medium shrink-0',
            'text-gray-400 hover:text-white hover:border-gray-500 transition-colors',
          )}
          aria-label="Открыть архив задач"
        >
          <Archive size={15} />
          Архив
        </button>
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

      {/* Filter bar */}
      <FilterBar filters={filters} onChange={setFilters} />

      {/* List view */}
      {filters.view === 'list' ? (
        <ListView
          tasks={tasks}
          columns={localColumns}
          isLoading={isTasksLoading}
          onTaskClick={(taskId) => setSelectedTaskId(taskId)}
        />
      ) : (
      <>
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
                  taskCountByColumnId={Object.fromEntries(
                    Object.entries(localTasksByColumn).map(([k, v]) => [Number(k), v.length]),
                  )}
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
                taskCountByColumnId={Object.fromEntries(
                  Object.entries(localTasksByColumn).map(([k, v]) => [Number(k), v.length]),
                )}
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
      </>
      )}

      {/* Task detail modal */}
      {selectedTaskId !== null && (
        <TaskDetailModal
          taskId={selectedTaskId}
          boardId={boardId}
          onClose={() => {
            setSelectedTaskId(null);
            if (searchParams.has('task')) {
              searchParams.delete('task');
              setSearchParams(searchParams, { replace: true });
            }
          }}
        />
      )}

      {/* Archive panel */}
      {archivePanelOpen && (
        <ArchivePanel
          boardId={boardId}
          columns={localColumns}
          taskCountByColumnId={Object.fromEntries(
            Object.entries(localTasksByColumn).map(([k, v]) => [Number(k), v.length]),
          )}
          onClose={() => setArchivePanelOpen(false)}
          onRestoreWipBlocked={showWipLimitToast}
        />
      )}
    </div>
  );
}
