import { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ListChecks, Plus, X, Check, Pencil, Trash2, ChevronRight, ChevronDown } from 'lucide-react';
import { API } from '@/shared/api/endpoints';
import { apiClient } from '@/shared/api/client';
import { cn } from '@/shared/lib/cn';
import type { CrmChecklist, CrmChecklistItem } from '@/shared/types';

// ─── Checklist Components ─────────────────────────────────────────────────────

interface ChecklistItemRowProps {
  item: CrmChecklistItem;
  onToggle: (itemId: number, isCompleted: boolean) => void;
  onDelete: (itemId: number) => void;
  onUpdateText: (itemId: number, text: string) => void;
  isPending: boolean;
}

function ChecklistItemRow({ item, onToggle, onDelete, onUpdateText, isPending }: ChecklistItemRowProps) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(item.text);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commitEdit = () => {
    const trimmed = editText.trim();
    if (!trimmed) {
      setEditText(item.text);
    } else if (trimmed !== item.text) {
      onUpdateText(item.id, trimmed);
    }
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') commitEdit();
    if (e.key === 'Escape') {
      setEditText(item.text);
      setEditing(false);
    }
  };

  return (
    <div className="flex items-center gap-2 group/item py-1">
      <input
        type="checkbox"
        checked={item.is_completed}
        onChange={(e) => onToggle(item.id, e.target.checked)}
        disabled={isPending}
        aria-label={`Отметить: ${item.text}`}
        className="w-4 h-4 shrink-0 accent-green-500 cursor-pointer disabled:opacity-50"
      />
      {editing ? (
        <input
          ref={inputRef}
          type="text"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={handleKeyDown}
          className={cn(
            'flex-1 rounded border bg-gray-700 px-2 py-0.5 text-sm text-white',
            'focus:outline-none focus:ring-1 focus:ring-blue-500 border-gray-600',
          )}
          maxLength={500}
        />
      ) : (
        <span
          onDoubleClick={() => setEditing(true)}
          className={cn(
            'flex-1 text-sm cursor-default select-none break-all',
            item.is_completed ? 'line-through text-gray-500' : 'text-gray-200',
          )}
          title="Двойной клик для редактирования"
        >
          {item.text}
        </span>
      )}
      <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity shrink-0">
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="p-0.5 rounded text-gray-500 hover:text-gray-300 hover:bg-gray-700 transition-colors"
            aria-label="Редактировать пункт"
          >
            <Pencil size={11} />
          </button>
        )}
        <button
          type="button"
          onClick={() => onDelete(item.id)}
          disabled={isPending}
          className="p-0.5 rounded text-gray-500 hover:text-red-400 hover:bg-gray-700 transition-colors disabled:opacity-50"
          aria-label="Удалить пункт"
        >
          <X size={11} />
        </button>
      </div>
    </div>
  );
}

interface ChecklistBlockProps {
  checklist: CrmChecklist;
  taskId: number;
  boardId: string;
}

function ChecklistBlock({ checklist, taskId, boardId }: ChecklistBlockProps) {
  const queryClient = useQueryClient();
  const [collapsed, setCollapsed] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(checklist.title);
  const [addingItem, setAddingItem] = useState(false);
  const [newItemText, setNewItemText] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);
  const newItemRef = useRef<HTMLInputElement>(null);

  const { total, completed } = checklist.checklist_progress;
  const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;

  useEffect(() => {
    if (editingTitle) titleInputRef.current?.focus();
  }, [editingTitle]);

  useEffect(() => {
    if (addingItem) newItemRef.current?.focus();
  }, [addingItem]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['crm', 'task', taskId] });
    void queryClient.invalidateQueries({ queryKey: ['crm', 'tasks', boardId] });
  };

  const deleteMutation = useMutation({
    mutationFn: () => apiClient.delete(API.crm.checklistDetail(checklist.id)),
    onSuccess: invalidate,
  });

  const updateTitleMutation = useMutation({
    mutationFn: (title: string) =>
      apiClient.patch(API.crm.checklistDetail(checklist.id), { title }),
    onSuccess: invalidate,
  });

  const createItemMutation = useMutation({
    mutationFn: (text: string) =>
      apiClient.post(API.crm.checklistItems(checklist.id), { text }),
    onSuccess: () => {
      setNewItemText('');
      setAddingItem(false);
      invalidate();
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ itemId, payload }: { itemId: number; payload: Partial<CrmChecklistItem> }) =>
      apiClient.patch(API.crm.checklistItemDetail(itemId), payload),
    onSuccess: invalidate,
  });

  const deleteItemMutation = useMutation({
    mutationFn: (itemId: number) => apiClient.delete(API.crm.checklistItemDetail(itemId)),
    onSuccess: invalidate,
  });

  const commitTitleEdit = () => {
    const trimmed = titleValue.trim();
    if (!trimmed) {
      setTitleValue(checklist.title);
    } else if (trimmed !== checklist.title) {
      updateTitleMutation.mutate(trimmed);
    }
    setEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') commitTitleEdit();
    if (e.key === 'Escape') {
      setTitleValue(checklist.title);
      setEditingTitle(false);
    }
  };

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newItemText.trim();
    if (!trimmed || createItemMutation.isPending) return;
    createItemMutation.mutate(trimmed);
  };

  const handleToggleItem = (itemId: number, isCompleted: boolean) => {
    updateItemMutation.mutate({ itemId, payload: { is_completed: isCompleted } });
  };

  const handleDeleteItem = (itemId: number) => {
    deleteItemMutation.mutate(itemId);
  };

  const handleUpdateItemText = (itemId: number, text: string) => {
    updateItemMutation.mutate({ itemId, payload: { text } });
  };

  const anyItemPending = updateItemMutation.isPending || deleteItemMutation.isPending;

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800/50">
      {/* Checklist header */}
      <div className="flex items-center gap-2 px-3 py-2.5 group/header">
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="flex items-center gap-2 flex-1 min-w-0 text-left focus:outline-none"
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Развернуть чеклист' : 'Свернуть чеклист'}
        >
          {collapsed
            ? <ChevronRight size={14} className="text-gray-500 shrink-0" />
            : <ChevronDown size={14} className="text-gray-500 shrink-0" />
          }
          {editingTitle ? (
            <input
              ref={titleInputRef}
              type="text"
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={commitTitleEdit}
              onKeyDown={handleTitleKeyDown}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                'flex-1 rounded border bg-gray-700 px-2 py-0.5 text-sm font-medium text-white',
                'focus:outline-none focus:ring-1 focus:ring-blue-500 border-gray-600',
              )}
              maxLength={200}
            />
          ) : (
            <span className="text-sm font-medium text-white truncate">{checklist.title}</span>
          )}
        </button>

        <div className="flex items-center gap-1 shrink-0">
          <span className="text-xs text-gray-500 tabular-nums">
            {completed}/{total}
          </span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setEditingTitle(true); }}
            className="p-1 rounded text-gray-600 hover:text-gray-300 hover:bg-gray-700 transition-colors opacity-0 group-hover/header:opacity-100"
            aria-label="Переименовать чеклист"
          >
            <Pencil size={12} />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleDelete(); }}
            disabled={deleteMutation.isPending}
            className="p-1 rounded text-gray-600 hover:text-red-400 hover:bg-gray-700 transition-colors opacity-0 group-hover/header:opacity-100 disabled:opacity-30"
            aria-label="Удалить чеклист"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="px-3 pb-2">
          <div
            className="h-1.5 w-full rounded-full bg-gray-700 overflow-hidden"
            role="progressbar"
            aria-valuenow={progressPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Прогресс: ${completed} из ${total}`}
          >
            <div
              className="h-full rounded-full bg-green-500 transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Items */}
      {!collapsed && (
        <div className="px-3 pb-2 space-y-0">
          {checklist.items
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((item) => (
              <ChecklistItemRow
                key={item.id}
                item={item}
                onToggle={handleToggleItem}
                onDelete={handleDeleteItem}
                onUpdateText={handleUpdateItemText}
                isPending={anyItemPending}
              />
            ))}

          {/* Add item form */}
          {addingItem ? (
            <form onSubmit={handleAddItem} className="flex items-center gap-2 pt-1">
              <input
                ref={newItemRef}
                type="text"
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Escape') { setAddingItem(false); setNewItemText(''); } }}
                placeholder="Новый пункт..."
                maxLength={500}
                className={cn(
                  'flex-1 rounded border bg-gray-700 px-2 py-1 text-sm text-white placeholder-gray-500',
                  'focus:outline-none focus:ring-1 focus:ring-blue-500 border-gray-600',
                )}
              />
              <button
                type="submit"
                disabled={!newItemText.trim() || createItemMutation.isPending}
                className={cn(
                  'shrink-0 rounded px-2.5 py-1 text-xs font-medium transition-colors',
                  'bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed',
                )}
              >
                <Check size={12} />
              </button>
              <button
                type="button"
                onClick={() => { setAddingItem(false); setNewItemText(''); }}
                className="shrink-0 rounded p-1 text-gray-500 hover:text-gray-300 hover:bg-gray-700 transition-colors"
                aria-label="Отмена"
              >
                <X size={12} />
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setAddingItem(true)}
              className="flex items-center gap-1.5 mt-1 text-xs text-gray-500 hover:text-gray-300 transition-colors rounded px-1 py-0.5 hover:bg-gray-700"
            >
              <Plus size={12} />
              Добавить пункт
            </button>
          )}
        </div>
      )}

      {(deleteMutation.isError || updateTitleMutation.isError) && (
        <p className="px-3 pb-2 text-xs text-red-400">Не удалось выполнить операцию.</p>
      )}
    </div>
  );
}

interface ChecklistSectionProps {
  taskId: number;
  boardId: string;
  checklists: CrmChecklist[];
}

export function ChecklistSection({ taskId, boardId, checklists }: ChecklistSectionProps) {
  const queryClient = useQueryClient();
  const [addingChecklist, setAddingChecklist] = useState(false);
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const addInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (addingChecklist) addInputRef.current?.focus();
  }, [addingChecklist]);

  const createChecklistMutation = useMutation({
    mutationFn: (title: string) =>
      apiClient.post(API.crm.taskChecklists(taskId), { title }),
    onSuccess: () => {
      setNewChecklistTitle('');
      setAddingChecklist(false);
      void queryClient.invalidateQueries({ queryKey: ['crm', 'task', taskId] });
      void queryClient.invalidateQueries({ queryKey: ['crm', 'tasks', boardId] });
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newChecklistTitle.trim();
    if (!trimmed || createChecklistMutation.isPending) return;
    createChecklistMutation.mutate(trimmed);
  };

  return (
    <div className="space-y-2">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500 uppercase tracking-wide">
          <ListChecks size={13} />
          Чеклисты
        </span>
        {!addingChecklist && (
          <button
            type="button"
            onClick={() => setAddingChecklist(true)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors rounded px-1.5 py-0.5 hover:bg-gray-800"
          >
            <Plus size={12} />
            Добавить чеклист
          </button>
        )}
      </div>

      {/* Existing checklists */}
      {checklists.map((cl) => (
        <ChecklistBlock
          key={cl.id}
          checklist={cl}
          taskId={taskId}
          boardId={boardId}
        />
      ))}

      {/* New checklist form */}
      {addingChecklist && (
        <form
          onSubmit={handleCreate}
          className="flex items-center gap-2 rounded-lg border border-blue-600/40 bg-gray-800/50 px-3 py-2"
        >
          <input
            ref={addInputRef}
            type="text"
            value={newChecklistTitle}
            onChange={(e) => setNewChecklistTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setAddingChecklist(false);
                setNewChecklistTitle('');
              }
            }}
            placeholder="Название чеклиста..."
            maxLength={200}
            className={cn(
              'flex-1 rounded border bg-gray-700 px-2 py-1 text-sm text-white placeholder-gray-500',
              'focus:outline-none focus:ring-1 focus:ring-blue-500 border-gray-600',
            )}
          />
          <button
            type="submit"
            disabled={!newChecklistTitle.trim() || createChecklistMutation.isPending}
            className={cn(
              'shrink-0 rounded px-3 py-1 text-xs font-medium transition-colors',
              'bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            {createChecklistMutation.isPending ? '...' : 'Создать'}
          </button>
          <button
            type="button"
            onClick={() => { setAddingChecklist(false); setNewChecklistTitle(''); }}
            className="shrink-0 rounded p-1 text-gray-500 hover:text-gray-300 hover:bg-gray-700 transition-colors"
            aria-label="Отмена"
          >
            <X size={13} />
          </button>
        </form>
      )}

      {createChecklistMutation.isError && (
        <p className="text-xs text-red-400">Не удалось создать чеклист.</p>
      )}
    </div>
  );
}
