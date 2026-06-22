import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { dateLocaleTag } from '@/shared/lib/localeFormat';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Camera,
  Trash2,
  Building2,
  Pencil,
  X,
  Check,
  AlertTriangle,
  Mail,
} from 'lucide-react';
import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { USER_ROLES, USER_ROLE_LABEL_KEYS } from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';
import { mapApiUser } from '@/shared/lib/mapUser';
import { resolveMediaUrl } from '@/shared/lib/mediaUrl';
import { useAuth } from '@/shared/hooks/useAuth';
import type { User as UserType } from '@/shared/types';
import { ChangePasswordSection } from './ChangePasswordSection';
import ProfileActivitySection from './ProfileActivitySection';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_AVATAR_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

// Role badge uses hex-alpha tints (18 = ~10% opacity) on top of CSS var colors.
// This matches DS reference: `background: ${color}18` pattern.
const ROLE_BADGE_STYLE: Record<string, { bg: string; color: string }> = {
  [USER_ROLES.SUPERADMIN]: { bg: 'var(--info)', color: 'var(--info)' },
  [USER_ROLES.COMPANY_ADMIN]: { bg: 'var(--brand)', color: 'var(--brand)' },
  [USER_ROLES.EMPLOYEE]: { bg: 'var(--success)', color: 'var(--success-text)' },
  [USER_ROLES.GUEST]: { bg: 'var(--text-muted)', color: 'var(--text-muted)' },
  [USER_ROLES.RECEPTION]: { bg: 'var(--warning)', color: 'var(--warning-text)' },
  [USER_ROLES.SERVICE_MANAGER]: { bg: 'var(--warning)', color: 'var(--warning-text)' },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(firstName: string, lastName: string): string {
  const f = firstName.trim()[0] ?? '';
  const l = lastName.trim()[0] ?? '';
  return (f + l).toUpperCase() || '?';
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface AvatarProps {
  src: string | null;
  firstName: string;
  lastName: string;
  size?: number;
}

function Avatar({ src, firstName, lastName, size = 80 }: AvatarProps) {
  const initials = getInitials(firstName, lastName);
  const avatarSrc = resolveMediaUrl(src) ?? src;

  if (avatarSrc) {
    return (
      <img
        src={avatarSrc}
        alt={`${firstName} ${lastName}`}
        style={{ width: size, height: size, borderRadius: 20 }}
        className="object-cover ring-2 ring-white shadow"
      />
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 20,
        background: 'linear-gradient(135deg, var(--brand), var(--brand-hover))',
      }}
      className="flex items-center justify-center ring-2 ring-white shadow"
      aria-label={`${firstName} ${lastName}`}
    >
      <span className="text-white font-semibold text-xl select-none">{initials}</span>
    </div>
  );
}

interface AlertBannerProps {
  type: 'success' | 'error';
  message: string;
}

function AlertBanner({ type, message }: AlertBannerProps) {
  return (
    <div
      role="alert"
      className="rounded-lg px-4 py-3 text-sm font-medium"
      style={
        type === 'success'
          ? {
              background: 'var(--success-bg)',
              color: 'var(--success-text)',
              border: '1px solid var(--success)',
            }
          : {
              background: 'var(--danger-bg)',
              color: 'var(--danger-text)',
              border: '1px solid var(--danger)',
            }
      }
    >
      {message}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Delete account confirmation modal
// ---------------------------------------------------------------------------

interface DeleteAccountModalProps {
  onClose: () => void;
  onConfirm: () => void;
  isPending?: boolean;
}

function DeleteAccountModal({ onClose, onConfirm, isPending = false }: DeleteAccountModalProps) {
  const { t } = useTranslation();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => !isPending && e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-account-title"
    >
      <div className="relative w-full max-w-[560px] rounded-2xl border border-default bg-surface shadow-xl overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between px-[22px] pt-[18px] pb-[14px]">
          <div className="min-w-0 pr-4 flex items-center gap-3">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
              style={{ background: 'var(--danger-bg)' }}
            >
              <AlertTriangle size={16} style={{ color: 'var(--danger)' }} aria-hidden="true" />
            </div>
            <div>
              <h2
                id="delete-account-title"
                className="text-base font-semibold text-primary tracking-[-0.015em]"
              >
                {t('profile.deleteAccountConfirmTitle')}
              </h2>
              <p className="text-xs text-muted mt-0.5">{t('profile.deleteAccountConfirmDesc')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="shrink-0 flex items-center justify-center w-7 h-7 rounded-lg text-secondary hover:bg-raised hover:text-primary focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)] disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label={t('common.close')}
          >
            <X size={14} />
          </button>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-[color:var(--border-faint)] px-[22px] pt-[14px] pb-[18px] mt-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="h-8 px-4 text-sm font-medium text-secondary hover:bg-raised rounded-[var(--radius-sm)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 h-8 px-4 text-sm font-medium rounded-[var(--radius-sm)] text-white hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ background: 'var(--danger)' }}
          >
            {isPending ? (
              <>
                <span
                  className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"
                  aria-hidden="true"
                />
                {t('profile.deleteAccount')}
              </>
            ) : (
              t('profile.deleteAccount')
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function ProfilePage() {
  const { t, i18n } = useTranslation();
  const dateLocale = dateLocaleTag(i18n.language);
  const queryClient = useQueryClient();
  const { fetchMe, logout } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [formAlert, setFormAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const { data: profile, isLoading, isError } = useQuery<UserType>({
    queryKey: ['profile'],
    queryFn: () =>
      apiClient.get<Record<string, unknown>>(API.profile.me).then((r) => mapApiUser(r.data)),
  });

  // ---------------------------------------------------------------------------
  // Form state
  // ---------------------------------------------------------------------------

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    position: '',
  });

  function startEditing() {
    if (!profile) return;
    setForm({
      first_name: profile.first_name,
      last_name: profile.last_name,
      phone: profile.phone ?? '',
      position: profile.position ?? '',
    });
    setFormAlert(null);
    setIsEditing(true);
  }

  function cancelEditing() {
    setIsEditing(false);
    setFormAlert(null);
  }

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------

  const updateMutation = useMutation({
    mutationFn: (payload: { first_name: string; last_name: string; phone: string; position: string }) => {
      const formData = new FormData();
      formData.append('first_name', payload.first_name);
      formData.append('last_name', payload.last_name);
      if (payload.phone) formData.append('phone', payload.phone);
      if (payload.position) formData.append('position', payload.position);
      return apiClient.patch<Record<string, unknown>>(API.profile.update, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
      await fetchMe();
      setIsEditing(false);
      setFormAlert({ type: 'success', message: t('profile.updateSuccess') });
    },
    onError: () => {
      setFormAlert({ type: 'error', message: t('profile.updateError') });
    },
  });

  const avatarUploadMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('avatar', file);
      return apiClient.patch<Record<string, unknown>>(API.profile.update, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
      await fetchMe();
      await queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
      await queryClient.invalidateQueries({ queryKey: ['company-members'] });
      await queryClient.invalidateQueries({ queryKey: ['company-directory'] });
      await queryClient.invalidateQueries({ queryKey: ['company-directory-profile'] });
      setAvatarPreview(null);
      setAvatarError(null);
    },
    onError: () => {
      setAvatarPreview(null);
      setAvatarError(t('profile.avatarUploadError'));
    },
  });

  const deleteAvatarMutation = useMutation({
    mutationFn: () => apiClient.delete(API.profile.deleteAvatar),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
      await fetchMe();
      await queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
      await queryClient.invalidateQueries({ queryKey: ['company-members'] });
      await queryClient.invalidateQueries({ queryKey: ['company-directory'] });
      await queryClient.invalidateQueries({ queryKey: ['company-directory-profile'] });
      setAvatarPreview(null);
      setAvatarError(null);
    },
    onError: () => {
      setAvatarError(t('profile.avatarDeleteError'));
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: () => apiClient.delete(API.profile.deleteAccount),
    onSuccess: () => {
      logout();
    },
    onError: () => {
      setShowDeleteModal(false);
      setDeleteError(t('profile.deleteAccountError'));
    },
  });

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function handleFormChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateMutation.mutate(form);
  }

  function handleAvatarFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      setAvatarError(t('profile.avatarTooLarge'));
      e.target.value = '';
      return;
    }
    if (!ALLOWED_AVATAR_MIME_TYPES.has(file.type)) {
      setAvatarError(t('profile.avatarFormat'));
      e.target.value = '';
      return;
    }

    setAvatarError(null);
    setAvatarPreview(URL.createObjectURL(file));
    avatarUploadMutation.mutate(file);
    e.target.value = '';
  }

  function handleDeleteAccountConfirm() {
    deleteAccountMutation.mutate();
  }

  // ---------------------------------------------------------------------------
  // Loading / error states
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center min-h-64"
        aria-busy="true"
        aria-label={t('profile.loadingProfile')}
      >
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-20 h-20 rounded-xl bg-raised" />
          <div className="w-40 h-4 rounded bg-raised" />
          <div className="w-56 h-3 rounded bg-raised" />
        </div>
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <p className="text-sm font-medium" style={{ color: 'var(--danger-text)' }}>
          {t('profile.loadError')}
        </p>
      </div>
    );
  }

  const roleLabel = t(USER_ROLE_LABEL_KEYS[profile.role as keyof typeof USER_ROLE_LABEL_KEYS] ?? profile.role);
  const roleBadgeStyle = ROLE_BADGE_STYLE[profile.role] ?? { bg: 'var(--text-muted)', color: 'var(--text-muted)' };
  const isAvatarBusy = avatarUploadMutation.isPending || deleteAvatarMutation.isPending;
  const companyName = profile.company?.name ?? profile.company_name;

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

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <main className="px-3 py-4 sm:px-4 sm:py-6 md:py-8">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-primary">{t('profile.myProfile')}</h1>
        <span
          className="inline-block text-xs font-medium px-2.5 py-0.5 rounded-full"
          style={{
            background: `color-mix(in srgb, ${roleBadgeStyle.bg} 12%, transparent)`,
            color: roleBadgeStyle.color,
          }}
        >
          {roleLabel}
        </span>
      </div>

      {/* Two-column grid: single column on mobile, 300px + 1fr on md+ */}
      <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-4 md:items-stretch">
        {/* ============================================================
            LEFT COLUMN
            ============================================================ */}
        <div className="flex flex-col gap-4">
          {/* Profile card */}
          <section
            className="bg-surface rounded-2xl shadow-sm border border-default p-6"
            aria-label={t('profile.profileInfo')}
          >
            {/* Avatar + online dot */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <Avatar
                  src={avatarPreview ?? profile.avatar}
                  firstName={profile.first_name}
                  lastName={profile.last_name}
                  size={80}
                />
                {/* Online dot */}
                <span
                  className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white"
                  style={{ background: 'var(--success)' }}
                  aria-hidden="true"
                />
                {isAvatarBusy && (
                  <div
                    className="absolute inset-0 rounded-xl bg-black/30 flex items-center justify-center"
                    aria-hidden="true"
                  >
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>

              {/* Name + role + company + email */}
              <div className="text-center space-y-1 w-full min-w-0">
                <p
                  className="text-primary truncate"
                  style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.015em' }}
                >
                  {profile.first_name} {profile.last_name}
                </p>
                {profile.position && (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }} className="truncate">
                    {profile.position}
                  </p>
                )}
                <span
                  className="inline-block text-xs font-medium px-2.5 py-0.5 rounded-full"
                  style={{
                    background: `color-mix(in srgb, ${roleBadgeStyle.bg} 12%, transparent)`,
                    color: roleBadgeStyle.color,
                  }}
                >
                  {roleLabel}
                </span>
                {companyName && (
                  <div className="flex items-center justify-center gap-1.5 text-xs text-muted mt-1">
                    <Building2 size={12} className="shrink-0 text-secondary" aria-hidden="true" />
                    <span className="truncate">{companyName}</span>
                  </div>
                )}
                {/* Email row with verification inline */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontSize: 12, color: 'var(--text-muted)' }}>
                  <Mail size={11} aria-hidden="true" />
                  <span className="truncate">{profile.email}</span>
                  {profile.is_email_verified && (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                      <path d="M5 12l5 5L20 7" />
                    </svg>
                  )}
                </div>
                {!profile.is_email_verified && (
                  <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: 'rgba(180,83,9,0.1)', color: 'var(--warning)', fontWeight: 600 }}>
                    {t('common.notVerifiedEmail')}
                  </span>
                )}
              </div>

              {/* Avatar action buttons */}
              <div
                role="group"
                aria-label={t('profile.avatarManage')}
                style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  lang={dateLocale}
                  aria-label={t('profile.selectAvatar')}
                  onChange={handleAvatarFileChange}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isAvatarBusy}
                  className={cn(
                    'inline-flex items-center gap-1.5 w-full justify-center h-8 px-3 text-sm font-medium rounded-[var(--radius-sm)] transition-colors',
                    'border border-[color:var(--border)] text-secondary hover:bg-raised',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand)]',
                    isAvatarBusy && 'opacity-50 cursor-not-allowed',
                  )}
                >
                  <Camera size={13} aria-hidden="true" />
                  {profile.avatar ? t('profile.changeAvatar') : t('profile.uploadAvatar')}
                </button>

                {profile.avatar && (
                  <button
                    type="button"
                    onClick={() => deleteAvatarMutation.mutate()}
                    disabled={isAvatarBusy}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2',
                      isAvatarBusy && 'opacity-50 cursor-not-allowed',
                    )}
                    style={{
                      width: '100%',
                      justifyContent: 'center',
                      background: 'transparent',
                      color: 'var(--danger)',
                      border: '1px solid rgba(185,28,28,0.25)',
                    }}
                  >
                    <Trash2 size={13} aria-hidden="true" />
                    {t('profile.deleteAvatar')}
                  </button>
                )}
              </div>

              {avatarError && (
                <div className="w-full">
                  <AlertBanner type="error" message={avatarError} />
                </div>
              )}
            </div>
          </section>

          {/* Activity section */}
          <ProfileActivitySection />
        </div>

        {/* ============================================================
            RIGHT COLUMN
            ============================================================ */}
        <div className="flex flex-col gap-4 justify-between">
          {/* Personal data card */}
          <section
            className="bg-surface rounded-2xl shadow-sm border border-default p-6"
            aria-label={t('profile.editSection')}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-primary">{t('profile.personalData')}</h2>
              {!isEditing && (
                <button
                  type="button"
                  onClick={startEditing}
                  className="inline-flex items-center gap-1.5 h-8 px-3 text-sm font-medium rounded-[var(--radius-sm)] text-brand hover:bg-brand-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand)]"
                >
                  <Pencil size={13} aria-hidden="true" />
                  {t('common.edit')}
                </button>
              )}
            </div>

            {formAlert && !isEditing && (
              <div className="mb-4">
                <AlertBanner type={formAlert.type} message={formAlert.message} />
              </div>
            )}

            {isEditing ? (
              <form
                onSubmit={handleFormSubmit}
                noValidate
                className="space-y-4"
                aria-label={t('profile.editForm')}
              >
                {formAlert && (
                  <AlertBanner type={formAlert.type} message={formAlert.message} />
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="first_name" style={labelStyle}>
                      {t('common.firstName')}
                    </label>
                    <input
                      id="first_name"
                      name="first_name"
                      type="text"
                      value={form.first_name}
                      onChange={handleFormChange}
                      autoComplete="given-name"
                      required
                      style={inputStyle}
                      placeholder={t('common.firstName')}
                    />
                  </div>

                  <div>
                    <label htmlFor="last_name" style={labelStyle}>
                      {t('common.lastName')}
                    </label>
                    <input
                      id="last_name"
                      name="last_name"
                      type="text"
                      value={form.last_name}
                      onChange={handleFormChange}
                      autoComplete="family-name"
                      required
                      style={inputStyle}
                      placeholder={t('common.lastName')}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="phone" style={labelStyle}>
                    {t('profile.phone')}
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={form.phone}
                    onChange={handleFormChange}
                    autoComplete="tel"
                    style={inputStyle}
                    placeholder="+7 (___) ___-__-__"
                  />
                </div>

                <div>
                  <label htmlFor="position" style={labelStyle}>
                    {t('team.position')}
                  </label>
                  <input
                    id="position"
                    name="position"
                    type="text"
                    value={form.position}
                    onChange={handleFormChange}
                    style={inputStyle}
                    placeholder={t('common.positionExample')}
                  />
                </div>

                {/* Read-only email */}
                <div>
                  <label style={labelStyle}>{t('profile.emailReadonly')}</label>
                  <input
                    type="email"
                    value={profile.email}
                    readOnly
                    disabled
                    aria-readonly="true"
                    style={{
                      ...inputStyle,
                      background: 'var(--bg-raised)',
                      color: 'var(--text-muted)',
                      cursor: 'not-allowed',
                    }}
                  />
                </div>

                <div className="flex items-center gap-3 pt-1" style={{ justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={cancelEditing}
                    disabled={updateMutation.isPending}
                    className="h-8 px-4 text-sm font-medium text-secondary hover:bg-raised rounded-[var(--radius-sm)] transition-colors"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <X size={14} aria-hidden="true" />
                      {t('common.cancel')}
                    </span>
                  </button>

                  <button
                    type="submit"
                    disabled={updateMutation.isPending}
                    className={cn(
                      'inline-flex items-center gap-2 h-8 px-4 text-sm font-medium rounded-[var(--radius-sm)]',
                      'text-white bg-[color:var(--brand)] hover:opacity-90 transition-opacity',
                      'disabled:opacity-60 disabled:cursor-not-allowed',
                    )}
                  >
                    {updateMutation.isPending ? (
                      <>
                        <span
                          className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
                          aria-hidden="true"
                        />
                        {t('profile.saving')}
                      </>
                    ) : (
                      <>
                        <Check size={14} aria-hidden="true" />
                        {t('common.save')}
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)' }}>
                      {t('common.firstName')}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-primary)', padding: '9px 0', borderBottom: '1px solid var(--border-faint)' }}>
                      {profile.first_name || '—'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)' }}>
                      {t('common.lastName')}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-primary)', padding: '9px 0', borderBottom: '1px solid var(--border-faint)' }}>
                      {profile.last_name || '—'}
                    </div>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)' }}>
                    {t('profile.phone')}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', padding: '9px 0', borderBottom: '1px solid var(--border-faint)' }}>
                    {profile.phone || '—'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)' }}>
                    {t('profile.emailReadonly')}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', padding: '9px 0', borderBottom: '1px solid var(--border-faint)' }}>
                    {profile.email}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)' }}>
                    {t('team.position')}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', padding: '9px 0', borderBottom: '1px solid var(--border-faint)' }}>
                    {profile.position || '—'}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Change password */}
          <ChangePasswordSection />

          {/* Danger zone */}
          <section
            className="bg-surface rounded-2xl shadow-sm border border-default p-6"
            aria-label={t('profile.dangerZone')}
          >
            <h2
              className="text-base font-semibold mb-3"
              style={{ color: 'var(--danger)' }}
            >
              {t('profile.dangerZone')}
            </h2>
            {deleteError && (
              <div className="mb-4">
                <AlertBanner type="error" message={deleteError} />
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 3 }}>
                  {t('profile.deleteAccount')}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {t('profile.deleteAccountDesc')}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="inline-flex items-center gap-2 h-8 px-4 text-sm font-medium rounded-[var(--radius-sm)] transition-opacity hover:opacity-80"
                style={{
                  flexShrink: 0,
                  background: 'transparent',
                  color: 'var(--danger)',
                  border: '1px solid rgba(185,28,28,0.25)',
                  whiteSpace: 'nowrap',
                }}
              >
                <Trash2 size={14} aria-hidden="true" />
                {t('profile.deleteAccount')}
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* Delete account confirmation modal */}
      {showDeleteModal && (
        <DeleteAccountModal
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteAccountConfirm}
          isPending={deleteAccountMutation.isPending}
        />
      )}
    </main>
  );
}
