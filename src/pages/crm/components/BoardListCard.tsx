import { memo } from 'react';
import { Archive, ArchiveRestore, LayoutGrid, Calendar } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import type { CrmBoard } from '@/shared/types';

export interface BoardListCardProps {
  board: CrmBoard;
  onArchive: (board: CrmBoard) => void;
  onUnarchive: (board: CrmBoard) => void;
  onClick: (board: CrmBoard) => void;
  canManage: boolean;
}

export const BoardListCard = memo(function BoardListCard({
  board,
  onArchive,
  onUnarchive,
  onClick,
  canManage,
}: BoardListCardProps) {
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
      aria-label={board.is_archived ? `Архивная доска ${board.name}` : `Открыть доску ${board.name}`}
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
      {board.is_archived && (
        <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-md bg-amber-900/40 border border-amber-800/60 px-2 py-0.5 text-xs font-medium text-amber-400">
          <Archive size={10} />
          Архив
        </span>
      )}

      <div className={cn('flex items-start gap-3 mb-3', board.is_archived && 'mt-5')}>
        <div className="mt-0.5 rounded-lg bg-blue-600/20 p-2 shrink-0">
          <LayoutGrid size={18} className="text-blue-400" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-white text-sm leading-tight truncate">{board.name}</h3>
          {board.description && <p className="mt-1 text-xs text-gray-400 line-clamp-2">{board.description}</p>}
        </div>
      </div>

      <div className="mt-auto flex items-center gap-1.5 text-xs text-gray-500">
        <Calendar size={12} />
        <span>{formattedDate}</span>
      </div>

      {canManage &&
        (board.is_archived ? (
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
        ))}
    </div>
  );
});
