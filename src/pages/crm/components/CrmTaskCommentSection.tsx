import { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Send } from 'lucide-react';
import { API } from '@/shared/api/endpoints';
import { apiClient } from '@/shared/api/client';
import { cn } from '@/shared/lib/cn';
import { USER_ROLES } from '@/shared/config/constants';
import { useAuth } from '@/shared/hooks/useAuth';
import type { CrmComment } from '@/shared/types';

// ─── Comment helpers ──────────────────────────────────────────────────────────

function formatCommentDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── Comment Item ─────────────────────────────────────────────────────────────

interface CommentItemProps {
  comment: CrmComment;
  currentUserId: number;
  currentUserRole: string;
  onUpdate: (commentId: number, text: string) => void;
  onDelete: (commentId: number) => void;
  isUpdating: boolean;
  isDeleting: boolean;
}

function CommentItem({
  comment,
  currentUserId,
  currentUserRole,
  onUpdate,
  onDelete,
  isUpdating,
  isDeleting,
}: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isAuthor = comment.author.id === currentUserId;
  const canEdit = isAuthor || currentUserRole === USER_ROLES.SUPERADMIN;
  const canDelete = isAuthor || currentUserRole === USER_ROLES.COMPANY_ADMIN || currentUserRole === USER_ROLES.SUPERADMIN;

  const initials = comment.author.full_name
    .split(' ')
    .map((n) => n[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handleEditStart = () => {
    setEditText(comment.text);
    setIsEditing(true);
  };

  const handleEditCancel = () => {
    setEditText(comment.text);
    setIsEditing(false);
  };

  const handleEditSave = () => {
    const trimmed = editText.trim();
    if (!trimmed || trimmed === comment.text) {
      setIsEditing(false);
      return;
    }
    onUpdate(comment.id, trimmed);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') handleEditCancel();
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleEditSave();
  };

  useEffect(() => {
    if (isEditing) textareaRef.current?.focus();
  }, [isEditing]);

  return (
    <div className="flex gap-3">
      {/* Avatar */}
      {comment.author.avatar ? (
        <img
          src={comment.author.avatar}
          alt={comment.author.full_name}
          className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5"
        />
      ) : (
        <span
          className="w-7 h-7 rounded-full bg-gray-700 text-gray-300 text-xs font-medium flex items-center justify-center shrink-0 mt-0.5"
          aria-label={comment.author.full_name}
        >
          {initials}
        </span>
      )}

      <div className="flex-1 min-w-0 space-y-1">
        {/* Author + date row */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-gray-300">{comment.author.full_name}</span>
          <span className="text-xs text-gray-600">{formatCommentDate(comment.created_at)}</span>
        </div>

        {/* Text or edit form */}
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              ref={textareaRef}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={3}
              className={cn(
                'w-full rounded-lg border bg-gray-800 px-3 py-2 text-sm text-white',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors',
                'border-gray-700 resize-none',
              )}
              aria-label="Редактировать комментарий"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleEditSave}
                disabled={!editText.trim() || isUpdating}
                className={cn(
                  'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                  'bg-blue-600 text-white hover:bg-blue-500',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                )}
              >
                {isUpdating ? 'Сохранение...' : 'Сохранить'}
              </button>
              <button
                type="button"
                onClick={handleEditCancel}
                className="rounded-md px-3 py-1 text-xs font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-300 whitespace-pre-wrap break-words">{comment.text}</p>
        )}

        {/* Actions */}
        {!isEditing && (canEdit || canDelete) && (
          <div className="flex items-center gap-3 pt-0.5">
            {canEdit && (
              <button
                type="button"
                onClick={handleEditStart}
                className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
              >
                Редактировать
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={() => onDelete(comment.id)}
                disabled={isDeleting}
                className="text-xs text-red-600 hover:text-red-400 transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Удаление...' : 'Удалить'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Comment Section ──────────────────────────────────────────────────────────

interface CommentSectionProps {
  taskId: number;
  boardId: string;
}

export function CommentSection({ taskId, boardId }: CommentSectionProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [newText, setNewText] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const commentsQueryKey = ['crm', 'task', taskId, 'comments'] as const;

  const { data: comments, isLoading, isError } = useQuery({
    queryKey: commentsQueryKey,
    queryFn: async () => {
      const { data } = await apiClient.get<CrmComment[] | { results: CrmComment[] }>(
        API.crm.taskComments(taskId),
      );
      return Array.isArray(data) ? data : data.results;
    },
  });

  const createMutation = useMutation({
    mutationFn: (text: string) =>
      apiClient.post<CrmComment>(API.crm.taskComments(taskId), { text }).then((r) => r.data),
    onSuccess: () => {
      setNewText('');
      void queryClient.invalidateQueries({ queryKey: commentsQueryKey });
      void queryClient.invalidateQueries({ queryKey: ['crm', 'task', taskId] });
      if (boardId) {
        void queryClient.invalidateQueries({ queryKey: ['crm', 'tasks', boardId] });
      }
      void queryClient.invalidateQueries({ queryKey: ['notifications-recent'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ commentId, text }: { commentId: number; text: string }) =>
      apiClient
        .patch<CrmComment>(API.crm.taskCommentDetail(taskId, commentId), { text })
        .then((r) => r.data),
    onMutate: ({ commentId }) => setUpdatingId(commentId),
    onSettled: () => setUpdatingId(null),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: commentsQueryKey });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (commentId: number) =>
      apiClient.delete(API.crm.taskCommentDetail(taskId, commentId)),
    onMutate: (commentId) => setDeletingId(commentId),
    onSettled: () => setDeletingId(null),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: commentsQueryKey });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newText.trim();
    if (!trimmed || createMutation.isPending) return;
    createMutation.mutate(trimmed);
  };

  const handleNewTextKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      const trimmed = newText.trim();
      if (trimmed && !createMutation.isPending) {
        createMutation.mutate(trimmed);
      }
    }
  };

  return (
    <div className="space-y-4 pt-2 border-t border-gray-800">
      {/* Section heading */}
      <div className="flex items-center gap-2">
        <MessageSquare size={14} className="text-gray-500 shrink-0" />
        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Комментарии</h3>
      </div>

      {/* Comment list */}
      {isLoading && (
        <div className="space-y-3 animate-pulse">
          {[1, 2].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-gray-700 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-24 rounded bg-gray-700" />
                <div className="h-4 w-full rounded bg-gray-700" />
              </div>
            </div>
          ))}
        </div>
      )}

      {isError && (
        <p className="text-xs text-red-400">Не удалось загрузить комментарии.</p>
      )}

      {!isLoading && !isError && comments && comments.length === 0 && (
        <p className="text-xs text-gray-600">Комментариев пока нет.</p>
      )}

      {!isLoading && !isError && comments && comments.length > 0 && (
        <div className="space-y-4">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUserId={user?.id ?? -1}
              currentUserRole={user?.role ?? ''}
              onUpdate={(commentId, text) => updateMutation.mutate({ commentId, text })}
              onDelete={(commentId) => deleteMutation.mutate(commentId)}
              isUpdating={updatingId === comment.id && updateMutation.isPending}
              isDeleting={deletingId === comment.id && deleteMutation.isPending}
            />
          ))}
        </div>
      )}

      {/* New comment form */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <textarea
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={handleNewTextKeyDown}
          placeholder="Написать комментарий..."
          rows={3}
          className={cn(
            'w-full rounded-lg border bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-600',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors',
            'border-gray-700 resize-none',
          )}
          aria-label="Текст нового комментария"
        />
        <div className="flex items-center justify-between">
          {createMutation.isError && (
            <p className="text-xs text-red-400">Не удалось отправить комментарий.</p>
          )}
          <div className="ml-auto">
            <button
              type="submit"
              disabled={!newText.trim() || createMutation.isPending}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                'bg-blue-600 text-white hover:bg-blue-500',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              <Send size={13} />
              {createMutation.isPending ? 'Отправка...' : 'Отправить'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
