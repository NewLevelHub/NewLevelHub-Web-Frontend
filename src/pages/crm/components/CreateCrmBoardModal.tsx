import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { X, AlertCircle } from 'lucide-react';
import { API } from '@/shared/api/endpoints';
import { apiClient } from '@/shared/api/client';
import { cn } from '@/shared/lib/cn';
import type { CrmBoard } from '@/shared/types';

export interface CreateCrmBoardModalProps {
  onClose: () => void;
  companyId: string | null;
}

export function CreateCrmBoardModal({ onClose, companyId }: CreateCrmBoardModalProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [limitError, setLimitError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const mutation = useMutation({
    mutationFn: async (payload: { name: string; description?: string }) => {
      const { data } = await apiClient.post<CrmBoard>(API.crm.boards, payload);
      return data;
    },
    onSuccess: (newBoard) => {
      void queryClient.invalidateQueries({ queryKey: ['crm', 'boards'] });
      if (companyId) {
        void queryClient.invalidateQueries({ queryKey: ['company-onboarding', companyId] });
      }
      void navigate(`/crm/boards/${newBoard.id}`);
    },
    onError: (error: unknown) => {
      const axiosError = error as {
        response?: { status?: number; data?: { detail?: string; non_field_errors?: string[] } };
      };
      if (axiosError.response?.status === 400) {
        const responseData = axiosError.response.data;
        const message =
          responseData?.detail ??
          responseData?.non_field_errors?.[0] ??
          'Достигнут лимит досок для вашего тарифа.';
        setLimitError(message);
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLimitError(null);
    mutation.mutate({
      name: name.trim(),
      ...(description.trim() ? { description: description.trim() } : {}),
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
      aria-labelledby="create-board-title"
    >
      <div className="w-full max-w-md rounded-xl bg-surface border border-default shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-default">
          <h2 id="create-board-title" className="text-lg font-semibold text-primary">
            Создать доску
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
          {limitError && (
            <div className="flex items-start gap-2 rounded-lg bg-danger-subtle border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-danger">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{limitError}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="board-name" className="block text-sm font-medium text-secondary">
              Название <span className="text-red-400">*</span>
            </label>
            <input
              ref={nameRef}
              id="board-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например: Разработка продукта"
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
            <label htmlFor="board-description" className="block text-sm font-medium text-secondary">
              Описание <span className="text-muted font-normal">(необязательно)</span>
            </label>
            <textarea
              id="board-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Краткое описание доски..."
              rows={3}
              maxLength={500}
              className={cn(
                'w-full rounded-lg border bg-raised px-3 py-2 text-sm text-primary placeholder-gray-500 resize-none',
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
