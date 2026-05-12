import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Archive, Clock, ChevronDown, ChevronRight } from 'lucide-react';
import { API } from '@/shared/api/endpoints';
import { apiClient } from '@/shared/api/client';
import { cn } from '@/shared/lib/cn';
import type { CrmTaskHistory } from '@/shared/types';

// ─── History Section ──────────────────────────────────────────────────────────

// Labels for non-field actions (action is not "updated")
const ACTION_LABELS: Record<string, string> = {
  created: 'создал(а) задачу',
  archived: 'архивировал(а) задачу',
  unarchived: 'восстановил(а) задачу из архива',
  moved: 'переместил(а) задачу',
  label_added: 'добавил(а) метку',
  label_removed: 'удалил(а) метку',
};

// Labels for action="updated" — keyed by field_name
const FIELD_LABELS: Record<string, string> = {
  title: 'изменил(а) название',
  description: 'обновил(а) описание задачи',
  priority: 'изменил(а) приоритет',
  deadline: 'изменил(а) дедлайн',
  assignee: 'изменил(а) исполнителя',
  column: 'переместил(а) задачу',
  column_id: 'переместил(а) задачу',
};

const HISTORY_PRIORITY_BADGE: Record<string, string> = {
  low: 'bg-gray-700 text-gray-300 border-gray-600',
  medium: 'bg-amber-900/60 text-amber-300 border-amber-700',
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
  const cls = HISTORY_PRIORITY_BADGE[value] ?? 'bg-gray-700 text-gray-300 border-gray-600';
  return (
    <span className={cn('inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium', cls)}>
      {label}
    </span>
  );
}

function HistoryValueChange({ entry }: { entry: CrmTaskHistory }) {
  const { action, field_name, old_value, new_value } = entry;

  // Determine effective field: new API uses field_name, old API encoded it in action
  const field = field_name ?? action.replace('updated_', '');

  if (field === 'description') {
    return null;
  }

  if (action === 'archived' || action === 'unarchived') {
    return null;
  }

  if (field === 'priority') {
    return (
      <div className="flex items-center gap-1.5 mt-1">
        {old_value && old_value !== 'null' && <PriorityBadge value={old_value} />}
        {old_value && old_value !== 'null' && new_value && new_value !== 'null' && (
          <span className="text-gray-600 text-xs">→</span>
        )}
        {new_value && new_value !== 'null' && <PriorityBadge value={new_value} />}
      </div>
    );
  }

  if (field === 'deadline') {
    const oldLabel = formatHistoryDeadline(old_value);
    const newLabel = formatHistoryDeadline(new_value);
    return (
      <p className="text-xs text-gray-500 mt-1">
        <span className={cn(old_value && old_value !== 'null' ? 'line-through text-gray-600' : 'text-gray-600')}>
          {oldLabel}
        </span>
        <span className="text-gray-600 mx-1.5">→</span>
        <span className="text-gray-300">{newLabel}</span>
      </p>
    );
  }

  if (field === 'assignee') {
    const oldName = !old_value || old_value === 'null' ? 'не назначен' : old_value;
    const newName = !new_value || new_value === 'null' ? 'не назначен' : new_value;
    return (
      <p className="text-xs text-gray-500 mt-1">
        <span className="text-gray-600">{oldName}</span>
        <span className="text-gray-600 mx-1.5">→</span>
        <span className="text-gray-300">{newName}</span>
      </p>
    );
  }

  if (field === 'title') {
    const oldTitle = old_value ? truncate(old_value, 40) : null;
    const newTitle = new_value ? truncate(new_value, 40) : null;
    return (
      <p className="text-xs text-gray-500 mt-1 italic">
        {oldTitle && <span className="text-gray-600">«{oldTitle}»</span>}
        {oldTitle && newTitle && <span className="text-gray-600 mx-1.5">→</span>}
        {newTitle && <span className="text-gray-300">«{newTitle}»</span>}
      </p>
    );
  }

  if (field === 'column' || field === 'column_id') {
    const oldCol = old_value && old_value !== 'null' ? old_value : null;
    const newCol = new_value && new_value !== 'null' ? new_value : null;
    return (
      <p className="text-xs text-gray-500 mt-1">
        {oldCol && (
          <>
            <span>из </span>
            <span className="font-semibold text-gray-300">"{oldCol}"</span>
          </>
        )}
        {newCol && (
          <>
            <span className="mx-1.5">→</span>
            <span>в </span>
            <span className="font-semibold text-gray-300">"{newCol}"</span>
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
        <span className="inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium bg-indigo-900/60 text-indigo-300 border-indigo-700">
          {rawValue}
        </span>
      </div>
    );
  }

  if (action === 'moved') {
    if (!new_value || new_value === 'null') return null;
    return (
      <p className="text-xs text-gray-500 mt-1">
        <span className="text-gray-400">{new_value}</span>
      </p>
    );
  }

  // Generic fallback
  if (old_value && new_value) {
    return (
      <p className="text-xs text-gray-500 mt-1">
        <span className="text-gray-600">«{old_value}»</span>
        <span className="text-gray-600 mx-1.5">→</span>
        <span className="text-gray-300">«{new_value}»</span>
      </p>
    );
  }
  if (!old_value && new_value) {
    return <p className="text-xs text-gray-500 mt-1">«{new_value}»</p>;
  }
  return null;
}

interface HistorySectionProps {
  taskId: number;
}

export function HistorySection({ taskId }: HistorySectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [allEntries, setAllEntries] = useState<CrmTaskHistory[]>([]);
  const [hasMore, setHasMore] = useState(false);

  const { isLoading, isError, isFetching } = useQuery({
    queryKey: ['crm', 'task', taskId, 'history', page],
    queryFn: async () => {
      const { data } = await apiClient.get<
        | CrmTaskHistory[]
        | { count: number; next: string | null; previous: string | null; results: CrmTaskHistory[] }
      >(API.crm.taskHistory(taskId), { params: { page } });

      const results = Array.isArray(data) ? data : data.results;
      const next = Array.isArray(data) ? null : data.next;

      if (page === 1) {
        setAllEntries(results);
      } else {
        setAllEntries((prev) => [...prev, ...results]);
      }
      setHasMore(Boolean(next));
      return results;
    },
    enabled: isOpen,
  });

  const handleToggle = () => {
    setIsOpen((prev) => {
      if (prev) {
        setPage(1);
        setAllEntries([]);
        setHasMore(false);
      }
      return !prev;
    });
  };

  return (
    <div className="space-y-3 pt-2 border-t border-gray-800">
      {/* Collapsible header */}
      <button
        type="button"
        onClick={handleToggle}
        className={cn(
          'flex items-center gap-2 w-full text-left',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded',
        )}
        aria-expanded={isOpen}
      >
        <Clock size={14} className="text-gray-500 shrink-0" />
        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide flex-1">
          История изменений
        </h3>
        {isOpen ? (
          <ChevronDown size={14} className="text-gray-500 shrink-0" />
        ) : (
          <ChevronRight size={14} className="text-gray-500 shrink-0" />
        )}
      </button>

      {isOpen && (
        <div>
          {/* Loading skeleton */}
          {isLoading && (
            <div className="space-y-4 animate-pulse pl-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-gray-700 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-48 rounded bg-gray-700" />
                    <div className="h-3 w-32 rounded bg-gray-700" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {isError && (
            <p className="text-xs text-red-400 pl-3">Не удалось загрузить историю изменений.</p>
          )}

          {!isLoading && !isError && allEntries.length === 0 && (
            <p className="text-xs text-gray-600 pl-3">История изменений пуста.</p>
          )}

          {!isLoading && !isError && allEntries.length > 0 && (
            <ol className="relative border-l border-gray-700 ml-3 space-y-4">
              {allEntries.map((entry) => {
                const actionLabel =
                  entry.action === 'updated' && entry.field_name
                    ? (FIELD_LABELS[entry.field_name] ?? `изменил(а) ${entry.field_name}`)
                    : (ACTION_LABELS[entry.action] ?? entry.action);
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
                          <p className="text-xs text-gray-300 leading-snug">
                            <span className="font-medium text-gray-200">{entry.user.full_name}</span>
                            {' '}
                            <span className="text-gray-400">{actionLabel}</span>
                            {(entry.action === 'archived' || entry.action === 'unarchived') && (
                              <Archive size={11} className="inline ml-1 text-gray-500 align-middle" aria-hidden="true" />
                            )}
                          </p>
                          <span className="text-xs text-gray-600 shrink-0 whitespace-nowrap">
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

          {hasMore && (
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={isFetching}
              className="mt-3 ml-3 text-xs text-gray-400 hover:text-gray-200 transition-colors disabled:opacity-50"
            >
              {isFetching ? 'Загрузка...' : 'Загрузить ещё'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
