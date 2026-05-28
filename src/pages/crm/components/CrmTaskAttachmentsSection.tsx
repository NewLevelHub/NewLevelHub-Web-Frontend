import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '@/shared/lib/i18n';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Paperclip, FileText, FileSpreadsheet, Image, File, Trash2, Loader2 } from 'lucide-react';
import { API } from '@/shared/api/endpoints';
import { apiClient } from '@/shared/api/client';
import { cn } from '@/shared/lib/cn';
import { downloadFromApiEndpoint } from '@/shared/lib/resolveDownloadUrl';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import { USER_ROLES } from '@/shared/config/constants';
import { useAuth } from '@/shared/hooks/useAuth';
import type { CrmAttachment } from '@/shared/types';

// ─── Attachments Section ─────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
  }
  return `${(bytes / 1024).toFixed(1)} КБ`;
}

function getFileIcon(mimeType: string) {
  if (mimeType === 'application/pdf' || mimeType.includes('word')) {
    return FileText;
  }
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('xls')) {
    return FileSpreadsheet;
  }
  if (mimeType.startsWith('image/')) {
    return Image;
  }
  return File;
}

function extractUploadError(error: unknown): string {
  if (!error || typeof error !== 'object') return i18n.t('common.uploadError');
  const e = error as { response?: { data?: { detail?: unknown; message?: string } } };
  const detail = e.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (detail && typeof detail === 'object') {
    const firstKey = Object.values(detail as Record<string, unknown>)[0];
    if (Array.isArray(firstKey) && typeof firstKey[0] === 'string') return firstKey[0];
    if (typeof firstKey === 'string') return firstKey;
  }
  return e.response?.data?.message ?? i18n.t('common.uploadError');
}

interface AttachmentsSectionProps {
  taskId: number;
  boardId: string;
}

export function AttachmentsSection({ taskId, boardId }: AttachmentsSectionProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pendingDeleteAttachmentId, setPendingDeleteAttachmentId] = useState<number | null>(null);

  const attachmentsQueryKey = ['crm', 'task', taskId, 'attachments'] as const;
  const taskQueryKey = ['crm', 'task', taskId] as const;

  const { data: attachments, isLoading, isError } = useQuery({
    queryKey: attachmentsQueryKey,
    queryFn: async () => {
      const { data } = await apiClient.get<CrmAttachment[] | { results: CrmAttachment[] }>(
        API.crm.taskAttachments(taskId),
      );
      return Array.isArray(data) ? data : data.results;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: globalThis.File) => {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await apiClient.post<CrmAttachment>(
        API.crm.taskAttachments(taskId),
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return data;
    },
    onSuccess: () => {
      setUploadError(null);
      void queryClient.invalidateQueries({ queryKey: attachmentsQueryKey });
      void queryClient.invalidateQueries({ queryKey: taskQueryKey });
      void queryClient.invalidateQueries({ queryKey: ['crm', 'tasks', boardId] });
    },
    onError: (error: unknown) => {
      setUploadError(extractUploadError(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (attachmentId: number) =>
      apiClient.delete(API.crm.taskAttachmentDetail(taskId, attachmentId)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: attachmentsQueryKey });
      void queryClient.invalidateQueries({ queryKey: taskQueryKey });
      void queryClient.invalidateQueries({ queryKey: ['crm', 'tasks', boardId] });
    },
  });

  const downloadMutation = useMutation({
    mutationFn: (attachment: CrmAttachment) =>
      downloadFromApiEndpoint(attachment.url, { filename: attachment.filename }),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    uploadMutation.mutate(file);
    // Reset input so the same file can be re-selected after an error
    e.target.value = '';
  };

  const handleDeleteClick = (attachmentId: number) => {
    setPendingDeleteAttachmentId(attachmentId);
  };

  const canDelete = (uploadedById: number) => {
    if (!user) return false;
    return user.id === uploadedById || user.role === USER_ROLES.COMPANY_ADMIN;
  };

  return (
    <div className="space-y-3 pt-2 border-t border-default">
      {/* Section heading */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Paperclip size={14} className="text-muted shrink-0" />
          <h3 className="text-xs font-medium text-muted uppercase tracking-wide">Вложения</h3>
        </div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadMutation.isPending}
          aria-label={t('common.attachFile')}
          className={cn(
            'flex items-center gap-1.5 text-xs text-secondary hover:text-secondary transition-colors',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        >
          {uploadMutation.isPending ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Paperclip size={13} />
          )}
          {uploadMutation.isPending ? t('common.loading') : t('common.attachFile')}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {uploadError && (
        <p className="text-xs text-red-400">{uploadError}</p>
      )}

      {isLoading && (
        <div className="space-y-2 animate-pulse">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-raised">
              <div className="w-7 h-7 rounded bg-hover shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-40 rounded bg-hover" />
                <div className="h-3 w-24 rounded bg-hover" />
              </div>
            </div>
          ))}
        </div>
      )}

      {isError && (
        <p className="text-xs text-red-400">Не удалось загрузить вложения.</p>
      )}

      {!isLoading && !isError && attachments && attachments.length === 0 && (
        <p className="text-xs text-muted">Нет вложений.</p>
      )}

      {!isLoading && !isError && attachments && attachments.length > 0 && (
        <ul className="space-y-1.5" role="list" aria-label={t('common.attachmentsList')}>
          {attachments.map((attachment) => {
            const IconComponent = getFileIcon(attachment.mime_type);
            const formattedDate = new Date(attachment.created_at).toLocaleDateString('ru-RU', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            });
            const isDeleting = deleteMutation.isPending && deleteMutation.variables === attachment.id;
            const isDownloading =
              downloadMutation.isPending && downloadMutation.variables?.id === attachment.id;

            return (
              <li
                key={attachment.id}
                className="flex items-center gap-3 p-2 rounded-lg bg-raised hover:bg-hover transition-colors group"
              >
                <IconComponent size={18} className="text-secondary shrink-0" />
                <div className="flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => downloadMutation.mutate(attachment)}
                    disabled={isDownloading}
                    className="text-sm text-secondary hover:text-primary truncate block max-w-full text-left disabled:opacity-50"
                  >
                    {isDownloading ? t('common.opening') : attachment.filename}
                  </button>
                  <p className="text-xs text-muted truncate">
                    {formatFileSize(attachment.size)} · {attachment.uploaded_by.full_name} · {formattedDate}
                  </p>
                </div>
                {canDelete(attachment.uploaded_by.id) && (
                  <button
                    type="button"
                    onClick={() => handleDeleteClick(attachment.id)}
                    disabled={isDeleting}
                    aria-label={`Удалить ${attachment.filename}`}
                    className={cn(
                      'shrink-0 p-1 rounded text-muted hover:text-red-400 transition-colors',
                      'opacity-0 group-hover:opacity-100 focus:opacity-100',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                    )}
                  >
                    {isDeleting ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmModal
        isOpen={pendingDeleteAttachmentId !== null}
        onClose={() => !deleteMutation.isPending && setPendingDeleteAttachmentId(null)}
        onConfirm={() => {
          if (pendingDeleteAttachmentId === null) return;
          const id = pendingDeleteAttachmentId;
          deleteMutation.mutate(id, { onSettled: () => setPendingDeleteAttachmentId(null) });
        }}
        title={t('common.deleteAttachment')}
        description={t('common.deleteAttachmentDesc')}
        variant="danger"
        confirmLabel={t('common.delete')}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
