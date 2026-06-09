import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { HTMLAttributes } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { GripVertical, Inbox, Plus } from 'lucide-react';
import { API } from '@/shared/api/endpoints';
import { apiClient } from '@/shared/api/client';
import { cn } from '@/shared/lib/cn';
import type { CrmColumn, CrmTask } from '@/shared/types';
import { ColumnHeaderMenu } from '@/pages/crm/components/ColumnHeaderMenu';
import { CreateTaskModal } from '@/pages/crm/components/CreateTaskModal';
import { EditColumnModal } from '@/pages/crm/components/EditColumnModal';
import { DeleteColumnDialog } from '@/pages/crm/components/DeleteColumnDialog';
import { CrmSortableTaskCard } from '@/pages/crm/components/CrmSortableTaskCard';

export interface CrmKanbanColumnProps {
  column: CrmColumn;
  allColumns: CrmColumn[];
  boardId: string;
  boardCompanyId: number;
  tasks: CrmTask[];
  taskCountByColumnId: Record<number, number>;
  onTaskClick: (taskId: number) => void;
  dragHandleProps?: HTMLAttributes<HTMLButtonElement>;
  isDragOverlay?: boolean;
}

export function CrmKanbanColumn({
  column,
  allColumns,
  boardId,
  boardCompanyId,
  tasks,
  taskCountByColumnId,
  onTaskClick,
  dragHandleProps,
  isDragOverlay,
}: CrmKanbanColumnProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);

  const otherColumns = allColumns.filter((c) => c.id !== column.id);
  const atWipLimit = column.wip_limit !== null && tasks.length >= column.wip_limit;

  const archiveTaskMutation = useMutation({
    mutationFn: (taskId: number) => apiClient.post(API.crm.taskArchive(taskId)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['crm', 'tasks', boardId] });
      void queryClient.invalidateQueries({ queryKey: ['crm', 'tasks', boardId, 'archived'] });
      void queryClient.invalidateQueries({ queryKey: ['crm', 'my-tasks'] });
    },
  });

  return (
    <>
      <div
        className="group flex flex-col rounded-xl bg-raised shrink-0 w-[280px]"
        style={{ border: '1px solid var(--border-faint)' }}
      >
        <div className="flex items-center gap-2 px-3.5 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="text-sm font-semibold text-primary truncate">{column.name}</h3>
            {tasks.length > 0 && (
              <span className="shrink-0 inline-flex items-center rounded bg-surface border border-default px-1.5 py-0.5 text-[11px] font-semibold text-muted">
                {tasks.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 ml-auto shrink-0">
            {column.wip_limit !== null && (
              <span
                className={cn(
                  'text-[10px] uppercase tracking-wider font-medium',
                  tasks.length >= column.wip_limit ? 'text-danger font-semibold' : 'text-muted',
                )}
                title={`WIP-лимит: ${column.wip_limit}`}
              >
                WIP {tasks.length}/{column.wip_limit}
              </span>
            )}
            {!isDragOverlay && (
              <ColumnHeaderMenu
                column={column}
                onEdit={() => setShowEdit(true)}
                onDelete={() => setShowDelete(true)}
              />
            )}
            <button
              {...dragHandleProps}
              tabIndex={0}
              className={cn(
                'p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity',
                'text-secondary group-hover:text-muted',
                'cursor-grab active:cursor-grabbing',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:opacity-100',
              )}
              aria-label={t('common.dragColumn')}
            >
              <GripVertical size={14} />
            </button>
          </div>
        </div>

        <SortableContext items={tasks.map((t) => `task-${t.id}`)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col flex-1 px-2.5 py-2 gap-2 min-h-[180px]" data-column-id={column.id}>
            {tasks.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center">
                <Inbox size={20} className="text-muted" />
                <p className="text-xs text-muted">{t('common.noTasks')}</p>
              </div>
            ) : (
              tasks.map((task) => (
                <CrmSortableTaskCard
                  key={task.id}
                  task={task}
                  onTaskClick={onTaskClick}
                  onArchive={archiveTaskMutation.mutate}
                />
              ))
            )}
          </div>
        </SortableContext>

        {!isDragOverlay && (
          <button
            type="button"
            onClick={() => setShowAddTask(true)}
            disabled={atWipLimit}
            title={
              atWipLimit
                ? t('common.wipLimitReached')
                : undefined
            }
            className={cn(
              'mx-2.5 mb-2.5 flex w-[calc(100%-20px)] items-center justify-center gap-1.5 rounded-md border border-dashed px-3 py-2 text-xs font-medium transition-colors',
              atWipLimit
                ? 'opacity-40 cursor-not-allowed border-default text-muted'
                : 'border-strong text-muted hover:text-brand hover:border-brand cursor-pointer',
            )}
          >
            <Plus size={12} /> {t('common.addTask')}
          </button>
        )}
      </div>

      {showAddTask && (
        <CreateTaskModal
          boardId={boardId}
          boardCompanyId={boardCompanyId}
          columnId={column.id}
          wipBlocked={atWipLimit}
          onClose={() => setShowAddTask(false)}
        />
      )}

      {showEdit && (
        <EditColumnModal
          boardId={boardId}
          column={column}
          taskCount={tasks.length}
          onClose={() => setShowEdit(false)}
        />
      )}

      {showDelete && (
        <DeleteColumnDialog
          boardId={boardId}
          column={column}
          otherColumns={otherColumns}
          taskCountByColumnId={taskCountByColumnId}
          onClose={() => setShowDelete(false)}
        />
      )}
    </>
  );
}
