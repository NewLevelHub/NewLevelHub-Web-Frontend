import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  DragOverlay,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronLeft, LayoutGrid, AlertCircle, Inbox, GripVertical } from 'lucide-react';
import { API } from '@/shared/api/endpoints';
import { apiClient } from '@/shared/api/client';
import { cn } from '@/shared/lib/cn';
import type { CrmBoard, CrmColumn } from '@/shared/types';

// ─── Kanban Column ────────────────────────────────────────────────────────────

interface KanbanColumnProps {
  column: CrmColumn;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
}

function KanbanColumn({ column, dragHandleProps }: KanbanColumnProps) {
  return (
    <div className="flex flex-col rounded-xl border border-gray-800 bg-gray-900 w-72 shrink-0 min-h-[300px]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <h3 className="text-sm font-semibold text-white">{column.name}</h3>
        <button
          {...dragHandleProps}
          className="p-1 rounded text-gray-600 hover:text-gray-400 cursor-grab active:cursor-grabbing focus:outline-none"
          aria-label="Перетащить колонку"
        >
          <GripVertical size={14} />
        </button>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-8 text-center">
        <Inbox size={20} className="text-gray-600" />
        <p className="text-xs text-gray-600">Нет задач</p>
      </div>
    </div>
  );
}

// ─── Sortable Column ──────────────────────────────────────────────────────────

function SortableColumn({ column }: { column: CrmColumn }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: column.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && 'opacity-40')}>
      <KanbanColumn column={column} dragHandleProps={{ ...attributes, ...listeners }} />
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

  const [localColumns, setLocalColumns] = useState<CrmColumn[]>([]);
  const [activeColumn, setActiveColumn] = useState<CrmColumn | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveColumn(null);
    if (!over || active.id === over.id) return;

    setLocalColumns(prev => {
      const oldIndex = prev.findIndex(c => c.id === active.id);
      const newIndex = prev.findIndex(c => c.id === over.id);
      const reordered = arrayMove(prev, oldIndex, newIndex);
      reordered.forEach((col, idx) => {
        const newOrder = idx + 1;
        if (col.order !== newOrder) {
          void apiClient.patch(API.crm.columns(boardId) + `${col.id}/`, { order: newOrder });
        }
      });
      return reordered.map((col, idx) => ({ ...col, order: idx + 1 }));
    });
  };

  const handleDragStart = (event: { active: { id: string | number } }) => {
    const col = localColumns.find(c => c.id === event.active.id);
    setActiveColumn(col ?? null);
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

      {/* Kanban board */}
      {localColumns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Inbox size={32} className="text-gray-600" />
          <p className="text-gray-500 text-sm">В этой доске нет колонок</p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
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
                <SortableColumn key={column.id} column={column} />
              ))}
            </div>
          </SortableContext>
          <DragOverlay>
            {activeColumn ? <KanbanColumn column={activeColumn} /> : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
