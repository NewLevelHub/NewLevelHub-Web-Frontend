import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { LayoutGrid, Calendar, Building2 } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { fmtDateLong } from '@/shared/lib/formatDate';
import type { CrmBoard } from '@/shared/types';

export interface AdminBoardCardProps {
  board: CrmBoard;
  companyName: string | undefined;
  onClick: (board: CrmBoard) => void;
}

export const AdminBoardCard = memo(function AdminBoardCard({
  board,
  companyName,
  onClick,
}: AdminBoardCardProps) {
  const { t } = useTranslation();
  const formattedDate = fmtDateLong(board.created_at);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={t('crm.openBoardAria', { name: board.name })}
      onClick={() => onClick(board)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(board);
        }
      }}
      className={cn(
        'group relative flex flex-col rounded-xl border border-default bg-surface',
        'p-5 cursor-pointer transition-all duration-200',
        'hover:border-strong hover:bg-hover hover:shadow-lg',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
      )}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="mt-0.5 rounded-lg bg-blue-600/20 p-2 shrink-0">
          <LayoutGrid size={18} className="text-blue-400" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-primary text-sm leading-tight truncate">{board.name}</h3>
          {board.description && (
            <p className="mt-1 text-xs text-secondary line-clamp-2">{board.description}</p>
          )}
        </div>
      </div>

      {companyName && (
        <div className="mb-2 flex items-center gap-1.5">
          <Building2 size={11} className="text-muted shrink-0" />
          <span className="text-xs text-muted truncate">{companyName}</span>
        </div>
      )}

      <div className="mt-auto flex items-center gap-1.5 text-xs text-muted">
        <Calendar size={12} />
        <span>{formattedDate}</span>
      </div>
    </div>
  );
});
