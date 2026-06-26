import { useTranslation } from 'react-i18next';
import { Plus, Archive, Inbox, AlertCircle } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { useBoardList } from '@/pages/crm/hooks/useBoardList';
import { BoardListCard } from '@/pages/crm/components/BoardListCard';
import { CreateCrmBoardModal } from '@/pages/crm/components/CreateCrmBoardModal';
import { ArchiveBoardConfirm } from '@/pages/crm/components/ArchiveBoardConfirm';
import { UnarchiveBoardConfirm } from '@/pages/crm/components/UnarchiveBoardConfirm';
import { Button } from '@/shared/ui/Button';

export default function BoardListPage() {
  const { t } = useTranslation();
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
          <div className="h-7 w-36 rounded-lg bg-raised animate-pulse" />
          <div className="h-9 w-36 rounded-lg bg-raised animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-raised animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <AlertCircle size={40} className="text-red-400" />
        <p className="text-secondary">Не удалось загрузить доски. Попробуйте обновить страницу.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-bold text-[color:var(--text-primary)]">{t('crm.boardsTitle')}</h1>
            <p className="text-[13px] text-[color:var(--text-muted)] mt-0.5">{t('crm.boardsSubtitle')}</p>
          </div>
          <div className="flex items-center gap-2">
            {canManage && (
              <button
                type="button"
                onClick={() => setShowArchived((v) => !v)}
                className={cn(
                  'inline-flex items-center gap-1.5 h-[34px] px-3 text-[13px] font-medium rounded-[var(--radius-sm)] transition-colors',
                  showArchived
                    ? 'bg-[color:var(--warning-bg)] text-[color:var(--warning-text)] border border-[color:var(--warning)]'
                    : 'border border-[color:var(--border)] text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-hover)]',
                )}
              >
                <Archive size={15} />
                {showArchived ? t('common.hideArchive') : t('crm.archiveLabel')}
              </button>
            )}
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus size={16} />{t('common.createBoard')}
            </Button>
          </div>
        </div>

        {visibleBoards.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="rounded-full bg-raised p-5">
              <Inbox size={32} className="text-muted" />
            </div>
            <div className="text-center">
              <p className="font-medium text-secondary">
                {showArchived ? 'Нет архивных досок' : t('common.noBoards')}
              </p>
              <p className="text-sm text-muted mt-1">
                {showArchived ? 'Архивированные доски появятся здесь.' : 'Создайте первую!'}
              </p>
            </div>
            {!showArchived && (
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus size={16} />{t('common.createBoard')}
              </Button>
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
