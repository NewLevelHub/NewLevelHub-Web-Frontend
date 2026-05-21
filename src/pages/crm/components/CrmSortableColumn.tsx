import type { CSSProperties } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/shared/lib/cn';
import type { CrmColumn, CrmTask } from '@/shared/types';
import { CrmKanbanColumn } from '@/pages/crm/components/CrmKanbanColumn';

export interface CrmSortableColumnProps {
  column: CrmColumn;
  allColumns: CrmColumn[];
  boardId: string;
  boardCompanyId: number;
  tasks: CrmTask[];
  taskCountByColumnId: Record<number, number>;
  onTaskClick: (taskId: number) => void;
}

export function CrmSortableColumn({
  column,
  allColumns,
  boardId,
  boardCompanyId,
  tasks,
  taskCountByColumnId,
  onTaskClick,
}: CrmSortableColumnProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: column.id,
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && 'opacity-40')}>
      <CrmKanbanColumn
        column={column}
        allColumns={allColumns}
        boardId={boardId}
        boardCompanyId={boardCompanyId}
        tasks={tasks}
        taskCountByColumnId={taskCountByColumnId}
        onTaskClick={onTaskClick}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}
