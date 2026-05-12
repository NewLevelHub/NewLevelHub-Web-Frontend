import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { API } from '@/shared/api/endpoints';
import { apiClient } from '@/shared/api/client';
import { cn } from '@/shared/lib/cn';
import type { CrmColumn } from '@/shared/types';

export interface CreateColumnModalProps {
  boardId: string;
  onClose: () => void;
}

export function CreateColumnModal({ boardId, onClose }: CreateColumnModalProps) {
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
      <div className="w-full max-w-md rounded-xl bg-surface border border-default shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-default">
          <h2 id="create-column-title" className="text-lg font-semibold text-primary">
            Добавить колонку
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
            <label htmlFor="column-name" className="block text-sm font-medium text-secondary">
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
                'w-full rounded-lg border bg-raised px-3 py-2 text-sm text-primary placeholder-gray-500',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors',
                'border-default focus:border-blue-500',
              )}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="column-wip" className="block text-sm font-medium text-secondary">
              Лимит WIP <span className="text-muted font-normal">(необязательно)</span>
            </label>
            <input
              id="column-wip"
              type="number"
              min={0}
              value={wipLimit}
              onChange={(e) => setWipLimit(e.target.value)}
              placeholder="Максимум задач в колонке"
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
