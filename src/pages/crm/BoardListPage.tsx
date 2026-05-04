import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { Plus, Archive, LayoutGrid, Calendar, X, AlertCircle, Inbox, ArchiveRestore } from 'lucide-react';
import { API } from '@/shared/api/endpoints';
import { apiClient } from '@/shared/api/client';
import { cn } from '@/shared/lib/cn';
import type { CrmBoard } from '@/shared/types';
import { useAuth } from '@/shared/hooks/useAuth';
import { USER_ROLES } from '@/shared/config/constants';

// ─── Create Board Modal ───────────────────────────────────────────────────────

interface CreateBoardModalProps {
  onClose: () => void;
  companyId: string | null;
}

function CreateBoardModal({ onClose, companyId }: CreateBoardModalProps) {
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
      <div className="w-full max-w-md rounded-xl bg-gray-900 border border-gray-800 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 id="create-board-title" className="text-lg font-semibold text-white">
            Создать доску
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
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {limitError && (
            <div className="flex items-start gap-2 rounded-lg bg-red-900/30 border border-red-800 px-4 py-3 text-sm text-red-300">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{limitError}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="board-name" className="block text-sm font-medium text-gray-300">
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
                'w-full rounded-lg border bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors',
                'border-gray-700 focus:border-blue-500',
              )}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="board-description" className="block text-sm font-medium text-gray-300">
              Описание{' '}
              <span className="text-gray-500 font-normal">(необязательно)</span>
            </label>
            <textarea
              id="board-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Краткое описание доски..."
              rows={3}
              maxLength={500}
              className={cn(
                'w-full rounded-lg border bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 resize-none',
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

// ─── Archive Confirm Dialog ───────────────────────────────────────────────────

interface ArchiveConfirmProps {
  board: CrmBoard;
  onCancel: () => void;
  onConfirm: () => void;
  isPending: boolean;
}

function ArchiveConfirm({ board, onCancel, onConfirm, isPending }: ArchiveConfirmProps) {
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onCancel();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="archive-confirm-title"
    >
      <div className="w-full max-w-sm rounded-xl bg-gray-900 border border-gray-800 shadow-2xl px-6 py-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-amber-900/40 p-2">
            <Archive size={18} className="text-amber-400" />
          </div>
          <h2 id="archive-confirm-title" className="text-base font-semibold text-white">
            Архивировать доску?
          </h2>
        </div>
        <p className="text-sm text-gray-400">
          Доска <span className="font-medium text-gray-200">«{board.name}»</span> будет
          перемещена в архив. Вы сможете найти её через фильтр.
        </p>
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              'bg-amber-600 text-white hover:bg-amber-500',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            {isPending ? 'Архивирование...' : 'Архивировать'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Unarchive Confirm Dialog ─────────────────────────────────────────────────

interface UnarchiveConfirmProps {
  board: CrmBoard;
  onCancel: () => void;
  onConfirm: () => void;
  isPending: boolean;
  error: string | null;
}

function UnarchiveConfirm({ board, onCancel, onConfirm, isPending, error }: UnarchiveConfirmProps) {
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onCancel();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="unarchive-confirm-title"
    >
      <div className="w-full max-w-sm rounded-xl bg-gray-900 border border-gray-800 shadow-2xl px-6 py-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-blue-900/40 p-2">
            <ArchiveRestore size={18} className="text-blue-400" />
          </div>
          <h2 id="unarchive-confirm-title" className="text-base font-semibold text-white">
            Разархивировать доску?
          </h2>
        </div>
        <p className="text-sm text-gray-400">
          Доска <span className="font-medium text-gray-200">«{board.name}»</span> будет
          восстановлена и снова станет активной.
        </p>
        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-red-900/30 border border-red-800 px-4 py-3 text-sm text-red-300">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              'bg-blue-600 text-white hover:bg-blue-500',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            {isPending ? 'Восстановление...' : 'Разархивировать'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Board Card ───────────────────────────────────────────────────────────────

interface BoardCardProps {
  board: CrmBoard;
  onArchive: (board: CrmBoard) => void;
  onUnarchive: (board: CrmBoard) => void;
  onClick: (board: CrmBoard) => void;
  canManage: boolean;
}

function BoardCard({ board, onArchive, onUnarchive, onClick, canManage }: BoardCardProps) {
  const formattedDate = new Date(board.created_at).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const handleArchiveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onArchive(board);
  };

  const handleUnarchiveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUnarchive(board);
  };

  const handleCardClick = () => {
    if (!board.is_archived) {
      onClick(board);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!board.is_archived && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick(board);
    }
  };

  return (
    <div
      role={board.is_archived ? 'article' : 'button'}
      tabIndex={0}
      aria-label={
        board.is_archived
          ? `Архивная доска ${board.name}`
          : `Открыть доску ${board.name}`
      }
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      className={cn(
        'group relative flex flex-col rounded-xl border border-gray-800 bg-gray-900',
        'p-5 transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
        board.is_archived
          ? 'opacity-60 cursor-default'
          : 'cursor-pointer hover:border-gray-600 hover:bg-gray-800/60 hover:shadow-lg',
      )}
    >
      {/* Archived badge */}
      {board.is_archived && (
        <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-md bg-amber-900/40 border border-amber-800/60 px-2 py-0.5 text-xs font-medium text-amber-400">
          <Archive size={10} />
          Архив
        </span>
      )}

      {/* Icon + title */}
      <div className={cn('flex items-start gap-3 mb-3', board.is_archived && 'mt-5')}>
        <div className="mt-0.5 rounded-lg bg-blue-600/20 p-2 shrink-0">
          <LayoutGrid size={18} className="text-blue-400" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-white text-sm leading-tight truncate">
            {board.name}
          </h3>
          {board.description && (
            <p className="mt-1 text-xs text-gray-400 line-clamp-2">{board.description}</p>
          )}
        </div>
      </div>

      {/* Date */}
      <div className="mt-auto flex items-center gap-1.5 text-xs text-gray-500">
        <Calendar size={12} />
        <span>{formattedDate}</span>
      </div>

      {/* Action button — visible on hover, only for managers */}
      {canManage && (
        board.is_archived ? (
          <button
            type="button"
            onClick={handleUnarchiveClick}
            aria-label={`Разархивировать доску ${board.name}`}
            className={cn(
              'absolute top-3 right-3 rounded-md p-1.5 transition-all duration-150',
              'text-gray-600 hover:text-blue-400 hover:bg-blue-900/30',
              'opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
            )}
          >
            <ArchiveRestore size={14} />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleArchiveClick}
            aria-label={`Архивировать доску ${board.name}`}
            className={cn(
              'absolute top-3 right-3 rounded-md p-1.5 transition-all duration-150',
              'text-gray-600 hover:text-amber-400 hover:bg-amber-900/30',
              'opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500',
            )}
          >
            <Archive size={14} />
          </button>
        )
      )}
    </div>
  );
}

// ─── BoardListPage ────────────────────────────────────────────────────────────

export default function BoardListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [boardToArchive, setBoardToArchive] = useState<CrmBoard | null>(null);
  const [boardToUnarchive, setBoardToUnarchive] = useState<CrmBoard | null>(null);
  const [unarchiveError, setUnarchiveError] = useState<string | null>(null);

  const canManage =
    user?.role === USER_ROLES.COMPANY_ADMIN || user?.role === USER_ROLES.SUPERADMIN;

  const { data: boards, isLoading, isError } = useQuery({
    queryKey: ['crm', 'boards', showArchived],
    queryFn: async () => {
      const url = showArchived
        ? `${API.crm.boards}?include_archived=true`
        : API.crm.boards;
      const { data } = await apiClient.get<CrmBoard[] | { results: CrmBoard[] }>(url);
      return Array.isArray(data) ? data : data.results;
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (boardId: number) => {
      const { data } = await apiClient.post(API.crm.boardArchive(String(boardId)));
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['crm', 'boards'] });
      setBoardToArchive(null);
    },
  });

  const unarchiveMutation = useMutation({
    mutationFn: async (boardId: number) => {
      const { data } = await apiClient.post<CrmBoard>(API.crm.boardUnarchive(String(boardId)));
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['crm', 'boards'] });
      setBoardToUnarchive(null);
      setUnarchiveError(null);
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
          'Невозможно разархивировать: достигнут лимит досок для вашего тарифа';
        setUnarchiveError(message);
      }
    },
  });

  const handleBoardClick = (board: CrmBoard) => {
    void navigate(`/crm/boards/${board.id}`);
  };

  const handleOpenUnarchive = (board: CrmBoard) => {
    setUnarchiveError(null);
    setBoardToUnarchive(board);
  };

  // ── Loading state ──
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-7 w-36 rounded-lg bg-gray-800 animate-pulse" />
          <div className="h-9 w-36 rounded-lg bg-gray-800 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-gray-800 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <AlertCircle size={40} className="text-red-400" />
        <p className="text-gray-400">
          Не удалось загрузить доски. Попробуйте обновить страницу.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-white">CRM — Доски</h1>
            <p className="text-sm text-gray-500 mt-0.5">Канбан-доски вашей компании</p>
          </div>
          <div className="flex items-center gap-2">
            {canManage && (
              <button
                type="button"
                onClick={() => setShowArchived((v) => !v)}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors border',
                  showArchived
                    ? 'bg-amber-600/20 border-amber-600 text-amber-400'
                    : 'border-gray-700 text-gray-400 hover:text-white hover:border-gray-500',
                )}
              >
                <Archive size={16} />
                {showArchived ? 'Скрыть архив' : 'Архив'}
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className={cn(
                'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                'bg-blue-600 text-white hover:bg-blue-500',
              )}
            >
              <Plus size={16} />
              Создать доску
            </button>
          </div>
        </div>

        {/* Empty state */}
        {boards?.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="rounded-full bg-gray-800 p-5">
              <Inbox size={32} className="text-gray-500" />
            </div>
            <div className="text-center">
              <p className="font-medium text-gray-300">
                {showArchived ? 'Нет архивных досок' : 'Нет досок'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {showArchived ? 'Архивированные доски появятся здесь.' : 'Создайте первую!'}
              </p>
            </div>
            {!showArchived && (
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium bg-blue-600 text-white hover:bg-blue-500 transition-colors"
              >
                <Plus size={16} />
                Создать доску
              </button>
            )}
          </div>
        )}

        {/* Board grid */}
        {boards && boards.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {boards.map((board) => (
              <BoardCard
                key={board.id}
                board={board}
                onClick={handleBoardClick}
                onArchive={setBoardToArchive}
                onUnarchive={handleOpenUnarchive}
                canManage={canManage}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreateModal && (
        <CreateBoardModal
          onClose={() => setShowCreateModal(false)}
          companyId={user?.company_id != null ? String(user.company_id) : null}
        />
      )}

      {/* Archive confirm */}
      {boardToArchive && (
        <ArchiveConfirm
          board={boardToArchive}
          onCancel={() => setBoardToArchive(null)}
          onConfirm={() => archiveMutation.mutate(boardToArchive.id)}
          isPending={archiveMutation.isPending}
        />
      )}

      {/* Unarchive confirm */}
      {boardToUnarchive && (
        <UnarchiveConfirm
          board={boardToUnarchive}
          onCancel={() => {
            setBoardToUnarchive(null);
            setUnarchiveError(null);
          }}
          onConfirm={() => unarchiveMutation.mutate(boardToUnarchive.id)}
          isPending={unarchiveMutation.isPending}
          error={unarchiveError}
        />
      )}
    </>
  );
}
