import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { API } from '@/shared/api/endpoints';
import { apiClient } from '@/shared/api/client';
import { cn } from '@/shared/lib/cn';
import type { CrmColumn } from '@/shared/types';

export interface EditColumnModalProps {
  boardId: string;
  column: CrmColumn;
  taskCount: number;
  onClose: () => void;
}

export function EditColumnModal({ boardId, column, taskCount, onClose }: EditColumnModalProps) {
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
      const { data } = await apiClient.patch<CrmColumn>(API.crm.column(boardId, column.id), payload);
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
      <div className="w-full max-w-md rounded-xl bg-surface border border-default shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-default">
          <h2 id="edit-column-title" className="text-lg font-semibold text-primary">
            Редактировать колонку
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-secondary hover:text-primary transition-colors rounded-md p-1 hover:bg-hover"
            aria-label="Закрыть"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="edit-column-name" className="block text-sm font-medium text-secondary">
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
                'w-full rounded-lg border bg-raised px-3 py-2 text-sm text-primary placeholder-gray-500',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors',
                'border-default focus:border-blue-500',
              )}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="edit-column-wip" className="block text-sm font-medium text-secondary">
              Лимит WIP <span className="text-muted font-normal">(необязательно)</span>
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
                'w-full rounded-lg border bg-raised px-3 py-2 text-sm text-primary placeholder-gray-500',
                'focus:outline-none focus:ring-2 transition-colors',
                wipLimitError
                  ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                  : 'border-default focus:ring-blue-500 focus:border-blue-500',
              )}
            />
            {wipLimitError && (
              <p id="edit-column-wip-error" className="text-xs text-red-400 mt-1">
                {wipLimitError}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="edit-column-position" className="block text-sm font-medium text-secondary">
              Позиция
            </label>
            <input
              id="edit-column-position"
              type="number"
              min={1}
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className={cn(
                'w-full rounded-lg border bg-raised px-3 py-2 text-sm text-primary placeholder-gray-500',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors',
                'border-default focus:border-blue-500',
              )}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-secondary hover:text-primary hover:bg-hover transition-colors"
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
