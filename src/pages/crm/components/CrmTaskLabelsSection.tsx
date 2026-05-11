import { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Search, Check, Settings } from 'lucide-react';
import { API } from '@/shared/api/endpoints';
import { apiClient } from '@/shared/api/client';
import { cn } from '@/shared/lib/cn';
import { USER_ROLES } from '@/shared/config/constants';
import { useAuth } from '@/shared/hooks/useAuth';
import type { CrmLabel, CrmTask } from '@/shared/types';
import { CrmLabelsManagerModal } from '@/pages/crm/components/CrmLabelsManagerModal';

// ─── Task Labels Section ───────────────────────────────────────────────────────

interface TaskLabelsSectionProps {
  taskId: number;
  boardId: string;
  taskLabels: CrmLabel[];
}

export function TaskLabelsSection({ taskId, boardId, taskLabels }: TaskLabelsSectionProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [managerOpen, setManagerOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const isAdmin = user?.role === USER_ROLES.COMPANY_ADMIN;

  const { data: allLabels } = useQuery({
    queryKey: ['crm', 'labels'],
    queryFn: () =>
      apiClient.get<CrmLabel[]>(API.crm.labels).then((r) => {
        const data = r.data;
        return Array.isArray(data) ? data : (data as { results: CrmLabel[] }).results;
      }),
  });

  const updateLabelsMutation = useMutation({
    mutationFn: (labelIds: number[]) =>
      apiClient.patch<CrmTask>(API.crm.taskDetail(taskId), { label_ids: labelIds }).then((r) => r.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['crm', 'task', taskId] });
      void queryClient.invalidateQueries({ queryKey: ['crm', 'tasks', boardId] });
    },
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropdownOpen]);

  // Focus search when dropdown opens
  useEffect(() => {
    if (dropdownOpen) searchRef.current?.focus();
  }, [dropdownOpen]);

  const toggleLabel = (labelId: number) => {
    const currentIds = taskLabels.map((l) => l.id);
    const updated = currentIds.includes(labelId)
      ? currentIds.filter((id) => id !== labelId)
      : [...currentIds, labelId];
    updateLabelsMutation.mutate(updated);
  };

  const removeLabel = (labelId: number) => {
    const updated = taskLabels.map((l) => l.id).filter((id) => id !== labelId);
    updateLabelsMutation.mutate(updated);
  };

  const filteredLabels = (allLabels ?? []).filter((l) =>
    l.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-2">
      <span className="block text-xs font-medium text-gray-500 uppercase tracking-wide">Метки</span>

      {/* Current labels */}
      <div className="flex flex-wrap gap-1.5">
        {taskLabels.map((label) => {
          // Parse hex to rgba for transparent background
          const hex = label.color ?? '#6b7280';
          const r = parseInt(hex.slice(1, 3), 16);
          const g = parseInt(hex.slice(3, 5), 16);
          const b = parseInt(hex.slice(5, 7), 16);
          return (
            <span
              key={label.id}
              className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium"
              style={{
                backgroundColor: `rgba(${r},${g},${b},0.12)`,
                borderColor: hex,
                color: hex,
              }}
            >
              {label.name}
              <button
                type="button"
                onClick={() => removeLabel(label.id)}
                disabled={updateLabelsMutation.isPending}
                className="rounded-full hover:opacity-70 transition-opacity disabled:opacity-40"
                aria-label={`Снять метку ${label.name}`}
              >
                <X size={10} />
              </button>
            </span>
          );
        })}

        {/* Add label button */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((v) => !v)}
            className={cn(
              'inline-flex items-center gap-1 rounded-full border border-dashed border-gray-600',
              'px-2.5 py-0.5 text-xs text-gray-500 hover:text-gray-300 hover:border-gray-400 transition-colors',
            )}
            aria-haspopup="listbox"
            aria-expanded={dropdownOpen}
          >
            <Plus size={11} />
            Добавить метку
          </button>

          {dropdownOpen && (
            <div
              className={cn(
                'absolute left-0 top-full mt-1 z-10',
                'w-56 rounded-lg border border-gray-700 bg-gray-900 shadow-xl',
              )}
              role="listbox"
              aria-label="Выбор меток"
            >
              {/* Search */}
              <div className="p-2 border-b border-gray-800">
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                  <input
                    ref={searchRef}
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Найти метку..."
                    className={cn(
                      'w-full rounded-md border bg-gray-800 pl-7 pr-2 py-1.5 text-xs text-white placeholder-gray-500',
                      'focus:outline-none focus:ring-1 focus:ring-blue-500 border-gray-700',
                    )}
                    aria-label="Поиск меток"
                  />
                </div>
              </div>

              {/* Label list */}
              <ul className="max-h-48 overflow-y-auto py-1">
                {filteredLabels.length === 0 && (
                  <li className="px-3 py-2 text-xs text-gray-500">Метки не найдены</li>
                )}
                {filteredLabels.map((label) => {
                  const checked = taskLabels.some((l) => l.id === label.id);
                  return (
                    <li key={label.id}>
                      <button
                        type="button"
                        onClick={() => toggleLabel(label.id)}
                        role="option"
                        aria-selected={checked}
                        className={cn(
                          'flex items-center gap-2.5 w-full px-3 py-1.5 text-xs text-left',
                          'hover:bg-gray-800 transition-colors',
                        )}
                      >
                        <span
                          className="w-3 h-3 rounded-sm border shrink-0 flex items-center justify-center"
                          style={{
                            backgroundColor: checked ? label.color : 'transparent',
                            borderColor: label.color,
                          }}
                        >
                          {checked && <Check size={8} className="text-white" />}
                        </span>
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: label.color }}
                          aria-hidden="true"
                        />
                        <span className="flex-1 text-gray-200 truncate">{label.name}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              {/* Manage labels (company_admin only) */}
              {isAdmin && (
                <div className="border-t border-gray-800 p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false);
                      setManagerOpen(true);
                    }}
                    className={cn(
                      'flex items-center gap-2 w-full rounded-md px-3 py-1.5 text-xs',
                      'text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors',
                    )}
                  >
                    <Settings size={12} />
                    Управление метками
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {updateLabelsMutation.isError && (
        <p className="text-xs text-red-400">Не удалось обновить метки.</p>
      )}

      {/* Labels manager modal */}
      {managerOpen && <CrmLabelsManagerModal onClose={() => setManagerOpen(false)} />}
    </div>
  );
}
