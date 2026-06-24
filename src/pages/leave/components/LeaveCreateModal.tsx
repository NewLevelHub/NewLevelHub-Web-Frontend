import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import {
  LEAVE_TYPES,
  LEAVE_TYPE_LABEL_KEYS,
  type LeaveType,
} from '@/shared/config/constants';
import { getApiError } from '@/shared/lib/getApiError';
import { cn } from '@/shared/lib/cn';
import { useReviewerOptions } from '../useReviewerOptions';

export interface LeaveCreateModalProps {
  open: boolean;
  onClose: () => void;
}

type LeaveRequestCreatePayload = {
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  comment?: string;
  assigned_reviewer?: number;
};

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

const TYPE_COLORS: Record<LeaveType, { color: string; bg: string }> = {
  [LEAVE_TYPES.VACATION]: {
    color: 'var(--info)',
    bg: 'color-mix(in srgb, var(--info) 12%, transparent)',
  },
  [LEAVE_TYPES.DAY_OFF]: {
    color: 'var(--brand-text)',
    bg: 'var(--brand-subtle)',
  },
  [LEAVE_TYPES.SICK_LEAVE]: {
    color: 'var(--danger)',
    bg: 'var(--danger-bg)',
  },
  [LEAVE_TYPES.REMOTE]: {
    color: 'var(--success)',
    bg: 'var(--success-bg)',
  },
};

// LEAVE_TYPES.SICK and LEAVE_TYPES.SICK_LEAVE share the same value ('sick_leave')
// so TYPE_COLORS already covers it.

export default function LeaveCreateModal({ open, onClose }: LeaveCreateModalProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { isCompanyAdmin, isEmployee, options: reviewerOptions, isLoading: reviewersLoading } = useReviewerOptions();

  const [leaveType, setLeaveType] = useState<LeaveType>(LEAVE_TYPES.VACATION);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [comment, setComment] = useState('');
  const [assignedReviewer, setAssignedReviewer] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  const reviewerRequired = isCompanyAdmin || isEmployee;

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setLeaveType(LEAVE_TYPES.VACATION);
      setStartDate('');
      setEndDate('');
      setComment('');
      setAssignedReviewer('');
      setFormError(null);
    }
  }, [open]);

  const typeOptions = useMemo(
    () => [
      { value: LEAVE_TYPES.VACATION, label: t(LEAVE_TYPE_LABEL_KEYS[LEAVE_TYPES.VACATION]) },
      { value: LEAVE_TYPES.DAY_OFF, label: t(LEAVE_TYPE_LABEL_KEYS[LEAVE_TYPES.DAY_OFF]) },
      { value: LEAVE_TYPES.SICK_LEAVE, label: t(LEAVE_TYPE_LABEL_KEYS[LEAVE_TYPES.SICK_LEAVE]) },
      { value: LEAVE_TYPES.REMOTE, label: t(LEAVE_TYPE_LABEL_KEYS[LEAVE_TYPES.REMOTE]) },
    ],
    [t],
  );

  const daysCount = useMemo(() => {
    if (!startDate || !endDate) return null;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) return null;
    const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diff;
  }, [startDate, endDate]);

  const createLeaveMutation = useMutation({
    mutationFn: async (payload: LeaveRequestCreatePayload) => {
      await apiClient.post(API.leave.create, payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      await queryClient.invalidateQueries({ queryKey: ['leave-balance'] });
      onClose();
    },
    onError: (error: unknown) => {
      setFormError(getApiError(error).message);
    },
  });

  const isSubmitDisabled =
    !startDate ||
    !endDate ||
    new Date(endDate) < new Date(startDate) ||
    (reviewerRequired && reviewerOptions.length > 0 && !assignedReviewer) ||
    createLeaveMutation.isPending;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!startDate || !endDate) {
      setFormError(t('leave.datesRequired'));
      return;
    }
    if (startDate > endDate) {
      setFormError(t('leave.datesOrder'));
      return;
    }
    if (reviewerRequired && reviewerOptions.length > 0 && !assignedReviewer) {
      setFormError(t('leave.createModal.reviewerRequired'));
      return;
    }

    createLeaveMutation.mutate({
      leave_type: leaveType,
      start_date: startDate,
      end_date: endDate,
      comment: comment.trim() || undefined,
      assigned_reviewer: assignedReviewer ? Number(assignedReviewer) : undefined,
    });
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-[560px] rounded-2xl border border-default bg-surface shadow-xl overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between px-[22px] pt-[18px] pb-[14px]">
          <div className="min-w-0 pr-4">
            <h2 className="text-base font-semibold text-primary tracking-[-0.015em]">
              {t('leave.createModal.title')}
            </h2>
            <p className="text-xs text-muted mt-0.5">{t('leave.createModal.subtitle')}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 flex items-center justify-center w-7 h-7 rounded-lg text-secondary hover:bg-raised hover:text-primary focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]"
            aria-label={t('common.close')}
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div className="px-[22px] pb-0 flex flex-col gap-4 max-h-[calc(90vh-120px)] overflow-y-auto">
            {/* Leave type — 2x2 grid of radio cards */}
            <div>
              <label style={labelStyle}>{t('leave.createModal.typeLabel')}</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {typeOptions.map(({ value, label }) => {
                  const { color, bg } = TYPE_COLORS[value] ?? {
                    color: 'var(--text-primary)',
                    bg: 'var(--bg-raised)',
                  };
                  const isSelected = leaveType === value;
                  return (
                    <label
                      key={value}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 10px',
                        borderRadius: 7,
                        border: `1.5px solid ${isSelected ? color : 'var(--border)'}`,
                        background: isSelected ? bg : 'var(--bg-surface)',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="radio"
                        name="leaveType"
                        value={value}
                        checked={isSelected}
                        onChange={() => setLeaveType(value)}
                        style={{ accentColor: color }}
                      />
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: isSelected ? color : 'var(--text-primary)',
                        }}
                      >
                        {label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Date range */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle} htmlFor="leave-start-date">
                  {t('leave.createModal.startLabel')}
                </label>
                <input
                  id="leave-start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label style={labelStyle} htmlFor="leave-end-date">
                  {t('leave.createModal.endLabel')}
                </label>
                <input
                  id="leave-end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>
            </div>

            {/* Days preview pill */}
            {daysCount !== null && (
              <div>
                <span
                  style={{
                    display: 'inline-block',
                    fontSize: 12,
                    fontWeight: 600,
                    padding: '3px 10px',
                    borderRadius: 20,
                    background: 'var(--brand-subtle)',
                    color: 'var(--brand-text)',
                  }}
                >
                  {t('leave.createModal.daysPreview', { count: daysCount })}
                </span>
              </div>
            )}

            {/* Reviewer */}
            {reviewerRequired && (
              <div>
                <label style={labelStyle} htmlFor="leave-reviewer">
                  {t('leave.createModal.reviewerLabel')}
                </label>
                <select
                  id="leave-reviewer"
                  value={assignedReviewer}
                  onChange={(e) => setAssignedReviewer(e.target.value)}
                  style={inputStyle}
                  disabled={reviewerOptions.length === 0 && !reviewersLoading}
                >
                  <option value="">
                    {reviewersLoading
                      ? t('common.loading')
                      : t('leave.createModal.reviewerPlaceholder')}
                  </option>
                  {reviewerOptions.map((opt) => (
                    <option key={opt.id} value={String(opt.id)}>
                      {opt.full_name}
                    </option>
                  ))}
                </select>
                {isCompanyAdmin && reviewerOptions.length === 0 && !reviewersLoading && (
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    {t('leave.createModal.noReviewers')}
                  </p>
                )}
              </div>
            )}

            {/* Comment */}
            <div>
              <label style={labelStyle} htmlFor="leave-comment">
                {t('leave.createModal.commentLabel')}
              </label>
              <textarea
                id="leave-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={t('leave.createModal.commentPlaceholder')}
                style={{
                  ...inputStyle,
                  height: 'auto',
                  padding: '8px 12px',
                  resize: 'none',
                  minHeight: 80,
                }}
              />
            </div>

            {/* Error */}
            {formError && (
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
                {formError}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 border-t border-[color:var(--border-faint)] px-[22px] pt-[14px] pb-[18px] mt-3">
            <button
              type="button"
              onClick={onClose}
              className="h-8 px-4 text-sm font-medium text-secondary hover:bg-raised rounded-[var(--radius-sm)] transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitDisabled}
              className={cn(
                'inline-flex items-center gap-1.5 h-8 px-4 text-sm font-medium rounded-[var(--radius-sm)]',
                'text-white bg-[color:var(--brand)] hover:opacity-90 transition-opacity',
                'disabled:opacity-60 disabled:cursor-not-allowed',
              )}
            >
              {createLeaveMutation.isPending
                ? t('leave.createModal.submitting')
                : t('leave.createModal.submitBtn')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
