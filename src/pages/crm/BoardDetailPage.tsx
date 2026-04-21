import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragCancelEvent,
  DragOverlay,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
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
} from 'lucide-react';
import { API } from '@/shared/api/endpoints';
import { apiClient } from '@/shared/api/client';
import { cn } from '@/shared/lib/cn';
import { useAuth } from '@/shared/hooks/useAuth';
import { USER_ROLES } from '@/shared/config/constants';
import type { CrmBoard, CrmColumn } from '@/shared/types';

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
              Позиция <span className="text-red-400">*</span>
            </label>
            <input
              id="edit-column-position"
              type="number"
              min={1}
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              required
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

  // Close menu when clicking outside
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
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  isDragOverlay?: boolean;
  canManage?: boolean;
}

function KanbanColumn({ column, allColumns, boardId, dragHandleProps, isDragOverlay, canManage = true }: KanbanColumnProps) {
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const otherColumns = allColumns.filter((c) => c.id !== column.id);

  return (
    <>
      <div className="group flex flex-col rounded-xl border border-gray-800 bg-gray-900 w-72 shrink-0 min-h-[300px]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="text-sm font-semibold text-white truncate">{column.name}</h3>
            {column.wip_limit !== null && (
              <span
                className="shrink-0 inline-flex items-center rounded-md bg-gray-800 border border-gray-700 px-1.5 py-0.5 text-xs text-gray-400"
                title={`WIP-лимит: ${column.wip_limit}`}
              >
                {column.wip_limit}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {!isDragOverlay && canManage && (
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
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-8 text-center">
          <Inbox size={20} className="text-gray-600" />
          <p className="text-xs text-gray-600">Нет задач</p>
        </div>
      </div>

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
  canManage?: boolean;
}

function SortableColumn({ column, allColumns, boardId, canManage }: SortableColumnProps) {
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
        dragHandleProps={{ ...attributes, ...listeners }}
        canManage={canManage}
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
        'min-h-[300px] justify-center flex-col',
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
  const isEmployee = user?.role === USER_ROLES.EMPLOYEE;

  const queryClient = useQueryClient();
  const [localColumns, setLocalColumns] = useState<CrmColumn[]>([]);
  const [activeColumn, setActiveColumn] = useState<CrmColumn | null>(null);
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [reorderError, setReorderError] = useState(false);
  const reorderErrorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Hold a snapshot of columns before a drag so we can rollback on error
  const snapshotRef = useRef<CrmColumn[]>([]);

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

  useEffect(() => {
    if (columns) setLocalColumns([...columns].sort((a, b) => a.order - b.order));
  }, [columns]);

  const reorderMutation = useMutation({
    mutationFn: (columnIds: number[]) =>
      apiClient.post(API.crm.columnsReorder(boardId), { column_ids: columnIds }),
    onError: () => {
      // Rollback to the snapshot captured before the drag
      setLocalColumns(snapshotRef.current);
      // Also restore the query cache so any subsequent refetch is consistent
      queryClient.setQueryData<CrmColumn[]>(['crm', 'columns', boardId], snapshotRef.current);
      // Show inline error and auto-dismiss after 3 seconds
      setReorderError(true);
      if (reorderErrorTimerRef.current) clearTimeout(reorderErrorTimerRef.current);
      reorderErrorTimerRef.current = setTimeout(() => setReorderError(false), 3000);
    },
    onSuccess: () => {
      // Refetch to get canonical order values from the server
      void queryClient.invalidateQueries({ queryKey: ['crm', 'columns', boardId] });
    },
  });

  const handleDragStart = (event: { active: { id: string | number } }) => {
    const col = localColumns.find(c => c.id === event.active.id);
    setActiveColumn(col ?? null);
    // Capture snapshot for potential rollback
    snapshotRef.current = [...localColumns];
  };

  const handleDragCancel = (_event: DragCancelEvent) => {
    // Escape pressed or drag cancelled — restore original order, no API call
    setActiveColumn(null);
    setLocalColumns(snapshotRef.current);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveColumn(null);

    // Dropped outside a valid target — restore original order, no API call
    if (!over) {
      setLocalColumns(snapshotRef.current);
      return;
    }

    if (active.id === over.id) return;

    const oldIndex = localColumns.findIndex(c => c.id === active.id);
    const newIndex = localColumns.findIndex(c => c.id === over.id);
    const reordered = arrayMove(localColumns, oldIndex, newIndex).map((col, idx) => ({
      ...col,
      order: idx + 1,
    }));

    // Optimistic update — update UI immediately
    setLocalColumns(reordered);

    // Persist to backend via bulk reorder endpoint
    reorderMutation.mutate(reordered.map(c => c.id));
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

      {/* Kanban board */}
      {localColumns.length === 0 && !showAddColumn ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Inbox size={32} className="text-gray-600" />
          <p className="text-gray-500 text-sm">В этой доске нет колонок</p>
          {!isEmployee && (
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
          )}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
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
                  canManage={!isEmployee}
                />
              ))}

              {/* Inline add column form or add button — hidden for employees */}
              {!isEmployee && (
                showAddColumn ? (
                  <InlineAddColumn
                    boardId={boardId}
                    onDone={() => setShowAddColumn(false)}
                  />
                ) : (
                  <AddColumnButton onClick={() => setShowAddColumn(true)} />
                )
              )}
            </div>
          </SortableContext>
          <DragOverlay>
            {activeColumn ? (
              <KanbanColumn
                column={activeColumn}
                allColumns={localColumns}
                boardId={boardId}
                isDragOverlay
                canManage={false}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
