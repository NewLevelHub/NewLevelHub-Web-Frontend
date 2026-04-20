import { useParams, Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, LayoutGrid, AlertCircle, Inbox } from 'lucide-react';
import { API } from '@/shared/api/endpoints';
import { apiClient } from '@/shared/api/client';
import { cn } from '@/shared/lib/cn';
import type { CrmBoard, CrmColumn } from '@/shared/types';

// ─── Column Card ──────────────────────────────────────────────────────────────

interface KanbanColumnProps {
  column: CrmColumn;
}

function KanbanColumn({ column }: KanbanColumnProps) {
  return (
    <div
      className={cn(
        'flex flex-col rounded-xl border border-gray-800 bg-gray-900',
        'w-72 shrink-0 min-h-[300px]',
      )}
      role="region"
      aria-label={`Колонка: ${column.name}`}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <h3 className="text-sm font-semibold text-white">{column.name}</h3>
        <span className="text-xs text-gray-500 bg-gray-800 rounded-full px-2 py-0.5">0</span>
      </div>

      {/* Empty placeholder */}
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-8 text-center">
        <Inbox size={20} className="text-gray-600" />
        <p className="text-xs text-gray-600">Нет задач</p>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function BoardDetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Back link */}
      <div className="h-4 w-28 rounded bg-gray-800" />

      {/* Title */}
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-gray-800" />
        <div className="h-7 w-48 rounded-lg bg-gray-800" />
      </div>

      {/* Columns */}
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

  const isLoading = isBoardLoading || isColumnsLoading;
  const isError = isBoardError || isColumnsError;

  // ── Loading ──
  if (isLoading) {
    return <BoardDetailSkeleton />;
  }

  // ── Error ──
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

  const sortedColumns = (columns ?? []).slice().sort((a, b) => a.order - b.order);

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
      <div
        className="flex gap-4 overflow-x-auto pb-6"
        role="main"
        aria-label={`Канбан-доска: ${board.name}`}
      >
        {sortedColumns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 w-full">
            <Inbox size={32} className="text-gray-600" />
            <p className="text-gray-500 text-sm">В этой доске нет колонок</p>
          </div>
        ) : (
          sortedColumns.map((column) => <KanbanColumn key={column.id} column={column} />)
        )}
      </div>
    </div>
  );
}
