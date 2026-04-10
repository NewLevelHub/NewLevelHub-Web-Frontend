import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  MapPin,
  Hash,
  CalendarDays,
  Users,
  HardDrive,
  Pencil,
  X,
  Check,
  Upload,
  AlertTriangle,
} from 'lucide-react';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { USER_ROLES, COMPANY_TIERS } from '@/shared/config/constants';
import { useAuth } from '@/shared/hooks/useAuth';
import { cn } from '@/shared/lib/cn';
import type { CompanyDetail } from '@/shared/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const PLAN_LABELS: Record<string, string> = {
  [COMPANY_TIERS.BASIC]: 'Базовый',
  [COMPANY_TIERS.STANDARD]: 'Стандарт',
  [COMPANY_TIERS.PREMIUM]: 'Премиум',
};

const PLAN_BADGE_COLORS: Record<string, string> = {
  [COMPANY_TIERS.BASIC]: 'bg-gray-100 text-gray-700',
  [COMPANY_TIERS.STANDARD]: 'bg-blue-100 text-blue-700',
  [COMPANY_TIERS.PREMIUM]: 'bg-purple-100 text-purple-700',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface InfoRowProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}

function InfoRow({ icon, label, value }: InfoRowProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-gray-400 shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
        <p className="text-sm font-medium text-gray-900 break-words">{value}</p>
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}

function StatCard({ icon, label, value }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 text-blue-600">
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <main className="px-4 py-8 max-w-4xl mx-auto space-y-6 animate-pulse">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 rounded-lg bg-gray-200" />
        <div className="w-40 h-4 rounded bg-gray-200" />
      </div>
      <div className="w-56 h-7 rounded bg-gray-200" />

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-start gap-6">
          <div className="w-24 h-24 rounded-2xl bg-gray-200 shrink-0" />
          <div className="flex-1 space-y-3 pt-2">
            <div className="w-48 h-6 rounded bg-gray-200" />
            <div className="w-64 h-4 rounded bg-gray-200" />
            <div className="flex gap-2">
              <div className="w-20 h-5 rounded-full bg-gray-200" />
              <div className="w-20 h-5 rounded-full bg-gray-200" />
            </div>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-4 h-4 rounded bg-gray-200" />
              <div className="w-32 h-4 rounded bg-gray-200" />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gray-200" />
              <div className="space-y-2">
                <div className="w-12 h-6 rounded bg-gray-200" />
                <div className="w-24 h-4 rounded bg-gray-200" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

// ─── Edit form ────────────────────────────────────────────────────────────────

interface EditFormData {
  name: string;
  description: string;
  contact_email: string;
  contact_phone: string;
  floor: string;
  office_number: string;
  plan: string;
  max_employees: string;
  storage_limit_gb: string;
}

interface EditFormProps {
  company: CompanyDetail;
  isSuperadmin: boolean;
  onCancel: () => void;
  onSaved: () => void;
}

function EditForm({ company, isSuperadmin, onCancel, onSaved }: EditFormProps) {
  const queryClient = useQueryClient();

  const [form, setForm] = useState<EditFormData>({
    name: company.name,
    description: company.description ?? '',
    contact_email: company.contact_email ?? '',
    contact_phone: company.contact_phone ?? '',
    floor: company.floor != null ? String(company.floor) : '',
    office_number: company.office_number ?? '',
    plan: company.plan,
    max_employees: String(company.max_employees),
    storage_limit_gb: String(company.storage_limit_gb),
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { mutate, isPending } = useMutation({
    mutationFn: () => {
      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('description', form.description);
      formData.append('contact_email', form.contact_email);
      formData.append('contact_phone', form.contact_phone);
      if (isSuperadmin) {
        if (form.floor) formData.append('floor', form.floor);
        if (form.office_number) formData.append('office_number', form.office_number);
        formData.append('plan', form.plan);
        formData.append('max_employees', form.max_employees);
        formData.append('storage_limit_gb', form.storage_limit_gb);
      }
      if (logoFile) formData.append('logo', logoFile);

      return apiClient.patch<CompanyDetail>(
        API.companies.detail(String(company.id)),
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company', String(company.id)] });
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      onSaved();
    },
    onError: (error: unknown) => {
      const axiosError = error as {
        response?: { data?: Record<string, string[]> };
      };
      const responseData = axiosError?.response?.data;
      if (responseData && typeof responseData === 'object') {
        const errors: Record<string, string> = {};
        for (const [key, messages] of Object.entries(responseData)) {
          if (Array.isArray(messages)) {
            errors[key] = messages[0] ?? '';
          }
        }
        setFieldErrors(errors);
        setGeneralError(null);
      } else {
        setGeneralError('Не удалось сохранить изменения. Попробуйте ещё раз.');
      }
    },
  });

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    const url = URL.createObjectURL(file);
    setLogoPreview(url);
  }

  function handleField(field: keyof EditFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGeneralError(null);
    setFieldErrors({});
    mutate();
  }

  const inputClass = (field: string) =>
    cn(
      'w-full px-3 py-2 text-sm rounded-lg border text-gray-900 focus:outline-none focus:ring-2 focus:border-transparent',
      fieldErrors[field]
        ? 'border-red-400 focus:ring-red-500'
        : 'border-gray-300 focus:ring-blue-500',
    );

  return (
    <form onSubmit={handleSubmit} noValidate aria-label="Редактирование компании">
      <div className="space-y-4">
        {generalError && (
          <div
            role="alert"
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm"
          >
            <AlertTriangle size={15} className="shrink-0" aria-hidden="true" />
            {generalError}
          </div>
        )}

        {/* Logo upload */}
        <div>
          <p className="text-xs text-gray-500 mb-2">Логотип</p>
          <div className="flex items-center gap-4">
            {logoPreview || company.logo ? (
              <img
                src={logoPreview ?? company.logo!}
                alt="Логотип компании"
                className="w-16 h-16 rounded-xl object-cover border border-gray-200"
              />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-blue-50 flex items-center justify-center border border-gray-200">
                <Building2 className="w-7 h-7 text-blue-400" aria-hidden="true" />
              </div>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors"
            >
              <Upload size={14} aria-hidden="true" />
              Загрузить логотип
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              className="sr-only"
              aria-label="Выбрать файл логотипа"
            />
          </div>
        </div>

        {/* Name */}
        <div>
          <label htmlFor="edit-name" className="block text-xs text-gray-500 mb-1">
            Название <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <input
            id="edit-name"
            type="text"
            required
            value={form.name}
            onChange={(e) => handleField('name', e.target.value)}
            className={inputClass('name')}
          />
          {fieldErrors.name && (
            <p className="mt-1 text-xs text-red-600" role="alert">{fieldErrors.name}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label htmlFor="edit-description" className="block text-xs text-gray-500 mb-1">
            Описание
          </label>
          <textarea
            id="edit-description"
            rows={3}
            value={form.description}
            onChange={(e) => handleField('description', e.target.value)}
            className={cn(inputClass('description'), 'resize-none')}
          />
        </div>

        {/* Contact email */}
        <div>
          <label htmlFor="edit-contact-email" className="block text-xs text-gray-500 mb-1">
            Контактный email
          </label>
          <input
            id="edit-contact-email"
            type="email"
            value={form.contact_email}
            onChange={(e) => handleField('contact_email', e.target.value)}
            className={inputClass('contact_email')}
          />
          {fieldErrors.contact_email && (
            <p className="mt-1 text-xs text-red-600" role="alert">{fieldErrors.contact_email}</p>
          )}
        </div>

        {/* Contact phone */}
        <div>
          <label htmlFor="edit-contact-phone" className="block text-xs text-gray-500 mb-1">
            Контактный телефон
          </label>
          <input
            id="edit-contact-phone"
            type="tel"
            value={form.contact_phone}
            onChange={(e) => handleField('contact_phone', e.target.value)}
            className={inputClass('contact_phone')}
          />
          {fieldErrors.contact_phone && (
            <p className="mt-1 text-xs text-red-600" role="alert">{fieldErrors.contact_phone}</p>
          )}
        </div>

        {/* Superadmin-only fields */}
        {isSuperadmin && (
          <>
            <div className="grid grid-cols-2 gap-4">
              {/* Floor */}
              <div>
                <label htmlFor="edit-floor" className="block text-xs text-gray-500 mb-1">
                  Этаж
                </label>
                <input
                  id="edit-floor"
                  type="number"
                  min={1}
                  value={form.floor}
                  onChange={(e) => handleField('floor', e.target.value)}
                  className={inputClass('floor')}
                />
              </div>

              {/* Office number */}
              <div>
                <label htmlFor="edit-office-number" className="block text-xs text-gray-500 mb-1">
                  Номер офиса
                </label>
                <input
                  id="edit-office-number"
                  type="text"
                  value={form.office_number}
                  onChange={(e) => handleField('office_number', e.target.value)}
                  className={inputClass('office_number')}
                />
              </div>
            </div>

            {/* Plan */}
            <div>
              <label htmlFor="edit-plan" className="block text-xs text-gray-500 mb-1">
                Тариф
              </label>
              <select
                id="edit-plan"
                value={form.plan}
                onChange={(e) => handleField('plan', e.target.value)}
                className={inputClass('plan')}
              >
                <option value={COMPANY_TIERS.BASIC}>Базовый</option>
                <option value={COMPANY_TIERS.STANDARD}>Стандарт</option>
                <option value={COMPANY_TIERS.PREMIUM}>Премиум</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Max employees */}
              <div>
                <label htmlFor="edit-max-employees" className="block text-xs text-gray-500 mb-1">
                  Макс. сотрудников
                </label>
                <input
                  id="edit-max-employees"
                  type="number"
                  min={1}
                  value={form.max_employees}
                  onChange={(e) => handleField('max_employees', e.target.value)}
                  className={inputClass('max_employees')}
                />
              </div>

              {/* Storage limit */}
              <div>
                <label htmlFor="edit-storage" className="block text-xs text-gray-500 mb-1">
                  Хранилище (ГБ)
                </label>
                <input
                  id="edit-storage"
                  type="number"
                  min={1}
                  value={form.storage_limit_gb}
                  onChange={(e) => handleField('storage_limit_gb', e.target.value)}
                  className={inputClass('storage_limit_gb')}
                />
              </div>
            </div>
          </>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={isPending}
            className={cn(
              'inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
              isPending
                ? 'bg-blue-300 text-white cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white',
            )}
          >
            {isPending ? (
              <>
                <span
                  className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin"
                  aria-hidden="true"
                />
                Сохранение...
              </>
            ) : (
              <>
                <Check size={15} aria-hidden="true" />
                Сохранить
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
          >
            <X size={15} aria-hidden="true" />
            Отмена
          </button>
        </div>
      </div>
    </form>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isSuperadmin = user?.role === USER_ROLES.SUPERADMIN;
  const isCompanyAdmin = user?.role === USER_ROLES.COMPANY_ADMIN;
  const canEdit = isSuperadmin || isCompanyAdmin;

  const [isEditing, setIsEditing] = useState(false);

  const { data: company, isLoading, isError } = useQuery<CompanyDetail>({
    queryKey: ['company', id],
    queryFn: () =>
      apiClient
        .get<CompanyDetail>(API.companies.detail(id!))
        .then((r) => r.data),
    enabled: !!id,
  });

  if (isLoading) {
    return <DetailSkeleton />;
  }

  if (isError || !company) {
    return (
      <main className="px-4 py-8 max-w-4xl mx-auto">
        <button
          type="button"
          onClick={() => navigate('/companies')}
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 mb-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Назад к списку
        </button>
        <p className="text-red-600 font-medium text-sm">
          Не удалось загрузить данные компании. Попробуйте перезагрузить страницу.
        </p>
      </main>
    );
  }

  const planLabel = PLAN_LABELS[company.plan] ?? company.plan;
  const planBadgeColor = PLAN_BADGE_COLORS[company.plan] ?? 'bg-gray-100 text-gray-700';

  const storagePercent =
    company.storage_limit_gb > 0
      ? Math.min(100, Math.round((company.storage_used / company.storage_limit_gb) * 100))
      : 0;

  return (
    <main className="px-4 py-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => navigate('/companies')}
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 mb-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
            aria-label="Назад к списку компаний"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Назад к списку
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
        </div>

        {canEdit && !isEditing && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 shrink-0 sm:mt-10"
            aria-label="Редактировать компанию"
          >
            <Pencil size={15} aria-hidden="true" />
            Редактировать
          </button>
        )}
      </div>

      {/* Profile card */}
      <section
        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6"
        aria-label="Информация о компании"
      >
        {/* Logo + name row */}
        <div className="flex flex-col sm:flex-row items-start gap-5">
          {company.logo ? (
            <img
              src={company.logo}
              alt={`Логотип ${company.name}`}
              className="w-24 h-24 rounded-2xl object-cover ring-4 ring-white shadow-md shrink-0"
            />
          ) : (
            <div
              className="w-24 h-24 rounded-2xl bg-blue-50 flex items-center justify-center ring-4 ring-white shadow-md shrink-0"
              aria-hidden="true"
            >
              <Building2 className="w-12 h-12 text-blue-400" />
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xl font-semibold text-gray-900">{company.name}</p>
            {company.description && (
              <p className="text-sm text-gray-500 max-w-lg">{company.description}</p>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              <span
                className={cn(
                  'inline-block rounded-full px-2.5 py-0.5 text-xs font-medium',
                  planBadgeColor,
                )}
              >
                {planLabel}
              </span>
              <span
                className={cn(
                  'inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full',
                  company.is_active
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200',
                )}
              >
                {company.is_active ? 'Активна' : 'Неактивна'}
              </span>
            </div>
          </div>
        </div>

        {/* Edit form or info grid */}
        {isEditing ? (
          <EditForm
            company={company}
            isSuperadmin={isSuperadmin}
            onCancel={() => setIsEditing(false)}
            onSaved={() => setIsEditing(false)}
          />
        ) : (
          <dl
            className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-4"
            aria-label="Контактная информация"
          >
            {company.contact_email && (
              <InfoRow
                icon={<Mail size={16} aria-hidden="true" />}
                label="Контактный email"
                value={company.contact_email}
              />
            )}
            {company.contact_phone && (
              <InfoRow
                icon={<Phone size={16} aria-hidden="true" />}
                label="Контактный телефон"
                value={company.contact_phone}
              />
            )}
            {company.floor != null && (
              <InfoRow
                icon={<MapPin size={16} aria-hidden="true" />}
                label="Этаж"
                value={company.floor}
              />
            )}
            {company.office_number && (
              <InfoRow
                icon={<Hash size={16} aria-hidden="true" />}
                label="Номер офиса"
                value={company.office_number}
              />
            )}
            <InfoRow
              icon={<CalendarDays size={16} aria-hidden="true" />}
              label="Создана"
              value={formatDate(company.created_at)}
            />
          </dl>
        )}
      </section>

      {/* Stats */}
      <section
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        aria-label="Статистика компании"
      >
        <StatCard
          icon={<Users size={22} aria-hidden="true" />}
          label={`Сотрудников (макс. ${company.max_employees})`}
          value={company.employee_count}
        />

        <StatCard
          icon={<HardDrive size={22} aria-hidden="true" />}
          label={`Хранилище (всего ${company.storage_limit_gb} ГБ)`}
          value={
            <span>
              {company.storage_used.toFixed(1)}{' '}
              <span className="text-base font-semibold text-gray-500">/ {company.storage_limit_gb} ГБ</span>
            </span>
          }
        />
      </section>

      {/* Storage progress bar */}
      <div
        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
        aria-label="Использование хранилища"
      >
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-gray-700">Использование хранилища</p>
          <p className="text-sm font-semibold text-gray-900">{storagePercent}%</p>
        </div>
        <div
          className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={storagePercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${storagePercent}% хранилища использовано`}
        >
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              storagePercent >= 90
                ? 'bg-red-500'
                : storagePercent >= 70
                  ? 'bg-amber-500'
                  : 'bg-blue-600',
            )}
            style={{ width: `${storagePercent}%` }}
          />
        </div>
        <p className="mt-1.5 text-xs text-gray-400">
          {company.storage_used.toFixed(1)} ГБ использовано из {company.storage_limit_gb} ГБ
        </p>
      </div>
    </main>
  );
}
