import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, X, AlertCircle } from 'lucide-react';
import { API } from '@/shared/api/endpoints';
import { apiClient } from '@/shared/api/client';
import { cn } from '@/shared/lib/cn';
import { checkWipLimit } from '@/shared/lib/crm-wip-limit';
import type { CrmColumn, CrmTask } from '@/shared/types';
import { CRM_PRIORITY_BADGE_CLASS, CRM_PRIORITY_LABEL_KEYS } from '@/pages/crm/utils/crm-display';

export interface ArchivePanelProps {
  boardId: string;
  columns: CrmColumn[];
  taskCountByColumnId: Record<number, number>;
  onClose: () => void;
  onTaskOpen: (taskId: number) => void;
  onRestoreWipBlocked?: () => void;
}

export function ArchivePanel({
  boardId,
  columns,
  taskCountByColumnId,
  onClose,
  onTaskOpen,
  onRestoreWipBlocked,
}: ArchivePanelProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const columnMap = new Map(columns.map((c) => [c.id, c.name]));

  const { data: archivedTasks = [], isLoading: archiveLoading } = useQuery({
    queryKey: ['crm', 'tasks', boardId, 'archived'],
    queryFn: async () => {
      const { data } = await apiClient.get<CrmTask[] | { results: CrmTask[] }>(API.crm.tasksList, {
        params: { board_id: boardId, is_archived: true },
      });
      const list = Array.isArray(data) ? data : data.results;
      return list.filter((t) => t.is_archived);
    },
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const unarchiveMutation = useMutation({
    mutationFn: (taskId: number) => apiClient.post(API.crm.taskUnarchive(taskId)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['crm', 'tasks', boardId] });
      void queryClient.invalidateQueries({ queryKey: ['crm', 'tasks', boardId, 'archived'] });
      void queryClient.invalidateQueries({ queryKey: ['crm', 'my-tasks'] });
    },
  });

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/50"
      onMouseDown={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label={t('common.taskArchive')}
    >
      <div className="flex flex-col w-full max-w-md bg-surface border-l border-default shadow-2xl h-full overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-default shrink-0">
          <div className="flex items-center gap-2">
            <Archive size={16} className="text-secondary" />
            <h2 className="text-base font-semibold text-primary">{t('common.taskArchive')}</h2>
            {archivedTasks.length > 0 && (
              <span className="inline-flex items-center rounded-md bg-raised border border-default px-1.5 py-0.5 text-xs text-secondary">
                {archivedTasks.length}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-secondary hover:text-primary transition-colors rounded-md p-1 hover:bg-hover"
            aria-label={t('common.closeArchive')}
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {archiveLoading ? (
            <div className="flex items-center justify-center h-full py-16">
              <p className="text-sm text-muted">{t('common.loading')}</p>
            </div>
          ) : archivedTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 py-16 text-center">
              <Archive size={36} className="text-gray-700" />
              <p className="text-sm text-muted">Здесь пока нет архивных задач</p>
            </div>
          ) : (
            <ul className="space-y-2" role="list" aria-label={t('common.archivedTasks')}>
              {archivedTasks.map((task) => {
                const restoreCheck = checkWipLimit({
                  columns,
                  taskCountByColumnId,
                  targetColumnId: task.column_id,
                  tasksToAddCount: 1,
                });
                const restoreBlocked = !restoreCheck.ok;

                return (
                  <li key={task.id} className="rounded-lg border border-default bg-raised px-3 py-3 space-y-2">
                    <div className="space-y-1.5">
                      <p className="text-sm text-primary leading-snug break-words">{task.title}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-muted">{columnMap.get(task.column_id) ?? '—'}</span>
                        <span
                          className={cn(
                            'inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium',
                            CRM_PRIORITY_BADGE_CLASS[task.priority],
                          )}
                        >
                          {t(CRM_PRIORITY_LABEL_KEYS[task.priority])}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          if (restoreBlocked) {
                            onRestoreWipBlocked?.();
                            return;
                          }
                          unarchiveMutation.mutate(task.id);
                        }}
                        disabled={unarchiveMutation.isPending && unarchiveMutation.variables === task.id}
                        aria-disabled={restoreBlocked || undefined}
                        title={
                          restoreBlocked
                            ? 'Нельзя восстановить: превышен WIP-лимит этой колонки. Освободите место.'
                            : undefined
                        }
                        className={cn(
                          'rounded-md border border-default px-2.5 py-1.5 text-xs font-medium transition-colors',
                          'text-secondary hover:text-primary hover:border-gray-400 hover:bg-hover',
                          restoreBlocked &&
                            'opacity-50 cursor-not-allowed hover:bg-transparent hover:text-muted hover:border-strong',
                          'disabled:opacity-50 disabled:cursor-not-allowed',
                        )}
                        aria-label={`Разархивировать задачу: ${task.title}`}
                      >
                        {unarchiveMutation.isPending && unarchiveMutation.variables === task.id
                          ? '...'
                          : t('common.unarchive')}
                      </button>

                      <Link
                        to={`/crm/tasks/${task.id}`}
                        onClick={onClose}
                        className="rounded-md border border-default px-2.5 py-1.5 text-xs font-medium transition-colors text-secondary hover:text-primary hover:border-gray-400 hover:bg-hover"
                      >
                        Открыть страницу
                      </Link>

                      <button
                        type="button"
                        onClick={() => {
                          onTaskOpen(task.id);
                          onClose();
                        }}
                        className="rounded-md border border-default px-2.5 py-1.5 text-xs font-medium transition-colors text-secondary hover:text-primary hover:border-gray-400 hover:bg-hover"
                      >
                        Открыть модалку
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {unarchiveMutation.isError && (
          <div className="px-5 py-3 border-t border-default shrink-0">
            <p className="text-xs text-red-400">Не удалось восстановить задачу. Попробуйте снова.</p>
          </div>
        )}
      </div>
    </div>
  );
}
