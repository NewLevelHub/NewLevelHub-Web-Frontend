import { useState, useRef, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { dateLocaleTag } from '@/shared/lib/localeFormat';
import { useNavigate } from 'react-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Building2,
  Upload,
  AlertTriangle,
  Check,
} from 'lucide-react';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import {
  COMPANY_PLAN_DEFAULT_LIMITS,
  COMPANY_TIERS,
  SUPERADMIN_UI_PREFIX,
  USER_ROLES,
  type CompanyTier,
} from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';
import { useAuth } from '@/shared/hooks/useAuth';
import type { Company, ServiceFloor } from '@/shared/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormData {
  name: string;
  description: string;
  floor_id: number | null;
  office_number: string;
  plan: string;
  max_employees: string;
  max_boards: string;
  storage_limit_gb: string;
  categories: string[];
}

const CATEGORIES_MAX = 10;
const CATEGORY_MAX_LEN = 50;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function inputClass(hasError: boolean) {
  return cn(
    'w-full px-3 py-2 text-sm rounded-lg border text-primary focus:outline-none focus:ring-2 focus:border-transparent',
    hasError
      ? 'border-red-400 focus:ring-red-500'
      : 'border-gray-300 focus:ring-blue-500',
  );
}

const basicPlanLimits = COMPANY_PLAN_DEFAULT_LIMITS[COMPANY_TIERS.BASIC];

// ─── TagInput ─────────────────────────────────────────────────────────────────

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

function TagInput({ tags, onChange, placeholder }: TagInputProps) {
  const [input, setInput] = useState('');
  const atLimit = tags.length >= CATEGORIES_MAX;

  function addTag(value: string) {
    const trimmed = value.trim().slice(0, CATEGORY_MAX_LEN);
    if (trimmed && !tags.includes(trimmed) && tags.length < CATEGORIES_MAX) {
      onChange([...tags, trimmed]);
    }
    setInput('');
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(input);
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  }

  function handleBlur() {
    if (input.trim()) addTag(input);
  }

  return (
    <div className="mt-1 flex flex-wrap gap-1.5 rounded-lg border border-default bg-surface px-3 py-2 focus-within:ring-2 focus-within:ring-brand/20 focus-within:border-brand min-h-[38px]">
      {tags.map(tag => (
        <span key={tag} className="inline-flex items-center gap-1 rounded bg-raised px-2 py-0.5 text-xs font-medium text-secondary">
          {tag}
          <button
            type="button"
            onClick={() => onChange(tags.filter(t => t !== tag))}
            className="text-muted hover:text-primary leading-none"
            aria-label={`Remove ${tag}`}
          >
            ×
          </button>
        </span>
      ))}
      {!atLimit && (
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value.slice(0, CATEGORY_MAX_LEN))}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={tags.length === 0 ? placeholder : ''}
          className="min-w-[120px] flex-1 bg-transparent text-sm text-primary placeholder:text-muted focus:outline-none"
          maxLength={CATEGORY_MAX_LEN}
        />
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CompanyCreatePage() {
  const { t, i18n } = useTranslation();
  const dateLocale = dateLocaleTag(i18n.language);
  const navigate = useNavigate();
  const { user } = useAuth();
  const companiesBasePath =
    user?.role === USER_ROLES.SUPERADMIN ? `${SUPERADMIN_UI_PREFIX}/companies` : '/companies';

  const [form, setForm] = useState<FormData>({
    name: '',
    description: '',
    floor_id: null,
    office_number: '',
    plan: COMPANY_TIERS.BASIC,
    max_employees: String(basicPlanLimits.max_employees),
    max_boards: String(basicPlanLimits.max_boards),
    storage_limit_gb: String(basicPlanLimits.storage_limit_gb),
    categories: [],
  });

  const { data: floorsData = [], isLoading: floorsLoading } = useQuery({
    queryKey: ['map-floors'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ results: ServiceFloor[] }>(API.map.floors);
      return data.results ?? [];
    },
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
      if (form.description) formData.append('description', form.description);
      if (form.floor_id != null) formData.append('floor_id', String(form.floor_id));
      if (form.office_number) formData.append('office_number', form.office_number);
      formData.append('plan', form.plan);
      formData.append('max_employees', form.max_employees);
      formData.append('max_boards', form.max_boards);
      formData.append('storage_limit_gb', String(form.storage_limit_gb));
      formData.append('categories', JSON.stringify(form.categories));
      if (logoFile) formData.append('logo', logoFile);

      return apiClient.post<Company>(
        API.companies.create,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
    },
    onSuccess: (response) => {
      navigate(`${companiesBasePath}/${response.data.id}`);
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
        setGeneralError(t('companies.createError'));
      }
    },
  });

  function handleField(field: Exclude<keyof FormData, 'floor_id' | 'categories'>, value: string) {
    setForm((prev) => {
      if (field === 'plan') {
        const limits =
          COMPANY_PLAN_DEFAULT_LIMITS[value as CompanyTier] ??
          COMPANY_PLAN_DEFAULT_LIMITS[COMPANY_TIERS.BASIC];
        return {
          ...prev,
          plan: value,
          max_employees: String(limits.max_employees),
          max_boards: String(limits.max_boards),
          storage_limit_gb: String(limits.storage_limit_gb),
        };
      }
      return { ...prev, [field]: value };
    });
    const keysToClear: string[] =
      field === 'plan'
        ? ['plan', 'max_employees', 'max_boards', 'storage_limit_gb']
        : [field];
    if (keysToClear.some((k) => fieldErrors[k])) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        for (const k of keysToClear) {
          delete next[k];
        }
        return next;
      });
    }
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGeneralError(null);

    if (!form.name.trim()) {
      setFieldErrors({ name: t('companies.nameRequired') });
      return;
    }

    mutate();
  }

  return (
    <main className="px-3 py-4 sm:px-4 sm:py-6 md:py-8 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <button
          type="button"
          onClick={() => navigate(companiesBasePath)}
          className="inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-primary mb-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
          aria-label={t('companies.backToListCreateAria')}
        >
          <ArrowLeft size={16} aria-hidden="true" />
          {t('companies.backToList')}
        </button>
        <h1 className="text-2xl font-bold text-primary">{t('companies.createTitle')}</h1>
        <p className="mt-1 text-sm text-muted">{t('companies.createSubtitle')}</p>
      </div>

      {/* Form card */}
      <section
        className="bg-surface rounded-2xl border border-default shadow-sm p-6"
        aria-label={t('companies.createSection')}
      >
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
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
            <p className="text-sm font-medium text-gray-700 mb-2">{t('companies.logoLabel')}</p>
            <div className="flex items-center gap-4">
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt={t('companies.logoPreview')}
                  className="w-16 h-16 rounded-xl object-cover border border-default"
                />
              ) : (
                <div
                  className="w-16 h-16 rounded-xl bg-blue-50 flex items-center justify-center border border-default border-dashed"
                  aria-hidden="true"
                >
                  <Building2 className="w-7 h-7 text-blue-300" />
                </div>
              )}
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-surface border border-gray-300 rounded-lg hover:bg-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors"
                >
                  <Upload size={14} aria-hidden="true" />
                  {t('companies.selectImage')}
                </button>
                <p className="text-xs text-secondary">{t('companies.logoHint')}</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                lang={dateLocale}
                onChange={handleLogoChange}
                className="sr-only"
                aria-label={t('companies.selectLogoFile')}
              />
            </div>
          </div>

          <hr className="border-default" />

          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              {t('companies.nameLabel')} <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id="name"
              type="text"
              required
              placeholder="Acme Corp"
              value={form.name}
              onChange={(e) => handleField('name', e.target.value)}
              className={inputClass(!!fieldErrors.name)}
              aria-describedby={fieldErrors.name ? 'name-error' : undefined}
              maxLength={255}
            />
            {fieldErrors.name && (
              <p id="name-error" className="mt-1 text-xs text-red-600" role="alert">
                {fieldErrors.name}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              {t('companies.descriptionLabel')}
            </label>
            <textarea
              id="description"
              rows={3}
              value={form.description}
              onChange={(e) => handleField('description', e.target.value)}
              className={cn(inputClass(false), 'resize-none')}
            />
          </div>

          {/* Categories */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              {t('companies.categoriesCol')}
            </label>
            <TagInput
              tags={form.categories}
              onChange={cats => setForm(prev => ({ ...prev, categories: cats }))}
              placeholder={t('companies.categoriesPlaceholder')}
            />
            <p className="mt-1 text-xs text-muted">{t('companies.categoriesHint')}</p>
          </div>

          <hr className="border-default" />
          <p className="text-sm font-semibold text-gray-700">{t('companies.locationSection')}</p>

          <div className="grid grid-cols-2 gap-4">
            {/* Floor */}
            <div>
              <label htmlFor="floor_id" className="block text-sm font-medium text-gray-700 mb-1">
                {t('companies.floorLabel')}
              </label>
              <select
                id="floor_id"
                value={form.floor_id ?? ''}
                disabled={floorsLoading}
                onChange={(e) => setForm(f => ({ ...f, floor_id: e.target.value ? Number(e.target.value) : null }))}
                className={inputClass(!!fieldErrors.floor_id)}
              >
                <option value="">{t('resources.create.floorSelectDefault')}</option>
                {floorsData.map((f) => (
                  <option key={f.id} value={String(f.id)}>
                    {f.name
                      ? t('resources.create.floorOptionWithName', { number: f.number, name: f.name })
                      : t('resources.create.floorOptionNoName', { number: f.number })}
                  </option>
                ))}
              </select>
              {fieldErrors.floor_id && (
                <p className="mt-1 text-xs text-red-600" role="alert">{fieldErrors.floor_id}</p>
              )}
            </div>

            {/* Office number */}
            <div>
              <label htmlFor="office_number" className="block text-sm font-medium text-gray-700 mb-1">
                {t('companies.officeNumberLabel')}
              </label>
              <input
                id="office_number"
                type="text"
                placeholder="301"
                value={form.office_number}
                onChange={(e) => handleField('office_number', e.target.value)}
                className={inputClass(!!fieldErrors.office_number)}
                maxLength={50}
              />
            </div>
          </div>

          <hr className="border-default" />
          <p className="text-sm font-semibold text-gray-700">{t('companies.planSection')}</p>

          {/* Plan */}
          <div>
            <label htmlFor="plan" className="block text-sm font-medium text-gray-700 mb-1">
              {t('companies.planLabel')}
            </label>
            <select
              id="plan"
              value={form.plan}
              onChange={(e) => handleField('plan', e.target.value)}
              className={inputClass(!!fieldErrors.plan)}
            >
              <option value={COMPANY_TIERS.BASIC}>{t('companies.planBasic')}</option>
              <option value={COMPANY_TIERS.STANDARD}>{t('companies.planStandard')}</option>
              <option value={COMPANY_TIERS.PREMIUM}>{t('companies.planPremium')}</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Max employees */}
            <div>
              <label htmlFor="max_employees" className="block text-sm font-medium text-gray-700 mb-1">
                {t('companies.maxEmployeesLabel')}
              </label>
              <input
                id="max_employees"
                type="number"
                min={1}
                value={form.max_employees}
                onChange={(e) => handleField('max_employees', e.target.value)}
                className={inputClass(!!fieldErrors.max_employees)}
                aria-describedby={fieldErrors.max_employees ? 'max-emp-error' : undefined}
              />
              {fieldErrors.max_employees && (
                <p id="max-emp-error" className="mt-1 text-xs text-red-600" role="alert">
                  {fieldErrors.max_employees}
                </p>
              )}
            </div>

            {/* Max boards */}
            <div>
              <label htmlFor="max_boards" className="block text-sm font-medium text-gray-700 mb-1">
                {t('companies.maxBoardsLabel')}
              </label>
              <input
                id="max_boards"
                type="number"
                min={1}
                value={form.max_boards}
                onChange={(e) => handleField('max_boards', e.target.value)}
                className={inputClass(!!fieldErrors.max_boards)}
                aria-describedby={fieldErrors.max_boards ? 'max-boards-error' : undefined}
              />
              {fieldErrors.max_boards && (
                <p id="max-boards-error" className="mt-1 text-xs text-red-600" role="alert">
                  {fieldErrors.max_boards}
                </p>
              )}
            </div>

            {/* Storage limit */}
            <div>
              <label htmlFor="storage_limit_gb" className="block text-sm font-medium text-gray-700 mb-1">
                {t('companies.storageLabel')}
              </label>
              <input
                id="storage_limit_gb"
                type="number"
                min={0}
                step="0.1"
                value={form.storage_limit_gb}
                onChange={(e) => handleField('storage_limit_gb', e.target.value)}
                className={inputClass(!!fieldErrors.storage_limit_gb)}
                aria-describedby={fieldErrors.storage_limit_gb ? 'storage-error' : undefined}
              />
              {fieldErrors.storage_limit_gb && (
                <p id="storage-error" className="mt-1 text-xs text-red-600" role="alert">
                  {fieldErrors.storage_limit_gb}
                </p>
              )}
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isPending}
              className={cn(
                'inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                isPending
                  ? 'bg-blue-300 text-primary cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white',
              )}
            >
              {isPending ? (
                <>
                  <span
                    className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin"
                    aria-hidden="true"
                  />{t('common.creatingPlain')}</>
              ) : (
                <>
                  <Check size={15} aria-hidden="true" />
                  {t('companies.createCompany')}
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => navigate(companiesBasePath)}
              disabled={isPending}
              className="inline-flex items-center px-4 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
            >{t('common.cancel')}</button>
          </div>
        </form>
      </section>
    </main>
  );
}
