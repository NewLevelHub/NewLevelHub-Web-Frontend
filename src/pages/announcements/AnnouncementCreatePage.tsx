import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { Check, Image } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import {
  ANNOUNCEMENT_CATEGORIES,
  ANNOUNCEMENT_CATEGORY_LABEL_KEYS,
  USER_ROLES,
  type AnnouncementCategory,
} from '@/shared/config/constants';
import { useUser } from '@/shared/hooks/useAuth';
import { getApiError } from '@/shared/lib/getApiError';
import { companiesCacheRoot } from '@/shared/lib/companyQueryKeys';
import type { Announcement, Company, PaginatedResponse } from '@/shared/types';

type AudienceMode = 'building' | 'company';

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
  padding: '8px 12px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border)',
  background: 'var(--bg-surface)',
  color: 'var(--text-primary)',
  fontSize: 14,
  outline: 'none',
  fontFamily: 'inherit',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: 6,
  fontSize: 12,
  fontWeight: 500,
  color: 'var(--text-secondary)',
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
        onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') onChange(); }}
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

export default function AnnouncementCreatePage() {
  const { t } = useTranslation();
  const user = useUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const isSuperadmin = user?.role === USER_ROLES.SUPERADMIN;

  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [category, setCategory] = useState<AnnouncementCategory>(ANNOUNCEMENT_CATEGORIES.INFO);
  const [isPinned, setIsPinned] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [audience, setAudience] = useState<AudienceMode>(isSuperadmin ? 'building' : 'company');
  const [companyId, setCompanyId] = useState<number | ''>('');
  const [formError, setFormError] = useState<string | null>(null);

  // Sync audience default when role becomes available.
  useEffect(() => {
    setAudience(isSuperadmin ? 'building' : 'company');
  }, [isSuperadmin]);

  // Superadmin only: load companies for the recipient picker.
  const companiesQuery = useQuery({
    queryKey: [...companiesCacheRoot(user?.id), 'list-for-announcement'],
    queryFn: async () => {
      const response = await apiClient.get<PaginatedResponse<Company>>(API.companies.list);
      return response.data;
    },
    enabled: isSuperadmin && audience === 'company',
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
        if (audience === 'building') {
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
      navigate('/announcements');
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
    if (isSuperadmin && audience === 'company' && companyId === '') {
      setFormError(t('announcements.formErrorCompany'));
      return;
    }
    createMutation.mutate();
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-primary">{t('announcements.createTitle')}</h1>
        <p className="text-sm text-secondary">
          {isSuperadmin
            ? t('announcements.createSubtitleSA')
            : t('announcements.createSubtitleCA')}
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-default bg-raised p-5">
        {/* Title */}
        <div>
          <label style={labelStyle} htmlFor="ann-title">
            {t('announcements.fieldTitle')}
          </label>
          <input
            id="ann-title"
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
          <label style={labelStyle} htmlFor="ann-text">
            {t('announcements.fieldText')}
          </label>
          <textarea
            id="ann-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={{ ...inputStyle, height: 'auto', resize: 'none', minHeight: 80 }}
            placeholder={t('announcements.fieldTextPlaceholder')}
            rows={6}
            required
          />
        </div>

        {/* Category toggle buttons */}
        <div>
          <span style={labelStyle}>{t('announcements.categoryLabel')}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {(Object.entries(CAT_CONFIG) as Array<[AnnouncementCategory, typeof CAT_CONFIG[AnnouncementCategory]]>).map(
              ([k, c]) => (
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
              ),
            )}
          </div>
        </div>

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
                onClick={() => setAudience('building')}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  fontSize: 13,
                  fontWeight: audience === 'building' ? 600 : 400,
                  background: audience === 'building' ? 'var(--brand-subtle)' : 'var(--bg-surface)',
                  color: audience === 'building' ? 'var(--brand-text)' : 'var(--text-muted)',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                🏢 {t('announcements.audienceBC')}
              </button>
              <button
                type="button"
                onClick={() => setAudience('company')}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  fontSize: 13,
                  fontWeight: audience === 'company' ? 600 : 400,
                  background: audience === 'company' ? 'var(--brand-subtle)' : 'var(--bg-surface)',
                  color: audience === 'company' ? 'var(--brand-text)' : 'var(--text-muted)',
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
            {audience === 'company' ? (
              <div style={{ marginTop: 10 }}>
                <label style={labelStyle} htmlFor="ann-company">
                  {t('announcements.recipientLabel')}
                </label>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                  {t('announcements.recipientHint')}
                </p>
                <select
                  id="ann-company"
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

        {/* Image upload dropzone */}
        <div>
          <label htmlFor="img-upload" style={labelStyle}>
            {t('announcements.imageLabel')}
          </label>
          <label
            htmlFor="img-upload"
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
            id="img-upload"
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

        {/* Email checkbox */}
        <DSCheckbox
          checked={notifyEmail}
          onChange={() => setNotifyEmail((v) => !v)}
          label={t('announcements.emailLabel')}
          hint={t('announcements.emailHint')}
        />

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

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Link
            to="/announcements"
            className="h-8 px-4 text-sm font-medium rounded-[var(--radius-sm)] text-secondary hover:bg-raised border border-default inline-flex items-center"
          >
            {t('common.cancel')}
          </Link>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="inline-flex items-center gap-1.5 h-8 px-4 text-sm font-medium rounded-[var(--radius-sm)] text-white bg-[color:var(--brand)] hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {createMutation.isPending
              ? t('announcements.publishing')
              : t('announcements.publishBtn')}
          </button>
        </div>
      </form>
    </main>
  );
}
