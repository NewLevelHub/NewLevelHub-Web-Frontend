import { memo, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import {
  MoreHorizontal,
  Pencil,
  Archive,
  MessageSquare,
  Paperclip,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import type { CrmTask } from '@/shared/types';
import { formatDeadline, isOverdue } from '@/pages/crm/utils/crm-display';
import { CrmAssigneeAvatar } from '@/pages/crm/components/CrmAssigneeAvatar';

export interface CrmTaskCardProps {
  task: CrmTask;
  onClick: () => void;
  onArchive?: () => void;
}

export const CrmTaskCard = memo(function CrmTaskCard({ task, onClick, onArchive }: CrmTaskCardProps) {
  const { t } = useTranslation();
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
      aria-label={`${t('crm.taskRowAria', { title: task.title })}`}
      className={cn(
        'group relative rounded-lg bg-surface flex flex-col gap-1.5 px-3 pt-2.5 pb-3',
        'cursor-pointer ring-1 ring-[var(--border-faint)] hover:ring-[var(--border-strong)] hover:shadow-md transition-all',
      )}
    >
      {/* Priority stripe */}
      <div
        className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-sm"
        style={{
          backgroundColor:
            task.priority === 'critical' ? 'var(--danger)' :
            task.priority === 'high'     ? 'var(--warning)' :
            task.priority === 'medium'   ? '#d4b300' :
            'var(--text-subtle)',
        }}
      />

      {/* Menu button */}
      <div ref={menuRef} className="absolute top-2 right-2 z-20">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((v) => !v);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className={cn(
            'p-1 rounded transition-opacity',
            menuOpen ? 'opacity-100 text-secondary bg-hover' : 'opacity-0 group-hover:opacity-100 text-muted hover:text-secondary hover:bg-hover',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:opacity-100',
          )}
          aria-label={t('crm.taskRowAria', { title: task.title })}
          aria-haspopup="true"
          aria-expanded={menuOpen}
        >
          <MoreHorizontal size={14} />
        </button>

        {menuOpen && (
          <div
            className="absolute right-0 top-full mt-1 w-44 rounded-lg border border-default bg-surface shadow-xl py-1 z-50"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <Link
              to={`/crm/tasks/${task.id}`}
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
              }}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-secondary hover:bg-hover hover:text-primary transition-colors"
            >
              <ExternalLink size={13} />{t('common.openTask')}</Link>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
                onClick();
              }}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-secondary hover:bg-hover hover:text-primary transition-colors"
            >
              <Pencil size={13} />{t('common.edit')}</button>
            {onArchive && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  onArchive();
                }}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-red-400 hover:bg-hover hover:text-danger transition-colors"
                title={t('common.archive')}
              >
                <Archive size={13} />{t('common.archive')}</button>
            )}
          </div>
        )}
      </div>

      {/* Labels */}
      {task.labels && task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 pl-2">
          {task.labels.map((label) => {
            const r = parseInt(label.color.slice(1, 3), 16);
            const g = parseInt(label.color.slice(3, 5), 16);
            const b = parseInt(label.color.slice(5, 7), 16);
            return (
              <span
                key={label.id}
                className="inline-flex items-center rounded-sm px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide"
                style={{
                  backgroundColor: `rgba(${r},${g},${b},0.15)`,
                  color: label.color,
                }}
              >
                {label.name}
              </span>
            );
          })}
        </div>
      )}

      {/* Title */}
      <p className="text-[13px] font-medium text-primary leading-snug line-clamp-2 pl-2 pr-6">{task.title}</p>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 pl-2 mt-1">
        <div className="flex items-center gap-2.5">
          {task.comments_count > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-muted">
              <MessageSquare size={11} />{task.comments_count}
            </span>
          )}
          {task.attachments_count > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-muted">
              <Paperclip size={11} />{task.attachments_count}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {task.deadline && (
            <span className={cn('text-[11px] font-mono', overdue ? 'text-danger font-semibold' : 'text-secondary')}>
              {formatDeadline(task.deadline)}
            </span>
          )}
          {task.assignee && <CrmAssigneeAvatar assignee={task.assignee} size="sm" />}
        </div>
      </div>
    </div>
  );
});
