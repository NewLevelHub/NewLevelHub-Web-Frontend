import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X } from 'lucide-react';
import { API } from '@/shared/api/endpoints';
import { apiClient } from '@/shared/api/client';
import { cn } from '@/shared/lib/cn';
import type { CrmColumn } from '@/shared/types';

export interface InlineAddColumnProps {
  boardId: string;
  onDone: () => void;
}

export function InlineAddColumn({ boardId, onDone }: InlineAddColumnProps) {
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
      className="flex flex-col rounded-xl border border-blue-600/50 bg-surface w-72 shrink-0 px-4 py-3 gap-2"
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
          'w-full rounded-lg border bg-raised px-3 py-2 text-sm text-primary placeholder-gray-500',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors border-default',
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
          className="rounded-lg p-1.5 text-muted hover:text-secondary hover:bg-hover transition-colors"
          aria-label="Отмена"
        >
          <X size={15} />
        </button>
      </div>
    </form>
  );
}
