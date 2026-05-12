import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, AlertCircle } from 'lucide-react';
import { API } from '@/shared/api/endpoints';
import { apiClient } from '@/shared/api/client';
import { cn } from '@/shared/lib/cn';
import { checkWipLimit } from '@/shared/lib/crm-wip-limit';
import type { CrmColumn } from '@/shared/types';

export interface DeleteColumnDialogProps {
  boardId: string;
  column: CrmColumn;
  otherColumns: CrmColumn[];
  taskCountByColumnId: Record<number, number>;
  onClose: () => void;
}

export function DeleteColumnDialog({
  boardId,
  column,
  otherColumns,
  taskCountByColumnId,
  onClose,
}: DeleteColumnDialogProps) {
  const queryClient = useQueryClient();
  const [moveToId, setMoveToId] = useState<string>(
    otherColumns.length > 0 ? String(otherColumns[0].id) : '',
  );

  const tasksToMove = taskCountByColumnId[column.id] ?? 0;

  const selectedColumn = moveToId ? otherColumns.find((c) => String(c.id) === moveToId) ?? null : null;

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
      await apiClient.delete(API.crm.column(boardId, column.id), { params: { move_to: targetId } });
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
          Колонка <span className="font-medium text-gray-200">«{column.name}»</span> будет удалена.
          {otherColumns.length > 0
            ? ' Выберите колонку, в которую переместятся задачи.'
            : ' В этой доске нет других колонок — удаление недоступно.'}
        </p>

        {otherColumns.length > 0 ? (
          <div className="space-y-1.5">
            <label htmlFor="move-to-select" className="block text-sm font-medium text-gray-300">
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
