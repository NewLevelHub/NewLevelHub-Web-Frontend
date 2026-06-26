import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { getApiError } from '@/shared/lib/getApiError';
import { cn } from '@/shared/lib/cn';

export interface LeaveActionModalProps {
  open: boolean;
  actionType: 'approve' | 'reject' | 'cancel_approval' | 'cancel' | null;
  leaveId: number | null;
  onClose: () => void;
  onSuccess: () => void;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  height: 36,
  padding: '0 12px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border)',
  background: 'var(--bg-surface)',
  color: 'var(--text-primary)',
  fontSize: 14,
  outline: 'none',
  fontFamily: 'inherit',
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: 'var(--text-secondary)',
  display: 'block',
  marginBottom: 6,
};

export default function LeaveActionModal({
  open,
  actionType,
  leaveId,
  onClose,
  onSuccess,
}: LeaveActionModalProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [note, setNote] = useState('');
  const [mutationError, setMutationError] = useState<string | null>(null);

  const config = actionType
    ? {
        approve: {
          title: t('leave.action.approveTitle'),
          btn: t('leave.action.approveBtn'),
          needNote: false,
          isRequired: false,
          btnClass: cn(
            'inline-flex items-center gap-1.5 h-8 px-4 text-sm font-medium rounded-[var(--radius-sm)]',
            'text-white bg-[color:var(--brand)] hover:opacity-90 transition-opacity',
            'disabled:opacity-60 disabled:cursor-not-allowed',
          ),
        },
        reject: {
          title: t('leave.action.rejectTitle'),
          btn: t('leave.action.rejectBtn'),
          needNote: true,
          isRequired: true,
          btnClass: cn(
            'inline-flex items-center gap-1.5 h-8 px-4 text-sm font-medium rounded-[var(--radius-sm)]',
            'text-white bg-[color:var(--danger)] hover:opacity-90 transition-opacity',
            'disabled:opacity-60 disabled:cursor-not-allowed',
          ),
        },
        cancel_approval: {
          title: t('leave.action.cancelApprovalTitle'),
          btn: t('leave.action.cancelApprovalBtn'),
          needNote: true,
          isRequired: false,
          btnClass: cn(
            'inline-flex items-center gap-1.5 h-8 px-4 text-sm font-medium rounded-[var(--radius-sm)]',
            'bg-[color:var(--warning-bg)] text-[color:var(--warning)] hover:opacity-90 transition-opacity border border-[color:var(--warning)]',
            'disabled:opacity-60 disabled:cursor-not-allowed',
          ),
        },
        cancel: {
          title: t('leave.action.cancelTitle'),
          btn: t('leave.action.cancelBtn'),
          needNote: false,
          isRequired: false,
          btnClass: cn(
            'inline-flex items-center gap-1.5 h-8 px-4 text-sm font-medium rounded-[var(--radius-sm)]',
            'text-white bg-[color:var(--danger)] hover:opacity-90 transition-opacity',
            'disabled:opacity-60 disabled:cursor-not-allowed',
          ),
        },
      }[actionType]
    : null;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!leaveId || !actionType) return;
      if (actionType === 'approve') {
        await apiClient.post(API.leave.review(String(leaveId)), {
          status: 'approved',
          review_comment: note.trim() || undefined,
        });
      } else if (actionType === 'reject') {
        await apiClient.post(API.leave.review(String(leaveId)), {
          status: 'rejected',
          review_comment: note.trim() || undefined,
        });
      } else if (actionType === 'cancel_approval') {
        await apiClient.post(API.leave.review(String(leaveId)), {
          status: 'rejected',
          review_comment: note.trim() || undefined,
        });
      } else if (actionType === 'cancel') {
        await apiClient.post(API.leave.cancel(String(leaveId)));
      }
    },
    onSuccess: async () => {
      setMutationError(null);
      await queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      await queryClient.invalidateQueries({ queryKey: ['leave-balance'] });
      await queryClient.invalidateQueries({ queryKey: ['leave-team-balance'] });
      onSuccess();
      onClose();
    },
    onError: (err) => {
      setMutationError(getApiError(err).message);
    },
  });

  const handleClose = () => {
    if (mutation.isPending) return;
    setNote('');
    setMutationError(null);
    onClose();
  };

  const isConfirmDisabled =
    mutation.isPending || (config?.needNote && config.isRequired && !note.trim());

  if (!open || !leaveId || !actionType || !config) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-[420px] rounded-2xl border border-default bg-surface shadow-xl overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between px-[22px] pt-[18px] pb-[14px]">
          <div className="min-w-0 pr-4">
            <h2 className="text-base font-semibold text-primary tracking-[-0.015em]">
              {config.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="shrink-0 flex items-center justify-center w-7 h-7 rounded-lg text-secondary hover:bg-raised hover:text-primary focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]"
            aria-label={t('common.close')}
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="px-[22px] pb-0 flex flex-col gap-4">
          {config.needNote && (
            <div>
              <label style={labelStyle} htmlFor="leave-action-note">
                {t('leave.action.commentLabel')}{' '}
                <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
                  {config.isRequired
                    ? t('leave.action.commentRequired')
                    : t('leave.action.commentOptional')}
                </span>
              </label>
              <textarea
                id="leave-action-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t('leave.action.commentPlaceholder')}
                style={{
                  ...inputStyle,
                  height: 'auto',
                  padding: '8px 12px',
                  resize: 'none',
                  minHeight: 80,
                }}
              />
            </div>
          )}

          {mutationError && (
            <div
              role="alert"
              style={{
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--danger)',
                background: 'var(--danger-bg)',
                color: 'var(--danger)',
                fontSize: 13,
              }}
            >
              {mutationError}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-[color:var(--border-faint)] px-[22px] pt-[14px] pb-[18px] mt-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={mutation.isPending}
            className="h-8 px-4 text-sm font-medium text-secondary hover:bg-raised rounded-[var(--radius-sm)] transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            disabled={isConfirmDisabled}
            onClick={() => mutation.mutate()}
            className={config.btnClass}
          >
            {config.btn}
          </button>
        </div>
      </div>
    </div>
  );
}
