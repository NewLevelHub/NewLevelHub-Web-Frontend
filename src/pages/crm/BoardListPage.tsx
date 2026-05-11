import { Plus, Archive, Inbox, AlertCircle } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { useBoardList } from '@/pages/crm/hooks/useBoardList';
import { BoardListCard } from '@/pages/crm/components/BoardListCard';
import { CreateCrmBoardModal } from '@/pages/crm/components/CreateCrmBoardModal';
import { ArchiveBoardConfirm } from '@/pages/crm/components/ArchiveBoardConfirm';
import { UnarchiveBoardConfirm } from '@/pages/crm/components/UnarchiveBoardConfirm';

export default function BoardListPage() {
  const {
    user,
    canManage,
    visibleBoards,
    isLoading,
    isError,
    showArchived,
    setShowArchived,
    showCreateModal,
    setShowCreateModal,
    boardToArchive,
    setBoardToArchive,
    boardToUnarchive,
    setBoardToUnarchive,
    unarchiveError,
    setUnarchiveError,
    archiveMutation,
    unarchiveMutation,
    handleBoardClick,
    handleOpenUnarchive,
  } = useBoardList();

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

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <AlertCircle size={40} className="text-red-400" />
        <p className="text-gray-400">Не удалось загрузить доски. Попробуйте обновить страницу.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
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

        {visibleBoards.length === 0 && (
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

        {visibleBoards.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {visibleBoards.map((board) => (
              <BoardListCard
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

      {showCreateModal && (
        <CreateCrmBoardModal
          onClose={() => setShowCreateModal(false)}
          companyId={user?.company_id != null ? String(user.company_id) : null}
        />
      )}

      {boardToArchive && (
        <ArchiveBoardConfirm
          board={boardToArchive}
          onCancel={() => setBoardToArchive(null)}
          onConfirm={() => archiveMutation.mutate(boardToArchive.id)}
          isPending={archiveMutation.isPending}
        />
      )}

      {boardToUnarchive && (
        <UnarchiveBoardConfirm
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
