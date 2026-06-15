import type { CSSProperties } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/shared/lib/cn';
import type { CrmTask } from '@/shared/types';
import { CrmTaskCard } from '@/pages/crm/components/CrmTaskCard';

export interface CrmSortableTaskCardProps {
  task: CrmTask;
  onTaskClick: (taskId: number) => void;
  onArchive?: (taskId: number) => void;
}

export function CrmSortableTaskCard({ task, onTaskClick, onArchive }: CrmSortableTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `task-${task.id}`,
    data: { type: 'task', task },
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    touchAction: 'none',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      data-task-id={task.id}
      className={cn(
        isDragging && 'opacity-40',
        'cursor-grab active:cursor-grabbing',
      )}
    >
      <CrmTaskCard
        task={task}
        onClick={() => onTaskClick(task.id)}
        onArchive={onArchive ? () => onArchive(task.id) : undefined}
      />
    </div>
  );
}
