import { cn } from '@/shared/lib/cn';
import type { CrmTask } from '@/shared/types';

export interface CrmAssigneeAvatarProps {
  assignee: NonNullable<CrmTask['assignee']>;
  size?: 'sm' | 'md';
}

export function CrmAssigneeAvatar({ assignee, size = 'sm' }: CrmAssigneeAvatarProps) {
  const initials = `${assignee.first_name[0] ?? ''}${assignee.last_name[0] ?? ''}`.toUpperCase();
  const sizeClass = size === 'sm' ? 'w-6 h-6 text-xs' : 'w-8 h-8 text-sm';

  if (assignee.avatar) {
    return (
      <img
        src={assignee.avatar}
        alt={`${assignee.first_name} ${assignee.last_name}`}
        className={cn('rounded-full object-cover shrink-0', sizeClass)}
      />
    );
  }

  return (
    <span
      className={cn(
        'rounded-full bg-blue-600 text-white font-medium flex items-center justify-center shrink-0',
        sizeClass,
      )}
      aria-label={`${assignee.first_name} ${assignee.last_name}`}
    >
      {initials}
    </span>
  );
}
