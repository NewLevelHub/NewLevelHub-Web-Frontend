import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Image, X } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/shared/ui/Button';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import {
  ANNOUNCEMENT_CATEGORIES,
  ANNOUNCEMENT_CATEGORY_LABEL_KEYS,
  USER_ROLES,
  type AnnouncementCategory,
} from '@/shared/config/constants';
import { useUser } from '@/shared/hooks/useAuth';
import { cn } from '@/shared/lib/cn';
import { getApiError } from '@/shared/lib/getApiError';
import { companiesCacheRoot } from '@/shared/lib/companyQueryKeys';
import type { Announcement, Company, PaginatedResponse } from '@/shared/types';

type AudienceMode = 'building' | 'company';

interface AnnouncementCreateModalProps {
  open: boolean;
  initialLevel?: AudienceMode;
  onClose: () => void;
}

const CAT_CONFIG: Record<AnnouncementCategory, { bg: string; color: string; emoji: string }> = {
  info: {
    bg: 'var(--bg-hover)',
    color: 'var(--info)',
    emoji: 'ℹ️',
  },
  important: {
    bg: 'rgba(185,28,28,0.08)',
    color: 'var(--danger)',
    emoji: '⚠️',
  },
  event: {
    bg: 'var(--bg-active)',
    color: 'var(--brand)',
    emoji: '🎉',
  },
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

interface DSCheckboxProps {
  checked: boolean;
  onChange: () => void;
  label: string;
  hint?: string;
}

function DSCheckbox({ checked, onChange, label, hint }: DSCheckboxProps) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
      <div
        onClick={onChange}
        role="checkbox"
        aria-checked={checked}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') onChange();
        }}
        style={{
          width: 18,
          height: 18,
          borderRadius: 4,
          border: `1.5px solid ${checked ? 'var(--brand)' : 'var(--border-strong)'}`,
          background: checked ? 'var(--brand)' : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'all 0.15s',
          cursor: 'pointer',
        }}
      >
        {checked ? <Check size={11} color="#fff" strokeWidth={3} /> : null}
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{label}</div>
        {hint ? (
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{hint}</div>
        ) : null}
      </div>
    </label>
  );
}

export function AnnouncementCreateModal({
  open,
  initialLevel,
  onClose,
}: AnnouncementCreateModalProps) {
  const { t } = useTranslation();
  const user = useUser();
  const queryClient = useQueryClient();

  const isSuperadmin = user?.role === USER_ROLES.SUPERADMIN;

  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [category, setCategory] = useState<AnnouncementCategory>(ANNOUNCEMENT_CATEGORIES.INFO);
  const [isPinned, setIsPinned] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [level, setLevel] = useState<AudienceMode>(
    initialLevel ?? (isSuperadmin ? 'building' : 'company'),
  );
  const [companyId, setCompanyId] = useState<number | ''>('');
  const [formError, setFormError] = useState<string | null>(null);

  // Sync level when initialLevel prop changes (e.g. different button clicked)
  useEffect(() => {
    if (initialLevel !== undefined) {
      setLevel(initialLevel);
    }
  }, [initialLevel]);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setTitle('');
      setText('');
      setCategory(ANNOUNCEMENT_CATEGORIES.INFO);
      setIsPinned(false);
      setNotifyEmail(false);
      setImage(null);
      setLevel(initialLevel ?? (isSuperadmin ? 'building' : 'company'));
      setCompanyId('');
      setFormError(null);
    }
  }, [open, initialLevel, isSuperadmin]);

  // Superadmin only: load companies for the recipient picker.
  const companiesQuery = useQuery({
    queryKey: [...companiesCacheRoot(user?.id), 'list-for-announcement'],
    queryFn: async () => {
      const response = await apiClient.get<PaginatedResponse<Company>>(API.companies.list);
      return response.data;
    },
    enabled: isSuperadmin && level === 'company',
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const isMultipart = Boolean(image);
      const payload: Record<string, unknown> | FormData = isMultipart ? new FormData() : {};
      const setField = (key: string, value: unknown) => {
        if (payload instanceof FormData) {
          if (value === null || value === undefined) return;
          payload.append(key, value instanceof Blob ? value : String(value));
        } else {
          payload[key] = value;
        }
      };
      setField('title', title.trim());
      setField('text', text.trim());
      setField('category', category);
      setField('is_pinned', isPinned);
      setField('notify_email', notifyEmail);
      if (isSuperadmin) {
        if (level === 'building') {
          if (payload instanceof FormData) {
            payload.append('company_id', '');
          } else {
            payload['company_id'] = null;
          }
        } else if (companyId !== '') {
          setField('company_id', companyId);
        }
      }
      if (image) {
        (payload as FormData).append('image', image);
      }
      const response = await apiClient.post<Announcement>(
        API.announcements.create,
        payload,
        isMultipart ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined,
      );
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['announcements'] });
      await queryClient.invalidateQueries({ queryKey: ['announcements-widget'] });
      onClose();
    },
    onError: (error: unknown) => {
      setFormError(getApiError(error).message);
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    if (!title.trim() || !text.trim()) {
      setFormError(t('announcements.formErrorTitleText'));
      return;
    }
    if (isSuperadmin && level === 'company' && companyId === '') {
      setFormError(t('announcements.formErrorCompany'));
      return;
    }
    createMutation.mutate();
  }

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
              {t('announcements.createTitle')}
            </h2>
            <p className="text-xs text-muted mt-0.5">
              {level === 'building'
                ? t('announcements.subtitleBC')
                : t('announcements.subtitleCompany')}
            </p>
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
          <div className="px-[22px] pb-0 flex flex-col gap-4">
            {/* Audience toggle (superadmin only) */}
            {isSuperadmin ? (
              <div>
                <span style={labelStyle}>{t('announcements.audienceLabel')}</span>
                <div
                  style={{
                    display: 'flex',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    overflow: 'hidden',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setLevel('building')}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      fontSize: 13,
                      fontWeight: level === 'building' ? 600 : 400,
                      background:
                        level === 'building' ? 'var(--brand-subtle)' : 'var(--bg-surface)',
                      color:
                        level === 'building' ? 'var(--brand-text)' : 'var(--text-muted)',
                      border: 'none',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    🏢 {t('announcements.audienceBC')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setLevel('company')}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      fontSize: 13,
                      fontWeight: level === 'company' ? 600 : 400,
                      background:
                        level === 'company' ? 'var(--brand-subtle)' : 'var(--bg-surface)',
                      color:
                        level === 'company' ? 'var(--brand-text)' : 'var(--text-muted)',
                      border: 'none',
                      borderLeft: '1px solid var(--border)',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    🏷 {t('announcements.audienceCompany')}
                  </button>
                </div>

                {/* Company picker */}
                {level === 'company' ? (
                  <div style={{ marginTop: 10 }}>
                    <label style={labelStyle} htmlFor="modal-ann-company">
                      {t('announcements.recipientLabel')}
                    </label>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                      {t('announcements.recipientHint')}
                    </p>
                    <select
                      id="modal-ann-company"
                      value={companyId === '' ? '' : String(companyId)}
                      onChange={(e) =>
                        setCompanyId(e.target.value === '' ? '' : Number(e.target.value))
                      }
                      style={inputStyle}
                      aria-label={t('announcements.recipientLabel')}
                    >
                      <option value="">{t('announcements.recipientSelect')}</option>
                      {(companiesQuery.data?.results ?? []).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* Category toggle buttons */}
            <div>
              <span style={labelStyle}>{t('announcements.categoryLabel')}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                {(
                  Object.entries(CAT_CONFIG) as Array<
                    [AnnouncementCategory, (typeof CAT_CONFIG)[AnnouncementCategory]]
                  >
                ).map(([k, c]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setCategory(k)}
                    style={{
                      flex: 1,
                      padding: '9px 12px',
                      borderRadius: 8,
                      border: `1.5px solid ${category === k ? c.color : 'var(--border)'}`,
                      background: category === k ? c.bg : 'var(--bg-surface)',
                      color: category === k ? c.color : 'var(--text-muted)',
                      fontSize: 12,
                      fontWeight: category === k ? 600 : 400,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 5,
                      transition: 'all 0.15s',
                    }}
                  >
                    {c.emoji} {t(ANNOUNCEMENT_CATEGORY_LABEL_KEYS[k])}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label style={labelStyle} htmlFor="modal-ann-title">
                {t('announcements.fieldTitle')}
              </label>
              <input
                id="modal-ann-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={inputStyle}
                placeholder={t('announcements.fieldTitlePlaceholder')}
                required
                maxLength={255}
              />
            </div>

            {/* Text */}
            <div>
              <label style={labelStyle} htmlFor="modal-ann-text">
                {t('announcements.fieldText')}
              </label>
              <textarea
                id="modal-ann-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                style={{ ...inputStyle, height: 'auto', padding: '8px 12px', resize: 'none', minHeight: 80 }}
                placeholder={t('announcements.fieldTextPlaceholder')}
                rows={5}
                required
              />
            </div>

            {/* Image upload dropzone */}
            <div>
              <label htmlFor="modal-img-upload" style={labelStyle}>
                {t('announcements.imageLabel')}
              </label>
              <label
                htmlFor="modal-img-upload"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: 14,
                  borderRadius: 8,
                  border: '1.5px dashed var(--border-strong)',
                  background: 'var(--bg-raised)',
                  color: 'var(--text-muted)',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                <Image size={16} aria-hidden="true" />
                {image ? image.name : t('announcements.imageHint')}
              </label>
              <input
                id="modal-img-upload"
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => setImage(e.target.files?.[0] ?? null)}
              />
            </div>

            {/* Pin checkbox */}
            <DSCheckbox
              checked={isPinned}
              onChange={() => setIsPinned((v) => !v)}
              label={t('announcements.pinLabel')}
              hint={t('announcements.pinHint')}
            />

            {/* Email checkbox — only for building-level announcements */}
            {level === 'building' ? (
              <DSCheckbox
                checked={notifyEmail}
                onChange={() => setNotifyEmail((v) => !v)}
                label={t('announcements.emailLabel')}
                hint={t('announcements.emailHint')}
              />
            ) : null}

            {/* Error */}
            {formError ? (
              <div
                role="alert"
                style={{
                  background: 'var(--danger-bg)',
                  color: 'var(--danger-text)',
                  border: '1px solid var(--danger)',
                  borderRadius: 8,
                  padding: '10px 14px',
                  fontSize: 13,
                }}
              >
                {formError}
              </div>
            ) : null}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 border-t border-[color:var(--border-faint)] px-[22px] pt-[14px] pb-[18px] mt-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={createMutation.isPending}
              loading={createMutation.isPending}
            >
              {createMutation.isPending
                ? t('announcements.publishing')
                : t('announcements.publishBtn')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
