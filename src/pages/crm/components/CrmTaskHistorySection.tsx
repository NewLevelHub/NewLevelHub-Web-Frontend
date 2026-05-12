import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Archive, Clock, ChevronDown, ChevronRight } from 'lucide-react';
import { API } from '@/shared/api/endpoints';
import { apiClient } from '@/shared/api/client';
import { cn } from '@/shared/lib/cn';
import type { CrmTaskHistory } from '@/shared/types';

// ─── History Section ──────────────────────────────────────────────────────────

const ACTION_LABELS: Record<string, string> = {
  updated_title: 'изменил(а) название',
  updated_description: 'обновил(а) описание задачи',
  updated_priority: 'изменил(а) приоритет',
  updated_deadline: 'изменил(а) дедлайн',
  updated_assignee: 'изменил(а) исполнителя',
  updated_column: 'переместил(а) задачу',
  label_added: 'добавил(а) метку',
  label_removed: 'удалил(а) метку',
  archived: 'архивировал(а) задачу',
  unarchived: 'восстановил(а) задачу из архива',
  moved: 'переместил(а) задачу',
};

const HISTORY_PRIORITY_BADGE: Record<string, string> = {
  low: 'bg-hover text-secondary border-default',
  medium: 'bg-warning-subtle text-warning border-amber-700',
  high: 'bg-orange-900/60 text-orange-300 border-orange-700',
};

const HISTORY_PRIORITY_LABELS: Record<string, string> = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
};

function formatHistoryDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatHistoryDeadline(value: string | null): string {
  if (!value || value === 'null') return 'не задан';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + '…' : text;
}

function PriorityBadge({ value }: { value: string }) {
  const label = HISTORY_PRIORITY_LABELS[value] ?? value;
  const cls = HISTORY_PRIORITY_BADGE[value] ?? 'bg-hover text-secondary border-default';
  return (
    <span className={cn('inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium', cls)}>
      {label}
    </span>
  );
}

function HistoryValueChange({ entry }: { entry: CrmTaskHistory }) {
  const { action, old_value, new_value } = entry;

  if (action === 'updated_description') {
    return null;
  }

  if (action === 'archived' || action === 'unarchived') {
    return null;
  }

  if (action === 'updated_priority') {
    return (
      <div className="flex items-center gap-1.5 mt-1">
        {old_value && old_value !== 'null' && <PriorityBadge value={old_value} />}
        {old_value && old_value !== 'null' && new_value && new_value !== 'null' && (
          <span className="text-muted text-xs">→</span>
        )}
        {new_value && new_value !== 'null' && <PriorityBadge value={new_value} />}
      </div>
    );
  }

  if (action === 'updated_deadline') {
    const oldLabel = formatHistoryDeadline(old_value);
    const newLabel = formatHistoryDeadline(new_value);
    return (
      <p className="text-xs text-muted mt-1">
        <span className={cn(old_value && old_value !== 'null' ? 'line-through text-muted' : 'text-muted')}>
          {oldLabel}
        </span>
        <span className="text-muted mx-1.5">→</span>
        <span className="text-secondary">{newLabel}</span>
      </p>
    );
  }

  if (action === 'updated_assignee') {
    const oldName = !old_value || old_value === 'null' ? 'не назначен' : old_value;
    const newName = !new_value || new_value === 'null' ? 'не назначен' : new_value;
    return (
      <p className="text-xs text-muted mt-1">
        <span className="text-muted">{oldName}</span>
        <span className="text-muted mx-1.5">→</span>
        <span className="text-secondary">{newName}</span>
      </p>
    );
  }

  if (action === 'updated_title') {
    const oldTitle = old_value ? truncate(old_value, 40) : null;
    const newTitle = new_value ? truncate(new_value, 40) : null;
    return (
      <p className="text-xs text-muted mt-1 italic">
        {oldTitle && <span className="text-muted">«{oldTitle}»</span>}
        {oldTitle && newTitle && <span className="text-muted mx-1.5">→</span>}
        {newTitle && <span className="text-secondary">«{newTitle}»</span>}
      </p>
    );
  }

  if (action === 'updated_column') {
    const oldCol = old_value && old_value !== 'null' ? old_value : null;
    const newCol = new_value && new_value !== 'null' ? new_value : null;
    return (
      <p className="text-xs text-muted mt-1">
        {oldCol && (
          <>
            <span>из </span>
            <span className="font-semibold text-secondary">"{oldCol}"</span>
          </>
        )}
        {newCol && (
          <>
            <span className="mx-1.5">→</span>
            <span>в </span>
            <span className="font-semibold text-secondary">"{newCol}"</span>
          </>
        )}
      </p>
    );
  }

  if (action === 'label_added' || action === 'label_removed') {
    const rawValue = new_value ?? old_value;
    if (!rawValue || rawValue === 'null') return null;

    let parsedLabel: { name: string; color: string } | null = null;
    try {
      const parsed = JSON.parse(rawValue);
      if (parsed && typeof parsed.name === 'string' && typeof parsed.color === 'string') {
        parsedLabel = parsed as { name: string; color: string };
      }
    } catch {
      // old format — plain string, fall through to legacy render
    }

    if (parsedLabel) {
      const hex = parsedLabel.color ?? '#6b7280';
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return (
        <div className="mt-1">
          <span
            className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium"
            style={{
              backgroundColor: `rgba(${r},${g},${b},0.12)`,
              borderColor: hex,
              color: hex,
            }}
          >
            {parsedLabel.name}
          </span>
        </div>
      );
    }

    return (
      <div className="mt-1">
        <span className="inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium bg-brand-subtle text-brand border-default">
          {rawValue}
        </span>
      </div>
    );
  }

  if (action === 'moved') {
    if (!new_value || new_value === 'null') return null;
    return (
      <p className="text-xs text-muted mt-1">
        <span className="text-secondary">{new_value}</span>
      </p>
    );
  }

  // Generic fallback
  if (old_value && new_value) {
    return (
      <p className="text-xs text-muted mt-1">
        <span className="text-muted">«{old_value}»</span>
        <span className="text-muted mx-1.5">→</span>
        <span className="text-secondary">«{new_value}»</span>
      </p>
    );
  }
  if (!old_value && new_value) {
    return <p className="text-xs text-muted mt-1">«{new_value}»</p>;
  }
  return null;
}

interface HistorySectionProps {
  taskId: number;
}

export function HistorySection({ taskId }: HistorySectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  const { data: history, isLoading, isError } = useQuery({
    queryKey: ['crm', 'task', taskId, 'history'],
    queryFn: async () => {
      const { data } = await apiClient.get<CrmTaskHistory[] | { results: CrmTaskHistory[] }>(
        API.crm.taskHistory(taskId),
      );
      return Array.isArray(data) ? data : data.results;
    },
    enabled: isOpen,
  });

  return (
    <div className="space-y-3 pt-2 border-t border-default">
      {/* Collapsible header */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          'flex items-center gap-2 w-full text-left',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded',
        )}
        aria-expanded={isOpen}
      >
        <Clock size={14} className="text-muted shrink-0" />
        <h3 className="text-xs font-medium text-muted uppercase tracking-wide flex-1">
          История изменений
        </h3>
        {isOpen ? (
          <ChevronDown size={14} className="text-muted shrink-0" />
        ) : (
          <ChevronRight size={14} className="text-muted shrink-0" />
        )}
      </button>

      {isOpen && (
        <div>
          {/* Loading skeleton */}
          {isLoading && (
            <div className="space-y-4 animate-pulse pl-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-hover shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-48 rounded bg-hover" />
                    <div className="h-3 w-32 rounded bg-hover" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {isError && (
            <p className="text-xs text-red-400 pl-3">Не удалось загрузить историю изменений.</p>
          )}

          {!isLoading && !isError && history && history.length === 0 && (
            <p className="text-xs text-muted pl-3">История изменений пуста.</p>
          )}

          {!isLoading && !isError && history && history.length > 0 && (
            <ol className="relative border-l border-default ml-3 space-y-4">
              {history.map((entry) => {
                const actionLabel = ACTION_LABELS[entry.action] ?? entry.action;
                const initials = entry.user.full_name
                  .split(' ')
                  .slice(0, 2)
                  .map((w) => w[0] ?? '')
                  .join('')
                  .toUpperCase();

                return (
                  <li key={entry.id} className="pl-4 relative">
                    {/* Timeline dot */}
                    <span
                      className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-gray-600 border border-gray-500 shrink-0"
                      aria-hidden="true"
                    />

                    <div className="flex items-start gap-2">
                      {/* User avatar */}
                      {entry.user.avatar ? (
                        <img
                          src={entry.user.avatar}
                          alt={entry.user.full_name}
                          className="w-6 h-6 rounded-full object-cover shrink-0 mt-0.5"
                        />
                      ) : (
                        <span
                          className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-medium flex items-center justify-center shrink-0 mt-0.5"
                          aria-label={entry.user.full_name}
                        >
                          {initials}
                        </span>
                      )}

                      <div className="min-w-0 flex-1">
                        {/* Action line */}
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-xs text-secondary leading-snug">
                            <span className="font-medium text-secondary">{entry.user.full_name}</span>
                            {' '}
                            <span className="text-secondary">{actionLabel}</span>
                            {(entry.action === 'archived' || entry.action === 'unarchived') && (
                              <Archive size={11} className="inline ml-1 text-muted align-middle" aria-hidden="true" />
                            )}
                          </p>
                          <span className="text-xs text-muted shrink-0 whitespace-nowrap">
                            {formatHistoryDate(entry.created_at)}
                          </span>
                        </div>

                        {/* Value visualisation */}
                        <HistoryValueChange entry={entry} />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}
