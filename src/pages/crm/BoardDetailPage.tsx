import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { AlertCircle, ChevronLeft } from 'lucide-react';
import { useBoardDetail } from '@/pages/crm/hooks/useBoardDetail';
import { BoardDetailSkeleton } from '@/pages/crm/components/BoardDetailSkeleton';
import { BoardDetailMain } from '@/pages/crm/components/BoardDetailMain';

export default function BoardDetailPage() {
  const { t } = useTranslation();
  const ctx = useBoardDetail();

  if (ctx.isLoading) {
    return <BoardDetailSkeleton />;
  }

  if (ctx.isError || !ctx.board) {
    return (
      <div className="space-y-4">
        <Link
          to="/crm"
          className="inline-flex items-center gap-1.5 text-sm text-secondary hover:text-primary transition-colors"
        >
          <ChevronLeft size={16} />{t('common.backToBoards')}</Link>
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <AlertCircle size={40} className="text-red-400" />
          <p className="text-secondary">Не удалось загрузить доску. Попробуйте обновить страницу.</p>
          {ctx.isError && (
            <p className="text-xs text-muted mt-1">{(ctx.boardError as { message?: string })?.message}</p>
          )}
        </div>
      </div>
    );
  }

  return <BoardDetailMain ctx={ctx} />;
}
