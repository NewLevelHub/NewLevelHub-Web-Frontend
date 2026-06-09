import { useRef, useState } from 'react';
import ProfileActivitySection from './ProfileActivitySection';
import { useTranslation } from 'react-i18next';
import { dateLocaleTag } from '@/shared/lib/localeFormat';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, Trash2, User, Building2, BadgeCheck, BadgeAlert, Pencil, X, Check } from 'lucide-react';
import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { USER_ROLES, USER_ROLE_LABEL_KEYS } from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';
import { mapApiUser } from '@/shared/lib/mapUser';
import { resolveMediaUrl } from '@/shared/lib/mediaUrl';
import { useAuth } from '@/shared/hooks/useAuth';
import type { User as UserType } from '@/shared/types';
import { ChangePasswordSection } from './ChangePasswordSection';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_AVATAR_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const ROLE_BADGE_COLORS: Record<string, string> = {
  [USER_ROLES.SUPERADMIN]: 'bg-purple-100 text-purple-800',
  [USER_ROLES.COMPANY_ADMIN]: 'bg-blue-100 text-blue-800',
  [USER_ROLES.EMPLOYEE]: 'bg-green-100 text-green-800',
  [USER_ROLES.GUEST]: 'bg-gray-100 text-gray-700',
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
  const sizeClass = `w-${size / 4} h-${size / 4}`;
  const initials = getInitials(firstName, lastName);
  const avatarSrc = resolveMediaUrl(src) ?? src;

  if (avatarSrc) {
    return (
      <img
        src={avatarSrc}
        alt={`${firstName} ${lastName}`}
        style={{ width: size, height: size }}
        className="rounded-full object-cover ring-2 ring-white shadow"
      />
    );
  }

  return (
    <div
      style={{ width: size, height: size }}
      className={cn(
        sizeClass,
        'rounded-full bg-blue-600 flex items-center justify-center ring-2 ring-white shadow',
      )}
      aria-label={`Аватар: ${initials}`}
    >
      <span className="text-white font-semibold text-xl select-none">{initials}</span>
    </div>
  );
}

interface AlertProps {
  type: 'success' | 'error';
  message: string;
}

function Alert({ type, message }: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        'rounded-lg px-4 py-3 text-sm font-medium',
        type === 'success' && 'bg-green-50 text-green-800 border border-green-200',
        type === 'error' && 'bg-red-50 text-red-800 border border-red-200',
      )}
    >
      {message}
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
  const { fetchMe } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [formAlert, setFormAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const { data: profile, isLoading, isError } = useQuery<UserType>({
    queryKey: ['profile'],
    queryFn: () =>
      apiClient.get<Record<string, unknown>>(API.profile.me).then((r) => mapApiUser(r.data)),
  });

  // ---------------------------------------------------------------------------
  // Form state (controlled by profile data)
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
      setAvatarPreview(null);
      setAvatarError(null);
    },
    onError: () => {
      setAvatarPreview(null);
      setAvatarError('Не удалось загрузить аватар. Попробуйте снова.');
    },
  });

  const deleteAvatarMutation = useMutation({
    mutationFn: () => apiClient.delete(API.profile.deleteAvatar),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
      await fetchMe();
      setAvatarPreview(null);
      setAvatarError(null);
    },
    onError: () => {
      setAvatarError('Не удалось удалить аватар. Попробуйте снова.');
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
      setAvatarError('Файл слишком большой. Максимальный размер — 5 МБ.');
      // Reset input so the same file can be re-selected after fixing
      e.target.value = '';
      return;
    }
    if (!ALLOWED_AVATAR_MIME_TYPES.has(file.type)) {
      setAvatarError('Допустимые форматы: JPEG, PNG или WebP.');
      e.target.value = '';
      return;
    }

    setAvatarError(null);
    setAvatarPreview(URL.createObjectURL(file));
    avatarUploadMutation.mutate(file);
    // Reset so the same file triggers onChange next time if needed
    e.target.value = '';
  }

  // ---------------------------------------------------------------------------
  // Loading / error states
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64" aria-busy="true" aria-label="Загрузка профиля">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-gray-200" />
          <div className="w-40 h-4 rounded bg-gray-200" />
          <div className="w-56 h-3 rounded bg-gray-200" />
        </div>
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <p className="text-red-600 font-medium">Не удалось загрузить профиль. Попробуйте перезагрузить страницу.</p>
      </div>
    );
  }

  const roleLabel = t(USER_ROLE_LABEL_KEYS[profile.role as keyof typeof USER_ROLE_LABEL_KEYS] ?? profile.role);
  const roleBadgeColor = ROLE_BADGE_COLORS[profile.role] ?? 'bg-gray-100 text-gray-700';
  const isAvatarBusy = avatarUploadMutation.isPending || deleteAvatarMutation.isPending;
  const companyName = profile.company?.name ?? profile.company_name;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <main className="max-w-2xl mx-auto px-3 py-4 sm:px-4 sm:py-6 md:py-8 space-y-6">
      <h1 className="text-2xl font-bold text-primary">Мой профиль</h1>

      {/* ---- Profile card ---- */}
      <section
        className="bg-surface rounded-2xl shadow-sm border border-default p-6 space-y-5"
        aria-label="Информация о профиле"
      >
        {/* Avatar row */}
        <div className="flex items-center gap-5">
          <div className="relative shrink-0">
            <Avatar
              src={avatarPreview ?? profile.avatar}
              firstName={profile.first_name}
              lastName={profile.last_name}
              size={80}
            />
            {isAvatarBusy && (
              <div
                className="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center"
                aria-hidden="true"
              >
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            <p className="text-xl font-semibold text-primary truncate">
              {profile.first_name} {profile.last_name}
            </p>
            <p className="text-sm text-muted truncate">{profile.email}</p>
            <span className={cn('inline-block text-xs font-medium px-2.5 py-0.5 rounded-full', roleBadgeColor)}>
              {roleLabel}
            </span>
          </div>
        </div>

        {/* Avatar actions */}
        <div className="flex flex-wrap gap-2" role="group" aria-label="Управление аватаром">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            lang={dateLocale}
            aria-label="Выбрать файл аватара"
            onChange={handleAvatarFileChange}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isAvatarBusy}
            className={cn(
              'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              'bg-blue-50 text-blue-700 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
              isAvatarBusy && 'opacity-50 cursor-not-allowed',
            )}
          >
            <Camera size={15} aria-hidden="true" />
            Загрузить аватар
          </button>

          {profile.avatar && (
            <button
              type="button"
              onClick={() => deleteAvatarMutation.mutate()}
              disabled={isAvatarBusy}
              className={cn(
                'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                'bg-red-50 text-red-700 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500',
                isAvatarBusy && 'opacity-50 cursor-not-allowed',
              )}
            >
              <Trash2 size={15} aria-hidden="true" />
              Удалить аватар
            </button>
          )}
        </div>

        {avatarError && <Alert type="error" message={avatarError} />}

        {/* Meta info */}
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm pt-1">
          <div className="flex items-center gap-2">
            {profile.is_email_verified ? (
              <BadgeCheck size={16} className="text-green-600 shrink-0" aria-hidden="true" />
            ) : (
              <BadgeAlert size={16} className="text-amber-500 shrink-0" aria-hidden="true" />
            )}
            <span
              className={cn(
                'font-medium',
                profile.is_email_verified ? 'text-green-700' : 'text-amber-600',
              )}
            >
              {profile.is_email_verified ? t('auth.verify.successTitle') : t('common.notVerifiedEmail')}
            </span>
          </div>

          {companyName && (
            <div className="flex items-center gap-2 text-muted">
              <Building2 size={16} className="shrink-0 text-secondary" aria-hidden="true" />
              <span>{companyName}</span>
            </div>
          )}

          {profile.position && (
            <div className="flex items-center gap-2 text-muted">
              <User size={16} className="shrink-0 text-secondary" aria-hidden="true" />
              <span>{profile.position}</span>
            </div>
          )}
        </dl>
      </section>

      {/* ---- Edit form ---- */}
      <section
        className="bg-surface rounded-2xl shadow-sm border border-default p-6"
        aria-label="Редактирование профиля"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-primary">Личные данные</h2>
          {!isEditing && (
            <button
              type="button"
              onClick={startEditing}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
            >
              <Pencil size={14} aria-hidden="true" />{t('common.edit')}</button>
          )}
        </div>

        {formAlert && !isEditing && (
          <div className="mb-4">
            <Alert type={formAlert.type} message={formAlert.message} />
          </div>
        )}

        {isEditing ? (
          <form onSubmit={handleFormSubmit} noValidate className="space-y-4" aria-label="Форма редактирования профиля">
            {formAlert && (
              <Alert type={formAlert.type} message={formAlert.message} />
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">{t('common.firstName')}</label>
                <input
                  id="first_name"
                  name="first_name"
                  type="text"
                  value={form.first_name}
                  onChange={handleFormChange}
                  autoComplete="given-name"
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-primary placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('common.firstName')}
                />
              </div>

              <div>
                <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">{t('common.lastName')}</label>
                <input
                  id="last_name"
                  name="last_name"
                  type="text"
                  value={form.last_name}
                  onChange={handleFormChange}
                  autoComplete="family-name"
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-primary placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('common.lastName')}
                />
              </div>
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Телефон
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={form.phone}
                onChange={handleFormChange}
                autoComplete="tel"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-primary placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="+7 (___) ___-__-__"
              />
            </div>

            <div>
              <label htmlFor="position" className="block text-sm font-medium text-gray-700 mb-1">{t('team.position')}</label>
              <input
                id="position"
                name="position"
                type="text"
                value={form.position}
                onChange={handleFormChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-primary placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={t('common.positionExample')}
              />
            </div>

            {/* Read-only fields */}
            <div>
              <label className="block text-sm font-medium text-muted mb-1">
                Email
                <span className="ml-2 text-xs font-normal text-secondary">(нельзя изменить)</span>
              </label>
              <input
                type="email"
                value={profile.email}
                readOnly
                disabled
                aria-readonly="true"
                className="w-full rounded-lg border border-default bg-gray-50 px-3 py-2 text-sm text-muted cursor-not-allowed"
              />
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-primary bg-blue-600 hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors',
                  updateMutation.isPending && 'opacity-60 cursor-not-allowed',
                )}
              >
                {updateMutation.isPending ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                    Сохраняем...
                  </>
                ) : (
                  <>
                    <Check size={15} aria-hidden="true" />{t('common.save')}</>
                )}
              </button>

              <button
                type="button"
                onClick={cancelEditing}
                disabled={updateMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 transition-colors"
              >
                <X size={15} aria-hidden="true" />
                Отменить
              </button>
            </div>
          </form>
        ) : (
          <dl className="space-y-4 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <dt className="text-muted mb-0.5">{t('common.firstName')}</dt>
                <dd className="font-medium text-primary">{profile.first_name || '—'}</dd>
              </div>
              <div>
                <dt className="text-muted mb-0.5">{t('common.lastName')}</dt>
                <dd className="font-medium text-primary">{profile.last_name || '—'}</dd>
              </div>
            </div>

            <div>
              <dt className="text-muted mb-0.5">
                Email
                <span className="ml-2 text-xs text-secondary">(нельзя изменить)</span>
              </dt>
              <dd className="font-medium text-primary">{profile.email}</dd>
            </div>

            <div>
              <dt className="text-muted mb-0.5">Телефон</dt>
              <dd className="font-medium text-primary">{profile.phone || '—'}</dd>
            </div>

            <div>
              <dt className="text-muted mb-0.5">{t('team.position')}</dt>
              <dd className="font-medium text-primary">{profile.position || '—'}</dd>
            </div>
          </dl>
        )}
      </section>

      <ProfileActivitySection />
      <ChangePasswordSection />
    </main>
  );
}
