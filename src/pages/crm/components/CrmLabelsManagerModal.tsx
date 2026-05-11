import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Tag, Pencil, Trash2 } from 'lucide-react';
import { API } from '@/shared/api/endpoints';
import { apiClient } from '@/shared/api/client';
import { cn } from '@/shared/lib/cn';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import type { CrmLabel } from '@/shared/types';

// ─── Labels Manager Modal ─────────────────────────────────────────────────────

interface LabelsManagerModalProps {
  onClose: () => void;
}

export function CrmLabelsManagerModal({ onClose }: LabelsManagerModalProps) {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#6366f1');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [pendingDeleteLabelId, setPendingDeleteLabelId] = useState<number | null>(null);

  const { data: labels, isLoading } = useQuery({
    queryKey: ['crm', 'labels'],
    queryFn: () =>
      apiClient.get<CrmLabel[]>(API.crm.labels).then((r) => {
        const data = r.data;
        return Array.isArray(data) ? data : (data as { results: CrmLabel[] }).results;
      }),
  });

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['crm', 'labels'] });

  const createMutation = useMutation({
    mutationFn: (payload: { name: string; color: string }) =>
      apiClient.post<CrmLabel>(API.crm.labels, payload).then((r) => r.data),
    onSuccess: () => {
      setNewName('');
      setNewColor('#6366f1');
      invalidate();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: { name: string; color: string } }) =>
      apiClient.patch<CrmLabel>(API.crm.labelDetail(id), payload).then((r) => r.data),
    onSuccess: () => {
      setEditingId(null);
      invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(API.crm.labelDetail(id)),
    onSuccess: invalidate,
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed || createMutation.isPending) return;
    createMutation.mutate({ name: trimmed, color: newColor });
  };

  const startEdit = (label: CrmLabel) => {
    setEditingId(label.id);
    setEditName(label.name);
    setEditColor(label.color);
  };

  const cancelEdit = () => setEditingId(null);

  const handleSaveEdit = () => {
    const trimmed = editName.trim();
    if (!trimmed || updateMutation.isPending) return;
    updateMutation.mutate({ id: editingId!, payload: { name: trimmed, color: editColor } });
  };

  const handleDeleteRequest = (id: number) => {
    setPendingDeleteLabelId(id);
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="labels-manager-title"
    >
      <div className="w-full max-w-md rounded-xl border border-gray-700 bg-gray-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 id="labels-manager-title" className="text-base font-semibold text-white flex items-center gap-2">
            <Tag size={16} />
            Управление метками
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors rounded-md p-1 hover:bg-gray-800"
            aria-label="Закрыть"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Existing labels */}
          {isLoading && (
            <div className="space-y-2 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-9 rounded-lg bg-gray-800" />
              ))}
            </div>
          )}

          {!isLoading && labels && labels.length === 0 && (
            <p className="text-sm text-gray-500">Меток пока нет. Создайте первую.</p>
          )}

          {!isLoading && labels && labels.length > 0 && (
            <ul className="space-y-1.5" aria-label="Список меток">
              {labels.map((label) => (
                <li key={label.id}>
                  {editingId === label.id ? (
                    <div className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2">
                      <input
                        type="color"
                        value={editColor}
                        onChange={(e) => setEditColor(e.target.value)}
                        className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent p-0"
                        aria-label="Цвет метки"
                      />
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        maxLength={50}
                        className={cn(
                          'flex-1 rounded border bg-gray-700 px-2 py-1 text-sm text-white',
                          'focus:outline-none focus:ring-1 focus:ring-blue-500 border-gray-600',
                        )}
                        aria-label="Название метки"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit();
                          if (e.key === 'Escape') cancelEdit();
                        }}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleSaveEdit}
                        disabled={!editName.trim() || updateMutation.isPending}
                        className={cn(
                          'rounded px-2.5 py-1 text-xs font-medium transition-colors',
                          'bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed',
                        )}
                      >
                        {updateMutation.isPending ? '...' : 'Сохранить'}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="rounded p-1 text-gray-500 hover:text-gray-300 hover:bg-gray-700 transition-colors"
                        aria-label="Отмена"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="group flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2">
                      <span
                        className="w-4 h-4 rounded shrink-0"
                        style={{ backgroundColor: label.color }}
                        aria-hidden="true"
                      />
                      <span className="flex-1 text-sm text-gray-200 truncate">{label.name}</span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => startEdit(label)}
                          className="rounded p-1 text-gray-500 hover:text-gray-300 hover:bg-gray-700 transition-colors"
                          aria-label={`Редактировать метку ${label.name}`}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRequest(label.id)}
                          disabled={deleteMutation.isPending}
                          className="rounded p-1 text-gray-500 hover:text-red-400 hover:bg-gray-700 transition-colors disabled:opacity-50"
                          aria-label={`Удалить метку ${label.name}`}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          {/* Create new label */}
          <div className="border-t border-gray-800 pt-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Новая метка</p>
            <form onSubmit={handleCreate} className="flex items-center gap-2">
              <input
                type="color"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                className="w-9 h-9 rounded cursor-pointer border border-gray-700 bg-gray-800 p-0.5"
                aria-label="Выбрать цвет"
              />
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Название метки"
                maxLength={50}
                className={cn(
                  'flex-1 rounded-lg border bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors border-gray-700',
                )}
                aria-label="Название новой метки"
              />
              <button
                type="submit"
                disabled={!newName.trim() || createMutation.isPending}
                className={cn(
                  'rounded-lg px-3 py-2 text-sm font-medium transition-colors shrink-0',
                  'bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed',
                )}
              >
                {createMutation.isPending ? '...' : 'Создать'}
              </button>
            </form>
            {createMutation.isError && (
              <p className="mt-2 text-xs text-red-400">Не удалось создать метку.</p>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        rootClassName="z-[70]"
        isOpen={pendingDeleteLabelId !== null}
        onClose={() => !deleteMutation.isPending && setPendingDeleteLabelId(null)}
        onConfirm={() => {
          if (pendingDeleteLabelId === null) return;
          const id = pendingDeleteLabelId;
          deleteMutation.mutate(id, { onSettled: () => setPendingDeleteLabelId(null) });
        }}
        title="Удалить метку?"
        description="Метка будет снята со всех задач. Это действие нельзя отменить."
        variant="danger"
        confirmLabel="Удалить"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
