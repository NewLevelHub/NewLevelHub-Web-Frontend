import { memo, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import {
  MoreHorizontal,
  Pencil,
  Archive,
  Calendar,
  MessageSquare,
  Paperclip,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import type { CrmTask } from '@/shared/types';
import { CRM_PRIORITY_BADGE_CLASS, CRM_PRIORITY_LABELS, formatDeadline, isOverdue } from '@/pages/crm/utils/crm-display';
import { CrmAssigneeAvatar } from '@/pages/crm/components/CrmAssigneeAvatar';

export interface CrmTaskCardProps {
  task: CrmTask;
  onClick: () => void;
  onArchive?: () => void;
}

export const CrmTaskCard = memo(function CrmTaskCard({ task, onClick, onArchive }: CrmTaskCardProps) {
  const overdue = task.deadline ? isOverdue(task.deadline) : false;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  return (
    <div
      aria-label={`Задача: ${task.title}`}
      className={cn(
        'group relative rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5',
        'hover:border-gray-600 hover:bg-gray-750 transition-colors',
        'space-y-2',
      )}
    >
      <div ref={menuRef} className="absolute top-2 right-2 z-10">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((v) => !v);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className={cn(
            'p-1 rounded transition-opacity',
            menuOpen ? 'opacity-100 text-gray-200 bg-gray-700' : 'opacity-0 group-hover:opacity-100 text-gray-500 hover:text-gray-200 hover:bg-gray-700',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:opacity-100',
          )}
          aria-label={`Действия для задачи: ${task.title}`}
          aria-haspopup="true"
          aria-expanded={menuOpen}
        >
          <MoreHorizontal size={14} />
        </button>

        {menuOpen && (
          <div
            className="absolute right-0 top-full mt-1 w-44 rounded-lg border border-gray-700 bg-gray-900 shadow-xl py-1"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <Link
              to={`/crm/tasks/${task.id}`}
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
              }}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            >
              <ExternalLink size={13} />
              Открыть задачу
            </Link>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
                onClick();
              }}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            >
              <Pencil size={13} />
              Редактировать
            </button>
            {onArchive && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  onArchive();
                }}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-red-400 hover:bg-gray-800 hover:text-red-300 transition-colors"
                title="Архивировать"
              >
                <Archive size={13} />
                Архивировать
              </button>
            )}
          </div>
        )}
      </div>

      {task.labels && task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 pr-6">
          {task.labels.map((label) => (
            <span
              key={label.id}
              title={label.name}
              className="h-1.5 w-8 rounded-full shrink-0"
              style={{ backgroundColor: label.color }}
              aria-label={label.name}
            />
          ))}
        </div>
      )}

      <p className="text-sm text-white leading-snug line-clamp-2 pr-6">{task.title}</p>

      <span
        className={cn(
          'inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium',
          CRM_PRIORITY_BADGE_CLASS[task.priority],
        )}
      >
        {CRM_PRIORITY_LABELS[task.priority]}
      </span>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {task.deadline && (
            <span
              className={cn(
                'flex items-center gap-1 text-xs',
                overdue ? 'text-red-400' : 'text-gray-400',
              )}
              title={overdue ? 'Просрочено' : undefined}
            >
              <Calendar size={11} className="shrink-0" />
              {formatDeadline(task.deadline)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {task.comments_count > 0 && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <MessageSquare size={11} />
              {task.comments_count}
            </span>
          )}
          {task.attachments_count > 0 && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Paperclip size={11} />
              {task.attachments_count}
            </span>
          )}
          {task.assignee && <CrmAssigneeAvatar assignee={task.assignee} size="sm" />}
        </div>
      </div>
    </div>
  );
});
