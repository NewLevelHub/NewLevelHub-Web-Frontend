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
      <div className="group flex flex-col rounded-xl border border-default bg-surface w-72 shrink-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-default">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="text-sm font-semibold text-primary truncate">{column.name}</h3>
            {tasks.length > 0 && (
              <span className="shrink-0 inline-flex items-center rounded-md bg-raised border border-default px-1.5 py-0.5 text-xs text-secondary">
                {tasks.length}
              </span>
            )}
            {column.wip_limit !== null && (
              <span
                className={cn(
                  'shrink-0 inline-flex items-center rounded-md border px-1.5 py-0.5 text-xs',
                  tasks.length >= column.wip_limit
                    ? 'bg-danger-subtle border-red-700 text-red-400'
                    : 'bg-raised border-default text-secondary',
                )}
                title={`WIP-лимит: ${column.wip_limit}`}
              >
                /{column.wip_limit}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
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
              aria-label="Перетащить колонку"
            >
              <GripVertical size={14} />
            </button>
          </div>
        </div>

        <SortableContext items={tasks.map((t) => `task-${t.id}`)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col flex-1 px-3 py-3 gap-2 min-h-[200px]" data-column-id={column.id}>
            {tasks.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center">
                <Inbox size={20} className="text-muted" />
                <p className="text-xs text-muted">Нет задач</p>
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
          <div className="px-3 pb-3">
            <button
              type="button"
              onClick={() => setShowAddTask(true)}
              disabled={atWipLimit}
              title={
                atWipLimit
                  ? 'Достигнут WIP-лимит колонки. Освободите место, чтобы добавить задачу.'
                  : undefined
              }
              className={cn(
                'flex w-full items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium',
                'text-muted hover:text-secondary hover:bg-hover transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                atWipLimit && 'opacity-50 cursor-not-allowed hover:bg-transparent hover:text-muted',
              )}
            >
              <Plus size={13} />
              Добавить задачу
            </button>
          </div>
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
